# TREQ-2026-04-12-GC-SAAS-003-cross-account-isolation-smoke

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-04-12-GC-SAAS-003-cross-account-isolation-smoke
- created_by: Codex
- priority: P1
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-003-cross-account-isolation-smoke.report.md`

## Goal

验证 PRD §5.1.2 多账号与 Workspace 隔离：A 账号创建的对话与产物对 B 账号完全不可见。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
2. staging 环境已部署
3. 有两个不同的测试账号（Account A 和 Account B）
4. 本地 `agent-browser` 可用

## Steps

### Phase 1: Account A 创建数据

1. 使用 `agent-browser` 以 Account A 登录
2. 新建一个对话，输入一条具有唯一标识的提问（例如包含随机标记 `isolation-test-A-XXXX`）
3. 等待 SSE 响应完成
4. 确认对话出现在历史列表
5. 导出该对话为 markdown，保存导出文件名
6. 记录当前 URL 路径和对话 ID
7. 退出 Account A

### Phase 2: Account B 不可见验证

1. 使用 `agent-browser` 以 Account B 登录
2. 查看历史列表，确认不包含 Account A 的对话（特别是包含 `isolation-test-A-XXXX` 标记的对话）
3. 尝试直接访问 Account A 的对话 URL（如已知 conversation ID）
4. 确认返回 403 / 404 或空内容，不暴露 Account A 的对话数据
5. 查看导出列表，确认不包含 Account A 的导出记录
6. 截图：Account B 的历史列表（应为空或仅含 B 自己的数据）

### Phase 3: Account A 恢复验证

1. 重新以 Account A 登录
2. 确认历史列表仍然包含之前创建的对话
3. 确认对话内容完整，未被 Account B 修改
4. 截图：Account A 的历史列表恢复确认

## Expected

1. Account B 的历史列表中看不到 Account A 的任何对话
2. Account B 无法通过 URL 直接访问 Account A 的对话
3. Account A 重新登录后数据完整无损
4. 贯穿全流程无数据串联或泄露

## Report Requirements

1. 写明 `actual_model`
2. 写明 `browser_execution`
3. 给出 evidence 路径（至少 3 张截图：A 创建对话、B 空历史、A 恢复确认）
4. 记录直接 URL 访问 Account A 对话时的具体响应
5. 最终写出 `status`
