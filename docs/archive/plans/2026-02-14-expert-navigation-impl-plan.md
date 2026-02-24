# v3.0 专家导航系统 — 实施计划

> **日期**: 2026-02-14
> **版本**: v3.0
> **基于设计文档**: `2026-02-14-expert-navigation-design.md`
> **目标项目**: CSET-Seedance2

---

## 0. 现状分析

### 现有架构
```
App.tsx (单页面)
├── Header (项目选择 + 文稿选择)
├── StatusDashboard (总进度)
├── DirectorSection  ← 直接展示，无状态机
├── MusicSection     ← 直接展示，无状态机
├── ThumbnailSection ← 直接展示，无状态机
├── MarketingSection ← 直接展示，无状态机
└── ShortsSection    ← 有状态机但独立逻辑
```

### 目标架构
```
App.tsx (路由容器)
├── Header (项目选择 + 文稿选择)
├── ExpertNav (专家导航栏) ← 新增
│   └── [Director | MusicDirector | ThumbnailMaster | ShortsMaster | MarketingMaster]
└── ExpertPage (当前专家页面) ← 新增
    └── ExpertContent (三态切换)
        ├── IdleState (未开始 - "开始工作"大按钮)
        ├── RunningState (工作中 - 进度/日志)
        └── CompletedState (已完成 - 结果展示)
```

### Skills 位置
```
/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/.agent/skills/
├── Director/SKILL.md           ✓ 存在
├── MusicDirector/SKILL.md      ✓ 存在
├── ThumbnailMaster/SKILL.md    ✓ 存在
├── ShortsMaster/SKILL.md       ✓ 存在
└── MarketingMaster/SKILL.md    ✓ 存在
```

---

## 1. 实施阶段划分

### Phase 1: 基础架构 (预计 2-3 小时)
- 新建专家配置文件
- 重构 App.tsx 为导航容器
- 创建 ExpertNav 组件
- 创建 ExpertPage 容器

### Phase 2: 三态 UI (预计 2-3 小时)
- 创建 IdleState 组件
- 创建 RunningState 组件
- 创建 CompletedState 组件
- 实现状态切换逻辑

### Phase 3: 后端 API (预计 1-2 小时)
- 扩展 delivery_store.json 数据结构
- 新增专家任务 API
- 实现任务文件生成

### Phase 4: 结果监听 (预计 1-2 小时)
- 监听输出目录文件变化
- 自动更新专家状态
- 读取并展示结果

### Phase 5: 集成测试 (预计 1 小时)
- 端到端流程测试
- 状态持久化验证
- 切换项目状态重置

---

## 2. 详细任务清单

### Phase 1: 基础架构

#### Task 1.1: 创建专家配置文件
**文件**: `src/config/experts.ts` (新建)

```typescript
export interface ExpertConfig {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    skillName: string;
    outputDir: string;
}

export const EXPERTS: ExpertConfig[] = [
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

export const getExpertById = (id: string): ExpertConfig | undefined => 
    EXPERTS.find(e => e.id === id);
```

#### Task 1.2: 扩展 types.ts
**文件**: `src/types.ts` (修改)

新增:
```typescript
export type ExpertStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface ExpertWork {
    status: ExpertStatus;
    startedAt?: string;
    completedAt?: string;
    outputPath?: string;
    logs: string[];
    error?: string;
}

// 在 DeliveryState 中新增
export interface DeliveryState {
    projectId: string;
    lastUpdated?: string;
    selectedScript?: SelectedScript;
    activeExpertId?: string;  // ← 新增：当前激活的专家
    experts: {                 // ← 新增：专家工作状态
        [expertId: string]: ExpertWork;
    };
    modules: { ... };
}
```

#### Task 1.3: 创建 ExpertNav 组件
**文件**: `src/components/ExpertNav.tsx` (新建)

功能:
- 显示 5 个专家按钮
- 高亮当前选中
- 点击切换专家
- 显示专家状态徽章（未开始/工作中/已完成）

#### Task 1.4: 重构 App.tsx
**文件**: `src/App.tsx` (修改)

变更:
- 移除 StatusDashboard
- 移除各个 Section 直接渲染
- 新增 activeExpertId 状态
- 新增 ExpertNav
- 新增 ExpertPage（根据 activeExpertId 动态渲染）

---

### Phase 2: 三态 UI

#### Task 2.1: 创建 IdleState 组件
**文件**: `src/components/experts/IdleState.tsx` (新建)

UI:
- 大图标 + 专家名称
- 文稿信息
- "开始工作"大按钮
- 预计耗时提示

#### Task 2.2: 创建 RunningState 组件
**文件**: `src/components/experts/RunningState.tsx` (新建)

UI:
- 进度指示器
- 实时日志区域
- 当前输出目录
- 取消按钮（可选）

#### Task 2.3: 创建 CompletedState 组件
**文件**: `src/components/experts/CompletedState.tsx` (新建)

UI:
- 完成时间
- 结果内容展示（Markdown 渲染）
- 查看完整文件按钮
- 重新生成按钮

#### Task 2.4: 创建 ExpertPage 容器
**文件**: `src/components/ExpertPage.tsx` (新建)

逻辑:
- 根据 expertWork.status 渲染对应组件
- 处理"开始工作"点击
- 处理状态更新

---

### Phase 3: 后端 API

