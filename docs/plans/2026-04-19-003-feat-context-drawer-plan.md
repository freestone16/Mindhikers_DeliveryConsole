---
title: "Unit 2: Context Drawer — Chat / Runtime / Artifacts / Handoff 四 Tab 接入"
type: feat
status: draft
date: 2026-04-19
linear: MIN-150
related:
  - docs/plans/2026-04-17-001-refactor-director-ui-implementation-plan.md
  - docs/plans/2026-04-18-002-feat-session-list-context-dock-plan.md
  - docs/04_progress/rules.md
  - docs/dev_logs/HANDOFF.md
---

# Unit 2: Context Drawer — 四 Tab 内容接入

## Overview

Unit 1 已建立 ContextDrawer 骨架（4 tab + 折叠/展开 + 360px grid 三栏），但内容均为占位文字。Unit 2 的目标是把 4 个 tab 全部接入真实内容：

1. **Chat** — 接入 ChatPanel（改色系为暖纸面）
2. **Runtime** — Phase2 日志搬迁 + 轻量运行态面板（临时组件，上线后砍掉）
3. **Artifacts** — Director 各阶段产出物清单
4. **Handoff** — 阶段状态摘要 + 跨模块交接只读展示

同时从 Phase2View 中移除内联调试面板，把日志和模型信息下沉到 drawer Runtime tab。

## Problem Frame

- ChatPanel 在 Unit 1 shell 重构时被移除，当前没有任何聊天入口
- Phase2View 里的调试面板（模型信息 + 可折叠日志）占据了主区空间，打断工作流焦点
- Director 的产出物（视频、缩略图、XML 等）分散在文件系统各处，没有集中查看入口
- 阶段间数据传递和跨模块交接没有可视化界面

## Scope Boundaries

- ✅ ChatPanel 接入 drawer + 暖纸面色系适配
- ✅ Phase2View 内联调试面板迁移到 drawer Runtime tab
- ✅ Artifacts tab 展示各阶段产出物文件清单
- ✅ Handoff tab 展示阶段状态 + 跨模块只读交接信息
- ❌ 不改 ChatPanel 内部消息协议、确认卡、附件释放逻辑
- ❌ 不改 Phase3View 界面布局（保持每行 spinner/进度条/视频播放器原样）
- ❌ 不做跨模块 push 动作（Handoff 只读展示）
- ❌ 不新建后端 session 模型
- ❌ 不复用 DebugPanel.tsx（它是临时组件，Runtime tab 自己做轻量版）

## Context & Research

### 现有骨架（Unit 1 已完成）

- `ContextDrawer.tsx` — 4 tab（Chat / Runtime / Artifacts / Handoff），折叠/展开切换
- `DeliveryShellLayout.tsx` — 拥有 `drawerCollapsed` 和 `activeDrawerTab` 状态
- CSS：`--drawer-width: 360px`，`--drawer-collapsed-width: 44px`，grid 三栏

### ChatPanel 现状

- 640 行自包含组件，5 个 props：`isOpen`, `onToggle`, `expertId`, `projectId`, `socket`
- 之前在 `App.tsx` 作为右侧 sidebar 渲染（`w-[25vw] min-w-[320px]`，暗色背景）
- Unit 1 重构时被移除，目前未挂载
- Socket 协议：9 个 inbound 事件 + 6 个 outbound 事件
- Blob URL 附件清理：unmount 时释放，需确保 tab 切换时正确处理
- 暗色主题（`bg-[#0b1529]/80`）需适配暖纸面（`var(--shell-panel)`）

### Phase2View 调试面板（需搬迁）

- 行 7-13：`LogEntry` 接口
- 行 25-26：`currentModel`、`logs` props
- 行 47-48：`isLogsCollapsed` 状态
- 行 108-166：**内联调试面板**（模型信息 + 可折叠日志，标签为"调试面板"）
- 行 232-240：**生成加载条**（spinner + "正在为你的剧本生成视觉方案..." + 计时器）

### Director 产出物清单

