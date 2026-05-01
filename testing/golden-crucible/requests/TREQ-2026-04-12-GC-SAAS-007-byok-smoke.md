# TREQ-2026-04-12-GC-SAAS-007-byok-smoke

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-04-12-GC-SAAS-007-byok-smoke
- created_by: Codex
- priority: P1
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-007-byok-smoke.report.md`

## Goal

验证 PRD §5.1.6 BYOK 模式：配置保存 → 连通性测试 → BYOK 模式下对谈 → BYOK 模式下论文生成 → 配置清除。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
2. 服务已启动（本地或 staging）
3. 已有测试账号
4. 有可用的 BYOK 配置（如 Kimi API Key 或其他 OpenAI 兼容 provider）
5. 本地 `agent-browser` 可用

## Steps

### Phase 1: BYOK 配置与连通性测试

1. 使用 `agent-browser` 以测试账号登录
2. 进入 LLM 配置页面
3. 确认看到默认推荐（Kimi 原厂）和引导文案
4. 填写 BYOK 配置：
   - Base URL（如 `https://api.moonshot.cn/v1`）
   - API Key（有效 key）
   - Model（如 `moonshot-v1-8k`）
5. 点击"测试连通性"按钮
6. 确认连通性测试成功
7. 保存 BYOK 配置
8. 截图：配置页面 + 测试成功状态

### Phase 2: BYOK 模式对谈

1. 返回对话页面
2. 确认 trial status 显示当前为 BYOK 模式
3. 新建对话，输入 1 轮提问："请简要介绍你自己"
4. 等待 SSE 响应完成
5. 确认响应正常，且实际使用了 BYOK 配置的模型
6. 截图：BYOK 模式对话

### Phase 3: BYOK 模式论文生成（额度不受限）

1. 在 BYOK 模式下继续对话至收敛（或复用已有收敛对话）
2. 触发 ThesisWriter 生成论文
3. 确认论文生成成功
4. 确认 BYOK 模式下论文额度不受平台 trial 限制
5. 截图：BYOK 模式论文生成

### Phase 4: 配置清除与回退

1. 返回 LLM 配置页面
2. 清除 BYOK 配置
3. 确认配置已清除，系统回退到默认模式
4. 返回对话页面确认 trial status 恢复为平台模式
5. 截图：配置清除后状态

## Expected

1. BYOK 配置可正常保存和测试
2. 引导文案清晰，推荐 provider 可见
3. BYOK 模式下对谈正常，使用用户配置的模型
4. BYOK 模式下论文生成不受 trial 额度限制
5. BYOK 配置可清除，系统正确回退到平台模式
6. 错误诊断对常见错误（key 无效、超时、模型不存在）给出可读提示

## Report Requirements

1. 写明 `actual_model`
2. 写明 `browser_execution`
3. 给出 evidence 路径（至少 4 张截图：配置成功、BYOK 对话、论文生成、清除后回退）
4. 记录 BYOK 使用的 provider 和模型
5. 记录连通性测试结果和耗时
6. 最终写出 `status`
