🕐 Last updated: 2026-03-27 11:18
🌿 Branch: MHSDC-GC-SSE

## 当前状态
- 当前默认前端入口已切为独立 SaaS 壳：`src/SaaSApp.tsx`
- 当前 `build` / `build:railway` 已不再被导演 / 营销等历史模块类型债阻塞
- Google 登录已完成真实 smoke，可作为当前可用登录入口
- 黄金坩埚 SaaS 总体方案 Ver1.0 已落盘到：
  - `docs/02_design/crucible/2026-03-27_GoldenCrucible_SaaS_V1.0.md`
- `workspace-aware persistence` 已完成第一刀：
  - 当前 turn 写入已开始进入 `workspaceId / conversationId` 语义
  - reset 已能同步清掉 autosave 与 active conversation pointer
- `workspace-aware persistence` 已完成第二刀：
  - conversation 读侧 API 已补齐
  - 前端启动恢复已优先走 active conversation

## 本轮关键结果
- 新增坩埚持久化骨架：
  - `server/crucible-persistence.ts`
  - 统一解析：
    - `workspaceId`
    - `conversationId`
    - workspace runtime dir
- turn 写入已开始落到：
  - `runtime/crucible/workspaces/<workspaceId>/conversations/<conversationId>.json`
  - 并同步维护：
    - `active_conversation.json`
    - `conversations/index.json`
    - `turn_log.json` 兼容镜像
- conversation 读侧已补齐：
  - `GET /api/crucible/conversations`
  - `GET /api/crucible/conversations/active`
  - `GET /api/crucible/conversations/:conversationId`
  - `POST /api/crucible/conversations/:conversationId/activate`
- conversation detail 已统一带回：
  - `summary`
  - `snapshot`
  - `artifacts`
  - `sourceContext`
- artifact 已补上最小独立导出：
  - `GET /api/crucible/conversations/:conversationId/artifacts/export`
  - 当前先导出结构化 bundle JSON
  - `format` 参数已留位，后续可扩成 markdown / docx / pdf
- 前端坩埚主链已开始保存和续用 `conversationId`
- 快照持久化已升级为：
  - `localStorage + /api/crucible/autosave`
- 前端恢复优先级已改为：
  - active conversation
  - autosave
  - localStorage 缓存
- SaaS 已接入最小历史对话入口：
  - 头像菜单可打开 history sheet
  - 可恢复历史 conversation，并重新设为 active
  - 可对单条历史 conversation 触发“导出产物”
- 后端 SSE 路由已正式挂载：
  - `POST /api/crucible/turn/stream`
- 基于当前代码现场补齐了一版 Ver1.0 总体方案，统一口径为：
  - `安全`
  - `健壮`
  - `简单`
  - `高效`
- 方案明确：
  - Ver1.0 采用 `单前端 + 单 Web 服务 + 单数据库 + 最小文件持久化`
  - auth 用 `Better Auth + Postgres`
  - workspace kernel 继续自建
  - 下一步唯一主线是完整的 `workspace-aware persistence`
- 新增独立 SaaS 主壳：
  - `src/SaaSApp.tsx`
  - 只保留 `黄金坩埚` 与 `分发终端`
  - 当前默认入口不再 import `Director / Shorts / Marketing` 历史交付模块
- Header 已支持模块白名单：
  - `src/components/Header.tsx`
  - SaaS 壳只显示 `crucible / distribution`
  - 在 SaaS 壳里 project / script 选择器不再因处于坩埚页而锁死
- 构建链路已完成分仓：
  - `tsconfig.saas.json`
  - `npm run typecheck:saas`
  - `npm run build` / `npm run build:railway` 改为校验 SaaS 主链
  - `npm run typecheck:full` 保留整仓历史债清单
- 当前打包体积已明显下降：
  - `721.22 kB -> 562.12 kB`

## 本轮代码落点
- 新增：
  - `src/SaaSApp.tsx`
  - `tsconfig.saas.json`
  - `docs/02_design/crucible/2026-03-27_GoldenCrucible_SaaS_V1.0.md`
  - `server/crucible-persistence.ts`
- 修改：
  - `docs/02_design/crucible/_master.md`
  - `server/crucible.ts`
  - `src/components/crucible/storage.ts`
  - `server/index.ts`
  - `src/components/crucible/CrucibleWorkspaceView.tsx`
  - `src/components/crucible/types.ts`
  - `src/main.tsx`
  - `src/components/Header.tsx`
  - `package.json`
  - `docs/04_progress/dev_progress.md`
  - `docs/04_progress/rules.md`

## 验证结果
- `./node_modules/.bin/tsx --eval "import './server/crucible-persistence.ts'; import './server/crucible.ts'"`：通过
- `npm run typecheck:saas`：通过
- `npm run build`：通过
- `npm run typecheck:full`：失败，但失败项已退回历史模块：
  - `src/components/market/*`
  - `src/components/MarketingSection.tsx`
  - `src/components/ScheduleModal.tsx`
  - `src/components/StatusDashboard.tsx`

## 当前 WIP
- 已完成：
  - Google 登录真实 smoke
  - SaaS 主链入口分仓
  - 历史类型债对当前 build 的阻塞隔离
  - SaaS Ver1.0 总体方案落盘
  - `workspace-aware persistence` 第一刀（写入骨架）
  - `workspace-aware persistence` 第二刀（恢复 / 查询读侧）
- 未完成：
  - `Crucible` 更完整的历史中心 UI
  - `artifact` 更多格式导出
  - 用户登录后态的头像菜单真实功能接线
  - 微信网站应用登录接通

## 待解决问题
- 当前只是把历史模块从 SaaS 主链入口和 build 中切掉了，整仓旧债本身并未清除
- 若后续要彻底清债，应单开历史模块收口任务，不要再回灌进 `MIN-105`
- Google `Client Secret` 已在对话中出现，测试完成后建议旋转一版
- 当前 persistence 已完成“写 + 读接口”闭环，但还没补：
  - 更完整的历史对话 UI
  - artifact 多格式导出
  - localStorage 的 workspace scope key

## 新窗口直接怎么做
1. 把当前 history sheet 扩成更完整的历史中心：
   - 搜索
   - 排序
   - 更多元数据
2. 基于当前 `format` 参数，把 `artifact` 继续扩成 markdown / docx / pdf 等导出
3. 对照 `docs/02_design/crucible/2026-03-27_GoldenCrucible_SaaS_V1.0.md`，继续把 `projectId / scriptPath` 从坩埚主 identity 链路剥掉
4. 然后接登录后态真实功能：
   - 历史对话
   - 下载
   - 会员计划
5. 最后补微信网站应用登录
