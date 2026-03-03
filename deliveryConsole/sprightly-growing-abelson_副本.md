# 🎬 导演大师 Phase 2/3 重构设计方案

> **版本**: V3.1 - Pre-audit & Render Review
> **设计方**: OldYang (老杨)
> **日期**: 2026-02-28
> **状态**: 待讨论与审批

---

## 📋 上下文

当前 Phase 2 仅为简单的分镜预览选择，Phase 3 和 Phase 4 功能分离。根据新需求：

1. **Phase 2 重定义为「预审」**：对 5 类 B-roll 进行方案审阅与决策
2. **Phase 3 重定义为「渲染及二审」**：正式渲染素材与用户加载外部素材，最后生成 XML
3. **去除 Phase 4**：将 XML 生成整合到 Phase 3

---

## 🎯 核心需求分析

### Phase 2 - 预审阶段

| B-roll 类型 | 审阅方式 | 用户操作 | 结果 |
|------------|---------|---------|------|
| Remotion 动画 | 预览图 (320×180) | 点评修改 → Pass | 进入 Phase 3 渲染 |
| 文生视频 | 预览图 (320×180) | 点评修改 → Pass | 进入 Phase 3 渲染 |
| Artlist 实拍 | 文案描述（关键词/搜索建议） | 点评修改 → Pass/Skip | Skip 则 Phase 3 不显示 |
| 互联网素材 | 文案描述（关键词/搜索建议） | 点评修改 → Pass/Skip | Skip 则 Phase 3 不显示 |
| 用户截图/录屏 | 文案描述（采集指导） | 点评修改 → Pass/Skip | Skip 则 Phase 3 不显示 |

**全局控制**：
- 所有条目均批注 Pass 或 Skip 后，显示 GO 按钮
- GO 按钮 → 一键启动 Remotion 和文生视频的正式渲染 → 进入 Phase 3

### Phase 3 - 渲染及二审阶段

| B-roll 类型 | 渲染方式 | 用户操作 | 结果 |
|------------|---------|---------|------|
| Remotion 动画 | 正式渲染 (4K/30fps) | 观看 → 不满意重新渲染 → Pass | 落盘到 `06_Video_Broll/` |
| 文生视频 | 火山引擎 API (1080p/30fps) | 观看 → 不满意重新渲染 → Pass | 落盘到 `06_Video_Broll/` |
| Artlist/互联网/截图录屏 | 用户加载本地文件 | Loading 按钮打开 Finder → Copy 到项目目录 | 落盘到 `06_Video_Broll/` |

**全局控制**：
- 所有素材落盘完成 → 生成 XML 按钮
- 生成成功 → 显示路径和导入 PR 说明

---

## 🏗️ 数据结构设计

### 1. 类型扩展 (`src/types.ts`)

```typescript
// 新增 B-roll 状态类型
export type BRollReviewStatus = 'pending' | 'approved' | 'skipped';
export type BRollRenderStatus = 'waiting' | 'rendering' | 'completed' | 'failed';

// 扩展 DirectorChapter
export interface DirectorChapter {
  chapterId: string;
  chapterIndex: number;
  chapterName: string;
  scriptText: string;

  // Phase 2 预审数据
  options: BRollOption[];
  selectedOptionId?: string;
  userComment?: string;
  reviewStatus: BRollReviewStatus; // 'pending' | 'approved' | 'skipped'

  // Phase 3 渲染数据
  renderStatus?: BRollRenderStatus;
  renderProgress?: number; // 0-100
  outputPath?: string; // 渲染后视频路径
  retryCount?: number; // 重试次数
}

// 扩展 BRollOption
export interface BRollOption {
  optionId: string;
  type: 'remotion' | 'seedance' | 'artlist' | 'internet-clip' | 'user-capture';
  description: string; // 导演大师生成的文案
  previewPath?: string; // 预览图路径 (remotion/seedance)
  props?: Record<string, any>; // Remotion 模板参数
  prompt?: string; // 文生视频提示词
  searchKeywords?: string[]; // Artlist/互联网搜索关键词
  searchTips?: string; // 搜索提示
}

// Phase 3 渲染任务
export interface RenderJob {
  jobId: string;
  chapterId: string;
  optionId: string;
  type: 'remotion' | 'seedance';
  status: BRollRenderStatus;
  progress: number; // 0-100
  frame?: number;
  totalFrames?: number;
  outputPath?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

// 外部素材加载记录
export interface ExternalAsset {
  assetId: string;
  chapterId: string;
  type: 'artlist' | 'internet-clip' | 'user-capture';
  sourcePath: string; // 原始文件路径
  targetPath: string; // 复制后路径
  loadedAt: string;
}
```

