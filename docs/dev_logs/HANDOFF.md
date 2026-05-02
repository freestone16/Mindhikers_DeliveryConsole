🕐 Last updated: 2026-05-01 23:14 CST
🌿 Branch: MHSDC-DC-MKT

## 2026-05-01 23:14 保存点：收口待提交

- 用户要求：停止继续大改 UI，进入收口。
- 当前分支：`MHSDC-DC-MKT`。
- 收口结论：
  - 本窗口工作可以作为一个逻辑提交：build 修绿 + 正式 Marketing Delivery Shell 第一版 + warm paper 桥接 + 对应过程文档。
  - 不再继续推进 P2 三段式原生布局；下一窗口单独开。
- 最终验证：
  - `npm run build` 通过；仅剩 Vite chunk size warning。
  - `npx tsc --noEmit` 通过。
  - `git diff --check` 通过。
  - agent-browser 正式页面验证截图：`/Users/luzhoua/.agent-browser/tmp/screenshots/screenshot-1777648171631.png`。
- 建议纳入提交的文件：
  - `README.md`
  - `docs/04_progress/dev_progress.md`
  - `docs/dev_logs/HANDOFF.md`
  - `docs/dev_logs/2026-05-01_MarketingMaster_Build_and_Shell.md`
  - `src/App.tsx`
  - `src/components/MarketingSection.tsx`
  - `src/components/ScheduleModal.tsx`
  - `src/components/StatusDashboard.tsx`
  - `src/components/director/Phase3View.tsx`
  - `src/components/market/MarketPhase1New.tsx`
  - `src/components/market/MarketPhase2.tsx`
  - `src/components/market/MarketPhase2New.tsx`
  - `src/components/market/MarketPhase3.tsx`
  - `src/components/market/SRTUploader.tsx`
  - `src/components/market/MarketingWorkbenchShell.tsx`
  - `src/styles/marketing-workbench.css`
  - `src/mocks/marketMockData.ts`
  - `src/mocks/marketMockDataV3.ts`
  - `src/types.ts`
- 明确不纳入提交：
  - `.agent/config/llm_config.json`
  - `.vibedir/skill_drafts/Codex_OldYang_20260430.md`
  - `.vibedir/skill_registry.yml`
- 下一窗口建议：
  1. P2 原生三段式布局：方案选择 / 完整描述编辑 / SEO-GEO 检查。
  2. 1366 宽度截图验证。
  3. 再讨论是否扩展持久化 phase 到 `1 | 2 | 3 | 4`。

## 2026-05-01 23:09 保存点：正式 Shell warm paper 化第二刀

- 用户要求：上下文窗口还有，继续按计划推进 UI。
- 当前分支：`MHSDC-DC-MKT`。
- 本轮继续完成：
  - 新增 `src/styles/marketing-workbench.css`，只在 `.marketing-workbench-shell` 作用域内覆盖旧深色 Tailwind slate 样式。
  - `MarketingWorkbenchShell.tsx` 引入正式工作台局部样式，不污染 Director / Shorts / 全局页面。
  - `App.tsx` 对 MarketingMaster 放开旧 `max-w-7xl` 宽度约束，并把页面 padding 从 `px-6 py-8` 调整为 Marketing 专用 `px-3 py-4`。
  - Phase 1 / Phase 2 旧组件已初步接入 warm paper 色系：面板、表格、输入框、按钮 hover、边框、文字层级不再大面积深蓝黑。
- 已验证：
  - `npm run build` 通过；仍只有 Vite chunk 大小 warning。
  - agent-browser 打开正式入口并切到 `营销大师`，确认正式页面横向空间改善、旧深色块已暖色化。
  - 截图：`/Users/luzhoua/.agent-browser/tmp/screenshots/screenshot-1777648171631.png`。
  - `agent-browser errors` 仍返回空内容但退出码为 1，无实际错误文本；继续以 snapshot、build、console 为依据。
- 当前 UI 状态：
  - 正式壳层已经可用。
  - Phase 内部样式现在是局部 bridge 方案，适合快速统一视觉；后续若要更精细，仍建议逐步把 `CandidateKeywordList`、`KeywordScoreTable`、`MarketPlanTable` 改成原生 warm paper class，而不是长期只靠 CSS override。
