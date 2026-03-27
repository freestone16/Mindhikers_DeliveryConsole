# Delivery Console — 开发进展 & 遗留问题

> **更新日期**: 2026-03-27 CST

---

## 1.13 2026-03-27（邮箱注册线上真实 smoke）

### ✅ 本轮已完成

- 已在生产环境 `https://golden-crucible-saas-production.up.railway.app/` 完成一次真实邮箱注册 smoke
- 本次实测使用邮箱：
  - `codex.gc.smoke.20260327.1417@example.com`
- 实测结果：
  - 注册按钮可提交
  - 注册后成功进入登录后界面
  - `GET /api/account/session` 返回 `authenticated: true`
  - personal workspace 已自动创建

### 🎯 本轮验证结论

- 邮箱注册不再只是“代码可用”，已经升级为“实测可用”
- 实测拿到的关键信息：
  - `email = codex.gc.smoke.20260327.1417@example.com`
  - `workspaceName = Codex Smoke 的工作区`
  - `workspaceId = 3b1633f7-efcc-4955-9cfe-7f6f30492aa5`

### ⚠️ 现场备注

- 当前本地 `.env.local` 没有 `DATABASE_URL`
  - 所以本地开发环境不会出现真实注册页
  - 这次 smoke 结论来自生产环境，不是本地环境
- 当前生产环境登录后仍落到旧的多模块宿主壳，不是最新的 SaaS-only 壳
  - 这不影响“邮箱注册可用”的结论
  - 但说明线上部署版本和当前仓库最新主链仍存在差距

## 1.12 2026-03-27（workspace-aware persistence 第二刀：读侧闭环）

### ✅ 本轮已完成

- 补齐坩埚 conversation 的读侧 API：
  - `GET /api/crucible/conversations`
  - `GET /api/crucible/conversations/active`
  - `GET /api/crucible/conversations/:conversationId`
  - `POST /api/crucible/conversations/:conversationId/activate`
- conversation 详情接口已统一返回：
  - `summary`
  - `snapshot`
  - `artifacts`
  - `sourceContext`
- `artifact` 已具备最小 workspace-aware 读取入口：
  - 当前不再只存在于写入文件里
  - 已可通过 conversation detail 一并读回
- `artifact` 已补上最小单独导出能力：
  - `GET /api/crucible/conversations/:conversationId/artifacts/export`
  - 当前稳定导出结构化 bundle JSON
  - `format` 参数已预留，后续可平滑切到 markdown / docx / pdf 等文档形态
- SaaS 已接入最小“历史对话”入口：
  - 头像菜单中的“历史对话”已可打开 history sheet
  - 可读取当前 workspace 下的 conversation 列表
  - 点击任一历史 conversation 后会恢复 snapshot，并重新设为 active conversation
  - 同时可对单条历史 conversation 触发“导出产物”
- history sheet 已升级为轻量历史中心：
  - 搜索
  - 排序
  - `messageCount / artifactCount / status` 基础元数据
  - 预留后续筛选 / 归档 / 标签扩展位
- 导出参数位已前置到 UI：
  - 当前只有 `bundle-json`
  - 但前后端都已留出 `format` 选择位
- 前端启动恢复链路已切换为：
  - 优先读取 `active conversation`
  - 若没有 active conversation，再退回 `autosave`
  - 本地 `localStorage` 继续只做缓存兜底
- `src/components/crucible/storage.ts` 已统一恢复逻辑：
  - 避免 `SaaSApp` / `App` 各自重复请求和各自漂移

### 🎯 本轮验证结论

- `npm run typecheck:saas`：通过
- `npm run build`：通过
- `./node_modules/.bin/tsx --eval "import './server/crucible-persistence.ts'; import './server/crucible.ts'"`：通过
- 当前说明：
  - workspace 下的 `turn / conversation / artifact` 已不再只是“能写不能读”
  - 当前已经具备最小恢复与查询闭环

### ⚠️ 当前剩余事项

- 目前历史对话已经有最小 UI，但还不是完整历史中心
- `artifact` 已可随 conversation detail 读回，但还没做：
  - 更多文档格式导出
  - 更完整的历史浏览入口
  - 归档 / 重命名 / 标签等管理能力
- `projectId / scriptPath` 仍保留在 `sourceContext` 和部分宿主链路中
  - 现在更多是兼容上下文
  - 已不是坩埚主 identity
- browser `localStorage` 仍未按 workspace 拆 key
  - 当前靠服务端 active conversation 恢复来压低串数据风险
  - 后续仍建议补成本地 scope key

## 1.11 2026-03-27（workspace-aware persistence 第一刀）

### ✅ 本轮已完成

- 为黄金坩埚新增最小持久化骨架：
  - `server/crucible-persistence.ts`
  - 统一为当前主链生成：
    - `workspaceId`
    - `conversationId`
    - `active conversation pointer`
- 坩埚 turn 写入已开始进入 `workspace / conversation` 语义：
  - 认证开启时写入 `runtime/crucible/workspaces/<workspaceId>/conversations/<conversationId>.json`
  - 本地未启用 auth 时继续兼容 legacy `projectId` 目录语义
- conversation 文件当前已开始承载：
  - `turns`
  - `messages`
  - `artifacts`
  - `sourceContext`
- workspace 目录下新增最小索引与兼容镜像：
  - `active_conversation.json`
  - `conversations/index.json`
  - `turn_log.json`（兼容观察口径）
- 前端坩埚主链已开始透传并持有 `conversationId`：
  - `src/components/crucible/CrucibleWorkspaceView.tsx`
  - 首轮无 `conversationId` 时由后端生成，后续轮次续用
- 前端快照已从“只写 localStorage”升级为：
  - `localStorage + /api/crucible/autosave`
  - 快照中已开始保存 `conversationId`
- reset 语义已补齐最小闭环：
  - 清空本地快照
  - 清空服务端 autosave
  - 清空 active conversation pointer
- 补上后端 SSE 主链挂载：
  - `POST /api/crucible/turn/stream`

### 🎯 本轮验证结论

- `npm run typecheck:saas`：通过
- `npm run build`：通过
- `./node_modules/.bin/tsx --eval "import './server/crucible-persistence.ts'; import './server/crucible.ts'"`：通过
- 当前说明：
  - SaaS 主链已经具备最小 `workspaceId / conversationId` 持久化骨架
  - 但还没有做“历史对话列表读取 UI”与“conversation 查询接口”

### ⚠️ 当前剩余事项

- 当前已把写入主链切到 `workspace / conversation`，但读取面还没补齐：
  - 历史对话列表接口
  - conversation 恢复接口
  - artifact 下载 / 导出接口
- `projectId / scriptPath` 仍存在于部分预览与宿主链路中
  - 目前已不再作为坩埚主持久化主 identity
  - 但还未从全链路完全删除
- browser `localStorage` 仍是缓存层
  - 当前真实来源已经开始转向服务端 autosave / conversation 文件
  - 但还没做 workspace 维度的本地 key 拆分

## 1.10 2026-03-27（SaaS 主链入口分仓 + 历史类型债隔离）

### ✅ 本轮已完成

- 当前默认前端入口已切到独立 SaaS 壳：
  - `src/SaaSApp.tsx`
  - `src/main.tsx`
  - 当前 production / Railway 构建不再经过旧的 `src/App.tsx`
- SaaS 壳已只保留当前主线能力：
  - `黄金坩埚`
  - `分发终端`
  - 不再 import 导演 / Shorts / 营销等历史交付模块
- Header 已改成可配置模块口径：
  - `src/components/Header.tsx`
  - 当前 SaaS 入口只展示 `crucible / distribution`
  - 在 SaaS 壳里，project / script 选择器不再因为位于坩埚页而被锁死
- 构建与类型检查已正式分仓：
  - 新增 `tsconfig.saas.json`
  - 新增 `npm run typecheck:saas`
  - `npm run build` / `npm run build:railway` 现走 `typecheck:saas + vite build`
  - `npm run typecheck:full` 保留为整仓历史债务清单

### 🎯 本轮验证结论

- `npm run typecheck:saas`：通过
- `npm run build`：通过
- SaaS 前端产物体积已下降：
  - 由 `721.22 kB` 降到 `562.12 kB`
  - 说明旧 Delivery 模块已不再进入当前默认打包主链
- `npm run typecheck:full`：仍失败，但失败项已明确退回历史模块：
  - `src/components/market/*`
  - `src/components/MarketingSection.tsx`
  - `src/components/ScheduleModal.tsx`
  - `src/components/StatusDashboard.tsx`
  - 这些旧债当前已不再阻塞 SaaS 主链 build

### ⚠️ 当前剩余事项

- `Crucible turn / conversation / artifact` 仍未完成全量 `workspace-aware`
  - 当前只完成了登录、workspace bootstrap、autosave 分仓
- Google 登录已可用，但登录后态仍需继续补齐：
  - 头像菜单真实功能接线
  - 历史对话 / 下载 / 会员计划等菜单项
- 微信网站应用登录仍待接通
- 整仓历史类型债仍存在
  - 但已经从当前 SaaS 交付链路中隔离出来
  - 后续若要清债，应作为独立收口任务推进，不应再阻塞 `MIN-105` 主线

## 1.9 2026-03-26（多账号 Phase 0/1 骨架接入）

### ✅ 本轮已完成

- 按 `docs/plans/2026-03-26_GoldenCrucible_SSE_Multi_Account_Research_and_Plan.md` 落下首批实现骨架：
  - `Better Auth + Postgres + personal workspace bootstrap`
- 新增后端 auth/workspace 基础层：
  - `server/auth/index.ts`
  - `server/auth/account-router.ts`
  - `server/auth/workspace-store.ts`
  - 支持：
    - Better Auth 路由挂载
    - `GET /api/account/status`
    - `GET /api/account/session`
    - `POST /api/account/active-workspace`
    - personal workspace 自动初始化
- 新增迁移入口：
  - `scripts/run-auth-migrations.ts`
  - `package.json` 新增 `npm run auth:migrate`
- 前端已接最小登录门禁：
  - `src/auth/*`
  - `src/main.tsx`
  - 未登录时进入注册 / 登录界面
  - 登录后自动拉取 account session 与 active workspace
- 三类登录入口已进入首批接线状态：
  - `邮箱注册 / 登录` 已可用
  - `Google 登录` 已接入 provider 配置位与前端入口
  - `微信扫码登录` 已按“微信开放平台网站应用”口径预留 provider 配置位与前端入口
- Header 已接入当前登录态摘要与退出入口：
  - `src/components/Header.tsx`
- Crucible autosave 已开始按 workspace 落隔离路径：
  - 未启用 auth 时继续兼容旧路径 `runtime/crucible/autosave.json`
  - 启用 auth 后切换为 `runtime/crucible/workspaces/<workspaceId>/autosave.json`
- 补上 crucible autosave 清理路由：
  - `DELETE /api/crucible/autosave`

### 🎯 本轮验证结论

- 新增前端 auth 层定向 lint 已通过：
  - `src/auth/AppAuthContext.ts`
  - `src/auth/AuthBoundary.tsx`
  - `src/auth/AuthProvider.tsx`
  - `src/auth/AuthScreen.tsx`
  - `src/auth/client.ts`
  - `src/auth/types.ts`
  - `src/auth/useAppAuth.ts`
  - `src/main.tsx`
  - `src/App.tsx`
- 新增服务端 auth 模块已可被 `tsx` 真实加载：
  - 输出：`auth-module-ok`
- `npm run build` 仍未通过，但阻塞仍集中在仓库既有前端类型债：
  - `src/components/market/*`
  - `src/components/ScheduleModal.tsx`
  - `src/components/StatusDashboard.tsx`
  - `src/components/ChatPanel.tsx`
  - 当前未出现新的 auth/workspace 构建阻塞项
- Railway 侧已完成第一轮真实打通：
  - `GoldenCrucible-SaaS-Staging` 已 link 到当前 worktree
  - 已新增 Railway Postgres
  - `golden-crucible-saas` 已写入：
    - `DATABASE_URL`
    - `BETTER_AUTH_SECRET`
    - `BETTER_AUTH_URL`
  - `npm run auth:migrate` 已成功执行
  - Railway Postgres 已验表存在：
    - `user`
    - `session`
    - `account`
    - `verification`
    - `workspace`
    - `workspace_member`
    - `workspace_invitation`
    - `active_workspace`
  - Staging 部署已成功
  - 线上核验已通过：
    - `GET /health`
    - `GET /api/account/status`
    - 返回 `authEnabled: true`
    - Google provider 已完成 production 接通并验证 `googleEnabled: true`
    - 微信 provider 是否可用仍取决于对应开放平台资料与密钥是否补齐

### ⚠️ 当前剩余事项

- 还没有把 `Crucible turn / conversation / artifact` 全量切到 workspace-aware
  - 当前只先收口 autosave
- Google 登录已完成真实 smoke，可作为当前可用登录入口
  - production `googleEnabled: true`
  - 首页按钮已可点击
  - 已能跳转 Google 授权页并命中正确 callback
  - 当前剩余的是登录后态细节与头像菜单功能补齐，不再是“能不能登录”的问题
