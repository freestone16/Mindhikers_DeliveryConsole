# TREQ-2026-04-12-GC-SAAS-002-auth-smoke

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-04-12-GC-SAAS-002-auth-smoke
- created_by: Codex
- priority: P1
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-002-auth-smoke.report.md`

## Goal

验证 PRD §5.1.1 登录与认证：Google 登录和邮箱登录都能成功进入产品主链，登录态刷新后保持。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
2. staging 环境已部署， Railway staging 域名可访问
3. 有一个 Google 账号可登录
4. 有一个邮箱账号可注册/登录
5. 本地 `agent-browser` 可用

## Steps

### Part A: Google 登录

1. 使用 `agent-browser` 打开 staging URL
2. 点击 Google 登录按钮
3. 完成 Google OAuth 流程
4. 确认进入产品主界面（不白屏）
5. 确认 personal workspace 自动创建
6. 刷新页面，确认登录态保持
7. 截图：登录后主界面、workspace 信息

### Part B: 邮箱登录

1. 使用 `agent-browser` 打开 staging URL（隐身或新 session）
2. 点击邮箱注册/登录
3. 输入测试邮箱，完成注册/登录流程
4. 确认进入产品主界面（不白屏）
5. 确认 personal workspace 自动创建
6. 刷新页面，确认登录态保持
7. 截图：邮箱登录后主界面、workspace 信息

### Part C: 登录失败处理

1. 输入无效凭证
2. 确认显示可理解的错误提示
3. 确认不暴露敏感信息（stack trace、内部错误详情）

## Expected

1. Google 登录成功后进入对话主链，不白屏
2. 邮箱登录成功后进入对话主链，不白屏
3. 两种方式登录后都自动创建 personal workspace
4. 页面刷新后登录态保持，不需要重新登录
5. 登录失败时显示可理解提示，不暴露敏感信息

## Report Requirements

1. 写明 `actual_model`
2. 写明 `browser_execution`
3. 给出 evidence 路径（至少 4 张截图：Google 登录成功、邮箱登录成功、workspace 信息、错误提示）
4. 分别记录两种登录方式的耗时和结果
5. 最终写出 `status`