#### Task 3.1: 扩展 delivery_store.json 初始化
**文件**: `server/index.ts` (修改)

在 `ensureDeliveryFile()` 中新增:
```typescript
const initialState = {
    projectId: currentProjectName,
    activeExpertId: 'Director',  // 默认导演
    experts: {
        Director: { status: 'idle', logs: [] },
        MusicDirector: { status: 'idle', logs: [] },
        ThumbnailMaster: { status: 'idle', logs: [] },
        ShortsMaster: { status: 'idle', logs: [] },
        MarketingMaster: { status: 'idle', logs: [] }
    },
    modules: { ... }
};
```

#### Task 3.2: 新增专家 API
**文件**: `server/index.ts` (修改)

新增端点:
```typescript
// 获取专家配置
GET /api/experts → { experts: ExpertConfig[] }

// 启动专家工作
POST /api/experts/:id/start
Body: { scriptPath: string }
→ 写入 .tasks/expert_{id}_{timestamp}.json
→ 更新 experts[id].status = 'running'

// 获取专家状态
GET /api/experts/:id/status
→ { status, logs, outputPath, ... }

// 切换当前专家
POST /api/experts/switch
Body: { expertId: string }
→ 更新 activeExpertId
```

#### Task 3.3: 任务文件格式
**目录**: `Projects/{projectName}/.tasks/`

文件名: `expert_{expertId}_{timestamp}.json`

内容:
```json
{
    "taskId": "expert_Director_20260214_153000",
    "type": "expert",
    "expertId": "Director",
    "skillName": "Director",
    "project": "CSET-Seedance2",
    "input": {
        "scriptPath": "02_Script/CSET-seedance2_深度文稿_v2.1.md"
    },
    "outputDir": "04_Visuals",
    "createdAt": "2026-02-14T15:30:00",
    "status": "pending"
}
```

---

### Phase 4: 结果监听

#### Task 4.1: 监听输出目录
**文件**: `server/index.ts` (修改)

逻辑:
```typescript
// 为每个专家的输出目录设置 watcher
EXPERTS.forEach(expert => {
    const outputDir = path.join(PROJECT_ROOT, expert.outputDir);
    chokidar.watch(outputDir).on('add', (filePath) => {
        // 检测到新文件
        // 更新对应专家状态为 completed
        // 记录 outputPath
        // 通过 Socket.IO 推送更新
    });
});
```

#### Task 4.2: 任务完成检测
**文件**: `server/index.ts` (修改)

监听 `.tasks/` 目录中的完成标记文件:
- 任务开始: `expert_{id}_{ts}.json`
- 任务完成: `expert_{id}_{ts}_done.json` (Antigravity 写入)

---

### Phase 5: 集成测试

#### Task 5.1: 验收测试清单
- [ ] 页面加载，默认显示 Director 专家
- [ ] 点击导航切换到其他专家
- [ ] 点击"开始工作"，状态变为 running
- [ ] 任务完成后状态变为 completed
- [ ] 结果正确展示
- [ ] 刷新页面后状态保持
- [ ] 切换项目后状态重置

---

## 3. 文件变更汇总

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/config/experts.ts` | 专家配置 |
| 新建 | `src/components/ExpertNav.tsx` | 专家导航栏 |
| 新建 | `src/components/ExpertPage.tsx` | 专家页面容器 |
| 新建 | `src/components/experts/IdleState.tsx` | 未开始状态 |
| 新建 | `src/components/experts/RunningState.tsx` | 工作中状态 |
| 新建 | `src/components/experts/CompletedState.tsx` | 已完成状态 |
| 修改 | `src/App.tsx` | 集成导航系统 |
| 修改 | `src/types.ts` | 新增专家相关类型 |
| 修改 | `src/hooks/useDeliveryStore.ts` | 新增专家状态管理 |
| 修改 | `server/index.ts` | 新增专家 API + 监听 |
| 废弃 | `src/components/StatusDashboard.tsx` | 暂时移除（可保留备用） |

---

## 4. 工作模式（方案 A：半自动）

### 流程说明
```
1. Web 选择文稿 → 点击"开始工作"
2. Web 生成任务文件 + 状态变"等待执行"
3. Web 显示提示："请在 Antigravity 中执行 [Director] skill"
4. 用户打开 Antigravity → 手动调用对应 skill
5. Skill 执行完成 → 输出到对应目录
6. Web 监听到新文件 → 状态变"已完成"
```

### 用户操作
- 用户需要保持 Antigravity 打开
- 看到提示后手动执行 skill
- Web 自动检测结果

### 后续优化（方案 B）
- 开发 Antigravity 扩展自动执行 skill
- 预估工作量：2-4 小时

---

## 5. 建议执行顺序

**第一批（可独立完成）**:
1. Task 1.1: 创建专家配置文件
2. Task 1.2: 扩展 types.ts
3. Task 1.3: 创建 ExpertNav 组件
4. Task 2.1: 创建 IdleState 组件

**第二批（依赖第一批）**:
5. Task 1.4: 重构 App.tsx
6. Task 2.2-2.4: 创建其他状态组件

**第三批（后端）**:
7. Task 3.1-3.3: 后端 API

**第四批（集成）**:
8. Task 4.1-4.2: 结果监听
9. Task 5.1: 集成测试

---

**确认此计划后，我将开始按批次执行。**
