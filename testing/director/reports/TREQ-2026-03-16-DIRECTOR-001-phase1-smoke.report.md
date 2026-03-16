# TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.report

## 元信息

- request_id: TREQ-2026-03-16-DIRECTOR-001-phase1-smoke
- executed_by: OpenCode worker
- executed_at: 2026-03-16T00:42:51.526Z
- status: failed

## 实际执行

- worker 已认领 request
- worker 调用 `opencode run` 尝试执行测试

## 结果

OpenCode 退出码为 1。

## 关键证据

1. stdout: `testing/director/artifacts/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.stdout.log`
2. stderr: `testing/director/artifacts/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.stderr.log`
3. raw log: `testing/director/artifacts/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.opencode.log`

## 差异

ERROR 2026-03-16T00:42:50 +46ms service=models.dev error=Unable to connect. Is the computer able to access the url? Failed to fetch models.dev
[91m[1mError: [0mUnexpected error, check log file at /Users/luzhoua/.local/share/opencode/log/2026-03-16T004251.log for more details

attempt to write a readonly database

## 建议回传给规划端的结论

请读取本报告与 artifacts，判断是环境阻塞、模型权限问题，还是测试本身失败。
