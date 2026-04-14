# TREQ-2026-04-12-GC-SAAS-001-core-path-smoke

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-04-12-GC-SAAS-001-core-path-smoke
- created_by: Codex
- priority: P1
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-001-core-path-smoke.report.md`

## Goal

验证 GoldenCrucible-SaaS 一期核心主链在 staging 环境可端到端跑通：登录 → 对话 → 导出。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
2. staging 环境已部署， Railway staging 域名可访问
3. 有一个可登录的测试账号（Google 或邮箱）
4. 本地 `agent-browser` 可用

## Steps

1. 使用 `agent-browser` 打开 staging URL
2. 完成登录（Google 或邮箱），确认进入产品主界面
3. 确认 trial status 显示正常（剩余对话数 / 轮次可见）
4. 新建一个对话，输入一条有效提问
5. 等待 SSE 响应完成，确认返回了有效回答
6. 再输入一条提问，确认第二轮也能成功
7. 打开历史列表，确认刚才的对话出现在列表中
8. 导出该对话为 `bundle-json`，确认文件下载成功
9. 导出该对话为 `markdown`，确认文件下载成功
10. 保存关键截图：登录后主界面、对话界面、历史列表、导出操作

## Expected

1. 登录后不白屏，主界面显示 trial 状态
2. 至少完成 2 轮有效问答，SSE 响应稳定
3. 历史列表包含刚创建的对话
4. `bundle-json` 导出文件结构正确（包含 version、conversation metadata、artifacts）
5. `markdown` 导出文件可读（包含标题、元数据、对话正文）
6. 全程无 console 错误或白屏

## Report Requirements

1. 写明 `actual_model`
2. 写明 `browser_execution`
3. 给出 evidence 路径（至少 3 张截图 + 2 个导出文件）
4. 写明 staging 环境地址
5. 最终写出 `status`
