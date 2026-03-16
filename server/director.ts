import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { generateBRollOptions, generateGlobalBRollPlan, generateFallbackOptions, BRollOption, callLLM } from './llm';
import { generateImageWithVolc, pollVolcImageResult, generateVideoWithVolc, pollVolcVideoResult, downloadVideo } from './volcengine';
import { getProviderCredentialStatus, loadConfig } from './llm-config';
import { buildDirectorSystemPrompt } from './skill-loader';
import { resolveGlobalLLMConfig } from '../src/schemas/llm-config';
import { getProjectRoot } from './project-paths';

function ensureGlobalLLMReady(provider: string, model: string) {
  const status = getProviderCredentialStatus(provider);
  if (status.configured) {
    return;
  }

  const missingVars = status.missingVars.join(', ');
  throw new Error(`全局模型 ${provider}/${model} 未配置 API Key（缺少 ${missingVars}）。请先在“全局模型网关配置”补全对应 Key，或切换到已配置的全局 Provider。`);
}

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
    type: 'artlist' | 'internet-clip' | 'user-capture' | 'infographic';
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
      let cleanTitle = newTitle.replace(/\s*\(.*?\)\s*/g, '').trim();
      // Remove prefixes like "1-2 第三章：" or "第3章:"
      cleanTitle = cleanTitle.replace(/^(?:[\d\-\.]+\s+)?第[一二三四五六七八九十百\d\s]+章[：:\s]*/u, '').trim();

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

    const globalConfig = resolveGlobalLLMConfig(loadConfig());
    ensureGlobalLLMReady(globalConfig.provider, globalConfig.model);

    const response = await callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `以下是视频脚本全文，请为其生成视觉概念提案：\n\n${scriptContent}` }
    ], globalConfig.provider as any, globalConfig.model);

    const finalContent = extractMarkdownFromDirectorJson(response.content);

    // Save concept proposal to local directory
    const visualsDir = path.join(projectRoot, '04_Visuals');
    ensureDir(visualsDir);
    const mdOutputPath = path.join(visualsDir, `phase1_视觉概念提案_${projectId}.md`);
    fs.writeFileSync(mdOutputPath, finalContent, 'utf-8');
    console.log(`[Phase1] Generated concept proposal saved to: ${mdOutputPath}`);

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

    const globalConfig = resolveGlobalLLMConfig(loadConfig());
    ensureGlobalLLMReady(globalConfig.provider, globalConfig.model);

    const response = await callLLM([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `现有视觉概念提案：\n${existingConcept}\n\n用户反馈意见：\n${userComment}\n\n请根据以上反馈修改提案。`
      }
    ], globalConfig.provider as any, globalConfig.model);

    const finalContent = extractMarkdownFromDirectorJson(response.content);

    // Save concept proposal to local directory
    const visualsDir = path.join(projectRoot, '04_Visuals');
    ensureDir(visualsDir);
    const mdOutputPath = path.join(visualsDir, `phase1_视觉概念提案_${projectId}.md`);
    fs.writeFileSync(mdOutputPath, finalContent, 'utf-8');
    console.log(`[Phase1 Revise] Revised concept proposal saved to: ${mdOutputPath}`);

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

  try {
    const globalConfig = resolveGlobalLLMConfig(loadConfig());
    ensureGlobalLLMReady(globalConfig.provider, globalConfig.model);

    res.write(`data: ${JSON.stringify({ type: 'log', level: 'info', message: `开始生成 B-roll 方案，使用模型: ${globalConfig.provider}/${globalConfig.model}` })}\n\n`);

    // 上帝视角：一次性生成全局分配方案
    const globalPlan = await generateGlobalBRollPlan(
      parsedChapters.map((pc, idx) => ({ id: `ch${idx + 1}`, name: pc.title, text: pc.text })),
      brollTypes as ('remotion' | 'generative' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic')[],
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

    res.write(`data: ${JSON.stringify({ type: 'log', level: 'info', message: `方案生成完成，共 ${totalSteps} 个方案` })}\n\n`);

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
    const projectId = req.body.projectId || process.env.PROJECT_NAME || 'MindHikers Delivery Console';
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

  // ============================================================
  // Infographic: BaoyuInfographic 结构化信息图生成
  // ============================================================
  if (option.type === 'infographic') {
    const layout = option.infographicLayout || option.props?.layout || 'feature-list';
    const style = option.infographicStyle || option.props?.style || 'craft-handmade';
    const lang = option.props?.lang || 'zh';
    const useMode = option.infographicUseMode || option.props?.useMode || 'cinematic-zoom';
    const topic = option.imagePrompt || option.prompt || option.name || '信息图主题';

    // 读取 layouts.md 中对应布局的 Prompt 规格（简化内联版本，完整版见 BaoyuInfographic/references/layouts.md）
    const LAYOUT_PROMPTS: Record<string, string> = {
      'pyramid': 'PYRAMID LAYOUT: Triangle divided into 3-5 horizontal tiers from base (largest, most fundamental) to apex (smallest, highest level). Each tier has a distinct color, tier label, and brief description.',
      'funnel': 'FUNNEL LAYOUT: Wide top tapering to narrow bottom with 3-5 distinct horizontal layers. Each layer shows a stage name, optional metric/percentage, and brief description.',
      'fishbone': 'FISHBONE LAYOUT: Main effect at right (fish head). Central horizontal spine arrow. 4-6 major cause categories as diagonal bones. Each major bone has 2-3 sub-causes.',
      'venn': 'VENN DIAGRAM LAYOUT: 2-3 overlapping circles, each representing a distinct concept with unique characteristics listed. Overlapping areas contain shared characteristics.',
      'iceberg': 'ICEBERG LAYOUT: Top ~20% above waterline (visible elements), ~80% submerged below (hidden/deeper elements). Ocean visual metaphor with distinct color contrast.',
      'comparison-table': 'COMPARISON TABLE LAYOUT: Structured table with 2-4 columns representing options and 4-6 rows of comparison criteria. Clear column headers.',
      'timeline-horizontal': 'HORIZONTAL TIMELINE LAYOUT: Central horizontal line from earliest to latest. 4-7 event markers above/below the line. Each event: date label, title, and description.',
      'circular-flow': 'CIRCULAR FLOW LAYOUT: 4-6 interconnected stages in circular pattern with directional arrows. Each stage has icon and short label.',
      'bridge': 'BRIDGE LAYOUT: Two distinct states (Problem State left, Solution State right) connected by a bridge. Contrasting colors for two states.',
      'mind-map': 'MIND MAP LAYOUT: Central concept in the middle with 4-6 main branches radiating outward. Each main branch has 2-3 sub-branches. Radial symmetry.',
      'nested-circles': 'NESTED CIRCLES LAYOUT: 3-5 concentric circles from innermost (core) to outermost (context). Each ring labeled with category name.',
      'priority-quadrants': 'PRIORITY QUADRANTS LAYOUT: Equal four-quadrant grid with two labeled axes. Each quadrant has distinct color and label.',
      'scale-balance': 'SCALE BALANCE LAYOUT: Balance scale with two sides, each showing 3-4 items/factors. Optional tilt to show comparison.',
      'tree-hierarchy': 'TREE HIERARCHY LAYOUT: Root node at top, branching downward. 2-3 levels of hierarchy with connecting lines.',
      'journey-path': 'JOURNEY PATH LAYOUT: Winding path from start to destination. 4-6 milestone markers along the path.',
      'layers-stack': 'LAYERS STACK LAYOUT: 3-6 horizontal layers stacked vertically. Bottom layers are foundational, top layers are application-facing.',
      'grid-cards': 'GRID CARDS LAYOUT: 4-9 equal-size cards in 2x2, 2x3, or 3x3 grid. Each card: centered icon, short title, 1-2 line description.',
      'feature-list': 'FEATURE LIST LAYOUT: 4-8 features in a clean list or grid format. Each item: distinctive icon, feature name, 1-2 line description.',
      'equation': 'EQUATION LAYOUT: Visual formula where 2-4 components combine to create an outcome. "+" operators between component blocks. Final "=" leads to result.',
      'do-dont': 'DO/DON\'T LAYOUT: Split into two sections. "DO ✓" section with green tones showing 3-4 correct practices. "DON\'T ✗" section with red tones showing 3-4 incorrect practices.',
    };

    const STYLE_PROMPTS: Record<string, string> = {
      'craft-handmade': 'STYLE: Hand-crafted illustration style. Slight paper texture background, hand-drawn line quality, watercolor-like fills, warm organic aesthetic.',
      'cyberpunk-neon': 'STYLE: Cyberpunk neon aesthetic. Very dark background, electric neon glowing lines in cyan, magenta, and electric blue, circuit board pattern details.',
      'aged-academia': 'STYLE: Aged academic/scientific illustration. Sepia tones and yellowed parchment background, fine-line engraving style, Victorian-era diagram aesthetic.',
      'bold-graphic': 'STYLE: Bold graphic/comic style. Strong black outlines, limited color palette, Ben-Day dots for shading, graphic novel aesthetic.',
      'corporate-memphis': 'STYLE: Corporate Memphis. Simplified geometric figures, flat vector art with bold solid colors, organic blob shapes, modern SaaS aesthetic.',
      'technical-schematic': 'STYLE: Technical/engineering schematic. Blueprint background, precise line drawings, isometric 3D projection, professional engineering quality.',
      'chalkboard': 'STYLE: Chalkboard illustration. Dark slate background, hand-drawn white chalk lines, colorful chalk accents, educational feeling.',
      'storybook-watercolor': 'STYLE: Storybook watercolor. Soft translucent washes, gentle color bleeding, warm dreamy palette, magical/whimsical atmosphere.',
      'origami': 'STYLE: Origami/paper folding aesthetic. Geometric forms appearing to be folded paper, angular shapes with visible fold lines, Japanese minimalist sensibility.',
      'pixel-art': 'STYLE: Pixel art/8-bit retro style. Visible square pixel grid, limited color palette, chunky pixelated typography, nostalgic game aesthetic.',
      'kawaii': 'STYLE: Japanese kawaii aesthetic. Adorable chibi-style characters, pastel color palette, rounded soft shapes, cute icons.',
      'claymation': 'STYLE: Claymation aesthetic. 3D clay-textured objects, rounded forms, bright saturated colors with matte finish, cheerful and tactile.',
      'subway-map': 'STYLE: Metro/subway map style. Clean colored lines connecting labeled stations, 45-degree or 90-degree line angles, transport authority map aesthetic.',
      'ikea-manual': 'STYLE: IKEA-style instruction manual. Ultra-minimal line art, no color or single accent, step-by-step panels, generous white space.',
      'knolling': 'STYLE: Knolling/flat lay style. Items arranged at 90-degree angles, viewed from above, perfectly parallel alignment, clean white background.',
      'lego-brick': 'STYLE: LEGO brick construction style. Everything represented as interlocking bricks with stud dots, primary color palette, isometric view.',
      'ui-wireframe': 'STYLE: UI wireframe/prototype style. Grayscale only, clean rectangular wireframe boxes, professional UX documentation appearance.',
      // MindHikers 扩展风格
      'dore-engraving': 'STYLE: Vintage Gustave Doré engraving style. Intricate fine-line crosshatching, dramatic chiaroscuro lighting, Gothic atmosphere, high contrast black and white.',
      'chinese-ink-wash': 'STYLE: Traditional Chinese ink wash painting (水墨画). Expressive bold brush strokes, generous negative space (留白), monochromatic black ink, Zen-like minimalism.',
      'premium-manga': 'STYLE: High-quality seinen manga style. Detailed precise ink linework, screentone patterns, cinematic panel composition, monochromatic.',
    };

    const layoutPrompt = LAYOUT_PROMPTS[layout] || `LAYOUT: ${layout} infographic layout with clear visual hierarchy.`;
    const stylePrompt = STYLE_PROMPTS[style] || `STYLE: ${style} visual aesthetic.`;

    const infographicPrompt = `Create a high-quality infographic illustration with the following specifications:

TOPIC: ${topic}
LAYOUT: ${layout}
STYLE: ${style}
LANGUAGE: ${lang}

${layoutPrompt}

${stylePrompt}

QUALITY REQUIREMENTS:
- Ultra-high detail, professional infographic quality
- Clean composition with clear visual hierarchy
- All text must be legible and properly sized
- Use appropriate icons, symbols, and data visualization elements
- Maintain consistent color palette throughout
- 16:9 aspect ratio for video compatibility
- Minimum resolution equivalent to 1920x1080
${useMode === 'static' ? '- IMPORTANT: Include detailed text content for close reading' : '- IMPORTANT: Design for visual impact at a glance, minimal dense text'}`;

    console.log(`[Infographic Thumbnail] Generating for: ${taskKey}, layout: ${layout}, style: ${style}, useMode: ${useMode}`);

    try {
      thumbnailTasks.set(taskKey, {
        taskId: `infographic-${Date.now()}`,
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
          const result = await generateImageWithVolc(infographicPrompt);
          const task = thumbnailTasks.get(taskKey);
          if (task) {
            if (result.image_url) {
              task.status = 'completed';
              task.imageUrl = result.image_url;
              console.log(`[Infographic Thumbnail] Success: ${taskKey}`);
            } else if (result.task_id) {
              task.taskId = result.task_id;
              task.status = 'pending';
              // 复用轮询逻辑
              const pollVolc = async () => {
                let pollCount = 0;
                const maxPolls = 30;
                while (pollCount < maxPolls) {
                  pollCount++;
                  const pollResult = await pollVolcImageResult(result.task_id as string);
                  const currentTask = thumbnailTasks.get(taskKey);
                  if (!currentTask) break;
                  if (pollResult.status === 'completed' && pollResult.image_url) {
                    currentTask.status = 'completed';
                    currentTask.imageUrl = pollResult.image_url;
                    console.log(`[Infographic Thumbnail] Poll Success: ${taskKey} (${pollCount} polls)`);
                    break;
                  } else if (pollResult.status === 'failed') {
                    currentTask.status = 'failed';
                    currentTask.error = pollResult.error || 'Volcengine task failed';
                    break;
                  } else {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                }
                if (pollCount >= maxPolls) {
                  const t = thumbnailTasks.get(taskKey);
                  if (t) { t.status = 'failed'; t.error = 'Timeout'; }
                }
              };
              pollVolc().catch(err => {
                const t = thumbnailTasks.get(taskKey);
                if (t) { t.status = 'failed'; t.error = `Poll error: ${err.message}`; }
              });
            } else {
              task.status = 'failed';
              task.error = result.error || 'Unknown infographic gen error';
            }
          }
        } catch (err: any) {
          const task = thumbnailTasks.get(taskKey);
          if (task) { task.status = 'failed'; task.error = err.message; }
          console.error(`[Infographic Thumbnail Error] ${err.message}`);
        }
      })();

      return;
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
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
              console.log(`[Volcengine Thumbnail] Pending: ${taskKey}, taskId=${result.task_id}`);

              // 启动轮询检查火山引擎任务状态
              const pollVolc = async () => {
                let pollCount = 0;
                const maxPolls = 30; // 最多轮询 30 次（60秒）

                while (pollCount < maxPolls) {
                  pollCount++;
                  const pollResult = await pollVolcImageResult(result.task_id as string);
                  const currentTask = thumbnailTasks.get(taskKey);

                  if (!currentTask) break; // 任务已被清理

                  if (pollResult.status === 'completed' && pollResult.image_url) {
                    currentTask.status = 'completed';
                    currentTask.imageUrl = pollResult.image_url;
                    console.log(`[Volcengine Thumbnail] Poll Success: ${taskKey} (${pollCount} polls)`);
                    break;
                  } else if (pollResult.status === 'failed') {
                    currentTask.status = 'failed';
                    currentTask.error = pollResult.error || 'Volcengine task failed';
                    console.error(`[Volcengine Thumbnail] Poll Failed: ${taskKey}`, pollResult.error);
                    break;
                  } else if (pollResult.status === 'processing') {
                    // 继续轮询
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                }

                if (pollCount >= maxPolls) {
                  const timeoutTask = thumbnailTasks.get(taskKey);
                  if (timeoutTask) {
                    timeoutTask.status = 'failed';
                    timeoutTask.error = 'Timeout: Volcengine task did not complete within 60 seconds';
                    console.error(`[Volcengine Thumbnail] Timeout: ${taskKey}`);
                  }
                }
              };

              pollVolc().catch(err => {
                const errorTask = thumbnailTasks.get(taskKey);
                if (errorTask) {
                  errorTask.status = 'failed';
                  errorTask.error = `Poll error: ${err.message}`;
                }
                console.error(`[Volcengine Thumbnail] Poll Error: ${taskKey}`, err);
              });
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
    const projIdStr = (Array.isArray(projectId) ? projectId[0] : projectId) as string;
    const projectRoot = getProjectRoot(projIdStr);
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
// Phase 2 渲染落盘 API
// ============================================================

export const phase2RenderChecked = async (req: Request, res: Response) => {
  const { projectId, chapters } = req.body;
  if (!projectId || !chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: 'Missing projectId or chapters list' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);
    const outputDir = path.join(projectRoot, '04_Visuals', 'thumbnails');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // ── 1. 分类 & 预注册任务 ──────────────────────────────────
    const triggeredTaskKeys: string[] = [];
    const remotionQueue: Array<{ chapterId: string; option: any }> = [];
    const volcQueue: Array<{ chapterId: string; option: any }> = [];

    for (const chapter of chapters) {
      const { chapterId, option } = chapter;
      if (!chapterId || !option?.id) continue;

      const taskKey = `${chapterId}-${option.id}`;
      triggeredTaskKeys.push(taskKey);

      // 预注册为 pending，前端轮询可立即看到状态
      thumbnailTasks.set(taskKey, {
        taskId: `batch-${taskKey}`,
        type: option.type === 'remotion' ? 'remotion' : 'volcengine',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      if (option.type === 'remotion') {
        remotionQueue.push(chapter);
      } else if (['seedance', 'generative', 'infographic'].includes(option.type)) {
        volcQueue.push(chapter);
      }
    }

    // ── 2. 立即返回，让前端开始轮询 ────────────────────────────
    res.json({
      success: true,
      taskKeys: triggeredTaskKeys,
      counts: { remotion: remotionQueue.length, volcengine: volcQueue.length },
      message: `已触发 ${triggeredTaskKeys.length} 个渲染任务（Remotion×${remotionQueue.length} / Volcengine×${volcQueue.length}）`,
    });

    // ── 3. Remotion 并发队列（本机限制 3 个同时渲染）────────────
    const REMOTION_CONCURRENCY = 3;
    const runRemotionQueue = async () => {
      let idx = 0;
      const worker = async () => {
        while (idx < remotionQueue.length) {
          const chapter = remotionQueue[idx++];
          const { chapterId, option } = chapter;
          const taskKey = `${chapterId}-${option.id}`;
          const outputPath = path.join(outputDir, `thumb_${taskKey}.png`);

          const task = thumbnailTasks.get(taskKey);
          if (task) task.status = 'processing';

          console.log(`[Batch Render] ▶ Remotion start: ${taskKey}`);
          try {
            const { compositionId, props } = buildRemotionPreview(option);
            const { renderStillWithApi } = require('./remotion-api-renderer');
            await renderStillWithApi(compositionId, outputPath, props);

            const imageBuffer = fs.readFileSync(outputPath);
            const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            const t = thumbnailTasks.get(taskKey);
            if (t) { t.status = 'completed'; t.imageUrl = base64Image; }
            console.log(`[Batch Render] ✅ Remotion done: ${taskKey}`);
          } catch (err: any) {
            const t = thumbnailTasks.get(taskKey);
            if (t) { t.status = 'failed'; t.error = err.message; }
            console.error(`[Batch Render] ❌ Remotion error: ${taskKey} — ${err.message}`);
          }
        }
      };
      // 并发启动 N 个 worker，各自顺序领取任务
      const workers = Array.from(
        { length: Math.min(REMOTION_CONCURRENCY, remotionQueue.length) },
        () => worker()
      );
      await Promise.all(workers);
      console.log(`[Batch Render] Remotion queue done (${remotionQueue.length} tasks)`);
    };

    // ── 4. Volcengine 队列（云端并发，本地 fire-and-forget）──────
    const runVolcQueue = async () => {
      const promises = volcQueue.map(async (chapter) => {
        const { chapterId, option } = chapter;
        const taskKey = `${chapterId}-${option.id}`;
        const task = thumbnailTasks.get(taskKey);
        if (!task) return;
        task.status = 'processing';

        try {
          const prompt = option.imagePrompt || option.prompt || '';
          console.log(`[Batch Render] ▶ Volcengine start: ${taskKey}`);
          const result = await generateImageWithVolc(prompt);
          const t = thumbnailTasks.get(taskKey);
          if (!t) return;

          if (result.image_url) {
            t.status = 'completed';
            t.imageUrl = result.image_url;
            console.log(`[Batch Render] ✅ Volcengine done (direct): ${taskKey}`);
          } else if (result.task_id) {
            t.taskId = result.task_id;
            t.status = 'pending';
            // 轮询云端任务
            let pollCount = 0;
            const maxPolls = 40; // 80秒超时
            while (pollCount < maxPolls) {
              pollCount++;
              await new Promise(r => setTimeout(r, 2000));
              const pollResult = await pollVolcImageResult(result.task_id as string);
              const ct = thumbnailTasks.get(taskKey);
              if (!ct) break;
              if (pollResult.status === 'completed' && pollResult.image_url) {
                ct.status = 'completed';
                ct.imageUrl = pollResult.image_url;
                console.log(`[Batch Render] ✅ Volcengine done (poll ${pollCount}): ${taskKey}`);
                break;
              } else if (pollResult.status === 'failed') {
                ct.status = 'failed';
                ct.error = pollResult.error || 'Volcengine task failed';
                console.error(`[Batch Render] ❌ Volcengine failed: ${taskKey}`);
                break;
              }
            }
            if (pollCount >= maxPolls) {
              const t2 = thumbnailTasks.get(taskKey);
              if (t2) { t2.status = 'failed'; t2.error = 'Timeout after 80s'; }
              console.error(`[Batch Render] ⏱ Volcengine timeout: ${taskKey}`);
            }
          } else {
            task.status = 'failed';
            task.error = result.error || 'Unknown Volcengine error';
          }
        } catch (err: any) {
          const t = thumbnailTasks.get(taskKey);
          if (t) { t.status = 'failed'; t.error = err.message; }
          console.error(`[Batch Render] ❌ Volcengine error: ${taskKey} — ${err.message}`);
        }
      });
      await Promise.all(promises);
      console.log(`[Batch Render] Volcengine queue done (${volcQueue.length} tasks)`);
    };

    // 两条流水线并行跑，互不阻塞
    Promise.all([runRemotionQueue(), runVolcQueue()]).catch(err => {
      console.error('[Batch Render] Queue error:', err);
    });

  } catch (error: any) {
    if (!res.headersSent) {
      console.error('[Phase2 Batch Render] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to trigger renders' });
    }
  }
};

// ============================================================
// Phase 3 终态比照与 XML 输出 API
// ============================================================

import { parseSRT, compileSRTForLLM, generateFCPXML, generateJianyingXML } from './srt-aligner';

export const phase3AlignSrt = async (req: Request, res: Response) => {
  const { projectId, srtContent, brolls } = req.body;
  if (!projectId || !srtContent || !brolls) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const segments = parseSRT(srtContent);
    const srtText = compileSRTForLLM(segments);

    // We call LLM to match each broll's keySentence to the SRT's text and timeframe.
    const prompt = `
You are a video editor AI. You have a list of B-Roll visual items and an SRT subtitle file content.
Your job is to match each B-Roll item to the exact timestamp in the SRT where it best belongs, based on the 'keySentence'.

SRT Segments:
${srtText}

B-Rolls to match:
${JSON.stringify(brolls, null, 2)}

Return a JSON array of matched alignments:
[
  {
    "brollId": "chapterId",
    "brollName": "name",
    "keySentence": "quote",
    "matchedText": "the text from srt that matched",
    "startTime": "HH:MM:SS,mmm",
    "endTime": "HH:MM:SS,mmm"
  }
]
Reply ONLY with the valid JSON array, no markdown.`;

    const globalConfig = resolveGlobalLLMConfig(loadConfig());
    ensureGlobalLLMReady(globalConfig.provider, globalConfig.model);
    const resultText = await callLLM([{ role: 'user', content: prompt }], globalConfig.provider as any, globalConfig.model);

    let alignments = [];
    try {
      alignments = JSON.parse(resultText.content.trim().replace(/^```json/i, '').replace(/```$/i, '').trim());
    } catch (e) {
      console.error('LLM format error:', resultText);
      throw new Error('LLM did not return proper JSON');
    }

    res.json({ success: true, alignments });
  } catch (error: any) {
    console.error('[Phase3 Align] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to align SRT' });
  }
};

export const phase3GenerateXml = async (req: Request, res: Response) => {
  const { projectId, alignments } = req.body;
  if (!projectId || !alignments) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);
    const outputDir = path.join(projectRoot, '04_Visuals');
    ensureDir(outputDir);

    const fcpxml = generateFCPXML(alignments, projectRoot);
    const jianying = generateJianyingXML(alignments, projectRoot);

    fs.writeFileSync(path.join(outputDir, 'sequence_premiere.xml'), fcpxml);
    fs.writeFileSync(path.join(outputDir, 'sequence_jianying.json'), jianying);

    res.json({ success: true, xmlPath: path.join(outputDir, 'sequence_premiere.xml') });
  } catch (error: any) {
    console.error('[Phase3 Generate] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate XML' });
  }
};

export const phase3DownloadXml = async (req: Request, res: Response) => {
  const { projectId, format } = req.params;
  try {
    const projectRoot = getProjectRoot(projectId as string);
    const fileName = format === 'premiere' ? 'sequence_premiere.xml' : 'sequence_jianying.json';
    const filePath = path.join(projectRoot, '04_Visuals', fileName);

    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: 'XML file not generated yet' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// Phase 3 (二审) — 真实 MP4 视频渲染队列
// ============================================================

// 独立于 thumbnailTasks，避免 key 冲突
const videoTasks = new Map<string, {
  taskId: string;
  type: 'remotion' | 'volcengine' | 'static';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;      // 可访问的 URL
  videoPath?: string;     // 本地文件路径
  error?: string;
  retryCount: number;
  progress?: number;      // 0-100
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}>();

// 视频文件 serve endpoint
export const serveVideoFile = async (req: Request, res: Response) => {
  const { projectId, filename } = req.params;
  try {
    const projectRoot = getProjectRoot(projectId);
    const videoPath = path.join(projectRoot, '04_Visuals', 'videos', filename);
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    const stat = fs.statSync(videoPath);
    const range = req.headers.range;

    if (range) {
      // Support range requests for video streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 轮询视频渲染状态
export const getVideoStatus = async (req: Request, res: Response) => {
  const { taskKey } = req.params;
  const task = videoTasks.get(taskKey);
  if (!task) {
    return res.status(404).json({ status: 'not_found', error: 'Task not found' });
  }
  res.json({
    status: task.status,
    videoUrl: task.videoUrl,
    error: task.error,
    retryCount: task.retryCount,
    progress: task.progress,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
  });
};

// Remotion 单条视频渲染（含重试）
async function renderRemotionVideo(
  chapterId: string,
  option: any,
  projectId: string,
  outputDir: string,
  maxRetries = 2
): Promise<void> {
  const taskKey = `${chapterId}-${option.id}`;
  const outputFileName = `video_${taskKey}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);
  const task = videoTasks.get(taskKey);
  if (!task) return;

  task.status = 'processing';
  task.startedAt = new Date().toISOString();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        task.retryCount = attempt;
        console.log(`[Video Render] ↻ Remotion retry ${attempt}/${maxRetries}: ${taskKey}`);
        await new Promise(r => setTimeout(r, 5000 * attempt));
      }

      const { compositionId, props } = buildRemotionPreview(option);
      const { renderVideoWithApi } = require('./remotion-api-renderer');

      await renderVideoWithApi(compositionId, outputPath, props, (pct: number) => {
        const t = videoTasks.get(taskKey);
        if (t) t.progress = pct;
      });

      const videoApiUrl = `/api/director/phase3/video-file/${projectId}/${outputFileName}`;
      const t = videoTasks.get(taskKey);
      if (t) {
        t.status = 'completed';
        t.videoUrl = videoApiUrl;
        t.videoPath = outputPath;
        t.progress = 100;
        t.completedAt = new Date().toISOString();
      }
      console.log(`[Video Render] ✅ Remotion done: ${taskKey} (attempt ${attempt + 1})`);
      return; // success
    } catch (err: any) {
      console.error(`[Video Render] ❌ Remotion error (attempt ${attempt + 1}): ${taskKey} — ${err.message}`);
      if (attempt === maxRetries) {
        const t = videoTasks.get(taskKey);
        if (t) { t.status = 'failed'; t.error = err.message; t.completedAt = new Date().toISOString(); }
      }
    }
  }
}

// Volcengine 单条视频渲染（含重试）
async function renderVolcengineVideo(
  chapterId: string,
  option: any,
  maxRetries = 2
): Promise<void> {
  const taskKey = `${chapterId}-${option.id}`;
  const task = videoTasks.get(taskKey);
  if (!task) return;

  task.status = 'processing';
  task.startedAt = new Date().toISOString();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        task.retryCount = attempt;
        console.log(`[Video Render] ↻ Volcengine retry ${attempt}/${maxRetries}: ${taskKey}`);
        await new Promise(r => setTimeout(r, 5000 * attempt));
      }

      const prompt = option.imagePrompt || option.prompt || '';
      console.log(`[Video Render] ▶ Volcengine start: ${taskKey}`);
      const result = await generateVideoWithVolc(prompt);

      if (result.error) throw new Error(result.error);

      if (result.video_url) {
        // Direct URL returned
        const t = videoTasks.get(taskKey);
        if (t) {
          t.status = 'completed';
          t.videoUrl = result.video_url;
          t.progress = 100;
          t.completedAt = new Date().toISOString();
        }
        console.log(`[Video Render] ✅ Volcengine done (direct): ${taskKey}`);
        return;
      }

      if (result.task_id) {
        // Poll cloud task
        const maxPolls = 60; // 120s timeout
        for (let p = 0; p < maxPolls; p++) {
          await new Promise(r => setTimeout(r, 2000));
          const poll = await pollVolcVideoResult(result.task_id as string);
          const t = videoTasks.get(taskKey);
          if (!t) return;
          if (poll.status === 'completed' && poll.video_url) {
            t.status = 'completed';
            t.videoUrl = poll.video_url;
            t.progress = 100;
            t.completedAt = new Date().toISOString();
            console.log(`[Video Render] ✅ Volcengine done (poll ${p + 1}): ${taskKey}`);
            return;
          } else if (poll.status === 'failed' || poll.error) {
            throw new Error(poll.error || 'Volcengine video task failed');
          }
          // Update progress estimate
          if (t) t.progress = Math.min(90, Math.round((p / maxPolls) * 100));
        }
        throw new Error('Volcengine video task timeout after 120s');
      }

      throw new Error(`No task_id or video_url from Volcengine`);
    } catch (err: any) {
      console.error(`[Video Render] ❌ Volcengine error (attempt ${attempt + 1}): ${taskKey} — ${err.message}`);
      if (attempt === maxRetries) {
        const t = videoTasks.get(taskKey);
        if (t) { t.status = 'failed'; t.error = err.message; t.completedAt = new Date().toISOString(); }
      }
    }
  }
}

// Phase 3 批量视频渲染
export const phase3RenderBatch = async (req: Request, res: Response) => {
  const { projectId, chapters } = req.body;
  if (!projectId || !chapters || !Array.isArray(chapters)) {
    return res.status(400).json({ error: 'Missing projectId or chapters list' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);
    const outputDir = path.join(projectRoot, '04_Visuals', 'videos');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    // 1. 分类 & 预注册
    const triggeredTaskKeys: string[] = [];
    const remotionQueue: Array<{ chapterId: string; option: any }> = [];
    const volcQueue: Array<{ chapterId: string; option: any }> = [];
    const staticItems: Array<{ chapterId: string; option: any }> = [];

    for (const chapter of chapters) {
      const { chapterId, option } = chapter;
      if (!chapterId || !option?.id) continue;

      const taskKey = `${chapterId}-${option.id}`;
      triggeredTaskKeys.push(taskKey);

      let taskType: 'remotion' | 'volcengine' | 'static' = 'static';
      if (option.type === 'remotion') taskType = 'remotion';
      else if (['seedance', 'generative'].includes(option.type)) taskType = 'volcengine';

      videoTasks.set(taskKey, {
        taskId: `p3-${taskKey}`,
        type: taskType,
        status: 'pending',
        retryCount: 0,
        progress: 0,
        createdAt: new Date().toISOString(),
      });

      if (taskType === 'remotion') remotionQueue.push(chapter);
      else if (taskType === 'volcengine') volcQueue.push(chapter);
      else staticItems.push(chapter);
    }

    // 2. 立即返回，前端开始轮询
    res.json({
      success: true,
      taskKeys: triggeredTaskKeys,
      counts: { remotion: remotionQueue.length, volcengine: volcQueue.length, static: staticItems.length },
      message: `已触发 ${triggeredTaskKeys.length} 个视频渲染（Remotion×${remotionQueue.length} / Volcengine×${volcQueue.length} / 静态×${staticItems.length}）`,
    });

    // Static items: reuse Phase 2 thumbnail as videoUrl
    for (const { chapterId, option } of staticItems) {
      const taskKey = `${chapterId}-${option.id}`;
      const previewUrl = option.previewUrl || option.imagePrompt || null;
      const t = videoTasks.get(taskKey);
      if (t) {
        t.status = 'completed';
        t.videoUrl = previewUrl;
        t.progress = 100;
        t.completedAt = new Date().toISOString();
      }
    }

    // 3. Remotion 并发队列（3 workers）
    const REMOTION_VIDEO_CONCURRENCY = 3;
    const runRemotionQueue = async () => {
      let idx = 0;
      const worker = async () => {
        while (idx < remotionQueue.length) {
          const chapter = remotionQueue[idx++];
          await renderRemotionVideo(chapter.chapterId, chapter.option, projectId, outputDir);
        }
      };
      const workers = Array.from(
        { length: Math.min(REMOTION_VIDEO_CONCURRENCY, remotionQueue.length) },
        () => worker()
      );
      await Promise.all(workers);
      console.log(`[Video Render] Remotion queue complete (${remotionQueue.length} tasks)`);
    };

    // 4. Volcengine 全并发
    const runVolcQueue = async () => {
      await Promise.all(volcQueue.map(ch => renderVolcengineVideo(ch.chapterId, ch.option)));
      console.log(`[Video Render] Volcengine queue complete (${volcQueue.length} tasks)`);
    };

    Promise.all([runRemotionQueue(), runVolcQueue()]).catch(err => {
      console.error('[Video Render] Queue error:', err);
    });

  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
};

// ============================================================
// Phase 2 — 反馈优化提示词
// ============================================================

export const phase2ReviseOption = async (req: Request, res: Response) => {
  const { projectId, chapterId, optionId, userFeedback } = req.body;
  if (!projectId || !chapterId || !optionId || !userFeedback) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const projectRoot = getProjectRoot(projectId);
    const storePath = path.join(projectRoot, 'delivery_store.json');
    let storeData: any = {};
    if (fs.existsSync(storePath)) {
      try { storeData = JSON.parse(fs.readFileSync(storePath, 'utf-8')); } catch {}
    }

    const chapters: any[] = storeData?.modules?.director?.phase2?.chapters || [];
    const chapter = chapters.find((c: any) => c.chapterId === chapterId);
    const option = chapter?.options?.find((o: any) => o.id === optionId);

    if (!option) {
      return res.status(404).json({ error: 'Option not found' });
    }

    const currentPrompt = option.imagePrompt || option.prompt || '';
    const scriptText = chapter?.scriptText || '';

    const messages = [
      {
        role: 'system' as const,
        content: `You are a professional visual prompt engineer specializing in video B-roll and AI image generation.
Your task: given the original script context, current prompt, and user feedback — rewrite the prompt to better match the user's intent.
Return ONLY the improved prompt text in the same language style as the original prompt (English preferred for image/video AI).
Keep it concise (under 100 words) and actionable.`
      },
      {
        role: 'user' as const,
        content: `Script context: "${scriptText.slice(0, 200)}"
Current prompt: "${currentPrompt}"
User feedback: "${userFeedback}"

Please rewrite the prompt based on the user's feedback. Return only the new prompt text.`
      }
    ];

    const globalConfig = resolveGlobalLLMConfig(loadConfig());
    ensureGlobalLLMReady(globalConfig.provider, globalConfig.model);
    const response = await callLLM(messages, globalConfig.provider as any, globalConfig.model);
    const revisedPrompt = response.content?.trim() || currentPrompt;

    res.json({ success: true, revisedPrompt });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// Phase 4 — 扫描 SRT 文件目录
// ============================================================

export const phase4ScanSrt = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ error: 'Missing projectId' });

  try {
    const projectRoot = getProjectRoot(projectId as string);
    const srtFiles: Array<{ name: string; path: string; size: number; mtime: string }> = [];

    // Scan common SRT locations
    const scanDirs = [
      path.join(projectRoot, '05_Audio'),
      path.join(projectRoot, 'srt'),
      path.join(projectRoot, '03_Script'),
      projectRoot,
    ];

    for (const dir of scanDirs) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.srt'));
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        srtFiles.push({
          name: file,
          path: fullPath,
          size: stat.size,
          mtime: stat.mtime.toISOString(),
        });
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const unique = srtFiles.filter(f => { if (seen.has(f.name)) return false; seen.add(f.name); return true; });

    res.json({ success: true, srtFiles: unique, count: unique.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Serve locally stored SRT content
export const phase4ReadSrt = async (req: Request, res: Response) => {
  const { projectId } = req.query;
  const { filename } = req.params;
  if (!projectId || !filename) return res.status(400).json({ error: 'Missing params' });

  try {
    const projectRoot = getProjectRoot(projectId as string);
    const scanDirs = [
      path.join(projectRoot, '05_Audio'),
      path.join(projectRoot, 'srt'),
      path.join(projectRoot, '03_Script'),
      projectRoot,
    ];

    for (const dir of scanDirs) {
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return res.json({ success: true, content, filename });
      }
    }
    res.status(404).json({ error: 'SRT file not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
