import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { generateBRollOptions, BRollOption } from './llm';
import { generateImageWithVolc, pollVolcImageResult } from './volcengine';

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

function parseMarkdownChapters(content: string): { title: string; text: string }[] {
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

function loadSelectionState(projectRoot: string): SelectionState | null {
  const statePath = path.join(projectRoot, '04_Visuals', 'selection_state.json');
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  }
  return null;
}

export const generatePhase1 = (req: Request, res: Response) => {
  const { projectId, scriptPath } = req.body;

  if (!projectId || !scriptPath) {
    return res.status(400).json({ error: 'Missing projectId or scriptPath' });
  }

  const projectRoot = getProjectRoot(projectId);
  const scriptFullPath = path.join(projectRoot, scriptPath);

  if (!fs.existsSync(scriptFullPath)) {
    return res.status(404).json({ error: 'Script file not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const concept = `# 视觉概念提案

## 整体基调
本视频采用理性冷静的深色科技风格，配合数据可视化元素...

## 视觉风格
- 主色调：深蓝 + 金色高亮
- 动画风格：平滑渐变 + 粒子效果
- 字体：无衬线，极简

## 分镜建议
- Intro: 震撼开场，数据流动画
- 第一章: 概念讲解，实拍素材
- 第二章: 案例分析，图表展示
- Ending: 总结升华，淡出`;

  res.write(`data: ${JSON.stringify({ type: 'content', content: concept })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
};

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
  res.write(`data: ${JSON.stringify({ type: 'progress', current: 0, total: totalSteps, message: '开始解析章节...' })}\n\n`);

  for (let i = 0; i < parsedChapters.length; i++) {
    const parsed = parsedChapters[i];
    const chapterId = `ch${i + 1}`;

    res.write(`data: ${JSON.stringify({ type: 'chapter_start', chapterIndex: i, chapterName: parsed.title })}\n\n`);

    const brollOptions = await generateBRollOptions(
      parsed.title,
      parsed.text,
      brollTypes as ('remotion' | 'generative' | 'artlist')[]
    );

    const chapter: DirectorChapter = {
      chapterId,
      chapterIndex: i,
      chapterName: parsed.title,
      scriptText: parsed.text.slice(0, 500),
      options: brollOptions.map((opt, idx) => ({
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
  res.end();
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
  path.join(os.homedir(), '.opencode/skills/RemotionStudio');

export const generateThumbnail = async (req: Request, res: Response) => {
  const { prompt, type, textPrompt, optionId, chapterId } = req.body;

  if (!prompt || !optionId || !chapterId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const taskKey = `${chapterId}-${optionId}`;

  if (type === 'remotion') {
    // 1. Mark task as pending
    thumbnailTasks.set(taskKey, {
      taskId: `remotion-${Date.now()}`,
      type: 'remotion',
      status: 'processing', // We can skip pending and go straight to processing
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      taskId: thumbnailTasks.get(taskKey)!.taskId,
      taskKey,
      status: 'processing'
    });

    // 2. Spawn Remotion still render in background
    const outputFileName = `thumb_${taskKey}.png`;

    // We'll save the thumbnails into the project's Visuals folder
    const projectId = req.body.projectId || process.env.PROJECT_NAME || 'CSET-SP3';
    const projectRoot = getProjectRoot(projectId);
    const outputDir = path.join(projectRoot, '04_Visuals', 'thumbnails');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, outputFileName);

    // Minimal props passing the text prompt to the SceneComposer template
    const propsJson = JSON.stringify({ text: textPrompt || prompt });

    const args = [
      'run', 'still',
      'SceneComposer', // Assuming SceneComposer is the default template, maybe make this dynamic later
      outputPath,
      `--props=${propsJson}`
    ];

    console.log(`[Remotion Thumbnail] Rendering still -> ${outputPath}`);

    const renderProcess = spawn('npm', args, {
      cwd: REMOTION_STUDIO_DIR,
      env: { ...process.env, NODE_ENV: 'production' },
      shell: true
    });

    let stderr = '';
    renderProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    renderProcess.on('close', (code) => {
      const task = thumbnailTasks.get(taskKey);
      if (!task) return;

      if (code === 0 && fs.existsSync(outputPath)) {
        // We serve the local file by relative path accessible to the frontend 
        // Currently the frontend expects an absolute URL or a path it can load.
        // Assuming /Projects/... is tricky to serve statically here without a mount,
        // let's copy it to a public dir or serve it via a dedicated route if needed. 
        // For now, let's returning the absolute path or a static URL. 
        // The DeliveryConsole frontend usually accesses local files if they are in public/ 
        // or through a specific API. 
        // Wait, standard `delivery_console` `api/files` or direct serving? 
        // Usually, `getThumbnailStatus` returns the full path and the frontend `<img>` tag loads it via a local path if it's an electron/local app, OR we need to serve it.
        // Let's use an API route to serve thumbnails or just pass the absolute path if the frontend handles file:/// natively.
        // Since SD-202 is a web app, we might need a route. BUT the previous AI returned a URL (`task.imageUrl`).

        // Quick fix: Add a route to serve these thumbnails, or base64 encode it since it's just a thumbnail.
        // Base64 encoding is safest and easiest without adding new mounts.
        try {
          const imageBuffer = fs.readFileSync(outputPath);
          const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

          task.status = 'completed';
          task.imageUrl = base64Image;
          console.log(`[Remotion Thumbnail] Success: ${taskKey}`);
        } catch (e: any) {
          task.status = 'failed';
          task.error = `Failed to read generated thumbnail: ${e.message}`;
        }
      } else {
        task.status = 'failed';
        task.error = `Render failed with code ${code}: ${stderr}`;
        console.error(`[Remotion Thumbnail Error] ${task.error}`);
      }
    });

    return;
  }

  // Fallback to Volcengine
  try {
    const result = await generateImageWithVolc(prompt);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    if (result.task_id) {
      const taskKey = `${chapterId}-${optionId}`;
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
      const taskKey = `${chapterId}-${optionId}`;
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
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.status === 'completed') {
    return res.json({ status: 'completed', imageUrl: task.imageUrl });
  }

  if (task.status === 'failed') {
    return res.json({ status: 'failed', error: task.error });
  }

  if (task.type === 'remotion') {
    // For remotion, status is updated by the spawn process callbacks in generateThumbnail
    return res.json({ status: task.status });
  }

  // Volcengine Polling Logic
  if (task.taskId) {
    try {
      const result = await pollVolcImageResult(task.taskId);

      if (result.image_url) {
        task.status = 'completed';
        task.imageUrl = result.image_url;
        return res.json({ status: 'completed', imageUrl: result.image_url });
      }

      if (result.error) {
        task.status = 'failed';
        task.error = result.error;
        return res.json({ status: 'failed', error: result.error });
      }

      task.status = 'processing';
      return res.json({ status: 'processing' });
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      return res.json({ status: 'failed', error: error.message });
    }
  }

  res.json({ status: task.status });
};
