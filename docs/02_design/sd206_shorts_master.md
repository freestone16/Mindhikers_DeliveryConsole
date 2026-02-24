# 🎬 [SD-206] 短视频大师 (Shorts Master) — GLM 团队研发实施规格书

> **版本**: V2 定版  
> **模块 ID**: SD-206  
> **设计方**: OldYang (老杨)  
> **日期**: 2026-02-24  
> **前置依赖**: SD-202 (Director Master)、INF-001 (LLM Config)、RemotionStudio  
> **参照模块**: `DirectorSection.tsx` + `server/director.ts` (架构模式完全一致)

---

## 0. 给 GLM 团队的开发指引

> ⚠️ **必读**：本模块的架构模式与导演大师 (SD-202) **完全一致**，请先通读以下文件：
> 1. `src/components/DirectorSection.tsx` — 顶层容器组件的 Phase 切换和 SSE 消费模式
> 2. `server/director.ts` — 后端 SSE 流式推送 + 异步任务 + 文件持久化模式
> 3. `server/llm.ts` — LLM 多 Provider 调用抽象层
> 4. `src/types.ts` — 全局类型定义
> 5. `server/index.ts` — 路由注册和 Socket.IO 广播模式

---

## 1. 模块总览

短视频大师是 **9:16 竖屏 Shorts 的端到端批量生产管线**，三阶段 Human-in-the-loop：

```
Phase 1 (脚本工厂) → Phase 2 (文案精修表格) → Phase 3 (渲染交付台)
```

**核心特性**：
- Phase 1 → Phase 2 **无审核，直通**
- 以 **单条 Short** 为工作粒度
- 字幕使用 **Whisper ASR 识别 + 用户精修**
- 品牌页眉使用 **双 Logo + 中间文字编排器**
- 最终渲染 **B 为主 + A 为备**（FFmpeg 自动合成 + FCPXML 兜底）

---

## 2. Step 0: 前置准备工作

### 2.1 更新 `experts.ts`

文件: `src/config/experts.ts`

将 ShortsMaster 的 `name` 从 `'短视频操盘手'` 改为 `'短视频大师'`：

```diff
 {
     id: 'ShortsMaster',
-    name: '短视频操盘手',
-    description: '深度内容转病毒式短视频脚本',
+    name: '短视频大师',
+    description: '端到端竖屏 Shorts 批量生产管线，从脚本到渲染到交付',
     icon: 'Video',
     color: 'cyan',
     skillName: 'ShortsMaster',
     outputDir: '05_Shorts_Output'
 },
```

### 2.2 更新 `types.ts` — 新增类型定义

文件: `src/types.ts`

在文件末尾追加以下类型（**不要删除已有类型**，保留向后兼容）：

