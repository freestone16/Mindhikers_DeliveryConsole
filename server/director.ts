import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const getProjectRoot = (projectId: string): string => {
  const PROJECTS_BASE = process.env.PROJECTS_BASE || path.join(process.cwd(), 'Projects');
  return path.join(PROJECTS_BASE, projectId);
};

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

export const startPhase2 = (req: Request, res: Response) => {
  const { projectId, brollTypes } = req.body;
  
  if (!projectId || !brollTypes || brollTypes.length === 0) {
    return res.status(400).json({ error: 'Missing projectId or brollTypes' });
  }

  const taskId = `phase2-${Date.now()}`;
  
  res.json({ taskId, message: 'Preview generation started' });
};

export const getPhase2Status = (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  // TODO: Query actual status from task storage
  res.json({ 
    taskId, 
    progress: '3/12', 
    status: 'running' 
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