- 微信真实线上登录还未完成 smoke
  - 当前已经预留 UI 与 provider 配置位
  - 仍需补齐对应的 `CLIENT_ID / CLIENT_SECRET` 与开放平台资料
- 已新增微信网站应用准备清单：
  - `docs/plans/2026-03-26_GoldenCrucible_SSE_WeChat_Web_Login_Preparation_Checklist.md`
- 为了让 `railway up` 成功，已新增：
  - `.railwayignore`
  - `railway.json`
  - `build:railway`
  - `start`
  - 当前 staging 已能用 Express 托管 `dist` 静态产物
- 整仓 `npm run build` 仍会被既有前端类型债拦住：
  - 主要集中在 `src/components/market/*`
  - 以及依赖旧 `DeliveryState.modules` 结构的历史面板组件
  - 当前 `build:railway` 已绕开这批 unrelated 前端债，先保障 SaaS 主链可部署

## 1.8 2026-03-24（黄金坩埚“老张已搜索”回归排错修复）

### ✅ 本轮已完成

- 修复 SSE 坩埚里“老张口头说去搜，但后台并未真正执行搜索”的回归：
  - `server/crucible.ts`
  - `server/crucible-research.ts`
  - 当前主链会在检测到明确联网搜索诉求后，先执行真实外部检索，再把 `research` 证据块写回 prompt 与 `turn_log.json`
- 补强搜索证据落盘：
  - `meta.searchRequested`
  - `meta.searchConnected`
  - `research.query`
  - `research.sources`
- 修正搜索 query 生成：
  - 当用户最新一句只是“去网上搜一下最新进展、补充我们的对话”这类泛化指令时，不再直接拿空话去搜
  - 优先回退到 `topicTitle + 最新研究`，减少无关结果
- 新增 / 更新回归测试：
  - `src/__tests__/crucible-research.test.ts`
  - 覆盖“泛化搜索指令回退到议题 query”场景

### 🎯 本轮验证结论

- 本地真实请求已确认重新接通搜索链路：
  - `POST /api/crucible/turn`
  - `roundIndex: 20`
  - `runtime/crucible/golden-crucible-sandbox/turn_log.json`
  - 最新 turn 已写入：
    - `meta.searchRequested: true`
    - `meta.searchConnected: true`
    - `research.query`
    - `research.sources: 5`
- 当前最小回归已通过：
  - `npm run test:run -- src/__tests__/crucible-research.test.ts src/__tests__/crucible-prompt.test.ts src/components/crucible/sse.test.ts`

### ⚠️ 剩余观察

- 搜索“有没有执行”这一层已修复
- 但 Bing RSS 结果质量仍会受 query 质量影响；当前已避免把“补充我们的对话”之类空话直接送去检索，后续仍可继续优化 query 组装与来源筛选

---

## 1.7 2026-03-23（SSE 轻量 SaaS 上云清单 + Linear 收口）

### ✅ 本轮已完成

- 新增当前 SSE 分支可直接执行的上云清单：
  - `docs/plans/2026-03-23_GoldenCrucible_SSE_SaaS_Cloud_Launch_Checklist.md`
- 明确从代码现场看仍需处理的 SaaS 阻塞：
  - 仍存在 Delivery 宿主壳
  - 坩埚链路仍残留 `projectId / scriptPath` 语义
  - 会话恢复仍主要依赖 `localStorage`
  - 仓库内尚无明确 Railway / Vercel 正式部署配置
- Linear 已重新收口：
  - `MIN-104` 已补完成说明与验证结果，并关闭为 `Done`
  - `MIN-105` 已改为 `In Progress`，步骤收束为 SaaS 外壳、去本地依赖、最小持久化、部署配置、线上 smoke
  - `MIN-106` 保持 `Todo`，明确不得抢在 SaaS 宿主前推进
  - `MIN-94` 继续作为总协调卡保留

### 🎯 当前统一口径

- `MIN-104` 已结束，当前下一窗口的唯一主线应转入 `MIN-105`
- 本轮不是再讨论“大而全 SaaS”，而是把当前 SSE 版黄金坩埚抽成一个轻量在线宿主
- 目标明确为：给少量朋友、合作方、投资人做稳定演示

---

## 1.6 2026-03-22（坩埚主链收回宿主业务判断）

### ✅ 本轮已完成

- 删除宿主侧 Research bridge：
  - 删除 `server/crucible-research.ts`
  - 删除旧测试 `src/__tests__/crucible-research.test.ts`
- 删除宿主侧 orchestrator 业务判断：
  - `server/crucible-orchestrator.ts` 只保留 prompt 组装，不再判断 `phase / searchRequested / toolRoutes`
  - 坩埚后端不再替苏格拉底决定是否搜索、是否查证、是否调用 `Researcher / FactChecker`
- 删除宿主兜底业务输出：
  - server / frontend 在 LLM 失败时不再伪造追问、黑板或“fallback 讨论内容”
  - 失败时只保留技术层错误回传，不再冒充苏格拉底继续对话
- 收紧坩埚主链 prompt：
  - `server/crucible.ts`
  - `buildSocratesPrompt()` 现在显式声明宿主只做上下文与结果回传，业务判断全部由苏格拉底依据 SKILL.md 自行处理
- 前端 SSE 消费同步瘦身：
  - `src/components/crucible/CrucibleWorkspaceView.tsx`
  - `src/components/crucible/types.ts`
  - 去掉对后端 `meta/orchestrator/searchConnected` 业务元信息的依赖
- 新增回归测试：
  - `src/__tests__/crucible-prompt.test.ts`
  - 验证宿主边界已进入 prompt，且用户搜索诉求会被要求由苏格拉底正面响应

### 🎯 当前统一口径

- 黄金坩埚里，所有讨论业务都由苏格拉底负责
- 宿主层只做 HTTP / SSE、状态同步、结果桥接、日志落盘
- 如果用户要求联网搜索或事实核查，响应与调派逻辑都应来自苏格拉底 skill，而不是 server 侧桥接代码

## 1.5 2026-03-22（当前执行面重构为 SSE / SaaS / Roundtable 三主线）

### ✅ 本轮已完成

- 将黄金坩埚当前执行面收束为三项主工作：
  - 坩埚主链修订为 `HTTP + SSE` 版本并完成验收
  - 完成 SaaS 版架构设计、环境需求确认与部署上线
  - 在黄金坩埚内开启 Roundtable 分支，并要求本地版与 SaaS 版同步推进后再合并
- 新增当前执行面 SSOT 文档：
  - `docs/plans/2026-03-22_GoldenCrucible_SSE_SaaS_Roundtable_Execution_Plan.md`
- 更新 `docs/02_design/crucible/_master.md`
- Linear 已同步修订：
  - 总协调卡：`MIN-94` `Crucible SSE / SaaS / Roundtable Tranche`
  - 新主执行卡：`MIN-104`、`MIN-105`、`MIN-106`
  - 上一轮 `MIN-95 ~ MIN-99` 已退回 Backlog，保留为历史拆卡背景
- 明确纪律：本次对话中涉及但不在上述三项中的内容，一律暂列“未尽事宜”，后续再跟进
- `MIN-104` 已开始实施第一刀：
  - 后端新增黄金坩埚 SSE 流式接口：`POST /api/crucible/turn/stream`
  - 坩埚 turn 生成逻辑已收敛为共享核心，原 JSON 接口与新 SSE 接口共用同一套生成逻辑
  - 前端坩埚主链已改为 `POST + SSE` 流式消费
  - 新增 SSE 解析单测：`src/components/crucible/sse.test.ts`
  - 当前最小回归：`sse.test.ts`、`hostRouting.test.ts`、`crucible-research.test.ts` 已通过
  - `npm run build` 仍被市场模块与旧 DeliveryState 类型债阻塞；本轮未新增新的坩埚类型错误
