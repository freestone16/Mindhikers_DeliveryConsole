# TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path.report.md`

## 测试目标

验证 Distribution Terminal 的 `MIN-101` 已达到真实成功链路标准：YouTube 任务不仅能创建和执行，而且能真实上传成功，并把成功结果稳定写回 UI、`distribution_history.json` 与 `publish_packages/pkg-*.json`。

## 背景

- `TREQ-2026-03-20-DISTRIBUTION-004` 已证明当前主链路在 `youtube auth expired` 时会明确失败，不再静默卡死。
- 当前要继续验证 success-path，而不是再次验证 expired-path。
- 本轮之前已补一轮 `MIN-101` 收口代码：
  - 防止“真实上传成功但本地结果回写失败时，被误标为失败”
  - 补齐 `publishedAt/message` 等成功结果字段
  - 队列 UI 支持显示成功平台结果、时间与外链

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 页面入口：`http://127.0.0.1:5181/`
4. 指定项目：`CSET-SP3`
5. 必须使用 `agent-browser`
6. 测试开始前，`GET http://127.0.0.1:3008/api/distribution/auth/status` 中 `youtube` / `youtube_shorts` 应为 `connected`
7. 若 auth 仍为 `expired`，本 request 应标记为 `blocked` 或 `failed`，不得偷换成 expired-path 通过

## 执行步骤

1. 打开 `http://127.0.0.1:5181/` 并进入 `分发终端`
2. 选择项目 `CSET-SP3`
3. 在 `Publish Composer` 中确认能读取到真实项目视频资产
4. 选择一个真实视频资产，填写标题 / 正文 / tags，勾选 `YouTube`
5. 提交创建任务，并记录任务创建后的 UI 状态
6. 检查项目目录：
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_queue.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/publish_packages/pkg-<taskId>.json`
7. 切换到 `Distribution Queue`，对该 pending 任务点击 `立即执行`
8. 等待执行完成，并检查：
   - Queue UI 是否出现成功态
   - 平台结果中是否出现可点击外链
   - 是否显示成功消息与发布时间
9. 再检查项目目录：
   - `distribution_queue.json` 中该任务是否为 `completed`
   - `distribution_history.json` 是否新增成功记录
   - `publish_packages/pkg-<taskId>.json` 是否包含最终 `results.youtube`
10. 打开 YouTube 外链，确认它不是空链接或明显无效链接

## 预期结果

1. `Publish Composer` 能读取真实项目资产并成功创建 YouTube 任务
2. 创建后 `distribution_queue.json` 新增 pending 任务，`publish_packages/` 新增对应快照
3. `Queue` 页面能看到 pending 任务并允许执行
4. 执行后该任务进入 `completed`
5. Queue UI 明确显示：
   - `youtube`
   - 成功状态文案
   - 可点击外链
   - 成功时间或等价成功态信息
6. `distribution_history.json` 新增成功记录，且至少包含：
   - `remoteId`
   - `url`
   - `publishedAt`
7. `publish_packages/pkg-<taskId>.json` 中保存最终成功结果，而不是只停留在创建态
8. 不应出现以下情况：
   - 视频实际上传成功，但本地任务被标成 `failed`
   - UI 没有成功态或没有外链
   - `history` / `publish_packages` 未更新最终成功结果

## 失败时必须收集

1. Publish Composer 创建后截图
2. Queue 执行完成后的截图
3. `distribution_queue.json` 摘要
4. `distribution_history.json` 摘要
5. `publish_packages/pkg-<taskId>.json` 摘要
6. 浏览器报错或页面可见异常文案
7. 如有后端错误，附关键日志片段

## 备注

- 这是 `MIN-101` 的正式 success-path 验收 request。
- 若本轮通过，后续可进入：
  - `MIN-101` 收口并 commit
  - 再进入 `MIN-102`
