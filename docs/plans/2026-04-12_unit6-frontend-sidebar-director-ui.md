---
title: "Unit 6: 前端侧边栏 + 导演 UI"
type: implementation-plan
status: draft
date: 2026-04-12
owner: OldYang
linear: MIN-117
supersedes: none
parent: docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md
---

# Unit 6: 前端侧边栏 + 导演 UI

> **定位**：本文件是圆桌引擎 Unit 6 的完整实施方案。
> **Linear Issue**：MIN-117
> **前置条件**：Unit 1-5 已完成 ✅（`cbee557`）
> **架构蓝图**：`docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md` §7 Unit 6

---

## 1. 目标

构建圆桌讨论的前端交互界面，包括：

1. **侧边栏导航** — 控制面板入口
2. **圆桌主视图** — 流式渲染哲人发言 + 综合摘要
3. **导演控制面板** — 6 种导演指令的 UI 入口
4. **Spike 展示库** — Spike 卡片列表 + 深聊入口
5. **思考指示器** — 哲人发言间隙的呼吸动画
6. **SSE 客户端** — 连接后端流式端点

---

## 2. 产出文件

| 文件 | 职责 |
|------|------|
| `src/components/Sidebar.tsx` | 侧边栏导航壳 |
| `src/components/roundtable/types.ts` | 前端类型定义（映射后端 SSE 事件） |
| `src/components/roundtable/useRoundtableSse.ts` | SSE 连接 Hook |
| `src/components/roundtable/RoundtableView.tsx` | 圆桌主视图 |
| `src/components/roundtable/DirectorControls.tsx` | 导演控制面板 |
| `src/components/roundtable/SpikeLibrary.tsx` | Spike 展示库 |
| `src/components/roundtable/ThinkingIndicator.tsx` | 思考指示器 |
| `src/components/roundtable/PropositionInput.tsx` | 命题输入 + 锐化流程 |
| `src/App.tsx` | 重写：集成侧边栏布局 |

---

## 3. 架构设计

### 3.1 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────────────────┐ │
│ │          │ │                                            │ │
│ │ Sidebar  │ │         RoundtableView                    │ │
│ │          │ │                                            │ │
│ │ 📋 命题  │ │  ┌─ PropositionInput ──────────────────┐  │ │
│ │ 🎭 圆桌  │ │  │ 输入命题 → 锐化 → 开始圆桌          │  │ │
│ │ 📊 Spikes│ │  └────────────────────────────────────┘  │ │
│ │ 🔧 设置  │ │                                            │ │
│ │          │ │  ┌─ 哲人发言区域 ─────────────────────┐  │ │
│ │          │ │  │ 🧔 苏格拉底: 你说的正义...          │  │ │
│ │          │ │  │ （简言之：追问正义定义）             │  │ │
│ │          │ │  │                                     │  │ │
│ │          │ │  │ 🎓 王阳明 正在思考…                 │  │ │
│ │          │ │  │ ▓▓▓░░░░░░░                         │  │ │
│ │          │ │  └────────────────────────────────────┘  │ │
│ │          │ │                                            │ │
│ │          │ │  ┌─ DirectorControls ──────────────────┐  │ │
│ │          │ │  │ [止] [投] [深] [换] [？] [可]       │  │ │
│ │          │ │  └────────────────────────────────────┘  │ │
│ │          │ │                                            │ │
│ │          │ │  ┌─ SpikeLibrary ──────────────────────┐  │ │
│ │          │ │  │ Spike 卡片 1 | Spike 卡片 2 | ...   │  │ │
│ │          │ │  │ [发起深聊]                          │  │ │
│ │          │ │  └────────────────────────────────────┘  │ │
│ └──────────┘ └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 状态管理

使用 React 内置状态（useState + useReducer），不引入外部状态库。

**核心 State 结构**：

```typescript
interface RoundtableAppState {
  // 命题阶段
  proposition: string;
  sharpenedProposition: string | null;
  isSharp: boolean;

  // 会话阶段
  sessionId: string | null;
  status: RoundtableStatus;
  selectedSlugs: string[];
  rounds: Round[];

  // Spike 阶段
  spikes: Spike[];

  // 导演阶段
  awaitingDirector: boolean;
  currentRound: number;

  // 深聊阶段
  deepDiveSession: DeepDiveSession | null;

  // UI 状态
  isStreaming: boolean;
  thinkingSpeaker: string | null;
  error: string | null;
}
```

