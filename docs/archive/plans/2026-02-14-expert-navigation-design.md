# v3.0 专家导航系统设计文档

> **日期**: 2026-02-14
> **版本**: v3.0
> **状态**: Draft

---

## 1. 核心概念

**"文稿驱动的工作流"**
- 用户选择文稿后，进入专家导航系统
- 5 位专家各有独立页面，状态隔离
- 每位专家：未开始 → 工作中（Antigravity 执行）→ 已完成（结果展示）

---

## 2. 导航系统（顶部 Banner）

```
┌─────────────────────────────────────────────────────────────┐
│  MindHikers Delivery Console                                │
│  Project: CSET-Seedance2  │  Script: 深度文稿_v2.md        │
│                                                             │
│  [👁️ 视觉导演]  [🎵 音乐总监]  [🖼️ 缩略图大师]  [📢 营销策略]  [🎬 Shorts]  │
│       ↑ 默认选中                                                      │
└─────────────────────────────────────────────────────────────┘
```

**导航项配置**（动态可扩展）：

```typescript
interface ExpertConfig {
    id: string;           // "director", "music", "thumbnail", "marketing", "shorts"
    name: string;         // "视觉导演"
    icon: string;         // Lucide icon name
    color: string;        // tailwind color class
    skillName: string;    // Antigravity skill 名称
    outputDir: string;    // 结果输出目录
}

// 配置列表（与 Antigravity Skills 一一对应）
const EXPERTS: ExpertConfig[] = [
    { 
        id: 'Director', 
        name: '影视导演', 
        description: '视觉叙事蓝图，Artlist/AI/Remotion 混合方案',
        icon: 'Eye', 
        color: 'blue', 
        skillName: 'Director',
        outputDir: '04_Visuals' 
    },
    { 
        id: 'MusicDirector', 
        name: '音乐总监', 
        description: '听觉空间构建，Artlist 实录与 Suno AI 双模态配乐',
        icon: 'Music', 
        color: 'purple', 
        skillName: 'MusicDirector',
        outputDir: '04_Music_Plan' 
    },
    { 
        id: 'ThumbnailMaster', 
        name: '缩略图大师', 
        description: 'CTR 心理学，1.5 秒触发点击',
        icon: 'Image', 
        color: 'pink', 
        skillName: 'ThumbnailMaster',
        outputDir: '03_Thumbnail_Plan' 
    },
    { 
        id: 'ShortsMaster', 
        name: '短视频操盘手', 
        description: '深度内容转病毒式短视频脚本',
        icon: 'Video', 
        color: 'cyan', 
        skillName: 'ShortsMaster',
        outputDir: '05_Shorts_Output' 
    },
    { 
        id: 'MarketingMaster', 
        name: '营销大师', 
        description: 'SEO/GEO 优化，标题/Tag/结构化数据',
        icon: 'Megaphone', 
        color: 'orange', 
        skillName: 'MarketingMaster',
        outputDir: '05_Marketing' 
    }
];
```

---

## 3. 专家页面状态机

每位专家页面有 3 种状态：

```
┌──────────────┐      点击"开始工作"      ┌──────────────┐      Antigravity 完成       ┌──────────────┐
│   未开始      │  ─────────────────────→  │   工作中      │  ────────────────────────→  │   已完成      │
│  (Start)     │                          │ (Processing)  │                             │  (Result)    │
└──────────────┘                          └──────────────┘                             └──────────────┘
    显示"开始工作"大按钮                       显示进度/日志                                  显示结果+重新生成按钮
```

**数据结构扩展**：

```typescript
interface ExpertWork {
    status: 'idle' | 'running' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    outputPath?: string;      // 生成的文件路径
    logs: string[];           // 执行日志
    error?: string;           // 错误信息
}

interface DeliveryState {
    projectId: string;
    selectedScript?: SelectedScript;
    experts: {
        [expertId: string]: ExpertWork;
    };
    // ... existing modules
}
```

---

## 4. 触发机制（Antigravity 集成）

沿用之前的**文件触发方案**，但扩展为通用任务系统：

### 4.1 任务文件格式

