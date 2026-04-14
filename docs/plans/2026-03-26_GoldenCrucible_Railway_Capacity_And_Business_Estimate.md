# 2026-03-26 GoldenCrucible Railway 承载量与业务预估

> 日期：2026-03-26
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 状态：讨论纪要 / SaaS 推进前的业务量估算口径
> 作者：Codex（按 OldYang 协议落盘）

---

## 1. 这份文档解决什么问题

本轮讨论的核心不是“Railway 理论上能给多大机器”，而是：

1. 当前 `Hobby` 和 `Pro` 的费用口径是什么
2. 基于当前 SSE 代码现场，**真实可承载的业务量**大概在哪个区间
3. 到什么业务当量时，不该再靠“加档位”硬扛，而该做较大的架构调整

这份文档的默认前提，是后续继续按：

- `docs/plans/2026-03-26_GoldenCrucible_SSE_Multi_Account_Research_and_Plan.md`

推进 SaaS 开发。

---

## 2. 当前架构前提

从当前仓库现场看，相关约束非常明确：

1. 后端是 `Express 5 + TypeScript`
2. 前端是 `React 19 + Vite 7`
3. 仍属于**单体宿主**
4. 历史上有强烈的本地文件系统 / `runtime/` / `projectId` 语义
5. `server/index.ts` 仍同时挂着 Crucible、Director、Shorts、Market 等多条业务线

因此，这里的业务量估算默认都基于一个重要裁剪：

**SaaS 首批只上线 `Crucible 文本主链 + auth/session/workspace`，不把媒体重任务一起上云。**

---

## 3. Railway 当前费用口径

> 口径基于 2026-03-26 当天查阅 Railway 官方公开页面。

### 3.1 Hobby

1. `$5/月`
2. 含 `$5` usage credit
3. 资源按实际使用计费

### 3.2 Pro

1. `$20/月`
2. 含 `$20` usage credit
3. 资源按实际使用计费

### 3.3 公开资源单价

1. `RAM: $10 / GB / 月`
2. `CPU: $20 / vCPU / 月`
3. `Volume: $0.15 / GB / 月`
4. `Network egress: $0.05 / GB`

### 3.4 当前结论

对你们现阶段来说，问题不在于：

- 能不能买得起 `Pro`

而在于：

- 当前应用结构是否值得继续靠单体扩张

---

## 4. 按业务形态看，不按机器看

### 4.1 如果只做 Crucible 文本 SaaS

这里的瓶颈主要是：

1. LLM 上游延迟
2. session / workspace 状态管理
3. SSE 长连接数量
4. 是否还混着本地 runtime 语义

此时 Railway 机器本身通常不是第一瓶颈。

### 4.2 如果把 Director / Shorts / Remotion 也带上来

瓶颈会立刻变成：

1. CPU
2. 内存
3. 磁盘 IO
4. 上传 / 渲染 / 临时文件管理

这时无论 Hobby 还是 Pro，都不应该再靠“同一个在线主服务”硬扛。

---

## 5. 当前可承载的业务量估算

## 5.1 Hobby 口径

如果按最克制的方案执行：

1. 只上线 `Crucible`
2. 只做文本 / SSE
3. 不上线媒体任务
4. auth / session / workspace 逐步数据库化

我建议把当前 Hobby 理解为：

### 安全上线区间

1. `50-200` 注册用户
2. `10-40` 日活
3. `3-10` 个同时活跃对话用户
4. 适合邀请制内测、朋友演示、合作方小范围试用

### 不建议再继续硬顶的区间

1. 持续超过 `10` 个同时活跃对话用户
2. 日活稳定超过 `50-80`
3. 需要更明确的线上可用性承诺

此时不一定要立刻大改架构，但至少不应再把 Hobby 当长期稳态方案。

---

## 5.2 Pro 口径

如果升级到 `Pro`，但产品范围仍然保持克制：

1. 只做 `Crucible 文本主链`
2. 不混跑 Director / Remotion / Shorts
3. account / workspace 内核已基本收口

我给的保守估计是：

### 稳态 beta 区间

1. `500-2000` 注册用户
2. `100-500` 日活
3. `20-80` 个同时活跃文本对话用户
4. 足够支撑一轮小规模商业验证

### 为什么这里还能撑住

因为在这个产品形态下：

1. 业务主要是文本 IO
2. 状态主要是 session / conversation / artifact
3. 最贵的往往是上游 LLM，而不是 Node 进程本身

---

## 6. 到什么业务当量时，需要较大调整

这里不按“用户数绝对值”单独判断，而按**业务当量**判断。

## 6.1 第一条红线：在线文本产品成形

当满足下面任一条件时，就该做第一轮较大调整：

1. `20-30` 个稳定并发活跃对话用户
2. `300-500` 日活
3. 多 workspace 协作开始真实发生
4. 线上排障开始频繁被 `projectId / path / runtime` 历史语义拖慢

### 这轮调整要做什么

1. 把 conversation / artifact / autosave / session 全部数据库化
2. 把 `workspaceId` 变成唯一线上协作边界
3. 把 auth/workspace/RBAC 从业务杂糅代码里抽成独立 kernel
4. 把在线宿主与研发线遗留兼容逻辑分开

---

## 6.2 第二条红线：媒体任务想一起上线

下面这件事一旦发生，就不该再靠当前单体继续堆：

1. Director
2. Shorts
3. Remotion 渲染
4. 文件上传 + 生成 + 下载链路

### 这轮调整要做什么

1. 在线交互服务与重任务服务拆层
2. 引入异步 worker / queue
3. 文件与产物进入独立存储体系
4. 主交互服务只保留用户请求、session、编排和结果索引

这条红线和用户数无关，**哪怕用户还很少，只要把重媒体任务带上云，就该拆。**

---

## 6.3 第三条红线：公开生产站

当目标从“邀请制 beta”变成“公开正式站点”时，也需要较大调整。

### 触发信号

1. 开始承诺可用性
2. 开始做真实计费或对外 SLA
3. 开始需要更可控的观测、限流、审计

### 这轮调整要做什么

1. 更清晰的环境分层
2. 更严格的 secret / auth / audit 策略
3. 限流、告警、回滚与观测补齐
4. 根据流量决定是否加副本，而不是先加副本再找理由

---

## 7. 对当前决策最重要的判断

### 7.1 现在就该做的

1. 继续按多账号方案推进 `auth + workspace + RBAC`
2. 把 SaaS 范围严格收在 `Crucible 文本主链`
3. 把 `projectId / local path` 语义逐步迁掉

### 7.2 现在不该做的

1. 不要因为怕以后不够，就先把架构做重
2. 不要在首批 SaaS 里把重媒体模块一起带上云
3. 不要把“升级到 Pro”误当成“产品架构已经准备好了”

---

## 8. 一句话结论

**Hobby 足够做邀请制 beta，Pro 足够做小规模商业验证；真正需要大改架构的，不是“买更大档位”的时刻，而是“在线文本产品成形”以及“重媒体任务也想一起上线”的时刻。**

---

## 9. 主要参考

1. Railway Pricing Plans  
   https://docs.railway.com/pricing/plans
2. Railway Pricing  
   https://railway.com/pricing
3. 多账号主方案  
   `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-26_GoldenCrucible_SSE_Multi_Account_Research_and_Plan.md`
