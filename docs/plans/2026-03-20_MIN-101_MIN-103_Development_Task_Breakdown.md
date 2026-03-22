# MHSDC-DT | MIN-101 ~ MIN-103 开发任务拆解与测试清单

> 日期：2026-03-22
> 分支：`MHSDC-DT`
> 适用范围：Distribution Terminal 下一阶段连续开发
> 依据：
> - `docs/dev_logs/HANDOFF.md`
> - `docs/plans/2026-03-20_MHSDC_DT_Overall_Design_and_Phase1_Implementation_Plan.md`
> - `docs/plans/2026-03-22_Distribution_OSS_Borrowing_Map.md`
> - Linear: `MIN-101` / `MIN-102` / `MIN-103`

---

## 1. 总体执行建议

### 1.1 推荐顺序

1. **MIN-101**
   已完成。`TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path` 已证明真实 YouTube success-path、私密上传、安全回写与报告闭环成立。
2. **开源借鉴映射表**
   先明确 `Mixpost / Postiz / Wechatsync / social-auto-upload` 各自负责哪层，避免 `MIN-102 / MIN-103` 从零设计。
3. **MIN-102**
   在已有可执行任务链路上补齐 `SSE` 事件流与可观测性。
4. **MIN-103**
   在 `YouTube` 与 `SSE` 基线稳定后，再推进 `Magic Fill + X + 微信公众号`，避免同时引入多个变量。

### 1.2 里程碑关系

- `MIN-101`：解决“真实成功上传 + 成功结果落盘”。
- `MIN-102`：解决“任务实时状态可见，不靠手动刷新猜测执行过程”。
- `MIN-103`：解决“真正可用的发布入口 + 一期剩余平台接入”。

### 1.3 开发硬约束

从本版开始，`MIN-102 / MIN-103` 统一遵守下面的硬约束：

1. 队列状态模型优先借鉴 `Mixpost / Postiz`，不要自己重新命名一整套状态语义。
2. `X` connector 优先借鉴 `Postiz / Mixpost`。
3. `微信公众号 / 新浪微博` 的 Markdown 转换与草稿投递优先借鉴 `Wechatsync`。
4. 国内视频平台自动上传骨架优先借鉴 `social-auto-upload`。
5. 我们自己只保留 MHSDC 的项目路径、文件落盘、UI 壳层与 adapter。

### 1.4 本轮不做

- 不重写 `src/App.tsx` 的整体壳层结构。
- 不提前做 Bilibili / 抖音 / 视频号正式接入。
- 不把微信公众号一期目标拔高到“全自动群发上线”。

---

## 2. MIN-101 | DT YouTube success-path 验收与结果回写收口

### 2.1 目标

把当前“能建任务、能执行、token 过期时能明确失败”的状态，推进到“真实成功上传可复现、成功结果可稳定写回 UI 与项目文件”。

### 2.2 完成定义

- 至少完成 1 条真实 YouTube 上传成功。
- UI 可以明确看到成功状态、平台结果和外链。
- `distribution_history.json` 记录成功项。
- `publish_packages/pkg-<taskId>.json` 记录成功后的 `results/remoteId/url/publishedAt`。
- 补齐新的权威验收 request / report。

### 2.3 涉及文件

- `server/youtube-oauth-service.ts`
- `server/connectors/youtube-connector.ts`
- `server/distribution-execution-service.ts`
- `server/distribution-store.ts`
- `server/distribution.ts`
- `src/components/DistributionQueue.tsx`
- `src/__tests__/server/distribution-execution-service.test.ts`
- `src/__tests__/server/distribution-store.test.ts`
- `testing/distribution/requests/`
- `testing/distribution/reports/`
- `testing/distribution/status/latest.json`

### 2.4 开发任务拆解

#### A. OAuth 与环境确认

- [ ] 确认当前 `youtube` OAuth 真实状态，不再只看 `distribution auth status` mock 结果，必须同时核对共享 `youtube-oauth-service` 的实际 token 状态。
- [ ] 若 token 已过期，重新完成一次授权闭环，并验证 Distribution 与现有 YouTube 共享状态读取一致。
- [ ] 补一条服务端诊断日志，区分：
  - 未拿到 token
  - token 存在但上传失败
  - 上传成功但结果回写失败

#### B. Connector 成功态收口

- [ ] 审查 `server/connectors/youtube-connector.ts` 的成功返回结构，统一保证返回：
  - `platform`
  - `status: success`
  - `remoteId`
  - `url`
  - `publishedAt`
  - `message`