```typescript
// ============================================================
// SD-206: Shorts Master V2 Types
// ============================================================

export type CTA = 'follow' | 'share' | 'comment' | 'link' | 'subscribe';

export interface ShortsGenerateRequest {
  projectId: string;
  count: number;
  ctaDistribution: CTA[];
  topic: string;
  style: 'suspense' | 'knowledge' | 'emotion' | 'contrast' | 'narrative';
}

export interface ShortScript {
  id: string;
  index: number;
  scriptText: string;
  cta: CTA;
  hookType: string;
  thumbnailUrl?: string;
  status: 'draft' | 'editing' | 'regenerating' | 'confirmed';
  userComment?: string;
}

export interface ShortBRoll {
  id: string;
  timeRange: string;            // "0:05-0:08"
  scriptContext: string;
  type: 'remotion' | 'seedance';
  thumbnailUrl?: string;
  confirmed: boolean;
  userComment?: string;
  template?: string;
  props?: Record<string, unknown>;
  prompt?: string;
}

export interface WhisperSegment {
  id: number;
  start: number;      // 秒
  end: number;         // 秒
  text: string;
  confidence: number;
}

export interface SubtitleConfig {
  id: string;           // 'preset-1' | 'preset-2' | 'preset-3'
  name: string;
  fontFamily: string;
  fontSize: number;     // px
  fontColor: string;    // hex
  strokeColor: string;
  strokeWidth: number;
  position: 'bottom' | 'center' | 'top';
  animation: 'none' | 'fade' | 'typewriter' | 'karaoke';
}

export interface HeaderOverlayConfig {
  enabled: boolean;
  leftLogo?: string;       // 方形 PNG 路径（相对于项目根目录）
  rightLogo?: string;
  centerText?: string;
  textFont?: string;
  textColor?: string;
  textSize?: number;
  bgColor?: string;        // 支持 rgba
  height?: number;          // px, 默认 80
}

export interface ShortRenderUnit {
  id: string;
  shortScriptId: string;
  aroll: {
    originalPath?: string;
    croppedPath?: string;
    confirmed: boolean;
  };
  brolls: ShortBRoll[];
  thumbnail: {
    imageUrl?: string;
    confirmed: boolean;
  };
  subtitle: {
    srtPath?: string;
    segments: WhisperSegment[];
    configId: string;
    confirmed: boolean;
  };
  bgm: {
    source: 'preset' | 'custom';
    path?: string;
    name?: string;
  };
  headerOverlay: boolean;
  renderStatus: 'pending' | 'rendering' | 'completed' | 'failed';
  outputPaths?: {
    brollDir: string;
    fcpxmlPath: string;
    finalVideoPath?: string;
  };
}

export interface ShortsModule_V2 {
  phase: 1 | 2 | 3;
  scripts: ShortScript[];
  renderUnits: ShortRenderUnit[];
  subtitleConfigs: SubtitleConfig[];
  headerConfig?: HeaderOverlayConfig;
  generationConfig?: ShortsGenerateRequest;
}
```

### 2.3 更新 `DeliveryState`

在 `src/types.ts` 的 `DeliveryState.modules` 中，将 shorts 类型改为兼容新旧结构：

```diff
 modules: {
     director: DirectorModule;
     music: MusicModule;
     thumbnail: ThumbnailModule;
     marketing: MarketingModule;
-    shorts: ShortsModule;
+    shorts: ShortsModule | ShortsModule_V2;
 };
```

或者直接升级为 `ShortsModule_V2`（推荐），但需要同步更新 `server/index.ts` 中 `ensureDeliveryFile()` 的初始化逻辑。

---

## 3. Phase 1: 脚本工厂 (Script Factory)

### 3.1 前端组件

#### `src/components/shorts/ShortsPhase1.tsx`

**Props 接口**：
```typescript
interface ShortsPhase1Props {
  projectId: string;
  onGenerated: (scripts: ShortScript[]) => void;  // 生成完后回调，直通 Phase 2
}
```

**UI 构成**：
- 一个表单卡片，包含：
  - `shorts 数量` (number input, 1-20, 默认 6)
  - `CTA 分配策略` (一个小表格：为每条 Short 分配 CTA 类型，或一个简化的 select 选择默认策略)
  - `内容来源/主题` (textarea)
  - `风格偏好` (select: 悬疑/知识/情绪/对比/叙事)
  - 【🚀 生成脚本】按钮

**行为**：
1. 用户点击按钮 → `POST /api/shorts/phase1/generate` (SSE)
2. SSE 流式收到每条脚本 → 逐条累积到本地 state
3. SSE 收到 `{ type: 'done' }` → 自动调用 `onGenerated(scripts)` → 父组件切换到 Phase 2

**SSE 消费模式参照**: `DirectorSection.tsx` 第 41-100 行的 `handleGenerateConcept`。

### 3.2 后端 API

#### `server/shorts.ts` — `generateScripts`

```typescript
export const generateScripts = async (req: Request, res: Response) => {
  const { projectId, count, ctaDistribution, topic, style } = req.body;
  
  // 1. 参数校验
  if (!projectId || !count) {
    return res.status(400).json({ error: 'Missing projectId or count' });
  }
  
  // 2. 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // 3. 构造 LLM Prompt
  const systemPrompt = SYSTEM_PROMPTS.shortsGenerator;
  const userMessage = `
主题: ${topic}
风格: ${style}
生成数量: ${count}
CTA 分配: ${JSON.stringify(ctaDistribution)}