- 分支资源隔离已完成：
  - `MHSDC-GC-SSE` 保持当前工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
  - `MHSDC-GC` 稳定线已独立为 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-GC`
  - `MHSDC-GC-SSE` 独立端口：后端 `3009` / 前端 `5182`
  - `MHSDC-GC` 稳定线保留原端口：后端 `3004` / 前端 `5176`
  - `MHSDC-GC-SSE` 已写入全局端口账本 `~/.vibedir/global_ports_registry.yml`

---

## 1.4 2026-03-20（黄金坩埚真实外部搜索接通）

### ✅ 本轮已完成

- 为黄金坩埚新增真实外部搜索桥接：
  - `server/crucible-research.ts`
  - 通过 Bing RSS 拉取外部结果，统一产出 `query / connected / sources / error`
- 将外部搜索接入坩埚回合生成主链：
  - `server/crucible.ts`
  - 当 `searchRequested: true` 时先执行检索，再把搜索材料注入 prompt
  - 回包与 `turn_log.json` 不再把 `searchConnected` 写死为 `false`
  - `turn_log.json` 新增 `research` 证据块
- 新增回归测试：
  - `src/__tests__/crucible-research.test.ts`
- 更新黄金测试 request 口径：
  - `testing/golden-crucible/requests/TREQ-2026-03-20-GC-002-crucible-search-request.md`
  - `testing/golden-crucible/requests/TREQ-2026-03-20-GC-003-crucible-contextual-search-request.md`

### 🎯 本轮验证结论

- 通过 `agent-browser` 真实重放 `GC-003` 三轮对话，第三轮搜索请求已出现真实外部材料痕迹：
  - 页面回复明确引用外部搜索结果，并提到 MIT 相关材料
  - 黑板标题更新为：`外部搜索的启示：技术讨论与生态分析的断层`
- 最新 runtime 证据已确认：
  - `runtime/crucible/golden-crucible-sandbox/turn_log.json`
  - `roundIndex: 3`
  - `searchRequested: true`
  - `searchConnected: true`
  - `research.query` 已写入
  - `research.sources` 已落 5 条外部来源
- 当前浏览器证据：
  - `testing/golden-crucible/artifacts/TREQ-003-agent-browser-search-connected.png`

### ⚠️ 当前补充说明

- 这次 `agent-browser` 实测已证明真实搜索链路打通，但检索质量仍较粗糙：
  - 当前返回结果偏向通用 AI 新闻源
  - 与“中文内容生态稀缺性”主题仍存在一定语义偏移
- `npm run build` 仍被仓库内既有的 unrelated TypeScript 问题阻塞，本轮未额外处理其他业务域错误

---

## 1.3 2026-03-20（黄金测试 skill 输出契约增强）

### ✅ 本轮已完成

- 更新 `golden-testing` skill：
  - `/Users/luzhoua/.codex/skills/golden-testing/SKILL.md`
  - 明确要求每次测试完成后都要落一份**可交接的测试报告**
  - 新增强制章节：
    - `Verification Results`
    - `Bug Follow-up`
    - `Handoff Notes`
- 同步升级坩埚报告模板：
  - `testing/golden-crucible/reports/REPORT_TEMPLATE.md`
- 已将 `GC-003` 报告补强为后续排错可直接接手的版本：
  - `testing/golden-crucible/reports/TREQ-2026-03-20-GC-003-crucible-contextual-search-request.report.md`

### 🎯 当前意义

- 后续新窗口不需要先重新还原上下文
- 测试报告里已经明确拆开：
  - 已修复的 bug：语境化搜索请求漏检
  - 待继续处理的 bug：真实外部搜索仍未接通

## 1.2 2026-03-20（语境化搜索诉求漏检修复）

### ✅ 本轮已完成

- 修复黄金坩埚搜索意图判定：
  - `server/crucible-orchestrator.ts`
  - 由只检查 `topicTitle / previousCards / seedPrompt`
  - 改为同时检查 `latestUserReply`
- 新增回归测试：
  - `src/__tests__/crucible-orchestrator.test.ts`
- 更新语境化专项 request：
  - `testing/golden-crucible/requests/TREQ-2026-03-20-GC-003-crucible-contextual-search-request.md`
  - 补充“进入后先重置工作区”要求，避免历史黑板污染

### 🎯 根因与验证

- 真实缺陷：当用户前两轮已经进入具体讨论、第三轮才提出“联网搜索”时，旧逻辑不会检查 `latestUserReply`，导致 `searchRequested` 被错误写成 `false`
- 修复后在干净工作区重新验证，最新第 3 轮 turn 已确认：
  - `roundIndex: 3`
  - `latestUserReply` 为语境化搜索请求
  - `searchRequested: true`
  - `searchConnected: false`
  - `Researcher` 路由为 `support`
- 关键 runtime 证据：
  - `runtime/crucible/golden-crucible-sandbox/turn_log.json`

### ⚠️ 当前补充说明

- OpenCode + `agent-browser` 的正式 `GC-003` 直控链路在本轮仍出现超时/挂起，说明测试执行器本身还有稳定性问题
- 但应用侧核心行为已通过：
  - 代码级回归测试
  - 干净工作区下的真实三轮浏览器验证

## 1.1 2026-03-20（黄金坩埚“用户请求网络搜索”专项测试通过）

### ✅ 本轮已完成

- 新增专项 request：
  - `testing/golden-crucible/requests/TREQ-2026-03-20-GC-002-crucible-search-request.md`
- 通过正式入口完成真实验证：
  - `npm run test:opencode:gc -- --request testing/golden-crucible/requests/TREQ-2026-03-20-GC-002-crucible-search-request.md`
- 新增专项 report / claim / status：
  - `testing/golden-crucible/reports/TREQ-2026-03-20-GC-002-crucible-search-request.report.md`
  - `testing/golden-crucible/claims/TREQ-2026-03-20-GC-002-crucible-search-request.claim.md`
  - `testing/golden-crucible/status/latest.json`

### 🎯 本轮验证结论

- 当用户明确输入“我想先联网搜索一下这个议题的最新研究现状，再继续讨论。”时，黄金坩埚前端可以正常收消息、返回第一轮回复，并把黑板切到 `Phase 0 / 议题锁定`
- runtime 证据链已确认：
  - `runtime/crucible/golden-crucible-sandbox/turn_log.json`
  - 最新 turn 中 `searchRequested: true`
  - 最新 turn 中 `searchConnected: false`
  - `Researcher` 路由模式为 `support`
- 这说明当前版本已经**识别并记录**“用户要求网络搜索”的诉求，但**尚未真实接通外部搜索**

### 📸 本轮证据

- `testing/golden-crucible/artifacts/TREQ-002-01-before-input.png`
- `testing/golden-crucible/artifacts/TREQ-002-02-message-entered.png`
- `testing/golden-crucible/artifacts/TREQ-002-03-response-received.png`
- `testing/golden-crucible/artifacts/TREQ-002-04-final-state.png`

## 1.0 2026-03-20（黄金坩埚 OpenCode 测试闭环已打通）

### ✅ 本轮已完成

- 新增黄金坩埚测试协议入口：
  - `testing/README.md`
  - `testing/OPENCODE_INIT.md`
  - `testing/golden-crucible/README.md`
- 新增 request / claim / report / status 骨架：
  - `testing/golden-crucible/requests/REQUEST_TEMPLATE.md`
  - `testing/golden-crucible/reports/REPORT_TEMPLATE.md`
  - `testing/golden-crucible/claims/CLAIM_TEMPLATE.md`
  - `testing/golden-crucible/status/latest.json`
  - `testing/golden-crucible/status/BOARD.md`
- 新增直控执行脚本：
  - `testing/scripts/run-opencode-request.mjs`
- 新增统一入口命令：
  - `npm run test:opencode:gc -- --request <request-file>`

### 🎯 当前统一口径

- 黄金坩埚测试链路正式采用：`Codex -> opencode run -> agent-browser -> report/status`
- 当前测试场景强制模型：`zhipuai-coding-plan/glm-5`
- 命令层必须显式传 `--model zhipuai-coding-plan/glm-5`
- wrapper 以“合格 report + 证据链”为准，不再被 OpenCode 自身不稳定退出码误伤

### ✅ 本轮验证

- 本地开发环境拉起成功：前端 `5176`、后端 `3004`
- 真实 smoke request 跑通：
  - request: `testing/golden-crucible/requests/TREQ-2026-03-20-GC-001-opencode-workflow-smoke.md`
  - report: `testing/golden-crucible/reports/TREQ-2026-03-20-GC-001-opencode-workflow-smoke.report.md`
  - status: `testing/golden-crucible/status/latest.json` 当前为 `passed`
- 真实证据已生成：
  - `testing/golden-crucible/artifacts/screenshot-1773968400366.png`
  - `testing/golden-crucible/artifacts/screenshot-1773968411206.png`

---

## 0.9 2026-03-20（黄金坩埚测试能力整体方案）

### ✅ 本轮新增文档

- 新增测试能力整体实施方案：`docs/plans/2026-03-20_GoldenCrucible_Testing_Capability_Implementation_Plan.md`

### 🎯 当前判断

- 黄金坩埚测试链路的目标形态明确为：`Codex -> opencode run -> agent-browser`
- 当前测试场景下，OpenCode 执行模型统一强制为：`zhipuai-coding-plan/glm-5`
- 第一优先级不是直接做复杂 worker，而是先把协议文档、direct-run MVP、证据闭环和通过判据搭稳

### ⏳ 下一步重点

- 补齐仓库内 `testing/` 协议入口与模块文档
- 新增 `run-opencode-request` 直控脚本与 `package.json` 入口
- 再决定何时补 queue-worker 与状态板脚本

---

## 0.8 2026-03-19（黄金坩埚阶段口径对齐 + MIN-38 收口）

### ✅ 本轮已完成

- 明确本地第一阶段口径：以黄金坩埚当前本地完成态为准，`Socrates -> Bridge -> UI` 主链、黑板协议、Soul registry 与最小 orchestrator 底盘视为已收口
- 明确 Linear 对应关系：`MIN-38` 只代表本地 `Crucible Phase 1-dev`，可以按本地开发父任务完成来关闭
- 明确产品口径：黄金坩埚真正的产品第一阶段仍包含 SaaS demo 上线，用于朋友、合作方与投资人演示
- 明确下一阶段定义：圆桌多人讨论归入第二阶段，对应 Linear Project `Crucible-0 Phase 2`
- 本地文档同步更新：
  - 新增阶段口径 SSOT：`docs/plans/2026-03-19_GoldenCrucible_Phase_Definition_Alignment.md`
  - 更新 `docs/02_design/crucible/_master.md`
  - 更新本进度文档

### 🎯 当前统一口径

- **本地 Phase 1-dev**：已完成，对应 `MIN-38`
- **产品 Phase 1**：仍包含 SaaS demo 上线，当前进入重点讨论区
- **Phase 2**：圆桌多人讨论，对应 `Crucible-0 Phase 2`

### ⏳ 下一步重点

- 讨论 SaaS demo 的最小上线形态、平台选型与部署约束
- 判断 SaaS 第一版是否保留登录、会话持久化、Skill 打包与审计链最小集
- 基于清晰阶段口径，再拆 `Crucible-0 Phase 2` 的 roundtable MVP

### 📌 后续补充（2026-03-19 晚）

- 已新增 SaaS 实施方案：`docs/plans/2026-03-19_GoldenCrucible_SaaS_Implementation_Plan.md`
- 已在 Linear 新建 launch 父任务：`MIN-94` `Crucible Phase 1-launch`
- 已拆分本周末联合上线的 5 张执行卡：`MIN-95` ~ `MIN-99`
- 当前推荐部署路径：Homepage 上 Vercel Hobby，Crucible App 上 Railway；若优先考虑国内支付与控制台体验，且需要兼顾美国/加拿大/香港/台湾访问，则更稳的国内路径是「腾讯云 EdgeOne Pages + 中国香港 Lighthouse/CVM」；CloudBase 云托管因当前官方文档写明支持地域为上海、默认加速偏中国大陆，更适合作为大陆优先备选；若本周强行全上 Vercel，需要额外处理 Vercel Functions 不支持 WebSocket server 的限制

---

## 0.7 2026-03-19（配置校正）

### ✅ 本轮已完成

- worktree 本地环境端口口径校正：按 `~/.vibedir/global_ports_registry.yml` 将 `.env` 中误留的 `PORT=3002` 改为 `3004`，与 `.env.local` 一致
- README 启动说明同步改为 `5176/3004`，避免把营销大师端口误认成黄金坩埚当前端口
- rules.md 新增规则：worktree 的 `.env` / `.env.local` 端口口径必须一致，不能残留其他模块端口号

---

## 0.6 2026-03-18（晚）GoldenCrucible 10项修复 + Socrates完整加载

### ✅ 本轮已完成

#### 根本修复：Socrates Skill 截断问题（commits: f1e0ccb, aa93b1b）
- `skill-loader.ts` maxChars 4000→24000，Socrates 17K SKILL.md 完整注入 LLM
- 之前 LLM 只能看到 22% 内容，15轮规则/强制搜索/Devil's Advocate 全部丢失
- 业务逻辑不在后端硬编码，由 Socrates 自己依据完整 SKILL 判断

#### UI 修复（9项）
- 输入白屏 Bug：补上遗漏的 `Upload` icon import
- crucible 模式允许连续发送，不再被 `isStreaming` 阻断
- Header 精简：删除"聊"圆圈+标题，badges（你/老张/老卢）移至顶行与DSL同行
- 删除底部草稿保存/恢复按钮（冗余）
- D/S/L 操作加 toast 气泡反馈（已下载/已保存/已载入）
- 垃圾桶替换为统一"重置"按钮，同时清空 workspace + chat
- 输入区 items-end→items-center，你/附件/发送三者居中对齐
- `activePresentable` Bug修复：合并查 crystallizedQuotes，结晶内容点击生效
- "结晶金句"→"结晶内容"

### ⏳ 待完成（下一窗口）
- 结晶内容展现形式待设计（用户尚未决策）
- crystallization 阶段非 quote 类内容的写入逻辑待调整
- 观察 Socrates 完整加载后 15 轮规则执行情况
- 进入 SaaS demo 形态与低负载部署方案讨论

---

## 0.5 2026-03-18 黄金坩埚 UI 优化 + Linear MCP 接入

### ✅ 本轮已完成

#### 1. 对话面板 S/L/D 按钮重构（commit: `1c89848`）
- **旧**：JSON 导出/导入按钮（需文件选择对话框）
- **新**：
  - **S（Save）**：快照直接写入 `localStorage`，无需文件对话框
  - **L（Load）**：从 `localStorage` 直接恢复快照，无需文件对话框
  - **D（Download）**：仅下载 Markdown 对话记录
- 文件：`src/components/ChatPanel.tsx`

#### 2. 分割线拖拽范围放宽（commit: `1c89848`）
- 黑板面板与对话面板之间的拖动分隔线可以向更左侧延伸
- 文件：`src/App.tsx`

#### 3. Linear MCP 接入
- 安装命令：`claude mcp add --transport http linear-server https://mcp.linear.app/mcp`
- OAuth 2.1 认证已完成（用户授权）
- 当前状态：两个 endpoint 均注册
  - `linear`: `https://mcp.linear.app/sse` (HTTP)
  - `linear-server`: `https://mcp.linear.app/mcp` (HTTP)
- 下一步：通过 Linear MCP 工具同步黄金坩埚进展到 MIN-38 父 Issue 及子 Issues

#### 4. 浏览器工具优先级规则写入 AGENTS.md
- 明确三级优先级：`agent-browser`（最高）→ MCP 工具 → `Claude in Chrome`（最低）
- `mcp__Claude_in_Chrome__*` 本质是控制用户真实屏幕上的 Chrome，默认禁止使用
- 文件：`AGENTS.md` §浏览器工具优先级规则

### ⏳ 待完成（下一窗口）
- 继续讨论产品第一阶段中的 SaaS demo 范围与部署路线
- 基于已明确的阶段口径，整理 `Crucible-0 Phase 2` 的 roundtable MVP 执行计划
- Commit & push 本轮所有未提交改动（新 Skills、skill-sync、llm_config 等）

---

---

## 0.3 2026-03-15 黄金坩埚启动链抢修

### ✅ 本轮已完成
- 修复 `server/index.ts` 启动阻塞：移除不存在的 `./music` 导入与僵尸路由 `/api/music/assets`
- 在 `server/shorts.ts` 补齐 `uploadBgm` 与 `getMusicAssets`，避免 Shorts 路由把 `undefined` handler 挂到 Express 导致服务启动即崩
- 重新拉起开发环境后，确认前端 `5176` 与后端 `3004` 均恢复监听

### 🔍 根因判断
- 本次“打不开”不是前端渲染问题，而是后端入口存在两处失效链路：一处引用了不存在的模块，一处注册了未导出的 handler
- Vite 前端可以单独成功启动，所以浏览器端体感会误判成“页面打不开/页面坏了”，实际是 API 与 Socket 后端先崩

### ✅ 本轮验证
- `npm run dev` 重新启动后，Vite 正常暴露 `http://localhost:5176/`
- `lsof -nP -iTCP:3004 -sTCP:LISTEN` 确认后端监听恢复
- `lsof -nP -iTCP:5176 -sTCP:LISTEN` 确认前端监听恢复

---

## 0.2 2026-03-15 黄金坩埚主题变量补齐

### ✅ 本轮已完成
- 修复黄金坩埚工作台与右侧对话面板的主题色异常，补齐 `--shell-bg`、`--surface-*`、`--ink-*`、`--line-*`、`--accent` 这组实际已被引用但未定义的 CSS token
- 将主题 token 收敛到 `src/index.css`，避免黄金坩埚页面落回浏览器继承色，导致浅底区域文字过白、整体对比失真

### 🔍 根因判断
- 黄金坩埚 UI 已经改为变量驱动配色，但仓库中只有 `var(--xxx)` 的使用点，没有对应定义点
- 变量缺失后，浅色卡片和暖纸聊天区会继承全局浅字色，形成“色彩不对、内容发灰发白”的体感故障

