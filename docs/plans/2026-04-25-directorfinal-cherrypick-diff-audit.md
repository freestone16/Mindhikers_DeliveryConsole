# DirectorFinal -> MHSDC-DC-director Cherry-pick Diff Audit

**日期**: 2026-04-25
**来源 worktree**: `/Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal`
**来源分支**: `director-final`
**目标 worktree**: `/Users/luzhoua/MHSDC/DeliveryConsole/Director`
**目标分支**: `MHSDC-DC-director`
**状态**: in-progress

## 简单结论

两边不是没有差异。

正确做法是：只摘 DirectorFinal 中已经确认安全、目标分支仍缺、且不把 SaaS / GoldenCrucible 壳层带进来的小补丁。

## DirectorFinal 当前差异

DirectorFinal tracked diff：

- `.env.example`
- `docs/04_progress/rules.md`
- `docs/dev_logs/HANDOFF.md`
- `server/assets.ts`
- `server/chat.ts`
- `server/distribution.ts`
- `server/index.ts`
- `server/market.ts`
- `server/music.ts`
- `server/pipeline_engine.ts`
- `server/project-root.ts` 删除
- `server/shorts.ts`
- `server/upload_handler.ts`
- `server/xml-generator.ts`
- `server/youtube-auth.ts`
- `src/SaaSApp.tsx`
- `src/components/Header.tsx`
- `src/components/StatusFooter.tsx`
- `src/components/delivery-shell/DeliveryShellLayout.tsx`
- `src/styles/delivery-shell.css`

DirectorFinal untracked：

- `docs/dev_logs/2026-04-22.md`
- `docs/plans/2026-04-24-directorfinal-to-director-fine-backport-next-window.md`
- `src/__tests__/server/project-paths.test.ts`

## 已摘或目标已具备

- `server/project-paths.ts` 作为路径 SSOT
- 删除 `server/project-root.ts`
- 服务端现存业务模块不再引用 `project-root`
- `/api/projects` 使用 `getProjectsBase()`
- `/api/projects/switch` 使用 `getProjectRoot(projectName)`
- `server/distribution.ts` 队列路径通过 `getDistributionQueueFile()` 运行时读取
- `Header.tsx` 项目列表 loading / error / empty 三态
- `ProductTopBar.tsx` 项目列表 loading / error / empty 三态
- `.env.example` 已保留 Director 目标分支自己的端口模板与 `PROJECTS_BASE=/path/to/your/Projects`
- `src/__tests__/server/project-paths.test.ts` 已存在，目标分支版本更贴近当前 helper 行为

## 本轮摘取

### 1. `src/components/StatusFooter.tsx` Director 身份文案

来源差异中有一颗独立小补丁：

- 在线状态从泛化/旧壳层语义改为 Director 语义
- 版本文案显示为 Director Console

目标分支当前仍是：

- `SYSTEM ONLINE`
- `MindHikers Console`

本轮只摘这两个文案，不摘 DirectorFinal 里的 SaaS `activeChatExpertId` / chatbox LLM label / runtime config 相关实现。

注意：目标分支当前默认进入 delivery shell，`StatusFooter` 只在非 delivery 分支渲染。因此这颗樱桃属于源码层产品身份对齐，不应包装成默认 Director 主界面 footer 可见变化。

### 2. `docs/04_progress/rules.md` 模块重建规则

来源差异中有一条事故规则值得进入目标分支：

- 重建模块分支时，必须同时迁移路径治理、`.env.example` 和启动口径
- 不能保留上一条产品线的默认项目名或 runtime fallback

这条规则直接来自 DirectorFinal 的路径治理事故，不牵引代码结构，属于安全治理回灌。

## 本轮不摘

- `src/SaaSApp.tsx`: Director-only SaaS shell 改造会牵出 Crucible 历史入口、认证和宿主结构
- `src/components/delivery-shell/DeliveryShellLayout.tsx`: DirectorFinal 移除了 `ProductTopBar`，目标分支当前仍需要项目/文稿选择
- `src/styles/delivery-shell.css`: 高度策略变更只有复现遮挡问题时再单独评估
- `src/components/StatusFooter.tsx` 中的 `activeChatExpertId` / `/api/llm-config/chatbox`: 会牵出目标分支当前没有的接口与调用链
- `server/music.ts`、`server/pipeline_engine.ts`、`server/xml-generator.ts`: 目标分支当前没有对应非 backup 文件，不能因为 DirectorFinal 有路径治理 diff 就恢复旧模块
- SaaS/Auth/Crucible shell、历史会话、认证相关差异
- DirectorFinal 整份 HANDOFF / daily log 覆盖目标分支交接面

## 两窗口内收口口径

本轮已经完成 DirectorFinal 差异的批量判定：

- 代码安全摘取：`StatusFooter` Director 身份文案
- 治理安全摘取：模块重建路径治理规则
- 已具备不重复摘：路径 SSOT、项目 API、项目切换、队列路径、Header/ProductTopBar 三态、`.env.example` 项目数据路径口径
- 明确不摘：SaaS/Auth/Crucible shell、移除 ProductTopBar、布局高度策略、旧模块恢复、DirectorFinal 过程 handoff 整份覆盖

除非老卢明确要求进入“产品身份/布局策略决策”，本轮不再继续从 DirectorFinal 扩大 cherry-pick 范围。

## 验证要求

本轮摘取后至少复跑：

```bash
npm run build
npm run test:run -- src/__tests__/server/project-paths.test.ts src/__tests__/director-bridge.test.ts src/__tests__/director-adapter.test.ts src/components/director/ChapterCard.test.tsx src/components/director/Phase1View.test.tsx src/components/director/Phase2View.test.tsx src/components/director/Phase3View.test.tsx src/components/director/Phase4View.test.tsx
```

如后续继续摘 UI 布局或页面结构，再使用 Agent Browser 做 smoke。
