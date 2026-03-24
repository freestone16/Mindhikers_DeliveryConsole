# 黄金坩埚 v1 方案索引

> 目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/crucible_v1 `
> 作用：汇总黄金坩埚 v1 当前主线方案，方便后续新窗口直接进入实现阶段。
> 迁移说明：本索引与其链接已统一切到 `MHSDC` 新目录；若看到旧 `DeliveryConsole` 路径，应按历史档案理解。

## 1. 阅读顺序

建议按这个顺序阅读：

1. [SD217 黄金坩埚 v1 Soul Runtime 收束方案](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/crucible_v1%20/2026-03-13_SD217_Crucible_V1_SoulRuntime_Blueprint.md)
2. [SD218 Soul Runtime 最小接口草案](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/crucible_v1%20/2026-03-13_SD218_Crucible_SoulRuntime_Minimal_Interface_Draft.md)
3. [SD219 黄金坩埚开源 / 公益 / 商业三层模型](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/crucible_v1%20/2026-03-13_SD219_Crucible_OpenSource_PublicGood_Commercial_Model.md)
4. [SD220 黄金坩埚三轨并行开发治理方案](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/crucible_v1%20/2026-03-14_SD220_Crucible_ThreeTrack_Parallel_Governance_Plan.md)
5. [SD221 Golden Crucible Linear 治理交接文档](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/crucible_v1%20/2026-03-14_SD221_GoldenCrucible_Linear_Governance_Handoff.md)
6. [SD222 黄金坩埚 Phase 1 Artifact-Lite 中屏方案](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/crucible_v1%20/2026-03-14_SD222_Crucible_Phase1_ArtifactLite_Plan.md)

## 2. 这套方案回答什么

这组文档当前主要回答三类问题：

1. 黄金坩埚 v1 的产品边界是什么
2. `Soul Runtime` 的最小工程骨架是什么
3. `7 = B-lite` 这种“最小演化闭环”在第一阶段如何落地
4. 黄金坩埚未来如何兼顾开源传播、公益信誉与商业闭环
5. 三阶段如何以“共享内核 + 差异轨道”推进并纳入治理
6. 如何在 Linear 中把 Golden Crucible 重构为可执行的管理结构
7. Phase 1 如何吸收 Antigravity 的 artifact 呈现经验并回流主方案

## 3. 当前主线结论

目前已经收束的结论如下：

1. 保留“灵魂插槽”世界观，不砍成纯工具系统
2. 前台固定为 `老卢 / 老张`，严格一轮一人
3. `Socrates` 退到后台做方法裁判
4. 第一阶段只启用一个方法插件，但卡槽必须为未来开放
5. 第一阶段就立住：
   - `Soul Core`
   - `Soul Session`
   - `Soul Evidence`
   - `Soul Delta`
6. 第一阶段采取 `7 = B-lite`
   - 先长出成长器官
   - 但不让演化系统抢主战场

## 4. 历史关联文档

下面这些文档仍然重要，但更偏背景与前置推导：

- [SD210 黄金冶炼师 Skill 架构方案](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-10_SD210_GoldenMetallurgist_Skill_Architecture.md)
- [SD212 黄金坩埚灵魂系统升级方案](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-11_SD212_GoldenCrucible_SoulSystem_Plan.md)
- [SD215 黄金坩埚面向未来的 Ore / Soul / Review 架构](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-12_SD215_Crucible_FutureFacing_Ore_Soul_Review_Architecture.md)

## 5. 后续建议

当下一窗口进入开发阶段时，建议把这份索引作为入口，再继续补两类文档：

1. `Implementation Breakdown`
   - 具体拆到文件、模块、迁移顺序
2. `Eval Plan`
   - 如何验证老张 / 老卢 / Socrates 方法裁判是否真的变强

如果进入商业化与试点阶段，可继续补：

3. `POC Topics / Demo Scenarios`
   - 用真实议题验证黄金坩埚的讨论质量与商业叙事

如果进入多阶段并行开发阶段，应以此补：

4. `Linear Execution Structure`
   - 按共享内核、三阶段轨道与跨阶段评测拆成可执行管理结构
5. `Linear Governance Handoff`
   - 供新窗口单独治理 Initiative / Project / 父任务 / 标签结构
6. `Phase 1 Artifact-Lite`
   - 供 `Crucible Phase 1-dev` 正式吸收的中屏与 chatbox 联动方案