### ✅ 本轮验证
- `npm run test:run -- src/components/crucible/hostRouting.test.ts` 通过（3 tests）
- `rg -o "var\\(--[A-Za-z0-9-]+\\)" src | sort -u` 核对后，黄金坩埚当前实际引用的主题变量已全部补齐定义

---

## 0.0 2026-03-15 黄金坩埚接入 Socrates v0.2.0 一期方案

### ✅ 本轮新增文档
- 新增一期实施方案：`docs/plans/2026-03-15_SD210_Crucible_Socrates_v0.2_Adoption_Phase1_Plan.md`

### 🎯 当前判断
- 一期先接只读式 `EXPERIENCE.md` 上下文，让黄金坩埚先吃到“更准追问”的质量红利
- 前端只做最小可感知提示与日志可观测，不提前做经验库后台
- 自动写回、月度 Review、用户级 Experience 账户与更重的前端产品化统一放入二期

## 0.1 2026-03-15 黄金坩埚生成式黑板支线实验方案

### ✅ 本轮新增文档
- 新增支线实验实施方案：`docs/plans/2026-03-15_SD210_Crucible_Generative_Blackboard_Experiment_Plan.md`

### 🎯 当前判断
- 先以独立 worktree + 实验分支验证“结构化可视化黑板”价值，不直接侵入黄金坩埚主线
- 第一阶段坚持奥卡姆剃刀：固定 widget schema + React/SVG 渲染，不上任意 HTML / iframe / 流式脚本执行
- 若实验明确提升理解效率，再进入单独 integration 分支做最小桥接

---

## 0. 2026-03-14 迁移收口更新

### ✅ 本轮已完成
- 统一前端 API / Socket / 下载 / 视频预览入口到 runtime config，清除 `src/` 内功能路径上的旧 `3002` 主机硬编码
- 修复 `PublishComposer` 对 `/data/projects/...` Docker 路径的写死假设
- 新增 `scripts/runtime-env.js`，让 `dev:check` 与 `preview` 读取 `.env.local` / `.env`
- 修复端口检查脚本在沙盒内把 `EPERM` 误报为“端口占用”的问题
- 恢复依赖层，补齐 `node_modules` 与 `package-lock.json`

### ✅ 本轮验证
- `npm run dev:check` 通过；当前环境会显示 `restricted [EPERM]`，已明确为环境限制而非端口冲突
- `npm run test:run -- src/components/crucible/hostRouting.test.ts` 通过（3 tests）
- `rg` 扫描确认 `src/`、`scripts/`、`.claude/`、`server/` 中不再残留功能路径级别的 `localhost:3002` / `127.0.0.1:3002` / `/data/projects/` 硬编码

### ⚠️ 仍待专项处理
- `npm run build` 仍被 unrelated 存量类型债阻塞，主要在营销大师 `TubeBuddyScore` 口径与旧 `DeliveryState.modules` 兼容层；本轮不跨模块混修

---

## 1. 版本迭代历史

| 版本   | 日期       | 里程碑                                                                                               |
| ------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| v1.0   | 2026-02-10 | 初版：单项目（CSET-SP3 硬编码）五大模块 Dashboard                                                    |
| v2.0   | 2026-02-11 | Shorts Publisher 模块：状态机 + OAuth + YouTube Upload                                               |
| v2.1   | 2026-02-12 | Link Video（手动关联视频）+ Marketing 数据导入 + File Browser                                        |
| v2.2   | 2026-02-13 | **多项目热切换** + Docker 化开发环境                                                                 |
| v3.0   | 2026-02-14 | **专家导航系统** + 文稿选择 + 半自动 Antigravity 集成                                                |
| v3.1   | 2026-02-28 | **Remotion 新模板赋能** - 强制 template 字段 + 4 个新模板可用                                        |
| v3.2   | 2026-02-28 | **导演大师 Phase 2/3 重构** - 预审流程 + 渲染二审 + XML 生成                                         |
| v3.3   | 2026-03-01 | **Phase2/3 细节优化** - 进度显示、评论提交、列表头、章节名、预览图质量                               |
| v3.4   | 2026-03-01 | **Worktree 环境修复** - launch.json 注入正确 PROJECTS_BASE/SKILLS_BASE；抢救提交昨日 1799 行丢失进度 |
| v3.5   | 2026-03-03 | **火山引擎视频生成集成** - 文生视频 API + 文生图预览 + OldYang Skill 更新                            |
| v3.6   | 2026-03-03 | **火山引擎文生图预览修复** - 修复尺寸限制（2560x1440, 16:9）+ 响应数据路径解析                       |
| v3.8.0 | 2026-03-03 | 进程健壮性、状态持久化、UI 优化、布局升级                                                            |
| v3.9.0 | 2026-03-04 | **火山引擎配置修复** - 修复 API Key 格式（添加连字符）+ 使用模型名称而非 endpoint ID                 |
| v4.0.0 | 2026-03-06 | **SD-207 V3 营销大师全量重构** - 5 Sprint 完成；TubeBuddy Playwright、SSE 生成、Phase 2 审阅、双格式导出 |

---

## 2. v2.2 已完成功能

### ✅ 多项目架构
- [x] 后端 `PROJECTS_BASE` 环境变量化（支持 Docker / 本地双模式）
- [x] `GET /api/projects` — 列出所有可用项目
- [x] `POST /api/projects/switch` — 运行时热切换（更新内存 + 重绑 watcher + 推送数据）
- [x] 前端 `Header.tsx` 项目选择器下拉框
- [x] Socket.IO `active-project` 事件通知
- [x] chokidar watcher 可重绑（切换项目时关闭旧 watcher，绑定新项目的 delivery_store.json）

### ✅ Docker 化开发环境
- [x] `Dockerfile.dev` — 统一开发容器（前后端合一，tini 信号处理）
- [x] `docker-compose.yml` — 单容器 + 精确卷挂载
  - 源码 `/app` (rw + HMR)
  - 项目数据 `/data/projects` (rw)
  - OAuth secrets `/app/secrets` (ro)
- [x] `Makefile` — Docker 快捷命令（init / dev / stop / rebuild / shell / clean）
- [x] `.env` + `.env.example` — 增加 `PROJECTS_BASE` 配置

### ✅ 之前版本已完成
- [x] 五大交付模块 UI（Director / Music / Thumbnail / Marketing / Shorts）
- [x] Socket.IO 实时数据同步
- [x] Shorts 完整状态机（draft → published）
- [x] Link Video: 本地文件浏览器选择 .mp4
- [x] Schedule: 日期/时间设定 + Marketing 数据一键导入
- [x] YouTube OAuth 流程（零持久化 Token）
- [x] YouTube Upload API 对接
- [x] 端口动态化（.env PORT 配置，OAuth redirect 跟随）

---

## 2.5 v3.0 已完成功能

### ✅ 专家导航系统
- [x] `src/config/experts.ts` — 专家配置（5 位专家）
- [x] `src/components/ExpertNav.tsx` — 顶部专家导航栏
- [x] `src/components/ExpertPage.tsx` — 专家页面容器
- [x] `src/components/experts/IdleState.tsx` — 未开始状态
- [x] `src/components/experts/PendingState.tsx` — 等待执行状态
- [x] `src/components/experts/CompletedState.tsx` — 已完成状态
- [x] `src/components/experts/FailedState.tsx` — 失败状态

