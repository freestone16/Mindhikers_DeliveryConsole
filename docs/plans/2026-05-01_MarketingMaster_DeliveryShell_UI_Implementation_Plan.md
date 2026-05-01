# MarketingMaster Delivery Shell UI 实施方案

> 日期：2026-05-01  
> 状态：待实施  
> 规划角色：CE planner worker  
> 参考源：`../Director/design.md`、`docs/plans/2026-05-01_MarketingMaster_UI_Redesign_Plan.md`、`docs/02_design/marketing/sd207_prd.md`  
> 约束：本方案只定义实施路径，不包含具体代码。

## 1. 概览结论

这次不是简单换色，也不是把现有两阶段页面套进米色皮肤里。真正要改的是 MarketingMaster 的信息架构：左栏并入 Delivery 共用工作站，中栏成为 P1-P4 的主工作台，右栏承担运行态、Artifacts、交接状态和日志。

工作量判断为 **中等偏大，建议 3-5 个实施单元完成**。其中视觉壳层和 P3/P4 交接界面风险可控；最大风险在 P2，因为完整视频描述需要从“表格内一行展开”升级为“可全局预览、可编辑、可做 SEO/GEO 顺序检查”的主审阅界面。

## 2. 工作量判断

| 范围 | 判断 | 预估 |
| --- | --- | ---: |
| Delivery Shell 对齐 | 中等，主要是布局与样式重组 | 0.5-1 天 |
| P1 关键词区迁移 | 中等，保留现有业务逻辑，调整工作台呈现 | 0.5-1 天 |
| P2 完整描述编辑器 | 偏大，涉及编辑体验、预览、校验和导出字段一致性 | 1.5-2 天 |
| P3 平台适配/DT 交接 | 中等，重新定义主界面，不再以 JSON 为主角 | 0.5-1 天 |
| P4 导出与 handoff | 中等偏小，承接现有 confirm/export | 0.5 天 |
| 文档与验收资产 | 中等偏小，更新 README/过程资产需单独 commit | 0.5 天 |

总计建议按 **3-5 天可验收工作量** 评估。若只先落 demo 级 UI，不接完整持久化和导出契约，可压缩到 1-2 天；若进入正式生产 UI 并要求端到端可用，应按 3-5 天规划。

## 3. 目标信息架构

### 3.1 总体布局

目标布局与 Director 保持同一套 Delivery Shell：

| 区域 | 定位 | MarketingMaster 调整 |
| --- | --- | --- |
| Topbar | 项目、脚本、模型配置、全局上下文 | 保留项目/脚本选择，不承载内部 Phase 细节 |
| 左栏 Workstation Rail | Delivery 共用工作站入口与当前文稿列表 | 必须与 Director 一致，包含影视导演、短视频、缩略图、音乐、营销、视觉审计 |
| 中栏 Workbench | 当前模块主操作区 | 放 P1-P4 phase header 和 phase content |
| 右栏 Context Drawer | Chat / Runtime / Artifacts / Handoff | 默认展示运行态与 Artifacts，承载 TubeBuddy、LLM、保存、DT 交接日志 |
| Bottom status | 在线、同步、后台状态 | 跟随 Delivery Shell 状态表达 |

### 3.2 左栏边界

左栏不再承载 MarketingMaster 自己的步骤。左栏只做三件事：

1. Delivery 共用模块入口。
2. 当前文稿/会话列表。
3. 收起、展开、宽度调节。

MarketingMaster 内部流程不得再出现在左栏，例如“关键词打分 / 方案审阅 / 分发交接 / 运行态监控”不应作为左栏主导航。

### 3.3 中栏边界

中栏 header 承载 P1-P4：

1. P1 关键词与定位。
2. P2 发布文案审阅。
3. P3 平台适配。
4. P4 导出与交接。

中栏内容只呈现当前 phase 的主任务，不重复右栏运行日志。

### 3.4 右栏边界

右栏承担运行态，而不是把运行态塞回中栏：

