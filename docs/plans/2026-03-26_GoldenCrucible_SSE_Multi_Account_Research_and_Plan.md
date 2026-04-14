# 2026-03-26 GoldenCrucible SSE 多账号方案调研与实施计划

> 日期：2026-03-26
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 状态：调研结论 / 实施前方案
> 作者：Codex（按 OldYang + project-lifecycle-governance 协议落盘）

---

## 1. Current State

### 1.0 本轮修订原则

本轮按新增要求，把优先级重新排序为：

1. `安全`
2. `健壮`
3. `简单`
4. `自主可控`
5. `Railway Hobby 可快速上线`

这意味着后续方案要优先减少：

1. 运行时组件数量
2. 跨服务依赖
3. 第三方黑盒边界
4. 首刀功能膨胀

### 1.1 当前栈约束

从代码现场看，当前 SSE 具备以下明确约束：

1. 后端是 `Express 5 + TypeScript`
2. 前端是 `React 19 + Vite 7`
3. 当前是单仓、非 Next.js、非全栈框架一体化路由
4. 现有运行时有较强的本地文件系统语义与 `runtime/` 目录语义
5. 未来目标不是只给 SSE 本地演示，而是要把可复用能力按包推向 `GoldenCrucible-SaaS`

### 1.2 这次选型必须满足的条件

1. 能在现有 `Node.js + React + 单仓` 里渐进接入
2. Railway 部署友好，不强依赖复杂边车或重型基础设施
3. 支持最小可行账号体系，不一上来就走企业 IAM 大工程
4. 能支撑 workspace / organization 维度的隔离
5. 能把 auth / session / RBAC 的公共层抽成共享能力包，后续回推 SaaS

### 1.3 生命周期判断

本任务属于：

- `Planning`
- `Structuring`
- 部分 `Execution` 前置设计

所以本轮输出以“推荐方案 + 分阶段实施计划 + 可沉淀能力边界”为主，不直接进入大规模实现。

---

## 2. Candidate Comparison

## 2.1 候选一：Better Auth + Postgres

### 优点

1. 明确支持传统 cookie session，天然适合现有 Express 服务挂载
2. React 侧直接有 `better-auth/react` 客户端，适合 Vite 单页或混合路由接入
3. auth 核心可以交给成熟库，但 `workspace / invitation / RBAC` 仍可由我们自己建模
4. 可保留我们自己的数据库与业务模型，后续抽共享能力包更自然
5. 插件体系完整，可按阶段追加 `2FA / passkey / admin / multi-session`
6. Railway 侧只需要标准 Node 服务 + Postgres；Redis 仅在后续需要时再加

### 缺点

1. 相比 Clerk，产品成熟度与市场验证广度更弱一些
2. 文档覆盖面很广，但某些最佳实践还需要我们自己定“项目内口径”
3. 如果一开始连 organization plugin 和动态权限一起全开，复杂度会明显上升

### 结论

这是最适合我们当前 `SSE 研发线 -> SaaS 发布线` 的主候选，但首刀应收缩为：

**Better Auth 只负责 `auth/session/account`，workspace 与 RBAC 先由我们自己掌控。**

---

## 2.2 候选二：Clerk + Organizations

### 优点

1. 接入速度最快，React/Vite 与 Express 都有成熟文档
2. Organizations、Active Organization、邀请、切换器、RBAC 都是现成产品能力
3. 作为托管身份服务，安全与会话维护负担更低

### 缺点

1. 更强 vendor lock-in，后续“沉淀为我们自己的能力包”时可迁移性较差
2. 生产环境中的 Organizations Roles/Permissions 有付费门槛
3. 自定义 session claims 有 cookie 体积上限，复杂 workspace 权限不适合塞太多
4. System Permissions 不在 session claims 里，服务端检查口径需要额外注意

### 结论

如果目标是“最快上线 demo”，Clerk 是很强的第二选择；但如果目标是“在 SSE 做完后按能力包推向 SaaS 主线”，它不如 Better Auth 自主可控。

---

## 2.3 候选三：Auth.js + 自建 Workspace / RBAC

### 优点

1. 老牌开源生态，适配器多
2. 可完全自控数据模型

