# TREQ-2026-03-22-DISTRIBUTION-011-x-wechat-phase1-acceptance

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-22-DISTRIBUTION-011-x-wechat-phase1-acceptance
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-22-DISTRIBUTION-011-x-wechat-phase1-acceptance.report.md`

## 测试目标

验证 `MIN-103` 后两段已进入一期可执行状态：

1. `X / Twitter` 能进入执行分支，完成 auth gating、payload 组装与 outbound 落盘
2. `微信公众号` 能生成 `draft_ready` 草稿物料并落盘到项目内标准目录

## 背景

- `MIN-103` 的 connector 设计遵循 `docs/plans/2026-03-22_Distribution_OSS_Borrowing_Map.md`
- `X` 借鉴 `Postiz / Mixpost` 的最小 payload / 错误语义
- `微信公众号` 借鉴 `Wechatsync` 的草稿物料思路
- 本轮不做真实外部平台发帖，只验证一期 adapter / draft-ready 主链路

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 页面入口：`http://127.0.0.1:5181/`
4. 指定项目：`CSET-SP3`
5. 必须优先使用 `agent-browser`
6. 测试前将 `twitter` auth 刷为 `connected`

## 执行步骤

1. 打开 `http://127.0.0.1:5181/`，进入 `分发终端 -> Queue`
2. 通过页面上下文 `fetch('/api/distribution/auth/refresh')` 把 `twitter` 刷成 `connected`
3. 通过页面上下文创建一条 `twitter + wechat_mp` 联合 smoke task，携带：
   - `sourceFiles`
   - `platformOverrides.twitter`
   - `platformOverrides.wechat_mp`
4. 在 Queue 页面观察任务进入 `待执行`
5. 触发执行 `POST /api/distribution/queue/:taskId/execute`
6. 在 Queue 页面观察任务最终变为 `已发布`
7. 校验结果文案：
   - `twitter · X phase1 payload prepared for outbound adapter.`
   - `wechat_mp · 微信公众号 draft package generated.`
8. 校验标准化落盘：
   - `06_Distribution/outbound/x/x-<taskId>.json`
   - `06_Distribution/outbound/wechat_mp/wechat-mp-<taskId>.json`
   - `06_Distribution/outbound/wechat_mp/wechat-mp-<taskId>.md`

## 预期结果

1. `X` connector 在 auth 就绪时返回成功，并落盘标准化 payload
2. `微信公众号` connector 返回 `draft_ready` 语义，并产出草稿物料
3. Queue 页面能显示两平台成功结果与可读 message
4. 未触发真实外部发帖，仍保留一期安全边界

## 失败时必须收集

1. Queue 页截图
2. 执行接口返回摘要
3. outbound 文件是否存在
4. 若失败，记录具体 platform message

## 备注

- 本 request 把 `MIN-103` 后两段合并成一次联调验收，因为两平台共用同一条任务与同一张 Queue 取证图。
