# TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path.report

## Metadata

- request_id: TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path
- executed_at: 2026-03-22 07:42:12
- actual_model: Codex desktop agent
- browser_execution: agent-browser
- status: passed

## Test Summary

本次验证完成了 Distribution Phase 1 最关键的真实 success-path 闭环：`Publish Composer` 成功创建 YouTube 任务，`Queue` 成功执行真实上传，结果以 `private` 模式发布到 YouTube，并稳定回写到 `distribution_queue.json`、`distribution_history.json` 与 `publish_packages/`。`MIN-101` 的代码与验收目标现已闭环。

## Evidence

1. request: `testing/distribution/requests/TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path.md`
2. claim: `testing/distribution/claims/TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path.claim.md`
3. report: `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path.report.md`
4. status: `testing/distribution/status/latest.json`
5. browser evidence:
   - `testing/distribution/artifacts/TREQ-2026-03-22-DISTRIBUTION-005-before-submit-annotated.png`
   - `testing/distribution/artifacts/TREQ-2026-03-22-DISTRIBUTION-005-after-create.png`
   - `testing/distribution/artifacts/TREQ-2026-03-22-DISTRIBUTION-005-queue-success.png`
6. runtime files:
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_queue.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_history.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/publish_packages/pkg-dist_1774135188706_kdund1gdf.json`
7. auth evidence:
   - `GET /api/distribution/auth/status` 返回 `youtube: connected`
   - `/Users/luzhoua/MHSDC/.mindhikers/youtube-oauth.json`
8. publish evidence:
   - remoteId: `EhGAa3Rdt38`
   - url: `https://youtube.com/watch?v=EhGAa3Rdt38`
   - result message: `YouTube upload completed (private).`

## Verification Results

1. `Accounts Hub` 在重新授权后，`youtube / youtube_shorts` 都变为 `connected`，并写入最新 `lastAuth`: Passed
2. `Publish Composer` 读取 `CSET-SP3` 真实视频资产并创建新任务 `dist_1774135188706_kdund1gdf`: Passed
3. 新任务创建后，`distribution_queue.json` 出现 pending 任务，`publish_packages/pkg-dist_1774135188706_kdund1gdf.json` 同步生成: Passed
4. 真实执行成功上传到 YouTube，返回 `remoteId/url/publishedAt/message`: Passed
5. YouTube 上传结果默认以 `private` 模式发布，不会在 smoke 验证里误发公开内容: Passed
6. `distribution_queue.json`、`distribution_history.json` 与 `publish_packages/` 中的 success 结果一致: Passed
7. `Queue` 页面展示成功态并提供 `打开链接`: Passed
8. 本轮已补齐“server 热重载后 OAuth token 丢失”的根因修复，并重测通过: Passed

## Bug Follow-up

### Bug 1

- Bug Title: YouTube OAuth token 只保存在内存，server 热重载后立即丢失
- Symptom: 用户完成 Google 授权后，`Accounts Hub` 一度显示已连接，但在 server 文件修改触发热重载后，执行分发任务再次报 `No active access token. Please authorize again.`
- Expected: 只要 token 仍在有效期内，授权结果应跨 server 重载保持可用。
- Actual: `activeAccessToken` / `tokenExpiry` 仅存在模块内存变量，重载后被清空。
- Reproduction Script / Steps:
  1. 完成一次 `YouTube` 重新授权
  2. 修改任意 server 文件，触发 `tsx watch` 热重载
  3. 执行已有 YouTube 分发任务
  4. 返回 `No active access token. Please authorize again.`
- Scope / Impact:
  - 阻塞真实 success-path 验收
  - 会让 UI “已连接”与执行态“无 token”产生错位
- Suspected Root Cause: `server/youtube-oauth-service.ts` 只维护内存态 token，没有持久化存储与重载恢复逻辑。
- Key Evidence:
  - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_history.json`
  - `/Users/luzhoua/MHSDC/.mindhikers/youtube-oauth.json`
  - `server/youtube-oauth-service.ts`
- Suggested Next Action:
  - 当前已修复为本地 token 落盘恢复
  - 后续若要支持更长时间免重复授权，可再补 `refresh_token` 流程

### Bug 2

- Bug Title: YouTube 立即上传默认可见性是 `public`，不适合 smoke 验证
- Symptom: connector 原实现里，只有定时任务才会强制 `private`，即时上传默认走 `public`。
- Expected: `MIN-101` 验证与后续默认队列执行都应优先保守，至少默认 `private`。
- Actual: `server/connectors/youtube-connector.ts` 在 `scheduleTime` 为空时把 `privacyStatus` 设为 `public`。
- Reproduction Script / Steps:
  1. 阅读旧版 `server/connectors/youtube-connector.ts`
  2. 观察 `privacyStatus: publishAt ? 'private' : 'public'`
- Scope / Impact:
  - 会把 smoke 验证内容误发公开
  - 对真实账号存在不必要风险
- Suspected Root Cause: connector 没有显式任务级 visibility 字段，且默认值选择过于激进。
- Key Evidence:
  - `server/connectors/youtube-connector.ts`
  - `src/components/PublishComposer.tsx`
- Suggested Next Action:
  - 当前已改为任务显式写入 `visibility: 'private'`
  - connector 兜底也默认 `private`

## Handoff Notes

1. `MIN-101` 现在已经可以视为完成，下一步应先做“开源借鉴映射表”，再据此改写 `MIN-102 / MIN-103` 方案。
2. 若下个窗口需要继续核验本轮结果，先看：
   - `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-005-phase1-youtube-success-path.report.md`
   - `testing/distribution/status/latest.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_queue.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_history.json`
3. 当前已知真结论：
   - YouTube 真实 success-path 已跑通
   - 上传结果默认是 `private`
   - queue/history/package/result 回写一致
   - OAuth token 已支持本地落盘，server 热重载不再立刻清空授权
4. 当前仍存在的非阻塞背景项：
   - 项目 runtime 队列里还保留一条旧的 pending golden 测试任务 `dist_1774005785395_bfy3aa0f0`
   - 其他平台 connector 仍未进入真实执行态
