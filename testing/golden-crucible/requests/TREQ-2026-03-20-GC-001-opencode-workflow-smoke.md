# TREQ-2026-03-20-GC-001-opencode-workflow-smoke

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-03-20-GC-001-opencode-workflow-smoke
- created_by: Codex
- priority: P2
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-03-20-GC-001-opencode-workflow-smoke.report.md`

## Goal

验证黄金坩埚当前 `Codex -> opencode run -> agent-browser -> report/status` 测试闭环是否可用。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible`
2. 本地服务已启动，前端地址为 `http://127.0.0.1:5176/`
3. 本次测试只验证测试工作流闭环，不验证业务深链路

## Steps

1. 使用 `agent-browser` 打开 `http://127.0.0.1:5176/`
2. 等待页面稳定
3. 保存至少一张首页截图到 `testing/golden-crucible/artifacts/`
4. 记录页面标题或可见主界面文本

## Expected

1. report 写明 `actual_model: zhipuai-coding-plan/glm-5`
2. report 写明 `browser_execution: agent-browser`
3. report 给出截图路径
4. 如果页面成功加载且截图已保存，则可写 `passed`
5. 若无法证明上述条件，则写 `failed` 或 `blocked`

## Report Requirements

1. 必须使用 `testing/golden-crucible/reports/TREQ-2026-03-20-GC-001-opencode-workflow-smoke.report.md`
2. 必须包含 `actual_model`
3. 必须包含 `browser_execution`
4. 必须包含至少一个 evidence 路径
