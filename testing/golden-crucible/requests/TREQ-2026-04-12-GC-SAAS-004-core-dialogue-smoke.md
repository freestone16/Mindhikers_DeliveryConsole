# TREQ-2026-04-12-GC-SAAS-004-core-dialogue-smoke

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-04-12-GC-SAAS-004-core-dialogue-smoke
- created_by: Codex
- priority: P0
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-004-core-dialogue-smoke.report.md`

## Goal

验证 PRD §5.1.3 对谈主链在本地 / staging 环境可稳定使用：新建对话 → 多轮问答 → 刷新恢复 → 继续对话。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
2. 服务已启动（本地 `npm run dev` 或 staging 环境）
3. 已有一个可登录的测试账号
4. 本地 `agent-browser` 可用

## Steps

### Phase 1: 新建对话 + 3 轮问答

1. 使用 `agent-browser` 以测试账号登录
2. 进入 Crucible 对话页面
3. 新建对话，输入第 1 轮提问："请帮我分析一下人工智能在教育领域的应用前景"
4. 等待 SSE 响应完成，确认收到老卢/老张的正常回复
5. 输入第 2 轮提问："具体在个性化学习方面有哪些可行的方案？"
6. 等待 SSE 响应完成
7. 输入第 3 轮提问："这些方案的落地难点是什么？"
8. 等待 SSE 响应完成
9. 截图：3 轮对话完成后的页面状态
10. 记录当前 conversation ID（从 URL 或页面状态中提取）

### Phase 2: 刷新恢复

1. 刷新页面（F5 或全量刷新）
2. 等待页面加载完成
3. 确认历史对话出现在历史列表中
4. 点击恢复刚才的对话
5. 确认 3 轮问答内容完整恢复
6. 截图：恢复后的对话内容

### Phase 3: 继续对话

1. 在恢复的对话中输入第 4 轮提问："针对师资不足的问题，AI 能提供哪些辅助？"
2. 等待 SSE 响应完成
3. 确认对话继续正常进行，未出现上下文断裂
4. 截图：4 轮对话完成后的页面状态

## Expected

1. 3 轮新建对话全部正常完成，SSE 响应完整
2. 刷新页面后对话可完整恢复
3. 恢复后继续对话正常，上下文连贯
4. 全程无 JS 控制台错误
5. SSE 流无中断或超时

## Report Requirements

1. 写明 `actual_model`
2. 写明 `browser_execution`
3. 给出 evidence 路径（至少 4 张截图：3 轮完成、刷新恢复、4 轮完成、控制台状态）
4. 记录 conversation ID
5. 记录每轮 SSE 响应时间（大致）
6. 最终写出 `status`