- [ ] 明确 `youtube` 与 `youtube_shorts` 的 URL 生成逻辑，避免成功后 UI 仍看不到正确外链。
- [ ] 若 YouTube API 返回结构里存在多层嵌套字段，补容错解析与错误信息透传。

#### C. 执行链路结果落盘

- [ ] 检查 `executeDistributionTask()` 成功后是否稳定把 `task.results`、`completedAt`、`status` 写回队列对象。
- [ ] 确保 `savePublishPackageSnapshot()` 在成功执行后再次覆盖写入，快照里保留最终结果，而不是只保留创建态。
- [ ] 确保 `appendDistributionHistory()` 写入成功记录时不丢 `remoteId/url`。
- [ ] 明确历史记录 `historyId` 的唯一性，避免同一任务重复执行时被误覆盖或难以区分。

#### D. UI 成功态呈现

- [ ] 检查 `DistributionQueue` 当前结果展示是否能显示成功平台、外链、发布时间。
- [ ] 若当前只显示失败文案，补一个最小成功态卡片展示：
  - 平台名
  - 成功状态
  - 可点击链接
  - 发布时间
- [ ] 执行成功后立即刷新队列，保证页面不用手工二次操作才能看到结果。

#### E. 验收资产沉淀

- [ ] 新建 request：`TREQ-2026-03-20-DISTRIBUTION-005-phase1-youtube-success-path.md`
- [ ] request 中明确 success-path 验收证据要求：
  - 成功态 UI 截图
  - YouTube 外链
  - `distribution_history.json` 摘要
  - `publish_packages/pkg-*.json` 摘要
- [ ] 验收完成后更新：
  - `testing/distribution/reports/...`
  - `testing/distribution/status/latest.json`

### 2.5 测试任务

#### 单元/服务测试

- [ ] 扩充 `src/__tests__/server/distribution-execution-service.test.ts`
  - 成功执行 `youtube` 任务后，`task.status === completed`
  - `task.results.youtube.url`、`remoteId` 被写入
  - 混合平台场景下，一个成功一个失败时总任务应为 `failed`，但成功结果不能丢
- [ ] 扩充 `src/__tests__/server/distribution-store.test.ts`
  - `appendDistributionHistory()` 成功记录保留 `url/remoteId`
  - `savePublishPackageSnapshot()` 在二次覆盖写后保留最终成功结果

#### API 验证

- [ ] 手动调用或页面触发 `POST /api/distribution/queue/:taskId/execute`
- [ ] 验证成功响应里 `task.results.youtube.status === success`
- [ ] 验证 `GET /api/distribution/history?projectId=...` 可读到成功记录

#### 浏览器验收

- [ ] 使用 `agent browser` 打开 `http://127.0.0.1:5181/`
- [ ] 进入 `分发终端`
- [ ] 选择真实项目和真实视频资产
- [ ] 创建 YouTube 任务并执行
- [ ] 验证队列 UI 出现成功态与外链
- [ ] 截图保存到 `testing/distribution/artifacts/`

### 2.6 验收通过口径

- 成功上传不是日志自述，而是至少满足以下 4 项中的 4 项：
  - UI 成功态截图
  - 真实 YouTube 链接
  - `distribution_history.json` 成功记录
  - `publish_packages/pkg-*.json` 成功结果

---

## 3. MIN-102 | DT 分发任务 SSE 流与队列可观测性

### 3.1 目标

在 `MIN-101` 已跑通真实 success-path 的基础上，为分发任务建立最小 `SSE-first` 状态流；同时把队列状态语义先对齐成熟产品（`Mixpost / Postiz`）的最小共识，再落到我们的 `SSE` 广播与 `Queue` 可观测性。

### 3.2 完成定义

- 后端存在可订阅的分发任务 SSE 接口。
- 事件和状态语义不再是随意命名，而是与 `Mixpost / Postiz` 的任务生命周期思路对齐。
- 事件口径稳定支持：
  - `job_created`
  - `job_started`
  - `job_progress`
  - `job_failed`
  - `job_succeeded`
- 队列页至少能实时更新任务状态，不必完全依赖手动刷新。
- 失败原因与成功结果都能通过 SSE 及时反馈。

### 3.3 涉及文件

- `server/sse.ts`
- `server/distribution.ts`
- `server/distribution-execution-service.ts`
- `server/distribution-types.ts`
- `src/components/DistributionQueue.tsx`
- `src/App.tsx`
- `src/__tests__/server/` 下新增或扩充 SSE 相关测试
- `testing/distribution/requests/`
- `testing/distribution/reports/`

### 3.4 开发任务拆解

