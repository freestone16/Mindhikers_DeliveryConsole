# 2026-03-27 黄金坩埚 SaaS 版总体方案 Ver1.0

> 日期：2026-03-27
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 状态：Ver1.0 设计方案 / 当前执行面 SSOT
> 作者：Codex（按 OldYang 工作流落盘）

---

## 1. 文档目标

本文不是“未来完整版产品蓝图”，而是当前 `GoldenCrucible-SSE` 代码现场上，面向外部演示与早期小规模使用的 **黄金坩埚 SaaS 版 Ver1.0 总体方案**。

本版方案只回答四个问题：

1. 当前这条 SaaS 主线应该做成什么
2. 为什么这样做最符合 `安全、健壮、简单高效`
3. 现有代码基础已经到哪一步，还缺什么
4. 接下来按什么顺序推进，风险最小、交付最快

---

## 2. 设计原则

### 2.1 优先级排序

Ver1.0 统一按以下优先级做判断：

1. `安全`
2. `健壮`
3. `简单`
4. `高效`

任何方案若在“炫技、功能多、抽象漂亮”和“更稳更容易上线”之间冲突，默认选择后者。

### 2.2 四条总原则

1. **单服务优先**
   - Ver1.0 不引入多服务编排，不引入边车，不引入事件总线
   - 能由一个 `Node + Express` 服务承接的事情，不拆第二个服务

2. **宿主只做宿主**
   - 宿主负责账号、workspace、SSE、日志、存储、工具接驳
   - 业务判断继续留给苏格拉底及相关 skill

3. **先隔离，再扩展**
   - 先把用户边界、workspace 边界、会话边界、持久化边界做清楚
   - 再做历史对话、下载、会员计划、多人协作

4. **主链绿灯优先**
   - 当前对外交付链路必须独立可 build、可部署、可排障
   - 历史模块债务可保留，但不能继续阻塞 SaaS 主线

---

## 3. 当前代码现场评估

### 3.1 已经成立的基础

从当前仓库可确认，以下基础已经具备：

1. 黄金坩埚对谈主链已收口到 `HTTP + SSE`
2. 宿主侧已不再替苏格拉底做 phase / 搜索 / 业务判断
3. auth 基础层已接入：
   - `Better Auth`
   - `Postgres`
   - `account/session`
4. workspace kernel 已接入：
   - `workspace`
   - `workspace_member`
   - `workspace_invitation`
   - `active_workspace`
5. Google 登录已经完成真实 smoke，可作为当前可用登录入口
6. 当前默认前端入口已经切到独立 SaaS 壳：
   - `src/SaaSApp.tsx`
7. 当前 `build` 已不再被导演 / 营销等历史模块类型债阻塞

### 3.2 当前真正的断层

Ver1.0 目前最核心的断层，不再是“能不能上线一个页面”，而是：

1. **数据边界还没完全从本地语义迁出来**
   - `turn_log` 仍主要按 `projectId -> runtime/crucible/...` 落盘
   - 前端请求仍透传 `projectId / scriptPath`

2. **持久化还处于过渡态**
   - `turn / conversation / artifact` 已进入 workspace-aware 主链
   - 当前已具备 active conversation 恢复、历史列表、artifact bundle 导出
   - 但本地缓存 scope key、更多导出格式、完整历史中心仍在过渡态

3. **运行时存在双轨存储**
   - 浏览器 `localStorage`
   - 服务端 `autosave.json`
   - 这适合过渡期，但不是长期终态

4. **主链虽已分仓，但整仓旧债仍在**
   - 当前是“已经不阻塞 SaaS build”
   - 不是“历史模块已经收口完毕”

### 3.3 结论

所以 Ver1.0 的真正目标，不是继续做“更完整的 Delivery Console 云端化”，而是：

**把当前黄金坩埚做成一个有账号、有 workspace、有最小持久化、有最小运维能力、可稳定演示与小规模使用的轻量 SaaS。**

---

## 4. Ver1.0 产品边界

### 4.1 Ver1.0 要做什么

Ver1.0 只做以下能力：

1. 用户登录
   - Google 登录
   - 邮箱登录保留，但不要求成为主入口

2. workspace 基础隔离
   - 登录后自动挂到 active workspace
   - 同一用户未来可切换 workspace

3. 黄金坩埚单人对谈
   - SSE 流式回合生成
   - 黑板输出
   - 最小错误提示
   - 最小重置

4. 最小会话持久化
   - `turn`
   - `conversation`
   - `artifact`
   - `autosave`

5. 最小账号后态
   - 头像菜单
   - 轻量历史中心入口
   - 轻量导出入口

6. 可部署、可监控、可排障
   - staging
   - production
   - health
   - 基础日志

### 4.2 Ver1.0 明确不做什么

以下内容不进入 Ver1.0：