```json
{
    "taskId": "expert_director_20260214_153000",
    "type": "expert",
    "expertId": "director",
    "skillName": "director_master",
    "project": "CSET-SP3",
    "input": {
        "scriptPath": "02_Script/深度文稿_v2.md",
        "projectName": "CSET-SP3"
    },
    "outputDir": "03_Thumbnail_Plan",
    "createdAt": "2026-02-14T15:30:00"
}
```

### 4.2 状态流转

```
Web 点击"开始工作"
    ↓
POST /api/experts/{expertId}/start
    ↓
写入 .tasks/expert_{expertId}_{timestamp}.json
    ↓
更新 experts[expertId].status = "running"
    ↓
Antigravity 监听 → 读取任务 → 执行 skill
    ↓
Skill 输出结果到对应目录
    ↓
Antigravity 写入 .tasks/expert_{expertId}_{timestamp}_done.json
    ↓
Web 检测到完成 → 更新 experts[expertId].status = "completed"
```

---

## 5. 页面布局

### 5.1 未开始状态

```
┌────────────────────────────────────────────┐
│  👁️ 视觉导演                                 │
│                                             │
│     ┌─────────────────────────────────┐     │
│     │                                 │     │
│     │      [ 👁️ 大图标 ]              │     │
│     │                                 │     │
│     │    文稿：深度文稿_v2.md          │     │
│     │    预计耗时：2-3 分钟            │     │
│     │                                 │     │
│     │   [    开始工作    ]            │     │
│     │                                 │     │
│     └─────────────────────────────────┘     │
│                                             │
└────────────────────────────────────────────┘
```

### 5.2 工作中状态

```
┌────────────────────────────────────────────┐
│  👁️ 视觉导演                                 │
│                                             │
│  ⏳ 工作中...  [进度条]                      │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 2026-02-14 15:30:01  开始分析文稿...   │  │
│  │ 2026-02-14 15:30:05  提取核心概念...   │  │
│  │ 2026-02-14 15:30:12  生成视觉方案...   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  输出目录：03_Thumbnail_Plan/               │
└────────────────────────────────────────────┘
```

### 5.3 已完成状态

```
┌────────────────────────────────────────────┐
│  👁️ 视觉导演                                 │
│                                             │
│  ✅ 已完成  2026-02-14 15:32:15             │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ 生成的方案内容展示...                  │  │
│  │ (Markdown 渲染)                        │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [查看完整文件]  [重新生成]                 │
└────────────────────────────────────────────┘
```

---

## 6. API 设计

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/experts` | GET | 获取专家配置列表（动态） |
| `/api/experts/:id/start` | POST | 启动专家工作流 |
| `/api/experts/:id/status` | GET | 获取专家工作状态 |
| `/api/experts/:id/cancel` | POST | 取消进行中的任务 |

---

## 7. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/config/experts.ts` | 新建 | 专家配置列表（可扩展） |
| `src/components/ExpertNav.tsx` | 新建 | 顶部导航栏（替换 Header 下方区域） |
| `src/components/ExpertPage.tsx` | 新建 | 专家页面容器（状态机切换） |
| `src/components/experts/IdleState.tsx` | 新建 | 未开始状态 UI |
| `src/components/experts/RunningState.tsx` | 新建 | 工作中状态 UI |
| `src/components/experts/CompletedState.tsx` | 新建 | 已完成状态 UI |
| `server/index.ts` | 修改 | 新增专家相关 API |
| `src/App.tsx` | 修改 | 集成导航+页面路由 |

---

## 8. 扩展性设计

**新增专家只需 3 步**：

1. **在 `experts.ts` 添加配置**：
```typescript
{ id: 'newexpert', name: '新专家', icon: 'NewIcon', skillName: 'new_expert_skill', outputDir: '06_NewDir' }
```

2. **在 Antigravity 添加 skill**：`new_expert_skill`

3. **Web 自动生效** — 导航栏和页面自动出现

无需修改任何其他代码。

---

## 9. 验收标准

- [ ] 顶部导航显示 5 位专家，可点击切换
- [ ] 默认显示第一位专家（视觉导演）
- [ ] 每位专家独立状态（未开始/工作中/已完成）
- [ ] "开始工作"按钮触发 Antigravity skill
- [ ] 任务执行中显示实时日志
- [ ] 任务完成后显示结果
- [ ] 新增专家只需修改配置文件

---

**请审阅这个设计方案，确认后我开始编写详细的实施计划。**