### 2. 新增状态文件 (`04_Visuals/phase2_review_state.json`)

```json
{
  "projectId": "CSET-SP3",
  "lastUpdated": "2026-02-28T17:00:00Z",
  "chapters": [
    {
      "chapterId": "ch1",
      "reviewStatus": "approved",
      "selectedOptionId": "opt1",
      "userComment": "方案 A 更符合内容"
    }
  ]
}
```

### 3. 新增状态文件 (`04_Visuals/phase3_render_state.json`)

```json
{
  "projectId": "CSET-SP3",
  "lastUpdated": "2026-02-28T18:00:00Z",
  "renderJobs": [],
  "externalAssets": [],
  "xmlGenerated": false,
  "xmlPath": ""
}
```

---

## 🔌 API 端点设计

### Phase 2 预审

```
POST /api/director/phase2/start
  - Input: { projectId, scriptPath, brollTypes: BRollType[] }
  - Output: { taskId }
  - 描述: 启动 LLM 生成 5 类 B-roll 方案

GET /api/director/phase2/status/:taskId
  - Output: { progress: "3/12", chapters: DirectorChapter[] }
  - 描述: 获取生成进度（SSE 流式返回）

POST /api/director/phase2/review
  - Input: { projectId, chapterId, reviewStatus: 'approved' | 'skipped', userComment?: string }
  - Output: { success }
  - 描述: 用户批注审阅结果

POST /api/director/phase2/select
  - Input: { projectId, chapterId, optionId }
  - Output: { success }
  - 描述: 选择指定方案（仅 approved 状态有效）

GET /api/director/phase2/ready
  - Output: { ready: boolean, pendingCount: number }
  - 描述: 检查是否所有条目都已批注
```

### Phase 3 渲染及二审

```
POST /api/director/phase3/start-render
  - Input: { projectId }
  - Output: { renderJobs: RenderJob[] }
  - 描述: 启动 Remotion 和文生视频渲染

GET /api/director/phase3/render-status/:jobId
  - Output: { status, progress, frame?, totalFrames?, outputPath? }
  - 描述: 获取渲染进度

POST /api/director/phase3/rerender
  - Input: { projectId, chapterId, optionId }
  - Output: { jobId }
  - 描述: 重新渲染（用户不满意时）

POST /api/director/phase3/approve
  - Input: { projectId, chapterId }
  - Output: { success }
  - 描述: 二审通过，视频落盘

POST /api/director/phase3/load-asset
  - Input: { projectId, chapterId, type, sourcePath }
  - Output: { assetId, targetPath }
  - 描述: 用户加载外部素材，复制到项目目录

GET /api/director/phase3/assets
  - Output: { assets: ExternalAsset[] }
  - 描述: 获取已加载的外部素材

POST /api/director/phase3/generate-xml
  - Input: { projectId }
  - Output: { xmlPath, success }
  - 描述: 生成 Final Cut Pro XML 文件
```

---

## 🎨 前端组件设计

### Phase 2View (重构)

```
Phase2View
├── BRollSelector (保留现有，增加说明)
│   ├── Remotion 预审
│   ├── 文生视频 预审
│   ├── Artlist 实拍 预审
│   ├── 互联网素材 预审
│   └── 用户截图/录屏 预审
├── ChapterReviewCard (新增，替代 ChapterCard)
│   ├── 脚本原文展示
│   ├── Remotion 预览图组
│   ├── 文生视频 预览图组
│   ├── Artlist 文案编辑器
│   ├── 互联网素材 文案编辑器
│   └── 用户截图/录屏 文案编辑器
│       ├── 评论区
│       ├── Pass 按钮
│       └── Skip 按钮
└── Phase2Actions (底部全局按钮)
    ├── 进度提示: "X/XX 已批注"
    └── GO 按钮 (所有条目批注后启用)
```

