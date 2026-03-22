# TREQ-2026-03-22-DISTRIBUTION-006-min102-sse-queue-observability

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-22-DISTRIBUTION-006-min102-sse-queue-observability
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-006-min102-sse-queue-observability.report.md`

## 测试目标

验证 `MIN-102` 已达到“Queue 不依赖手动刷新即可观察分发任务状态流转”的完成标准，并额外确认 create / execute / retry / delete 四类核心动作都能同步回页面。

## 背景

- `MIN-101` 已证明真实 YouTube success-path 可跑通。
- `MIN-102` 本轮重点不是新平台，而是分发任务的实时可观测性：
  - 统一任务状态语义
  - 建立 SSE 订阅端点
  - 让 Queue 页面实时显示最近事件与当前任务状态
- 当前实现已新增：
  - `job_created`
  - `job_started`
  - `job_progress`
  - `job_failed`
  - `job_succeeded`
  - `job_retried`
  - `job_deleted`

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 页面入口：`http://127.0.0.1:5181/`
4. 后端入口：`http://127.0.0.1:3008/`
5. 指定项目：`CSET-SP3`
6. 必须使用 `agent-browser`
7. 本次 smoke task 必须使用不触发真实外部发布的 `wechat_mp`，避免污染线上平台

## 执行步骤

1. 打开 `http://127.0.0.1:5181/`，进入 `分发终端 -> Queue`
2. 选中项目 `CSET-SP3`
3. 在 Queue 页面保持连接状态为“实时同步中”
4. 通过页面上下文 `fetch('/api/distribution/queue/create')` 创建一条 `wechat_mp` smoke task
5. **不点击刷新**，直接观察：
   - 顶部“最近事件”是否出现 `任务已进入待执行队列`
   - 列表总数是否增加
   - 新任务卡片是否立即出现
6. 对该任务触发 `POST /api/distribution/queue/:taskId/execute`
7. **不点击刷新**，直接观察：
   - 最近事件区是否出现 `任务开始执行`
   - 是否出现阶段进度或最终失败原因
   - 任务状态是否从 `待执行` 变为 `待重试`
8. 对该任务触发 `POST /api/distribution/queue/:taskId/retry`
9. **不点击刷新**，直接观察：
   - 最近事件区是否出现 `任务已重新入队`
   - 任务状态是否回到 `待执行`
10. 对该任务触发 `DELETE /api/distribution/queue/:taskId`
11. **不点击刷新**，直接观察：
   - 最近事件区是否出现 `任务已从队列移除`
   - 任务卡片是否从列表中消失
   - 任务总数是否恢复
12. 最后用后端接口核对该 smoke task 确已不在 `distribution_queue.json`

## 预期结果

1. Queue 页面进入后，连接状态显示为“实时同步中”
2. create 后无需刷新即可看到：
   - 最近事件更新
   - 新任务出现
   - 总数变化
3. execute 后无需刷新即可看到：
   - 最近事件更新
   - 失败原因或成功结果
   - 任务状态变化
4. retry 后无需刷新即可看到任务回到 `queued`
5. delete 后无需刷新即可看到任务从列表中移除
6. smoke task 最终不残留在 `CSET-SP3/06_Distribution/distribution_queue.json`

## 失败时必须收集

1. create 后截图
2. execute 后截图
3. delete 后截图
4. 当前页面正文文本摘要
5. 如任务未移除，补 `distribution_queue.json` 或 `GET /api/distribution/queue` 摘要

## 备注

- 这是 `MIN-102` 的正式可观测性验收 request。
- 若本轮通过，说明 `MIN-102` 已达到“可以保存并切下一任务”的标准。
