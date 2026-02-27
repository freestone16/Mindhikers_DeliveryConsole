import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { generateBRollOptions, generateGlobalBRollPlan, generateFallbackOptions, BRollOption, callLLM } from './llm';
import { generateImageWithVolc, pollVolcImageResult } from './volcengine';
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

  const totalSteps = parsedChapters.length * 3;
  const chapters: DirectorChapter[] = [];

  taskStorage.set(taskId, {
    taskId,
    projectId,
    status: 'running',
    progress: { current: 0, total: totalSteps },
    chapters: [],
    createdAt: new Date().toISOString()
  });

  res.write(`data: ${JSON.stringify({ type: 'taskId', taskId })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'progress', current: 0, total: totalSteps, message: '导演正在全局审片并划分视觉节奏...' })}\n\n`);

  try {
    const config = loadConfig();
    const globalConfig = config.global || { provider: 'deepseek', model: 'deepseek-chat' };

    // 上帝视角：一次性生成全局分配方案
    const globalPlan = await generateGlobalBRollPlan(
      parsedChapters.map((pc, idx) => ({ id: `ch${idx + 1}`, name: pc.title, text: pc.text })),
      brollTypes as ('remotion' | 'generative' | 'artlist')[],
      globalConfig.provider as any,
      globalConfig.model
    );

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

    // 将全局方案分发回各个章节
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

      const task = taskStorage.get(taskId);
      if (task) {
        task.progress.current = (i + 1) * 3;
        task.chapters = chapters;
      }

      res.write(`data: ${JSON.stringify({ type: 'chapter_ready', chapter })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'progress', current: (i + 1) * 3, total: totalSteps, message: `已完成 ${i + 1}/${parsedChapters.length} 章` })}\n\n`);
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
  } catch (error) {
    console.error('Phase 2 Global Generation failed:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: '全局生成失败，请重试' })}\n\n`);
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
  prompt?: string;
  imagePrompt?: string;
  rationale?: string;
}): RemotionInputProps {
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
    title: option.name || '视觉方案预览',
    subtitle: option.rationale ? truncate(option.rationale, 50) : '',
    layers,
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

    const inputProps = buildRemotionPreview(option);

    try {
      console.log(`[Remotion Thumbnail] Starting sync render: ${taskKey}`);
      const { renderStillWithApi } = require('./remotion-api-renderer');
      await renderStillWithApi('SceneComposer', outputPath, inputProps);

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
