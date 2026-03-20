# 2026-03-19 黄金坩埚 SaaS Demo 周末联合上线计划

> 日期：2026-03-19
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible`
> 目标上线窗口：**2026-03-21（周六）至 2026-03-22（周日）**
> 状态：执行计划 / 供本周冲刺直接使用
> 作者：Codex（按 OldYang + project-lifecycle-governance 协议落盘）

---

## 1. Current State

### 1.1 已知现状

1. 黄金坩埚 **本地 Phase 1-dev 已完成**
   - `MIN-38` 已按本地第一阶段开发父任务收口
   - 当前本地版已具备稳定的 `Socrates -> Bridge -> UI` 主链
2. 产品层第一阶段尚未完成
   - 仍缺一个可对外演示的 SaaS 版本
3. Homepage 正在由另一条线设计
   - 因此本周目标不是单点上线 app，而是 **homepage + app 共同上线**
4. 本周目标是 **演示上线**
   - 面向朋友、合作方、投资人
   - 不是大规模商用
   - 不以复杂账户体系或收费闭环为本周目标

### 1.2 当前最大风险

1. 当前仓库仍是 Delivery Console 宿主结构
   - 如果试图把整仓完整云化，会拖慢本周上线
2. 当前服务端高度依赖 Express + Socket.IO + 文件系统项目目录
   - 若本周同时做“全新云端架构”，风险偏高
3. Homepage 与 app 两条线并行
   - 若没有明确 joint launch contract，很容易一边好了，另一边没接上

---

## 2. Target Structure

### 2.1 本周目标结构

本周上线只做一套 **最小演示闭环**：

1. `mindhikers.com`
   - 品牌首页
   - 明确黄金坩埚定位
   - 一个主 CTA 进入 app
2. `app.mindhikers.com`
   - 黄金坩埚演示版 SaaS
   - 只保留对谈与黑板能力
   - 不暴露 Delivery / Distribution 等其他模块

### 2.2 本周推荐技术结构

为保证周末上线概率，推荐采用：

1. **Homepage**
   - 静态部署
   - 由 homepage 设计线独立推进
2. **Crucible App**
   - 单独部署为一个轻量 Node 服务
   - 优先走 **Railway** 路线
   - 尽量复用现有 Express + Socket.IO + Crucible runtime

推荐理由：

1. 现有坩埚核心已经成立，适合“抽壳”而不是“重写”
2. Railway 更贴近现有运行时，不需要本周把 Socket.IO 改成 SSE
3. 本周目标是 demo 可用，不是标准 SaaS 架构毕业设计

### 2.3 本周明确不做

1. 不做 Roundtable 多人讨论
2. 不做 Soul Evidence / Delta 真正闭环
3. 不做支付
4. 不做重型登录体系
5. 不做 Director / Shorts / Distribution 云化
6. 不做多项目切换产品化
7. 不做本地 Roundtable 先行版

---

## 3. Scope Freeze

### 3.1 本周 app 必须具备的能力

1. 用户能进入 app
2. 用户能发起一个议题
3. 用户能连续进行 3-5 轮深度对谈
4. 中屏能稳定展示黑板内容
5. 用户能重置、保存、导出最小结果
6. 出错时能给出体面提示，而不是白屏或静默失败

### 3.2 本周 app 可选能力

1. 匿名 guest session
2. 历史会话恢复
3. 简单 demo prompts
4. 简单使用说明

### 3.3 本周 homepage 必须具备的能力

1. 清楚说明黄金坩埚是什么
2. 清楚说明它解决什么问题
3. 有直达 app 的 CTA
4. 有一套可演示的品牌语义与视觉口径

---

## 4. Execution Plan

## 4.1 2026-03-19（周四）晚上：范围冻结与上线路径确认

### 目标

把本周末上线的战线压到最短。

### 必做

1. 锁定部署路径
   - Homepage 走静态站
   - App 走 Railway 单服务
2. 锁定 app 本周范围
   - 只保留 Golden Crucible
   - 隐藏其他模块入口
3. 锁定域名与发布口径
   - `mindhikers.com`
   - `app.mindhikers.com`
4. 锁定 demo 模式
   - 默认 guest / invite 体验
   - 暂不强制登录

### 今日产出

1. 本计划文档
2. 首页与 app 的 joint launch contract
3. App 最小范围清单

## 4.2 2026-03-20（周五）：App 抽壳与首个线上预览

### 目标

让 app 最晚在周五晚进入“可访问 preview”状态。

### 必做

1. 前端抽壳
   - 默认进入 Crucible
   - 隐藏 Delivery / Distribution / 多专家复杂入口
   - 保留黑板、聊天、重置、导出
2. 后端抽壳
   - 仅暴露坩埚必要接口
   - 屏蔽与 demo 无关的重型链路
3. 环境变量整理
   - 线上 API base
   - LLM provider
   - socket 域名
4. Railway 首次部署
   - 跑通基本访问
   - 跑通首轮对谈

### 当日验收

1. 远程打开 app 页面不白屏
2. 能成功发起一轮坩埚对谈
3. 中屏 presentables 能正常显示

## 4.3 2026-03-21（周六）：稳定性、演示体验、Homepage 联调

### 目标

把“能跑”变成“能拿给外人看”。

### 必做

1. 稳定性补丁
   - 错误提示
   - 超时与降级提示
   - 最小日志与 smoke test
2. 演示体验补丁
   - demo welcome 文案
   - 样例议题
   - 一键重置
   - 导出链路自测
3. Homepage 联调
   - CTA 跳转 app
   - 首页口径与 app 口径一致
   - 文案统一“演示版 / beta / demo”身份

### 当日验收

1. 首页能稳定跳到 app
2. 从首页进入后的首次体验完整
3. 至少跑通 3 个真实 demo 场景

## 4.4 2026-03-22（周日）：上线收口与演示准备

### 目标

把上线做成“可演示事件”，而不是“预览链接碰碰运气”。

### 必做

1. 正式域名切换
2. 最终 smoke
3. 演示脚本准备
   - 朋友演示版
   - 投资人演示版
4. 故障预案
   - 主 app 挂了时的 fallback
   - 本地版备用演示路径

### 当日验收

1. `mindhikers.com` 正常
2. `app.mindhikers.com` 正常
3. demo 路径 5 分钟内可完整演示
4. 至少有一套本地 fallback 方案

---

## 5. Launch Criteria

本周末只有满足下面 6 条，才算“共同上线成功”：

1. Homepage 可访问
2. App 可访问
3. 首页 CTA 可进入 app
4. App 首轮对谈可成功返回
5. 黑板内容可正常展示
6. 出现错误时用户能收到明确提示

---

## 6. Recommended Product Decision

为了把周末上线概率最大化，建议你本周采用以下决策：

1. **SaaS 本周只做 demo，不做正式 SaaS 完整形态**
2. **部署优先 Railway，不在本周强行切 Vercel SSE**
3. **不强制登录，先做 guest / invite 体验**
4. **不把 roundtable 混入本周上线范围**
5. **Homepage 与 app 的共同上线，目标是“品牌入口 + 真实体验入口”双到位**
6. **Roundtable 后续直接在云端 `Phase 2` runtime 上调试，不再做本地先行分支**

---

## 7. Open Questions

以下问题应在 2026-03-20（周五）前拍板，否则会影响周末上线概率：

1. guest 体验是否足够，还是必须有最小邮箱登录
2. demo 是否保留网络搜索能力，还是本周先关闭以换稳定性
3. 首页 CTA 是直接开放，还是邀请码 / 密码进入
4. 首页视觉口径是否强调“beta / demo / experiment”
5. 是否需要一个预置的 investor demo script
6. Roundtable Phase 2 是直接复用本周的云端 app 环境，还是另开一个 `staging` 子环境

---

## 8. 一句话执行结论

**这周不做“大而全 SaaS”，只做“Homepage + Crucible Demo App”联合发布。**

先把 `app.mindhikers.com` 做成可对外稳定演示的坩埚入口，再把 Roundtable、Soul 演化、正式登录与更完整商业化留到后续阶段。
