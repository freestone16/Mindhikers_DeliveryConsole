import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { getProjectRoot } from './project-root';

const REMOTION_STUDIO_DIR = process.env.REMOTION_STUDIO_DIR ||
  path.join(os.homedir(), '.opencode/skills/RemotionStudio');

interface VisualPlanScene {
  id: string;
  timestamp: string;
  script_line: string;
  type: 'remotion' | 'seedance' | 'artlist' | 'infographic';
  template?: string;
  props?: Record<string, unknown>;
  prompt?: string;
  status: 'pending_review' | 'approved' | 'rejected';
}

interface VisualPlan {
  version: string;
  project: string;
  created_at: string;
  scenes: VisualPlanScene[];
}

interface RenderBrollsRequest {
  projectId: string;
  sceneIds?: string[];
}

interface RenderResult {
  sceneId: string;
  success: boolean;
  outputPath?: string;
  gifPath?: string;
  error?: string;
}

interface WeaveTimelineRequest {
  projectId: string;
  arollPath: string;
  srtPath: string;
  brollPaths: string[];
  fps?: number;
}

interface TimelineClip {
  file: string;
  startFrame: number;
  endFrame: number;
  track: number;
}

const activeRenders = new Map<string, any>();

export const renderBrolls = async (req: Request, res: Response) => {
  const { projectId, sceneIds } = req.body as RenderBrollsRequest;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  const projectRoot = getProjectRoot(projectId);
  const visualPlanPath = path.join(projectRoot, '04_Visuals', 'visual_plan.json');

  if (!fs.existsSync(visualPlanPath)) {
    return res.status(404).json({ error: 'visual_plan.json not found. Please complete Phase 2 first.' });
  }

  const visualPlan: VisualPlan = JSON.parse(fs.readFileSync(visualPlanPath, 'utf-8'));

  const scenesToRender = sceneIds
    ? visualPlan.scenes.filter(s => sceneIds.includes(s.id) && s.type === 'remotion')
    : visualPlan.scenes.filter(s => s.type === 'remotion' && s.status === 'approved');

  if (scenesToRender.length === 0) {
    return res.json({
      success: true,
      message: 'No Remotion scenes to render',
      results: []
    });
  }

  const outputDir = path.join(projectRoot, '06_Video_Broll');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const taskId = `render-${Date.now()}`;

  res.json({
    taskId,
    message: `Started rendering ${scenesToRender.length} scenes`,
    sceneCount: scenesToRender.length
  });

  const results: RenderResult[] = [];

  for (const scene of scenesToRender) {
    const result = await renderSingleScene(scene, outputDir, projectRoot);
    results.push(result);
  }

  const resultPath = path.join(projectRoot, '04_Visuals', 'render_results.json');
  fs.writeFileSync(resultPath, JSON.stringify({
    taskId,
    completedAt: new Date().toISOString(),
    results
  }, null, 2));
};

async function renderSingleScene(
  scene: VisualPlanScene,
  outputDir: string,
  _projectRoot: string
): Promise<RenderResult> {
  const template = scene.template || 'SceneComposer';
  const baseName = `broll_${scene.id}`;
  const mp4Path = path.join(outputDir, `${baseName}.mp4`);
  const gifPath = path.join(outputDir, `${baseName}.gif`);

  const propsJson = scene.props ? JSON.stringify(scene.props) : '{}';

  return new Promise((resolve) => {
    const args = [
      'run', 'render',
      template,
      mp4Path,
      '--codec=h264',
      `--props=${propsJson}`
    ];

    console.log(`[Remotion] Rendering ${template} -> ${mp4Path}`);

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
      if (code === 0) {
        resolve({
          sceneId: scene.id,
          success: true,
          outputPath: mp4Path,
          gifPath: fs.existsSync(gifPath) ? gifPath : undefined
        });
      } else {
        resolve({
          sceneId: scene.id,
          success: false,
          error: `Render failed with code ${code}: ${stderr}`
        });
      }
    });

    renderProcess.on('error', (err) => {
      resolve({
        sceneId: scene.id,
        success: false,
        error: `Failed to spawn render process: ${err.message}`
      });
    });
  });
}

export const getRenderStatus = (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const projectId = req.query.projectId as string;

  if (!projectId) {
    return res.status(400).json({ error: 'Missing projectId' });
  }

  const projectRoot = getProjectRoot(projectId);
  const resultPath = path.join(projectRoot, '04_Visuals', 'render_results.json');

  if (fs.existsSync(resultPath)) {
    const results = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    if (results.taskId === taskId) {
      return res.json({
        taskId,
        status: 'completed',
        results: results.results
      });
    }
  }

  if (activeRenders.has(taskId)) {
    return res.json({
      taskId,
      status: 'running',
      ...activeRenders.get(taskId)
    });
  }

  res.json({
    taskId,
    status: 'pending'
  });
};

