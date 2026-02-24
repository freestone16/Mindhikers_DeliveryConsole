# 🖥️ UI 原型设计：分发控制台 - 社交账号管家 (Accounts Hub)

> **所属模块**: [SD-302] Distribution Console
> **设计理念**: 极简深色工业风 (奥卡姆剃刀)，所见即所得。屏蔽底层复杂的 Cookie 驻留与 Playwright 实例管理，给用户最直观的授权体验。

---

## 1. 页面全景线框图 (Wireframe Layout)

**整体布局：左右双栏结构**
- 左侧小尺寸边栏：导航菜单 (Dashboard | **Accounts Hub** | Publish Composer | Queue)
- 右侧主工作区：三大圈层（图文、长轴、竖屏）的社交账号聚合看板。

```text
+---------------------------------------------------------------------------------+
|  [Menu]                             Accounts Hub (全局账号中心)                 |
|                                                                                 |
|  * Dashboard                        +-----------------------------------------+ |
|  * Accounts Hub (Active)            | 📌 A类：图文阵地 (Micro-Blogging)       | |
|  * Composer                         +-----------------------------------------+ |
|  * Queue Tracker                    | [X / Twitter]  Status: 🟢 Connected     | |
|                                     |                Target: @MindHikers      | |
|                                     |                [ Re-Auth (OAuth) ]      | |
|                                     |                                         | |
|                                     | [新浪微博]     Status: 🔴 Expired       | |
|                                     |                [ Scan QR (扫码更新) ]   | |
|                                     |                                         | |
|                                     | [微信公众号]   Status: 🟢 Draft Ready   | |
|                                     |                Target: 黄金坩埚研究所     | |
|                                     |                [ Edit Token/AppID ]     | |
|                                     +-----------------------------------------+ |
|                                                                                 |
|                                     +-----------------------------------------+ |
|                                     | 📺 B类：长轴纵深 (Long-form Video)      | |
|                                     +-----------------------------------------+ |
|                                     | [YouTube]      Status: 🟢 Authenticated | |
|                                     |                Target: MindHikers Main  | |
|                                     |                [ Manage / Revoke ]      | |
|                                     |                                         | |
|                                     | [Bilibili]     Status: 🟢 Cookie Live   | |
|                                     |                Target: 老卢的B站号      | |
|                                     |                [ Update Cookie (QR) ]   | |
|                                     +-----------------------------------------+ |
|                                                                                 |
|                                     +-----------------------------------------+ |
|                                     | 📱 C类：竖屏池 (Shorts / Reels)         | |
|                                     +-----------------------------------------+ |
|                                     | [YT Shorts]    Linked to YouTube App    | |
|                                     |                                         | |
|                                     | [抖音]         Status: 🟡 Needs Refresh | |
|                                     |                [ Scan QR (扫码刷新) ]   | |
|                                     |                                         | |
|                                     | [微信视频号]   Status: 🔴 Offline       | |
|                                     |                [ Scan QR (驻留后台) ]   | |
|                                     +-----------------------------------------+ |
+---------------------------------------------------------------------------------+
```

---

## 2. 核心交互状态盘点 (8 大平台全覆盖)

是的，本设计**完全囊括了上一阶段谈到的所有中国国内及海外平台**。但因为底层的授权技术不同（API vs. 无头浏览器），用户在前端的交互会被我们分为两类：

### 模式 I：原生 API 授权 (OAuth / AppKey)
- **适用平台**：X (Twitter), YouTube (包含 Shorts), 微信公众号 (针对草稿箱接口)。
- **交互动作**：
  1. 点击 `[ Authorize ]`。
  2. 弹窗重定向到 Google / X 的官方授权页面，或者弹窗输入微信公众号的 AppID/Secret。
  3. 授权完成，状态变为 `🟢 Connected`。

### 模式 II：无头浏览器扫码驻留 (Playwright + Cookie)
- **适用平台**：Bilibili (B站), 抖音, 微信视频号, 新浪微博。
- **背景依据**：国内平台防抓取严厉，不放开官方自动上传 API。我们通过底层集成 `social-auto-upload` 等库，用无头浏览器解决。
- **极简交互动作** (这是本页面的亮眼设计)：
  1. 用户点击 `[ Scan QR ]`。
  2. Node.js 后台拉起无头浏览器（Playwright），访问 B 站或抖音创作者平台，截取登录二维码。
  3. 前端界面弹出一个 Modal 对话框，**展示提取到的二维码**。
  4. 老卢用手机 App 扫码确认登录。
  5. 无头浏览器检测登录成功，提取 Cookie 并保存进全局的 `auth.json`。
  6. 前端对话框关掉，状态变为 `🟢 Cookie Live`（有效居留）。

---

## 3. 安全告警与风控 (The Red Lights)

基于“尽可能安全、容易维护”的原则：
- **状态轮询**：系统每天自动静默检查一次所有 Cookie/Token 的存活性。
- **断联拦截**：如果比如抖音的 Cookie 掉了（变成 🔴 Offline），在 `Composer (提稿机)` 页面发起多平台发布时，抖音渠道会被置灰禁止选择，并在提稿机提示：“请先回 Accounts Hub 扫码恢复抖音授权”。
- **绝对隔离**：绝不强求用户手输账号密码。API 走 Token，国内走手机 App 扫码。最安全、最符合现代防风控策略。

---
> **交给 GLM-5 的构建要求：**
> 该页面是一个纯粹的状态监控与配置交互盘。只需要读取后端的 `/api/auth/status` 接口，渲染这 8 个卡片的组件即可。遇到需要出示二维码的动作，通过 WebScoket 将后端截获的 base64 图片推给前端 Modal。