1. Roundtable 多人讨论
2. Delivery / Director / Shorts / Marketing 主工作台
3. 支付与正式商业化计费
4. 动态权限系统
5. 复杂审计后台
6. 多区域、多活、复杂弹性架构
7. 面向大规模公测的全链路性能优化

### 4.3 目标用户

Ver1.0 不是面向“海量陌生流量”的正式开放产品，而是面向：

1. 老卢内部验证
2. 少量朋友
3. 合作方
4. 投资人演示
5. 早期受控用户

这决定了 Ver1.0 的方案应该优先：

1. 易于解释
2. 易于上线
3. 易于回滚
4. 易于排障

---

## 5. Ver1.0 推荐架构

## 5.1 总体拓扑

推荐继续采用：

1. **一个前端**
   - React + Vite
   - 当前默认入口为 `src/SaaSApp.tsx`

2. **一个 Web 服务**
   - Express 5
   - 承接 auth、account、workspace、crucible、distribution 最小接口

3. **一个数据库**
   - Railway Postgres
   - 存 auth、workspace、未来会话元数据

4. **一个文件运行时目录**
   - `runtime/crucible/workspaces/<workspaceId>/...`
   - 先承接过渡期产物与快照

5. **一个部署单元**
   - Railway 单服务

### 5.2 为什么是单服务

这套架构最符合当前四大目标：

1. `安全`
   - 边界少，跨服务凭证更少
2. `健壮`
   - 依赖少，排障路径短
3. `简单`
   - 团队心智负担低
4. `高效`
   - 上线和改动速度最快

### 5.3 为什么暂不拆读写分离或多服务

当前阶段拆分的收益远低于成本：

1. 用户规模还小
2. 主问题不是吞吐，而是边界与持久化一致性
3. 拆服务会立刻引入：
   - 更多环境变量
   - 更多超时链路
   - 更多日志对齐成本
   - 更多“到底是哪里坏了”的排障复杂度

因此 Ver1.0 保持：

**单前端 + 单 Web 服务 + 单数据库 + 最小文件存储层**

---

## 6. 核心模块设计

## 6.1 Auth Kernel

### 定位

auth 只负责：

1. 登录
2. session
3. provider 接入
4. 用户身份确认

### 不负责

1. 业务权限解释
2. 资源归属解释
3. 会话业务对象建模

### 设计判断

`Better Auth + Postgres` 适合作为 Ver1.0 的 auth kernel，因为它：

1. 足够成熟
2. 对当前 `Express + React` 适配自然
3. Railway 友好
4. 不把 workspace 语义锁死到第三方平台

## 6.2 Workspace Kernel

### 当前推荐边界

workspace kernel 继续由我们自己掌控，最小对象保持：

1. `workspace`
2. `workspace_member`
3. `workspace_invitation`
4. `active_workspace`

### 角色口径

Ver1.0 只保留四个固定角色：

1. `owner`
2. `admin`
3. `member`
4. `viewer`

当前阶段不做动态权限矩阵。

### 为什么固定角色就够

因为 Ver1.0 要解决的是“数据别串、入口别乱、成员可解释”，不是复杂企业权限治理。

## 6.3 Crucible Runtime

### 宿主职责

宿主负责：

1. 接收请求
2. 组装上下文
3. 调用 LLM
4. 流式返回
5. 写入 turn log / conversation / artifact
6. 写入最小搜索证据

### 宿主不负责

1. 替苏格拉底决定 phase
2. 替苏格拉底决定是否搜索
3. 替苏格拉底决定对话结构

这条边界必须继续保持。

## 6.4 Persistence Kernel

Ver1.0 的真正重点是把坩埚持久化统一成以下四类对象：

1. `turn`
   - 单轮输入输出
   - 搜索元信息
   - 发言者
   - presentables 摘要

2. `conversation`
   - 一段完整对话
   - topic
   - roundIndex
   - messages timeline

3. `artifact`
   - 黑板资产
   - 引用卡片
   - 导出材料

4. `autosave`
   - 当前进行中工作区快照

---

## 7. 数据模型与持久化方案

## 7.1 当前问题

当前代码现场中：

1. `autosave` 已按 `workspaceId` 落到：
   - `runtime/crucible/workspaces/<workspaceId>/autosave.json`
2. 但 `turn_log` 仍主要按 `projectId` 落到：
   - `runtime/crucible/<projectId>/turn_log.json`
3. 前端仍在多个位置透传：
   - `projectId`
   - `scriptPath`

这意味着系统还处于：

**登录层已 workspace-aware，但对谈核心数据层还没有完全 workspace-aware。**

## 7.2 Ver1.0 推荐持久化边界

推荐统一目录与对象语义为：

`runtime/crucible/workspaces/<workspaceId>/`

下挂最小结构：