请生成 ${count} 条短视频脚本。每条控制在 80-150 字。
输出 JSON 数组格式:
[{ "index": 1, "scriptText": "...", "cta": "follow", "hookType": "..." }]
  `;
  
  // 4. 调用 LLM (使用 server/llm.ts 的 callLLM)
  try {
    const response = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      'deepseek'  // 或从 LLM Config 读取
    );
    
    const scripts: ShortScript[] = JSON.parse(response.content).map(
      (item: any, i: number) => ({
        id: `short-${String(i + 1).padStart(3, '0')}`,
        index: i + 1,
        scriptText: item.scriptText,
        cta: item.cta || ctaDistribution[i] || 'follow',
        hookType: item.hookType || 'generic',
        status: 'draft' as const,
      })
    );
    
    // 5. 逐条吐出
    for (const script of scripts) {
      res.write(`data: ${JSON.stringify({ type: 'script', script })}\n\n`);
    }
    
    // 6. 持久化到项目目录
    const projectRoot = getProjectRoot(projectId);
    const outputDir = path.join(projectRoot, '05_Shorts_Output');
    ensureDir(outputDir);
    const statePath = path.join(outputDir, 'shorts_state.json');
    const state = { phase: 2, scripts, renderUnits: [], generationConfig: req.body };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    
    res.write(`data: ${JSON.stringify({ type: 'done', scripts })}\n\n`);
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
};
```

**LLM System Prompt** (`SYSTEM_PROMPTS.shortsGenerator`):

```typescript
export const SYSTEM_PROMPTS = {
  // ... 保留已有的 brollGenerator ...
  
  shortsGenerator: `你是一个专业的短视频脚本策划师。根据用户提供的主题和风格，批量生成竖屏短视频 (Shorts) 脚本。

要求：
- 每条脚本控制在 80-150 字（约 30-60 秒口播量）
- 开头 3 秒必须有强钩子 (hook)
- 结尾根据指定的 CTA 类型写对应的行动号召
- 语言风格根据指定的风格偏好调整
- 输出纯 JSON 数组，不要有其他内容

CTA 类型说明：
- follow: 结尾引导关注
- share: 引导分享
- comment: 引导评论互动
- link: 引导点击链接
- subscribe: 引导订阅

输出格式：
[
  {
    "index": 1,
    "scriptText": "完整脚本文案...",
    "cta": "follow",
    "hookType": "question"  // question/shock/claim/contrast/story
  }
]`,
};
```

---

## 4. Phase 2: 文案精修台 (Script Refinement Table)

### 4.1 前端组件

#### `src/components/shorts/ShortsPhase2.tsx`

**Props 接口**：
```typescript
interface ShortsPhase2Props {
  projectId: string;
  scripts: ShortScript[];
  onScriptsUpdate: (scripts: ShortScript[]) => void;
  onConfirmAll: () => void;
}
```

**UI 构成** — 全宽数据表格：

| 列       | 宽度  | 实现说明                                         |
| -------- | ----- | ------------------------------------------------ |
| #        | 50px  | 序号                                             |
| 文案内容 | flex  | `<textarea>` 可编辑模式，聚焦即切换 editing 状态 |
| 缩略图   | 120px | 同导演大师 `ChapterCard.tsx` 预览图逻辑          |
| 修改意见 | 200px | `<input>` + 🔄 重生成按钮                         |
| 状态     | 80px  | badge: ✅ confirmed / ✏️ editing / 🔄 regenerating  |

**交互逻辑**：

1. **Inline 编辑**:
```typescript
const handleEditScript = (shortId: string, newText: string) => {
  onScriptsUpdate(scripts.map(s => 
    s.id === shortId ? { ...s, scriptText: newText, status: 'editing' } : s
  ));
};
```

2. **单行保存** (Cmd+S 或 ✅ 按钮):
```typescript
const handleSaveScript = async (shortId: string) => {
  const script = scripts.find(s => s.id === shortId);
  if (!script) return;
  
  await fetch('http://localhost:3002/api/shorts/phase2/save-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, shortId, scriptText: script.scriptText })
  });
  
  onScriptsUpdate(scripts.map(s =>
    s.id === shortId ? { ...s, status: 'confirmed' } : s
  ));
};
```

