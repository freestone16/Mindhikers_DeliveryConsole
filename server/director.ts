import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { generateBRollOptions, generateGlobalBRollPlan, generateFallbackOptions, BRollOption, callLLM } from './llm';
import { generateImageWithVolc, pollVolcImageResult, generateVideoWithVolc, pollVolcVideoResult, downloadVideo } from './volcengine';
import { loadConfig } from './llm-config';
import { buildDirectorSystemPrompt } from './skill-loader';

const getProjectRoot = (projectId: string): string => {
  const PROJECTS_BASE = process.env.PROJECTS_BASE || path.join(process.cwd(), 'Projects');
  return path.join(PROJECTS_BASE, projectId);
};

export interface DirectorChapter {
  chapterId: string;
  chapterIndex: number;
  chapterName: string;
  scriptText: string;
  options: BRollOption[];
  selectedOptionId?: string;
  userComment?: string;
  isLocked: boolean;
}

export interface SelectionState {
  projectId: string;
  lastUpdated: string;
  taskId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  progress?: {
    current: number;
    total: number;
  };
  chapters: DirectorChapter[];
}

interface TaskRecord {
  taskId: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: { current: number; total: number };
  chapters: DirectorChapter[];
  createdAt: string;
}

const taskStorage = new Map<string, TaskRecord>();

// Phase 2 预审状态管理
interface Phase2ReviewState {
  projectId: string;
  lastUpdated: string;
  chapters: {
    chapterId: string;
    reviewStatus: 'pending' | 'approved' | 'skipped';
    selectedOptionId?: string;
    userComment?: string;
  }[];
}

// Phase 3 渲染状态管理
interface Phase3RenderState {
  projectId: string;
  lastUpdated: string;
  renderJobs: {
    jobId: string;
    chapterId: string;
    optionId: string;
    type: 'remotion' | 'seedance';
    status: 'waiting' | 'rendering' | 'completed' | 'failed';
    progress: number;
    frame?: number;
    totalFrames?: number;
    outputPath?: string;
    error?: string;
    startedAt?: string;
    completedAt?: string;
    retryCount?: number;
  }[];
  externalAssets: {
    assetId: string;
    chapterId: string;
    type: 'artlist' | 'internet-clip' | 'user-capture';
    sourcePath: string;
    targetPath: string;
    loadedAt: string;
  }[];
  xmlGenerated: boolean;
  xmlPath?: string;
}

const renderJobStorage = new Map<string, Phase3RenderState>();

export function parseMarkdownChapters(content: string): { title: string; text: string }[] {
  const chapters: { title: string; text: string }[] = [];
  const lines = content.split('\n');

  let currentTitle = '';
  let currentText = '';

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      const newTitle = h2Match[1].trim();
      const cleanTitle = newTitle.replace(/\s*\(.*?\)\s*/g, '').trim();

      if (currentTitle && currentText.trim()) {
        chapters.push({
          title: currentTitle,
          text: currentText.trim()
        });
      }
      currentTitle = cleanTitle;
      currentText = '';
    } else if (currentTitle || chapters.length === 0) {
      currentText += line + '\n';
    }
  }

  if (currentTitle && currentText.trim()) {
    chapters.push({
      title: currentTitle,
      text: currentText.trim()
    });
  }

  if (chapters.length === 0) {
    chapters.push({
      title: '全文',
      text: content.trim()
    });
  }

  return chapters;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveSelectionState(projectRoot: string, state: SelectionState) {
  const statePath = path.join(projectRoot, '04_Visuals', 'selection_state.json');
  ensureDir(path.dirname(statePath));
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// Helper to extract markdown from Director's enforced JSON output
function extractMarkdownFromDirectorJson(rawText: string): string {
  let cleanText = rawText.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  try {
    const parsed = JSON.parse(cleanText);
    if (parsed.concept_proposal) {
      return parsed.concept_proposal;
    }
  } catch {
    // If it's not valid JSON, it might just be raw markdown
  }

  // Return original text if parsing fails or no concept_proposal found
  // Try to clean up JSON brackets if it looks like broken JSON
  if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
    const match = cleanText.match(/"concept_proposal"\s*:\s*"([\s\S]*?)"(?=\s*(?:,|}$))/);
    if (match && match[1]) {
      return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  }

  return rawText;
}

function loadSelectionState(projectRoot: string): SelectionState | null {
  const statePath = path.join(projectRoot, '04_Visuals', 'selection_state.json');
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  }
  return null;
}

// Phase 2 预审状态管理辅助函数
function loadPhase2ReviewState(projectRoot: string): Phase2ReviewState | null {
  const statePath = path.join(projectRoot, '04_Visuals', 'phase2_review_state.json');
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  }
  return null;
}

function savePhase2ReviewState(projectRoot: string, state: Phase2ReviewState) {
  const statePath = path.join(projectRoot, '04_Visuals', 'phase2_review_state.json');
  ensureDir(path.dirname(statePath));
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

// Phase 3 渲染状态管理辅助函数
function loadPhase3RenderState(projectRoot: string): Phase3RenderState | null {
  const statePath = path.join(projectRoot, '04_Visuals', 'phase3_render_state.json');
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  }
  return null;
}