1. `autosave.json`
2. `conversations/<conversationId>.json`
3. `artifacts/<artifactId>.json`
4. `exports/<exportId>.*`

`turn` 不单独做顶层目录，而是挂在 conversation 内部，原因是：

1. 对谈恢复天然以 conversation 为单位
2. 下载与历史回放也天然以 conversation 为单位
3. 可以减少碎文件数量

### 推荐 conversation 结构

每个 `conversation` 至少包含：

1. `id`
2. `workspaceId`
3. `topicTitle`
4. `status`
   - `active`
   - `archived`
5. `roundIndex`
6. `messages`
7. `turns`
8. `artifacts`
9. `updatedAt`
10. `createdAt`

## 7.3 过渡期方案

Ver1.0 不要求一步把所有内容迁入数据库。

推荐采用 **数据库存元数据 + 文件系统存正文/快照** 的双层方案：

1. `Postgres`
   - 用户
   - workspace
   - conversation index
   - artifact index
   - active conversation id

2. `runtime/` 文件
   - autosave payload
   - conversation payload
   - artifact payload

### 为什么这样最稳

1. 不需要立刻把所有 JSON 结构重构成关系表
2. 排障时可以直接看文件
3. 对当前代码改造量更小
4. 后续若要升级到数据库全文持久化，也有平滑迁移路径

## 7.4 localStorage 的定位

Ver1.0 中，浏览器 `localStorage` 只能作为：

1. 临时缓存
2. 断网兜底
3. 前端瞬态体验加速层

不能继续把它当作主持久化来源。

统一原则：

**服务端 workspace-aware 持久化是真实来源，localStorage 只是浏览器缓存。**

---

## 8. 安全方案

## 8.1 身份与会话安全

Ver1.0 最低安全基线：

1. 生产环境强制非默认 `BETTER_AUTH_SECRET`
2. `httpOnly` cookie
3. `secure` cookie
4. `sameSite` 使用保守配置
5. session 失效后前端必须刷新当前账号状态

## 8.2 Provider 安全

Ver1.0 的社交登录策略：

1. Google 作为第一主入口
2. 微信网站应用第二阶段接入

要求：

1. 所有 provider 回调地址固定登记
2. 所有 provider secret 仅存在于平台环境变量
3. 在对话、日志、截图里出现过的 secret，测试后必须旋转

## 8.3 Workspace 访问控制

任何需要读取或写入坩埚数据的接口，最终都应先做两步检查：

1. `req -> session.user.id`
2. `session.user.id -> activeWorkspaceId / workspace membership`

不允许前端直接提交一个 `workspaceId` 就越权读取。

## 8.4 数据安全边界

Ver1.0 不追求企业级审计系统，但必须做到：

1. workspace 之间文件路径天然隔离
2. conversation / artifact 都带 `workspaceId`
3. 搜索证据、导出材料、黑板材料都进入 workspace 边界
4. 错误日志默认不打印敏感 token

---

## 9. 健壮性方案

## 9.1 失败优先设计

Ver1.0 需要接受一个现实：

LLM、外部搜索、网络、provider 登录、文件写入，都可能失败。

因此系统必须做到：

1. 有清晰错误层级
2. 有明确重试边界
3. 有最小可恢复状态

## 9.2 三层错误口径

统一分三层：

1. **用户层**
   - 简短、可操作
   - 例如“本轮生成失败，请重试”

2. **开发层**
   - HTTP status
   - provider
   - response text
   - stack

3. **证据层**
   - turn log
   - research sources
   - workspace path
   - request id

## 9.3 必须保留的健康与诊断能力

Ver1.0 最低要有：

1. `/health`
2. `/api/account/status`
3. 服务启动时打印 auth/runtime flags
4. 关键失败点日志：
   - auth
   - autosave
   - turn generation
   - external search
   - preview generation

## 9.4 恢复能力

至少支持：

1. 页面刷新后恢复当前 active conversation
2. 服务短暂重启后不丢失已保存 conversation
3. 用户主动 reset 时明确清理：
   - autosave
   - active conversation pointer
   - 前端缓存

---

## 10. 简单与效率方案

## 10.1 为什么不做重型数据库建模

当前最有效率的方案不是把所有对象都表结构化，而是：

1. 先把边界做对
2. 再做逐步结构化

Ver1.0 若一开始就把：

1. turns
2. messages
3. artifacts
4. blackboard items
5. exports

全部做成复杂关系模型，交付速度会显著下降，风险也会上升。

## 10.2 为什么不做第二套前端仓

当前已通过 `SaaSApp.tsx + tsconfig.saas.json` 达到主链分仓。

继续拆成第二个前端仓的代价包括：

1. 组件复用链断裂
2. 环境变量维护翻倍
3. 发布链路翻倍
4. 文档与排障复杂度翻倍