### 3.3 SSE 客户端 Hook

```typescript
function useRoundtableSse() {
  // 连接 POST /api/roundtable/turn/stream (EventSource polyfill for POST)
  // 实际使用 fetch + ReadableStream 处理 SSE
  // 因为 EventSource 只支持 GET，需要用 fetch 方式
  // 处理所有 roundtable_* 事件类型
  // 返回 { state, startSession, sendDirectorCommand, startDeepDive }
}
```

**关键决策**：后端 `/api/roundtable/turn/stream` 是 POST，不能用原生 EventSource。使用 `fetch` + `ReadableStream` 手动解析 SSE。

### 3.4 流式渲染策略

1. 收到 `roundtable_turn_chunk` → 追加到当前哲人发言文本
2. 收到 `roundtable_turn_meta` → 显示 action 标签 + briefSummary
3. 发言结束 → 显示完整元数据，切换到下一位哲人
4. 下一位哲人开始前 → 显示 `ThinkingIndicator`

---

## 4. 组件详细设计

### 4.1 `Sidebar.tsx`

**职责**：左侧固定导航栏，显示各功能模块入口。

```typescript
interface SidebarProps {
  activeTab: 'proposition' | 'roundtable' | 'spikes' | 'settings';
  onTabChange: (tab: SidebarProps['activeTab']) => void;
  sessionStatus: RoundtableStatus | null;
}
```

**样式**：宽度 240px 固定，使用 `--surface-0` 背景，Tailwind CSS。

### 4.2 `PropositionInput.tsx`

**职责**：命题输入 + 锐化流程。

**交互流程**：
1. 用户输入命题文本
2. 点击「锐化」→ POST `/api/roundtable/sharpen`
3. 展示锐化结果（原始 vs 锐化后）
4. 用户选择或编辑 → POST `/api/roundtable/sharpen/apply`
5. 确认 → 触发圆桌开始

### 4.3 `RoundtableView.tsx`

**职责**：圆桌讨论主视图，展示哲人发言 + 综合摘要。

**渲染逻辑**：
- 按轮次分组显示
- 每位哲人一个发言气泡（avatar + name + utterance + action 标签）
- 流式文本逐字渲染（使用 `useEffect` + `requestAnimationFrame` 或逐 chunk 渲染）
- 轮次间显示 moderator 综合摘要

### 4.4 `DirectorControls.tsx`

**职责**：导演控制面板，6 种指令的 UI 入口。

```typescript
interface DirectorControlsProps {
  sessionId: string;
  currentRound: number;
  spikes: Spike[];
  onCommand: (command: DirectorCommandRequest) => void;
  disabled: boolean;
}
```

**6 个指令按钮**：
| 指令 | 按钮 | 额外输入 |
|------|------|---------|
| 止 | 停止讨论，提取 Spike | 无 |
| 投 | 注入观点 | 文本输入框 |
| 深 | 深入裂缝 | 选择 Spike |
| 换 | 替换哲人 | 选择新 persona |
| ？ | 定向提问 | 选择目标 + 问题 |
| 可 | 继续讨论 | 无 |

### 4.5 `SpikeLibrary.tsx`

**职责**：Spike 卡片列表展示 + 深聊入口。

```typescript
interface SpikeLibraryProps {
  spikes: Spike[];
  onStartDeepDive: (spikeId: string, openingQuestion?: string) => void;
}
```

**Spike 卡片**：
- 标题 + 摘要
- 来源哲人
- 张力度指示器
- 「发起深聊」按钮

### 4.6 `ThinkingIndicator.tsx`

**职责**：哲人思考中的呼吸动画指示器。

```typescript
interface ThinkingIndicatorProps {
  speakerName: string;
  avatarEmoji: string;
}
```

**样式**：CSS 呼吸动画 + 进度条渐变。

---

## 5. API 对接

### 5.1 SSE 事件映射

| SSE 事件类型 | 前端处理 |
|-------------|---------|
| `roundtable_selection` | 显示选中哲人列表 |
| `roundtable_synthesis` | 显示综合摘要 |
| `roundtable_turn_chunk` | 追加文本到当前发言 |
| `roundtable_turn_meta` | 显示 action + briefSummary |
| `roundtable_awaiting` | 启用导演控制面板 |
| `roundtable_error` | 显示错误 Toast |
| `roundtable_spikes_ready` | 显示 Spike 卡片 |

