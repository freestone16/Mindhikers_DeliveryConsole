# 2026-04-01 GoldenCrucible SaaS 微信接入与 `SAAS -> SSE` 反向同步实施方案

> 日期：2026-04-01
> 当前工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 面向仓库：
> - R&D：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> - Release/Staging：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
> 状态：正式实施方案 / 待在 `GoldenCrucible-SaaS` 窗口执行

---

## 1. 方案目标

本方案同时解决两件事：

1. **在 `GoldenCrucible-SaaS` 上完成微信接入 feature**
   - 采用更保守、可迁移的方案
   - 当前只使用 Authing 的最小认证能力
   - 业务数据、密码、workspace、会话资产仍握在我们自己手里

2. **建立 `SAAS -> SSE` 的反向同步治理**
   - 允许 `SAAS` 在对外发布、线上 debug、域名收口过程中继续产生少量共享改动
   - 但这些改动必须按“共享底座包”定期回灌 `SSE`
   - 禁止把 `SAAS` 再次演化成长期主研发现场

一句话：

**本轮不是把 Authing 接成新的“系统真相层”，而是把它接成一个可进可退的微信认证入口，同时建立 `SAAS` 与 `SSE` 的长期协同纪律。**

---

## 2. 关键结论

### 2.1 关于开发落点

本次微信接入 feature，**建议直接在 `GoldenCrucible-SaaS` 开发**，不建议先在 `SSE` 做完再 cherry-pick 到 `SAAS`。

原因：

1. 微信扫码登录强依赖：
   - 正式域名
   - OAuth 回调
   - Railway 环境变量
   - 真实线上 smoke
2. 这些条件当前明确是 `SAAS` 更成熟：
   - `gc.mindhikers.com`
   - `APP_BASE_URL`
   - `BETTER_AUTH_URL`
   - `CORS_ORIGIN`
3. 两边现有 `src/auth/*` 与 `server/auth/*` 当前基本同构
   - 先在 `SSE` 做没有明显技术红利
4. `SSE` 当前工作区更脏，摘樱桃成本更高

因此本次的正确路线是：

1. 在 `SAAS` 新开干净 feature branch
2. 完成微信/Authing 最小接入
3. 在 `SAAS` 做正式域名下 smoke
4. 再把共享 auth 能力精确回灌到 `SSE`

### 2.2 关于认证架构

当前推荐架构不是“全部切 Authing”，而是：

1. `Better Auth`
   - 继续承接当前已完成的 Google / 邮箱体系
2. `Authing`
   - 当前只承接微信扫码登录的上游认证
3. 我们自己的云端用户体系
   - 作为唯一真相层
   - 统一承接 `user / workspace / conversation / artifact / trial quota / BYOK`

一句话：

**允许两种认证来源并存，但不允许两套业务用户体系并存。**

### 2.3 关于未来迁移

本方案必须满足两个未来方向：

1. 如果后续用户量暴增，可逐步把更多登录入口迁到 Authing
2. 如果后续要从 Authing 迁出到 Auth0 等国际服务商，也能迁

要做到这一点，当前实现必须遵守：

1. 自己保留统一用户主键
2. 自己保留 identity mapping
3. 业务层不直接信任供应商用户模型
4. 供应商只做认证入口，不做业务真相层

---

## 3. 当前现场判断

### 3.1 `SAAS` 当前更适合承接本次 feature

从当前现场可确认：

1. `GoldenCrucible-SaaS` 已完成正式域名接入：
   - `gc.mindhikers.com`
2. `SAAS` 已完成：
   - `APP_BASE_URL`
   - `BETTER_AUTH_URL`
   - `CORS_ORIGIN`
   的正式域名切换
3. `SAAS` 已确认：
   - 登录壳能打开
   - Google provider 已接通
   - 生产 redeploy 已跑通
4. 当前微信仍未真实 smoke
   - 主要缺开放平台资料与密钥
   - 不是缺前端按钮或 provider 预留位