### 缺点

1. 当前 `@auth/express` 官方仍标注为 experimental
2. 组织 / workspace / 邀请 / RBAC 都要我们自己搭
3. 对现有仓库而言，接入复杂度不比 Better Auth 低，现成能力却更少

### 结论

不推荐作为当前 SSE 的主选型。它更像“自己造半个 Better Auth/Clerk”。

---

## 2.4 候选四：Supabase Auth + RLS

### 优点

1. 会话、JWT、数据库安全链路成熟
2. RLS 能提供非常强的“防御纵深”
3. 如果以后数据强依赖 Postgres，多租户边界可以做得很硬

### 缺点

1. 对当前 Express + 文件运行时仓库来说，迁移心智负担偏大
2. 多租户授权要落到 RLS policy、auth hook、自定义 claims，实施复杂度更高
3. 它更适合“以数据库为中心”的产品，不是当前 SSE 最快落地路线

### 结论

适合未来做更硬的数据隔离，但不适合当前最小可行方案第一刀。

---

## 2.5 候选五：WorkOS AuthKit

### 优点

1. B2B、Organizations、SSO、RBAC 很成熟
2. Node / React 都支持

### 缺点

1. 更偏企业化与 B2B 身份平台
2. 超出当前“成熟但低复杂度”的需求上限

### 结论

当前阶段过重，不建议进入首批 shortlist。

---

## 3. Recommended Structure

## 3.1 最推荐的一套

**修订后推荐：`Better Auth + Postgres + 自建 workspace kernel + 固定角色 RBAC + 单 web service 部署`**

不是一上来启用动态权限大系统，而是：

1. 用 Better Auth 解决登录、session、基础账号安全
2. `workspace / workspace_member / workspace_invitation / active_workspace` 由我们自己建模
3. 在我们自己的业务库里保留 `workspace / workspace_member / resource_owner` 等业务边界
4. 第一阶段只用固定角色：
   - `owner`
   - `admin`
   - `member`
   - `viewer`
5. 第二阶段再考虑 organization plugin、动态权限、2FA、passkey、审计增强

### 为什么再收一刀

这次不是追求“预制能力最多”，而是追求：

1. auth 不自己造轮子
2. workspace 边界完全可解释
3. 线上排障路径最短
4. 将来回推 SaaS 时可迁移、可拆包

### 为什么不是直接上 Clerk

综合判断，Clerk 更像“最快能跑”的产品方案；Better Auth 更像“最适合长期沉淀为共享底座”的工程方案。

当前你明确要求：

1. 先在 `GoldenCrucible-SSE` 研发
2. 最终以能力包推到 `GoldenCrucible-SaaS`

在这个前提下，**“账号体系核心要掌握在我们自己的代码和数据库模型里”** 比“今天少写一点接线代码”更重要。

---

## 3.2 最小可行账号体系

### 账号对象

1. `user`
2. `session`
3. `account`
4. `workspace`
5. `workspace_member`
6. `workspace_invitation`
7. `active_workspace`

### 最小角色

1. `owner`
   - 拥有 workspace 全量控制权
2. `admin`
   - 可管理成员、配置、内容
3. `member`
   - 可正常使用核心功能
4. `viewer`
   - 只读访问，适合演示或审阅

### 最小登录方式

建议分两步：

1. Phase 1：`Google OAuth` 或 `Email magic link` 二选一即可
2. Phase 2：补 `email/password` 或 `passkey`

如果目标是当前 Railway Hobby 最快上线，我更偏向：

- 外部演示优先：`Google OAuth`
- 只有当 SMTP 已稳定时，再考虑 `Magic Link`

不要首刀就同时铺三四种登录方式。

---

## 3.3 Session / Auth / RBAC 设计

### Session 设计

建议采用：

1. 服务端校验的 cookie session
2. session 数据持久化到 Postgres
3. 登录后写入：
   - `userId`
   - `sessionId`
   - `activeWorkspaceId`
   - `lastSeenAt`
4. 角色或 workspace 发生变更时，主动刷新或撤销相关 session

### Session 安全基线

