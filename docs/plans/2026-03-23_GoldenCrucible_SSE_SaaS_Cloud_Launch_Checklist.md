# 2026-03-23 黄金坩埚 SSE 轻量 SaaS 上云实施清单

> 日期：2026-03-23
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 状态：实施清单 / 供新窗口直接执行
> 作者：Codex（按 OldYang + project-lifecycle-governance 协议落盘）

---

## 1. Current State

### 1.1 已经完成的部分

1. 黄金坩埚主链已经收口到 `HTTP + SSE`
2. `POST /api/crucible/turn/stream` 已存在，前端已通过 SSE 消费回合结果
3. 坩埚业务判断已经收回苏格拉底 skill
4. 宿主层当前只负责：
   - 收请求
   - 提供上下文
   - 回传结果
   - 写 turn log
5. 本地主链最贴近本次改动的回归已通过：
   - `src/__tests__/crucible-prompt.test.ts`
   - `src/components/crucible/sse.test.ts`

### 1.2 代码现场仍然存在的 SaaS 阻塞

1. 当前前端默认仍是 Delivery Console 宿主，不是 SaaS app 外壳
2. 坩埚入口仍挂在整仓 App 内，未切成“只保留 Crucible”的在线宿主
3. `projectId` / `scriptPath` 仍然穿透到坩埚请求与日志链路
4. 会话快照目前仍主要依赖浏览器 `localStorage`
5. 运行时虽然已支持 `VITE_API_BASE_URL`，但仓库里还没有明确的 Railway / Vercel / 腾讯云正式部署配置
6. `npm run build` 仍被市场模块和旧 `DeliveryState` 类型债阻塞，说明若继续沿用整仓构建，上云会被 unrelated 模块拖住

### 1.3 当前最重要的判断

这次上云不应该再按“把整个 Delivery Console 搬上去”的思路做，而应该按：

**把当前 SSE 版黄金坩埚抽成一个轻量在线宿主，优先服务朋友 / 合作方 / 投资人演示。**

---

## 2. Target Structure

### 2.1 这次要上线的目标形态

本轮只上线一个轻量 SaaS Demo：

1. 一个可访问的 app 入口
2. 只保留黄金坩埚对谈与黑板
3. 支持最小会话恢复
4. 支持最小错误提示与重置
5. 支持少量受控外部访问

### 2.2 这次明确不上云的内容

1. Delivery / Distribution / Director / Shorts 整套宿主
2. Roundtable
3. 支付
4. 正式多租户
5. 完整账号系统
6. 重型审计后台

### 2.3 推荐部署形态

当前最稳的默认路线仍然是：

1. Homepage：继续独立处理
2. Crucible App：单独轻量服务
3. App 运行环境优先选择：
   - 路线 A：`Railway` 单服务
   - 路线 B：`腾讯云 Lighthouse / CVM（中国香港优先）`

不建议把本轮第一刀直接压成“全 Vercel 纯函数化改造”。

---

## 3. Execution Or Migration Plan

## 3.1 阶段 0：范围冻结与部署决策

### 目标

在动手前，把“这次上云到底上线什么”彻底锁死。

### 清单

1. 明确本轮产品身份：
   - `demo`
   - `beta`
   - `invite-only`
2. 明确访问方式：
   - 公开可访问
   - 邀请链接
   - 口令进入
3. 明确运行平台：
   - `Railway`
   - `香港 Lighthouse / CVM`
4. 明确域名口径：
   - 是否已有 `app.mindhikers.com`
   - 是否先用 preview/staging 域名
5. 明确演示优先级：
   - 朋友演示
   - 投资人演示
6. 明确这轮不做登录，只做最小 guest session

### 完成标准

1. 平台选型拍板
2. 域名口径拍板
3. 访问控制方式拍板
4. “本轮不上云的内容”被冻结，不再膨胀范围

---

## 3.2 阶段 1：抽出 SaaS Demo 外壳

### 目标

把当前仓库里的黄金坩埚，从 Delivery Console 宿主中抽成一个“只做 Crucible”的在线入口。

### 清单

1. 新增 SaaS 启动模式或独立入口
2. 前端默认直接进入 Crucible，不再停留在 Delivery 模块导航
3. 隐藏或移除以下入口：
   - Delivery
   - Distribution
   - Director
   - Shorts
   - Marketing
4. 保留 SaaS 页面最小 UI：
   - 标题区
   - 对话区
   - 黑板区
   - 重置
   - 最小导出
   - 体面错误提示
5. 补一段 demo onboarding：
   - 这是实验版
   - 适合怎样的问题
   - 如何开始第一轮对话

### 完成标准

1. 打开 app 后默认就是黄金坩埚
2. 用户不需要理解 Delivery Console 语义
3. 没有无关模块把外部演示人带偏

---

## 3.3 阶段 2：切断本地工程目录依赖

### 目标

让黄金坩埚基础对谈不再绑定本地项目目录语义。

### 清单

1. 梳理当前坩埚链路中还依赖 `projectId` 的位置
2. 梳理当前坩埚链路中还依赖 `scriptPath` 的位置
3. 区分两类字段：
   - 运行时真正需要的 session identity
   - 只是本地开发时代遗留的目录 identity
4. 为 SaaS 版引入最小 session id
5. 把 turn log / preview cache / snapshot 之类的目录命名，改为基于 session identity，而不是工程 projectId
6. 确保 guest session 也能跑完整坩埚回合