所以本轮最稀缺的不是“再写一套按钮代码”，而是：

1. 把微信接入做成真正可上线的线上链路
2. 在正式域名下验通完整回调闭环

### 3.2 `SSE` 仍然保留长期研发职责

尽管本次微信 feature 放在 `SAAS` 开发更稳，但这**不等于**把 `SAAS` 升格为长期主研发源头。

长期职责仍应保持：

1. `SSE`
   - 共享业务逻辑演进主线
   - 新能力研发主线
   - 长线收口主线
2. `SAAS`
   - 正式发布线
   - 对外 staging / smoke / 线上 debug
   - 域名、回调、环境变量收口

所以本方案同时要求建立反向同步治理，防止未来两边再次漂移。

---

## 4. 微信接入总体策略

## 4.1 这次到底要接什么

本轮只做：

1. 微信网站应用扫码登录
2. Authing 最小接入
3. 与我们自己的云端用户体系打通
4. 可迁移、可迁出、可继续扩展

本轮明确不做：

1. 把 Google / 邮箱全部迁到 Authing
2. 把 Authing 变成业务主数据库
3. 把角色、workspace、trial quota、BYOK 迁给 Authing
4. 复杂的账号中心 UI
5. 自动静默合并已有 Google/邮箱账号

### 4.2 Authing 在本轮中的角色

Authing 当前只承担：

1. 微信扫码授权页
2. 微信身份确认
3. 返回上游身份标识

Authing 当前不承担：

1. 业务用户主表
2. workspace 真相层
3. 对话历史真相层
4. artifact 真相层
5. trial quota / BYOK / billing 真相层

### 4.3 当前推荐的身份分层

分三层理解：

1. **上游身份来源**
   - Better Auth：Google / 邮箱
   - Authing：微信

2. **我们自己的云端用户体系**
   - 统一 user
   - 统一 workspace
   - 统一 identity mapping

3. **我们自己的 SaaS 会话层**
   - 后续业务接口只认我们自己的平台登录态
   - 不让业务接口直接信任 Authing 的上游会话

注意：

这里的“我们自己的 SaaS 会话层”是指**我们控制的服务端会话语义**，不是浏览器 `localStorage`，也不是“本机会话”的意思。

---

## 5. 推荐的目标架构

### 5.1 当前阶段的保守实现

推荐采用：

1. 继续保留当前 `Better Auth`
   - 用于现有 Google / 邮箱路径
2. 新增 `AuthingBridge`
   - 专门用于微信扫码入口
3. 新增统一 identity mapping
4. 新增统一 SaaS session facade
   - 让业务层逐步只依赖统一会话语义

### 5.2 为什么不建议把微信继续直接接在 Better Auth 内建微信 provider 上

当前代码里虽然已经预留了 Better Auth 的 `wechat` provider 配置位，但这条路不再建议作为本轮正式方案的主方向。

原因：

1. 你已经明确想把微信这条能力最小化外包给 Authing
2. 你又要求后续可迁出
3. 那就应该从一开始把微信入口做成“供应商可替换层”
4. 如果继续把微信直接绑在 Better Auth social provider 上，后续切 Authing 或切出 Authing 都会更别扭

因此：

1. Better Auth 继续留给当前 Google / 邮箱
2. 微信不再以 Better Auth social provider 为正式主路径
3. 微信改接我们自己的 `AuthingBridge`

### 5.3 关于统一用户主表

当前最小、最稳的做法是：

1. **短期继续沿用当前数据库中的 `user` 表作为统一 SaaS 用户主表**
2. 但从这一轮开始，所有新逻辑不再把 Better Auth `account` 表当“唯一外部身份真相”
3. 新增我们自己的 `user_identity` 表来承接身份映射

为什么这样做：

1. 现在直接再抽一个全新的 `app_user`，改动太大
2. 当前 `workspace` 相关表已经通过 `user.id` 建了外键
3. `user` 表本身在我们的 Postgres 里，数据仍然在我们手里
4. 对本轮微信 feature 来说，这样是最小侵入、最稳妥的落地方式

