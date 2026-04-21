🕐 Last updated: 2026-04-21 03:45 CST
🌿 Branch: `MHSDC-GC-SSE`（P0 已完成，待进入 P1）
👤 Conductor: 老杨（OldYang）｜ Owner: 老卢（Zhou Lu）

---

# GoldenCrucible-SSE · 接手文档

> **当前状态**：P0 已完成（C1 + C2 已 commit）。SaaSApp.tsx 已裁掉 Header/StatusFooter/CrucibleHistorySheet，主路径 token 已统一为 `--gc-*`，ChatPanel 顶部 header 已移除。`npm run typecheck:saas` ✅ / `npm run build` ✅。下一跳：P1 视图职责归位。

---

## 一、上一会话做了什么（2026-04-20 ~ 04-21）

1. **发现偏差**：5182 实际运行的 Shell 与 PRD §5.4/§5.5 正面冲突
   - 中栏挂的是 `CrucibleStage`（应该是 `ConversationStream` 主对话）
   - 右栏 `ArtifactDrawer` 里塞的是 `ChatPanel`（应该是 4 Tab Artifact）
   - 13 个文件仍引用旧 token (`--line-soft` / `--shell-bg` / `--ink-*`)，导致全屏"黑边"观感
   - 左栏 Rail 缺 Sessions 列表
   - OriginBreadcrumb 原语已写但未被消费

2. **产出 1 份审计报告**：`docs/reviews/2026-04-20_visual-diff-audit.md`
   - 4 对截图对比（demo Screen 1~4 vs 当前 5182）
   - P0~P4 五档优先级清单
   - 黑边 root cause 分析
   - 真实 DOM 树 + token 计算值

3. **产出 1 份实施方案**：`docs/plans/2026-04-20-001-shell-semantic-alignment-plan.md`
   - 老卢 6 条硬约束记账
   - P0~P4 五档分解（每档含文件清单、行数估算、验收、降级）
   - DAG（P0 串行前置 → P1 → P2/P3 并行 → P4 收口）
   - Commit 拆分（C1~C10，按"功能 vs 治理文档分开"原则）
   - 6 项待老卢拍板议题（Q1~Q6）

4. **方案已通过老卢审核**（2026-04-21 凌晨）：字体、暖灰色阶、Origin breadcrumb、Source/Target 卡片、Handoff checklist 整体效果"没有问题"

---

## 二、当前会话完成（P0 · 裁 chrome + 统一 token）

**已完成**：
- P0-T1：从 `src/SaaSApp.tsx` 主渲染剥离 `<Header>` / `<StatusFooter>` / `<CrucibleHistorySheet>`
- P0-T2：主路径旧→新 token 替换（SaaSApp.tsx / AuthBoundary.tsx / ChatPanel.tsx / ShellErrorBoundary / ModuleErrorBoundary）
- P0-T3：裁 `ChatPanel.tsx` 顶部 header（badge、工具按钮、设置面板移除）

**验收结果**：
- `npm run typecheck:saas` ✅
- `npm run build` ✅（587.28 kB JS / 184.69 kB gzip）
- 主路径（SaaSApp.tsx / shell/ / modules/）旧 token 清零

**已 commit**：
- C1：`refs MIN-136 P0 裁 SaaS chrome + 统一 --gc-* tokens`（5 files, -354/+173）
- C2：`refs MIN-136 P0 治理：token 命名规则入 rules.md`（rules.md +3 条红线）

---

## 三、下一会话要做什么（P1 · 视图职责归位）

### 起手前必读

1. 本文件
2. `docs/plans/2026-04-20-001-shell-semantic-alignment-plan.md` §4.P1
3. `docs/04_progress/rules.md`（规则 113-115）

### P1 目标

把 Chat 主区从 Drawer 挪回中栏，把 Drawer 改成 Thesis/SpikePack/Snapshot/Reference 4 Tab，把左栏补出 Sessions 列表。

**P1 子任务**：
- P1-T1：扩 `ConversationStream` 原语（messages + renderer 接口）
- P1-T2：Crucible / Roundtable 各自实现 `MessageRenderer`
- P1-T3：ArtifactDrawer 4 Tab schema 落地
- P1-T4：左栏 Sessions 列表（mock 可）
- P1-T5：移除 Drawer 里的 ChatPanel

**关键决策已确认**（老卢 2026-04-21）：
- Q1：LLM API key 配置不用变
- Q4：按开发最佳实践拆分 commit
- Q6：红线已明确，直接执行

---

## 四、当前分支状态

- 当前分支：`MHSDC-GC-SSE`
- 主分支：`main`
- P0 commit 已创建（C1 + C2）
- 工作树剩余未提交改动（非 P0 范围）：
  - `M docs/04_progress/dev_progress.md`
  - `M docs/dev_logs/HANDOFF.md`（本次更新，待 commit）
  - `M src/components/Header.tsx` / `src/modules/*` / `src/shell/shellStore.ts`（9c29b15 之前的工作残留）
  - `?? docs/dev_logs/2026-04-20.md` / `2026-04-21.md`
  - `?? docs/plans/2026-04-19-001-...`、`2026-04-20-001-shell-semantic-alignment-plan.md`
  - `?? docs/reviews/2026-04-20_visual-diff-audit.md`
  - `?? src/modules/crucible/*`、`src/modules/roundtable/*`、`src/shell/ShellLayout.tsx`、`src/shell/ShellLayout.module.css`
  - `?? .playwright-mcp/`、`tmp/`（噪音，提交前必须排除）

---

## 五、关键约束（不许重议）

老卢已拍板的 6 条硬约束（方案 §1）：
1. Artifact 语义 = Thesis + SpikePack + ConversationSnapshot + Reference
2. 三栏同时承载 Roundtable + Crucible，圆桌→坩埚必须丝滑
3. 左 Rail / 右 Drawer 都可手动折叠（64px / 44px + `[` / `]` 快捷键）
4. Origin 徽章永久显示
5. Drawer 首秒 auto-peek 3s 后折叠
6. 整体对标 Claude Code 简洁感，守 7 条红线

---

## 六、Linear 议题挂载

- 主 issue：`MIN-136`（Phase 1 - Shell 语义对齐）
- 提交口径：`refs MIN-136 <摘要>`
- 收口口径（P0~P4 全部跑通后）：`fixes MIN-136 Phase 1 Shell 语义对齐完成`

---

## 七、绝对红线（违反即任务失败）

1. ❌ 不在 `main` 直接开发
2. ❌ 不擅自 commit / push（必须显式拦截 + 老卢确认）
3. ❌ 不混 commit（功能代码 vs 治理文档严格分开）
4. ❌ 不引入 `.playwright-mcp/`、`tmp/` 噪音进 commit
5. ❌ 不擅自修改 `.claude/launch.json` 里 frontend / backend 配置（那是老卢日常工作流的端口配置）
6. ❌ 不擅自 kill 5182 / 3009 端口上的进程（那是老卢 VSCode 在跑）

---

*下一窗口启动时第一动作：读本文件 + 方案文档；第二动作：`git status` 核对工作树；第三动作：与老卢确认 Q1/Q4/Q6 三个议题；第四动作：动手 P0。*
