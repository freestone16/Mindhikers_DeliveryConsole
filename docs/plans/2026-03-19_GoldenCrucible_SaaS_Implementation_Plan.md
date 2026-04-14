# 2026-03-19 黄金坩埚 SaaS Demo 实施方案

> 日期：2026-03-19
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 目标上线窗口：**2026-03-21（周六）至 2026-03-22（周日）**
> 状态：执行方案 / 供新窗口直接进入开发部署
> 作者：Codex（按 OldYang + project-lifecycle-governance 协议落盘）

> 2026-03-22 补充：当前执行主线已进一步收束为 `SSE / SaaS / Roundtable` 三项，若与本文冲突，请以 [2026-03-22_GoldenCrucible_SSE_SaaS_Roundtable_Execution_Plan.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-22_GoldenCrucible_SSE_SaaS_Roundtable_Execution_Plan.md) 为准。

---

## 1. Current State

### 1.1 已有基础

黄金坩埚本地 `Phase 1-dev` 已完成，对应 `MIN-38` 已收口。

当前已成立的基础包括：

1. `Socrates -> Bridge -> UI` 主链已可运行
2. 中屏黑板与右侧对话分离已成立
3. `dialogue + presentables + turn_log` 已进入真实运行时
4. Soul registry / 默认双灵魂 / 最小 orchestrator 骨架已落地
5. 当前本地版已可作为 SaaS Demo 的稳定内核

### 1.2 当前产品目标

本轮目标不是做完整 SaaS，而是做一个 **对外可演示的 SaaS Demo**：

1. 给朋友演示
2. 给合作方演示
3. 给投资人演示
4. 与 homepage 在本周末共同上线

### 1.3 当前真正的约束

当前仓库仍然是 Delivery Console 宿主结构，和真正的 SaaS App 之间还有三层差异：

1. **宿主壳过重**
   - 当前前端仍包含 Delivery / Distribution / 多专家工作台
2. **本地文件系统思维过重**
   - 存在 `projectId / scriptPath / PROJECTS_BASE / delivery_store.json` 等本地宿主依赖
3. **通信层偏本地长连接**
   - 当前大量使用 Express + Socket.IO，和标准 Vercel Hobby 部署模型不完全匹配

---

## 2. Vercel Hobby 约束判断

以下内容基于 **2026-03-19** 查到的 Vercel 官方文档：

1. **Vercel Functions 不能作为 WebSocket server**
   - 官方 limits 文档明确写明：`Vercel Functions do not support acting as a WebSocket server.`
2. **函数时长需要区分是否启用 Fluid Compute**
   - 若启用 Fluid Compute，Hobby 计划 Node.js function 默认/上限都可到 **300 秒**
   - 若项目仍是旧口径，Hobby 默认仅 **10 秒**，最大 **60 秒**
3. **Hobby 每日部署次数有限**
   - 当前文档显示为 **100 deployments / day**

对本项目的直接含义是：

1. **不能把当前 Socket.IO 架构原样搬到 Vercel Hobby**
2. 苏格拉底如果一轮十几秒返回，**函数时长本身不是第一障碍**
3. 真正的第一障碍是：
   - WebSocket 不支持
   - 现有服务端过于依赖单体 Express 宿主

因此，本周不能把“是否能在 10 秒内返回”当成核心判断条件。

---

## 3. Target Structure

### 3.1 本周目标结构

本周末上线的目标结构应为：

1. `mindhikers.com`
   - 品牌 homepage
   - 主 CTA 指向 app
2. `app.mindhikers.com`
   - Golden Crucible SaaS Demo
   - 只保留坩埚对谈与黑板体验
   - 不暴露 Delivery / Distribution / Director / Shorts 等宿主模块

### 3.2 本周推荐部署策略

本周推荐采用：

### 路线 A（推荐，成功率最高）

1. Homepage 上 **Vercel Hobby**
2. Crucible App 上 **Railway**

理由：

1. 现有 Express + Socket.IO + 文件式运行时更容易复用
2. 周末前不必同时完成“产品抽壳 + 通信层重写”
3. 可以把“云端 app 已上线”先做成真实演示结果