3. **单行重生成** (SSE):
```typescript
const handleRegenerate = async (shortId: string, comment: string) => {
  onScriptsUpdate(scripts.map(s =>
    s.id === shortId ? { ...s, status: 'regenerating' } : s
  ));
  
  const response = await fetch('http://localhost:3002/api/shorts/phase2/regenerate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, shortId, userComment: comment })
  });
  
  // SSE 消费模式同 DirectorSection handleGenerateConcept
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  // ... 同模式解析 ...
};
```

4. **全部确认** (底部按钮):
```typescript
const handleConfirmAll = async () => {
  const allConfirmed = scripts.every(s => s.status === 'confirmed');
  if (!allConfirmed) {
    alert('请先确认所有脚本');
    return;
  }
  
  await fetch('http://localhost:3002/api/shorts/phase2/confirm-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId })
  });
  
  onConfirmAll(); // 父组件切换到 Phase 3
};
```

### 4.2 后端 API

#### `POST /api/shorts/phase2/save-script`

```typescript
export const saveScript = (req: Request, res: Response) => {
  const { projectId, shortId, scriptText } = req.body;
  const projectRoot = getProjectRoot(projectId);
  const statePath = path.join(projectRoot, '05_Shorts_Output', 'shorts_state.json');
  
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const script = state.scripts.find((s: any) => s.id === shortId);
  if (script) {
    script.scriptText = scriptText;
    script.status = 'confirmed';
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  res.json({ success: true });
};
```

#### `POST /api/shorts/phase2/regenerate`

SSE 接口，用 LLM 根据原脚本 + 用户意见重新生成**单条**脚本。同 `director.ts` 的 `generatePhase1` 模式。

#### `POST /api/shorts/phase2/confirm-all`

```typescript
export const confirmAll = (req: Request, res: Response) => {
  const { projectId } = req.body;
  const projectRoot = getProjectRoot(projectId);
  const statePath = path.join(projectRoot, '05_Shorts_Output', 'shorts_state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  
  // 合并所有脚本为提词器版 markdown
  const merged = state.scripts.map((s: any) => 
    `## Short #${s.index}\n\n${s.scriptText}\n\n> CTA: ${s.cta} | Hook: ${s.hookType}\n`
  ).join('\n---\n\n');
  
  const mergedPath = path.join(projectRoot, '05_Shorts_Output', 'shorts_scripts.md');
  fs.writeFileSync(mergedPath, `# Shorts 提词器版\n\n${merged}`);
  
  // 初始化 Phase 3 renderUnits
  state.phase = 3;
  state.renderUnits = state.scripts.map((s: any) => ({
    id: s.id,
    shortScriptId: s.id,
    aroll: { confirmed: false },
    brolls: [],
    thumbnail: { confirmed: false },
    subtitle: { segments: [], configId: 'preset-1', confirmed: false },
    bgm: { source: 'preset' },
    headerOverlay: true,
    renderStatus: 'pending',
  }));
  
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  res.json({ success: true, mergedFilePath: mergedPath, shortCount: state.scripts.length });
};
```

---

## 5. Phase 3: 渲染交付台 (Render & Delivery Console)

### 5.1 前端组件结构

```
ShortsPhase3.tsx                  // 所有 Short 卡片的容器
  └── ShortCard.tsx × N           // 单条 Short 的完整卡片
        ├── A-Roll 上传/裁切区
        ├── B-Roll 列表 (同导演 ChapterCard 模式)
        ├── SubtitleEditor.tsx    // ⭐ 字幕精修编辑器
        ├── SubtitleConfigPanel   // 字幕样式三预设
        ├── HeaderComposer.tsx    // ⭐ 页眉编排器 (全局共享)
        ├── BGM 选择器
        ├── 缩略图预览
        └── 提交渲染按钮
