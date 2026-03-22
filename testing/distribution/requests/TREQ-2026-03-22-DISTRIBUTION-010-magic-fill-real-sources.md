# TREQ-2026-03-22-DISTRIBUTION-010-magic-fill-real-sources

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-22-DISTRIBUTION-010-magic-fill-real-sources
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-010-magic-fill-real-sources.report.md`

## 测试目标

验证 `MIN-103` 第一段 `Magic Fill` 已从原型式假数据切换为真实项目产物装填，并且装填结果能够真正进入 Distribution 队列 payload。

## 背景

- `Publish Composer` 之前的 `Magic Fill` 依赖原型式路径拼接与假文案，不满足一期可用标准。
- `MIN-103` 要求新增明确的服务端候选接口：
  - `GET /api/distribution/composer-sources?projectId=...`
- 数据源优先级要求：
  1. `05_Marketing/` 结构化产物
  2. 其他 Marketing 文案
  3. `02_Script/*.md`
  4. 当前选中视频文件名 fallback

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 页面入口：`http://127.0.0.1:5181/`
4. 指定项目：`CSET-SP3`
5. 指定视频：`05_Shorts_Output/CSET-SP3-S1-minimal-test.mp4`
6. 必须优先使用 `agent-browser`

## 执行步骤

1. 打开 `http://127.0.0.1:5181/`，进入 `分发终端 -> Publish Composer`
2. 选择项目 `CSET-SP3`
3. 选中视频 `CSET-SP3-S1-minimal-test.mp4`
4. 点击 `从真实产物自动装填`
5. 核验页面出现真实来源提示，且标题 / 正文 / tags 来自项目真实产物，而不是硬编码假文案
6. 核验当前 16:9 选中视频下，`YouTube Shorts / 抖音 / 微信视频号` 被标记为 `仅 9:16`
7. 通过页面上下文调用 `GET /api/distribution/composer-sources?...`，确认返回：
   - `success=true`
   - `sourceFiles` 包含 Marketing 文案与当前视频
8. 通过页面上下文调用 `POST /api/distribution/queue/create`，用临时任务验证：
   - `assets.sourceFiles` 正确入队
   - `assets.platformOverrides` 正确入队
9. 验证完成后删除临时任务，避免污染队列

## 预期结果

1. Composer 的 `Magic Fill` 数据明确来自真实项目文件
2. 页面显示来源文件名，且允许用户继续编辑字段
3. 16:9 / 9:16 平台兼容过滤在 UI 上生效
4. `composer-sources` API 返回真实候选结构
5. `queue/create` 真正保留 `sourceFiles + platformOverrides`

## 失败时必须收集

1. 当前 Composer 页截图
2. 页面正文摘要
3. `composer-sources` 返回摘要
4. `queue/create` 回读 payload 摘要
5. 若临时任务未删除，记录残留 `taskId`

## 备注

- 本 request 仅覆盖 `MIN-103` 的 `Magic Fill` 段，不包含 `X` 与 `微信公众号` connector。
- 截图证据固定写入：`testing/distribution/artifacts/TREQ-2026-03-22-DISTRIBUTION-010-magic-fill-real-sources.png`