| 阶段 | 产出物 | 格式 | 路径 |
|------|--------|------|------|
| P1 | 视觉概念提案 | `.md` | `04_Visuals/phase1_视觉概念提案_{projectId}.md` |
| P2 | 分段视觉执行方案 | `.md` | `04_Visuals/phase2_分段视觉执行方案_{projectId}.md` |
| P2 | 选择状态 | `.json` | `04_Visuals/selection_state.json` |
| P2 | 缩略图 | `.png` | `04_Visuals/thumbnails/thumb_{chapterId}-{optionId}.png` |
| P3 | 视频 | `.mp4` | `04_Visuals/videos/video_{chapterId}-{optionId}.mp4` |
| P3 | 外部素材 | `.mp4/.mov` | `06_Video_Broll/{chapterId}_{type}.{ext}` |
| P3 | 渲染状态 | `.json` | `04_Visuals/phase3_render_state.json` |
| P4 | Premiere XML | `.xml` | `04_Visuals/sequence_premiere.xml` |
| P4 | 剪映 JSON | `.json` | `04_Visuals/sequence_jianying.json` |
| P4 | SRT 字幕 | `.srt` | `05_Audio/`, `srt/`, `03_Script/` |

### 跨模块交接数据

- `delivery_store.json` → `modules.director` 包含 phase、conceptProposal、items
- 各专家模块有声明式 `outputDir`：Director→`04_Visuals`，Music→`04_Music_Plan`，Thumbnail→`03_Thumbnail_Plan`，Shorts→`05_Shorts_Output`，Marketing→`05_Marketing`
- 无自动化交接机制，交接靠共享文件系统

## Implementation Steps

### Step 2A: Chat Tab 接入

**Goal:** 把 ChatPanel 接入 drawer chat tab，适配暖纸面色系。

**Files:**
- Modify: `src/components/delivery-shell/DeliveryShellLayout.tsx` — 传递 socket、projectId、activeExpertId 到 ContextDrawer
- Modify: `src/components/delivery-shell/ContextDrawer.tsx` — 导入 ChatPanel，chat tab 渲染真实内容
- Modify: `src/components/ChatPanel.tsx` — 色系适配（暗色 → 暖纸面）
- Modify: `src/styles/delivery-shell.css` — ChatPanel 在 drawer 内的样式覆盖

**Approach:**
1. `DeliveryShellLayout` 新增接收 `socket` prop（从 App.tsx 传入）
2. `ContextDrawer` 扩展 props 接收 `socket`、`projectId`、`activeExpertId`
3. chat tab 条件渲染 `<ChatPanel>`
4. ChatPanel 色系适配：
   - `bg-[#0b1529]/80` → `var(--shell-panel)` 或透明
   - `bg-slate-800` 系列改为暖色
   - `bg-blue-600` 用户气泡 → 暖色强调
   - 文字颜色适配暖纸面对比度
5. ChatPanel 的 `onToggle` 改为 drawer 的 `onToggleCollapse`
6. Blob URL 清理：ChatPanel 始终挂载（不随 tab 切换卸载），避免 blob 泄漏。非 chat tab 时用 `display: none` 隐藏

**Verification:**
- Chat tab 打开后能看到完整聊天界面
- 发送消息、接收流式回复正常
- 确认卡、附件上传功能正常
- 切换 tab 后再切回 chat，历史不丢失
- 视觉风格与暖纸面 shell 一致

### Step 2B: Runtime Tab 接入 + Phase2 日志搬迁

**Goal:** Phase2View 内联调试面板搬迁到 drawer Runtime tab。

**Files:**
- Modify: `src/components/delivery-shell/ContextDrawer.tsx` — Runtime tab 内容
- Modify: `src/components/director/Phase2View.tsx` — 移除内联调试面板 + 生成加载条
- Modify: `src/components/DirectorSection.tsx` — 将 logs/currentModel/startTime 提升为 context 或直接传给 drawer

**Approach:**
1. 创建轻量 RuntimePanel（不复用 DebugPanel）：
   - 模型信息（text/image/video model）
   - 可折叠日志列表（带颜色标记：info/warn/error）
   - 生成计时器（elapsed time from startTime）
   - Phase-aware：根据当前 phase 显示对应日志
2. 数据来源：从 DirectorSection 传递 `logs`、`currentModel`、`startTime`、`isLoading`
3. Phase2View 移除行 108-166（内联调试面板）和行 232-240（生成加载条）
4. Phase2View 移除 `currentModel`、`logs` props（改为从 drawer 获取）
5. Phase3/Phase4 保持界面不变

**Verification:**
- Phase2View 主区只剩 B-Roll 选择器 + 章节卡 + 进度栏
- Runtime tab 显示模型信息 + 日志 + 计时器
- 日志实时更新，生成过程中计时器持续走动
- Phase3/Phase4 界面不受影响

### Step 2C: Artifacts Tab 接入

**Goal:** 展示 Director 各阶段产出物文件清单。

**Files:**
- Create: `src/components/delivery-shell/drawer/ArtifactsPanel.tsx`
- Create: `server/director.ts` 新增 `GET /api/director/artifacts` 路由
- Modify: `src/components/delivery-shell/ContextDrawer.tsx` — Artifacts tab 内容

