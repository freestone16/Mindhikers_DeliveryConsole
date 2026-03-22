# MHSDC-DT | Distribution 开源借鉴映射表

> 日期：2026-03-22
> 分支：`MHSDC-DT`
> 目的：明确 `MIN-102 / MIN-103` 哪些能力优先借鉴开源项目，哪些只保留为 MHSDC 自己的胶水层，避免重复造轮子。

---

## 1. 结论先行

Distribution 下一阶段不再以“自己从零设计一整套多平台分发系统”为主，而是采用下面的硬原则：

1. `YouTube` 继续优先走 Google 官方 OAuth + 官方 API，不额外套第三方壳。
2. `MIN-102` 的队列、任务状态、平台结果语义，优先借鉴 `Mixpost / Postiz`。
3. `MIN-103` 的 `X` connector，优先借鉴 `Postiz / Mixpost`。
4. `MIN-103` 的 `微信公众号 / 新浪微博` 内容转换与草稿投递思路，优先借鉴 `Wechatsync`。
5. `MIN-103` 以及后续国内视频平台（B站、抖音、视频号）的无头上传骨架，优先借鉴 `social-auto-upload`。
6. 我们自己只保留：
   - 项目资产读取
   - MHSDC 的 `projectId` / 文件落盘协议
   - `Accounts Hub / Publish Composer / Queue` 这层 UI 壳
   - 统一结果模型
   - 平台 adapter / bridge

---

## 2. 借鉴映射总表

| 能力域 | 优先借鉴源 | 借鉴层 | 不做的事 | 我们自己负责 |
|---|---|---|---|---|
| YouTube OAuth / Upload | Google 官方 SDK / API | 授权、上传、返回结果 | 不为 YouTube 再套一层第三方抽象 | `projectId` 资产路径、结果落盘、UI 呈现、安全默认值 |
| 任务队列 / 状态模型 | Mixpost / Postiz | 队列生命周期、平台状态字段、重试/失败语义、账号池解耦思路 | 不搬整套 SaaS UI、计费、团队协作面板 | SSE、项目内 `06_Distribution/` 文件协议、队列页本地展示 |
| X / Twitter 发布 | Postiz / Mixpost | OAuth/token 校验、payload 组装、错误透传、最小发布动作 | 不从零发明 X 的发布抽象 | 把 MHSDC 文稿/营销产物组装成 connector 输入 |
| 微信公众号 / 微博图文 | Wechatsync | Markdown -> 平台草稿内容、正文格式适配、草稿箱写入思路 | 不在一期内硬上全自动群发 | 草稿物料落盘、人工兜底入口、统一结果状态 |
| B站 / 抖音 / 视频号上传 | social-auto-upload | Playwright 上传骨架、Cookie 持久化、登录态复用、表单填充序列 | 不自己重写整套反爬绕行脚本 | 任务调度、项目素材路径、结果回写、风控延时 |
| 前端信息架构 | Postiz / Mixpost 的产品结构思路 | 发布器字段结构、平台卡片组织、队列状态模型 | 不照抄视觉样式，不引入 SaaS 风格重面板 | 延续 MHSDC 现有视觉系统与模块入口 |

---

## 3. 分模块执行口径

## 3.1 MIN-102

`MIN-102` 的核心不是“先发明一套 SSE 事件名”，而是先把任务状态语义与队列模型对齐到成熟产品的最小共识。

优先借鉴：
- `Mixpost / Postiz` 的任务生命周期
- `created / queued / processing / success / failed / retryable` 这类状态分层
- 平台结果单元和总任务状态分离的建模方式

我们自己保留：
- 事件通道仍然用当前仓库的 `SSE`，不搬第三方消息系统
- 事件里必须带 `projectId`
- 所有结果仍落到 `<ProjectRoot>/06_Distribution/`

## 3.2 MIN-103

`MIN-103` 不再允许“X / 微信公众号 / 国内视频平台各写一套新的自定义 connector 模型”，而是先确定借鉴对象：

- `X`
  - 借鉴 `Postiz / Mixpost`
  - 抄 token 校验、payload 组装、执行结果语义
- `微信公众号 / 新浪微博`
  - 借鉴 `Wechatsync`
  - 抄 Markdown 转换与草稿写入思路
