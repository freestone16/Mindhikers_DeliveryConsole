# 🏭 Delivery Console (基于专家矩阵的交付终端) 设计总纲

> **状态**: 活跃开发
> **最新修订**: 2026-03-06
> **负责人**: OldYang

## 1. 模块概述
Delivery Console（二级火箭）是 MindHikers 的核心系统，负责将抽象思路（如黄金坩埚输出的 Mini 论文或草稿）转化为具体的自媒体渲染资产（长文案、视觉分镜、缩略图、配乐、MP4 视频文件）。它通过纯智力劳动的 AI 专家节点与宿主进程调度渲染任务，并严格遵循“大脑与双手分离”的设计原则。

## 2. 架构与组件
- **中场指挥部 (Console Host)**：提供可视化前端界面，展示正在运行的任务流。
- **专家接力组 (Agent Matrix)**：
  - `写作大师 (Writing Master)`：长文案裂变与结构化。
  - `营销大师 (Market Master)`：SEO 和标题生成。
  - `导演大师 (Director Master)`：视觉素材、B-Roll 生成与排版（结合 Remotion）。
  - `缩略图大师 (Thumbnail Master)`：封面与配图生成。
  - `短视频大师 (Shorts Master)`：竖屏切片等衍生格式。
- **本地渲染农场 (Render Farm)**：通过 Node.js 子进程唤起外部渲染力（如 Remotion 进程），执行渲染并落盘 `.mp4`。
- **渲染引擎 (Remotion Engine)**：负责多轨道与空间排版渲染。
- **协作与干预机制 (Chat Collaboration)**：提供专家对话面板与修改引擎，让老卢可以与专家沟通并修订。

## 3. 关联子模块设计文档 (详情索引)
| 文件                                                                     | 说明                               | 状态     |
| ------------------------------------------------------------------------ | ---------------------------------- | -------- |
| [sd202_director_master.md](./sd202_director_master.md)                   | 导演大师 (视觉与排版核心)          | ✅ 活跃   |
| [sd204_render_farm.md](./sd204_render_farm.md)                           | 本地渲染农场进程调度               | ✅ 活跃   |
| [sd205_coding_master.md](./sd205_coding_master.md)                       | CodingMaster (老杨本身) 的研发原则 | ✅ 活跃   |
| [sd206_shorts_master.md](./sd206_shorts_master.md)                       | 短视频裁切与生成引擎               | ✅ 活跃   |
| [sd207_market_master.md](./sd207_market_master.md)                       | 营销大师 (标题SEO)                 | ✅ 活跃   |
| [sd207.1_chat_collaboration.md](./sd207.1_chat_collaboration.md)         | 专家协作面板与修改引擎交互         | ✅ 活跃   |
| [sd208_operations_master.md](./sd208_operations_master.md)               | 运维大师 (监控与诊断)              | ⚠️ 规划中 |
| [render_decouple_requirement.md](./render_decouple_requirement.md)       | 渲染解耦核心需求                   | ✅ 活跃   |
| [remotion_spatial_layout_engine.md](./remotion_spatial_layout_engine.md) | Remotion 空间排版机制              | ✅ 活跃   |
| [sprightly-growing-abelson.md](./sprightly-growing-abelson.md)           | 导演大师 Phase2/3 重构过程记录     | ✅ 记录   |

## 4. 变更日志
| 日期       | 变更                    | 关联 |
| ---------- | ----------------------- | ---- |
| 2026-03-06 | 初始创建 (文档体系重构) | 老杨 |