### Phase 3View (重构)

```
Phase3View
├── RenderProgressSection
│   ├── Remotion 渲染组
│   │   ├── RenderJobCard (每个章节)
│   │   │   ├── 预览图/视频播放器
│   │   │   ├── 渲染进度条
│   │   │   ├── 重新渲染按钮
│   │   │   ├── 评论区
│   │   │   └── Pass 按钮 (二审通过)
│   │   └── 批量渲染控制
│   └── 文生视频 渲染组
│       ├── (同上)
│       └── 批量渲染控制
├── ExternalAssetSection
│   ├── AssetLoaderCard (每个章节的非渲染类素材)
│   │   ├── 文案展示
│   │   ├── Loading 按钮 (打开 Finder)
│   │   ├── 已加载文件信息
│   │   ├── 移除按钮
│   │   └── Pass 按钮 (确认)
│   └── 批量加载指南
└── Phase3Actions (底部全局按钮)
    ├── 进度提示: "X/XX 已落盘"
    └── 生成 XML 按钮 (所有素材就绪后启用)
        ├── 生成中...
        └── 生成成功 → 显示路径和导入 PR 说明
```

---

## 📁 文件管理逻辑

### 项目目录结构

```
Projects/{projectId}/
├── 03_Scripts/
│   └── script.md
├── 04_Visuals/
│   ├── phase1_concept.md
│   ├── phase2_review_state.json (新增)
│   ├── phase3_render_state.json (新增)
│   ├── previews/
│   │   ├── ch1_remotion_opt1.png
│   │   ├── ch1_seedance_opt1.png
│   │   └── ...
│   └── visual_plan.json
├── 06_Video_Broll/
│   ├── ch1_remotion_opt1.mp4
│   ├── ch1_seedance_opt1.mp4
│   ├── ch1_artlist_clip.mp4
│   ├── ch1_internet_clip.mp4
│   └── ...
└── 07_Timeline/
    └── final_project.xml (新增)
```

### 文件复制逻辑

```typescript
// server/assets.ts (新增)
export async function loadExternalAsset(
  projectId: string,
  chapterId: string,
  type: 'artlist' | 'internet-clip' | 'user-capture',
  sourcePath: string
): Promise<ExternalAsset> {
  const projectRoot = getProjectRoot(projectId);
  const brollDir = path.join(projectRoot, '06_Video_Broll');
  ensureDir(brollDir);

  const ext = path.extname(sourcePath);
  const fileName = `${chapterId}_${type}${ext}`;
  const targetPath = path.join(brollDir, fileName);

  // 复制文件
  await fs.copyFile(sourcePath, targetPath);

  return {
    assetId: `asset_${Date.now()}`,
    chapterId,
    type,
    sourcePath,
    targetPath,
    loadedAt: new Date().toISOString()
  };
}
```

---

## 🎬 XML 生成逻辑

### Final Cut Pro XML 结构

```typescript
interface FCPXML {
  version: string;
  resources: {
    format: Format[];
    asset: Asset[];
  };
  library: {
    event: Event[];
  };
}
```

### 生成流程

1. **读取 SRT 字幕**：解析 `03_Scripts/subtitles.srt`
2. **收集 B-roll 视频**：从 `06_Video_Broll/` 读取所有 MP4
3. **生成时间线**：根据字幕时间码排列 B-roll
4. **写入 XML**：保存到 `07_Timeline/final_project.xml`

### API 实现

```typescript
// server/xml-generator.ts (新增)
export async function generateFCPXML(
  projectId: string
): Promise<{ xmlPath: string; success: boolean }> {
  const projectRoot = getProjectRoot(projectId);

  // 1. 读取渲染状态
  const renderState = JSON.parse(
    fs.readFileSync(path.join(projectRoot, '04_Visuals/phase3_render_state.json'), 'utf-8')
  );

  // 2. 读取 SRT 字幕
  const srtPath = path.join(projectRoot, '03_Scripts/subtitles.srt');
  const subtitles = parseSRT(fs.readFileSync(srtPath, 'utf-8'));

  // 3. 收集 B-roll
  const brollFiles = fs.readdirSync(path.join(projectRoot, '06_Video_Broll'))
    .filter(f => f.endsWith('.mp4'));

  // 4. 构建 XML
  const xml = buildFCPXML(subtitles, brollFiles, renderState);

  // 5. 写入文件
  const timelineDir = path.join(projectRoot, '07_Timeline');
  ensureDir(timelineDir);
  const xmlPath = path.join(timelineDir, 'final_project.xml');
  fs.writeFileSync(xmlPath, xml);

  return { xmlPath, success: true };
}
```

