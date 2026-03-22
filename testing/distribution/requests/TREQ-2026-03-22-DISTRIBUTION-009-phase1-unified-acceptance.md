# TREQ-2026-03-22-DISTRIBUTION-009-phase1-unified-acceptance

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-22-DISTRIBUTION-009-phase1-unified-acceptance
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-009-phase1-unified-acceptance.report.md`

## 测试目标

对 Distribution Terminal 当前一期基线做统一验收：把 `MIN-101` 的真实 YouTube success-path 与 `MIN-102` 的 Queue 实时可观测性合并成一份权威结论，作为后续进入 `MIN-103` 前的阶段收口判据。

## 背景

- `TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path` 已在 2026-03-22 07:42 CST 证明：
  - 真实 YouTube 上传成功
  - 结果稳定回写 queue / history / publish package
  - 默认 `private` 安全边界生效
- `TREQ-2026-03-22-DISTRIBUTION-006-min102-sse-queue-observability` 已在 2026-03-22 09:10 CST 证明：
  - Queue 页面无需手动刷新即可观察 create / execute / retry / delete
  - 页面与后端队列状态保持一致
- 由于 OAuth token 属于时效性凭证，本次统一验收**不强制再次执行 YouTube 实传**；应以 `005` 作为 `MIN-101` 权威证据，以 `006` 作为 `MIN-102` 权威证据，并补一轮当前页面现势核验。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 页面入口：`http://127.0.0.1:5181/`
4. 指定项目：`CSET-SP3`
5. 必须使用 `agent-browser`

## 执行步骤

1. 读取并确认以下报告均存在且状态为 `passed`
   - `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path.report.md`
   - `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-006-min102-sse-queue-observability.report.md`
2. 打开 `http://127.0.0.1:5181/`，进入 `分发终端 -> Queue`
3. 选择项目 `CSET-SP3`
4. 直接核验当前页面是否同时满足：
   - 顶部连接状态为“实时同步中”
   - 列表中仍保留 `MIN101 private smoke 20260322` 的成功卡片
   - 成功卡片包含 `YouTube upload completed (private)` 与 `打开链接`
5. 调用 `GET /api/distribution/auth/status`
6. 将当前 auth 现势作为说明性信息写入 report，但**不得覆盖** `005` 对真实 success-path 的权威结论
7. 将统一结论写入新的 request / claim / report / latest status / status board

## 预期结果

1. `005` 与 `006` 两份权威报告都存在且为 `passed`
2. 当前 Queue 页面仍能同时体现：
   - 历史真实成功态结果
   - 实时连接态
3. 本次统一 report 明确写出：
   - `MIN-101` 的权威证据来源
   - `MIN-102` 的权威证据来源
   - 当前是否适合继续进入 `MIN-103`

## 失败时必须收集

1. 当前 Queue 页截图
2. 页面正文摘要
3. `GET /api/distribution/auth/status` 摘要
4. 如任一前置报告缺失，指出缺失文件路径

## 备注

- 本 request 是“阶段统一验收”，不是重复执行全量业务动作。
- 目标是为后续 `MIN-103` 提供一个干净的阶段性收口点。