### 路线 B（可做，但不推荐作为本周默认）

1. Homepage 上 Vercel Hobby
2. Crucible App 也上 Vercel Hobby

前提：

1. 不再依赖 Socket.IO
2. 将关键交互收束为 HTTP / SSE
3. 将最小状态持久化改为数据库或轻量服务端存储

结论：

**如果目标是本周末稳定上线演示，建议默认走 路线 A。**

### 3.3 国内云厂商替代路径（2026-03-19 补充）

如果优先考虑：

1. 国内支付与结算方便
2. 国内控制台与售后支持
3. 后续面向中国大陆访问优化

则当前更值得考虑的国内替代组合是：

### 方案 C（国内云优先，推荐优先看腾讯云）

#### C1. 海外访客优先的更稳组合

1. Homepage：**腾讯云 EdgeOne Pages**
2. Crucible App：**腾讯云 Lighthouse / CVM（优先中国香港）**

原因：

1. `EdgeOne Pages` 已提供较接近 Vercel 的体验
   - Git 仓库接入
   - 自定义构建
   - 自定义域名
   - 自动 SSL
2. 如果本周 demo 需要兼顾：
   - 美国
   - 加拿大
   - 中国香港
   - 中国台湾
3. 那么把 app runtime 放在 **中国香港或境外地域的轻量服务器 / CVM** 会更稳
   - 更接近当前 Express / Socket.IO 原始运行方式
   - 不需要为了函数平台或托管平台做额外通信层改造
   - 对海外访问延迟和跨境稳定性更友好

#### C2. CloudBase 云托管仍可作为备选

1. Homepage：**腾讯云 EdgeOne Pages**
2. Crucible App：**腾讯云 CloudBase 云托管**

补充判断：

1. `CloudBase 云托管` 仍然是很像 Railway 的产品形态
   - 支持代码、镜像、Git、CLI 多种部署
   - 适合 Node.js / Express 类容器化服务
2. 但按 2026-03-19 查到的官方文档，当前有两个现实约束：
   - **支持地域：上海**
   - **请求超时时间：60s**
3. 同时，CloudBase 文档写明 HTTP 访问服务默认提供的是**中国大陆地区 CDN 加速**；如果需要全球加速，需要额外接入自定义 CDN / EdgeOne
4. 因此它更适合：
   - 以中国大陆访问为主
   - 或可以接受“通过额外 CDN/加速层补齐海外访问”的场景
5. 如果本周末的朋友与投资人里，海外用户占比不低，则它不再是最稳妥的默认路径

### 方案 D（阿里云可做，但不作为本周首推）

1. Homepage：可用 OSS 静态站 / 轻量应用服务器
2. Crucible App：可用 **函数计算** 或 **轻量应用服务器**

当前判断：

1. 阿里云 `函数计算` 可以承接 HTTP Web 应用
   - 官方支持自定义运行时、监听端口、单实例多并发
   - 支持绑定自定义域名
2. 但从本周“快速可演示上线”的角度看，它更像：
   - **函数平台 / Web 函数平台**
   - 而不是“直接替代当前 Express runtime 的最短路径”
3. 阿里云 `轻量应用服务器` 更容易理解
   - 很适合小型网站、小型应用
   - 但它更像轻量 VPS，而不是 Vercel 式开发体验

### 当前推荐顺序

如果你现在就想把“国外平台依赖”降到最低，我建议优先级是：

1. **腾讯云 EdgeOne Pages + Lighthouse / CVM（中国香港优先）**
2. **Homepage 上 Vercel，App 上 Railway**
3. **腾讯云 EdgeOne Pages + CloudBase 云托管（需要接受上海地域 + 额外全球加速补齐）**
4. **阿里云函数计算 / 轻量应用服务器 / SAE**

一句话判断：

**如果要兼顾美国/加拿大/香港/台湾访问，腾讯云更稳的周末 demo 组合其实是 EdgeOne + 香港轻量服务器，而不是默认把 app 放进 CloudBase 云托管。**

### 3.4 本周明确不做

