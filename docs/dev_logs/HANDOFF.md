🕐 Last updated: 2026-03-26 12:20
🌿 Branch: MHSDC-GC-SSE

## 当前状态
- 本轮主工作已从单纯 Git / 目录治理，推进到 “SaaS -> SSE 共享底座反向同步第一轮落地”。
- 这轮同步遵循已审批原则：
  - 不把 SaaS 整线 merge 回 SSE
  - 只回灌共享底座、搜索修复、Skill Sync 收口
  - 多账号后续仍只在 SSE 研发，完成后再按能力包推回 SaaS
- 已落地的反向同步文件：
  - 搜索修复：`server/crucible-research.ts`、`src/__tests__/crucible-research.test.ts`
  - Skill Sync 收口：`server/skill-sync.ts`
  - 路径抽象底座：新增 `server/project-root.ts`
  - 前端运行时 / 存储底座：
    - `src/config/runtime.ts`
    - `src/components/crucible/storage.ts`
  - 已切到统一 `getProjectRoot()` 的服务模块：
    - `server/chat.ts`
    - `server/assets.ts`
    - `server/upload_handler.ts`
    - `server/director.ts`
    - `server/music.ts`
    - `server/shorts.ts`
    - `server/pipeline_engine.ts`
    - `server/xml-generator.ts`
    - `server/market.ts`
    - `server/youtube-auth.ts`
    - `server/distribution.ts`
    - `server/index.ts` 已完成最小导入桥接，不再依赖 `chat.ts` 导出 `getProjectRoot`
- `yaml` 依赖在 SSE 里本来就已存在，所以这轮没有额外改 `package.json`
- 当前 SSE 工作区依然很脏，但本轮只应单独提交这批“共享底座回灌”文件，不与其他脏改动混提

## 已验证结果
- `npm run test:run -- src/__tests__/crucible-research.test.ts` 已通过：
  - `1 file`
  - `5 tests`
  - `5 passed`
- 统一路径抽象后的关键文件已与 SaaS 对齐或完成同等桥接：
  - `server/chat.ts`
  - `server/assets.ts`
  - `server/crucible-research.ts`
  - `src/__tests__/crucible-research.test.ts`
  - `server/skill-sync.ts`
- `npm run build` 未通过，但失败项集中在 SSE 既有前端类型债，与本轮反向同步直接无关：
  - `src/components/market/*`
  - `src/components/StatusDashboard.tsx`
  - `src/components/ScheduleModal.tsx`
  - `src/components/ChatPanel.tsx`

## 当前 WIP
- 工作区仍然很脏，存在大量本轮之外的既有改动，不能直接整仓提交。
- `server/index.ts` 目前只做了最小导入桥接，还没有引入 SaaS 的 session/autosave/runtime 同源口径；这是刻意保留，避免压坏 SSE 已有流式研发现场。
- 尚未处理的更高冲突前端共享底座包括：
  - `src/App.tsx`
  - `src/components/crucible/CrucibleWorkspaceView.tsx`
- 多账号研发尚未开始；当前只是在给 SSE 打新的共享底座。

## 新窗口继续怎么做
- 第一步先按这轮范围整理一个“共享底座回灌提交”，只包含：
  - `server/project-root.ts`
  - 上述路径抽象替换文件
  - `server/crucible-research.ts`
  - `src/__tests__/crucible-research.test.ts`
  - `server/skill-sync.ts`
- 第二步不要把 `server/index.ts` 的 SaaS session/autosave/部署逻辑整包灌进 SSE；SSE 仍以研发线优先。
- 第三步在 SSE 开始多账号前，先评估是否要继续补前端共享底座：
  - `src/App.tsx`
  - `src/components/crucible/CrucibleWorkspaceView.tsx`
  - `src/components/crucible/storage.ts`
  - `src/config/runtime.ts`
- 第四步多账号完成后，不整线 merge 到 SaaS，而是按能力包 promotion 回推。

## 提醒
- 新窗口开始前先读：
  - `docs/dev_logs/HANDOFF.md`
  - `docs/04_progress/rules.md`
  - `docs/04_progress/dev_progress.md`
- 当前最重要的边界是：
  - `SSE` 是 GC-only 研发线
  - `SaaS` 是对外发布线
  - 只把共享底座和后续多账号成果按能力包推向 SaaS，不做整线回灌
