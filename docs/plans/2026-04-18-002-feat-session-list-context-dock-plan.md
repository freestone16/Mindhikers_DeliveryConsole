---
title: SessionListPanel + ProjectContextDock 实施方案
type: feat
status: completed
date: 2026-04-18
origin: docs/plans/2026-04-17-001-refactor-director-ui-implementation-plan.md (Unit 1 跳过项补齐)
---

# SessionListPanel + ProjectContextDock 实施方案

## Overview

补齐 Plan 001 Unit 1 中被跳过的两个 Rail 组件：**SessionListPanel**（左侧栏中的文稿活动列表）和 **ProjectContextDock**（左侧栏底部的项目上下文坞）。当前 `WorkstationRail.tsx` 只有工作站列表和两个写死的占位行，demo 中定义的"会话列表 + 四格上下文坞"结构完全缺失。

本轮坚持 Plan 001 的边界决定——不引入后端 session 模型，从前端现有数据（projectId + scriptPath + expertState + 文稿列表）派生"会话感"。

## Problem Frame

用户在 Director 工作时，左侧栏只能看到工作站切换按钮和一个写死的 `Project: — / Model: —` 占位。没有任何机制让用户：

1. 快速切换当前项目下的文稿（只能去顶栏下拉）
2. 一眼看到当前项目的上下文信息（项目名、文稿名、模型、输出目录）
3. 感知"最近在做什么"（没有文稿活动列表）

Demo 已明确给出了这两个区域的完整设计：
- `SESSIONS · DIRECTOR` 区域：显示当前文稿（高亮）和历史文稿列表
- 四格 Dock 区域：当前项目、当前文稿、全局模型、输出目录

这些信息当前散落在 `ProductTopBar`（项目/文稿选择）、`useLLMConfig`（模型配置）、`DirectorSection`（expert state/phase）中，需要一个汇聚组件统一展示。

## Requirements Trace

- R1. 左侧栏在 Workstation 列表下方展示 SessionListPanel，显示当前项目下的文稿列表，高亮当前文稿，点击可切换。
- R2. 左侧栏底部展示 ProjectContextDock，汇聚当前项目名、当前文稿名、全局模型名、输出目录四项信息。
- R3. SessionListPanel 的数据从前端现有接口派生，不依赖后端 session API。
- R4. ProjectContextDock 的数据从 props 传入，不自行 fetch。
- R5. Rail 区域（260px）内三个区块（Workstation + SessionList + Dock）垂直排列不溢出，SessionList 可滚动。
- R6. 视觉风格对齐 demo 定义的暖纸面 token，复用 `delivery-shell.css` 已有变量。
- R7. 不破坏现有 Shell 的三栏布局、TopBar 功能和 Workstation 切换。

## Scope Boundaries

- **不做**后端 session API — Plan 001 已明确决策，本轮坚持。
- **不做**真正的 session 持久化 — 刷新后"最近活动"重新从文稿列表 API 重建。
- **不做**用户头像/身份区域 — demo 中有 `L · LuZhoua · mindhikers · founder` 用户信息块，但当前系统无用户身份模型，本轮跳过。
- **不做**其他模块（Shorts/Thumbnail/Music/Marketing）的 SessionList 适配 — 本轮只服务 Director 工作站。
- **不碰** ProductTopBar 的项目和文稿选择功能 — 它继续作为主选择器存在，SessionList 是快捷补充。
- **不碰** DirectorSection 的状态编排和 Phase 切换逻辑。

## Context & Research

### Relevant Code and Patterns

- `src/components/delivery-shell/WorkstationRail.tsx`
  当前 Rail 实现，只有工作站列表 + 写死 dock 占位。需要拆分出 SessionListPanel 和 ProjectContextDock 作为子组件插入。
- `src/components/delivery-shell/DeliveryShellLayout.tsx`
  三栏布局壳层，是 props 传递的枢纽。当前不传 session/dock 相关数据。