1. 不做 Roundtable 本地版
2. 不做 Roundtable Phase 2 云端 runtime
3. 不做支付
4. 不做正式多用户体系
5. 不做完整 Soul Evidence / Delta 闭环
6. 不做整仓 Delivery Console 云化

---

## 4. Execution / Migration Plan

## 4.1 Step 1：抽出 SaaS Demo 外壳

### 目标

把当前坩埚能力从 Delivery Console 宿主中切成一个可单独上线的 app surface。

### 需要做

1. 前端默认只进入 Golden Crucible
2. 隐藏 Delivery / Distribution / 多专家复杂入口
3. 保留：
   - 对话面板
   - 中屏黑板
   - 重置
   - 导出
   - 最小 demo welcome 提示

### 本质

这是一次 **抽壳**，不是重写坩埚核心。

---

## 4.2 Step 2：收掉本地宿主依赖

### 目标

让 SaaS Demo 不再依赖本地工程项目语义。

### 需要做

1. 降低对 `projectId` 的强依赖
2. 不再依赖本地 `scriptPath`
3. 让 guest session 也能跑坩埚
4. 将 `localStorage` 快照与服务端最小会话保存区分开

### 建议最低实现

1. guest session id
2. 单会话 messages / presentables 保存
3. 基本重置与恢复

---

## 4.3 Step 3：部署策略落地

### 路线 A（本周推荐）

#### Homepage

1. 静态站
2. Vercel Hobby
3. 负责品牌、叙事、CTA

#### App

1. Railway 单服务
2. 复用 Express runtime
3. 绑定 `app.mindhikers.com`
4. 通过环境变量配置模型、域名与 API

### 路线 B（仅当你明确要全上 Vercel）

需追加一个平台适配工作包：

1. 去 Socket.IO
2. 改 HTTP / SSE
3. 压缩运行时宿主
4. 评估函数打包尺寸与部署频率

---

## 4.4 Step 4：Homepage 与 App 联调

### 目标

确保周末不是“两个东西分别在线”，而是一次联合发布。

### 需要做

1. Homepage CTA 指向 `app.mindhikers.com`
2. 首页与 app 的命名、文案、beta 身份保持一致
3. 至少准备两条 demo 入口：
   - 朋友演示
   - 投资人演示

---

## 4.5 Step 5：上线验收与回滚

### 最低验收标准

1. Homepage 可访问
2. App 可访问
3. 首次进入不白屏
4. 能成功发起一轮坩埚对谈
5. 中屏 presentables 正常显示
6. 失败时有体面报错

### 回滚准备

1. 线上 demo 挂掉时，保留本地版备用演示路径
2. Homepage 即便 app 暂时异常，也不应整体下线

---

## 5. Linear Mapping

本轮建议在 `Code Nemesis` Project 下新增一个 launch 父任务：

### Parent Issue

- `Crucible Phase 1-launch`

它只负责：

1. SaaS Demo 抽壳
2. 部署与环境
3. Homepage 联调
4. 周末上线验收

它不负责：

1. 本地 Phase 1-dev
2. Roundtable Phase 2
3. Soul 长期演化闭环

### 推荐子任务

1. `Crucible SaaS Demo Shell Extraction`
2. `Crucible SaaS Runtime & Guest Session`
3. `Crucible Deploy Path: Vercel Hobby Constraints / Railway Decision`
4. `Homepage -> App Joint Launch Contract`
5. `Weekend Launch Smoke / Rollback / Demo Script`

---

## 6. Open Questions

以下问题建议在新窗口开始开发前尽快拍板：

1. 本周 app 是否默认走 Railway，而不是强上 Vercel
2. guest 体验是否足够，还是必须加最小邮箱登录
3. 网络搜索能力本周是否开启
4. app 是否需要 `staging` 与 `prod` 双环境
5. Homepage 文案是否明确标注 `demo / beta / experiment`

---

## 7. 一句话执行结论

**本周末要的是“可演示 SaaS”，不是“标准 SaaS 毕业作品”。**

因此最稳的路径是：

**Homepage 上 Vercel Hobby，Crucible App 先上 Railway；先把坩埚核心抽壳上线，再把 Vercel 纯化和 Roundtable 云端 runtime 留给后续阶段。**