1. `httpOnly`
2. `secure`（生产环境）
3. `sameSite=lax` 为默认
4. 所有写操作接口统一要求服务端二次鉴权，不只信前端状态
5. 对敏感操作保留“fresh session / re-auth”升级口子

### RBAC 口径

第一阶段不要上动态权限树，采用：

1. 页面显隐：前端基于 `activeWorkspace + role` 控制
2. 真正授权：后端中间件做最终校验
3. 数据过滤：所有读写查询必须显式带 `workspaceId`

推荐权限拆法：

1. `workspace.manage`
2. `member.manage`
3. `conversation.read`
4. `conversation.write`
5. `artifact.read`
6. `artifact.write`
7. `admin.runtime`

但**实现上先映射到固定角色**，不要第一刀就存权限矩阵。

---

## 3.4 多租户 / 多 workspace 隔离设计

### 推荐边界

当前推荐使用：

**单数据库 + 共享 schema + 强制 `workspace_id` 过滤**

而不是：

1. 每租户单数据库
2. 每租户单 Railway service
3. 一开始就走复杂 schema-per-tenant

### 为什么这样更适合现在

1. 复杂度最低
2. Railway 运维最简单
3. 最适合从 SSE 渐进接入
4. 后续如真出现大客户隔离诉求，再升级也不晚

### 最低限度隔离规则

1. 所有业务表必须有 `workspace_id`
2. 所有查询 helper 必须先拿 `activeWorkspaceId`
3. 服务端禁止出现“未带 workspace 条件的资源查询”
4. 文件 / 对话 / 产物路径命名必须改成 `workspace/<id>/...`
5. 任何从旧 `projectId / scriptPath` 演进来的资源主键，都不能继续当租户边界

### 对当前 SSE 特别重要的一点

你们现在很多状态仍带本地工程目录语义，所以首批隔离工作不是“做个登录页”，而是：

**把 runtime 资源主语从 `projectId / local path` 改成 `workspaceId / conversationId / artifactId`。**

---

## 3.5 Railway 部署建议

### 推荐拓扑

Phase 1 最稳妥的 Railway 拓扑：

1. 一个 `web` service
   - Express API
   - Better Auth routes
   - 直接托管 Vite build 产物，先走同域
2. 一个 `Postgres` service
3. Redis 暂不引入
4. 不引入独立 worker
5. 不做多副本

### 为什么建议“同域优先”

对当前账号体系第一刀，最简单的做法不是前后端分散多个域，而是：

**尽量让前端与 auth/api 同源，先避开跨域 cookie、子域 session 传递、预检和 header 中转复杂度。**

### Railway 侧的实际好处

1. 环境隔离天然支持 `dev / staging / prod`
2. 变量管理直接适配 auth secret、OAuth secret、SMTP secret
3. Node 长驻服务 + Postgres 是 Railway 标准路径

### 为什么这套最符合 Hobby 快速上线

1. 只有两个必要运行单元：`web + postgres`
2. 前后端同域，避开跨域 cookie 和 session 续签复杂度
3. 账号功能和业务 API 在同一个 Express 里，排障最短
4. 不依赖 Redis、队列、对象存储才能上线

---

## 4. Why It Fits Our Three-Line Split

> 这里我按当前仓库语境，把“三线分工”理解为：`SSE 研发线 / SaaS 发布线 / 后续 Roundtable 或其他产品能力线`。这是结合现有 `dev_progress.md` 做的推断。

### 4.1 对 SSE 研发线

1. Better Auth 可直接嵌入当前 Express，不要求重写技术栈
2. 可以先把 auth 与 workspace 基础设施做出来，再逐步改 Crucible 运行时资源归属
3. 研发过程里仍保留我们对 session、workspace、资源模型的完全掌控

### 4.2 对 SaaS 发布线

1. 未来可直接复用同一套 auth 模块、schema、middleware、workspace guard
2. 不会把 SaaS 主线绑死在第三方托管控制台配置上
3. 更适合按能力包回推，而不是整线 merge

### 4.3 对第三条能力线

1. 如果后续 Roundtable、Director 在线版、协作式产品都要接账号体系，它们可以共享同一个 account/workspace kernel
2. 第三条线只接“账号能力包”，不必继承 SSE 的本地目录遗留语义

