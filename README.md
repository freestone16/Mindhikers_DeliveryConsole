# Distribution Terminal — 分发终端

> **MHSDC** 产品线 3  
> 负责 MindHikers 内容的多平台分发编排，聚焦 Queue + SSE + Connector 架构

---

## 这是什么

`Distribution Terminal` 是 MindHikers 创作者工具矩阵的**分发编排层**，承接 Director / Marketing / Shorts 等上游模块的产物，完成最后一公里的多平台发布：

- **分发队列（Queue）**：任务调度、优先级管理、失败重试
- **SSE 实时推送**：发布状态实时回传前端
- **平台连接器（Connector）**：YouTube、X、微信公众号等平台的统一接入层
- **状态持久化**：发布记录、失败原因、重试历史全链路可追溯

---

## 当前状态

| 维度 | 状态 |
|------|------|
| 分支 | `MHSDC-DT` |
| 阶段 | 待建设 / 一期基线已立 |
| 架构 | Queue + SSE + Connector |

**已完成（截至 2026-03-20）**：
- 独立分支与 worktree 建立
- 总体设计方案与一期实施方案落盘
- 分发队列迁移到项目内 `06_Distribution/`
- 基础服务层拆出：auth / queue / store / types / sse
- `projectId` 级别的前端页面读写已接通
- Phase 1 首个里程碑代码与自验收闭环完成

---

## 快速导航

| 你想看 | 读这个 |
|--------|--------|
| 模块治理入口 | `./AGENTS.md` |
| 项目族入口 | `/Users/luzhoua/MHSDC/AGENTS.md` |
| 全局治理入口 | `/Users/luzhoua/.codex/AGENTS.md` |

---

## 注意事项

- 当前目录为旧 Delivery Console 物理现场，代码已迁往新工作面
- 分发终端作为一级模块的定位不变，后续将在此目录上重建
- 物理目录名含空格（`Distribution Terminal`），是已知技术治理风险点

---

*最后更新：2026-04-24*