1. TubeBuddy 打分状态。
2. LLM 生成状态。
3. 自动保存状态。
4. 当前字段健康度。
5. DT 合约/交接准备度。
6. 事件日志、错误、重试入口。

右栏必须支持收起、展开、宽度调节；收起后保留窄条入口。

## 4. P1-P4 定义

### P1：关键词与定位

目标：从脚本文稿生成候选关键词，完成 TubeBuddy 评分，选择黄金关键词，并形成策略点评。

主界面建议：

- 候选关键词列表。
- TubeBuddy 分数表。
- 黄金关键词选择区。
- LLM 策略点评摘要。

验收重点：

- 脚本重新点选后，业务流程重置到 P1 初始状态。
- 关闭窗口后重新打开，未重新点选脚本时保留进度。
- 打分失败可见、可重试，不阻塞整个会话。

### P2：发布文案审阅

目标：生成、编辑、审核观众最终会看到的 YouTube 发布字段，特别是完整视频描述。

P2 是这次改版的主战场。它不应只是六行字段表，而应成为“发布文案审阅台”：

- 左侧或上方：黄金关键词方案切换。
- 中央：标题、完整视频描述、标签、播放列表、缩略图引用、其他设置。
- 大文本区域：完整视频描述编辑器和全局预览。
- 辅助区：SEO/GEO 顺序检查、字符数、关键词覆盖、章节/引用/CTA 完整度。

验收重点：

- 完整视频描述可以整体阅读，而不是只看一行省略文本。
- 用户能在一个大编辑界面里调整描述顺序与内容。
- 描述的最终预览与导出内容一致。
- 每次编辑后字段确认态应合理失效或提示需要重新确认。

### P3：平台适配

目标：确认 P2 的发布文案能被目标平台与 DT 分发终端消费。

P3 不再是“审核 JSON”。JSON 是机器交接物，不是用户主审对象。P3 应展示：

- YouTube 主平台字段完整度。
- YouTube Shorts、Bilibili、微信公众号等扩展平台的字段缺口。
- DT 分发终端需要的最小字段是否满足。
- 当前账号、权限、草稿状态、下游队列语义。
- 可折叠的技术产物预览：`marketing_package.json`、`marketing_package.md`。

验收重点：

- 主界面让用户理解“能不能交给 DT”，而不是读 JSON。
- JSON 只能作为 Artifact 或开发者展开视图出现。
- 多平台未实现项必须明确显示为“预留/需补齐”，避免误导已完成。

### P4：导出与 Handoff

目标：最终确认、生成发布包、交给 DT 或落盘给下游消费。

主界面建议：

- 最终确认清单。
- 导出目标：本地文件、DT 分发终端、后续多平台队列。
- 输出文件路径与状态。
- Handoff 摘要：当前方案、黄金关键词、视频描述版本、缺口、下游提醒。

验收重点：

- 未确认的方案不能静默导出。
- 导出成功、失败、重试、保存路径都可见。
- 右栏同步记录 export/handoff 事件。

## 5. P2 完整视频描述编辑器需求

### 5.1 核心体验

完整视频描述必须有一个大文本编辑界面，并提供全局预览。它不是表格行里的附属编辑器，而是 P2 的中心工作区之一。

最低要求：

1. 支持按区块编辑，也支持查看合成后的完整描述。
2. 区块顺序可见，用户能理解最终 YouTube 描述会如何排列。
3. 编辑器旁边或下方显示 SEO/GEO 检查结果。
4. 修改任一区块后，当前方案的描述确认状态应变为未确认或显示“已修改需复核”。
5. 完整描述预览必须与最终导出 `platforms.youtube.description` 的渲染结果一致。

### 5.2 推荐区块

现有 `DescriptionBlock` 已有基础结构，可沿用并调整展示方式：