---

## 5. SSE Phased Implementation Plan

## 5.1 Phase 0：定边界，不急着写业务

### 目标

先把“账号体系接入”与“资源归属重构”切开。

### 交付

1. 定义 auth kernel 目录结构
2. 画出最小 ERD
3. 确认首批只支持一个核心 surface：`Crucible`
4. 冻结角色与权限口径
5. 冻结“不做项”：
   - 不做 SSO
   - 不做动态权限树
   - 不做多副本
   - 不做媒体重任务上云

---

## 5.2 Phase 1：接入最小登录与 session

### 目标

让 SSE 拥有真正可用的用户会话，而不是匿名本地状态。

### 范围

1. 接 Better Auth
2. 建基础表：
   - `user`
   - `session`
   - `account`
   - `workspace`
   - `workspace_member`
   - `workspace_invitation`
3. 前端增加：
   - 登录态检测
   - 登入 / 登出
   - active workspace 初始化
4. 后端增加：
   - `requireAuth`
   - `requireWorkspace`

### 验收

1. 用户可登录
2. 登录后自动进入一个 personal workspace
3. 刷新页面不丢 session
4. 服务端所有受保护接口都必须经过 `requireAuth`

---

## 5.3 Phase 2：把 Crucible 主链改为 workspace-aware

### 目标

让对话、黑板、产物都真正归属于 workspace。

### 范围

1. `conversation`
2. `message`
3. `presentable / blackboard artifact`
4. autosave / snapshot / log namespace

### 关键动作

1. 所有相关接口显式传或解析 `activeWorkspaceId`
2. 资源查询统一走 workspace guard
3. 原来基于 `projectId / path` 的运行时命名，逐步迁到 `workspaceId / conversationId`

### 验收

1. 同一用户可切换 workspace
2. 不同 workspace 下的对话、黑板、产物互不串线

---

## 5.4 Phase 3：最小协作能力

### 目标

让多人协作真正可用。

### 范围

1. 邀请成员
2. 切换角色
3. viewer / member / admin 的页面与接口权限差异

### 验收

1. owner 能邀请成员
2. admin 能运营内容但不能接管 owner 权限
3. viewer 只能看不能改

---

## 5.5 Phase 4：安全与运维增强

### 目标

把“能用”升级为“能稳定上线”。

### 范围

1. 关键操作审计日志
2. session revoke
3. ban / disable user
4. 可选 2FA
5. 邮件模板与 invitation 生命周期收口

---

## 6. What Should Be Promoted to SaaS

未来应该按能力包推向 `GoldenCrucible-SaaS` 的内容：

1. `auth kernel`
   - Better Auth 配置
   - server auth handlers
   - client auth client
2. `workspace kernel`
   - workspace schema
   - membership / invitation schema
   - active workspace resolver
3. `RBAC middleware`
   - `requireAuth`
   - `requireWorkspace`
   - `requireRole`
   - permission mapping helpers
4. `resource isolation helpers`
   - `assertWorkspaceAccess`
   - `withWorkspaceScope`
   - workspace-aware storage path helpers
5. `shared UI primitives`
   - workspace switcher
   - member invite dialog
   - session state hooks

## 不应该直接推 SaaS 的内容

1. SSE 研发期的临时兼容逻辑
2. 与本地 `runtime/` 或工程目录强耦合的补丁
3. 针对当前坩埚试验流程的临时字段

---

## 7. Railway Hobby 承载判断

### 7.1 前提

当前工作区**还没有链接到具体 Railway project**，所以这里给的是：

1. 基于 Railway 官方当前配额的判断
2. 结合当前 SSE 代码形态得出的保守容量估计

不是某个已经在线运行实例的实时压测结果。

### 7.2 官方资源口径

截至本次调研，Railway 官方公开信息显示：

1. Hobby 订阅费为 `$5/月`，包含 `$5` usage credit
2. 资源按实际使用计费
3. 资源价格为：
   - `RAM: $10 / GB / 月`
   - `CPU: $20 / vCPU / 月`
   - `Volume: $0.15 / GB / 月`
   - `Network egress: $0.05 / GB`
