# GoldenCrucible SSE 微信网站应用登录准备清单

> 日期：2026-03-26
> 适用范围：GoldenCrucible SaaS 登录页三类入口中的“微信扫码登录”
> 当前接入口径：`Better Auth + WeChat provider + 网站应用二维码授权`

---

## 1. 目标口径

- 登录页保留三类入口：
  - `Google 登录`
  - `微信扫码登录`
  - `邮箱注册 / 登录`
- 微信采用：
  - `微信开放平台 -> 网站应用登录`
- 目标体验：
  - 页面点击“微信扫码登录”后，进入微信二维码授权流程
  - 用户扫码确认后，系统自动创建或登录账号
  - 首次登录自动初始化 personal workspace

---

## 2. 你现在需要准备的东西

### 2.1 平台账号与应用

- 微信开放平台开发者账号
- 已创建并审核通过的 `网站应用`
- 该网站应用专用的：
  - `AppID`
  - `AppSecret`

### 2.2 应用资料

- 应用名称
- 应用简介
- 应用 logo
- 所属主体信息
- 官网地址
- 可能需要的备案 / 主体证明材料

### 2.3 域名与回调地址

- 对外可访问域名
- 需要在微信开放平台登记的授权回调域 / 回调地址
- 生产环境建议按当前 Railway 域名先准备：
  - `https://golden-crucible-saas-production.up.railway.app`

---

## 3. 回调地址怎么填

当前项目 Better Auth 的 auth base path 是：

```text
/api/auth
```

所以 provider 回调地址口径是：

```text
<站点根地址>/api/auth/callback/<provider>
```

当前建议你优先准备这两个：

- 微信生产回调：
  - `https://golden-crucible-saas-production.up.railway.app/api/auth/callback/wechat`
- Google 生产回调：
  - `https://golden-crucible-saas-production.up.railway.app/api/auth/callback/google`

本地开发可参考：

- `http://localhost:3004/api/auth/callback/wechat`
- `http://localhost:3004/api/auth/callback/google`

如果后面 Railway 正式域名更换，这两个地址也要同步改。

---

## 4. Railway 需要补的环境变量

### 4.1 微信

- `WECHAT_CLIENT_ID`
- `WECHAT_CLIENT_SECRET`

### 4.2 Google

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 4.3 已存在的基础变量

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

---

## 5. 微信这条需要特别知道的限制

- 当前项目按 `网站应用登录` 接，不是公众号登录，也不是企业微信登录。
- 这条链路天然适合二维码扫码授权。
- 微信用户资料通常不提供可用邮箱。
- 因此账号体系不能依赖“微信返回邮箱”做主键。
- 当前我们会把它当作独立 social account 接入，再绑定到平台用户。

---

## 6. 你去开放平台时建议逐项确认

- 网站应用是否已创建完成
- 网站应用审核状态是否已通过
- 回调域名是否已登记
- 回调地址是否与生产域一致
- `AppID / AppSecret` 是否是这个网站应用专用，而不是别的项目复用的
- 登录能力是否明确是“网站应用扫码登录”

---

## 7. 当前项目侧已经预留好的内容

- 后端已预留 `Google` provider 配置位
- 后端已预留 `WeChat` provider 配置位
- 登录页已预留：
  - `Google 登录`
  - `微信扫码登录`
  - `邮箱注册 / 登录`
- `GET /api/account/status` 已会返回：
  - `googleEnabled`
  - `wechatEnabled`
  - `wechatMode: "qr"`

---

## 8. 你准备完之后我这边接着做什么

你把下面四个值准备好后，我就可以继续接线上 provider：

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `WECHAT_CLIENT_ID`
- `WECHAT_CLIENT_SECRET`

拿到之后，我会继续：

- 写入 Railway 环境变量
- 做一次真实 Google 登录 smoke
- 做一次真实微信扫码登录 smoke
- 校验首次登录自动创建 personal workspace