| 顺序 | 区块 | 目的 |
| ---: | --- | --- |
| 1 | hook | 前 1-2 行命中核心关键词与观看理由 |
| 2 | body / value | 说明视频解决什么问题、为什么值得看 |
| 3 | geo_qa | 用自然问答表达实体、观点和结论，方便生成式搜索理解 |
| 4 | series | 系列定位与上下文 |
| 5 | timeline | 章节时间轴，来自 SRT 时优先自动填充 |
| 6 | references | 工具、资料、相关链接 |
| 7 | action_plan | 订阅、评论、关联视频或站外动作 |
| 8 | pinned_comment | 置顶评论建议，必要时可不进入 YouTube 描述正文 |
| 9 | hashtags | 2-4 个核心 hashtag，放在最后 |

如果现有类型暂不包含 `body / value`，实施时可先复用现有 `series` 或增加类型，但必须同步更新类型、生成、编辑、导出和测试。

### 5.3 编辑能力

- 区块折叠/展开。
- 完整描述预览。
- 区块内 textarea 编辑。
- 字符数统计。
- 前两行摘要预览。
- hashtag 数量提示。
- markdown 符号风险提示。
- AI 修订入口：针对单一区块或完整描述发起修订。
- 保存状态：自动保存、等待保存、保存失败。

### 5.4 确认能力

- 单字段确认：标题、描述、标签、缩略图、播放列表、其他设置。
- 描述内部可提供区块级健康提示，但最终确认仍以“完整视频描述”字段为准。
- 完整描述变更后，描述确认态应失效。
- 如果 P2 有多套黄金词方案，每套方案都应有独立描述与确认态。

## 6. SEO/GEO 顺序规范

完整视频描述的默认顺序必须服务两个目标：

1. YouTube SEO：让搜索、推荐和用户摘要尽快识别主题。
2. GEO：让生成式搜索和 AI 摘要能理解实体、问题、观点、结构和引用关系。

推荐顺序：

1. **核心钩子**：第一句包含主关键词或其自然变体，不堆砌。
2. **价值说明**：说明本视频回答什么问题、带来什么判断或方法。
3. **主题实体与上下文**：出现系列名、人物/工具/平台/模型名等关键实体。
4. **结构化观点**：用自然段落或问答表达核心结论，避免纯标签堆叠。
5. **章节时间轴**：如果有 SRT 或章节信息，放在中段，帮助长视频导航。
6. **资料与引用**：工具、文章、相关视频、外部链接。
7. **行动引导**：订阅、评论问题、关联播放列表。
8. **Hashtags**：最后放 2-4 个高相关标签。

检查项：

- 主关键词是否出现在前 150 个字符内。
- 标题与描述首段是否语义一致。
- GEO 问答是否包含明确问题和回答。
- 是否存在过度堆砌关键词。
- Hashtags 是否过多。
- 链接是否放在正文价值说明之后。
- CTA 是否早于主体内容；若是，应提示调整。

## 7. Director design.md 对齐清单

### 7.1 必须对齐

- 使用 warm paper 米色系：`#f4efe5`、`#f8f4ec`、`#fffcf7`、`#e4dbcc`、`#342d24`、`#c97545`。
- 使用 Delivery Shell：topbar + left rail + center workbench + right drawer + bottom status。
- 左栏工作站入口与 Director 保持一致，不做 Marketing 独立导航。
- Phase header 放在中栏，使用 P1-P4 紧凑控制。
- 右栏保留 Runtime / Artifacts / Handoff 语义。
- 控件圆角以 6-8px 为主，避免过圆。
- 页面密度以生产工作台为准，不做营销 hero 或大卡片陈列。
- 重要动作使用 command-first 文案，例如“生成描述”“修订标题”“确认方案”“交给 DT”。
- 所有生成、保存、确认、导出动作都要在右栏留下可追踪状态。

### 7.2 可按 Marketing 适配

- 主动作仍用陶土橙，但营销标签、关键词、平台状态可使用小面积语义色。
- P2 文案编辑器可比 Director 的视觉表格更强调长文本阅读。
- P3 可以借鉴 DT 的平台矩阵，而不是 Director 的渲染队列。
- 右栏默认 tab 可偏 Runtime/Artifacts，不必默认 Chat。

### 7.3 需要避免

