# TREQ-2026-03-20-DISTRIBUTION-004-phase1-self-acceptance-rerun

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-20-DISTRIBUTION-004-phase1-self-acceptance-rerun
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-20-DISTRIBUTION-004-phase1-self-acceptance-rerun.report.md`

## 测试目标

复核 Distribution Phase 1 主链路是否已经达到当前自验收目标：`Publish Composer` 能创建任务，`Queue` 能执行任务，在 YouTube token 过期时给出明确失败反馈，并完成队列 / history / publish package 写盘。

## 背景

- 首轮黄金测试 `TREQ-2026-03-20-DISTRIBUTION-003` 判定为 failed，结论是“点击提交后未建任务”。
- 需要补一轮更细的业务自验收，把“任务创建”“队列执行”“失败反馈”“文件写盘”拆开验证，避免旧结论误伤当前阶段判断。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 指定项目：`CSET-SP3`
4. 页面入口：`http://127.0.0.1:5181/`
5. 必须使用 `agent-browser`
6. 当前 `youtube` auth 预期为 `expired`，因此执行阶段以“明确失败反馈”而非“真实发片成功”作为验收口径

## 执行步骤

1. 打开 Distribution 页面，确认 `Publish Composer` 已读取到 `CSET-SP3` 的真实视频资产。
2. 选择 `CSET-SP3-S1-minimal-test.mp4`，填写标题/正文/tags，勾选 `YouTube`。
3. 提交创建任务，并检查：
   - `06_Distribution/distribution_queue.json`
   - `06_Distribution/publish_packages/pkg-<taskId>.json`
4. 切换到 `Queue` 页面，对 pending 任务点击“立即执行”。
5. 检查：
   - UI 是否出现明确失败态和错误文案
   - `distribution_queue.json` 是否更新为 `failed`
   - `distribution_history.json` 是否新增对应记录

## 预期结果

1. `Publish Composer` 可以读取真实项目资产并创建任务。
2. 创建后 `distribution_queue.json` 出现对应任务，`publish_packages/` 出现对应快照。
3. `Queue` 页面能看到 pending 任务并允许执行。
4. 由于 `youtube` token 过期，执行后任务应进入 `failed`，且 UI 明确显示 `No active access token. Please authorize again.`。
5. `distribution_history.json` 新增对应失败记录。
6. 不应出现静默无反馈、无限 loading 或“点了没反应”的结果。

## 失败时必须收集

1. Queue 页面截图
2. `distribution_queue.json`
3. `distribution_history.json`
4. `publish_packages/pkg-<taskId>.json`
5. 浏览器可见文案或日志

## 备注

- 这轮是对当前阶段功能目标的自验收复核。
- 若想继续验证“真实 YouTube 成功上传”，需在此轮完成后刷新 `youtube` OAuth，再另开 success-path request。
