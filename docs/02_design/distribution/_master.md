# 📡 Distribution Terminal (分发终端) 设计总纲

> **状态**: PRD v1 已定稿 · 待 ce-plan 启动
> **最新修订**: 2026-04-27
> **负责人**: OldYang

## 1. 模块概述
Distribution Terminal（三级火箭）作为 MindHikers 的最后一环，承接来自 Delivery Console（二级火箭）打包好的所有静态/动态资产。一期定位为**项目分发台**：让独立创作者打开一个项目，就能看见这个项目要发到 4 个平台（X / 微信公众号 / YouTube / B站）的全部发布卡 — 文案预填、状态明示、一键发出，并清晰区分「真直发」与「草稿态」两种发布产物。

## 2. 架构与组件
- **项目分发台 (Project Hub)**：按项目维度的多卡视图，按素材组分块展示发布记录。
- **平台 Connectors**：4 平台各自的 Auth + 发布实现（YouTube 真直发、X 真直发、公众号草稿态、B站草稿态）。
- **发布队列 (Queue + SSE)**：内存队列 + JSON 持久化，SSE 实时推送状态变化。
- **重试状态机**：按错误码分类的 3 次重试（401 不重试 / 429 递增延迟 / 5xx 立即）。

## 3. 关联设计文档

### 3.1 一期 PRD（SSOT）
| 文件 | 说明 | 状态 |
| --- | --- | --- |
| [prd_v1_distribution_terminal.md](./prd_v1_distribution_terminal.md) | **一期 PRD（产品决策的唯一事实来源）** | ✅ v1.0 定稿 |
| [code_reuse_map.md](./code_reuse_map.md) | 代码资产复用图（🟢70% / 🟡20% / 🔴10% 三档清单） | ✅ v1.0 |

### 3.2 视觉 demo
| 文件 | 说明 |
| --- | --- |
| [../../03_ui/demo/01_landing.html](../../03_ui/demo/01_landing.html) | 项目分发台首页 |
| [../../03_ui/demo/02_edit.html](../../03_ui/demo/02_edit.html) | 单卡编辑页（含草稿态横幅） |
| [../../03_ui/demo/03_queue.html](../../03_ui/demo/03_queue.html) | 队列监控（草稿态/已发布/失败视觉对比） |

启动方式：`python3 -m http.server 8765 --directory docs/03_ui/demo`

### 3.3 历史背景文档
| 文件 | 说明 | 状态 |
| --- | --- | --- |
| [sd301_302_distribution.md](./sd301_302_distribution.md) | 三级分发终端整体管线交互与架构 | 📦 历史背景 |
| [distribution_console_fusion_strategy.md](./distribution_console_fusion_strategy.md) | V2 跨平台投递策略 (YouTube/X 等混合分发) | 📦 历史背景 |
| [mixpost_frontend_reference_phase1.md](./mixpost_frontend_reference_phase1.md) | Mixpost 前端参考 | 📦 历史背景 |
| [../../brainstorms/2026-04-26-distribution-terminal-requirements.md](../../brainstorms/2026-04-26-distribution-terminal-requirements.md) | CE 头脑风暴稿（已被 PRD v1 取代） | 📦 决策溯源 |

## 4. 变更日志
| 日期       | 变更                    | 关联 |
| ---------- | ----------------------- | ---- |
| 2026-04-27 | PRD v1 定稿，新增 code_reuse_map 与 demo 三页；模块改名 Distribution Console → Distribution Terminal 对齐当前项目 | 老杨 |
| 2026-03-06 | 初始创建 (文档体系重构) | 老杨 |