- 再次使用深蓝黑后台主题。
- 把 P1-P4 放回左栏。
- 把 JSON 作为 P3 主审阅对象。
- 把运行态放到中栏主内容里挤占审阅空间。
- 使用过大的圆角、过大的模块间缝隙和过多嵌套卡片。

## 8. 实施单元

### Unit 1：建立 Marketing Delivery Shell

目标：把 MarketingMaster 放入与 Director 一致的工作台壳层。

涉及文件：

- `src/components/MarketingSection.tsx`
- `src/components/market/MarketingRedesignDemo.tsx`
- `src/App.tsx`
- `src/App.css`
- `src/index.css`

实施内容：

- 新增或抽出 Marketing 工作台壳层。
- 左栏改为 Delivery 共用工作站入口。
- 中栏 header 加入 P1-P4。
- 右栏加入 Runtime/Artifacts/Handoff 结构。
- 保留现有 `useExpertState` 持久化和脚本重选 reset 逻辑。

注意：

- 若 Delivery Shell 共享组件已经在兄弟模块中稳定，应优先复用，不要在 Marketing 内复制一整套长期分叉。
- 如果当前仓没有共享 shell 组件，可先在 Marketing 内做薄壳，后续再抽到共享层。

### Unit 2：P1 关键词与定位工作台

目标：保留现有 TubeBuddy 真实打分链路，改为米色工作台呈现。

涉及文件：

- `src/components/market/MarketPhase1New.tsx`
- `src/components/market/CandidateKeywordList.tsx`
- `src/components/market/KeywordScoreTable.tsx`
- `src/components/market/KeywordAnalysis.tsx`
- `server/market.ts`
- `server/workers/tubebuddy-worker.ts`
- `src/types.ts`

实施内容：

- 把 P1 内容纳入中栏 phase body。
- 打分状态、单词失败、重试状态同步到右栏 runtime。
- 黄金关键词选择仍作为进入 P2 的门槛。

### Unit 3：P2 发布文案审阅台

目标：把完整视频描述升级成主编辑界面，并建立 SEO/GEO 顺序检查。

涉及文件：

- `src/components/market/MarketPhase2New.tsx`
- `src/components/market/MarketPlanTable.tsx`
- `src/components/market/DescriptionEditor.tsx`
- `src/components/market/DescriptionReviewPanel.tsx`
- `src/components/market/SRTUploader.tsx`
- `src/types.ts`
- `server/market.ts`
- `src/mocks/marketMockDataV3.ts`

实施内容：

- P2 主区域加入完整视频描述大编辑器。
- 支持区块编辑和完整预览。
- 增加 SEO/GEO 顺序检查视图。
- 保持标题、标签、缩略图、播放列表、其他设置的确认能力。
- 将 SRT 章节信息与 timeline 区块绑定。
- 编辑描述后同步更新 `MarketingPlanRow.content` 与 `descriptionBlocks`。

测试重点：

- 描述编辑后导出内容一致。
- 方案 tab 切换不串数据。
- SRT 上传后 timeline 能参与描述生成或审阅。

### Unit 4：P3 平台适配与 DT 交接检查

目标：P3 从“审核 JSON”改为“平台字段完整度与 DT 交接准备度”。

涉及文件：

- `src/components/market/MarketPhase3.tsx`
- `src/components/market/MarketConfirmBar.tsx`
- `server/market.ts`
- `src/types.ts`
- `docs/02_design/marketing/sd207_prd.md`

实施内容：

- 新建或重写 P3 平台适配视图。
- 展示 YouTube 主包状态、字段缺口、多平台预留状态。
- 把 JSON/MD 预览放入 Artifact 折叠区。
- 为 DT Contract 增加人类可读检查清单。

注意：

- 若现有正式状态仍只有 `phase: 1 | 2`，本单元需要决定是否扩展为 `phase: 1 | 2 | 3 | 4`。
- 扩展 phase 状态前必须考虑旧状态兼容和默认值迁移。

### Unit 5：P4 导出与 Handoff

目标：把现有确认导出升级为最终交接动作。