- 下一步建议：
  1. 针对 P2 做原生布局改造：左侧方案/字段，中央完整描述，右侧 SEO/GEO 检查，减少对 override 的依赖。
  2. 做 1366 宽度截图检查，确认右栏与 P2 大文本区不会挤压。
  3. 再处理 P3/P4 正式生产语义与状态迁移。

## 2026-05-01 22:54 保存点：build 修绿 + 正式 Marketing Shell 第一版

- 用户要求：按老杨计划开展工作，先修 `npm run build`，再做 UI。
- 当前分支：`MHSDC-DC-MKT`。
- 本轮已完成：
  - `npm run build` 已从失败修到通过。
  - 修复旧类型债：
    - Director `Phase3View.tsx` 补齐 `Sparkles` 导入，并移除未使用 `onProceed` 解构。
    - 旧 `MarketPhase2.tsx` / `MarketPhase3.tsx` 改用新的 flat `TubeBuddyScore.overall/searchVolume/competition/relevance`。
    - `ScheduleModal.tsx` / `StatusDashboard.tsx` 对旧 `DeliveryState.modules` 做可选兼容，避免新状态结构下 build 失败。
    - mock TubeBuddy 数据更新为真实 flat 结构。
    - 清理 `MarketPhase1New.tsx`、`MarketPhase2New.tsx` 未使用变量。
  - 正式 Marketing 页面已接入第一版 Delivery Shell：
    - 新增 `src/components/market/MarketingWorkbenchShell.tsx`。
    - `MarketingSection.tsx` 改为使用正式壳层包住现有 Phase 1 / Phase 2 业务组件。
    - 左栏加入 Delivery 共用工作站入口，支持收起/展开。
    - 中栏加入 P1/P2/P3/P4 header；P1/P2 保持现有业务状态，P3/P4 先作为禁用语义位。
    - 右栏加入 Artifacts / Runtime / Handoff Notes，支持收起/展开。
- 已验证：
  - `npm run build` 通过；仅剩 Vite chunk 大小 warning，不是失败项。
  - `npx tsc --noEmit` 通过。
  - `git diff --check` 通过。
  - agent-browser 打开 `http://localhost:5174`，切到 `营销大师`，正式壳层已渲染。
  - agent-browser 已验证左右栏收起状态可见。
  - 截图：`/Users/luzhoua/.agent-browser/tmp/screenshots/screenshot-1777647220210.png`。
  - `agent-browser errors` 返回空内容但退出码为 1，无实际错误文本；以 snapshot、console、build 为本轮验证依据。
- 当前 WIP 注意：
  - `.agent/config/llm_config.json` 仍是本地配置变化，不默认纳入提交。
  - `.vibedir/` 仍是未跟踪技能备案草稿，不默认纳入提交。
- 下一步建议：
  1. 把正式壳层里的 Phase 1 / Phase 2 内部深色旧组件逐步改成 warm paper 工作台样式。
  2. 为正式 P2 做更完整的左右布局，保证描述编辑器在新壳层内拥有足够阅读空间。
  3. 再决定是否把持久化 `MarketModule_V3.phase` 从 `1 | 2` 扩到 `1 | 2 | 3 | 4`。

## 2026-05-01 22:35 保存点：提交前收口

- 用户要求：`commit&push`，并保存开发进度，稍后开新窗口继续排错。
- 当前分支：`MHSDC-DC-MKT`。
- 本轮主要成果：
  - TubeBuddy 真实评分链路修复：Studio-first Keyword Explorer、禁用假评分、主分与副指标真实读取。
  - 重新点选脚本即重置业务流程；关闭窗口后未重新点选脚本则保留进度。
  - Phase 2 生成无反应与描述行展开黑屏问题已修复。
  - 新增 Marketing UI 改版 demo：`http://localhost:5174/#/marketing-redesign-demo`。
  - 新增 `DescriptionReviewPanel`，P2 支持完整视频描述大编辑/全局预览与 SEO/GEO 检查。
  - P3 demo 已从 JSON 审核改为平台适配与 DT 交接检查。
  - 左栏 demo 已按 Director `design.md` 和 `WorkstationRail` 结构复刻：topbar brand、260px rail、60px collapsed、工作站列表、session list、bottom dock。
  - 左栏最后一次用户反馈后，仅保留两处精修：音乐图标使用 Director 同款 `Music`；`工作站` 字距调为 `0.16em`，不再加粗。