### 完成标准

1. 不传本地工程 `projectId / scriptPath` 也能对谈
2. SaaS 版的 session identity 清楚、稳定、可恢复
3. 不再把线上会话绑到本地项目目录语义

---

## 3.4 阶段 3：最小持久化

### 目标

把“浏览器 localStorage 单点保存”升级为最小线上可用持久化。

### 清单

1. 明确最小持久化对象：
   - session 元数据
   - messages
   - presentables
   - topicTitle
   - roundIndex
2. 明确最小持久化位置：
   - 路线 A：服务端文件持久化（仅 demo 期）
   - 路线 B：轻量数据库
3. 前端恢复逻辑改为：
   - 先读服务端 session
   - 再用 localStorage 作临时补充
4. 定义 session reset 语义
5. 定义 session 过期 / 清理策略

### 完成标准

1. 用户刷新后能恢复本次会话
2. 切换设备不要求支持，但同一浏览器至少不丢主线
3. 重置操作能明确清空线上 session

---

## 3.5 阶段 4：环境变量与运行时收口

### 目标

让线上部署拥有清晰、最小、可复现的环境口径。

### 清单

1. 整理 SaaS 版必须的环境变量：
   - `APP_BASE_URL`
   - `API_BASE_URL`
   - `CORS_ORIGIN`
   - `SESSION_SECRET`
   - LLM provider key
   - `VITE_API_BASE_URL`
2. 清理只属于本地 Delivery 宿主的环境耦合
3. 给出 SaaS 专用 `.env.example`
4. 明确 dev / staging / prod 三套口径是否需要分离
5. 明确服务启动命令、构建命令、健康检查命令

### 完成标准

1. 新环境只看文档即可启动
2. 不依赖本机历史环境残留
3. 前后端 API base 不再模糊

---

## 3.6 阶段 5：部署配置与首次上线

### 目标

把仓库变成可以真正部署的形态，而不是只有方案。

### 清单

1. 为选中的平台补正式部署配置
2. 如果走 Railway：
   - 明确 root command
   - 明确 build command
   - 明确 start command
   - 明确健康检查路径
3. 如果走香港服务器：
   - 明确 Node 运行方式
   - 明确反向代理
   - 明确 HTTPS
   - 明确守护进程
4. 配置 preview / staging 环境
5. 跑通首次部署
6. 用线上地址完成一轮真实对谈 smoke

### 完成标准

1. 线上地址可访问
2. 首页或临时入口能跳到 app
3. 一轮对谈可成功返回
4. 黑板可出现
5. 出错时不会白屏

---

## 3.7 阶段 6：演示验收与故障预案

### 目标

把“能访问”提升为“能拿给朋友和投资人稳定演示”。

### 清单

1. 准备 2 套演示脚本：
   - 朋友版
   - 投资人版
2. 准备 3 个预置 demo 议题
3. 准备 1 套失败时的兜底说法
4. 准备本地 fallback 演示路径
5. 准备 reset / retry / 刷新操作说明
6. 确认监控与日志最小可读

### 完成标准

1. 5 分钟内可完整演示一次
2. 演示失败时能迅速切本地备份
3. 用户不会看到 Delivery Console 杂质

---

## 4. Linear 简版步骤

### 4.1 已完成 issue

#### `MIN-104` `Crucible SSE Refactor And Acceptance`

这张卡可以关闭，关闭口径应写清楚：

1. 坩埚主链已改为 `HTTP + SSE`
2. `POST /api/crucible/turn/stream` 已落地
3. 前端已改为 SSE 消费
4. 相关回归已通过
5. 当前坩埚主链已不再依赖 `Socket.IO` 才能成立

### 4.2 下一步 issue 简版执行顺序

#### `MIN-105` `Crucible SaaS Architecture Environment And Launch`

Linear 里保持简单清晰即可：

1. 抽 SaaS 外壳
2. 切断本地依赖
3. 做最小 session 持久化
4. 补环境变量与部署配置
5. 跑通 preview / staging
6. 完成线上 smoke

#### `MIN-106` `Crucible Roundtable Branch Local SaaS Sync And Merge`

本轮不关闭，也不提前推进实现，只保留：

1. 等 SaaS 宿主跑起来
2. 再开 Roundtable 分支
3. 强制本地版与 SaaS 版共享合同
4. 双宿主验收后再合并

#### `MIN-94` `Crucible SSE / SaaS / Roundtable Tranche`

保持打开，作为总协调卡：

1. `MIN-104` 关闭后，主线重心自动切到 `MIN-105`
2. `MIN-105` 完成前，不应把 `MIN-94` 关闭
3. `MIN-106` 仍作为后续同步线保留

---

## 5. Open Questions

1. 本轮最终走 `Railway` 还是 `香港 Lighthouse / CVM`？
2. `app.mindhikers.com` 是否已经可用？
3. 这轮是否需要 staging 域名？
4. 访问控制是公开 demo、邀请码还是口令？
5. 最小持久化先用文件还是直接上数据库？
6. 首页这轮是否已经有可跳转入口，还是先单独上线 app？

---

## 6. 一句话执行结论

**下一窗口不要再讨论“大而全 SaaS”，而是直接把当前 SSE 版黄金坩埚抽成一个轻量在线宿主，先跑通少量朋友与投资人的稳定演示路径。**