```

#### `src/components/shorts/ShortsPhase3.tsx`

```typescript
interface ShortsPhase3Props {
  projectId: string;
  scripts: ShortScript[];
  renderUnits: ShortRenderUnit[];
  onRenderUnitsUpdate: (units: ShortRenderUnit[]) => void;
}
```

#### `src/components/shorts/ShortCard.tsx`

**这是最复杂的组件**。每张卡片包含以下可折叠区域：

**Props**：
```typescript
interface ShortCardProps {
  projectId: string;
  script: ShortScript;
  renderUnit: ShortRenderUnit;
  subtitleConfigs: SubtitleConfig[];
  headerConfig?: HeaderOverlayConfig;
  onUpdate: (unit: ShortRenderUnit) => void;
  onRender: () => void;
}
```

### 5.2 A-Roll 上传与裁切

**前端**：
- 文件上传区域 (`<input type="file" accept="video/mp4,video/quicktime">`)
- 上传后调用 `POST /api/shorts/phase3/upload-aroll` (multipart)
- 显示裁切后的第一帧预览图
- 【✅ 确认裁切】按钮

**后端** (`server/shorts.ts`):
```typescript
import multer from 'multer';

// 需要安装: npm install multer @types/multer
const upload = multer({ dest: 'uploads/' });

export const uploadAroll = async (req: Request, res: Response) => {
  const { projectId, shortId } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file' });
  
  const projectRoot = getProjectRoot(projectId);
  const outputDir = path.join(projectRoot, '05_Shorts_Output', shortId);
  ensureDir(outputDir);
  
  const inputPath = file.path;
  const outputPath = path.join(outputDir, 'aroll_9x16.mp4');
  const previewPath = path.join(outputDir, 'aroll_preview.png');
  
  // FFmpeg 裁切 16:9 → 9:16 (取中间)
  await execCommand(`ffmpeg -y -i "${inputPath}" -vf "crop=ih*9/16:ih:(iw-ih*9/16)/2:0" -c:a copy "${outputPath}"`);
  
  // 提取第一帧预览
  await execCommand(`ffmpeg -y -i "${outputPath}" -vframes 1 "${previewPath}"`);
  
  // 清理上传临时文件
  fs.unlinkSync(inputPath);
  
  res.json({ 
    croppedPath: path.relative(projectRoot, outputPath),
    previewFrame: path.relative(projectRoot, previewPath)
  });
};

// 辅助: 执行命令
function execCommand(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', cmd]);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
    child.stderr.on('data', d => console.error(d.toString()));
  });
}
```

> **注意**: FFmpeg 裁切命令使用 `crop=ih*9/16:ih:(iw-ih*9/16)/2:0` 而非固定 1080px，这样可以自适应不同分辨率的输入视频（保持中间裁切语义）。

### 5.3 B-Roll 生成

逻辑完全同导演大师的 `startPhase2`。对每条 Short 的文案调用 LLM 拆分 3-5 个 B-roll 插入点。

**后端**: `POST /api/shorts/phase3/generate-brolls` (SSE)
- 输入: `{ projectId, shortId }`
- 读取该 Short 的脚本文案
- 调用 `callLLM` 生成 B-roll 方案
- SSE 逐条吐出
- 落盘到 `shorts_state.json` 的 `renderUnits[i].brolls`

### 5.4 ⭐ 字幕系统 (Whisper ASR + 精修)

#### `server/whisper.ts` — ASR 封装层

```typescript
import { spawn } from 'child_process';
import path from 'path';

export interface WhisperResult {
  segments: WhisperSegment[];
  language: string;
  duration: number;
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence: number;
}

/**
 * 调用 whisper.cpp 或 OpenAI Whisper API 进行语音识别
 * 推荐本地: brew install whisper-cpp (macOS M 系列)
 * 备选: OpenAI Whisper API
 */
export async function transcribeAudio(audioPath: string): Promise<WhisperResult> {
  // 方案 1: 本地 whisper.cpp
  try {
    return await transcribeLocal(audioPath);
  } catch (e) {
    console.warn('Local whisper failed, falling back to API:', e);
  }
  
  // 方案 2: OpenAI Whisper API
  return await transcribeAPI(audioPath);
}