- 过程资产已更新：
  - `README.md`
  - `docs/04_progress/dev_progress.md`
  - `docs/04_progress/rules.md`
  - `docs/plans/2026-05-01_MarketingMaster_UI_Redesign_Plan.md`
  - `docs/plans/2026-05-01_MarketingMaster_DeliveryShell_UI_Implementation_Plan.md`
  - `docs/dev_logs/HANDOFF.md`
- 验证：
  - `npx tsc --noEmit` 通过。
  - `git diff --check` 通过。
  - agent-browser 最新 demo 截图：`/Users/luzhoua/.agent-browser/tmp/screenshots/screenshot-1777645975679.png`。
  - `npm run build` 仍失败，但失败来自既有全量打包债务，不全是本轮引入：
    - Director `Phase3View.tsx` 未导入/未使用问题。
    - 旧 `MarketPhase2.tsx` / `MarketPhase3.tsx` 仍引用旧 `TubeBuddyScore.overallScore/metrics`。
    - `ScheduleModal.tsx` / `StatusDashboard.tsx` 仍引用旧 `DeliveryState.modules`。
    - 当前主线验证以 `npx tsc --noEmit`、局部 UI snapshot 和真实功能链路为准。
- 提交注意：
  - 不纳入 `.agent/config/llm_config.json` 本地配置变更。
  - 不纳入未跟踪 `.vibedir/` 技能备案草稿，除非用户后续明确要求。
- 下一窗口建议继续：
  1. 先排 `npm run build` 的旧类型债：Director `Sparkles`、旧 MarketPhase2/3、Schedule/StatusDashboard。
  2. 再决定是否把正式 `MarketModule_V3.phase` 从 `1 | 2` 扩到 `1 | 2 | 3 | 4`。
  3. 最后把 demo shell 抽进正式 Marketing 页面，保持业务状态机不被破坏。

## 2026-05-01 22:17 保存点：Delivery Shell UI 实施启动

- 用户要求：评估工作量，调用 CE 合适角色写实施方案，更新 README 等过程资产，然后开始实施。
- 工作量判断：中等偏大，正式生产 UI 按 3-5 个实施单元推进；本轮先完成可验证的 P2/P3 关键结构和 demo 对齐。
- CE 规划产物：
  - `docs/plans/2026-05-01_MarketingMaster_DeliveryShell_UI_Implementation_Plan.md`
  - 覆盖工作量、P1-P4 定义、P2 完整视频描述编辑器、SEO/GEO 顺序、P3 新定位、Director design.md 对齐清单、实施单元、验收和风险。
- 已实施：
  - `src/components/market/DescriptionReviewPanel.tsx`
    - 新增 P2 完整视频描述审阅台。
    - 左侧区块编辑，右侧完整 YouTube 描述全局预览。
    - 内置 SEO/GEO 检查：前两行主关键词、GEO 问答、章节时间轴、Hashtags 数量。
  - `src/components/market/MarketPlanTable.tsx`
    - Phase 2 ready 后把完整描述审阅台提升到表格上方。
    - 以 `descriptionBlocks` 为编辑事实源，同步回 `content`，降低预览/导出不一致风险。
  - `server/market.ts`
    - LLM 生成提示调整为 SEO/GEO 顺序：前两行钩子 → 价值说明 → GEO 问答 → 时间轴 → 参考 → CTA → 置顶评论 → Hashtags。
    - Hashtags 建议从 5-8 个收紧到 2-4 个核心标签。
  - `src/components/market/DescriptionEditor.tsx`
    - 区块提示文案与 SEO/GEO 顺序对齐。
  - `src/mocks/marketMockDataV3.ts`
    - mock 描述块顺序与标签数量更新。
  - `src/components/market/MarketingRedesignDemo.tsx`
    - P2 demo 改成“发布文案审阅台”，展示大文本编辑和全局预览。
    - P3 demo 改成“平台适配与交接检查”，不再把 JSON 作为主审阅对象。
  - `README.md`
    - 更新当前状态、demo 入口、P1-P4 新定义、Director 对齐方向。
  - `docs/04_progress/dev_progress.md`
    - 新增 v4.2.0 里程碑。
  - `docs/04_progress/rules.md`
    - 新增 MarketingMaster/Director shell 对齐、P2 描述审阅、P3 非 JSON 主审规则。
