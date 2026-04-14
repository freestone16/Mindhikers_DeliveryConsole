# TREQ-2026-03-20-GC-003-crucible-contextual-search-request

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-03-20-GC-003-crucible-contextual-search-request
- created_by: Codex
- priority: P1
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-03-20-GC-003-crucible-contextual-search-request.report.md`

## Goal

验证黄金坩埚在已经进入具体讨论语境后，是否能够正确承接“基于前文语境的联网搜索请求”，完成真实外部检索，并把搜索证据准确写入 runtime 证据链。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
2. 本地前端页面可访问：`http://127.0.0.1:5176/`
3. 黄金坩埚后端已运行，页面提交后能产生新的 `runtime/crucible/golden-crucible-sandbox/turn_log.json` 记录
4. 本次测试必须严格按以下 3 轮用户输入顺序执行，不可省略前 2 轮铺垫

## Conversation Script

### Round 1

`我最近越来越强烈地感觉，AI 让很多人都能比较快地做出 70 分的内容，但真正有价值的中文自媒体内容还是很少。我想讨论的是，高质量内容以后真正稀缺的东西到底是什么。`

### Round 2

`我现在的直觉是，稀缺的可能不是写作技巧本身，而是作者有没有真实经验、有没有判断力，以及能不能把复杂东西压成有穿透力的结构。但我也不确定这是不是只是我的偏见。`

### Round 3

`基于我们刚才这个问题，我想先联网搜索一下最近一两年关于 AI 内容泛滥、高质量内容稀缺性、以及创作者核心竞争力变化的研究或讨论，再继续往下聊。`

## Steps

1. 使用 `agent-browser` 打开 `http://127.0.0.1:5176/`
2. 进入 `黄金坩埚` 模块
3. 进入模块后，先执行一次“重置工作区”操作，确保不会沿用历史黑板或历史对话
4. 按顺序发送 Round 1、Round 2、Round 3 三条消息，每一轮都等待系统完成回复后再发送下一轮
5. 至少保存 4 张截图到 `testing/golden-crucible/artifacts/`
   - 进入坩埚后的初始状态
   - Round 1 或 Round 2 过程中已形成讨论语境的状态
   - Round 3 搜索请求已发送的状态
   - Round 3 回复完成后的最终状态
6. 读取 `runtime/crucible/golden-crucible-sandbox/turn_log.json`
7. 找到本次最新 turn，并核对：
   - `roundIndex` 是否已进入第 3 轮或更后
   - `userInput.latestUserReply` 是否对应 Round 3 搜索请求
   - `meta.searchRequested` 是否为 `true`
   - `meta.searchConnected` 是否为 `true`
   - `orchestrator.toolRoutes` 中 `Researcher` 是否为 `support`
   - `research.query` 是否已写入
   - `research.sources` 是否至少返回 1 条外部来源
8. 在 report 中记录：
   - 三轮实际页面响应摘要
   - 最后一轮是否明显承接前两轮语境
   - runtime 中的实际搜索标记
   - 当前是否真的发生了“外部联网搜索”
   - 最后一轮回复中是否出现了明确的外部材料痕迹

## Expected

1. 重置后初始状态必须是干净工作区，不能沿用旧黑板或旧对话
2. 前 2 轮能够形成具体讨论语境，而不是停留在空标题或空议题
3. 第 3 轮提出搜索需求后，系统回复必须明显承接前两轮内容，例如回应 AI 内容泛滥、高质量内容稀缺、经验/判断力/结构等上下文，而不是泛泛回应“这个议题”
4. 页面三轮交互都应正常完成，不能白屏、卡死或静默失败
5. `turn_log.json` 最新相关 turn 中必须出现：
   - `userInput.latestUserReply` 为 Round 3 搜索请求
   - `meta.searchRequested: true`
   - `meta.searchConnected: true`
   - `Researcher` 路由为 `support`
   - `research.query` 为实际检索语句
   - `research.sources` 至少 1 条
6. report 必须明确说明：
   - 当前版本已经能在“有语境”的前提下识别搜索诉求
   - 当前版本已经真实接通外部搜索
   - 若检索结果与用户议题存在偏移，也必须如实记录
7. 只有当“初始状态干净 + 语境成立 + 第 3 轮承接语境 + runtime 标记正确 + 确实发生外部联网搜索”同时满足时，才能判为 `passed`

## Report Requirements

1. 必须使用 `testing/golden-crucible/reports/TREQ-2026-03-20-GC-003-crucible-contextual-search-request.report.md`
2. 必须包含 `actual_model`
3. 必须包含 `browser_execution`
4. 必须包含至少 4 个 evidence 路径
5. 必须显式写明：
   - `roundIndex`
   - `latestUserReply`
   - `searchRequested`
   - `searchConnected`
   - `Researcher route mode`
   - 最后一轮是否承接前两轮语境
   - 是否真实发生外部联网搜索