### ✅ 文稿选择
- [x] `GET /api/scripts` — 扫描 02_Script/*.md
- [x] `POST /api/scripts/select` — 记录选中文稿
- [x] Header 文稿下拉选择器

### ✅ 半自动集成（方案 A）
- [x] `POST /api/experts/start` — 创建任务文件
- [x] 任务文件格式 `.tasks/expert_xxx.json`
- [x] 专家输出目录监听（chokidar）
- [x] 检测到新文件自动更新为已完成

### ✅ 后端变更
- [x] `delivery_store.json` 新增 `experts` 字段
- [x] 新增 `activeExpertId` 字段
- [x] Expert watchers 可重绑（切换项目时）

---

## 2.6 v3.1 已完成功能

### ✅ Remotion 新模板赋能（SD202）
- [x] **Phase 1**: 增强 Schema 验证 - 强制 LLM 输出 `template` 字段
- [x] **Phase 2**: 优化 Prompt - 新模板（TextReveal、NumberCounter、ComparisonSplit、TimelineFlow）置于优先位置
- [x] **Phase 3**: 在 userMessage 中添加模板 JSON 输出示例
- [x] **Phase 4**: 修复 CinematicZoom 占位图 URL（localhost → Unsplash）
- [x] **Phase 5**: 添加智能模板推荐函数（基于内容关键词）

### ✅ 验证流程更新
- [x] 更新计划文档验证路径为通用方式（PROJECT_NAME 变量）
- [x] 服务重启验证

---

## 3. 验证状态

### 2026-02-13 本次验证结果

| 验证项          | 状态 | 详情                                                                 |
| --------------- | ---- | -------------------------------------------------------------------- |
| Docker 容器启动 | ✅    | `delivery-console-dev` 稳定运行                                      |
| 前端加载 (5173) | ✅    | 完整 Dashboard 渲染，深色主题正常                                    |
| 后端 API (3002) | ✅    | `/api/projects` 返回 6 个项目                                        |
| Socket.IO 连接  | ✅    | 底部状态栏 "Online"                                                  |
| 项目列表显示    | ✅    | 6 个项目均正确列出，ACTIVE 标记正常                                  |
| 项目热切换      | ✅    | CSET-SP3 → CSET-Seedance2 成功，数据正确更新                         |
| 数据加载正确性  | ✅    | CSET-SP3 (12%, Visual Concept 有内容) vs CSET-Seedance2 (0%, 空模板) |
| VirtioFS 卷挂载 | ✅    | 容器内正确读取宿主机 Projects/ 目录                                  |

### 未验证项

| 验证项            | 原因                           | 影响                 |
| ----------------- | ------------------------------ | -------------------- |
| OAuth 认证流程    | 需要用户手动操作 Google 授权页 | Upload 功能依赖此项  |
| YouTube Upload    | 依赖 OAuth                     | 核心发布功能待测     |
| Remotion 渲染触发 | 容器内未安装 Remotion 运行时   | 渲染路径暂不可用     |
| HMR 热更新        | 未做代码修改测试               | 理论上 VirtioFS 支持 |

---

## 4. 已知问题 & 遗留事项

### 🔴 Critical

| ID      | 问题                                   | 影响                                        | 建议                                                               | 状态                  |
| ------- | -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ | --------------------- |
| C-1     | Agent 无法调用 Docker socket           | macOS sandbox 拦截 `unix:///...docker.sock` | Agent 通过 HTTP 访问容器端口替代；Docker 操作由用户在 GUI/终端执行 | Open                  |
| ~~C-2~~ | ~~Phase2 火山引擎文生图预览失败~~      | ~~100% 失败，无法生成预览图~~               | ~~根本原因：VOLCENGINE_ACCESS_KEY 格式错误（缺少连字符）~~         | **✅ 已修复 (v3.9.0)** |
| ~~C-3~~ | ~~Phase2 视频方案策划 LLM 调用不稳定~~ | ~~生成方案时偶发失败~~                      | ~~需检查：超时机制、重试逻辑、错误处理~~                           | **⚠️ 待观察**          |

### 🟡 Medium

| ID  | 问题                                                     | 影响                                    | 建议                                        |
| --- | -------------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| M-1 | `server/index.ts` L41 有重复的 `app.use(cors())`         | 无功能影响，代码质量                    | 删除 L41 的重复调用                         |
| M-2 | `useDeliveryStore.ts` Socket URL 硬编码 `127.0.0.1:3002` | Docker 内无影响（端口映射），但不够灵活 | 改为 `window.location.hostname` + 环境变量  |
| M-3 | `Header.tsx` 的 fetch URL 也硬编码 `localhost:3002`      | 同 M-2                                  | 统一为相对路径或环境变量                    |
| M-4 | Remotion 渲染流程在 Docker 中不可用                      | 容器内未安装 Chromium / Remotion 依赖   | 渲染任务仍需在宿主机执行，或扩展 Dockerfile |

### 🟢 Low / Backlog

| ID   | 问题                                             | 说明                                                           |
| ---- | ------------------------------------------------ | -------------------------------------------------------------- |
| L-1  | `delivery_store.json` → Markdown 骨架迁移        | 核心理念：让 Obsidian 也能原生编辑                             |
| L-2  | 多项目间共享 YouTube Auth Token                  | 目前切换项目后 token 仍有效（内存级），但逻辑上应隔离          |
| L-3  | Docker 生产部署优化                              | 当前 Dockerfile.dev 仅适合开发，生产版需多阶段构建             |
| L-4  | 旧 Dockerfile.backend / Dockerfile.frontend 清理 | 已被 Dockerfile.dev 取代，可删除                               |
| L-5  | A-Roll 扫描逻辑（已注释）                        | v2.0 切换到 Script-First 后禁用，待决定是否复用                |
| L-6  | 后台服务常驻方案                                 | LaunchAgent 开机自启 + Web 状态栏显示，搁置待定                |
| L-7  | Antigravity ↔ Web 通信桥梁                       | 文件触发方案（.tasks/*.json），需新建任务监听器                |
| L-8  | ~~火山引擎文生视频集成~~                         | ✅ v3.5 已完成：`renderVolcVideo` 函数已实现完整的 API 调用     |
| L-9  | 前端文件上传实现                                 | Phase3View 中的文件选择对话框需要完整实现                      |
| L-10 | 可视化时间线编辑器                               | Phase 3 可以考虑添加时间线编辑器，让用户手动调整 B-roll 时间码 |
| L-11 | 批量操作优化                                     | 可以考虑添加批量 Pass/Skip、批量重新渲染等操作                 |

---

## 7. 架构级待设计事项 (v3.0+)

### 7.1 文稿驱动的专家调用架构

**问题**: 当前设计以 delivery_store.json 为中心，用户无法从文稿出发触发专家服务。

**目标流程**:
```
用户选择项目目录 → 系统读取 02_Script/*.md 文稿
    → 用户点选"导演大师/音乐大师/缩略图大师"
    → 触发 Antigravity Skill 生成方案
    → 方案存入项目目录
    → Web 展示方案供用户确认/修改
```

**核心组件**:
| 组件         | 职责                        | 状态   |
| ------------ | --------------------------- | ------ |
| 项目创建向导 | 选择目录 → 以目录名为项目名 | 待开发 |
| 文稿识别     | 读取 02_Script/*.md         | 待开发 |
| 任务触发器   | Web 写 .tasks/*.json        | 待开发 |
| 任务监听器   | Antigravity 监听 → 调 skill | 待开发 |
| 方案展示     | Web 读取并展示专家输出      | 待开发 |

**设计文档**: 待编写

---

## 5. 文件变更日志（v2.2）

| 文件                        | 变更类型 | 说明                                      |
| --------------------------- | -------- | ----------------------------------------- |
| `Dockerfile.dev`            | **新建** | 统一开发容器                              |
| `docker-compose.yml`        | **重写** | 单容器 + 精确挂载                         |
| `Makefile`                  | **重写** | 新 Docker 命令集                          |
| `.env`                      | **修改** | 增加 `PROJECTS_BASE`                      |
| `.env.example`              | **修改** | 同上                                      |
| `server/index.ts`           | **修改** | `PROJECTS_BASE` 环境变量化 + 项目管理 API |
| `server/youtube-auth.ts`    | **修改** | `PROJECTS_BASE` 环境变量化                |
| `src/components/Header.tsx` | **重写** | 项目切换下拉框                            |

---

## 8. 文件变更日志（v3.0）

| 文件                                        | 变更类型 | 说明                          |
| ------------------------------------------- | -------- | ----------------------------- |
| `src/config/experts.ts`                     | **新建** | 专家配置（5 位专家）          |
| `src/components/ExpertNav.tsx`              | **新建** | 顶部专家导航栏                |
| `src/components/ExpertPage.tsx`             | **新建** | 专家页面容器                  |
| `src/components/experts/IdleState.tsx`      | **新建** | 未开始状态 UI                 |
| `src/components/experts/PendingState.tsx`   | **新建** | 等待执行状态 UI               |
| `src/components/experts/CompletedState.tsx` | **新建** | 已完成状态 UI                 |
| `src/components/experts/FailedState.tsx`    | **新建** | 失败状态 UI                   |
| `src/types.ts`                              | **修改** | 新增 ExpertStatus, ExpertWork |
| `src/App.tsx`                               | **重写** | 集成专家导航系统              |
| `server/index.ts`                           | **修改** | Experts API + 输出目录监听    |

---

## 8. 文件变更日志（v3.1）

| 文件                                     | 变更类型 | 说明                                               |
| ---------------------------------------- | -------- | -------------------------------------------------- |
| `server/llm.ts`                          | **修改** | 强制 template 字段验证、添加示例、智能模板推荐函数 |
| `server/skill-loader.ts`                 | **修改** | 优化 Prompt，新模板优先级提升，添加适用场景关键词  |
| `server/director.ts`                     | **修改** | CinematicZoom 占位图从 localhost URL 改为 Unsplash |
| `.claude/plans/hidden-dancing-melody.md` | **修改** | 验证路径改为通用 PROJECT_NAME 变量                 |

---

## 9. v3.2 已完成功能

### ✅ 导演大师 Phase 2/3 重构（SD-202）
- [x] **类型扩展** - 新增 `BRollReviewStatus`, `BRollRenderStatus`, `RenderJob_V2`, `ExternalAsset` 等类型
- [x] **SRT 解析器** - `server/srt-parser.ts`，支持时间码转换、片段提取
- [x] **外部素材加载 API** - `server/assets.ts`，支持文件上传、文件复制、Finder 集成
- [x] **XML 生成 API** - `server/xml-generator.ts`，Final Cut Pro XML 标准格式
- [x] **Phase 2 预审 API** - 新增 3 个端点（review, select, ready）
- [x] **Phase 3 渲染 API** - 新增 7 个端点（start-render, render-status, rerender, approve, load-asset, assets, generate-xml）
- [x] **Phase2View 重构** - 预审流程，支持 5 类 B-roll 审阅
- [x] **Phase3View 重构** - 渲染及二审流程，支持外部素材加载、XML 生成
- [x] **Remotion 渲染集成** - `renderRemotionVideo` 函数，串行渲染
- [x] **文件上传支持** - `handleUploadedFile` 函数，支持视频文件上传

### ✅ 核心流程
- **Phase 2 预审**：
  - B-roll 类型选择（5 类：remotion, seedance, artlist, internet-clip, user-capture）
  - 章节级预审，支持 Pass/Skip 操作
  - Remotion/Seedance：预览图生成
  - Artlist/互联网/用户素材：文案编辑器

- **Phase 3 渲染及二审**：
  - 渲染时即二审状态，视频出来一个审一个
  - Remotion 和文生视频串行渲染
  - 支持重新渲染（删除旧文件）
  - 外部素材加载（支持文件上传和本地路径）
  - Final Cut Pro XML 生成

---

## 11. 文件变更日志（v3.3）

| 文件                                               | 变更类型 | 说明                                                        |
| -------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `docs/02_design/remotion_spatial_layout_engine.md` | **新建** | Remotion空间排版引擎完整设计文档                            |
| `server/director.ts`                               | **修改** | 初始进度不发送数字，等方案生成后更新                        |
| `server/llm.ts`                                    | **修改** | Prompt强化：每章最少3个方案，添加 ⚠️ 警告                    |
| `server/remotion-api-renderer.ts`                  | **修改** | 预览图优化：frame=50, scale=1.5, quality=90，增强错误日志   |
| `src/components/director/ChapterCard.tsx`          | **修改** | 列表头"缩略图预览"→"预览图"，章节名去重，添加Ctrl+Enter提交 |

### ✅ v3.3 已完成功能

#### Phase2/3 细节优化
- [x] **初始进度优化** - 不显示无意义的"0/0"，等方案生成后再显示真实数量
- [x] **评论提交优化** - 添加 Ctrl+Enter 快捷键，placeholder提示用户
- [x] **列表头优化** - "缩略图预览"改为"预览图"
- [x] **章节名优化** - 去掉"第X章"前缀，避免重复显示
- [x] **预览图质量优化** - frame=50, scale=1.5, jpeg-quality=90
- [x] **错误日志增强** - 详细的命令、props、stdout、stderr输出

#### 文档补全
- [x] **Remotion空间排版引擎设计文档** - 完整记录架构、矛盾分析、升级方案、下一步价值

---

## 13. 文件变更日志（v3.5 - v3.6）

| 文件                          | 变更类型 | 说明                                                            |
| ----------------------------- | -------- | --------------------------------------------------------------- |
| `server/volcengine.ts`        | **修改** | 修复文生图尺寸限制（1024x1024→2048x2048），修复响应数据路径解析 |
| `server/director.ts`          | **修改** | 文生视频 API 集成，预览图生成端点调用火山引擎                   |
| `docs/04_progress/lessons.md` | **修改** | 新增 L-002：火山引擎文生图预览生成失败的教训                    |

### ✅ v3.5-v3.6 已完成功能

#### 火山引擎视频生成集成
- [x] **文生视频 API** - `generateVideoWithVolc`、`pollVolcVideoResult`、`downloadVideo`
- [x] **文生图预览** - `generateImageWithVolc`、`pollVolcImageResult`
- [x] **Director Phase 2/3 集成** - 文生视频渲染流程、预览图生成端点
- [x] **OldYang Skill 更新** - 更新 Skill 知识库

#### v3.6 火山引擎文生图预览修复
- [x] **修复尺寸限制** - 默认尺寸从 1024x1024 改为 2560x1440（16:9，满足 ≥ 3686400 像素要求）
- [x] **修复响应解析** - 适配火山引擎实际返回结构 `{ data: [ { url: "..." } ] }`
- [x] **兼容性写法** - 支持多种数据路径，提高鲁棒性
- [x] **分辨率比例修正** - 从 1:1 正方形（2048x2048）改为 16:9 横向（2560x1440），符合影视导演需求
- [x] **验证成功** - 测试生成成功，状态正确显示 `completed`

---

## 14. 文件变更日志（v3.8）

| 文件                                                          | 变更类型 | 说明                                                                                        |
| ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `skills/RemotionStudio/src/BrollTemplates/ConceptChain.tsx`   | **修改** | 溢出防爆修复：nodes 硬上限截断、标签折行、描述截断、Zod 约束                                |
| `skills/RemotionStudio/src/BrollTemplates/SegmentCounter.tsx` | **新建** | 赛博朋克/LCD 质感数字翻页器（前后缀、光晕特效）                                             |
| `skills/RemotionStudio/src/BrollTemplates/TerminalTyping.tsx` | **新建** | MacOS 风格黑客终端框，真实代码逐字敲打效果                                                  |
| `skills/RemotionStudio/src/shared/theme.ts`                   | **新建** | 多主题皮肤系统（5 大渐变主题：deep-space/warm-gold/sci-fi-purple/forest-green/crimson-red） |
| `skills/RemotionStudio/src/index.tsx`                         | **修改** | 新组件渲染端挂载                                                                            |
| `skills/RemotionStudio/src/schemas/index.ts`                  | **修改** | 新增 segmentCounterSchema 和 terminalTypingSchema                                           |
| `server/skill-loader.ts`                                      | **修改** | Director Prompt 注入新组件契约指南和 Theme 控制器                                           |
| `server/director.ts`                                          | **修改** | SegmentCounter 和 TerminalTyping 加入 supportedCoreTemplates 白名单                         |
| `docs/dev_logs/2026-03-03_SD202_Remotion_Extension_v3.7.md`   | **新建** | Remotion 扩展 v3.7 完整开发日志                                                             |

### ✅ v3.7 已完成功能

#### Remotion 组件扩展 v3.7
- [x] **ConceptChain 溢出防爆修复** (Module 0)：
  - 强制设置 `nodes.slice(0, 5)` 硬上限截断
  - 标签启用折行 (`whiteSpace: normal`) 并增加 `maxWidth` 约束
  - 超过 18 字的 `desc` 强制执行截断补省略号
  - Zod Schema 添加 `.min(2).max(5)` 强校验
- [x] **多主题皮肤系统基建** (Module 1A)：
  - 新建 `src/shared/theme.ts`，支持 5 大精选渐变主题
  - 10 个核心 B-roll 组件全面引入 `theme` 参数
  - 自动适配 `currentTheme.bg`、`currentTheme.text`、`currentTheme.accent` 等属性
- [x] **SegmentCounter 新组件** (Module 2A)：
  - 赛博朋克 / LCD 质感的数字翻页器
  - 支持前后缀 (`prefix`, `suffix`)
  - 带有 `textShadow` 的光晕特效
- [x] **TerminalTyping 新组件** (Module 2B)：
  - MacOS 风格的黑客终端框
  - 实现真实的代码逐字敲打效果
  - 可调节参数与光标闪烁逻辑
- [x] **Director 后端全链路集成** (Module D)：
  - 组件暴露：在 `src/index.tsx` 和 `BrollTemplates/index.ts` 完成渲染端挂载
  - Zod Schema：新增 `segmentCounterSchema` 与 `terminalTypingSchema`
  - Director Prompt：在 `server/skill-loader.ts` 中详细注入新组件的契约指南和 Theme 控制器
  - 白名单联通：成功将 `SegmentCounter` 与 `TerminalTyping` 追加至 `supportedCoreTemplates` 白名单

---

## 12. 文件变更日志（v3.2）

| 文件                                     | 变更类型 | 说明                                    |
| ---------------------------------------- | -------- | --------------------------------------- |
| `src/types.ts`                           | **修改** | 新增 Phase 2/3 重构类型定义             |
| `server/srt-parser.ts`                   | **新建** | SRT 字幕解析器                          |
| `server/assets.ts`                       | **新建** | 外部素材加载 API                        |
| `server/xml-generator.ts`                | **新建** | Final Cut Pro XML 生成器                |
| `server/director.ts`                     | **修改** | 新增 Phase 2/3 API 端点，集成渲染逻辑   |
| `server/index.ts`                        | **修改** | 注册新增的 API 端点，配置文件上传中间件 |
| `src/components/director/Phase2View.tsx` | **重写** | 重构为预审流程                          |
| `src/components/director/Phase3View.tsx` | **重写** | 重构为渲染及二审流程                    |
| `src/components/DirectorSection.tsx`     | **修改** | 适配新的 Phase 2/3 组件接口             |

### ✅ 依赖包安装
- [x] `subtitle` - SRT 字幕解析库
- [x] `@types/subtitle` - TypeScript 类型定义
- [x] `uuid` - 唯一 ID 生成
- [x] `@types/uuid` - TypeScript 类型定义

---

## 12. 下一步建议优先级

### v3.3 待办事项（2026-03-01）

1. **验证 Remotion 预览图** - 确认空间排版引擎已生效，预览图不再单调
2. **修复 Remotion 预览图生成失败** - 根据增强的错误日志诊断问题
3. **改造剩余4个Remotion模板** - NumberCounter, TimelineFlow, DataChartQuadrant, CinematicZoom 应用 fitText
4. **增强导演大师 Prompt** - 添加动画时长、视觉增强参数说明
5. **质量压测** - 用极端文案长度测试所有模板

---

## 13. 文件变更日志（v3.2）

1. **验证 Phase 2 预审流程** — 测试完整的 B-roll 类型选择 → 方案生成 → 预览图生成 → 审阅流程
2. **验证 Phase 3 渲染流程** — 测试 Remotion 和文生视频渲染 → 渲染进度查询 → 二审落盘
3. **验证 XML 生成** — 测试 SRT 字幕读取 → B-roll 时间线编排 → Final Cut Pro XML 生成
4. **验证文件上传功能** — 测试前端文件选择对话框 → 后端文件接收 → 项目目录复制
5. **集成火山引擎文生视频** - 完成 `renderVolcVideo` 函数的 API 集成
6. **统一 API 地址配置** — 解决 M-2/M-3，使用 Vite 环境变量或相对路径
7. **清理旧 Docker 文件** — 删除 `Dockerfile.backend` + `Dockerfile.frontend`

---

## 11. 文件变更日志（v3.3）

| 文件                                               | 变更类型 | 说明                                                        |
| -------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `docs/02_design/remotion_spatial_layout_engine.md` | **新建** | Remotion空间排版引擎完整设计文档                            |
| `server/director.ts`                               | **修改** | 初始进度不发送数字，等方案生成后更新                        |
| `server/llm.ts`                                    | **修改** | Prompt强化：每章最少3个方案，添加 ⚠️ 警告                    |
| `server/remotion-api-renderer.ts`                  | **修改** | 预览图优化（frame=50, scale=1.5, quality=90），增强错误日志 |
| `src/components/DirectorSection.tsx`               | **修改** | loadingProgress 初始值从 '0/0' 改为 ''                      |
| `src/components/director/ChapterCard.tsx`          | **修改** | 列表头"缩略图预览"→"预览图"，章节名去重，添加Ctrl+Enter提交 |

---

### ✅ v3.3 已完成功能

#### Phase2/3 细节优化
- [x] **初始进度优化** - 不显示无意义的"0/0"，等方案生成后再显示真实数量
- [x] **评论提交优化** - 添加 Ctrl+Enter 快捷键，placeholder提示用户
- [x] **列表头优化** - "缩略图预览"改为"预览图"
- [x] **章节名优化** - 去掉"第X章"前缀，避免重复显示
- [x] **预览图质量优化** - frame=50, scale=1.5, jpeg-quality=90
- [x] **错误日志增强** - 详细的命令、props、stdout、stderr输出

#### 文档补全
- [x] **Remotion空间排版引擎设计文档** - 完整记录架构、矛盾分析、升级方案、下一步价值

#### 待办
- 验证 Remotion 预览图生成
- 修复 Remotion 预览图生成失败
- 改造剩余4个Remotion模板
- 增强导演大师 Prompt

---

## 12. 文件变更日志（v3.3）

---

### ✅ v3.4 已完成功能（2026-03-01）

#### Worktree 环境修复
- [x] **launch.json 路径修复** - 在 worktree 环境下通过 `env` 字段注入正确的 `PROJECTS_BASE` 和 `SKILLS_BASE`，解决 Projects 路径指向 worktree 内部错误位置的问题
- [x] **Sync Failed 修复** - Skills Synced (6) 正常，项目列表正常加载
- [x] **昨日进度抢救提交** - 1799行未提交修改（21个文件）全部 commit 保存，包含 Phase2/3 重构、管线引擎、新设计文档

#### 开发者体验
- [x] **Claude Code 用量监控** - 为 Pro 订阅用户配置 statusline，终端底部实时显示 `Context: XX% used`

#### 待办（v3.5 下一步）
- [ ] 验证 Remotion 预览图生成（四个新模板：TextReveal、NumberCounter、ComparisonSplit、TimelineFlow）
- [ ] 修复 Remotion 预览图生成失败问题
- [ ] 预览图内容升级：从文字卡片升级为真实 Composition 渲染帧
- [x] ~~火山引擎 AI 图像接入（seedance/generative 类型）~~ ✅ v3.5 已完成
- [ ] 改造剩余4个Remotion模板应用 fitText

## 13. 文件变更日志（v3.4）

| 文件                      | 变更类型 | 说明                                                                |
| ------------------------- | -------- | ------------------------------------------------------------------- |
| `.claude/launch.json`     | **修改** | 注入 `PROJECTS_BASE`/`SKILLS_BASE` env 变量，修复 worktree 路径问题 |
| `~/.claude/settings.json` | **修改** | 配置 statusline 显示 Context 用量百分比                             |

---

## 14. 文件变更日志（v3.5）

| 文件                                         | 变更类型 | 说明                                                                          |
| -------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `server/volcengine.ts`                       | **修改** | 新增视频生成 API（generateVideoWithVolc, pollVolcVideoResult, downloadVideo） |
| `server/director.ts`                         | **修改** | renderVolcVideo 实现真正的火山引擎视频生成调用                                |
| `~/.config/opencode/skills/OldYang/SKILL.md` | **修改** | 新增 §7 项目协议遵循，引用 CLAUDE.md 工作流约定                               |

### ✅ v3.5 已完成功能（2026-03-03）

#### 火山引擎视频生成集成
- [x] **generateVideoWithVolc** - 提交视频生成任务到火山引擎 API
- [x] **pollVolcVideoResult** - 轮询视频生成任务状态
- [x] **downloadVideo** - 下载生成的视频到本地
- [x] **renderVolcVideo** - 完整的视频生成流程（提交→轮询→下载）
- [x] **预览图策略** - seedance 类型使用文生图作为预览（非视频抽帧）

#### API 端点
- 视频生成: `POST /api/v3/contents/generations/tasks`
- 状态查询: `GET /api/v3/contents/generations/tasks/{taskId}`

#### 待办（v3.6 下一步）
- [ ] 验证 Remotion 预览图生成（四个新模板）
- [ ] 修复 Remotion 预览图生成失败问题
- [ ] 预览图内容升级：从文字卡片升级为真实 Composition 渲染帧
- [ ] 改造剩余4个Remotion模板应用 fitText
- [x] ~~修复 node_modules 平台不匹配问题~~ ✅ 已完成（`rm -rf node_modules && npm install`）

#### OldYang Skill 更新
- [x] 新增 §7 项目协议遵循 - 检测并遵循项目根目录 `CLAUDE.md`
- [x] 强调 Lessons 机制的重要性
- [x] 优先级：CLAUDE.md 项目约定 > OldYang 通用规则

---

## 15. 文件变更日志（v3.7.1）

| 文件                              | 变更类型 | 说明                                                                             |
| --------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `server/index.ts`                 | **修改** | 新增 `getAppVersion()` 函数，自动从 git log 提取版本号；新增 `/api/version` 接口 |
| `src/components/StatusFooter.tsx` | **修改** | 版本号改为动态获取，启动时调用 `/api/version`                                    |
| `src/config/version.ts`           | **删除** | 不再需要手动配置版本号                                                           |

### ✅ v3.8.0 已完成功能（2026-03-03）

#### 进程健壮性升级
- [x] **优雅关闭模块** - 实现 GracefulShutdown 类，处理信号和清理资源
- [x] **健康检查端点** - GET /health 返回状态、运行时间、内存信息
- [x] **端口检查工具** - 启动前验证 3002/5173 端口占用
- [x] **预览启动脚本** - 支持优雅关闭的前后端启动脚本
- [x] **PM2 配置** - 生产环境进程管理配置
- [x] **package.json 脚本** - dev:clean, dev:check, dev:force, preview, pm2:*

#### 状态持久化
- [x] **types.ts** - 添加 activeModule 字段到 DeliveryState
- [x] **ShortsSection** - phase 变更同步到全局 store
- [x] **MarketingSection** - phase 变更同步到全局 store
- [x] **App.tsx** - activeExpertId 和 activeModule 持久化
- [x] **server/index.ts** - 初始状态包含 activeModule

#### UI 优化
- [x] **Phase 2 进度显示** - 已实现，显示 `正在为你的剧本生成视觉方案... ⏱ 已用时 MM:SS`
- [x] **写作大师前移** - CrucibleHome 组件已存在，集成到 App.tsx

#### 布局升级
- [x] **RightPanel 组件** - Tab 切换、360px 宽度、动画过渡
- [x] **ChatPanel 重构** - 移除固定定位，可被 RightPanel 包裹
- [x] **App.tsx 集成** - 右侧面板状态管理
- [x] **Socket.IO Room 隔离** - socket-to-project 映射，io.to() 广播

---

## 17. 文件变更日志（v3.8 - Batch 1）

| 文件                          | 变更类型 | 说明                                                                   |
| ----------------------------- | -------- | ---------------------------------------------------------------------- |
| `server/graceful-shutdown.ts` | **新建** | 优雅关闭管理器类，支持 SIGTERM/SIGINT 处理、Socket.IO 关闭、子进程清理 |
| `server/health.ts`            | **新建** | 健康检查端点（/health, /health/ready, /health/live）                   |
| `scripts/check-port.js`       | **新建** | 端口占用检查工具，支持 3002 和 5173 端口                               |
| `scripts/preview.js`          | **新建** | 预览启动脚本（后端+前端+优雅关闭）                                     |
| `ecosystem.config.cjs`        | **新建** | PM2 进程管理配置（生产环境）                                           |
| `logs/.gitkeep`               | **新建** | 日志目录占位文件                                                       |
| `server/index.ts`             | **修改** | 集成 GracefulShutdown 和 setupHealthCheck                              |
| `package.json`                | **修改** | 更新 scripts（dev:clean, dev:check, dev:force, preview, pm2:*）        |

### ✅ v3.8 Batch 1 已完成功能（2026-03-03）

#### 进程健壮性升级
- [x] **优雅关闭模块** - 实现 GracefulShutdown 类，处理信号和清理资源
- [x] **健康检查端点** - GET /health 返回状态、运行时间、内存信息
- [x] **端口检查工具** - 启动前验证 3002/5173 端口占用
- [x] **预览启动脚本** - 支持优雅关闭的前后端启动脚本
- [x] **PM2 配置** - 生产环境进程管理配置
- [x] **package.json 脚本** - dev:clean, dev:check, dev:force, preview, pm2:*

#### 验证结果
- ✅ TypeScript 编译成功
- ✅ 端口检查脚本正常工作
- ✅ 健康检查端点返回正确数据

---

## 17. 文件变更日志（v3.8 - Batch 1）

| 文件                          | 变更类型 | 说明                                                                   |
| ----------------------------- | -------- | ---------------------------------------------------------------------- |
| `server/graceful-shutdown.ts` | **新建** | 优雅关闭管理器类，支持 SIGTERM/SIGINT 处理、Socket.IO 关闭、子进程清理 |
| `server/health.ts`            | **新建** | 健康检查端点（/health, /health/ready, /health/live）                   |
| `scripts/check-port.js`       | **新建** | 端口占用检查工具（3002, 5173）                                         |
| `scripts/preview.js`          | **新建** | 预览启动脚本（后端+前端+优雅关闭）                                     |
| `ecosystem.config.cjs`        | **新建** | PM2 进程管理配置（生产环境）                                           |
| `logs/.gitkeep`               | **新建** | 日志目录占位文件                                                       |
| `server/index.ts`             | **修改** | 集成 GracefulShutdown 和 setupHealthCheck                              |
| `package.json`                | **修改** | 新增 scripts（dev:clean, dev:check, dev:force, preview, pm2:*）        |

### ✅ v3.8 Batch 1 已完成功能（2026-03-03）

#### 进程健壮性升级
- [x] **优雅关闭模块** - 实现 GracefulShutdown 类，处理信号和清理资源
- [x] **健康检查端点** - GET /health 返回状态、运行时间、内存信息
- [x] **端口检查工具** - 启动前验证 3002/5173 端口占用
- [x] **预览启动脚本** - 支持优雅关闭的前后端启动脚本
- [x] **PM2 配置** - 生产环境进程管理配置
- [x] **package.json 脚本** - dev:clean, dev:check, dev:force, preview, pm2:*

#### 验证结果
- ✅ TypeScript 编译成功
- ✅ 健康检查端点正常返回数据
- ✅ 端口检查脚本正常工作

---

## 18. 最新状态（2026-03-03）

### 当前版本
- **主分支版本**: v3.7.1 (待更新为 v3.8)

## 19. 文件变更日志（v3.8 - Batch 2）

| 文件                                  | 变更类型 | 说明                                                        |
| ------------------------------------- | -------- | ----------------------------------------------------------- |
| `src/types.ts`                        | **修改** | DeliveryState 添加 activeModule 字段                        |
| `src/components/ShortsSection.tsx`    | **修改** | phase 变更通过 handlePhaseChange 同步到全局 store           |
| `src/components/MarketingSection.tsx` | **修改** | phase 变更通过 handlePhaseChange 同步到全局 store           |
| `src/App.tsx`                         | **修改** | 添加 activeModule 同步逻辑，handleModuleChange 更新全局状态 |
| `server/index.ts`                     | **修改** | ensureDeliveryFile 初始状态添加 activeModule: 'delivery'    |

### ✅ v3.8 Batch 2 已完成功能（2026-03-03）

#### 状态持久化
- [x] **types.ts** - 添加 activeModule 字段到 DeliveryState
- [x] **ShortsSection** - phase 变更同步到全局 store
- [x] **MarketingSection** - phase 变更同步到全局 store
- [x] **App.tsx** - activeExpertId 和 activeModule 持久化
- [x] **server/index.ts** - 初始状态包含 activeModule

#### 验证结果
- ✅ TypeScript 编译成功
- **最新提交**:
  - `44596a6` - feat(v3.8): 进程健壮性升级、状态持久化、UI 优化、布局升级
  - `db270f6` - refactor: 版本号改为从git log自动获取，无需手动配置 (保持不变)

### 已验证功能
- ✅ Phase 2 B-roll 方案生成（错误处理已修复）
- ✅ 版本号自动显示（无需手动配置）
- ✅ SSE 错误消息正确传递到前端

## 20. 文件变更日志（v3.8 - Batch 3）

| 文件                              | 变更类型   | 说明                                             |
| --------------------------------- | ---------- | ------------------------------------------------ |
| `src/components/CrucibleHome.tsx` | **已存在** | 黄金坩埚首页组件，包含写作大师和苏格拉底对话入口 |
| `src/App.tsx`                     | **修改**   | 导入 CrucibleHome，替换黄金坩埚占位 UI           |

### ✅ v3.8 Batch 3 已完成功能（2026-03-03）

#### UI 优化
- [x] **Phase 2 进度显示** - 已实现，显示 `正在为你的剧本生成视觉方案... ⏱ 已用时 MM:SS`
- [x] **写作大师前移** - CrucibleHome 组件已存在，集成到 App.tsx

#### 验证结果
- ✅ TypeScript 编译成功

---

## 21. 文件变更日志（v3.8 - Batch 4）

| 文件                                  | 变更类型 | 说明                                                            |
| ------------------------------------- | -------- | --------------------------------------------------------------- |
| `src/components/RightPanel.tsx`       | **新建** | 右侧面板组件，Tab 切换、收起/展开动画                           |
| `src/components/ChatPanel.tsx`        | **修改** | 移除固定定位外层，可被 RightPanel 包裹                          |
| `src/components/ChatToggleButton.tsx` | **保留** | 作为独立触发按钮使用                                            |
| `src/App.tsx`                         | **修改** | 导入 RightPanel，集成右侧面板逻辑                               |
| `server/index.ts`                     | **修改** | 添加 socket-to-project 映射，io.emit 改为 io.to(projectId).emit |

### ✅ v3.8 Batch 4 已完成功能（2026-03-03）

#### 右侧可收起面板
- [x] **RightPanel 组件** - Tab 切换、360px 宽度、动画过渡
- [x] **ChatPanel 重构** - 移除固定定位，可被 RightPanel 包裹
- [x] **App.tsx 集成** - rightPanelMode 状态管理

#### 多项目 Room 隔离
- [x] **Socket.IO Room 映射** - socket-to-projectMap 跟踪
- [x] **select-project Room 管理** - join/leave Room
- [x] **disconnect 事件处理** - 清理映射
- [x] **io.emit 改为 Room 广播** - 所有事件发送到特定项目 Room

#### 验证结果
- ✅ TypeScript 编译成功

---

## 22. 完整实施总结（v3.8）

| Batch   | Feature                 | 状态     |
| ------- | ----------------------- | -------- |
| Batch 1 | Feature 0: 进程健壮性   | ✅ 已完成 |
| Batch 2 | Feature 4: 状态持久化   | ✅ 已完成 |
| Batch 3 | Feature 2 + 5: UI 优化  | ✅ 已完成 |
| Batch 4 | Feature 1 + 3: 布局升级 | ✅ 已完成 |

### 下一步建议
1. **完整测试** - 验证所有功能的端到端行为
2. **版本更新** - 将版本号更新为 v3.8
3. **文档完善** - 补充缺失的设计文档

# Delivery Console 开发进度

> **最后更新**：2026-03-03

---

## 2026-03-03 - 白屏 + Phase 2 卡死问题

### 问题 1：App.tsx 白屏 - JS 语法错误
**症状**：页面纯白屏
**原因**：App.tsx 第 227 行使用了 `MessageCircle` 图标但未导入
```tsx
import { Loader2, Users, Send, Clock } from 'lucide-react'; // ← 缺少 MessageCircle
```
**修复内容**：添加 `MessageCircle` 到导入列表
```tsx
import { Loader2, Users, Send, Clock, MessageCircle } from 'lucide-react';
```
**受影响文件**：`src/App.tsx`（或当前正在使用的 App 文件）

**验证**：刷新浏览器，页面正常显示

---

### 问题 2：App.final.tsx 类型导入错误
**症状**：编译时提示 \`RightPanelMode\` 类型未导出
```tsx
import { RightPanel, RightPanelMode } from './components/RightPanel';
// 错误：RightPanelMode 是 type，需要用 import type
```
**修复内容**：使用 \`import type { RightPanelMode } from './components/RightPanel'\`;
**受影响文件**：`src/App.final.tsx`

**验证**：刷新浏览器，无编译错误

---

### 问题 3：项目切换时业务逻辑不完整，导致卡死在旧状态
**症状**：切换项目后，前端卡死无法操作，提示 "LLM 生成失败"
**根本原因**：后端 \`select-project\` 事件处理不完整
1. 设置了 \`projectId\` 和 \`lastUpdated\`
2. 发送了 socket 事件 \`delivery-data\`
3. **关键缺陷**：没有清除旧项目的临时状态文件（\`phase2_review_state.json\`）
4. 导致系统认为 Phase 2 还在进行中，前端卡在旧状态

**修复内容**：在 \`server/index.ts\` 的 \`select-project\` 事件处理中添加清除旧项目临时状态的逻辑：
```typescript
// 清除旧项目的临时状态文件（防止卡在旧状态）
const oldProjectId = socketToProjectMap.get(socket);
if (oldProjectId && oldProjectId !== projectId) {
    const oldProjectRoot = getProjectRoot(oldProjectId);
    try {
        // 清除 Director Phase 2 审阅状态
        const phase2ReviewPath = path.join(oldProjectRoot, '04_Visuals', 'phase2_review_state.json');
        if (fs.existsSync(phase2ReviewPath)) {
            fs.unlinkSync(phase2ReviewPath);
            console.log(\`[select-project] Cleared old phase2_review_state.json for \${oldProjectId}\`);
        }
    } catch (e) {
        console.error('Failed to clear old project state:', e);
    }
}
```
**受影响文件**：`server/index.ts`

**验证**：
1. 切换项目到新项目，检查是否成功清除旧项目状态
2. 切换回旧项目，确认 Phase 2 能重新开始

---

### 问题 4：Phase 2 LLM 生成持续失败 (fetch failed)
**症状**：Phase 2 启动后，提示 "LLM 生成失败"，重试2次后使用兜底方案，13 分钟后无响应
**根本原因**：SiliconFlow API 调用失败
1. API 返回 \`fetch failed\` 错误（通用错误信息）
2. 错误处理不完善，缺少详细错误信息
3. 缺少超时设置，请求可能卡住

**修复内容**：
1. **添加 30 秒超时设置**：在 \`server/llm.ts\` 的 \`callSiliconFlowLLM\` 函数中添加 AbortController 和超时逻辑
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => {
    controller.abort();
    console.error(\`[llm.ts] SiliconFlow API timeout after 30s\`);
}, 30000); // 30 秒超时

try {
    const response = await fetch(\`\${baseUrl}/chat/completions\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'Pro/moonshotai/Kimi-K2.5',
        messages,
        temperature: 0.7,
        signal: controller.signal,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(\`[llm.ts] SiliconFlow API error (\${response.status}):\`, error);
      throw new Error(\`SiliconFlow API error: \${error}\`);
    }
    
    const data = await response.json();
    clearTimeout(timeoutId);
    console.log(\`[llm.ts] SiliconFlow API response:\`, data.usage);
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(\`[llm.ts] SiliconFlow API failed:\`, error.message);
    throw new Error(\`SiliconFlow API failed: \${error.message}\`);
  }
```
2. **增强错误日志**：记录 HTTP status 和详细错误信息
3. **添加调试日志**：记录 baseUrl 和 model

**受影响文件**：`server/llm.ts`

**验证**：
1. 运行 Phase 2 生成，观察日志输出
2. 检查是否在 30 秒内返回结果

---

### 问题 5：SiliconFlow 模型名称配置错误
**症状**：配置文件中模型名称为 \`Pro/moonshotai/Kimi-K2.5\`，但实际 API 调用失败
**根本原因**：配置的默认值与 API 不一致

**修复内容**：
1. 验证配置文件 \`llm_config.json\` 中的模型名称
2. 查询 SiliconFlow API 支持的模型列表（\`https://api.siliconflow.cn/v1/models\`）
3. 使用官方文档推荐的默认模型

**验证结果**：
```bash
curl -s "https://api.siliconflow.cn/v1/models" \
  -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
  2>&1 | grep -E '"Pro/moonshotai/Kimi-K2.5"'
```
- 正确的模型 ID：\`Pro/moonshotai/Kimi-K2.5\`
```

**受影响文件**：
- \`.agent/config/llm_config.json\` - SiliconFlow 全局配置
- \`server/llm.ts\` - API 调用函数

---

### 问题 6：编辑工具多次失败，代码更新未生效
**症状**：直接编辑 \`server/llm.ts\` 文件时，Edit 工具因缩进或特殊字符导致匹配失败，代码未更新

**根本原因**：文件内容与预期不匹配，Edit 工具无法准确定修改位置

**修复内容**：
1. 使用 Bash 命本进行精确替换，避免特殊字符问题
2. 验证文件修改是否成功

**经验教训**：
- **编辑关键代码时使用脚本**：避免手动编辑可能引入的缩进或特殊字符问题
- **验证文件修改**：修改后使用 \`grep\` 确认内容已正确更新
- **备份重要文件**：编辑前先备份

---

## 待优化问题

### 1. 项目切换逻辑的原子性
**问题**：项目切换涉及多个文件更新（socket 房间、delivery_store.json、临时状态、监听器等），如果某个步骤失败可能导致状态不一致

**建议**：
- 考虑使用事务或队列确保项目切换的原子性
- 统一状态管理接口

### 2. LLM API 调用错误处理增强
**问题**：通用的 "fetch failed" 错误信息太泛，难以排查具体原因

**建议**：
- 区分不同类型的错误（网络超时、API 错误、解析错误）
- 添加更详细的错误分类和错误码

### 3. 前端白屏调试困难
**问题**：JS 语法错误可能导致整个应用无法启动

**建议**：
- 添加更严格的编译前检查
- 使用 TypeScript ESLint 等工具进行静态分析

### 4. 状态持久化机制验证
**问题**：依赖临时文件的状态可能导致状态残留

**建议**：
- 切换项目时强制清除所有临时状态
- 定期清理过期的临时文件

---

## 总结

本次修复涵盖了以下关键领域：

1. **前端语法错误修复** - 导入语句补全
2. **业务逻辑完善** - 项目切换时的状态清理机制
3. **LLM API 调用增强** - 超时保护、详细日志
4. **编辑工具使用** - 脚本修复方法

所有修复已经应用到代码中，服务器已重启。

**验证步骤**：
1. 刷新浏览器，确认前端正常显示
2. 切换到不同项目，验证状态正确重置
3. 运行 Director Phase 2 生成，验证 LLM API 调用是否正常工作

**文件变更记录**：
- 修改：\`src/App.final.tsx\` - 删除
- 修改：\`src/components/ChatPanel.tsx\` - 删除
- 修改：\`src/App.tsx\` - 添加
- 修改：\`server/llm.ts\` - 添加超时和详细日志
- 修改：\`server/index.ts\` - 添加清除旧项目状态逻辑
- 创建：\`docs/04_progress/lessons.md\` - 更新

---

## 2026-03-03 (后续修复)

### 问题 1: main.tsx 导入错误的 App.final.tsx
**症状**：重启后 Vite 报错 `Failed to resolve import "./App.final.tsx"`
**修复**：将 `main.tsx` 中的导入从 `./App.final.tsx` 改回 `./App.tsx`
**相关文件**：`src/main.tsx`

---

### 问题 2: Vite 缓存导致模块导入错误
**症状**：清除缓存后，`RightPanelMode` 仍然无法导入
**修复**：清除 Vite 缓存并重启开发服务器
```bash
rm -rf node_modules/.vite
npm run dev
```

---

### 问题 3: 类型导入错误 (最终修复)
**症状**：浏览器控制台报错 `does not provide an export named 'RightPanelMode'`
**根本原因**：`RightPanelMode` 是类型导出（`export type`），需要使用 `import type`
**修复**：
```typescript
// App.tsx
import { RightPanel } from './components/RightPanel';
import type { RightPanelMode } from './components/RightPanel';
```
**相关文件**：`src/App.tsx:19`

---

### 问题 4: SiliconFlow API 验证成功
**验证结果**：
```json
{
  "model": "Pro/moonshotai/Kimi-K2.5",
  "choices": [
    {
      "message": {
        "content": "Test received! 👋 I'm here and working."
      }
    }
  ]
}
```
- ✅ API Key 有效
- ✅ 模型正常响应
- ✅ 可以正常调用

---

### 待解决问题
1. **Phase 2 依旧显示 LLM 兜底方案** - 用户报告
2. **从 Phase 1 选择项目和文件，并不能从头开始项目进程** - 用户报告

---

**v3.9.0 修复记录（2026-03-04）**

### 问题1： Phase2 火山引擎文生图预览 100% 失败

**根本原因：**
1. API Key 格式错误：缺少连字符
   - 错误格式：`354e79c042194af48f784460ba54973`（31字符）
   - 正确格式：`354e79c0-4219-4af4-8f78-44460ba54973`（36字符，带连字符）
2. 使用了 endpoint ID 而非模型名称

**修复步骤：**
1. ✅ 修正 API Key 格式（添加连字符）
2. ✅ 更新模型配置：使用 `doubao-seedream-4-0-250828` 替代 endpoint ID
3. ✅ 验证 API 调用成功（返回图片 URL)

**验证命令：**
```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Authorization: Bearer 354e79c0-4219-4af4-8f78-44460ba54973" \
  -d '{"model":"doubao-seedream-4-0-250828","prompt":"测试图片","size":"2560x1440"}'
# 成功返回：{"data":[{"url":"https://..."}]}
```

**涉及文件：**
- `.env` - 修正 VOLCENGINE_ACCESS_KEY 格式
- `.env` - 更新 VOLCENGINE_ENDPOINT_ID_IMAGE 为模型名称
- `docs/04_progress/rules.md` - 添加规则 28-29
- `docs/04_progress/dev_progress.md` - 记录修复过程

**分支：** `fix/phase2-stability-issues`

---

### 问题2： Phase1 "转了转但界面没变"

**根本原因：**
- `server/llm.ts` 添加了 30 秒超时
- Phase1 生成概念提案需要 40-60 秒（读取 18KB 剧本 + 构建概念）
- 超时后 `type: 'done' 未发送，前端 `onUpdate` 未被调用

**历史对比：**
- main 分支/c9237d6 版本：无超时机制 → Phase1 正常工作
- 当前分支：添加 30 秒超时 → Phase1 失败

**修复方案：**
```bash
git checkout origin/main -- server/llm.ts  # 回退到无超时版本
```

**涉及文件：**
- `server/llm.ts` - 移除 30 秒超时限制

---

### 问题3： LLM_PROVIDER 被错误配置为 deepseek

**根本原因:**
- `.env` 文件中 `LLM_PROVIDER=deepseek`
- 用户一直使用的是 `siliconflow` 的 `Kimi-K2.5`

**修复方案：**
```bash
# .env
LLM_PROVIDER=siliconflow  # 修改前：deepseek
```

---

### 问题4： CSET-SP3 硬编码

**发现位置：**
- `src/components/PublishComposer.tsx:129` - `projectId: 'CSET-SP3'`
- `server/distribution.ts:293` - `const projectId = req.query.project as string || 'CSET-SP3'`

**修复方案：**
1. `PublishComposer.tsx` - 添加 `projectId` prop，移除硬编码
2. `distribution.ts` - 移除默认值，要求必须传递 `project` 参数

**涉及文件：**
- `src/components/PublishComposer.tsx`
- `server/distribution.ts`

---

### 新增功能： Phase1/Phase2 耗时统计

**实现位置：**
- `src/components/DirectorSection.tsx`
  - Phase1: 添加 `phase1StartTime` 计时
  - Phase1 done: 打印耗时日志
  - Phase2 done: 打印耗时日志

**日志格式：**
```
[Phase1] 🚀 开始生成概念提案...
[Phase1] ✅ 概念提案生成完成，耗时 45.3 秒
[Phase2] ✅ 视频方案生成完成，耗时 32.1 秒
```

**用途：** 开发阶段性能监控，后续可移除

---

### 🚨 未解决问题： Phase2 生成超过 10 分钟未完成

**现象：**
- Phase2 视频方案生成超过 10 分钟仍未完成
- LLM 配置已修正为 `siliconflow`
- 需要进一步调查

**可能原因：**
1. SiliconFlow API 响应慢
2. `generateGlobalBRollPlan` 函数处理逻辑问题
3. 网络连接问题

**下一步行动：**
- 检查 SiliconFlow API 响应时间
- 添加更详细的日志输出
- 考虑添加超时警告

---

## 待提交内容
- `.env` - 修正 LLM_PROVIDER 和火山引擎配置
- `server/llm.ts` - 回退到 main 分支版本（无超时）
- `src/components/DirectorSection.tsx` - 添加耗时统计
- `src/components/PublishComposer.tsx` - 移除 CSET-SP3 硬编码
- `server/distribution.ts` - 移除 CSET-SP3 硬编码
- `docs/04_progress/rules.md` - 新增规则 28-29
- `docs/04_progress/dev_progress.md` - 记录修复过程

---

**分支：** `fix/phase2-stability-issues`

**状态：** 🟡 Phase2 生成超时问题未解决，需要继续调查

---

## 2026-03-04 - Kimi k2.5 适配与缓存重置优化

### ✅ 已完成功能
1. **适配 Kimi k2.5 `max_tokens` 限制**
   - **现象**：全局模型切换至 `api.moonshot.cn/v1` 的 `kimi-k2.5` 后，Phase 1 生成稳定报错 (400 Bad Request)
   - **原因**：Kimi K2.5 对 `max_tokens` 入参不兼容过大值
   - **修复**：在 `server/llm.ts` `callKimiLLM` 中移除写死的 `max_tokens: 16384` 参数，顺利通行。

2. **全局重新选择脚本时物理清空缓存**
   - **需求**：只要项目和文件重新选择，所有后续 Phase 进度应该切断，从 Phase 1 重新来过
   - **实现**：在 `server/index.ts` `select-project` 及 `api/scripts/select` 中，除了清空 `delivery_store.json`，增加对其项目下 `04_Visuals` 内历史状态文件（`selection_state.json` / `phase2_review_state.json` / `phase3_render_state.json`）的物理删除 `fs.unlinkSync` 逻辑。

3. **Phase 1 概念提案本地落盘**
   - **需求**：Phase 1 Web 界面端生成的”视觉概念提案”必须以物理文件留存以做记录
   - **实现**：在 `server/director.ts` 的 `generatePhase1` 和 `reviseConcept` 方法中，自动将 Markdown 内容写入 `04_Visuals/phase1_视觉概念提案_${projectId}.md`

---

## v4.0.0 营销大师全量重构（SD-207 V3）— 2026-03-06

**5 Sprint 全部完成，commit: addb99a → f35df39 → b31934c**

### Sprint 1 — 基础设施
- `types.ts`：MarketModule_V3 全套类型（CandidateKeyword、KeywordVariant、DescriptionBlock、MarketingPlan 等）
- `MarketingSection.tsx`：重写为 2-Phase 编排器
- `App.tsx`：接入 MarketingMaster 专属路由
- Mock 数据 + 状态持久化验证

### Sprint 2 — Phase 1 前后端
- `MarketPhase1New.tsx`：三子步视图（候选词生成 → 评分 → 选择）
- `CandidateKeywordList.tsx`：含简繁体标识、增删、手动添加
- `KeywordScoreTable.tsx`：TubeBuddy 评分对比表 + 重试 + 时间显示 + 追加关键词
- `KeywordAnalysis.tsx`：LLM 策略点评卡片
- V3 API: `generate-candidates` / `score-candidates` / `score-single` / `analyze-keywords`（SSE + LLM）

### Sprint 3 — TubeBuddy Worker 升级
- `server/workers/tubebuddy-worker.ts`：完整 Playwright Web Dashboard 交互
- `CredentialManager`：30 分钟无活动自动清除 cookies/session
- `RateLimiter`：3s + 0-1.5s jitter，30次/session 上限
- `TB_SELECTORS`：配置化 CSS 选择器数组（易于适配 TubeBuddy DOM 变更）
- `TUBEBUDDY_DEV_MOCK=1` 开关 + `/api/market/dev/tubebuddy-test` 调试页面

### Sprint 4 — Phase 2 前后端
- `SRTUploader.tsx`：拖拽上传 .srt，SSE 解析章节时间轴
- `DescriptionEditor.tsx`：8 子区块独立可编辑（Markdown 警告 + Emoji 计数）
- `MarketPlanTable.tsx`：6 行审阅表格（inline 编辑 + 绿色对勾 + AI 重新生成）
- `MarketPhase2New.tsx`：完整 Phase 2 编排（dataRef 模式防 SSE 闭包泄漏）
- V3 API: `upload-srt` / `generate-plan` / `revise-row`

### Sprint 5 — 确认导出 + DefaultSettings + ConfirmBar
- `MarketConfirmBar.tsx`：底部确认栏，显示方案确认状态，一键绿色导出
- `POST /v3/confirm`：生成 `.md`（Obsidian 用，含 Markdown）+ `.plain.txt`（YouTube Studio 用，零 Markdown）保存至 `05_Marketing/`
- `GET/POST /v3/load-defaults` & `/save-defaults`：双写持久化（localStorage + JSON 文件）
- `MarketDefaultSettings.tsx`：完全受控表单，挂载时从 API 加载，保存时双写
- `MarketPhase2New.tsx`：接入 MarketConfirmBar，导出成功写入 savedOutputs

### 架构亮点
- **dataRef 模式**：SSE 流式更新中通过 `useRef(data)` 避免 stale closure
- **双格式输出**：.md（结构化存档）/ .plain.txt（分发终端直读）
- **session_expired 短路**：TubeBuddy 评分时遇 session 过期立即中止整批评分
- **slugify + stripMarkdown**：confirm 路由中对关键词生成安全文件名，对内容二次清洗

---

## 2026-03-26 - SaaS -> SSE 共享底座反向同步（第一轮）

### 背景
- 三线分工已明确：
  - `GC` 作为本地稳定基线
  - `SSE` 作为 GC-only 研发主线
  - `SaaS` 作为对外 staging / 发布线
- 因此本轮目标不是把 `SaaS` 整线 merge 回 `SSE`，而是只回灌后续多账号研发必须依赖的共享底座。

### 本轮已落地
1. 搜索修复对齐
   - `server/crucible-research.ts`
   - `src/__tests__/crucible-research.test.ts`
   - 结果：SSE 与 SaaS 在黄金坩埚搜索修复上重新对齐

2. Skill Sync 收口
   - `server/skill-sync.ts`
   - 结果：删除 GC 无关的前五个 skill，仅保留黄金坩埚当前需要的同步项

3. 统一项目根目录抽象
   - 新增：`server/project-root.ts`
   - 已切换模块：
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
     - `server/index.ts`（仅做最小导入桥接）

4. 前端运行时 / 存储底座对齐
   - `src/config/runtime.ts`
   - `src/components/crucible/storage.ts`
   - 结果：dev 模式下 API/Socket 可走同源口径；autosave 存储层已具备“本地 + 服务端接口”双通道能力，但尚未把 `App.tsx` / `CrucibleWorkspaceView.tsx` 整体改成 SaaS 版本

### 验证
- `npm run test:run -- src/__tests__/crucible-research.test.ts`
  - 结果：`5 passed`
- `npm run build`
  - 结果：未通过
  - 阻塞集中在 SSE 既有前端类型问题：
    - `src/components/market/*`
    - `src/components/StatusDashboard.tsx`
    - `src/components/ScheduleModal.tsx`
    - `src/components/ChatPanel.tsx`
  - 判断：不属于本轮共享底座回灌直接引入的问题

### 当前边界
- 这轮还没有把 SaaS 的 session/autosave/runtime 前端口径整包灌进 SSE
- 多账号研发还未开始
- 这批改动按“共享底座回灌包”单独提交，不与其他脏改动混提