- 已验证：
  - `npx tsc --noEmit` 通过。
  - `git diff --check` 通过。
  - agent-browser 打开 `http://localhost:5174/#/marketing-redesign-demo` 成功。
  - P2 snapshot 已确认出现：`发布文案审阅台`、`结构化编辑`、`全局预览`、`SEO/GEO 顺序锁定`。
  - P3 snapshot 已确认出现：`平台适配与交接检查`、`不审核 JSON`、`DT Contract`。
  - 截图：
    - P2：`/Users/luzhoua/.agent-browser/tmp/screenshots/screenshot-1777644977007.png`
    - P3：`/Users/luzhoua/.agent-browser/tmp/screenshots/screenshot-1777644999064.png`
- 注意：
  - 正式 `MarketModule_V3.phase` 目前仍是 `1 | 2`，本轮没有贸然扩到 `1 | 2 | 3 | 4`，避免破坏旧持久化状态。
  - 本轮已开始实施 P2 正式组件和 demo P3 语义；完整 Delivery Shell 生产替换仍应按 plan 的 Unit 1 继续。
  - 目前 `agent-browser errors` 输出为空标记，但没有实际错误内容；以 snapshot + tsc + diff check 为本轮验证依据。

## 2026-05-01 15:23 保存点：UI 改版 Demo 现场

- 前后台仍在运行：
  - 后端：`http://localhost:3002`
  - 前端：`http://localhost:5174`
  - UI demo：`http://localhost:5174/#/marketing-redesign-demo`
- 当前用户最新方向已经落到 demo：
  - 左栏必须和导演大师保持一致，作为最终 Delivery 共用功能区收口
  - MarketingMaster 内部 Phase 不再放左栏，已移到中栏 header，用 `P1/P2/P3/P4`
  - 运行态、队列、日志、保存状态、下游交接状态统一放右栏 `Artifacts`
  - 左右栏保留手动收起/展开与拖拽调宽
  - 色调采用 GoldenCrucible 米色系，按钮圆角和模块间距已压紧
- 已新增/调整：
  - `src/components/market/MarketingRedesignDemo.tsx`
    - Delivery 左栏：`影视导演 / 短视频 / 缩略图 / 音乐 / 营销 / 视觉审计`
    - 中栏 header：`营销大师工作台 | 当前 Phase` + `P1-P4`
    - 右栏：`Artifacts` 运行态与事件日志
    - P1 关键词、P2 方案审阅、P3 DT 交接、P4 确认导出四个 demo 页面
  - `src/App.tsx`
    - 增加 `#/marketing-redesign-demo` demo 路由
  - `docs/plans/2026-05-01_MarketingMaster_UI_Redesign_Plan.md`
    - 规划同步改成：左栏共用、Phase 中栏、运行态右栏
- 已验证：
  - `npx tsc --noEmit` 通过
  - `git diff --check` 通过
  - `agent-browser snapshot` 已确认页面结构：
    - 左栏出现 `Delivery` 与共用模块列表
    - 中栏 header 出现 `P1/P2/P3/P4`
    - 右栏出现 `Artifacts`、`TubeBuddy`、`Ready`、事件日志
  - 最新截图：
    - `/Users/luzhoua/.agent-browser/tmp/screenshots/screenshot-1777620156316.png`
- 下一步回来接着干：
  1. 让用户先看新版 demo 视觉：重点检查左栏是否已足够贴近导演大师。
  2. 如果认可 demo 方向，再把正式 MarketingMaster 页面拆成 `MarketingWorkbenchShell / MarketingLeftRail / MarketingRuntimeInspector`。
  3. 先壳层替换，不动业务状态机；再把 Phase 1 / Phase 2 逐步搬进去。
  4. 真实 UI 验收仍由用户做，agent-browser 只做结构、错误、截图辅助核验。