- `src/components/delivery-shell/ProductTopBar.tsx`
  已实现 `/api/projects` 和 `/api/projects/${projectId}/scripts` 的 fetch 逻辑。定义了 `Project` 和 `ScriptFile` 类型。
- `src/hooks/useLLMConfig.ts`
  提供 `status.global` 中的全局模型配置（provider + model）。
- `src/hooks/useExpertState.ts`
  提供 `delivery_store.json` 中各专家模块的状态（phase、items 等）。
- `src/hooks/useDeliveryStore.ts`
  提供 `DeliveryState`（projectId、selectedScript），是 App 级状态。
- `src/components/DirectorSection.tsx`
  使用 `useExpertState<DirectorModule>('Director', ...)` 获取 Director 状态。
- `src/components/DirectorUIDemoPage.tsx`
  demo 中的 `sessions` 数组和 `director-demo__dock` 区域是视觉参考。

### 数据源清单

| 数据 | 来源 | 获取方式 |
|------|------|---------|
| 项目列表 | `GET /api/projects` | ProductTopBar 已 fetch |
| 文稿列表 | `GET /api/projects/${projectId}/scripts` | ProductTopBar 已 fetch |
| 当前 projectId | `DeliveryState.projectId` | useDeliveryStore |
| 当前 selectedScript | `DeliveryState.selectedScript` | useDeliveryStore |
| Director phase | `useExpertState('Director')` → `state.phase` | DirectorSection 内 |
| 全局模型名 | `useLLMConfig` → `status.global.model` | 需 fetch |
| 输出目录 | 项目约定 `04_Visuals` | 可硬编码或从项目配置派生 |

### Institutional Learnings

- Plan 001 已明确"先派生轻量 session 感"策略，不做后端 session 化。
- demo 中的 `sessions` 是静态数据，真实数据需要从文稿列表 + expertState 派生。
- 当前 ProductTopBar 自行 fetch 项目和文稿列表，这是事实上的数据模式，SessionListPanel 可以复用同一 API。

## Key Technical Decisions

### 决策 1：SessionListPanel 数据来源 — 纯前端派生

**选择：选项 A — 从 `/api/projects/${projectId}/scripts` + `delivery_store.json` 派生**

**理由：**
- Plan 001 已明确不做后端 session API，坚持此决策避免范围蔓延。
- `/api/projects/${projectId}/scripts` 已返回 `ScriptFile[]`（含 name、path、size、modifiedAt），足够派生"最近文稿"列表。
- `useExpertState('Director')` 的 `state.phase` 可以附加到当前文稿条目上显示进度。
- 不新增后端接口，降低风险。

**具体派生逻辑：**
- SessionList = `scripts` 列表按 `modifiedAt` 降序排列
- 当前会话高亮 = 匹配 `selectedScriptPath`
- 每条显示：文稿名 + 修改时间（相对时间如"刚刚"、"昨日"、"3d"）
- 点击调用 `onSelectScript(projectId, script.path)`

### 决策 2：数据传递方式 — 轻量 Props + 共享 fetch 提取

**选择：混合方案 — 顶层 fetch 后 props 下传 + useLLMConfig hook 复用**

**理由：**
- ProductTopBar 已在 fetch 项目和文稿列表，如果 SessionListPanel 也自行 fetch，会出现重复请求。
- 最佳做法是将 scripts fetch 提升到 DeliveryShellLayout，然后 props 传给 ProductTopBar 和 WorkstationRail（包含 SessionListPanel）。
- LLM 模型名通过 `useLLMConfig` hook 获取，不需要 props 传递，但需要控制 fetch 时机。
- 输出目录可以从项目名 + 固定路径模板派生，不需要 API。

**数据流设计：**
```
DeliveryShellLayout
  ├─ fetch scripts ──→ ProductTopBar (项目选择 + 文稿选择)
  │               └─→ WorkstationRail
  │                    └─→ SessionListPanel (文稿列表 + 当前高亮)
  └─ useLLMConfig ──→ WorkstationRail
                       └─→ ProjectContextDock (项目/文稿/模型/输出)
```

