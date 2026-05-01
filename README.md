# MarketingMaster — 营销大师

> **DeliveryConsole** 二级模块  
> 负责 MindHikers 视频内容的 SEO/GEO 优化、标题/描述/标签策略与多平台营销方案

---

## 这是什么

`MarketingMaster` 是 DeliveryConsole 的营销策略工作台，核心能力是把视频脚本转化为算法友好的营销资产：

- **SEO/GEO 双优化**：YouTube 标题、描述、标签、Hashtags
- **GEO 结构化数据**：AI 引擎可读的 schema 标记
- **候选词生成**：基于脚本内容自动提取高潜力关键词
- **多平台适配**：同一内容产出 YouTube / X / 微信公众号 三端营销变体

技术栈：React + TypeScript + Node.js + Python（Skill 执行器）

---

## 当前状态

| 维度 | 状态 |
|------|------|
| 分支 | `MHSDC-DC-MKT` |
| 阶段 | TubeBuddy 真实评分链路可用；Delivery Shell UI 改版进入 demo/实施规划阶段 |
| 前端 | `http://localhost:5174` |
| 后端 | `http://localhost:3002` |
| UI Demo | `http://localhost:5174/#/marketing-redesign-demo` |

**最近一次产出（2026-05-01）**：
- TubeBuddy Studio-first 真实评分链路修复完成，禁用假评分 fallback
- Phase 2 增加完整视频描述审阅台，支持 SEO/GEO 顺序全局预览
- 新版 Delivery Shell UI demo 已落地：左栏对齐 Director，P1-P4 放中栏 header，运行态放右栏 Artifacts
- P3 从“审核 JSON”调整为“平台适配与 DT 交接检查”

---

## 快速导航

| 你想看 | 读这个 |
|--------|--------|
| 完整决策链 | `docs/dev_logs/2026-04-19_SD207_PRD_Brainstorm.md` |
| 模块总纲 | `docs/02_design/marketing/_master.md` |
| PRD v1 草案 | `docs/02_design/marketing/sd207_prd.md` |
| 实施方案 | `docs/02_design/marketing/sd207_implementation.md` |
| 当前交接 | `docs/dev_logs/HANDOFF.md` |
| 模块规则 | `docs/04_progress/rules.md` |
| UI 改版规划 | `docs/plans/2026-05-01_MarketingMaster_UI_Redesign_Plan.md` |
| Director 设计源头 | `/Users/luzhoua/MHSDC/DeliveryConsole/Director/design.md` |

---

## 当前 UI 改版方向

MarketingMaster 将对齐 Director 的 Delivery Shell 设计系统：

- 左栏：统一 Delivery 工作站导航，不再承载 MarketingMaster 内部流程。
- 中栏：MarketingMaster 主工作台，header 内放 `P1/P2/P3/P4`。
- 右栏：`Artifacts` / runtime / handoff / 日志等运行态上下文。
- 色彩：沿用 Director / GoldenCrucible 的暖米色、深棕文字、陶土橙主动作。
- 控件：减少大圆角和大卡片，使用紧凑面板、表格行、命令式按钮。

当前阶段定义：

| Phase | 名称 | 主要职责 |
|---|---|---|
| P1 | 关键词与定位 | TubeBuddy 真实评分、黄金关键词、搜索意图判断 |
| P2 | 发布文案审阅 | 标题、完整视频描述、标签、播放列表、SEO/GEO 顺序检查 |
| P3 | 平台适配 | YouTube 主包确认，多平台字段缺口，DT 交接准备 |
| P4 | 导出与交接 | 最终确认、双格式输出、进入分发终端/handoff |

完整视频描述在 P2 审阅，不在 P3 审核。P3 不以 JSON 为主界面，JSON 只作为机器交接物进入 artifacts。

---

## 治理入口

- 模块 AGENTS：`./AGENTS.md`
- 父入口：`/Users/luzhoua/MHSDC/DeliveryConsole/AGENTS.md`
- 全局入口：`/Users/luzhoua/MHSDC/AGENTS.md`

---

*最后更新：2026-05-01*