Ver1.0 不值得付这笔成本。

## 10.3 为什么不急着把 distribution 完全拿掉

当前分发终端保留在 SaaS 壳里是合理的，但它必须满足：

1. 不拖累坩埚主链
2. 不重新把历史 Delivery 语义带回来
3. 不成为当前 build 的主要风险源

换句话说：

**可以保留，但不能反客为主。**

---

## 11. 部署方案

## 11.1 Ver1.0 推荐部署口径

默认采用：

1. `Railway`
2. 单服务部署
3. Railway Postgres

### 原因

1. 已有代码与当前运行方式最贴合
2. 已经完成第一轮打通
3. 维护成本最低
4. 最适合当前 demo/beta 阶段

## 11.2 环境变量口径

Ver1.0 最小环境变量统一为：

1. `PORT`
2. `APP_BASE_URL`
3. `CORS_ORIGIN`
4. `DATABASE_URL`
5. `BETTER_AUTH_SECRET`
6. `BETTER_AUTH_URL`
7. `GOOGLE_CLIENT_ID`
8. `GOOGLE_CLIENT_SECRET`
9. LLM provider 相关 key
10. `VITE_API_BASE_URL`

原则：

1. 线上只依赖文档和平台环境变量即可启动
2. 不依赖本机历史残留
3. 不在 `.env` 里保留含糊口径

## 11.3 环境层次

Ver1.0 至少保持两层：

1. `staging`
2. `production`

不建议只保留一个 production 环境裸跑。

---

## 12. 分阶段实施方案

## 12.1 Phase A：当前已完成或基本完成

1. SSE 主链
2. SaaS 壳分仓
3. Better Auth 接入
4. Workspace kernel 初版
5. Google 登录接通
6. Autosave workspace-aware

## 12.2 Phase B：Ver1.0 最优先

这是当前最应该推进的阶段。

### 目标

完成 **workspace-aware persistence**。

### 具体清单

1. 去掉坩埚主链对 `projectId / scriptPath` 的硬依赖
2. 为对谈主链引入明确的：
   - `workspaceId`
   - `conversationId`
3. 把 `turn` 挂到 conversation 内部
4. 把 `artifact` 从“当前页面态”变成“可持久化对象”
5. 历史对话接口读取 conversation index
6. reset 操作同步清理 active conversation 与 autosave

### 完成标准

1. 同一 workspace 刷新后能恢复当前对话
2. 不同 workspace 之间不会串 conversation
3. 黑板产物能随 conversation 恢复

## 12.3 Phase C：登录后态补齐

1. 历史对话列表
2. 轻量历史中心
   - 搜索
   - 排序
   - 基础元数据
   - 恢复 / 导出
3. 下载
   - 当前先保留 `format` 参数位
   - 默认导出结构化 bundle
4. 头像菜单真实功能接线
5. 会话归档 / 重命名最小能力

## 12.4 Phase D：第二登录入口

1. 微信网站应用登录接入
2. provider 口径统一
3. 登录页文案与用户路径统一

---

## 13. 验收标准

Ver1.0 达标的标志，不是“代码很多”，而是以下问题都能回答“是”：

1. 用户能稳定登录吗
2. 不同 workspace 的数据会串吗
3. 页面刷新后会话能恢复吗
4. build 会被历史导演/营销模块拖死吗
5. 出错时用户能看懂，开发者也能定位吗
6. staging 和 production 的部署口径清楚吗

如果以上六条都成立，Ver1.0 就成立。

---

## 14. 风险与回避策略

## 14.1 最大风险

当前最大风险不是 LLM 本身，而是：

1. 代码现场已经进入“auth 已上、数据边界未完全跟上”的阶段
2. 若继续往前堆功能，很容易把历史对话、下载、会员计划建在错误的数据边界上

## 14.2 对应回避策略

因此必须坚持顺序：

1. 先做 workspace-aware persistence
2. 再做历史对话 / 下载 / 会员计划
3. 最后做微信登录和更外层功能

### 禁止事项

Ver1.0 阶段明确禁止：

1. 因为赶进度而重新把 `projectId / scriptPath` 当线上主 identity
2. 因为追求“全绿”而顺手去混修历史导演/营销模块
3. 因为想一步到位而把 persistence 全部重写成重型数据库模型

---

## 15. 最终结论

黄金坩埚 SaaS Ver1.0 的正确形态不是“大而全平台”，而是：

**一个单服务、单前端、带账号与 workspace、具备最小会话持久化和最小运维能力的轻量 SaaS。**

在当前代码基础上，这条路线最符合：

1. `安全`
2. `健壮`
3. `简单`
4. `高效`

当前下一步唯一主线也已经明确：

**完成 `turn / conversation / artifact` 的完整 workspace-aware persistence。**