4. Hobby 计划公开能力包括：
   - 每个 project 最多 `50` services
   - 每个 service 最多 `6` replicas
   - 最多 `5 GB` volume storage
   - `7` 天日志保留

### 7.3 对当前 SSE 更有意义的实战容量

如果按这次修订后的最小方案执行：

1. 只上线 `Crucible`
2. 只上线 auth/session/workspace
3. 文本问答 + SSE 流式输出为主
4. 不把 Director / Remotion / 媒体渲染一起带上云

那么我建议按下面两个口径看：

#### A. 当前最安全的邀请制 beta 目标

1. `50-200` 注册用户
2. `10-40` 日活
3. `3-10` 个同时活跃对话用户
4. `10-30` 条/分钟的轻量 API 请求

#### B. 完成 workspace 收口后的稳态 beta

1. `200-500` 注册用户
2. `30-100` 日活
3. `10-20` 个同时活跃对话用户
4. 文本型请求为主时，可支撑小规模试运营

### 7.4 真正瓶颈不在 Railway，而在三件事

1. 上游 LLM 延迟与费用
2. 当前仓库仍混有重模块
3. 旧 `projectId / path` 运行时语义还未完全迁掉

### 7.5 明确不建议在 Hobby 上直接承载的业务

1. 多人并发媒体生成
2. Remotion 长时间渲染
3. Director / Shorts / Distribution 全模块混跑
4. 需要强 SLA 的正式公开生产站

### 7.6 一句话判断

**Railway Hobby 足够支撑“账号化后的 Crucible 邀请制 beta”，但不适合把整个 GoldenCrucible 全家桶一次性在线化。**

---

## 8. Final Recommendation

如果现在就拍板，我建议这样执行：

1. **选型拍板：Better Auth**
2. **边界拍板：Better Auth 只负责 `auth/session/account`**
3. **权限拍板：固定角色，不上动态 RBAC**
4. **租户边界拍板：workspace 作为唯一协作边界**
5. **部署拍板：Railway `web + postgres`，同域优先，单副本**
6. **产品范围拍板：首批只上 Crucible 文本主链**
7. **研发顺序拍板：先 auth/session，再 workspace isolation，再协作**

一句话总结：

**最适合 GoldenCrucible-SSE 的不是“最快接个托管登录”，而是“用成熟但克制的 auth 底座，把系统范围收窄到 Railway Hobby 能长期稳定承受的程度，再把 workspace 能力包推向 GoldenCrucible-SaaS”。**

---

## 9. Primary Sources

1. Better Auth Session Management  
   https://better-auth.com/docs/concepts/session-management
2. Better Auth Organization Plugin  
   https://better-auth.com/docs/plugins/organization
3. Better Auth Plugins Overview  
   https://better-auth.com/docs/plugins
4. Better Auth Admin Plugin  
   https://better-auth.com/docs/plugins/admin
5. Clerk Organizations Overview  
   https://clerk.com/docs/guides/organizations/overview
6. Clerk Session Token Customization  
   https://clerk.com/docs/guides/sessions/customize-session-tokens
7. Clerk Authorization Checks  
   https://clerk.com/docs/guides/secure/authorization-checks
8. Clerk Roles and Permissions  
   https://clerk.com/docs/guides/organizations/control-access/roles-and-permissions
9. Auth.js RBAC Guide  
   https://authjs.dev/guides/role-based-access-control
10. Auth.js Express Reference  
   https://authjs.dev/reference/express
11. Auth.js Security Page  
   https://authjs.dev/security
12. Supabase Auth Overview  
   https://supabase.com/docs/guides/auth
13. Supabase Row Level Security  
   https://supabase.com/docs/guides/database/postgres/row-level-security
14. Supabase Custom Claims & RBAC  
   https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
15. WorkOS AuthKit  
   https://workos.com/docs/authkit
16. WorkOS Organization Roles  
   https://workos.com/docs/rbac/organization-roles
17. Railway Build & Deploy  
   https://docs.railway.com/build-deploy
18. Railway Variables  
   https://docs.railway.com/develop/variables
19. Railway Environments  
   https://docs.railway.com/reference/environments
20. Railway Pricing Plans  
   https://docs.railway.com/reference/pricing/plans
