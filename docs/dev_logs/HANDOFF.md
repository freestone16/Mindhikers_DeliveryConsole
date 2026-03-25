🕐 Last updated: 2026-03-25 10:46
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
- 已补齐 Railway 可部署单服务入口：
  - `package.json` 新增 `build:railway` 与生产 `start`
  - `server/index.ts` 可在单端口上同时提供 API / Socket / 构建后的前端静态资源
  - `src/config/runtime.ts` 在生产环境默认走同源 API / Socket
  - 已新增 `railway.json`
- 本地已验证：
  - `npm run build:railway` 成功生成 `dist/`
  - 单进程启动成功
  - `http://127.0.0.1:3010/health` 返回 `status: ok`
  - `http://127.0.0.1:3010/` 返回 `200`
  - 浏览器快照已确认 SaaS 页面壳能渲染

## WIP
- 下一步进入 `MIN-105` 的 SaaS 宿主抽壳实施。
- 当前宿主壳、单服务生产入口和基础部署口径已收口，下一步应继续处理环境变量最小化与 session 最小持久化。
- 后端仍广泛依赖 `PROJECTS_BASE`；这部分还没完成 SaaS 化，需要按主链边界继续拆。
- `ChatPanel` / `CrucibleWorkspace` 当前仍保留本地 `localStorage` 快照逻辑，尚未切到云端 session。

## 待解决问题
- 还未为 SaaS worktree 分配并登记独立本地端口；建议口径 `3010 / 5183`，启动前需写入 `~/.vibedir/global_ports_registry.yml` 并落本地 `.env.local`
- 当前 `npm run build` 仍失败，但失败项主要是仓库既有类型债；Railway 使用的 `npm run build:railway` 已单独验证通过
- 当前工作区存在与本轮无关的 `skills/*` 改动；提交时必须只暂存 SaaS 与 Railway 入口相关文件
