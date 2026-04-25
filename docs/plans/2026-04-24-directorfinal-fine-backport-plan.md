# DirectorFinal -> MHSDC-DC-director 精细回灌计划

**日期**: 2026-04-24
**来源 worktree**: `/Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal`
**来源分支**: `director-final`
**目标 worktree**: `/Users/luzhoua/MHSDC/DeliveryConsole/Director`
**目标分支**: `MHSDC-DC-director`
**状态**: draft

---

## 一句话结论

不做整枝 merge，不做整枝 cherry-pick。

`director-final` 和 `MHSDC-DC-director` 已经从较早基点分叉，整枝 diff 达到 476 个文件级别；直接合并会把 GoldenCrucible / SaaS / Director 多条历史线搅在一起。正确策略是按语义单元逐项核对，只回灌确认安全、目标分支尚未具备的等价修复。

---

## 当前事实

### DirectorFinal 当前差异

`director-final` 未提交 tracked diff 约 20 个文件：

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

另有 untracked：

- `docs/dev_logs/2026-04-22.md`
- `src/__tests__/server/project-paths.test.ts`

### 目标分支当前状态

`MHSDC-DC-director` 已经完成第二阶段系统性清理：

- `npm run build` 通过
- focused tests 8 files / 46 tests 通过
- runtime smoke 和 Agent Browser UI smoke 通过
- 当前仍有未提交清理 diff 与 tracked `skills/__pycache__/*.pyc` 删除噪音

---

## 回灌矩阵

### A. 已经具备，不再回灌

这些能力在目标分支已经存在，不应重复搬运：

- `server/project-paths.ts` 与 DirectorFinal 一致
- `server/project-root.ts` 在目标分支已不存在
- 非 backup 服务端文件已经统一使用 `server/project-paths.ts`
- `server/index.ts` 已调用 `ensureProjectsBaseExists()`
- `/api/projects` 已使用 `getProjectsBase()`
- `/api/projects/switch` 已使用 `getProjectRoot(projectName)`
- `server/distribution.ts` 队列文件已运行时读取 `getProjectsBase()`
- `src/__tests__/server/project-paths.test.ts` 已存在且通过
- `src/components/Header.tsx` 已具备项目 loading / error / empty 三态
- `src/components/delivery-shell/ProductTopBar.tsx` 已具备项目 loading / error / empty 三态
- `.env.example` 已明确 `PROJECTS_BASE=/path/to/your/Projects`

### B. 需要继续核对但默认不直接回灌

这些差异可能有价值，但不能不经设计直接搬：

- `src/SaaSApp.tsx`
  - DirectorFinal 把 SaaS 壳切成 Director-only，移除/隐藏 Crucible 历史入口
  - 目标分支是 Director 模块线，不应直接套 SaaS shell 变更
- `src/components/StatusFooter.tsx`
  - 文案从 GoldenCrucible SaaS 改为 Director Console
  - 是否回灌取决于目标产品身份，不是路径治理的一部分
- `src/components/delivery-shell/DeliveryShellLayout.tsx`
  - DirectorFinal 移除了 `ProductTopBar`
  - 目标分支当前仍需要 topbar 项目/文稿选择，不直接回灌
- `src/styles/delivery-shell.css`
  - `height: 100%` 替代 `100vh/topbar-height` 属布局策略变更
  - 只有在目标分支复现高度问题时才单独评估

### C. 明确不回灌

这些不进入目标分支：

- 整枝 `director-final` merge
- 整枝 commit cherry-pick
- GoldenCrucible / SaaS-only 路由、认证、历史会话相关改动
- 删除目标分支当前有效的 Director shell / ProductTopBar 结构
- 将 DirectorFinal 的过程 HANDOFF 整份覆盖目标 HANDOFF

---

## 执行步骤

### Step 1: 回灌前冻结目标事实

在 `/Users/luzhoua/MHSDC/DeliveryConsole/Director`：

1. 记录 `git status --short --branch`
