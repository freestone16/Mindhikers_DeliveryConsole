# TREQ-2026-03-20-DISTRIBUTION-001-phase1-business-acceptance.report

## 元信息

- request_id: TREQ-2026-03-20-DISTRIBUTION-001-phase1-business-acceptance
- executed_by: OpenCode worker
- executed_at: 2026-03-20T09:35:34.470Z
- actual_model: zhipuai-coding-plan/glm-5
- status: failed

## 实际执行

- worker 已认领 request
- worker 调用 `opencode run` 尝试执行测试

## 结果

OpenCode 退出码为 1。

## 关键证据

1. stdout: `testing/distribution/artifacts/TREQ-2026-03-20-DISTRIBUTION-001-phase1-business-acceptance.stdout.log`
2. stderr: `testing/distribution/artifacts/TREQ-2026-03-20-DISTRIBUTION-001-phase1-business-acceptance.stderr.log`
3. raw log: `testing/distribution/artifacts/TREQ-2026-03-20-DISTRIBUTION-001-phase1-business-acceptance.opencode.log`

## 差异

[91m[1mError: [0mUnexpected error, check log file at /Users/luzhoua/.local/share/opencode/log/2026-03-20T093534.log for more details

attempt to write a readonly database

## 建议回传给规划端的结论

请读取本报告与 artifacts，判断是环境阻塞、模型权限问题，还是测试本身失败。