async function transcribeLocal(audioPath: string): Promise<WhisperResult> {
  // 先将视频音频提取为 WAV (whisper.cpp 需要 16kHz WAV)
  const wavPath = audioPath.replace(/\.[^.]+$/, '.wav');
  await new Promise<void>((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-i', audioPath, '-ar', '16000', '-ac', '1', '-f', 'wav', wavPath]);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg exit ${code}`)));
  });
  
  // 调用 whisper.cpp (需要预装, 模型文件路径可配)
  const modelPath = process.env.WHISPER_MODEL_PATH || '/usr/local/share/whisper/models/ggml-medium.bin';
  
  return new Promise((resolve, reject) => {
    const args = [
      '-m', modelPath,
      '-f', wavPath,
      '-l', 'zh',         // 中文
      '-oj',              // JSON 输出
      '--threads', '4'
    ];
    
    const p = spawn('whisper-cpp', args);
    let output = '';
    p.stdout.on('data', d => output += d.toString());
    p.stderr.on('data', d => console.error('[Whisper]', d.toString().trim()));
    p.on('close', code => {
      if (code !== 0) return reject(new Error(`Whisper exit ${code}`));
      try {
        const result = JSON.parse(output);
        resolve({
          segments: result.transcription.map((seg: any, i: number) => ({
            id: i,
            start: seg.timestamps.from_ms / 1000,
            end: seg.timestamps.to_ms / 1000,
            text: seg.text.trim(),
            confidence: seg.confidence || 0.9,
          })),
          language: result.result?.language || 'zh',
          duration: result.transcription.reduce((max: number, s: any) => 
            Math.max(max, s.timestamps.to_ms / 1000), 0),
        });
      } catch (e) {
        reject(new Error('Failed to parse whisper output'));
      }
    });
  });
}

async function transcribeAPI(audioPath: string): Promise<WhisperResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured for Whisper API');
  
  const fs = await import('fs');
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(audioPath);
  formData.append('file', new Blob([fileBuffer]), path.basename(audioPath));
  formData.append('model', 'whisper-1');
  formData.append('language', 'zh');
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'segment');
  
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });
  
  if (!response.ok) throw new Error(`Whisper API error: ${response.status}`);
  
  const data = await response.json();
  return {
    segments: data.segments.map((seg: any, i: number) => ({
      id: i,
      start: seg.start,
      end: seg.end,
      text: seg.text,
      confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.9,
    })),
    language: data.language,
    duration: data.duration,
  };
}

/**
 * 将 WhisperSegment[] 导出为 SRT 字幕文件
 */