换句话说：

**当前阶段可以继续用 `user` 作为统一平台用户表，但不能继续让供应商账号关系散落在供应商自己的表语义里。**

---

## 6. 数据模型建议

### 6.1 必加：`user_identity`

建议在 `SAAS` 新增一张身份映射表：

```sql
CREATE TABLE IF NOT EXISTS user_identity (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    provider_vendor TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_subject TEXT,
    union_id TEXT,
    email TEXT,
    phone TEXT,
    display_name TEXT,
    avatar_url TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_vendor, provider_type, provider_user_id)
);
```

字段解释：

1. `provider_vendor`
   - `better-auth`
   - `authing`
   - 后续可扩展 `auth0`
2. `provider_type`
   - `google`
   - `email`
   - `wechat`
3. `provider_user_id`
   - 供应商侧稳定用户 ID
4. `provider_subject`
   - 可选的 `sub`
5. `union_id`
   - 微信侧若能拿到稳定跨应用标识，优先保留
6. `metadata_json`
   - 不把供应商字段打散到主表
   - 原始 profile 最好做一份最小备份

### 6.2 可选：`identity_link_ticket`

若本轮要把“已有 Google 账号绑定微信”也一起做，建议补：

```sql
CREATE TABLE IF NOT EXISTS identity_link_ticket (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    target_vendor TEXT NOT NULL,
    target_type TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

但如果本轮只先做“微信新用户可进来”，这张表可以推迟到下一阶段。

### 6.3 建议补：身份审计事件

为排障和迁出准备，建议补最小审计表：

```sql
CREATE TABLE IF NOT EXISTS auth_identity_event (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    provider_vendor TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

记录：

1. `wechat_auth_started`
2. `wechat_callback_verified`
3. `identity_linked`
4. `identity_conflict`
5. `session_issued`

---

## 7. 会话策略

### 7.1 目标

目标不是“哪家供应商有会话我们就信哪家”，而是：

**所有业务请求最终都落到我们自己控制的 SaaS 会话语义下。**

### 7.2 当前推荐路线

当前建议采用“统一会话 facade，分阶段收口”：

#### Phase A：本轮先搭会话抽象层

新增统一会话读取入口，例如：

1. `server/auth/session-facade.ts`
2. `resolveAppSession(req)`
3. `requireAppAuth(req, res, next)`

这个 facade 当前可以先支持两类来源：

1. Better Auth session
2. Authing 微信回调成功后创建的平台 session

#### Phase B：业务接口逐步只认 facade

后续逐步把业务路由从直接调用：

1. `getSessionFromRequest`

迁到：

1. `resolveAppSession`

这样后面即使：

1. 微信从 Authing 迁出
2. Google / 邮箱迁到 Authing
3. Authing 再迁到 Auth0

业务路由也不用跟着重写。

### 7.3 本轮不要做的事

本轮不要：

1. 让业务 API 同时长期接受 Authing token 与 Better Auth cookie 两套语义
2. 把供应商 session 当成业务 session
3. 让 `workspace` / `trial quota` / `BYOK` 依赖供应商返回结构

---

## 8. 微信/Authing 具体实施方案

## 8.1 本轮实施范围

本轮目标是完成最小闭环：

1. 点击“微信扫码登录”
2. 跳到 Authing 承接的微信扫码授权页
3. 微信扫码完成后回到我们自己的 `SAAS` 回调接口
4. 后端完成：
   - 校验
   - 查找/创建本地用户
   - 写入 `user_identity`
   - 建立 personal workspace
   - 建立统一平台 session
5. 前端进入现有 SaaS 壳

### 8.2 后端模块拆分建议

建议新增：

1. `server/auth/identity-store.ts`
   - 读写 `user_identity`
2. `server/auth/authing-bridge.ts`
   - 与 Authing 通信
   - 构造授权 URL
   - 校验回调 code/state
   - 拉取 Authing 用户信息
3. `server/auth/session-facade.ts`
   - 统一会话读取与签发
4. `server/auth/wechat-router.ts`
   - 暴露微信入口路由

当前保留：

1. `server/auth/index.ts`
2. `server/auth/account-router.ts`
3. `server/auth/workspace-store.ts`

但 `account-router` 里的 `requireAuth` 后续应逐步替换为平台级 session facade。

### 8.3 前端改造建议

前端当前不要直接继续用：

1. `authClient.signIn.social({ provider: 'wechat' })`

建议改成：

1. 点击按钮后请求：
   - `GET /api/account/wechat/start`
2. 后端返回：
   - 授权 URL
   - 或直接 302 跳转
3. 前端只负责跳转和错误提示

这样做的好处：

1. 前端不绑定 Authing SDK 细节
2. 将来切 Auth0 等服务商时，前端基本不用改
3. 微信扫码入口始终挂在我们自己的 API 契约上

### 8.4 最小接口清单

建议新增：

1. `GET /api/account/wechat/start`
   - 创建 state
   - 返回或直接跳转到 Authing 授权页

2. `GET /api/account/wechat/callback`
   - 校验 state
   - 用 code 换 Authing 侧身份信息
   - 查找/创建本地用户
   - upsert `user_identity`
   - 建立平台 session
   - 重定向到 `/`

3. `POST /api/account/identity/link/wechat`
   - 下一阶段使用
   - 已登录用户主动绑定微信

4. `GET /api/account/identities`
   - 下一阶段使用
   - 查看当前账号已绑定哪些登录方式

### 8.5 微信用户落地规则

当前推荐规则如下：

#### 规则 A：先看 identity mapping

如果存在：

1. `provider_vendor = authing`
2. `provider_type = wechat`
3. `provider_user_id = 当前微信身份`

则直接定位已有本地用户。

#### 规则 B：不存在 mapping 时，不做静默自动合并

如果是第一次微信登录：

1. 默认创建新本地用户
2. 写入 `user_identity`
3. 自动创建 personal workspace

不建议本轮直接做：

1. “如果邮箱一样就自动合并”
2. “如果名字相似就自动合并”

因为微信资料天然不稳定，误合并成本太高。

#### 规则 C：已有用户绑定微信，走显式绑定

如果后面要支持：

1. Google 账号用户主动补绑微信

则必须通过“已登录状态下的显式绑定流程”完成，而不是在微信首次登录时偷偷合并。

---

## 9. 推荐实施阶段

## 9.1 Phase 0：设计冻结

在 `SAAS` 窗口正式动手前，先冻结以下决策：

1. `SAAS` 作为本轮实施主仓
2. Authing 只做微信上游认证
3. `user` 继续作为当前统一平台用户主表
4. 新增 `user_identity`
5. 前端不直绑 Authing SDK
6. 业务最终走平台统一 session facade

### 9.2 Phase 1：身份映射层

本阶段只做基础设施：

1. migration：新增 `user_identity`
2. `identity-store.ts`
3. `session-facade.ts` 骨架
4. 增加最小审计日志

验收：

1. migration 可运行
2. 类型通过
3. 不影响现有 Google / 邮箱路径

### 9.3 Phase 2：微信入口与回调

本阶段完成：

1. `wechat-router.ts`
2. `authing-bridge.ts`
3. `/api/account/wechat/start`
4. `/api/account/wechat/callback`
5. 前端微信按钮改接新的后端入口

验收：

1. 可以跳转到微信扫码授权页
2. callback 可回站
3. state 校验通过
4. 错误能被明确记录

### 9.4 Phase 3：本地用户落地与 workspace

本阶段完成：

1. 首次微信登录创建本地用户
2. 写 `user_identity`
3. 自动建立 personal workspace
4. 建立统一平台 session

验收：

1. `GET /api/account/session` 能识别微信新用户
2. 登录后能进入现有 SaaS
3. workspace 自动建立成功

### 9.5 Phase 4：线上 smoke

必须在 `gc.mindhikers.com` 做真人 smoke：

1. 干净浏览器访问登录页
2. 点击微信扫码登录
3. 微信扫码确认
4. callback 回站
5. 自动进入 SaaS
6. `workspace` 存在
7. 登录态刷新后不丢
8. 登出后回到登录页

### 9.6 Phase 5：共享底座回灌到 `SSE`

本轮完成后，只回灌共享文件：

1. `src/auth/*` 中真正共享的部分
2. `server/auth/*` 中真正共享的部分
3. migration / schema
4. `account-router` 里通用的 `status/session` 扩展

本轮禁止整包回灌：

1. 正式域名配置
2. Railway 发布配置
3. Cloudflare 记录
4. 生产 smoke 文档

---

## 10. 风险与规避

### 10.1 最大风险：重复账号

表现：

1. 用户先 Google 登录
2. 后面再微信扫码
3. 系统给他建了第二个本地用户

规避：

1. 本轮默认接受“首次微信登录创建新用户”
2. 下一阶段补显式绑定
3. 不做静默自动合并

### 10.2 最大实现风险：会话打通

表现：

1. 微信回调成功了
2. 但回站后前端仍然是未登录

规避：

1. 先做 `session-facade`
2. 不让微信路径硬耦合现有 Better Auth social flow
3. 所有登录完成后统一回到 `/api/account/session` 可识别的语义

### 10.3 最大运维风险：只改代码不改线上口径

表现：

1. 本地跑得通
2. 线上回调失败
3. 真正原因是：
   - 回调域名
   - `APP_BASE_URL`
   - `BETTER_AUTH_URL`
   - `CORS_ORIGIN`
   - Authing 控制台回调
   - 微信开放平台回调
   没对齐

规避：

1. 本轮实施时把“线上口径核对”列为必做步骤
2. 任何 smoke 前先核回调地址

### 10.4 长期风险：让 Authing 渗透进业务模型

表现：

1. 业务代码直接依赖 Authing 用户结构
2. `workspace` / quota / history 与供应商字段耦合

规避：

1. 所有供应商字段收纳到 `user_identity`
2. 主业务永远只看本地 `user.id`

---

## 11. `SAAS -> SSE` 反向同步治理

## 11.1 为什么必须建立这套机制

因为真实现场已经说明：

1. `SAAS` 不只是纯发布壳
2. 它还会持续承接：
   - 正式域名问题
   - OAuth 回调问题
   - 线上 debug
   - staging 验证
3. 这些过程中会自然产生一部分共享底座修复

如果不回灌：

1. `SSE` 会越来越落后于真实可发布版本

如果整包回灌：

1. `SSE` 会被 staging / Railway / 发布口径污染

所以必须做：

**定期、按能力包、只回共享底座的 `SAAS -> SSE` 反向同步。**

### 11.2 新的长期职责口径

#### `SSE`

1. 共享业务逻辑演进源头
2. 新功能研发主线
3. 长期产品能力沉淀

#### `SAAS`

1. 对外正式线
2. 域名 / 回调 / OAuth / Railway / 线上问题收口
3. 正式 smoke 与发布前验收

#### 反向同步

1. 只解决“共享底座不要失配”
2. 不改变上述主次关系

### 11.3 同步触发条件

建议固定两类触发：

1. **发布后回灌**
   - `SAAS` 完成一次正式发布或重要线上 debug 后
2. **周清账回灌**
   - 每周固定一次
   - 盘点本周 `SAAS` 的共享底座改动

不建议：

1. 想到就同步
2. 没做分类就整包 merge

### 11.4 允许回灌的内容

建议允许：

1. `src/auth/*`
2. `server/auth/*`
3. `src/config/runtime.ts`
4. 通用 schema / migration
5. 通用账号状态接口
6. 与 `workspace / history / artifact / trial quota / byok` 直接相关、且不绑定生产环境的共享修复
7. 已经在线上被验证的通用 bugfix

### 11.5 禁止回灌的内容

明确禁止：

1. `railway.json`
2. `.railwayignore`
3. Cloudflare 记录
4. Railway 变量值
5. 正式域名
6. staging / prod smoke 纪要
7. 发布线专属脚本
8. 只为 `gc.mindhikers.com` 存在的收口文件
9. 任何会让 `SSE` 再次承担发布线职责的文档与配置

### 11.6 建议同步流程

建议每次回灌都走同一条流程：

1. 在 `SAAS` 先整理本轮提交
2. 标记每个提交属于：
   - 共享底座
   - 发布线专属
3. 只把共享底座拆成能力包
4. 进入 `SSE` 新分支回灌
5. 在 `SSE` 跑：
   - `typecheck`
   - `build`
   - 最小 smoke
6. 回写：
   - `HANDOFF`
   - `dev_progress` 或当天日志

### 11.7 本轮微信 feature 的回灌建议

本轮微信 feature 在 `SAAS` 完成后，建议只回灌：

1. `user_identity` migration
2. `identity-store.ts`
3. `session-facade.ts`
4. `account-router.ts` 中真正共享的 status/session 语义
5. `src/auth/AuthScreen.tsx` 中不依赖正式域名的通用交互改动

本轮不要回灌：

1. Authing 控制台具体环境值
2. 正式回调域名
3. `gc.mindhikers.com` smoke 口径

---

## 12. 要求 `SAAS` 端写入项目 rules 的几句话

当你切到 `GoldenCrucible-SaaS` 窗口实施时，**必须把下面几句精炼规则写进 `SAAS` 的 `docs/04_progress/rules.md`**。

建议原文直接落这 4 条：

1. **`SAAS` 上产生的共享 auth/runtime 修复，发布后必须评估是否按能力包回灌 `SSE`；禁止让 `SSE` 长期落后于正式发布线的共享底座。**
2. **`SAAS -> SSE` 只允许回灌共享业务底座，禁止回灌 Railway、Cloudflare、正式域名、生产 smoke 等发布线专属内容。**
3. **微信/Authing 接入在 `SAAS` 实施时，业务真相层必须仍落在本地 Postgres 的统一用户体系；禁止让 Authing 直接承载 workspace、history、quota、BYOK 等业务真相。**
4. **涉及多登录来源时，必须优先维护统一 `user + identity mapping + platform session facade`，禁止让业务 API 长期直接依赖供应商 session。**

---

## 13. 建议的执行顺序

建议 `SAAS` 窗口严格按下面顺序实施：

1. 先把本方案和当前 `SAAS` 的 `HANDOFF` 一起读完
2. 在 `SAAS` 新建干净 feature branch
3. 先补 `rules.md` 中的 4 条治理规则
4. 再做：
   - `user_identity`
   - `identity-store`
   - `session-facade`
5. 再做：
   - `wechat-router`
   - `authing-bridge`
   - 前端登录按钮改接
6. 然后在 `gc.mindhikers.com` 做真实 smoke
7. 再整理“本轮共享底座回灌清单”

---

## 14. 最终判断

本轮最稳、最克制、最可迁移的路线是：

1. **直接在 `GoldenCrucible-SaaS` 做微信/Authing 最小接入**
2. **继续保留我们自己的统一用户体系作为真相层**
3. **把 Authing 限定为微信上游认证入口，而不是业务主库**
4. **把 `SAAS -> SSE` 反向同步制度化，防止两边长期漂移**

这条路线的好处是：

1. 眼下能最快接通微信
2. 不会把现有 Google / 邮箱体系推倒重来
3. 后面既可以逐步更多迁入 Authing
4. 也可以在需要时迁出到 Auth0 等服务商

一句话收口：

**当前先把微信接通，但架构上从第一天开始就按“供应商可替换、业务真相自持、发布线与研发线双线治理”来落。**