#### 0. 开源借鉴前置

- [ ] 先参考 `docs/plans/2026-03-22_Distribution_OSS_Borrowing_Map.md`，把 `Mixpost / Postiz` 的队列状态模型映射成我们当前最小需要的字段。
- [ ] 明确“哪些是借鉴语义，哪些是 MHSDC 私有补充字段”，禁止在实现时边写边重新发明状态体系。

#### A. 事件契约定义

- [ ] 在 `server/distribution-types.ts` 新增 Distribution SSE 事件类型定义，至少包含：
  - `type`
  - `taskId`
  - `projectId`
  - `status`
  - `platform?`
  - `message?`
  - `progress?`
  - `result?`
  - `timestamp`
- [ ] 明确 `job_progress` 的最小语义：
  - 可先用文本阶段进度，不强求百分比
  - 例如：`validating_auth`、`uploading_media`、`finalizing_result`
- [ ] 明确状态映射：
  - `pending/queued`
  - `running/processing`
  - `completed/succeeded`
  - `failed`
  - `retryable`

#### B. SSE 基础设施

- [ ] 复用 `server/sse.ts`，补 `event` 语义或统一 payload 结构，避免和 `market.ts` 各写一套分发协议。
- [ ] 在 `server/distribution.ts` 新增订阅端点，例如：
  - `GET /api/distribution/events?projectId=...`
- [ ] 建立最小 subscriber registry，至少按 `projectId` 或全局列表管理在线连接。
- [ ] 处理断开连接清理，避免连接泄漏。

#### C. 执行过程广播

- [ ] 创建任务成功时广播 `job_created`
- [ ] 点击执行前广播 `job_started`
- [ ] 执行中在关键阶段广播 `job_progress`
- [ ] 全任务失败时广播 `job_failed`
- [ ] 全任务成功时广播 `job_succeeded`
- [ ] 多平台执行场景下，事件要能带上当前平台，避免 UI 不知道是哪一段状态变化

#### D. 前端消费与 UI 更新

- [ ] 在 `DistributionQueue.tsx` 建立 `EventSource` 订阅
- [ ] 仅当 `projectId` 存在时才连接
- [ ] 收到事件时直接更新本地任务状态或触发增量刷新
- [ ] 对失败事件给出更明确 UI 呈现，不只在控制台打印
- [ ] 在连接断开时有最小降级策略：
  - 自动重连
  - 或回退到手动刷新按钮

#### E. 可观测性补强

- [ ] 服务端日志统一打印 taskId + projectId + eventType
- [ ] 失败事件包含用户可读错误和开发可追踪 message
- [ ] 在 UI 中补一块轻量“最近事件”或“当前执行状态”提示，避免用户只看到卡片状态不知发生了什么
- [ ] `Queue` 卡片字段优先参考 `Postiz / Mixpost` 的最小展示结构：
  - 总状态
  - 平台列表
  - 最近结果
  - 最近错误
  - 快捷动作

### 3.5 测试任务

#### 单元/服务测试

- [ ] 新增 `src/__tests__/server/distribution-sse.test.ts` 或等价测试文件
  - 订阅建立成功
  - 广播 `job_created` 时 payload 结构正确
  - 广播 `job_failed` 时包含 taskId/projectId/error
- [ ] 扩充 `distribution-execution-service.test.ts`
  - 执行链路会按关键阶段触发事件

#### 集成验证

- [ ] 本地起服务后，打开队列页创建并执行任务
- [ ] 不点击刷新，验证任务状态会自动变化
- [ ] 断开页面后重新进入，验证不会因旧连接残留导致重复事件

#### 浏览器验收

- [ ] 使用 `agent browser` 创建任务并执行
- [ ] 录到以下至少 3 个时刻的证据：
  - 任务创建后进入队列
  - 执行中状态变化
  - 成功或失败最终态

### 3.6 验收通过口径

- 至少一条真实任务在不手动刷新列表的情况下，能看到 `pending/running/completed` 或 `pending/running/failed` 状态流转。
- 前端和服务端的事件命名、任务状态、最终落盘结果保持一致。

---

## 4. MIN-103 | DT Composer 自动装填与 X / 微信公众号一期接入

### 4.1 目标

把当前偏原型的 `Publish Composer` 收口为真正消费项目资产的发布入口，同时推进一期剩余目标平台：

- `X`
- `微信公众号（草稿 / 待发稿）`

并且整个 `MIN-103` 必须按“开源借鉴优先”来做：

- `X` 优先借鉴 `Postiz / Mixpost`
- `微信公众号 / 新浪微博` 优先借鉴 `Wechatsync`
- 后续国内视频平台上传骨架预留给 `social-auto-upload`

