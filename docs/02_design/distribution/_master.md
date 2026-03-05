# 📡 Distribution Console (分发矩阵终端) 设计总纲

> **状态**: 活跃开发 | 规划中
> **最新修订**: 2026-03-06
> **负责人**: OldYang

## 1. 模块概述
Distribution Console（三级火箭）作为 MindHikers 的最后一环，承接来自 Delivery Console（二级火箭）打包好的所有静态/动态资产。它基于全域分发矩阵策略，使用统一的项目结构（Project Store）完成跨平台自动推流投递。

## 2. 架构与组件
- **组装流水线 (Assembly Line)**：将渲染农场输出的长中短视频、缩略图、图文资产组合成特定的发布包裹。
- **全域发布矩阵 (Distribution Pipeline)**：处理 Auth 与 Session 管理，投递到 YouTube、X (Twitter)、以及国内视频平台等。
- **发布状态机 (State Machine)**：跨平台的投递重试机制与成功失败回调。

## 3. 关联设计文档
| 文件                                                                                 | 说明                                     | 状态     |
| ------------------------------------------------------------------------------------ | ---------------------------------------- | -------- |
| [sd301_302_distribution.md](./sd301_302_distribution.md)                             | 三级分发终端整体管线交互与架构           | ✅ 设计中 |
| [distribution_console_fusion_strategy.md](./distribution_console_fusion_strategy.md) | V2 跨平台投递策略 (YouTube/X 等混合分发) | ✅ 规划中 |

## 4. 变更日志
| 日期       | 变更                    | 关联 |
| ---------- | ----------------------- | ---- |
| 2026-03-06 | 初始创建 (文档体系重构) | 老杨 |