- `B站 / 抖音 / 视频号`
  - 借鉴 `social-auto-upload`
  - 抄浏览器自动上传骨架与 Cookie 复用

---

## 4. 前端借鉴边界

前端也要借鉴，但只借鉴“信息架构”和“交互层级”，不借鉴整站视觉。

可以借鉴的点：
- `Publish Composer` 的字段分层：
  - 全局文案
  - 平台定制文案
  - 平台选择
  - 定时/立即策略
- `Queue` 的卡片语义：
  - 总任务状态
  - 平台子结果
  - 最近错误
  - 快捷动作
- `Accounts Hub` 的账号状态分层：
  - connected
  - expired
  - needs_refresh
  - draft_ready

不借鉴的点：
- 不搬整套 SaaS dashboard
- 不新增多余的分析图表、团队面板、订阅/计费结构
- 不为“看起来像平台产品”而增加与 MHSDC 无关的 UI

---

## 5. 后端借鉴边界

后端借鉴只到“模型 + 执行动作 + 错误语义”为止，不引入大型异构基础设施。

明确不做：
- 不为了追求和 `Mixpost / Postiz` 一样，强行引入完整数据库 schema
- 不为了照搬 `social-auto-upload`，把整个外部项目直接塞进仓库根部运行
- 不为了追求全自动，跳过一期的人工兜底物料模式

明确要做：
- 只提取最小 connector / uploader / formatter 能力
- 全部通过 MHSDC 自己的 adapter 暴露给 `distribution-execution-service`
- 所有输入输出继续对齐 `DistributionTask` / `DistributionPlatformResult`

---

## 6. 我们自己的胶水层清单

这部分不能抄，必须自己写：

1. `projectId -> 项目根目录 -> 06_Distribution/` 的路径解析
2. `Publish Composer` 对真实项目资产的读取
3. `distribution_queue.json / distribution_history.json / publish_packages/` 的落盘协议
4. `Accounts Hub / Publish Composer / Queue` 三页与现有 Console 宿主的接线
5. `MIN-101` 已经补上的安全边界：
   - YouTube 默认 `private`
   - OAuth token 本地落盘
   - 成功回写不被后续持久化错误误改成失败

---

## 7. 推荐实施顺序

1. 先按本映射表重写 `MIN-102 / MIN-103` 文档口径
2. `MIN-102` 先对齐 `Mixpost / Postiz` 的队列状态模型，再做 `SSE`
3. `MIN-103` 先做 `Magic Fill` 数据源收口
4. 再做 `X`
5. 再做 `微信公众号`
6. 国内视频平台上传骨架留作 `MIN-103` 后半段或下一里程碑

---

## 8. 当前决策

当前可以直接执行的工程决策如下：

1. `MIN-102`：不自己发明队列字段，先对齐 `Mixpost / Postiz` 的最小任务模型。
2. `MIN-103`：`X` 先抄 `Postiz / Mixpost`；`微信公众号` 先抄 `Wechatsync`。
3. `social-auto-upload` 暂不在本轮直接接入代码，但在 `MIN-103` 文档里要提前把接口位留出来。

---

## 9. Connector 输入 / 输出 / 错误语义

| Connector | 输入 | 成功输出 | 失败语义 | 借鉴层 |
|---|---|---|---|---|
| `x-connector` | `title / textDraft / tags / sourceFiles / platformOverrides.twitter` | `status=success` + `deliveryMode=artifact_ready` + `outbound/x/x-<taskId>.json` | `twitter` 未连接时直接报 `Platform auth not ready for twitter: <status>` | 借鉴 `Postiz / Mixpost` 的 auth gating、payload 组装、可读 message |
| `wechat-mp-connector` | `title / summary / textDraft / mediaUrl / sourceFiles / platformOverrides.wechat_mp` | `status=success` + `deliveryMode=draft_ready` + `outbound/wechat_mp/wechat-mp-<taskId>.json/.md` | 缺少正文时报 `Missing article body for wechat_mp draft`；auth 未就绪时报 `Platform auth not ready for wechat_mp: <status>` | 借鉴 `Wechatsync` 的 draft-ready 与 Markdown 物料思路 |