### 4.2 完成定义

- `Magic Fill` 不再依赖 `/api/files?dir=/data/projects/...` 这类原型式路径拼接。
- Composer 可以从真实营销产物/脚本产物自动装填标题、正文、标签候选。
- `X` 至少进入一期可执行状态。
- `微信公众号` 至少进入草稿/待发稿可用状态。
- 文档中明确每个子能力的“借鉴源 / 我们自写层 / 暂不实现层”。

### 4.3 涉及文件

- `src/components/PublishComposer.tsx`
- `server/distribution.ts`
- `server/distribution-store.ts`
- `server/distribution-types.ts`
- `server/distribution-execution-service.ts`
- `server/connectors/` 下新增：
  - `x-connector.ts`
  - `wechat-mp-connector.ts`
- `src/__tests__/server/` 下新增 connector 与 Magic Fill 测试
- `testing/distribution/requests/`
- `testing/distribution/reports/`

### 4.4 开发任务拆解

#### 0. 开源借鉴前置

- [ ] 先对照 `docs/plans/2026-03-22_Distribution_OSS_Borrowing_Map.md`，逐项确认：
  - `X` 抄 `Postiz / Mixpost` 的哪一层
  - `微信公众号 / 新浪微博` 抄 `Wechatsync` 的哪一层
  - 哪些能力我们只留 adapter，不做完整平台复刻
- [ ] 在开始代码前，先把每个 connector 的“输入 / 输出 / 错误语义”映射表写清楚。

#### A. Magic Fill 数据源收口

- [ ] 删除 `handleMagicFill()` 里对 `/api/files?dir=/data/projects/...` 的原型依赖。
- [ ] 在后端新增一个明确的“分发装填候选”接口，例如：
  - `GET /api/distribution/composer-sources?projectId=...`
- [ ] 服务端按优先级读取项目真实产物：
  1. `05_Marketing/` 中的结构化输出
  2. `05_Marketing/*.md` / `.plain.txt`
  3. `02_Script/*.md`
  4. 用户当前手动选中的视频文件名
- [ ] 定义统一返回结构：
  - `suggestedTitle`
  - `suggestedBody`
  - `suggestedTags`
  - `sourceFiles`
  - `warnings`
- [ ] 若营销产物缺失，前端要给出明确 fallback 提示，而不是静默填假文案。

#### B. Composer 交互补强

- [ ] 选中视频后自动按横竖版能力过滤平台建议。
- [ ] `Magic Fill` 后允许用户继续编辑，不做不可逆覆盖。
- [ ] 平台自定义标题/标签要真正参与最终任务 payload，而不是只停留在前端 state。
- [ ] 区分“全局文案”和“平台定制文案”的来源与提交结构，为 `X / 微信公众号` 留接口。
- [ ] Composer 字段组织优先借鉴 `Postiz / Mixpost` 的最小信息架构，不再自己随意扩字段。

#### C. X Connector 一期

- [ ] 新增 `server/connectors/x-connector.ts`
- [ ] 先参考 `Postiz / Mixpost` 的 `X` 发布 payload 组装方式，复用成熟的字段拆分思路。
- [ ] 先只做图文发布或带链接文案发布，不把多媒体复杂能力提前塞入一期。
- [ ] 明确 OAuth / token 状态校验与错误透传。
- [ ] 在执行服务中接入 `x` 平台分支。
- [ ] 若因环境未完成 auth，必须明确失败，不可静默跳过。

#### D. 微信公众号 Connector 一期

- [ ] 新增 `server/connectors/wechat-mp-connector.ts`
- [ ] 优先借鉴 `Wechatsync` 的 Markdown 转换与草稿能力，而不是自己发明一套公众号正文转换器。
- [ ] 一期目标收敛为“草稿 / 待发稿”，不承诺直接群发上线。
- [ ] 先定义最小输出：
  - 标题
  - 摘要
  - 正文 markdown 或转换后正文
  - 封面/素材引用
- [ ] 若暂时依赖人工兜底，也要把产物标准化落盘到：
  - `<ProjectRoot>/06_Distribution/outbound/wechat_mp/`
- [ ] 在执行服务中把 `wechat_mp` 结果写成：
  - `success` = 已生成草稿物料 / 已写入草稿箱
  - `failed` = 缺少 auth / 缺少正文 / 格式转换失败

#### E. 结果模型统一

