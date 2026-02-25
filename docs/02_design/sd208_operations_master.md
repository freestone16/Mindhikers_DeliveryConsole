# SD-208: 运营大师 (Operations Master) — 概念设计与规范 V1

> **设计方**: Antigravity (Gemini 3.1 Pro)
> **状态**: 概念设计定稿，待实施

## 背景与定位

随着 DeliveryConsole 前序模块（导演、短视频、分发）的陆续交付，系统急需引入**反馈机制**来形成真正的业务闭环。SD-208 运营大师旨在通过对接 YouTube Analytics 数据，并结合多模态大模型对视频内容的深度理解，为后续创作提供由数据驱动的具体指导。

运营大师的三大核心能力：
1. **发布后实时仪表盘**: 24/48/72 小时阶梯式性能监控。
2. **多模态深度诊断**: 留存曲线异常点 + 脚本 + 原片帧的联合分析。
3. **PDCA 受众反哺**: 提取视觉偏好，反哺下一期的导演撰稿与 Remotion 渲染。

---

## 架构与集成说明

本项目深度复用现有基础设施：

*   **OAuth 数据管道**: 依赖 `server/youtube-auth.ts`。需要在此文件中追加 scope `https://www.googleapis.com/auth/yt-analytics.readonly`。
*   **前端入口**: 在 `src/config/experts.ts` 中注册新 ID `OperationsMaster`。
*   **大模型核心**: 必须使用 **Gemini 3.1 Pro**，因需其处理超长视频帧流的强大原生多模态能力。
*   **状态存储**: 运营状态写入 `delivery_store.json` 下的 `modules.operations` 节点。
*   **反哺物料**: 诊断后提炼的规则必须输出至项目根目录的 `audience_preferences.json`。

## 核心工作流设计 (PDCA 闭环)

1.  **Check阶段 (数据获取与诊断)**:
    *   通过 API 获取选定视频最近的 CTR 以及逐秒 `audienceWatchRatio` (留存率)。
    *   系统识别出留存率的波峰 (高光) 与波谷 (流失)。
    *   将该时间戳对应的视频原片 (`05_Shorts_Output/`) + 脚本 + 异常标注送入 Gemini 3.1 Pro。
    *   Gemini 输出具体分析报告 (例如："0:45秒流失15%，原因是B-roll时长过长")。
2.  **Act阶段 (提炼偏好)**:
    *   将具体的诊断建议固化为机器可读的偏好 JSON。示例：`"broll_max_duration_sec": 2.5`。
    *   覆写/追加写入 `audience_preferences.json`。
3.  **Plan & Do阶段 (生产反哺 - 跨模块交叉)**:
    *   *(需更新 SD-202 逻辑)* 导演大师在生成 `visual_plan` 时，必须预先拉取并遵循 `audience_preferences.json` 中的约束。
    *   *(需更新 SD-204 逻辑)* Remotion 渲染农场在排版时，动态套用偏好中的节奏和特效样式。

## 实施阶段建议

考虑到系统的复杂性，建议分两个阶段实施：
*   **Phase 1 (数据与看盘)**: 打通 Analytics API，实现 24/48/72 基础数据监控，完成前端基础展示。
*   **Phase 2 (多模态与闭环)**: 引入 Gemini 3.1 Pro 真正实现视频画面+留存曲线的双盲诊断，并跑通 `audience_preferences.json` 的闭环链路。