---

## 🚀 实施任务清单

| # | 任务 | 文件 | 优先级 |
|---|------|------|--------|
| 1 | 扩展 TypeScript 类型定义 | `src/types.ts` | P0 |
| 2 | 新增 Phase 2 预审状态管理 API | `server/director.ts` | P0 |
| 3 | 重构 Phase2View 组件 | `src/components/director/Phase2View.tsx` | P0 |
| 4 | 新增 ChapterReviewCard 组件 | `src/components/director/ChapterReviewCard.tsx` | P0 |
| 5 | 新增 Phase 2 预审文案编辑器 | `src/components/director/CommentEditor.tsx` | P1 |
| 6 | 新增外部素材加载 API | `server/assets.ts` | P0 |
| 7 | 重构 Phase3View 组件 | `src/components/director/Phase3View.tsx` | P0 |
| 8 | 新增 RenderJobCard 组件 | `src/components/director/RenderJobCard.tsx` | P1 |
| 9 | 新增 ExternalAssetSection 组件 | `src/components/director/ExternalAssetSection.tsx` | P0 |
| 10 | 新增 XML 生成 API | `server/xml-generator.ts` | P0 |
| 11 | 新增 SRT 解析器 | `server/srt-parser.ts` | P1 |
| 12 | 端到端测试 - Phase 2 预审流程 | - | P1 |
| 13 | 端到端测试 - Phase 3 渲染流程 | - | P1 |
| 14 | 端到端测试 - XML 生成与导入 | - | P1 |

---

## ⚠️ 待讨论事项

### 1. Remotion 渲染并发策略
- **问题**：本机渲染 Remotion 时是否支持并发？多章节同时渲染是否会导致性能问题？
- **建议**：默认串行渲染，提供「批量渲染」选项但给出性能警告 (同意)

### 2. 文生视频火山引擎并发限制
- **问题**：火山引擎 API 是否有并发限制？
- **建议**：查询 API 文档，如有限制则实现队列机制(https://www.volcengine.com/docs)

### 3. Phase 3 重渲染逻辑
- **问题**：用户重新渲染时，是否覆盖之前的视频？
- **建议**：生成新文件名（如 `ch1_remotion_opt1_v2.mp4`），保留历史版本 (不建议保留,太占空间,直接删除即可)

### 4. XML 生成时间码对齐
- **问题**：SRT 字幕时间码与 B-roll 时长如何对齐？ (这样吧,phase3用户上传srt字幕,请系统自行匹配一下,用户录制Aroll精校字幕后应该和原稿相差不大,如果无法匹配的Broll请用户手动指定一下,看这样的方法是否可以?)
- **建议**：Phase 2 让导演大师预估每段 B-roll 时长，写入 `visual_plan.json`

### 5. Finder 集成方式
- **问题**：Loading 按钮打开 Finder 的技术实现
- **建议**：使用 Node.js `child_process` 调用 `open` 命令（macOS）

---

## 📊 验证计划

### Phase 2 验证
1. 启动 Phase 2 → 检查 5 类 B-roll 方案生成
2. 依次批注每个条目 → 检查 Pass/Skip 状态保存
3. 跳过某个条目 → 检查 Phase 3 不再显示
4. GO 按钮 → 检查渲染任务正确启动

### Phase 3 验证
1. Remotion 渲染 → 检查视频落盘到 `06_Video_Broll/`
2. 文生视频渲染 → 检查视频落盘
3. 重渲染 → 检查生成新文件
4. 外部素材加载 → 检查文件复制到项目目录
5. 生成 XML → 检查 `07_Timeline/final_project.xml` 生成
6. 导入 PR → 检查 XML 可被 Premiere 正确识别

---

*Created by OldYang (Chief Logic Architect) - 2026-02-28*