## 当前状态

- 前后端已重新拉起：后端 `http://localhost:3002`，前端 `http://localhost:5174`
- 本轮主线：修复 MarketingMaster Phase 1 的 TubeBuddy 真实评分链路，禁止假评分“秒出”
- 当前结论：候选关键词生成已恢复；TubeBuddy 评分不再返回 mock 分数；Studio 内 TubeBuddy Keyword Explorer 主评分链路和副指标图表读取均已跑通
- 关键认知修正：日常关键词检索入口是 YouTube Studio 内 TubeBuddy 快捷入口/菜单，不是 `www.tubebuddy.com/account`
- 当前代码路径已改为 Studio-first：Studio 页面 → 右上角青色 TubeBuddy 按钮 → `Keyword Explorer`
- 当前剩余问题：真实 UI 全流程仍需在用户选择项目/脚本后点一次 Phase 1；后端真实评分和表格显示策略已验证
- 详细过程日志：`docs/dev_logs/2026-04-30_TubeBuddy_RealScoring_Debug.md`

## 20:43 保存点

- 再次确认入口：YouTube Studio 右上角青色 TubeBuddy 按钮 → `Keyword Explorer`；如果后续找不到入口，必须明确告诉用户，不要猜路径
- 修复副指标图表解析：旧正则在 page evaluate 里写成了过度转义，导致图表百分比匹配不到，并把缺省误算为 0
- 新策略：`overall/searchVolume` 仍为必读；`competition/optimization/relevance` 可缺省；读到 TubeBuddy 图表时显示真实数值，读不到时 UI 显示“待校准”
- 3 个正式样本复测已通过：
  - `黄金精神`：`overall=58 searchVolume=33 competition=57 optimization=100`，等级 `Fair/Good/Excellent`
  - `AI教育`：`overall=29 searchVolume=46 competition=23 optimization=100`，等级 `Good/Fair/Excellent`
  - `扩展心灵论`：`overall=46 searchVolume=1 competition=100 optimization=100`，等级 `Poor/Excellent/Excellent`
  - `TOTAL_TIME=17.760629s`
- agent-browser 已做 UI 内存态回放验证：表头显示 `竞争机会/优化机会`；有数值时显示“数值 + 等级”；缺省副指标显示“待校准”

## 19:52 保存点

- 用户确认 “黄金精神” 分数已在 TubeBuddy Keyword Explorer 看到，当前卡点不再是登录/授权
- 真实评分链路保存状态：Studio 右上角 TubeBuddy 菜单 → `Keyword Explorer` → 输入关键词 → 读取 `overall` 主分
- 3 个正式样本已经跑完，总耗时 `14.978046s`，约 5 秒/关键词，可继续扩到 10 个样本做 UI 端到端验收
- 当前不建议提交：副指标 `competition/optimization` 仍需校准，避免把 TubeBuddy 的等级/图表信息硬造为假精度
- 当前不需要再重复 TubeBuddy 授权；如果后续换运营账号，只替换自动化 Chrome 登录态后复测 token/Studio 入口即可

## 本轮完成

1. ✅ 修复候选关键词生成：后端正确读取 `callLLM()` 的 `content` 字段，避免闪一下后回到原页
2. ✅ 安装并接入真实 Playwright：`package.json` / `package-lock.json` 增加 `playwright`
3. ✅ 接入本机 TubeBuddy Chrome 扩展：
   - 扩展路径：`/Users/luzhoua/Library/Application Support/Google/Chrome/Default/Extensions/mhkhmbddkmdggbhaaaodilponhnccicb/2002_0`
   - 自动化 profile：`/Users/luzhoua/.tubebuddy-chrome-profile`