export const weaveTimeline = (req: Request, res: Response) => {
  const { projectId, arollPath, srtPath, brollPaths, fps = 30 } = req.body as WeaveTimelineRequest;

  if (!projectId || !arollPath || !srtPath) {
    return res.status(400).json({ error: 'Missing required fields: projectId, arollPath, srtPath' });
  }

  const projectRoot = getProjectRoot(projectId);

  const arollFullPath = path.isAbsolute(arollPath) ? arollPath : path.join(projectRoot, arollPath);
  const srtFullPath = path.isAbsolute(srtPath) ? srtPath : path.join(projectRoot, srtPath);

  if (!fs.existsSync(arollFullPath)) {
    return res.status(404).json({ error: `A-roll file not found: ${arollFullPath}` });
  }
  if (!fs.existsSync(srtFullPath)) {
    return res.status(404).json({ error: `SRT file not found: ${srtFullPath}` });
  }

  const srtContent = fs.readFileSync(srtFullPath, 'utf-8');
  const subtitles = parseSRT(srtContent);

  const clips: TimelineClip[] = [];
  const frameDuration = 1000 / fps;

  subtitles.forEach((sub, index) => {
    clips.push({
      file: arollFullPath,
      startFrame: Math.round(sub.startTime / frameDuration),
      endFrame: Math.round(sub.endTime / frameDuration),
      track: 1
    });

    if (brollPaths[index]) {
      const brollPath = path.isAbsolute(brollPaths[index])
        ? brollPaths[index]
        : path.join(projectRoot, brollPaths[index]);

      if (fs.existsSync(brollPath)) {
        clips.push({
          file: brollPath,
          startFrame: Math.round(sub.startTime / frameDuration),
          endFrame: Math.round(sub.endTime / frameDuration),
          track: 2
        });
      }
    }
  });

  const xml = generateFCPXML({
    projectName: projectId,
    fps,
    clips
  });

  const outputDir = path.join(projectRoot, '07_Timeline');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'final_project.xml');
  fs.writeFileSync(outputPath, xml);

  res.json({
    success: true,
    outputPath,
    message: 'XML 已降落 🛸，请立即用您的 Premiere Pro 打开',
    stats: {
      totalClips: clips.length,
      arollClips: clips.filter(c => c.track === 1).length,
      brollClips: clips.filter(c => c.track === 2).length
    }
  });
};

interface SRTEntry {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

function parseSRT(content: string): SRTEntry[] {
  const entries: SRTEntry[] = [];
  const blocks = content.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

    if (timeMatch) {
      const startTime = parseInt(timeMatch[1]) * 3600000 +
        parseInt(timeMatch[2]) * 60000 +
        parseInt(timeMatch[3]) * 1000 +
        parseInt(timeMatch[4]);
      const endTime = parseInt(timeMatch[5]) * 3600000 +
        parseInt(timeMatch[6]) * 60000 +
        parseInt(timeMatch[7]) * 1000 +
        parseInt(timeMatch[8]);
      const text = lines.slice(2).join('\n');

      entries.push({ index, startTime, endTime, text });
    }
  }

  return entries;
}

interface FCPXMLParams {
  projectName: string;
  fps: number;
  clips: TimelineClip[];
}

function generateFCPXML(params: FCPXMLParams): string {
  const { projectName, fps, clips } = params;
  const frameDuration = `100/${fps * 100}s`;

  const trackGroups: Record<number, TimelineClip[]> = {};
  clips.forEach(clip => {
    if (!trackGroups[clip.track]) {
      trackGroups[clip.track] = [];
    }
    trackGroups[clip.track].push(clip);
  });

  let trackXML = '';
  Object.keys(trackGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(trackNum => {
    const trackClips = trackGroups[parseInt(trackNum)];
    let clipItems = '';

    trackClips.forEach((clip, idx) => {
      const fileName = path.basename(clip.file);
      clipItems += `
        <clipitem id="clip_${trackNum}_${idx}">
          <name>${fileName}</name>
          <duration>360000</duration>
          <start>${clip.startFrame}</start>
          <end>${clip.endFrame}</end>
          <in>0</in>
          <out>${clip.endFrame - clip.startFrame}</out>
          <file id="file_${trackNum}_${idx}">
            <name>${fileName}</name>
            <pathurl>file://localhost/${clip.file}</pathurl>
          </file>
        </clipitem>`;
    });

    trackXML += `
        <track>
          ${clipItems}
        </track>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <project>
    <name>${projectName}</name>
    <children>
      <sequence id="sequence-1">
        <name>Main Sequence</name>
        <duration>360000</duration>
        <rate>
          <timebase>${fps}</timebase>
          <ntsc>FALSE</ntsc>
        </rate>
        <timecode>
          <rate>
            <timebase>${fps}</timebase>
            <ntsc>FALSE</ntsc>
          </rate>
          <string>00:00:00:00</string>
          <frame>0</frame>
          <source>source</source>
        </timecode>
        <media>
          <video>
            <format>
              <samplecharacteristics>
                <width>1920</width>
                <height>1080</height>
                <rate>
                  <timebase>${fps}</timebase>
                  <ntsc>FALSE</ntsc>
                </rate>
              </samplecharacteristics>
            </format>
            ${trackXML}
          </video>
        </media>
      </sequence>
    </children>
  </project>
</xmeml>`;
}