涉及文件：

- `src/components/market/MarketConfirmBar.tsx`
- `src/components/MarketingSection.tsx`
- `server/market.ts`
- `src/hooks/useDeliveryStore.ts`
- `src/types.ts`

实施内容：

- 将“确认并导出”升级为“生成发布包 / 交给 DT”。
- 展示导出目标、文件路径、交接摘要。
- 右栏记录 handoff 事件。
- 保留失败重试与错误可见性。

### Unit 6：文档与过程资产收口

目标：在正式实施完成后同步更新项目文档，但不与功能代码混在一个提交里。

涉及文件：

- `README.md`
- `docs/04_progress/dev_progress.md`
- `docs/dev_logs/HANDOFF.md`
- `docs/04_progress/rules.md`
- `docs/plans/2026-05-01_MarketingMaster_DeliveryShell_UI_Implementation_Plan.md`
- `docs/plans/2026-05-01_MarketingMaster_UI_Redesign_Plan.md`

实施内容：

- README 更新模块定位、启动方式、当前 UI 架构、验收入口。
- HANDOFF 记录当前会话与下一步。
- dev_progress 只在形成版本级成果时更新。
- rules 只记录可复用技术坑，不写普通过程流水账。

提交纪律：

- 功能实现与纯过程治理文档分开提交。
- README/计划/HANDOFF 不应与大段 UI 代码混成一个不易回滚的提交。

## 9. 涉及文件清单

### 9.1 高概率修改

- `src/components/MarketingSection.tsx`
- `src/components/market/MarketPhase1New.tsx`
- `src/components/market/MarketPhase2New.tsx`
- `src/components/market/MarketPlanTable.tsx`
- `src/components/market/DescriptionEditor.tsx`
- `src/components/market/MarketConfirmBar.tsx`
- `src/components/market/MarketingRedesignDemo.tsx`
- `src/types.ts`
- `src/mocks/marketMockDataV3.ts`
- `server/market.ts`

### 9.2 可能新增

- `src/components/market/MarketingWorkbenchShell.tsx`
- `src/components/market/MarketingLeftRail.tsx`
- `src/components/market/MarketingRuntimeInspector.tsx`
- `src/components/market/MarketingPhaseHeader.tsx`
- `src/components/market/DescriptionFullEditor.tsx`
- `src/components/market/DescriptionSeoGeoChecklist.tsx`
- `src/components/market/PlatformAdaptationPanel.tsx`
- `src/components/market/HandoffSummaryPanel.tsx`

### 9.3 测试与验证相关

- `src/__tests__/setup.ts`
- `src/__tests__/setup.test.ts`
- `testing/README.md`
- `testing/OPENCODE_INIT.md`

如需新增组件测试，可按实际测试框架补充：

- `src/components/market/__tests__/DescriptionFullEditor.test.tsx`
- `src/components/market/__tests__/DescriptionSeoGeoChecklist.test.tsx`
- `src/components/market/__tests__/PlatformAdaptationPanel.test.tsx`

## 10. 测试与验收场景

### 10.1 静态检查

- TypeScript 类型检查通过。
- 代码格式检查无 trailing whitespace。
- 全仓搜索确认不再出现 P3 主界面审核 JSON 的文案。
- 全仓搜索确认新 phase 文案统一为 P1-P4。

### 10.2 UI 验收

使用 agent browser 进行真实页面验收：

1. 打开 MarketingMaster 正式入口。
2. 检查左栏与 Director 工作站一致。
3. 收起/展开左栏，确认窄栏可识别。
4. 拖拽左栏宽度，确认中栏不溢出。
5. 收起/展开右栏，确认运行态入口保留。
6. 拖拽右栏宽度，确认 P2 描述编辑器仍可用。
7. 进入 P1，完成候选词、打分、黄金词选择。
8. 进入 P2，生成方案，打开完整视频描述大编辑器。
9. 调整描述顺序或内容，确认 SEO/GEO 检查提示更新。
10. 切换方案 tab，确认描述不串数据。
11. 进入 P3，确认主界面是平台适配/DT 检查，不是 JSON 审核。
12. 展开 Artifact，确认 JSON/MD 仅作为技术产物可查看。
13. 进入 P4，确认导出和 handoff 状态可见。