function savePhase3RenderState(projectRoot: string, state: Phase3RenderState) {
  const statePath = path.join(projectRoot, '04_Visuals', 'phase3_render_state.json');
  ensureDir(path.dirname(statePath));
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

export const generatePhase1 = async (req: Request, res: Response) => {
  const { projectId, scriptPath } = req.body;

  if (!projectId || !scriptPath) {
    return res.status(400).json({ error: 'Missing projectId or scriptPath' });
  }

  const projectRoot = getProjectRoot(projectId);
  const scriptFullPath = path.join(projectRoot, scriptPath);

  if (!fs.existsSync(scriptFullPath)) {
    return res.status(404).json({ error: 'Script file not found' });
  }

  // 读取用户的真实脚本内容
  const scriptContent = fs.readFileSync(scriptFullPath, 'utf-8');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // 从 Antigravity 库加载 Director 方法论
    const systemPrompt = buildDirectorSystemPrompt('concept');
    console.log('[Phase1] Generating concept with Director skill knowledge...');

    const config = loadConfig();
    const globalConfig = config.global || { provider: 'deepseek', model: 'deepseek-chat' };

    const response = await callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下是视频脚本全文，请为其生成视觉概念提案：\n\n${scriptContent}` }
    ], globalConfig.provider as any, globalConfig.model);

    const finalContent = extractMarkdownFromDirectorJson(response.content);

    res.write(`data: ${JSON.stringify({ type: 'content', content: finalContent })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  } catch (error: any) {
    console.error('[Phase1] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
  }

  res.end();
};

// Phase 1: Revise concept based on user feedback
export const reviseConcept = async (req: Request, res: Response) => {
  const { projectId, userComment } = req.body;

  if (!projectId || !userComment) {
    return res.status(400).json({ error: 'Missing projectId or userComment' });
  }

  try {
    // Read the existing concept from the delivery store
    const projectRoot = getProjectRoot(projectId);
    const deliveryStorePath = path.join(projectRoot, 'delivery_store.json');
    let existingConcept = '';

    if (fs.existsSync(deliveryStorePath)) {
      try {
        const storeData = JSON.parse(fs.readFileSync(deliveryStorePath, 'utf-8'));
        existingConcept = storeData?.modules?.director?.conceptProposal || '';
      } catch {
        // Ignore parse errors
      }
    }

    // 从 Antigravity 库加载 Director 方法论
    const systemPrompt = buildDirectorSystemPrompt('revise');
    console.log('[Phase1 Revise] Revising with Director skill knowledge...');

    const response = await callLLM([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `现有视觉概念提案：\n${existingConcept}\n\n用户反馈意见：\n${userComment}\n\n请根据以上反馈修改提案。`
      }
    ], 'deepseek');

    const finalContent = extractMarkdownFromDirectorJson(response.content);

    return res.json({
      success: true,
      data: { content: finalContent }
    });
  } catch (error: any) {
    console.error('[Phase1 Revise] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to revise concept'
    });
  }
};

// ... (other imports and helpers)