**Approach:**
1. 后端新增 `GET /api/director/artifacts?projectId={id}`：
   - 扫描 `04_Visuals/` 目录（`.md`、`.json`、`.xml`、`thumbnails/*.png`、`videos/*.mp4`）
   - 扫描 `06_Video_Broll/` 目录（外部素材）
   - 扫描 SRT 相关目录
   - 返回按阶段分组的结构化列表：`{ phase, files: [{ name, format, size, mtime, path }] }`
2. ArtifactsPanel UI：
   - 按阶段折叠区（P1 / P2 / P3 / P4）
   - 每个文件一张卡片：文件名 + 格式标签 + 大小 + 时间戳
   - 支持打开（新窗口）和下载
3. 根据当前 phase 高亮对应阶段区域

**Verification:**
- 有数据的项目能看到按阶段分组的文件清单
- 空项目显示空态提示
- 文件卡片点击可打开/下载

### Step 2D: Handoff Tab 接入

**Goal:** 展示阶段状态摘要 + 跨模块交接只读信息。

**Files:**
- Create: `src/components/delivery-shell/drawer/HandoffPanel.tsx`
- Modify: `src/components/delivery-shell/ContextDrawer.tsx` — Handoff tab 内容

**Approach:**
1. 上半部分：阶段状态卡片
   - 当前 Phase 指示
   - 每个阶段产出摘要（P1：概念已生成 ✓ / P2：X 章 Y 选项已选 / P3：K 视频已审 / P4：XML 已导出）
   - 读取 `delivery_store.json` 中 `modules.director` 的状态
2. 下半部分：跨模块交接卡片（只读）
   - → ThumbnailMaster（需要：视觉概念 + 关键帧）
   - → ShortsMaster（需要：已审章节 + 场景数据）
   - → MarketingMaster（需要：标题 + 主题 + 概念）
   - → MusicDirector（需要：情绪/视觉上下文）
   - 每张卡片：目标模块图标 + 当前准备度指示（文件是否就绪）+ 状态标签（就绪/未就绪）
3. 无 push 动作，纯只读展示

**Verification:**
- 不同 Phase 显示对应的状态摘要
- 跨模块卡片正确反映文件就绪状态
- Phase 1 空态时显示"暂无产出"

## Key Technical Decisions

- **决策 1：ChatPanel 始终挂载，tab 切换用 display:none**。避免 blob URL 在 unmount 时释放后无法恢复。只有 drawer 整体折叠时才卸载。
- **决策 2：不复用 DebugPanel.tsx**。它是临时组件，Runtime tab 自己做轻量版，后续上线后可一起砍掉。
- **决策 3：Artifacts 需要新后端 API**。现有代码没有通用产物扫描接口，需新增 `GET /api/director/artifacts`。
- **决策 4：Handoff 只读**。不做跨模块 push 动作，避免扩大范围。
- **决策 5：Phase3/Phase4 界面不动**。保留每行的 spinner/进度条/视频播放器/审批按钮原样，不做精简。

## Risks

| Risk | Mitigation |
|------|------------|
| ChatPanel 色系适配工作量大（640 行暗色样式） | 用 CSS scope 覆盖关键颜色变量，不逐行改 |
| ChatPanel blob URL 在 tab 切换时泄漏 | 始终挂载 + display:none，只在 drawer 折叠时卸载 |
| Artifacts API 扫描大目录可能慢 | 缓存结果，只在 tab 激活时请求 |
| Runtime tab 临时组件，后续砍掉会留痕迹 | 独立文件隔离，砍掉时只删 RuntimePanel + 相关 props |

## Success Metrics

- Chat tab 功能完整：发送消息、流式回复、确认卡、附件上传全部正常
- Runtime tab 正确显示 Phase2 日志 + 模型信息 + 计时器
- Phase2View 主区只保留 B-Roll 工作台内容
- Artifacts tab 按阶段列出所有产出物文件
- Handoff tab 显示阶段状态 + 跨模块就绪度
- `tsc --noEmit` 零报错
- Playwright 浏览器复验通过

## Phased Delivery

### Phase A: Chat + Runtime（核心交互）
- Step 2A: Chat tab 接入
- Step 2B: Runtime tab + Phase2 日志搬迁

### Phase B: Artifacts + Handoff（信息展示）
- Step 2C: Artifacts tab
- Step 2D: Handoff tab

### Phase C: 验收
- 浏览器复验四个 tab
- 文档更新（HANDOFF + 日志）