### 10.3 业务回归

- 重新点选同一脚本，MarketingMaster 回到 P1 初始状态。
- 关闭窗口后重新打开，未重新点选脚本时保留当前进度。
- Phase 1 打分失败时可重试。
- Phase 2 生成失败时错误可见。
- 描述编辑后导出文件内容与预览一致。
- 未确认字段时导出按钮状态符合预期。
- 导出失败时用户能看到失败原因和重试入口。

### 10.4 输出契约验收

- `06_Distribution/marketing_package.json` 字段完整。
- `06_Distribution/marketing_package.md` 与 JSON 渲染一致。
- `platforms.youtube.description` 的顺序符合 SEO/GEO 规范。
- DT 分发终端可识别 YouTube 主包就绪状态。
- 多平台预留字段不误报为 ready。

## 11. 风险

### 11.1 状态迁移风险

当前 `MarketModule_V3.phase` 是 `1 | 2`。如果正式实现 P1-P4，需要扩展状态类型或引入 UI-only phase。直接扩展可能影响旧持久化状态，需要兼容默认值和旧数据恢复。

建议：

- 第一阶段可将 P3/P4 做成 P2 后续视图，但 UI 显示 P1-P4。
- 如果确认进入正式架构，再把状态扩展为 `1 | 2 | 3 | 4`。

### 11.2 描述编辑一致性风险

描述现在同时存在 `content` 和 `descriptionBlocks`。大编辑器上线后，如果两个字段不同步，会导致 UI 预览和导出文件不一致。

建议：

- 明确一个事实源。优先以 `descriptionBlocks` 为编辑事实源，以渲染函数生成完整 `content`。
- 导出时也使用同一个渲染函数。

### 11.3 共享 Shell 分叉风险

如果 Marketing 内部复制 Director shell 代码，短期快，长期会导致 Delivery 左栏无法收口。

建议：

- 优先识别能否复用共享 Delivery Shell。
- 如果短期只能本地实现，也要保持命名和结构可迁移。

### 11.4 P3 语义漂移风险

P3 如果继续放大 JSON，会违背产品目标；如果完全隐藏 JSON，又会让调试和下游联调不方便。

建议：

- 主界面讲平台适配和 DT readiness。
- JSON/MD 放右栏 Artifacts 或可折叠技术预览。

### 11.5 UI 密度风险

Director 风格强调紧凑工作台。Marketing 文案编辑又需要阅读空间，两者容易冲突。

建议：

- P2 中央留给长文本，辅助检查放右侧或下方。
- 不用大卡片堆叠，优先使用表格、分栏、紧凑面板。

## 12. 非目标

本次不做：

- 不实现真正多平台发布。
- 不接入 YouTube 上传 API。
- 不替换 TubeBuddy Playwright 打分方案。
- 不重写 LLM 生成策略。
- 不把 DT 分发终端功能搬进 MarketingMaster。
- 不把 JSON 作为用户主要审核对象。
- 不引入新组件库。
- 不做 SaaS 多租户和权限系统。
- 不在本计划阶段修改 README、HANDOFF 或代码。

## 13. 建议实施顺序

1. 先完成 Unit 1，让正式页面进入 Delivery Shell。
2. 再完成 Unit 3 的 P2 完整描述编辑器，因为它决定核心产品体验。
3. 同步轻量整理 Unit 2，保证 P1 在新壳层中不回退。
4. 完成 Unit 4，把 P3 降级为平台适配/DT 检查。
5. 完成 Unit 5，把导出升级为 handoff。
6. 最后单独做 Unit 6 文档和过程资产收口。

推荐验收门槛：

- 先让用户验收 P2 完整描述编辑器。
- 再验收 P3/P4 的交接语义。
- 最后验收整体 Delivery Shell 一致性。