export const startPhase2 = async (req: Request, res: Response) => {
  const { projectId, scriptPath, brollTypes } = req.body;

  if (!projectId || !brollTypes || brollTypes.length === 0) {
    return res.status(400).json({ error: 'Missing projectId or brollTypes' });
  }

  const projectRoot = getProjectRoot(projectId);
  let scriptFullPath: string;

  if (scriptPath) {
    scriptFullPath = path.join(projectRoot, scriptPath);
    if (!fs.existsSync(scriptFullPath)) {
      return res.status(404).json({ error: 'Script file not found' });
    }
  } else {
    // ... (script finding logic remains same)
    const possibleDirs = ['03_Scripts', 'Scripts', ''];
    scriptFullPath = '';

    for (const dir of possibleDirs) {
      const searchDir = dir ? path.join(projectRoot, dir) : projectRoot;
      if (fs.existsSync(searchDir)) {
        const files = fs.readdirSync(searchDir)
          .filter(f => f.endsWith('.md') && !f.startsWith('.'))
          .sort((a, b) => {
            const aVer = a.match(/v(\d+)/)?.[1] || '0';
            const bVer = b.match(/v(\d+)/)?.[1] || '0';
            return parseInt(bVer) - parseInt(aVer);
          });
        if (files.length > 0) {
          scriptFullPath = path.join(searchDir, files[0]);
          break;
        }
      }
    }

    if (!scriptFullPath || !fs.existsSync(scriptFullPath)) {
      return res.status(404).json({ error: 'No script files found' });
    }
  }

  const taskId = `phase2-${Date.now()}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const scriptContent = fs.readFileSync(scriptFullPath, 'utf-8');
  const parsedChapters = parseMarkdownChapters(scriptContent);

  const chapters: DirectorChapter[] = [];

  // 先初始化一个临时任务，totalSteps 稍后会根据实际生成的 options 数量动态计算
  taskStorage.set(taskId, {
    taskId,
    projectId,
    status: 'running',
    progress: { current: 0, total: 0 },  // total 先设为0，生成完 globalPlan 后更新
    chapters: [],
    createdAt: new Date().toISOString()
  });

  res.write(`data: ${JSON.stringify({ type: 'taskId', taskId })}\n\n`);
  // 初始阶段只发送消息，不发送进度数字（避免显示"0/0"无意义）
  // 等globalPlan生成完后再发送实际方案数

  try {
    const config = loadConfig();
    const globalConfig = config.global || { provider: 'deepseek', model: 'deepseek-chat' };

    // 上帝视角：一次性生成全局分配方案
    const globalPlan = await generateGlobalBRollPlan(
      parsedChapters.map((pc, idx) => ({ id: `ch${idx + 1}`, name: pc.title, text: pc.text })),
      brollTypes as ('remotion' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture')[],
      globalConfig.provider as any,
      globalConfig.model
    );

    // 调试：打印每章生成的 options 数量
    globalPlan.chapters?.forEach(ch => {
      console.log(`[Phase2] 章节 ${ch.chapterName}: ${ch.options?.length || 0} 个方案`);
    });

    // 计算实际生成的总 options 数量作为 totalSteps
    const totalSteps = globalPlan.chapters?.reduce((sum, ch) => sum + (ch.options?.length || 0), 0) || parsedChapters.length * 3;
    console.log(`[Phase2] 总共生成 ${totalSteps} 个 B-roll 方案`);

    // 更新任务的 totalSteps
    const task = taskStorage.get(taskId);
    if (task) {
      task.progress.total = totalSteps;
    }
    res.write(`data: ${JSON.stringify({ type: 'progress', current: 0, total: totalSteps, message: `开始生成 B-roll 方案 (共 ${totalSteps} 个)` })}\n\n`);

    // [新增] 将生成的方案落盘为 Markdown (五列表格排版)
    const visualsDir = path.join(projectRoot, '04_Visuals');
    ensureDir(visualsDir);
    const mdOutputPath = path.join(visualsDir, `phase2_分段视觉执行方案_${projectId}.md`);

    let mdContent = `# ${projectId} - 导演大师分段视觉执行方案 (Phase 2)\n\n`;
    globalPlan.chapters?.forEach(ch => {
      mdContent += `## 📑 章节: ${ch.chapterName} (ID: ${ch.chapterId})\n\n`;
      mdContent += `| 📌 匹配原文 | 🎬 方案类型与名称 | 📝 视觉描述/微距调度 | 🖼️ 缩略图提词 | 💡 导演意图 |\n`;
      mdContent += `| :--- | :--- | :--- | :--- | :--- |\n`;

      ch.options?.forEach(opt => {
        const sanitize = (str: string) => (str || '').replace(/\n/g, '<br>').replace(/\|/g, '、');
        mdContent += `| **"${sanitize(opt.quote)}"** | **[${opt.type}]**<br>${sanitize(opt.name)} | ${sanitize(opt.prompt)} | *${sanitize(opt.imagePrompt || '')}* | ${sanitize(opt.rationale || '')} |\n`;
      });
      mdContent += `\n---\n\n`;
    });

    fs.writeFileSync(mdOutputPath, mdContent, 'utf-8');
    console.log(`[Phase2] Generated Markdown plan saved to: ${mdOutputPath}`);

    // 将全局方案分发回各个章节，并累计实际生成的 options 数量
    let currentOptionsCount = 0;
    for (let i = 0; i < parsedChapters.length; i++) {
      const parsed = parsedChapters[i];
      const chapterId = `ch${i + 1}`;

      // 匹配方案，如果模型没返回该章节，则 fallback
      const planForChapter = globalPlan.chapters?.find(c => c.chapterId === chapterId || c.chapterName === parsed.title);
      const brollOptions = planForChapter?.options || generateFallbackOptions(brollTypes as any, parsed.text);

      const chapter: DirectorChapter = {
        chapterId,
        chapterIndex: i,
        chapterName: parsed.title,
        scriptText: parsed.text.slice(0, 500),
        options: brollOptions.map((opt: BRollOption, idx: number) => ({
          ...opt,
          id: `${chapterId}-opt${idx + 1}`
        })),
        isLocked: false
      };

      chapters.push(chapter);

      // 累计当前 options 数量
      currentOptionsCount += chapter.options.length;

      const updatedTask = taskStorage.get(taskId);
      if (updatedTask) {
        updatedTask.progress.current = currentOptionsCount;
        updatedTask.chapters = chapters;
      }

      res.write(`data: ${JSON.stringify({ type: 'chapter_ready', chapter })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'progress', current: currentOptionsCount, total: totalSteps, message: `已完成 ${i + 1}/${parsedChapters.length} 章 (${currentOptionsCount}/${totalSteps} 个方案)` })}\n\n`);
    }

    const finalState: SelectionState = {
      projectId,
      taskId,
      status: 'completed',
      lastUpdated: new Date().toISOString(),
      progress: { current: totalSteps, total: totalSteps },
      chapters
    };

    saveSelectionState(projectRoot, finalState);

    const finalTask = taskStorage.get(taskId);
    if (finalTask) {
      finalTask.status = 'completed';
      finalTask.progress.current = totalSteps;
    }

    res.write(`data: ${JSON.stringify({ type: 'done', chapters })}\n\n`);
  } catch (error: any) {
    console.error('[Phase 2] Global Generation failed:', error);
    const errorMsg = error?.message || error?.toString() || '未知错误';
    console.error('[Phase 2] Error details:', errorMsg);

    // 提取更有用的错误信息
    let userFacingError = '全局生成失败，请重试';
    if (errorMsg.includes('ECONNREFUSED')) {
      userFacingError = '无法连接到 LLM 服务，请检查网络或 API 配置';
    } else if (errorMsg.includes('VALIDATION_FAILED')) {
      userFacingError = 'LLM 生成的数据格式不正确，已尝试自动修复但失败';
    } else if (errorMsg.includes('JSON')) {
      userFacingError = 'LLM 返回的不是有效的 JSON 格式';
    } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
      userFacingError = '请求超时，请检查网络连接';
    }

    res.write(`data: ${JSON.stringify({ type: 'error', error: userFacingError, details: errorMsg })}\n\n`);
  } finally {
    res.end();
  }
};

export const getPhase2Status = (req: Request, res: Response) => {
  const taskId = req.params.taskId as string | undefined;
  const projectId = req.query.projectId as string | undefined;

  if (taskId) {
    const task = taskStorage.get(taskId);
    if (task) {
      return res.json({
        taskId: task.taskId,
        status: task.status,
        progress: `${task.progress.current}/${task.progress.total}`,
        chapters: task.chapters
      });
    }
  }

  const projectIdStr = Array.isArray(projectId) ? projectId[0] : projectId;
  if (projectIdStr) {
    const projectRoot = getProjectRoot(projectIdStr);
    const state = loadSelectionState(projectRoot);
    if (state) {
      return res.json({
        taskId: state.taskId,
        status: state.status || 'completed',
        progress: state.progress ? `${state.progress.current}/${state.progress.total}` : 'completed',
        chapters: state.chapters
      });
    }
  }

  res.json({
    taskId,
    progress: '0/0',
    status: 'not_found',
    chapters: []
  });
};

