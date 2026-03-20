# TREQ-2026-03-20-DISTRIBUTION-002-phase1-business-acceptance-live.report

## 元信息

- request_id: TREQ-2026-03-20-DISTRIBUTION-002-phase1-business-acceptance-live
- executed_by: OpenCode worker
- executed_at: 2026-03-20T09:37:51.989Z
- actual_model: zhipuai-coding-plan/glm-5
- status: blocked

## 实际执行

- worker 已认领 request
- worker 调用 `opencode run` 尝试执行测试

## 结果

检测到已有活跃的 `opencode` 进程。为避免测试 worker 与用户会话争抢同一数据库，本次测试未启动。

## 关键证据

1. stdout: `testing/distribution/artifacts/TREQ-2026-03-20-DISTRIBUTION-002-phase1-business-acceptance-live.stdout.log`
2. stderr: `testing/distribution/artifacts/TREQ-2026-03-20-DISTRIBUTION-002-phase1-business-acceptance-live.stderr.log`
3. raw log: `testing/distribution/artifacts/TREQ-2026-03-20-DISTRIBUTION-002-phase1-business-acceptance-live.opencode.log`

## 差异

活跃进程:

```
32969 opencode
49719 opencode -s ses_30302126affeluMM1yyg2s9uTD
85946 opencode -s ses_301d5ecc0ffeqsGmeiVCF205lN
```

请先退出已有 OpenCode 会话，再重新执行 worker。

## 建议回传给规划端的结论

请读取本报告与 artifacts，判断是环境阻塞、模型权限问题，还是测试本身失败。
