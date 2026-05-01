# TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke
- created_by: Codex
- priority: P0
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke.report.md`

## Goal

验证 PRD §5.1.5 ThesisWriter 全链路：收敛触发 → CTA 出现 → 生成论文 → artifact 保存 → 导出可见 → trial 额度限制。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
2. 服务已启动（本地或 staging）
3. 已有测试账号（平台模式，非 VIP）
4. 本地 `agent-browser` 可用
5. 当前测试账号的论文额度未耗尽

## Steps

### Phase 1: 对话收敛触发

1. 使用 `agent-browser` 以测试账号登录
2. 新建对话
3. 持续进行多轮对话（至少 6 轮），引导话题深入到一个具体方向
4. 示例对话路径：
   - 第 1 轮："请帮我深入分析一下终身学习的必要性"
   - 第 2 轮："在现代社会中，终身学习面临哪些主要障碍？"
   - 第 3 轮："技术手段如何帮助克服这些障碍？"
   - 第 4 轮："在线教育平台在终身学习中扮演什么角色？"
   - 第 5 轮："如何评估终身学习的效果？"
   - 第 6 轮（老卢 crystallization 阶段触发收敛）
5. 每轮等待 SSE 响应完成
6. 观察是否出现 ThesisWriter CTA（Sparkles 图标的"生成论文"按钮）
7. 截图：CTA 出现时的对话页面

### Phase 2: 论文生成

1. 点击 ThesisWriter CTA 按钮
2. 等待论文生成完成（loading 状态）
3. 确认生成成功，论文内容以 Markdown 形式返回
4. 确认前端显示下载按钮或论文预览
5. 下载/保存论文
6. 截图：论文生成成功状态

### Phase 3: Artifact 验证

1. 查看当前对话的 artifacts 列表
2. 确认 `thesis_` 前缀的 artifact 已保存
3. 导出当前对话为 `bundle-json`，确认包含 thesis artifact
4. 导出当前对话为 `markdown`，确认包含论文内容或引用
5. 截图：artifact 列表 + 导出内容

### Phase 4: Trial 额度验证

1. 查看当前 trial status（对话页或设置页的额度展示）
2. 确认论文额度已从 "剩余 2 次" 变为 "剩余 1 次"
3. 如果可能，再创建一个新对话并尝试第二次论文生成
4. 确认第二次生成成功后额度变为 "已用完"
5. 尝试第三次生成，确认被正确拦截并显示清晰提示
6. 截图：额度变化 + 超限提示

## Expected

1. 对话达到收敛条件后 ThesisWriter CTA 正确出现
2. 点击 CTA 后论文生成成功，返回有效 Markdown
3. 论文 artifact 保存到 conversation 并可导出
4. 平台用户论文额度限 2 次，超限后正确拦截
5. 超限提示清晰，引导用户了解 BYOK 等后续选项

## Report Requirements

1. 写明 `actual_model`
2. 写明 `browser_execution`
3. 给出 evidence 路径（至少 5 张截图：CTA 出现、生成成功、artifact 列表、额度展示、超限提示）
4. 记录收敛触发的具体轮次和条件
5. 记录论文生成耗时
6. 记录 trial 额度状态变化
7. 最终写出 `status`