- [ ] 扩充 `DistributionTaskAssets` 或相关 payload，使其能承载图文平台需要的 `body/summary/customTitle/customTags`。
- [ ] 明确 `DistributionPlatformResult.message` 的成功态语义，不同平台都能给用户一句可读结论。
- [ ] 若 `wechat_mp` 是草稿模式，结果里要能区分 `draft_ready` 与真正 published 的语义。
- [ ] 结果模型要能兼容后续 `social-auto-upload` 类视频平台 uploader 的浏览器自动化返回值。

### 4.5 测试任务

#### 单元/服务测试

- [ ] 新增 `src/__tests__/server/distribution-composer-sources.test.ts`
  - 有 marketing 产物时优先取 marketing
  - 无 marketing 产物时 fallback 到 script
  - 缺少全部文案源时返回 warning
- [ ] 新增 `src/__tests__/server/x-connector.test.ts`
  - auth 缺失时明确失败
  - payload 构造正确
- [ ] 新增 `src/__tests__/server/wechat-mp-connector.test.ts`
  - 草稿产物生成成功
  - 内容缺失时失败
- [ ] 扩充 `distribution-execution-service.test.ts`
  - `x`
  - `wechat_mp`
  - 混合多平台任务结果聚合

#### API 验证

- [ ] 验证 `GET /api/distribution/composer-sources?projectId=...`
- [ ] 验证 `POST /api/distribution/queue/create` 能正确接收 Magic Fill 与平台定制字段
- [ ] 验证 `POST /api/distribution/queue/:taskId/execute` 可进入 `x / wechat_mp` 分支

#### 浏览器验收

- [ ] 使用 `agent browser` 验证：
  - 点击 `Magic Fill` 后标题/正文/标签来自真实项目产物
  - 创建 `X` 任务后队列中可见
  - 创建 `微信公众号` 任务后可生成 draft-ready 结果或标准化物料
- [ ] 截图保存到 `testing/distribution/artifacts/`

#### 黄金测试/队列文档

- [ ] 新增 request：
  - `TREQ-2026-03-20-DISTRIBUTION-006-composer-magic-fill-real-sources.md`
  - `TREQ-2026-03-20-DISTRIBUTION-007-x-phase1-business-acceptance.md`
  - `TREQ-2026-03-20-DISTRIBUTION-008-wechat-mp-draft-phase1-acceptance.md`
- [ ] 每个 request 必须写清：
  - 输入项目
  - 预期证据
  - UI 信号
  - 文件写盘信号
  - 失败口径

### 4.6 验收通过口径

- `Magic Fill` 明确来自真实项目产物，不再是硬编码假文案。
- `X` 至少进入一期可执行状态。
- `微信公众号` 至少进入草稿/待发稿可用状态，并有可追踪落盘证据。
- 实现说明里能够明确指出每块能力借鉴自哪套开源基座，而不是一套完全自造的新方案。

---

## 5. 公共测试与交付要求

### 5.1 每个 Issue 完成前都要做

- [ ] `./node_modules/.bin/tsc --noEmit --pretty false`
- [ ] 有针对性的 `vitest` 文件级测试
- [ ] 至少 1 条真实主链路自测
- [ ] 若涉及 UI，优先使用 `agent browser`
- [ ] 验收完成后更新：
  - `testing/distribution/reports/`
  - `testing/distribution/status/latest.json`
  - `docs/dev_logs/HANDOFF.md`

### 5.2 建议测试命令

```bash
npm run test:run -- \
  src/__tests__/server/distribution-store.test.ts \
  src/__tests__/server/distribution-queue-service.test.ts \
  src/__tests__/server/distribution-execution-service.test.ts \
  src/__tests__/server/distribution-sse.test.ts \
  src/__tests__/server/distribution-composer-sources.test.ts \
  src/__tests__/server/x-connector.test.ts \
  src/__tests__/server/wechat-mp-connector.test.ts

./node_modules/.bin/tsc --noEmit --pretty false
```

### 5.3 交付顺序建议

1. `MIN-101` 完成并形成真实成功态报告
2. `MIN-102` 完成并形成 SSE 可观测性报告
3. `MIN-103` 分两段提交：
   - 先 `Magic Fill`
   - 再 `X / 微信公众号`

---

## 6. 收口标准

当 `MIN-101 ~ MIN-103` 全部完成后，Distribution Terminal 一期应达到：

1. `YouTube` 成功链路可验证
2. 队列执行过程实时可见
3. Composer 真正消费项目产物
4. `X` 可进入一期可用
5. `微信公众号` 可进入草稿/待发稿可用

届时才建议再继续扩到更重的平台自动化与更彻底的独立壳重构。