4. ✅ 禁用 TubeBuddy mock/fallback 评分：缺浏览器、缺授权、缺选择器时抛出错误，不再生成假分
5. ✅ 修正前端评分表字段：从 flat `TubeBuddyScore` 读取 `overall/searchVolume/competition/optimization/relevance`
6. ✅ 增加 TubeBuddy 调试接口：
   - `GET /api/market/v3/tubebuddy-debug`
   - `GET /api/market/v3/tubebuddy-screenshot`
   - `POST /api/market/v3/tubebuddy-start-auth`
   - `POST /api/market/v3/tubebuddy-open-keyword-explorer`
7. ✅ 用 CDP 找到 TubeBuddy 扩展隔离执行环境：
   - context origin 是 `chrome-extension://mhkhmbddkmdggbhaaaodilponhnccicb`
   - 可访问 `TBGlobal` / `TubeBuddyMenu` / `TubeBuddyKeywordExplorer`
8. ✅ 修正 TubeBuddy 登录/授权判断：
   - 不再把 YouTube avatar、YouTube 登录态、TubeBuddy account cookie 当成 Studio 扩展授权
   - `openKeywordExplorerForDebug` 不再在弹窗未打开时返回假成功
   - `isTubeBuddySignedOutPromptVisible()` 改成只认可见登录提示，避免隐藏模板误判
9. ✅ 前端补齐 `session_expired` SSE 处理：授权失败时标记评分项为 error，不进入 LLM 分析，不再表现成“秒出”
10. ✅ 修正 Keyword Explorer 打开路径：
    - 不再先跳 `https://www.tubebuddy.com/account?from-ext=true`
    - 优先点击 Studio 顶栏青色 TubeBuddy 按钮
    - 再点击可见菜单项 `Keyword Explorer`
    - 先定位/打开 `studio.youtube.com`
    - 等待 TubeBuddy Studio 外壳注入
    - 优先尝试 extension world 的 `TubeBuddyKeywordExplorer.Show(...)`
    - 再点击 Studio 内可见的 `Keyword Explorer` 快捷入口
    - 入口仍不可用时才返回授权错误
11. ✅ 增强 TubeBuddy debug：
    - `extensionState.syncKeys/localKeys`
    - Studio 扩展上下文的 `TBGlobal.CurrentChannelId()`
    - `TBGlobal.GetToken()` 仅输出是否存在与长度，不输出明文
    - `TBGlobal.Profile()` 摘要与 `TBGlobal.IsAuthenticated()`
12. ✅ 收紧评分失败路径：
    - 未授权态快速返回 `session_expired`
    - 不再生成 fake score
    - 不再把主流程带回 TubeBuddy account 页
13. ✅ 规则沉淀：
    - `docs/04_progress/rules.md` 新增 TubeBuddy Studio-first 与 token 验收规则
14. ✅ 修复 `46/100` 解析 bug：
    - 旧逻辑把 `46/100` 合并成 `46100`，导致 overall 被误判为空
    - 新逻辑优先按 `(\d+)/100` 读取分数
15. ✅ 真实评分跑通：
    - 单词 `黄金精神` 返回 `overall=58`
    - 3 个正式样本批量完成，总耗时 `14.978046s`
16. ✅ 副指标校准完成：
    - 从 TubeBuddy 条形图 CSS 变量读取 `competition/optimization` 真实机会分
    - 同步读取 `Poor/Fair/Good/Very Good/Excellent` 等级标签
    - 前端表格改为 `竞争机会/优化机会`，缺省时显示 `待校准`
    - debug snapshot 增加 `keywordExplorerMetrics`，便于下次入口/DOM 变化排查

## 当前 WIP 文件

- `.gitignore`：新增忽略 `.claude/skills`、`.agents/`
- `.agent/config/llm_config.json`：用户允许的本地配置变化，保留
- `package.json` / `package-lock.json`：新增 Playwright
- `server/market.ts`：LLM content 修复、TubeBuddy debug endpoints、真实评分错误流、LLM 分析摘要兼容可选副指标
- `server/workers/tubebuddy-worker.ts`：真实 TubeBuddy browser/extension worker、Studio-first Keyword Explorer 打开路径、授权判断、CDP extension world 尝试、真实 DOM selector、图表副指标解析
- `src/components/market/KeywordScoreTable.tsx`：评分字段读取修复，副指标显示为数值+等级/待校准
- `src/components/market/MarketPhase1New.tsx`：`session_expired` SSE 处理
- `src/types.ts`：`TubeBuddyScore.competition/optimization/relevance` 改为可选，并新增等级 label 字段
- `docs/04_progress/rules.md`：新增 TubeBuddy 授权/入口规则
- `docs/dev_logs/2026-04-30_TubeBuddy_RealScoring_Debug.md`：调试过程日志
- `docs/dev_logs/HANDOFF.md`：本文件，本轮交接更新

