# MHSDC — MindHikers 项目族

> **M**indHikers **S**oftware **D**elivery **C**onsole
> 创作者工具矩阵的研发治理根目录

---

## 这是什么

MHSDC 是 MindHikers 创作者工具矩阵的**统一研发根目录**，承载三条核心产品线的工程、治理与交付。

它不是单仓，而是**项目族目录树**。所有落在这个目录下的工程与治理任务，遵循统一的入口规则与文档纪律。

---

## 三条产品线

```
MHSDC/
├── GoldenCrucible/          ← 产品线 1：面向终端用户的 AI 创作 SaaS
├── DeliveryConsole/         ← 产品线 2：面向创作者团队的视频制作工作流
├── Distribution Terminal/   ← 产品线 3：多平台内容分发编排（待建设）
└── ...                      ← 支撑层：项目数据、报告、参考文档
```

### 产品线 1：GoldenCrucible（黄金坩埚）

面向终端用户的 AI 内容生成 SaaS 平台，核心能力是**单人深度创作**。

| 目录 | 角色 | 分支 | 状态 |
|------|------|------|------|
| `GoldenCrucible-SSE` | 研发前线 — 所有新功能先落这里 | `MHSDC-GC-SSE` | 最活跃 |
| `GoldenCrucible-SaaS` | 预发收口线 — SSE 验证后推到这里 | `MHSDC-GC-SAAS-staging` | 活跃 |
| `GoldenCrucible-GC` | 稳定线 — 保留历史模块 | `MHSDC-GC` | 维护 |
| `GoldenCrucibleLab` | 实验仓 — 承接实验性工作面 | `codex/crucible-widget-lab` | 实验性 |
| `GoldenCrucible-Roundtable` | 圆桌讨论模块 — 多角色对话沙盘 | `MHSDC-GC-RT` | Initiation |

**发布流**：`SSE`（研发）→ `SaaS staging`（预发验收）→ `main`（生产 `gc.mindhikers.com`）

**技术栈**：React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Express 5 + Socket.io + better-auth + PostgreSQL

---

### 产品线 2：DeliveryConsole（交付控制台）

面向创作者团队（咱们自己）的视频制作工作流管理工具，核心能力是**专家工作台**。

采用 **monorepo + worktree** 架构：

- `DeliveryConsole-main` — Git 主容器 + 完整代码基线（S1 技术层）
- `DeliveryConsole/` — 一级业务目录，挂载 6 个二级模块 worktree（S1 业务层）

| 模块 | 目录 | 角色 | 分支 |
|------|------|------|------|
| Director | `DeliveryConsole/Director` | 影视导演大师 — 视觉策略、分镜、Remotion 动画编排 | `MHSDC-DC-director` |
| MarketingMaster | `DeliveryConsole/MarketingMaster` | 营销大师 — SEO/GEO、标题/描述/标签优化 | `MHSDC-DC-MKT` |
| MusicDirector | `DeliveryConsole/MusicDirector` | 音乐总监 — 配乐方案、Artlist/Suno/ACE-Step 三模态 | `claude/music-main` |
| ShortsMaster | `DeliveryConsole/ShortsMaster` | 短视频大师 — 病毒脚本、钩子设计、行动号召 | `claude/shorts-main` |
| ThumbnailMaster | `DeliveryConsole/ThumbnailMaster` | 缩略图大师 — CTR 心理学、认知承诺设计 | `MHSDC-DC-TM` |
| DirectorPathGovernance | `DeliveryConsole/DirectorPathGovernance` | 路径治理模块 | — |

**技术栈**：React + TypeScript + Vite + Tailwind CSS + Node.js + Express + Socket.io + Python 3（Skill 执行器）

**数据分离**：代码在 `MHSDC/DeliveryConsole*/`，项目数据在 `Projects/CSET-*`（保留在原处，不影响 Obsidian）

---

### 产品线 3：Distribution Terminal（分发终端）

多平台内容分发编排系统，聚焦 **Queue + SSE + Connector** 架构。

| 目录 | 角色 | 分支 | 状态 |
|------|------|------|------|
| `Distribution Terminal/` | 分发终端 — 多平台分发编排 | `MHSDC-DT` | 待建设 |

> 注：当前目录为旧 Delivery Console 物理现场，代码已迁往新工作面，但分发终端作为一级模块的定位不变，后续将在此目录上重建。

---

## 支撑层

| 目录 | 用途 |
|------|------|
| `Projects/CSET-*` | 视频项目数据（脚本、视觉、音乐、营销、Shorts 输出等） |
| `Reports/` | 治理报告与审计文档汇总 |
| `reference/` | 迁移决策底稿与历史方案 |
| `产品：黄金数据分析师/` | 黄金决策系统（GDS）产品规划文档 |
| `MHSDC-config/` | 预留：项目族级共享配置（当前为空） |

---

## 快速导航

### 进入任一项目前，先读：

```
AGENTS.md → docs/dev_logs/HANDOFF.md → docs/plans/ → docs/04_progress/rules.md
```

### 各项目入口：

| 你想进入 | 读这个 |
|----------|--------|
| 黄金坩埚研发前线 | `GoldenCrucible-SSE/AGENTS.md` |
| 黄金坩埚预发收口 | `GoldenCrucible-SaaS/AGENTS.md` |
| 视频导演工作台 | `DeliveryConsole/Director/AGENTS.md` |
| 营销工作台 | `DeliveryConsole/MarketingMaster/AGENTS.md` |
| 音乐工作台 | `DeliveryConsole/MusicDirector/AGENTS.md` |
| 短视频工作台 | `DeliveryConsole/ShortsMaster/AGENTS.md` |
| 缩略图工作台 | `DeliveryConsole/ThumbnailMaster/AGENTS.md` |
| 分发终端 | `Distribution Terminal/AGENTS.md` |

---

## 研发治理纪律

1. **OldYang First** — 凡工程与治理任务，默认先经 `OldYang` 判定作用域与生命周期阶段
2. **分支防爆** — 接受代码指令前必须 `git branch --show-current`，分支与指令错配则拒写
3. **方案优先** — 新需求先写 `implementation_plan.md`，严禁直接动手
4. **文档链路可导航** — `AGENTS.md → HANDOFF → rules.md → plans/` 必须全链路可访问
5. **分类提交** — 代码变更与治理文档变更分开 commit，同一次治理修复视为一个逻辑单元
6. **零损失原则** — 历史文档先编目、再映射、再迁移，不做无索引删除

---

## 安全提醒

- **不要把真实 API Key 写进任何 README、设计文档或提交记录**
- 需要按 worktree 覆盖端口时，优先放到 `.env.local`
- 修改 `.env` / `.env.local` 后必须重启服务

---

**最后更新**：2026-04-24