export function segmentsToSRT(segments: WhisperSegment[]): string {
  return segments.map((seg, i) => {
    const formatTime = (s: number) => {
      const hours = Math.floor(s / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 1000);
      return `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
    };
    return `${i + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.text}\n`;
  }).join('\n');
}
```

#### `src/components/shorts/SubtitleEditor.tsx` — 字幕精修编辑器

```typescript
interface SubtitleEditorProps {
  segments: WhisperSegment[];
  isTranscribing: boolean;
  onSegmentsUpdate: (segments: WhisperSegment[]) => void;
  onTranscribe: () => void;        // 触发 ASR
  onConfirm: () => void;
}
```

**UI**：一个可编辑的小表格，每行是一个字幕段落，前端允许编辑文本和时间轴。参考 Section 4.4 设计方案中的 UI 描述。

### 5.5 ⭐ 品牌页眉编排器

#### `src/components/shorts/HeaderComposer.tsx`

```typescript
interface HeaderComposerProps {
  config: HeaderOverlayConfig;
  onConfigUpdate: (config: HeaderOverlayConfig) => void;
}
```

**UI**：
1. 实时预览区 (1080×80 等比缩放)
2. 左上 Logo 上传
3. 右上 Logo 上传
4. 中间文字输入
5. 字体/颜色/大小配置
6. 背景色选择 (支持透明度)
7. 保存按钮

**全局复用**: 页眉配置只需要配一次，所有 Shorts 共用。配置存储在 `05_Shorts_Output/header_config.json`。

### 5.6 渲染提交

#### `POST /api/shorts/phase3/render`

当单条 Short 的所有子模块全部确认后：

```typescript
export const renderShort = async (req: Request, res: Response) => {
  const { projectId, shortId } = req.body;
  const projectRoot = getProjectRoot(projectId);
  const shortDir = path.join(projectRoot, '05_Shorts_Output', shortId);
  
  // 1. 渲染所有 B-roll (Remotion)
  // 参照 pipeline_engine.ts 的 renderBrolls 模式
  for (const broll of renderUnit.brolls) {
    if (broll.type === 'remotion') {
      // spawn npx remotion render ...
    }
  }
  
  // 2. 生成 SRT 字幕文件
  const srtContent = segmentsToSRT(renderUnit.subtitle.segments);
  fs.writeFileSync(path.join(shortDir, 'subtitle.srt'), srtContent);
  
  // 3. FFmpeg 最终合成 (方案 B)
  // ffmpeg -i aroll.mp4 -i broll1.mp4 ... -vf "subtitles=subtitle.srt" ...
  
  // 4. 生成 FCPXML (方案 A 兜底)
  // 参照 TimelineWeaver skill
  
  res.json({ jobId: `render-${Date.now()}`, status: 'started' });
};
```

---

## 6. 路由注册

在 `server/index.ts` 中添加（放在 Director 路由之后）：

```typescript
import * as shorts from './shorts';

// Shorts Master Routes (SD-206)
app.post('/api/shorts/phase1/generate', shorts.generateScripts);
app.post('/api/shorts/phase2/save-script', shorts.saveScript);
app.post('/api/shorts/phase2/regenerate', shorts.regenerateScript);
app.post('/api/shorts/phase2/confirm-all', shorts.confirmAll);
app.post('/api/shorts/phase3/upload-aroll', upload.single('videoFile'), shorts.uploadAroll);
app.post('/api/shorts/phase3/generate-brolls', shorts.generateBrolls);
app.post('/api/shorts/phase3/confirm-broll', shorts.confirmBroll);
app.post('/api/shorts/phase3/regenerate-broll', shorts.regenerateBroll);
app.post('/api/shorts/phase3/transcribe', shorts.transcribe);
app.put('/api/shorts/phase3/subtitle-segments/:shortId', shorts.updateSubtitleSegments);
app.get('/api/shorts/subtitle-configs', shorts.getSubtitleConfigs);
app.put('/api/shorts/subtitle-configs/:id', shorts.updateSubtitleConfig);
app.get('/api/shorts/header-config', shorts.getHeaderConfig);
app.put('/api/shorts/header-config', upload.fields([
  { name: 'leftLogo', maxCount: 1 },
  { name: 'rightLogo', maxCount: 1 }
]), shorts.updateHeaderConfig);
app.post('/api/shorts/phase3/render', shorts.renderShort);
app.get('/api/shorts/phase3/render-status/:jobId', shorts.getRenderStatus);
```

---

## 7. App.tsx 路由条件渲染

在 `src/App.tsx` 中添加 ShortsMaster 的条件分支：

```diff
+import { ShortsSection } from './components/ShortsSection';

 ) : activeExpertId === 'Director' ? (
     <main className="max-w-7xl mx-auto px-6 py-8">
         <DirectorSection ... />
     </main>
+) : activeExpertId === 'ShortsMaster' ? (
+    <main className="max-w-7xl mx-auto px-6 py-8">
+        <ShortsSection
+            data={state.modules.shorts}
+            projectId={state.projectId}
+            scriptPath={state.selectedScript?.path || ''}
+            onUpdate={(newData) => updateState({
+                ...state,
+                modules: { ...state.modules, shorts: newData }
+            })}
+        />
+    </main>
 ) : (
```

---

## 8. `ShortsSection.tsx` — 顶层容器

**完全模仿 `DirectorSection.tsx` 的模式**：

```typescript
interface ShortsSectionProps {
  data: ShortsModule | ShortsModule_V2;
  projectId: string;
  scriptPath: string;
  onUpdate: (newData: ShortsModule_V2) => void;
}

type Phase = 1 | 2 | 3;

export const ShortsSection = ({ data, projectId, scriptPath, onUpdate }: ShortsSectionProps) => {
  // 状态管理
  const [phase, setPhase] = useState<Phase>((data as ShortsModule_V2).phase || 1);
  const [scripts, setScripts] = useState<ShortScript[]>((data as ShortsModule_V2).scripts || []);
  const [renderUnits, setRenderUnits] = useState<ShortRenderUnit[]>((data as ShortsModule_V2).renderUnits || []);
  
  // Phase 1 → 2 直通
  const handleGenerated = (newScripts: ShortScript[]) => {
    setScripts(newScripts);
    setPhase(2);
  };
  
  // Phase 2 → 3
  const handleConfirmAll = () => {
    setPhase(3);
  };
  
  // UI: Phase 选择器 + Phase 内容区
  // 完全复制 DirectorSection 的 phaseLabels/phaseColors/button-group 模式
  // Phase 按钮: P1(始终可用) P2(有 scripts 时可用) P3(有 renderUnits 时可用)
  
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header with Phase Navigator */}
      {/* Phase Content */}
      {phase === 1 && <ShortsPhase1 projectId={projectId} onGenerated={handleGenerated} />}
      {phase === 2 && <ShortsPhase2 ... />}
      {phase === 3 && <ShortsPhase3 ... />}
    </div>
  );
};
```

---

## 9. 产出目录结构

```
05_Shorts_Output/
├── shorts_state.json            // 全局状态持久化
├── shorts_scripts.md            // Phase 2 合并提词器文案
├── header_config.json           // 页眉配置
├── header_left_logo.png         // 左 Logo
├── header_right_logo.png        // 右 Logo
├── subtitle_configs.json        // 字幕样式预设 x3
├── short-001/
│   ├── aroll_9x16.mp4           // 裁切后 A-roll
│   ├── aroll_preview.png        // 预览帧
│   ├── brolls/
│   │   ├── broll_001.mp4
│   │   ├── broll_002.mp4
│   │   └── broll_003.mp4
│   ├── thumbnail.png            // 封面图
│   ├── subtitle.srt             // 字幕
│   ├── bgm.mp3                  // BGM
│   ├── timeline.fcpxml          // FCPXML (方案 A)
│   └── final_short_001.mp4      // 自动合成 (方案 B)
├── short-002/ ...
└── short-NNN/ ...
```

---

## 10. 依赖安装

```bash
# 后端新增依赖
npm install multer @types/multer

# Whisper (本地推理，macOS)
brew install whisper-cpp
# 下载模型 (medium 推荐)
whisper-cpp --download-model medium

# FFmpeg (已有则跳过)
brew install ffmpeg
```

---

## 11. 开发优先级与实施顺序

| 优先级 | 任务                             | 复杂度 | 依赖 |
| ------ | -------------------------------- | ------ | ---- |
| P0     | 更新 `experts.ts` + `types.ts`   | 低     | 无   |
| P1     | `ShortsSection.tsx` 顶层容器     | 低     | P0   |
| P1     | `ShortsPhase1.tsx` + 后端 SSE    | 中     | P0   |
| P1     | `ShortsPhase2.tsx` 表格 + 后端   | 中     | P1   |
| P2     | `ShortCard.tsx` + A-Roll 裁切    | 高     | P1   |
| P2     | B-Roll 生成 (复用导演 LLM 逻辑)  | 中     | P2   |
| P2     | `server/whisper.ts` ASR 模块     | 高     | 无   |
| P2     | `SubtitleEditor.tsx` 精修编辑器  | 中     | P2   |
| P3     | `HeaderComposer.tsx` 页眉编排    | 中     | 无   |
| P3     | BGM 选择器                       | 低     | 无   |
| P3     | 渲染合成 (FFmpeg + FCPXML)       | 高     | P2   |
| P3     | `App.tsx` 路由 + `index.ts` 路由 | 低     | 全部 |

---

*Created by OldYang (首席逻辑架构师) — 2026-02-24 V2 定版*