### 决策 3：SessionListPanel 只服务于当前专家

**选择：是 — 标题随专家切换，但数据源是项目级文稿列表**

**理由：**
- demo 中标注 `SESSIONS · DIRECTOR`，暗示标题和当前工作站绑定。
- 实际数据源是项目级文稿列表（`/api/projects/${projectId}/scripts`），和专家无关。
- 但标题可以通过 `activeExpertId` 动态显示 `SESSIONS · Director` / `SESSIONS · Shorts` 等。
- 未来如果各专家模块有自己的"最近活动"逻辑，可以在此基础上扩展。

### 决策 4：独立为新 Unit

**选择：作为 Plan 001 的增量 Unit（Unit 1.5），不塞进已有 Unit**

**理由：**
- Unit 1 已标记完成（Shell + 视觉 token 已落地），不应回退修改已完成状态。
- Unit 2（Context Drawer）是独立的右侧栏工作，和左侧栏无关。
- 这两个组件逻辑独立、文件集中、依赖清晰，适合作为增量 Unit。

### 决策 5：Rail 布局空间分配

**选择：Workstation 固定顶部 + SessionList 弹性滚动 + Dock 固定底部**

**理由：**
- 260px 宽度下，三个区块垂直排列。
- Workstation 列表固定高度（6 个按钮 ≈ 280px），不可滚动。
- SessionList 填充中间区域，可滚动（`overflow-y: auto`）。
- Dock 固定底部（`margin-top: auto`），不随内容滚动。
- 这和 `shell-dock` 当前的 `margin-top: auto` 定位方式一致。

## Open Questions

### Resolved During Planning

- 是否需要后端 session API？
  - 结论：不需要，坚持 Plan 001 决策，纯前端派生。

- ProductTopBar 和 SessionListPanel 是否共享 fetch？
  - 结论：是。将 scripts fetch 提升到 DeliveryShellLayout，避免重复请求。

- 用户头像区域是否在本轮实现？
  - 结论：不实现。当前系统无用户身份模型，Dock 只展示项目/文稿/模型/输出四项。

### Deferred to Implementation

- SessionListPanel 是否需要展示每个文稿的 Director phase 状态？
  - 说明：当前 `useExpertState` 只提供当前项目的 Director 状态，不提供"每个文稿"的状态。如果需要，需要调用 `GET /api/expert-state/Director?projectId=...&scriptPath=...` 逐个查询，但这是 N+1 问题。建议首轮只展示文稿列表，不挂 phase 状态。

- 输出目录路径是否需要从后端 API 获取？
  - 说明：当前 Director 输出固定在 `04_Visuals/director/` 目录下，可以从项目名硬编码派生。如果未来需要动态配置，再补 API。

- 文稿列表排序策略（modifiedAt 降序 vs 手动 pin）？
  - 说明：首轮使用 modifiedAt 降序，不实现手动排序或 pin 功能。

## High-Level Technical Design

> 下图说明了数据如何从 API 和 hooks 流入两个新组件。

