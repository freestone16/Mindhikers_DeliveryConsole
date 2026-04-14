# TREQ-2026-04-12-GC-SAAS-005-history-and-export-smoke

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-04-12-GC-SAAS-005-history-and-export-smoke
- created_by: Codex
- priority: P0
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-005-history-and-export-smoke.report.md`

## Goal

验证 PRD §5.1.4 历史列表、active conversation 恢复、`bundle-json` 与 `markdown` 导出可用。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
2. 服务已启动（本地或 staging）
3. 已有测试账号，且至少有一条对话记录（可复用 TREQ-004 创建的对话）
4. 本地 `agent-browser` 可用

## Steps

### Phase 1: 历史列表验证

1. 使用 `agent-browser` 以测试账号登录
2. 打开历史列表页面
3. 确认至少有 1 条历史对话记录
4. 确认历史列表显示对话标题、创建时间等元信息
5. 截图：历史列表

### Phase 2: Active Conversation 恢复

1. 点击历史列表中的某条对话
2. 等待对话内容加载
3. 确认对话消息完整恢复（含所有轮次的问答）
4. 确认对话可以继续（可输入新消息）
5. 截图：恢复后的对话页面

### Phase 3: Bundle-JSON 导出

1. 在对话页面触发导出功能
2. 选择 `bundle-json` 格式导出
3. 确认导出文件下载成功
4. 验证导出文件内容包含：
   - 对话消息列表
   - artifacts（如有）
   - metadata（workspace、conversation ID 等）
5. 截图：导出操作 + 文件内容预览

### Phase 4: Markdown 导出

1. 在同一对话页面再次触发导出
2. 选择 `markdown` 格式导出
3. 确认导出文件下载成功
4. 验证 markdown 文件内容包含对话文本
5. 截图：markdown 导出文件预览

## Expected

1. 历史列表正确展示已有对话
2. 点击历史对话可完整恢复内容
3. `bundle-json` 导出包含完整结构化数据
4. `markdown` 导出包含可读的对话内容
5. 导出文件名包含 conversation ID 或时间戳等唯一标识

## Report Requirements

1. 写明 `actual_model`
2. 写明 `browser_execution`
3. 给出 evidence 路径（至少 4 张截图 + 导出文件内容样本）
4. 记录导出文件大小和内容概要
5. 最终写出 `status`