export const selectOption = (req: Request, res: Response) => {
  const { projectId, chapterId, optionId } = req.body;

  if (!projectId || !chapterId || !optionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const projectRoot = getProjectRoot(projectId);
  const selectionStatePath = path.join(projectRoot, '04_Visuals', 'selection_state.json');

  let selectionState: Record<string, unknown> = {};
  if (fs.existsSync(selectionStatePath)) {
    selectionState = JSON.parse(fs.readFileSync(selectionStatePath, 'utf-8'));
  }

  const chapters = (selectionState.chapters as Record<string, unknown>[]) || [];
  const chapterIndex = chapters.findIndex((c: Record<string, unknown>) => c.chapterId === chapterId);

  if (chapterIndex >= 0) {
    chapters[chapterIndex] = { ...chapters[chapterIndex], selectedOptionId: optionId };
  }

  selectionState.chapters = chapters;
  selectionState.lastUpdated = new Date().toISOString();

  const dir = path.dirname(selectionStatePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(selectionStatePath, JSON.stringify(selectionState, null, 2));

  res.json({ success: true });
};

export const lockChapter = (req: Request, res: Response) => {
  const { projectId, chapterId } = req.body;

  if (!projectId || !chapterId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  res.json({ success: true, message: `Chapter ${chapterId} locked` });
};

export const startRender = (req: Request, res: Response) => {
  const { projectId, chapterIds } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  const jobId = `render-${Date.now()}`;

  res.json({ jobId, message: 'Render job started' });
};

export const getRenderStatus = (req: Request, res: Response) => {
  const { jobId } = req.params;

  // TODO: Query actual render status
  res.json({
    jobId,
    status: 'rendering',
    frame: 45,
    totalFrames: 90,
    percentage: 50
  });
};

const thumbnailTasks = new Map<string, {
  taskId: string;
  type: 'volcengine' | 'remotion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  createdAt: string;
}>();

import { spawn } from 'child_process';
import os from 'os';

const REMOTION_STUDIO_DIR = process.env.REMOTION_STUDIO_DIR ||
  path.join(os.homedir(), '.gemini/antigravity/skills/RemotionStudio');

interface RemotionLayer {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  animation: 'fade-in' | 'slide-up' | 'scale-in';
  startFrame: number;
  endFrame: number;
  fontSize: number;
  color: string;
  zIndex?: number;
}

interface RemotionInputProps {
  title: string;
  subtitle: string;
  layers: RemotionLayer[];
}

const MAX_TEXT_LEN = 40;
const truncate = (str: string, max: number): string => {
  if (!str) return '';
  const cleaned = str.replace(/\n/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max) + '...' : cleaned;
};

function buildRemotionPreview(option: {
  name?: string;
  template?: string;
  props?: Record<string, any>;
  prompt?: string;
  imagePrompt?: string;
  rationale?: string;
}): { compositionId: string; props: any } {
  // 1. 如果有明确的 template 并且有 props，尝试直接返回（除了 CinematicZoom 特殊拦截）
  if (option.template && option.template !== 'SceneComposer') {
    if (option.template === 'CinematicZoom') {
      // 特殊逻辑：CinematicZoom 需要 imageUrl，但我们还没有火山 API 出图
      // 先用 logo 或 default 作为底图
      return {
        compositionId: 'CinematicZoom',
        props: {
          ...(option.props || {}),
          imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1920&q=80', // Unsplash 占位图
          bgStyle: option.props?.bgStyle || 'dark-gradient'
        }
      };
    }

    // 处理新增的模板们，透传给 remotion cli 进行渲染
    const supportedCoreTemplates = [
      'ConceptChain', 'DataChartQuadrant',
      'TextReveal', 'NumberCounter', 'ComparisonSplit', 'TimelineFlow',
      'SegmentCounter', 'TerminalTyping'
    ];

    if (supportedCoreTemplates.includes(option.template)) {
      return {
        compositionId: option.template,
        props: option.props || {}
      };
    }
  }

  // 2. 兜底降级：转换为文字大字报 SceneComposer
  const layers: RemotionLayer[] = [];

  if (option.prompt) {
    layers.push({
      id: 'visual-desc',
      type: 'text',
      text: truncate(option.prompt, MAX_TEXT_LEN),
      x: 100,
      y: 260,
      animation: 'fade-in',
      startFrame: 10,
      endFrame: 40,
      fontSize: 48,
      color: '#ffffff',
      zIndex: 10,
    });
  }

  if (option.imagePrompt) {
    layers.push({
      id: 'image-prompt',
      type: 'text',
      text: truncate(option.imagePrompt, MAX_TEXT_LEN),
      x: 100,
      y: 560,
      animation: 'slide-up',
      startFrame: 25,
      endFrame: 55,
      fontSize: 28,
      color: '#aaaaaa',
      zIndex: 5,
    });
  }

  if (option.rationale) {
    layers.push({
      id: 'rationale',
      type: 'text',
      text: `💡 ${truncate(option.rationale, 35)}`,
      x: 100,
      y: 780,
      animation: 'fade-in',
      startFrame: 40,
      endFrame: 70,
      fontSize: 32,
      color: '#ffd700',
      zIndex: 8,
    });
  }

  return {
    compositionId: 'SceneComposer',
    props: {
      title: option.name || '视觉方案预览',
      subtitle: option.rationale ? truncate(option.rationale, 50) : '',
      layers,
    }
  };
}

export const generateThumbnail = async (req: Request, res: Response) => {
  const { option, chapterId } = req.body;

  if (!option || !option.id || !chapterId) {
    return res.status(400).json({ error: 'Missing required fields: option or chapterId' });
  }

  const taskKey = `${chapterId}-${option.id}`;

  if (option.type === 'remotion') {
    const outputFileName = `thumb_${taskKey}.png`;
    const projectId = req.body.projectId || process.env.PROJECT_NAME || 'CSET-SP3';
    const projectRoot = getProjectRoot(projectId);
    const outputDir = path.join(projectRoot, '04_Visuals', 'thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, outputFileName);

    const { compositionId, props } = buildRemotionPreview(option);

    try {
      console.log(`[Remotion Thumbnail] Starting sync render: ${taskKey} with template ${compositionId}`);
      const { renderStillWithApi } = require('./remotion-api-renderer');
      await renderStillWithApi(compositionId, outputPath, props);

      if (fs.existsSync(outputPath)) {
        const imageBuffer = fs.readFileSync(outputPath);
        const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        console.log(`[Remotion Thumbnail] Success: ${taskKey} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);
        return res.json({ success: true, imageUrl: base64Image, status: 'completed' });
      } else {
        console.error(`[Remotion Thumbnail] File not found after render: ${outputPath}`);
        return res.status(500).json({ success: false, error: 'Render completed but file not found' });
      }
    } catch (err: any) {
      console.error(`[Remotion Thumbnail Error] ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (option.type === 'generative' || option.type === 'seedance') {
    try {
      thumbnailTasks.set(taskKey, {
        taskId: `volc-${Date.now()}`,
        type: 'volcengine',
        status: 'processing',
        createdAt: new Date().toISOString()
      });

      res.json({
        success: true,
        taskId: thumbnailTasks.get(taskKey)!.taskId,
        taskKey,
        status: 'processing'
      });

      (async () => {
        try {
          const result = await generateImageWithVolc(option.imagePrompt || option.prompt || '');
          const task = thumbnailTasks.get(taskKey);
          if (task) {
            if (result.image_url) {
              task.status = 'completed';
              task.imageUrl = result.image_url;
              console.log(`[Volcengine Thumbnail] Success: ${taskKey}`);
            } else if (result.task_id) {
              task.taskId = result.task_id;
              task.status = 'pending';
            } else {
              task.status = 'failed';
              task.error = result.error || 'Unknown Volcengine error';
            }
          }
        } catch (err: any) {
          const task = thumbnailTasks.get(taskKey);
          if (task) {
            task.status = 'failed';
            task.error = err.message;
          }
          console.error(`[Volcengine Thumbnail Error] ${err.message}`);
        }
      })();

      return;
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  try {
    const result = await generateImageWithVolc(option.imagePrompt || option.prompt || '');

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    if (result.task_id) {
      thumbnailTasks.set(taskKey, {
        taskId: result.task_id,
        type: 'volcengine',
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      return res.json({
        success: true,
        taskId: result.task_id,
        taskKey,
        status: 'pending'
      });
    }

    if (result.image_url) {
      thumbnailTasks.set(taskKey, {
        taskId: '',
        type: 'volcengine',
        status: 'completed',
        imageUrl: result.image_url,
        createdAt: new Date().toISOString()
      });

      return res.json({
        success: true,
        imageUrl: result.image_url,
        status: 'completed'
      });
    }

    return res.status(500).json({ error: 'No task_id or image_url returned' });
  } catch (error: any) {
    console.error('Thumbnail generation error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getThumbnailStatus = async (req: Request, res: Response) => {
  const taskKey = Array.isArray(req.params.taskKey) ? req.params.taskKey[0] : req.params.taskKey;

  const task = thumbnailTasks.get(taskKey);
  if (!task) {
    return res.json({ status: 'failed', error: 'Task not found or expired. Please regenerate.' });
  }

  if (task.status === 'completed') {
    return res.json({ status: 'completed', imageUrl: task.imageUrl });
  }

  if (task.status === 'failed') {
    return res.json({ status: 'failed', error: task.error });
  }

  return res.json({ status: task.status });
};

// ============================================================
// Phase 2 预审 API（重构后）
// ============================================================

/**
 * 用户批注审阅结果
 * POST /api/director/phase2/review
 */
export const phase2Review = async (req: Request, res: Response) => {
  const { projectId, chapterId, reviewStatus, userComment } = req.body;

  if (!projectId || !chapterId || !reviewStatus) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['approved', 'skipped'].includes(reviewStatus)) {
    return res.status(400).json({ error: 'Invalid reviewStatus, must be "approved" or "skipped"' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);
    let reviewState = loadPhase2ReviewState(projectRoot);

    if (!reviewState) {
      reviewState = {
        projectId,
        lastUpdated: new Date().toISOString(),
        chapters: []
      };
    }

    // 查找或创建章节审阅记录
    const chapterReview = reviewState.chapters.find(c => c.chapterId === chapterId);
    if (chapterReview) {
      chapterReview.reviewStatus = reviewStatus;
      if (userComment) {
        chapterReview.userComment = userComment;
      }
    } else {
      reviewState.chapters.push({
        chapterId,
        reviewStatus: reviewStatus as 'approved' | 'skipped',
        userComment
      });
    }

    reviewState.lastUpdated = new Date().toISOString();
    savePhase2ReviewState(projectRoot, reviewState);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Phase2 Review] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to save review' });
  }
};

/**
 * 选择指定方案（仅 approved 状态有效）
 * POST /api/director/phase2/select
 */
export const phase2Select = async (req: Request, res: Response) => {
  const { projectId, chapterId, optionId } = req.body;

  if (!projectId || !chapterId || !optionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);
    let reviewState = loadPhase2ReviewState(projectRoot);

    if (!reviewState) {
      return res.status(404).json({ error: 'Review state not found, please start Phase 2 first' });
    }

    // 查找章节审阅记录
    const chapterReview = reviewState.chapters.find(c => c.chapterId === chapterId);
    if (!chapterReview) {
      return res.status(404).json({ error: 'Chapter review not found' });
    }

    if (chapterReview.reviewStatus !== 'approved') {
      return res.status(400).json({ error: 'Cannot select option for skipped chapter' });
    }

    // 更新选中的方案 ID
    chapterReview.selectedOptionId = optionId;
    reviewState.lastUpdated = new Date().toISOString();
    savePhase2ReviewState(projectRoot, reviewState);

    res.json({ success: true });
  } catch (error: any) {
    console.error('[Phase2 Select] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to select option' });
  }
};

/**
 * 检查是否所有条目都已批注
 * GET /api/director/phase2/ready
 */
export const phase2Ready = async (req: Request, res: Response) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const projectRoot = getProjectRoot(Array.isArray(projectId) ? projectId[0] : projectId);
    const selectionState = loadSelectionState(projectRoot);
    const reviewState = loadPhase2ReviewState(projectRoot);

    if (!selectionState || !selectionState.chapters) {
      return res.json({ ready: false, pendingCount: 0 });
    }

    if (!reviewState || !reviewState.chapters) {
      return res.json({ ready: false, pendingCount: selectionState.chapters.length });
    }

    // 检查所有章节是否都已批注
    const pendingCount = selectionState.chapters.filter(
      ch => !reviewState.chapters.some(rc => rc.chapterId === ch.chapterId)
    ).length;

    const ready = pendingCount === 0;

    res.json({ ready, pendingCount, total: selectionState.chapters.length });
  } catch (error: any) {
    console.error('[Phase2 Ready] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to check ready status' });
  }
};

// ============================================================
// Phase 3 渲染及二审 API
// ============================================================

/**
 * 启动 Remotion 和文生视频渲染
 * POST /api/director/phase3/start-render
 */
export const phase3StartRender = async (req: Request, res: Response) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);

    // 读取 Phase 2 审阅状态
    const reviewState = loadPhase2ReviewState(projectRoot);
    if (!reviewState) {
      return res.status(404).json({ error: 'Review state not found, please complete Phase 2 first' });
    }

    // 读取选择状态，获取章节详情
    const selectionState = loadSelectionState(projectRoot);
    if (!selectionState) {
      return res.status(404).json({ error: 'Selection state not found' });
    }

    // 初始化 Phase 3 渲染状态
    let renderState = loadPhase3RenderState(projectRoot);
    if (!renderState) {
      renderState = {
        projectId,
        lastUpdated: new Date().toISOString(),
        renderJobs: [],
        externalAssets: [],
        xmlGenerated: false,
        xmlPath: undefined
      };
    }

    // 创建渲染任务
    const renderJobs = [];

    for (const chapter of selectionState.chapters) {
      const chapterReview = reviewState.chapters.find(rc => rc.chapterId === chapter.chapterId);
      if (!chapterReview || chapterReview.reviewStatus !== 'approved') {
        continue;
      }

      if (!chapterReview.selectedOptionId) {
        continue;
      }

      const selectedOption = chapter.options.find(opt => opt.id === chapterReview.selectedOptionId);
      if (!selectedOption) {
        continue;
      }

      // 仅渲染 remotion 和 seedance 类型
      if (selectedOption.type === 'remotion' || selectedOption.type === 'seedance') {
        const jobId = `render-${chapter.chapterId}-${selectedOption.id}-${Date.now()}`;

        const renderJob = {
          jobId,
          chapterId: chapter.chapterId,
          optionId: selectedOption.id,
          type: selectedOption.type as 'remotion' | 'seedance',
          status: 'waiting' as const,
          progress: 0,
          startedAt: undefined,
          completedAt: undefined,
          retryCount: 0
        };

        renderJobs.push(renderJob);
        renderState.renderJobs.push(renderJob);
      }
    }

    renderState.lastUpdated = new Date().toISOString();
    savePhase3RenderState(projectRoot, renderState);

    // 实际启动渲染任务
    await startRenderJobs(renderState, projectRoot, selectionState, reviewState);

    res.json({ success: true, renderJobs });
  } catch (error: any) {
    console.error('[Phase3 Start Render] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to start render' });
  }
};

/**
 * 启动渲染任务（Remotion 和文生视频）
 */
async function startRenderJobs(
  renderState: Phase3RenderState,
  projectRoot: string,
  selectionState: SelectionState,
  reviewState: Phase2ReviewState
) {
  const brollDir = path.join(projectRoot, '06_Video_Broll');
  ensureDir(brollDir);

  // 串行渲染（避免性能问题）
  for (const renderJob of renderState.renderJobs) {
    if (renderJob.type === 'remotion') {
      await renderRemotionJob(renderJob, projectRoot, selectionState, reviewState);
    } else if (renderJob.type === 'seedance') {
      await renderSeedanceJob(renderJob, projectRoot, selectionState, reviewState);
    }

    // 更新渲染状态
    const updatedState = loadPhase3RenderState(projectRoot);
    if (updatedState) {
      const jobIndex = updatedState.renderJobs.findIndex(j => j.jobId === renderJob.jobId);
      if (jobIndex >= 0) {
        updatedState.renderJobs[jobIndex] = renderJob;
        savePhase3RenderState(projectRoot, updatedState);
      }
    }
  }
}

/**
 * 渲染 Remotion 任务
 */
async function renderRemotionJob(
  renderJob: any,
  projectRoot: string,
  selectionState: SelectionState,
  reviewState: Phase2ReviewState
) {
  try {
    // 更新状态为渲染中
    renderJob.status = 'rendering';
    renderJob.startedAt = new Date().toISOString();
    renderJob.progress = 0;

    // 获取章节和选项详情
    const chapter = selectionState.chapters.find(c => c.chapterId === renderJob.chapterId);
    const chapterReview = reviewState.chapters.find(rc => rc.chapterId === renderJob.chapterId);

    if (!chapter || !chapterReview) {
      throw new Error('Chapter or review not found');
    }

    const selectedOption = chapter.options.find(opt => opt.id === chapterReview.selectedOptionId);
    if (!selectedOption) {
      throw new Error('Selected option not found');
    }

    // 生成输出文件名
    const fileName = `${renderJob.chapterId}_remotion.mp4`;
    const outputPath = path.join(projectRoot, '06_Video_Broll', fileName);

    // 构建 Remotion 渲染参数
    const { buildRemotionPreview } = await import('./remotion-api-renderer');
    const { compositionId, props } = buildRemotionPreview(selectedOption);

    // 调用 Remotion 渲染（使用 remotion 命令行工具）
    await renderRemotionVideo(compositionId, outputPath, props);

    // 更新状态为完成
    renderJob.status = 'completed';
    renderJob.progress = 100;
    renderJob.completedAt = new Date().toISOString();
    renderJob.outputPath = outputPath;

    console.log(`[Remotion Render] Success: ${renderJob.jobId} -> ${outputPath}`);
  } catch (error: any) {
    console.error(`[Remotion Render] Failed: ${renderJob.jobId}`, error);
    renderJob.status = 'failed';
    renderJob.error = error.message || 'Render failed';
  }
}

/**
 * 渲染文生视频任务
 */
async function renderSeedanceJob(
  renderJob: any,
  projectRoot: string,
  selectionState: SelectionState,
  reviewState: Phase2ReviewState
) {
  try {
    // 更新状态为渲染中
    renderJob.status = 'rendering';
    renderJob.startedAt = new Date().toISOString();
    renderJob.progress = 0;

    // 获取章节和选项详情
    const chapter = selectionState.chapters.find(c => c.chapterId === renderJob.chapterId);
    const chapterReview = reviewState.chapters.find(rc => rc.chapterId === renderJob.chapterId);

    if (!chapter || !chapterReview) {
      throw new Error('Chapter or review not found');
    }

    const selectedOption = chapter.options.find(opt => opt.id === chapterReview.selectedOptionId);
    if (!selectedOption) {
      throw new Error('Selected option not found');
    }

    // 生成输出文件名
    const fileName = `${renderJob.chapterId}_seedance.mp4`;
    const outputPath = path.join(projectRoot, '06_Video_Broll', fileName);

    // 调用火山引擎生成视频
    await renderVolcVideo(selectedOption.imagePrompt || selectedOption.prompt || '', outputPath);

    // 更新状态为完成
    renderJob.status = 'completed';
    renderJob.progress = 100;
    renderJob.completedAt = new Date().toISOString();
    renderJob.outputPath = outputPath;

    console.log(`[Seedance Render] Success: ${renderJob.jobId} -> ${outputPath}`);
  } catch (error: any) {
    console.error(`[Seedance Render] Failed: ${renderJob.jobId}`, error);
    renderJob.status = 'failed';
    renderJob.error = error.message || 'Render failed';
  }
}

/**
 * 使用 Remotion CLI 渲染视频
 */
async function renderRemotionVideo(
  compositionId: string,
  outputPath: string,
  inputProps: any
): Promise<void> {
  const os = await import('os');
  const REMOTION_STUDIO_DIR = process.env.REMOTION_STUDIO_DIR ||
    path.join(os.homedir(), '.gemini/antigravity/skills/RemotionStudio');

  const { spawn } = await import('child_process');

  const tmpPropsPath = `/tmp/remotion-props-${Date.now()}.json`;
  fs.writeFileSync(tmpPropsPath, JSON.stringify(inputProps), 'utf-8');

  return new Promise((resolve, reject) => {
    const remotionBin = path.join(REMOTION_STUDIO_DIR, 'node_modules', '.bin', 'remotion');
    const args = [
      'render',
      'src/index.tsx',
      compositionId,
      outputPath,
      '--jpeg-quality=80',
      '--frames=all',
      `--props=${tmpPropsPath}`
    ];

    console.log(`[Remotion Render] Running: ${remotionBin} ${args.join(' ')}`);

    const proc = spawn(remotionBin, args, {
      cwd: REMOTION_STUDIO_DIR,
      shell: true,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    let stderr = '';

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Remotion] ${output.trim()}`);
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (fs.existsSync(tmpPropsPath)) {
        fs.unlinkSync(tmpPropsPath);
      }

      if (code !== 0) {
        reject(new Error(`Remotion exited with code ${code}: ${stderr}`));
        return;
      }

      if (!fs.existsSync(outputPath)) {
        reject(new Error(`Render completed but file not found: ${outputPath}`));
        return;
      }

      resolve();
    });

    proc.on('error', (err) => {
      if (fs.existsSync(tmpPropsPath)) {
        fs.unlinkSync(tmpPropsPath);
      }
      reject(new Error(`Failed to spawn: ${err.message}`));
    });
  });
}

/**
 * 使用火山引擎生成视频
 */
async function renderVolcVideo(prompt: string, outputPath: string): Promise<void> {
  console.log(`[VolcEngine Video] Starting video generation with prompt: ${prompt.slice(0, 100)}...`);

  const result = await generateVideoWithVolc(prompt);

  if (result.error) {
    throw new Error(`VolcEngine video generation failed: ${result.error}`);
  }

  const taskId = result.task_id;
  if (!taskId) {
    throw new Error('No task_id returned from VolcEngine');
  }

  console.log(`[VolcEngine Video] Task submitted: ${taskId}, polling for result...`);

  const maxPolls = 120;
  const pollInterval = 5000;

  for (let i = 0; i < maxPolls; i++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const pollResult = await pollVolcVideoResult(taskId);

    if (pollResult.error) {
      throw new Error(`Poll error: ${pollResult.error}`);
    }

    if (pollResult.status === 'completed' && pollResult.video_url) {
      console.log(`[VolcEngine Video] Task completed, downloading video...`);

      const downloadResult = await downloadVideo(pollResult.video_url, outputPath);
      if (!downloadResult.success) {
        throw new Error(`Download failed: ${downloadResult.error}`);
      }

      console.log(`[VolcEngine Video] Video saved to: ${outputPath}`);
      return;
    }

    if (pollResult.status === 'failed') {
      throw new Error(`Video generation failed: ${pollResult.error || 'Unknown error'}`);
    }

    console.log(`[VolcEngine Video] Polling... (${i + 1}/${maxPolls}) status: ${pollResult.status}`);
  }

  throw new Error('Video generation timeout (10 minutes)');
}

export const phase3RenderStatus = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const projectRoot = getProjectRoot(Array.isArray(projectId) ? projectId[0] : projectId);
    const renderState = loadPhase3RenderState(projectRoot);

    if (!renderState) {
      return res.json({ status: 'not_found' });
    }

    const renderJob = renderState.renderJobs.find(job => job.jobId === jobId);
    if (!renderJob) {
      return res.json({ status: 'not_found' });
    }

    res.json({
      jobId: renderJob.jobId,
      status: renderJob.status,
      progress: renderJob.progress,
      frame: renderJob.frame,
      totalFrames: renderJob.totalFrames,
      outputPath: renderJob.outputPath,
      error: renderJob.error,
      startedAt: renderJob.startedAt,
      completedAt: renderJob.completedAt
    });
  } catch (error: any) {
    console.error('[Phase3 Render Status] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get render status' });
  }
};

/**
 * 重新渲染
 * POST /api/director/phase3/rerender
 */
export const phase3Rerender = async (req: Request, res: Response) => {
  const { projectId, chapterId, optionId } = req.body;

  if (!projectId || !chapterId || !optionId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);
    let renderState = loadPhase3RenderState(projectRoot);

    if (!renderState) {
      return res.status(404).json({ error: 'Render state not found' });
    }

    // 查找现有的渲染任务
    const existingJob = renderState.renderJobs.find(
      job => job.chapterId === chapterId && job.optionId === optionId
    );

    if (existingJob) {
      // 删除旧的视频文件
      if (existingJob.outputPath && fs.existsSync(existingJob.outputPath)) {
        fs.unlinkSync(existingJob.outputPath);
      }

      // 更新渲染任务状态
      existingJob.status = 'waiting';
      existingJob.progress = 0;
      existingJob.outputPath = undefined;
      existingJob.error = undefined;
      existingJob.startedAt = undefined;
      existingJob.completedAt = undefined;
      existingJob.retryCount = (existingJob.retryCount || 0) + 1;
    }

    renderState.lastUpdated = new Date().toISOString();
    savePhase3RenderState(projectRoot, renderState);

    // TODO: 实际启动重新渲染任务

    res.json({ success: true, jobId: existingJob?.jobId });
  } catch (error: any) {
    console.error('[Phase3 Rerender] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to rerender' });
  }
};

/**
 * 二审通过，视频落盘
 * POST /api/director/phase3/approve
 */
export const phase3Approve = async (req: Request, res: Response) => {
  const { projectId, chapterId } = req.body;

  if (!projectId || !chapterId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);
    let renderState = loadPhase3RenderState(projectRoot);

    if (!renderState) {
      return res.status(404).json({ error: 'Render state not found' });
    }

    // 查找渲染任务
    const renderJob = renderState.renderJobs.find(job => job.chapterId === chapterId);
    if (!renderJob) {
      return res.status(404).json({ error: 'Render job not found' });
    }

    if (renderJob.status !== 'completed') {
      return res.status(400).json({ error: 'Cannot approve incomplete render' });
    }

    // 视频已经落盘，只需更新状态
    renderJob.status = 'completed';
    renderState.lastUpdated = new Date().toISOString();
    savePhase3RenderState(projectRoot, renderState);

    res.json({ success: true, outputPath: renderJob.outputPath });
  } catch (error: any) {
    console.error('[Phase3 Approve] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve render' });
  }
};

// ============================================================
// Phase 3 外部素材 API
// ============================================================

/**
 * 加载外部素材，复制到项目目录
 * POST /api/director/phase3/load-asset
 */
export const phase3LoadAsset = async (req: Request, res: Response) => {
  const { projectId, chapterId, type, sourcePath } = req.body;
  const file = req.file as any;

  if (!projectId || !chapterId || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['artlist', 'internet-clip', 'user-capture'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type, must be "artlist", "internet-clip", or "user-capture"' });
  }

  if (!file && !sourcePath) {
    return res.status(400).json({ error: 'Missing file or sourcePath' });
  }

  try {
    const { loadExternalAsset, handleUploadedFile } = require('./assets');
    let asset;

    if (file) {
      // 处理上传的文件
      asset = await handleUploadedFile(
        projectId,
        chapterId,
        type as 'artlist' | 'internet-clip' | 'user-capture',
        file
      );
    } else {
      // 处理本地文件路径
      asset = await loadExternalAsset(
        projectId,
        chapterId,
        type as 'artlist' | 'internet-clip' | 'user-capture',
        sourcePath
      );
    }

    // 更新渲染状态
    const projectRoot = getProjectRoot(projectId);
    let renderState = loadPhase3RenderState(projectRoot);
    if (!renderState) {
      renderState = {
        projectId,
        lastUpdated: new Date().toISOString(),
        renderJobs: [],
        externalAssets: [],
        xmlGenerated: false,
        xmlPath: undefined
      };
    }

    renderState.externalAssets.push(asset);
    renderState.lastUpdated = new Date().toISOString();
    savePhase3RenderState(projectRoot, renderState);

    res.json({ success: true, assetId: asset.assetId, targetPath: asset.targetPath });
  } catch (error: any) {
    console.error('[Phase3 Load Asset] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to load asset' });
  }
};

/**
 * 获取已加载的外部素材
 * GET /api/director/phase3/assets
 */
export const phase3GetAssets = async (req: Request, res: Response) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const projectRoot = getProjectRoot(Array.isArray(projectId) ? projectId[0] : projectId);
    const renderState = loadPhase3RenderState(projectRoot);

    if (!renderState) {
      return res.json({ assets: [] });
    }

    res.json({ assets: renderState.externalAssets || [] });
  } catch (error: any) {
    console.error('[Phase3 Get Assets] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get assets' });
  }
};

// ============================================================
// Phase 3 XML 生成 API
// ============================================================

/**
 * 生成 Final Cut Pro XML 文件
 * POST /api/director/phase3/generate-xml
 */
export const phase3GenerateXML = async (req: Request, res: Response) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  try {
    const { generateFCPXML } = require('./xml-generator');
    const { xmlPath, success } = await generateFCPXML(projectId);

    if (!success) {
      return res.status(500).json({ error: 'Failed to generate XML' });
    }

    res.json({ success: true, xmlPath });
  } catch (error: any) {
    console.error('[Phase3 Generate XML] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate XML' });
  }
};