```
┌─────────────────────────────────────────────────────────────────┐
│ DeliveryShellLayout                                             │
│                                                                 │
│  fetch('/api/projects/${projectId}/scripts')                    │
│     │                                                           │
│     ├── ProductTopBar (props: scripts, onSelectScript)          │
│     │                                                           │
│     └── WorkstationRail (新增 props: scripts, selectedPath,     │
│           onSelectScript, activeExpertId, projectName,          │
│           modelName, outputDir)                                  │
│           │                                                     │
│           ├── Workstation Section (不变)                         │
│           │                                                     │
│           ├── SessionListPanel (新增组件)                        │
│           │   props: scripts, selectedPath, onSelectScript,     │
│           │         expertLabel                                 │
│           │   渲染: 文稿列表 + 当前高亮 + 点击切换              │
│           │                                                     │
│           └── ProjectContextDock (新增组件)                      │
│               props: projectName, scriptName,                   │
│                     modelName, outputDir                         │
│               渲染: 四格信息卡片                                 │
│                                                                 │
│  useLLMConfig() → status.global.model → 传给 Dock              │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Units

- [ ] **Unit 1: 提取共享数据层 + DeliveryShellLayout 数据提升**

**Goal:** 将文稿列表 fetch 从 ProductTopBar 提升到 DeliveryShellLayout，使多个子组件共享数据；引入 useLLMConfig 获取全局模型名。

**Requirements:** R3, R4, R7

**Dependencies:** None

**Files:**
- Modify: `src/components/delivery-shell/DeliveryShellLayout.tsx`
- Modify: `src/components/delivery-shell/ProductTopBar.tsx`
- Test: `src/components/delivery-shell/DeliveryShellLayout.test.tsx`

**Approach:**
- DeliveryShellLayout 新增 `useEffect` fetch `/api/projects/${projectId}/scripts`，存储 `scripts: ScriptFile[]`。
- DeliveryShellLayout 引入 `useLLMConfig` hook 获取全局模型名。
- ProductTopBar 改为接收 `scripts` 和 `projects` 作为 props（或保留 projects 自行 fetch，只提取 scripts）。
- DeliveryShellLayout 将 `scripts`、`selectedScriptPath`、`onSelectScript`、`projectName`、`modelName`、`outputDir` 等数据传给 WorkstationRail。

**Patterns to follow:**
- `src/components/delivery-shell/ProductTopBar.tsx` — 已有的 scripts fetch 模式
- `src/hooks/useLLMConfig.ts` — 已有的 LLM 配置获取模式

**Test scenarios:**
- Happy path: DeliveryShellLayout 挂载后，scripts 数据被 fetch 并传递给子组件。
- Happy path: LLM 模型名通过 useLLMConfig 获取后可传递给 Dock。
- Edge case: projectId 为空时，不触发 scripts fetch。
- Edge case: scripts fetch 失败时，SessionListPanel 显示空态而不崩溃。

**Verification:**
- DeliveryShellLayout 成为 scripts 和 LLM 数据的汇聚点，ProductTopBar 不再是唯一的数据源。

- [ ] **Unit 2: SessionListPanel 组件实现**

**Goal:** 实现左侧栏的文稿活动列表组件，展示当前项目下的文稿列表，高亮当前文稿，支持点击切换。

**Requirements:** R1, R3, R5, R6

**Dependencies:** Unit 1

**Files:**
- Create: `src/components/delivery-shell/SessionListPanel.tsx`
- Modify: `src/components/delivery-shell/WorkstationRail.tsx`
- Modify: `src/styles/delivery-shell.css`
- Test: `src/components/delivery-shell/SessionListPanel.test.tsx`

**Approach:**
- SessionListPanel 接收 `scripts: ScriptFile[]`、`selectedScriptPath`、`onSelectScript`、`expertLabel` 作为 props。
- 标题动态显示 `SESSIONS · ${expertLabel}`（如 `SESSIONS · DIRECTOR`）。
- 列表按 `modifiedAt` 降序排列。
- 当前文稿高亮显示（使用 `shell-workstation--active` 同系列的视觉风格）。
- 非当前文稿显示为可点击项，点击调用 `onSelectScript`。
- 中间区域可滚动（`overflow-y: auto`），不挤压上下区块。
- 每条显示：文稿名（truncate to fit 260px）、相对时间（如"刚刚"、"2h"、"昨日"、"3d"）。
- 空态显示"暂无文稿，请先在顶栏选择项目"。

**Patterns to follow:**
- `src/components/DirectorUIDemoPage.tsx` 中的 `director-demo__sessionlist` 区域
- `src/components/delivery-shell/WorkstationRail.tsx` 中的 `shell-rail__section` 和 `shell-workstation` 样式模式

**Test scenarios:**
- Happy path: 传入 3 条 scripts 数据，渲染 3 个列表项，当前 selectedScriptPath 对应的项高亮。
- Happy path: 点击非当前文稿项，触发 `onSelectScript(projectId, script.path)`。
- Edge case: scripts 为空数组时，显示空态提示文案。
- Edge case: selectedScriptPath 不在 scripts 列表中（如手动输入路径），不崩溃，不高亮任何项。
- Edge case: 文稿名超长时（>30 字符），正确 truncate 不溢出。
- Integration: 切换 activeExpertId 后，标题从 `SESSIONS · DIRECTOR` 变为 `SESSIONS · SHORTS`。

**Verification:**
- SessionListPanel 在 Rail 中渲染文稿列表，点击可切换文稿，视觉对齐 demo 风格。

- [ ] **Unit 3: ProjectContextDock 组件实现**

**Goal:** 实现左侧栏底部的四格上下文坞组件，汇聚项目名、文稿名、模型名、输出目录。

**Requirements:** R2, R4, R5, R6

**Dependencies:** Unit 1

**Files:**
- Create: `src/components/delivery-shell/ProjectContextDock.tsx`
- Modify: `src/components/delivery-shell/WorkstationRail.tsx`
- Modify: `src/styles/delivery-shell.css`
- Test: `src/components/delivery-shell/ProjectContextDock.test.tsx`

**Approach:**
- ProjectContextDock 接收 `projectName`、`scriptName`、`modelName`、`outputDir` 作为 props。
- 使用 2×2 grid 布局展示四项信息（对齐 demo 的 `director-demo__dockgrid`）。
- 每格：上方是灰色小号标签（`shell-dock__label`），下方是正文值（`shell-dock__value`）。
- 固定在 Rail 底部（`margin-top: auto`），不随内容滚动。
- 值为空时显示 `—` 占位符。
- 替换当前 WorkstationRail 中写死的 `shell-dock` 区域。

**Patterns to follow:**
- `src/components/DirectorUIDemoPage.tsx` 中的 `director-demo__dockgrid` 区域
- 当前 `WorkstationRail.tsx` 中的 `shell-dock` 样式变量

**Test scenarios:**
- Happy path: 传入完整 props（projectName="CSET-SP3", scriptName="深度文稿_v2.md", modelName="claude-sonnet-4-6", outputDir="04_Visuals"），四格均正确显示。
- Edge case: modelName 为空（useLLMConfig 尚未加载），显示 `—` 而非空白或报错。
- Edge case: projectName 和 scriptName 同时为空（未选择项目），四格均显示 `—`。
- Edge case: 值过长时（超长项目名），正确 truncate 不撑破布局。
- Integration: 切换项目后，Dock 中的项目名和文稿名实时更新。

**Verification:**
- ProjectContextDock 固定在 Rail 底部，四格信息实时反映当前项目上下文。

- [ ] **Unit 4: WorkstationRail 集成 + 布局验证**

**Goal:** 将 SessionListPanel 和 ProjectContextDock 集成到 WorkstationRail 中，替换写死的占位区域，验证整体 Rail 布局在 260px 宽度下正确渲染。

**Requirements:** R5, R6, R7

**Dependencies:** Unit 2, Unit 3

**Files:**
- Modify: `src/components/delivery-shell/WorkstationRail.tsx`
- Modify: `src/styles/delivery-shell.css`
- Modify: `src/components/delivery-shell/DeliveryShellLayout.tsx`
- Test: `src/components/delivery-shell/WorkstationRail.test.tsx`

**Approach:**
- WorkstationRail 重构为三段式布局：Workstation 列表 → SessionListPanel → ProjectContextDock。
- WorkstationRail 接收新增 props：`scripts`、`selectedScriptPath`、`onSelectScript`、`projectName`、`modelName`、`outputDir`。
- CSS 确保：Workstation 列表不滚动、SessionListPanel 可滚动、Dock 固定底部。
- DeliveryShellLayout 将 Unit 1 提取的数据正确传给 WorkstationRail。
- 删除 WorkstationRail 中写死的 `shell-dock` 占位区域。
- 验证 Rail 在不同内容高度下（0 条文稿 vs 10 条文稿）不溢出、不遮挡。

**Patterns to follow:**
- `src/styles/delivery-shell.css` 中的 `shell-rail`、`shell-rail__section`、`shell-dock` 样式

**Test scenarios:**
- Happy path: 完整 Shell 渲染后，Rail 内三个区域垂直排列，布局正确。
- Happy path: 10 条文稿时，SessionListPanel 内部可滚动，Workstation 和 Dock 不受影响。
- Edge case: 0 条文稿时，SessionListPanel 显示空态，Dock 仍固定底部。
- Integration: 切换项目 → scripts 更新 → SessionListPanel 刷新 → Dock 更新，整条链路无报错。
- Integration: 切换工作站（Director → Shorts）→ SessionListPanel 标题变化，其他不受影响。
- Integration: 浏览器窗口缩放到 1120px 以下时，Rail 布局降级（参考已有 responsive 规则）。

**Verification:**
- WorkstationRail 成为包含三个子区域的完整 Rail，不再有写死占位。

## System-Wide Impact

- **Interaction graph:** `DeliveryShellLayout` 新增 fetch 调用和 props 传递链路；`ProductTopBar` 的 scripts fetch 职责被提取到上层。
- **Error propagation:** Scripts fetch 失败时 SessionListPanel 显示空态；LLM config fetch 失败时 Dock 的模型名显示 `—`。不产生阻断性错误。
- **State lifecycle risks:** 项目切换时 scripts 列表需重新 fetch，存在短暂空态。需要在 DeliveryShellLayout 的 useEffect 中正确处理 projectId 变化的竞态（使用 cleanup 取消旧请求）。
- **API surface parity:** 不新增后端 API，复用现有的 `/api/projects/${projectId}/scripts` 和 `/api/llm-config/status`。
- **Integration coverage:** 需要浏览器级验证确认 260px Rail 内三个区域的实际渲染效果。
- **Unchanged invariants:** DirectorSection 的状态编排、Phase 切换、生成逻辑不受影响。ProductTopBar 的项目选择功能保持可用。

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Scripts fetch 提升到 Layout 后，ProductTopBar 的下拉交互可能缺少实时数据 | ProductTopBar 仍保留 projects 的自行 fetch；scripts 通过 props 传入而非自行 fetch，两者数据源一致 |
| `useLLMConfig` 首次加载较慢，Dock 模型名长时间显示 `—` | 可接受：这不是关键路径信息，用户不会因此被阻塞 |
| SessionListPanel 和 ProductTopBar 的文稿选择可能产生竞争条件 | 两者都调用同一个 `onSelectScript` 回调，最终由 App 层统一处理，不存在双写 |
| Rail 内容过多（6 个 Workstation + 10 条文稿 + Dock）超出视口高度 | SessionListPanel 设置 `overflow-y: auto` 和 `max-height`，确保可滚动 |

## Documentation / Operational Notes

- 完成后更新 `docs/dev_logs/HANDOFF.md`，标注 SessionListPanel 和 ProjectContextDock 已落地。
- 这是 Plan 001 Unit 1 的补齐工作，不是独立新 feature。Plan 001 的整体进度应反映此变更。
- 页面验收应使用 `agent-browser` 截图确认 Rail 内三区域布局。

## Sources & References

- **Origin plan:** `docs/plans/2026-04-17-001-refactor-director-ui-implementation-plan.md` (Unit 1 跳过项)
- Demo reference: `src/components/DirectorUIDemoPage.tsx`
- 当前 Rail: `src/components/delivery-shell/WorkstationRail.tsx`
- 当前 Shell: `src/components/delivery-shell/DeliveryShellLayout.tsx`
- 数据 hooks: `src/hooks/useExpertState.ts`, `src/hooks/useLLMConfig.ts`, `src/hooks/useDeliveryStore.ts`
- 视觉 token: `src/styles/delivery-shell.css`
- 状态类型: `src/types.ts` (DeliveryState)