## 已验证

- `npx tsc --noEmit` 通过
- `npm run dev` 已启动
- TubeBuddy 自动化浏览器能启动并加载扩展
- `GET /api/market/v3/tubebuddy-debug` 当前页面保持在：
  - `https://studio.youtube.com/channel/UCksvtTC-xQ-Mg6oMbEnZOiA`
- `POST /api/market/v3/tubebuddy-open-keyword-explorer` 当前返回：
  - `keywordExplorerOpen: true`
  - `isLoggedIn: true`
- debug 确认当前已授权：
  - `TBGlobal.CurrentChannelId = UCksvtTC-xQ-Mg6oMbEnZOiA`
  - `TBGlobal.GetToken()` present
  - `TBGlobal.Profile()` 非空
  - `TBGlobal.IsAuthenticated()` 为 `true`
  - `extensionState.syncKeys` 出现 `tubebuddyToken-UCksvtTC-xQ-Mg6oMbEnZOiA`
- 单词验证：
  - `黄金精神`：`overall=58 searchVolume=33 competition=57 optimization=100`
  - 等级：`searchVolumeLabel=Fair competitionLabel=Good optimizationLabel=Excellent`
  - `TOTAL_TIME≈12.187s`
- 3 个正式评分样本复测：
  - `黄金精神`：`overall=58 searchVolume=33 competition=57 optimization=100`，`duration=4.725s`
  - `AI教育`：`overall=29 searchVolume=46 competition=23 optimization=100`，`duration=7.247s`
  - `扩展心灵论`：`overall=46 searchVolume=1 competition=100 optimization=100`，`duration=5.786s`
  - `TOTAL_TIME=17.760629s`
- agent-browser UI 验证：
  - 表头为 `竞争机会/优化机会`
  - 有真实图表值时显示 `57 Good` / `100 Excellent`
  - 缺省副指标显示 `待校准`

## 当前阻塞与判断

- 不是授权问题了；Studio 扩展 token 已写入
- 主评分 `overall` 与副指标 `competition/optimization` 已从真实 TubeBuddy Keyword Explorer 返回
- 副指标含义已调整为机会分：分数越高越适合切入，不再用“竞争度越高越好”的误导表述
- 当前批量 3 个耗时约 18 秒，授权/弹窗已打开后的单词耗时约 5-7 秒

## 下一步

1. 从真实 UI 点击 Phase 1 评分，确认 3-10 个候选词端到端体验：
   - 不秒出
   - 不假分
   - 主分能显示
   - 副指标显示为数值+等级或待校准
2. 等运营账号准备好后，只替换自动化 Chrome 登录态，再复测：
   - Studio 入口
   - TubeBuddy token
   - Keyword Explorer 主分与副指标
3. 提交前请用户确认 `.agent/config/llm_config.json` 是否纳入，以及功能代码/治理文档拆分方式

## 注意事项

- 不要恢复 mock/fallback 评分
- 不要把 TubeBuddy account 页可打开当成 Studio 扩展授权完成
- 不要把菜单 DOM 注入当成 TubeBuddy 已登录；要看可见入口、token、`TBGlobal.Profile()`、`TBGlobal.IsAuthenticated()`
- 不要把 `Excellent/Poor/Good` 强行硬映射成精确数值；只有从 TubeBuddy 图表 CSS 变量中读到数值时才输出数值
- 如果找不到 Studio 右上角 TubeBuddy → `Keyword Explorer` 入口，必须明确告诉用户，不要改走 TubeBuddy account 页
- 不要并发跑多个 TubeBuddy 初始化请求，避免 profile/browser race
- 热更新会重启后端并关闭 Playwright context，必要时重新触发授权流程
