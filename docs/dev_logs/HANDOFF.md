🕐 Last updated: 2026-03-24 16:12
🌿 Branch: codex/min-105-saas-shell

## 当前状态
- 已基于 `/Users/luzhoua/MHSDC/GoldenCrucible-SSE` 的当前 `HEAD` 建立独立 SaaS worktree。
- `GoldenCrucible-SaaS` 与分支 `codex/min-105-saas-shell` 已完成一一对应，不再复用 `MHSDC-GC-SSE` 的脏工作区现场。
- 方案文档已保留在 `docs/plans/2026-03-24_GoldenCrucible_SaaS_Branch_Env_Plan.md`。
- 已完成第一轮 SaaS 宿主抽壳：
  - `src/App.tsx` 改为单模块 Crucible 壳
  - `src/components/Header.tsx` 去掉 Delivery / Distribution 切换，顶部只保留最小工作区与文稿上下文
  - `src/components/StatusFooter.tsx` 与 `src/components/LLMConfigPage.tsx` 已改成 GoldenCrucible SaaS 文案
- `.env.example` 已切到 SaaS 默认口径：`3010 / 5183`，并补入 `APP_BASE_URL / CORS_ORIGIN / SESSION_SECRET`

## WIP
- 下一步进入 `MIN-105` 的 SaaS 宿主抽壳实施。
- 当前宿主壳和顶层文案已收口，下一步应继续处理环境变量最小化与 session 最小持久化。
- 后端仍广泛依赖 `PROJECTS_BASE`；这部分还没完成 SaaS 化，需要按主链边界继续拆。
- `ChatPanel` / `CrucibleWorkspace` 当前仍保留本地 `localStorage` 快照逻辑，尚未切到云端 session。

## 待解决问题
- 还未为 SaaS worktree 分配并登记独立本地端口；建议口径 `3010 / 5183`，启动前需写入 `~/.vibedir/global_ports_registry.yml` 并落本地 `.env.local`
- 当前 `npm run build` 仍失败，但失败项主要是仓库既有类型债；与本轮直接相关的 `src/App.tsx` / `src/components/Header.tsx` 已通过定向 `eslint`
- 本轮为本地验证执行了 `npm install`，因此 `package-lock.json` 出现变更；提交前需要决定是否保留该锁文件差异
