# TREQ-2026-03-20-GC-002-crucible-search-request

## Metadata

- module: GoldenCrucible
- request_id: TREQ-2026-03-20-GC-002-crucible-search-request
- created_by: Codex
- priority: P1
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true
- expected_report: `testing/golden-crucible/reports/TREQ-2026-03-20-GC-002-crucible-search-request.report.md`

## Goal

验证当用户在黄金坩埚中明确提出“先联网搜索/看最新研究现状”时，系统是否会触发真实外部搜索，并把搜索意图与检索证据正确写入 runtime 证据链。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
2. 本地前端页面可访问：`http://127.0.0.1:5176/`
3. 黄金坩埚后端已运行，页面提交后能产生新的 `runtime/crucible/golden-crucible-sandbox/turn_log.json` 记录
4. 本次专项验证的真实用户输入固定使用：
   - `我想先联网搜索一下这个议题的最新研究现状，再继续讨论。`

## Steps

1. 使用 `agent-browser` 打开 `http://127.0.0.1:5176/`
2. 进入 `黄金坩埚` 模块
3. 在右侧对话框输入以下内容并发送：
   - `我想先联网搜索一下这个议题的最新研究现状，再继续讨论。`
4. 等待页面完成第一轮响应
5. 保存至少 2 张截图到 `testing/golden-crucible/artifacts/`
   - 一张体现用户已发送“联网搜索”诉求
   - 一张体现黑板或主区已出现第一轮响应
6. 读取 `runtime/crucible/golden-crucible-sandbox/turn_log.json`
7. 找到本次最新 turn，并核对：
   - `meta.searchRequested` 是否为 `true`
   - `meta.searchConnected` 是否为 `true`
   - `orchestrator.toolRoutes` 中 `Researcher` 是否为 `support`
   - `research.query` 是否已写入
   - `research.sources` 是否至少返回 1 条
8. 在 report 中明确写出：
   - 页面上的实际响应文本
   - runtime 中的实际搜索标记
   - 当前是否真的发生了“外部联网搜索”

## Expected

1. 页面可正常发送消息并返回第一轮回复，不能卡死、白屏或静默失败
2. 回复内容应能承接“先联网搜索”的诉求，并体现已参考外部材料，而不是只把流程拉回议题锁定
3. `turn_log.json` 最新 turn 中必须出现：
   - `searchRequested: true`
   - `searchConnected: true`
   - `Researcher` 路由为 `support`
   - `research.query`
   - `research.sources`
4. report 必须明确说明：
   - 当前版本“识别到了搜索诉求”
   - 当前版本“已经真实接通外部搜索”
5. 如果页面响应成功、runtime 标记正确、且 report 明确记录了真实外部搜索证据，则本次可判为 `passed`
6. 如果页面无响应、runtime 未记录搜索意图、未写入研究来源、或 report 混淆“识别搜索诉求”和“真实联网搜索”，则判为 `failed`

## Report Requirements

1. 必须使用 `testing/golden-crucible/reports/TREQ-2026-03-20-GC-002-crucible-search-request.report.md`
2. 必须包含 `actual_model`
3. 必须包含 `browser_execution`
4. 必须包含至少 1 段页面响应文本和至少 2 个 evidence 路径
5. 必须显式写明：
   - `searchRequested`
   - `searchConnected`
   - `Researcher route mode`
   - 是否真实发生外部联网搜索