### 5.2 REST API 调用

| API | 方法 | 用途 |
|-----|------|------|
| `/api/roundtable/sharpen` | POST | 锐化命题 |
| `/api/roundtable/sharpen/apply` | POST | 应用锐化结果 |
| `/api/roundtable/turn/stream` | POST | 开始圆桌（SSE） |
| `/api/roundtable/director` | POST | 发送导演指令 |
| `/api/roundtable/session/:id` | GET | 恢复会话 |
| `/api/roundtable/deepdive` | POST | 从 Spike 发起深聊 |
| `/api/roundtable/deepdive/question` | POST | 深聊追问 |
| `/api/roundtable/deepdive/summarize` | POST | 深聊总结 |

---

## 6. 样式规范

### 6.1 使用现有 CSS 变量

```css
/* 已定义在 src/index.css */
--shell-bg: #f4eee3;        /* 页面背景 */
--surface-0: rgba(255, 251, 245, 0.84); /* 卡片背景 */
--ink-1: #2f261b;           /* 主文字 */
--ink-2: #61533f;           /* 次文字 */
--ink-3: #8f7d66;           /* 弱文字 */
--accent: #8e6337;          /* 强调色 */
--line-soft: rgba(104, 84, 55, 0.14); /* 分割线 */
```

### 6.2 新增组件专用变量

```css
:root {
  /* 哲人发言气泡 */
  --bubble-bg: rgba(255, 251, 245, 0.92);
  --bubble-border: rgba(104, 84, 55, 0.08);
  
  /* Spike 卡片 */
  --spike-accent: #b45309;
  --spike-bg: rgba(180, 83, 9, 0.06);
  
  /* 导演指令按钮 */
  --director-stop: #dc2626;
  --director-inject: #2563eb;
  --director-deep: #7c3aed;
  --director-swap: #0891b2;
  --director-ask: #d97706;
  --director-go: #16a34a;
  
  /* 思考指示器动画 */
  --thinking-duration: 2s;
}
```

---

## 7. 实施步骤（分解为可并行任务）

### Phase A：基础设施（顺序执行）

1. **A1**: 创建 `src/components/roundtable/types.ts` — 前端类型定义
2. **A2**: 创建 `src/components/roundtable/useRoundtableSse.ts` — SSE Hook

### Phase B：核心组件（可并行）

3. **B1**: `PropositionInput.tsx` — 命题输入组件
4. **B2**: `ThinkingIndicator.tsx` — 思考指示器
5. **B3**: `SpikeLibrary.tsx` — Spike 展示库
6. **B4**: `DirectorControls.tsx` — 导演控制面板
7. **B5**: `Sidebar.tsx` — 侧边栏

### Phase C：集成（依赖 B 全部完成）

8. **C1**: `RoundtableView.tsx` — 主视图集成
9. **C2**: 重写 `App.tsx` — 页面布局集成

### Phase D：样式 + 验证

10. **D1**: 更新 `src/index.css` — 新增 CSS 变量
11. **D2**: 启动 `npm run dev` — 全流程验证
12. **D3**: `npm run typecheck:full` + `npm run test:run` — 质量验证

---

## 8. 风险与降级

| 风险 | 降级策略 |
|------|---------|
| SSE POST 流解析不兼容 | 使用 `@microsoft/fetch-event-source` 库 |
| Tailwind CSS v4 语法差异 | 使用内联 style fallback |
| 流式文本渲染卡顿 | 使用 `requestAnimationFrame` 节流 |
| 哲人 avatar 加载失败 | 使用 emoji fallback（persona.json 已有） |

---

## 9. 验收标准

- [ ] 命题输入 → 锐化 → 开始圆桌，全流程可操作
- [ ] 哲人发言逐字流式渲染
- [ ] 6 种导演指令按钮均有交互行为
- [ ] Spike 卡片展示 + 深聊入口
- [ ] 思考指示器呼吸动画
- [ ] `npm run typecheck:full` 通过
- [ ] `npm run test:run` 通过（含新增前端测试）
- [ ] 响应式布局（侧边栏可折叠）

---

## 10. 参考文档

- 架构蓝图：`docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md`
- 后端类型：`server/roundtable-types.ts`
- 后端 API：`server/index.ts`
- CSS 变量：`src/index.css`
- Persona Schema：`src/schemas/persona.ts`
