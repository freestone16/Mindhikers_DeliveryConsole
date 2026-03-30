# 🔥 黄金坩埚 (Golden Crucible) 大纲

> **状态**: 本地 Phase 1-dev 已完成 | 当前执行面聚焦 SSE / SaaS / Roundtable 三主线
> **最新修订**: 2026-03-22
> **负责人**: OldYang

## 1. 模块概述
黄金坩埚作为 MindHikers 的一级火箭，处于整个内容管线的最顶层。它用于老卢与苏格拉底系统进行高密度的纯粹思辨，负责挖掘用户意图并产出高度凝练的知识结晶（如：框架化的大纲或 Mini 论文）。这部分输出作为下游模块（写作、导演等）的输入基准点。

## 2. 当前阶段定义

### 2.1 本地第一阶段

- 以当前本地黄金坩埚的可运行现状为准，视为已完成
- 对应 Linear 父 Issue：`MIN-38` `Crucible Phase 1-dev`
- 核心成果是把 `Socrates -> Bridge -> UI` 主链、黑板协议、Soul registry 与最小 orchestrator 底盘收实

### 2.2 产品第一阶段

- 仍包含 SaaS demo 上线
- 目标是供朋友、合作方、投资人演示使用
- 当前重点进一步收束为：先完成 **SSE 主链迁移**，再完成 **SaaS 架构与上线**

### 2.3 第二阶段

- 圆桌多人讨论明确归入 Phase 2
- 对应 Linear Project：`Crucible-0 Phase 2`
- 负责前置发散、冲突暴露、spike 提取与进入正式坩埚前的预热结构
- 当前执行口径不是先空谈，而是先在黄金坩埚内启动 Roundtable 分支，并要求本地版与 SaaS 版同步推进后再合并

## 3. 架构与组件
- **思辨界面 (Socratic Dialog)**：当前本地主链，已形成可继续扩展的稳定底盘。
- **生成产物层 (Artifact Output)**：聚焦知识凝练、脱水的思维草稿与黑板内容。
- **SaaS Demo Layer**：产品第一阶段待推进的云端演示层，目标是低负载、可上线、可给外部演示。
- **Roundtable Prelude Layer**：第二阶段前置圆桌层，负责发散、找刺与进入 Socrates 前的结构预热。

## 4. 关联设计文档
| 文件 | 说明 | 状态 |
| --- | --- | --- |
| [2026-03-27_GoldenCrucible_SaaS_V1.0.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/02_design/crucible/2026-03-27_GoldenCrucible_SaaS_V1.0.md) | 黄金坩埚 SaaS 版 Ver1.0 总体方案（安全 / 健壮 / 简单高效） | ✅ |
| [2026-03-30_Crucible_Multi_Topic_Conversation_Design.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/02_design/crucible/2026-03-30_Crucible_Multi_Topic_Conversation_Design.md) | 多 Topic 并行会话设计：基于现有 workspace/conversation/history 底盘的 feature 评估与分期方案 | ✅ |
| [2026-03-22_GoldenCrucible_SSE_SaaS_Roundtable_Execution_Plan.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-22_GoldenCrucible_SSE_SaaS_Roundtable_Execution_Plan.md) | 当前执行面 SSOT：SSE / SaaS / Roundtable 三主线 | ✅ |
| [2026-03-19_GoldenCrucible_Phase_Definition_Alignment.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-19_GoldenCrucible_Phase_Definition_Alignment.md) | 当前阶段口径 SSOT | ✅ |
| [2026-03-19_GoldenCrucible_SaaS_Implementation_Plan.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-19_GoldenCrucible_SaaS_Implementation_Plan.md) | SaaS Demo 实施方案 | ✅ |
| [2026-03-12_SD214_Crucible_Two_Phase_Roadmap bk.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-12_SD214_Crucible_Two_Phase_Roadmap%20bk.md) | 本地主链收口与 Phase 2 圆桌前置层方案 | ✅ |
| [2026-03-12_SD215_Crucible_FutureFacing_Ore_Soul_Review_Architecture.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-12_SD215_Crucible_FutureFacing_Ore_Soul_Review_Architecture.md) | Ore / Soul / Review 前瞻架构 | ✅ |
| [2026-03-19_SD223_Soul_Inference_Schema_v0.1.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-19_SD223_Soul_Inference_Schema_v0.1.md) | Soul 统一 schema | ✅ |
| [2026-03-19_CloudDeployment_BusinessModel_Discussion.md](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-03-19_CloudDeployment_BusinessModel_Discussion.md) | SaaS、部署与商业模式讨论 | ✅ |

## 5. 变更日志
| 日期 | 变更 | 关联 |
| --- | --- | --- |
| 2026-03-30 | 新增多 Topic 并行会话设计文档，明确当前 SAAS 架构可先复用 conversation/history 底盘，再分 Phase A / Phase B 落地 | 老杨 |
| 2026-03-22 | 当前执行面收束为三主线：SSE 主链迁移、SaaS 架构与上线、Roundtable 分支同步推进 | 老杨 |
| 2026-03-19 | 明确三条口径：本地 Phase 1-dev 已完成、产品 Phase 1 仍含 SaaS demo、Roundtable 归入 Phase 2 | 老杨 |
| 2026-03-06 | 初始创建（文档体系重构） | 老杨 |
