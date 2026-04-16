---
title: "UI Architecture PRD · 骨架（Skeleton v0.1）"
type: prd-skeleton
status: draft
date: 2026-04-15
owner: OldYang
consumers:
  - CE Team（工程架构轨 · §3 §4 §7 §8 §9 §10 主笔）
  - frontend-design plugin（视觉体验轨 · 北极星 4 屏 + Design Token）
related:
  - 2026-04-15_UI_Architecture_North_Star_Brief.md
  - /Users/luzhoua/MHSDC/GoldenCrucible-Roundtable/docs/plans/2026-04-13_roundtable-to-sse-migration-plan.md
---

# UI Architecture PRD · 骨架 v0.1

> **这是骨架，不是成稿。**
> 它定义章节结构 + 每章要回答的问题，让 CE 团队（工程轨）和 frontend-design（视觉轨）双轨并行填充。
> 最终由 OldYang 合卷成完整 PRD。

---

## 总纲

**产品**：以可插拔频道精神为灵魂、可插拔人格为角色、可插拔技能为能力的思考协同工具。

**四段式工作流**：GoldenRador → Roundtable → GoldenCrucible → Writer → Delivery Console

**PRD 两大第一公民**：
1. **Pluggable Slot Architecture**（三层可插拔 slot）
2. **Cross-Module Handoff Contract**（跨模块流转契约）

---

## §1 设计理念与北极星

**要回答**：产品气质是什么？视觉锚点是谁？反面清单是什么？

- 1.1 设计宣言：奥卡姆剃刀 · 简单 · 强壮 · 底蕴 · 内涵
- 1.2 视觉锚点：Claude Code（主）+ Codex（辅）
- 1.3 反面清单：详见北极星简报 §十二

**主笔**：OldYang（本章直接引用北极星简报）

---

## §2 Information Architecture

**要回答**：产品的域模型是什么？四模块各自什么定位？未来如何扩展？

- 2.1 域模型五元组：**Module · Session · Artifact · Slot(×3) · Config**
- 2.2 四模块正式命名与定位：
  - **GoldenRador**（雷达 / 选题）
  - **Roundtable**（圆桌 / 讨论）
  - **GoldenCrucible**（坩埚 / 炼制）
  - **Writer**（文案 / 改写）—— 命名待定，候选 GoldenQuill
- 2.3 扩展位（第 N 个模块由 Slot 贡献）
- 2.4 Session 在各模块的语义差异（见 §5.2）

**主笔**：OldYang + CE Team

---

## §3 Pluggable Slot Architecture ⭐ 第一公民

**要回答**：三层 Slot 的 schema、注册协议、组合规则、UI 表达。

> **设计哲学**：产品的可进化性通过三层正交的可插拔 slot 实现 —— Channel Spirit / Persona / Skill。
> 未来任何产品升级（新调性、新人格、新能力）都应该是"加 slot"而非"改代码"。

- 3.1 三层正交设计哲学（为什么三层、为什么正交）
- 3.2 **Channel Spirit Slot**（频道精神）
  - 3.2.1 Manifest schema
  - 3.2.2 当前激活：mindhikers 精神描述（独立观点 / 深度取向 / 精选非聚合）
  - 3.2.3 切换协议
- 3.3 **Persona Slot**（人格）
  - 3.3.1 Persona Manifest schema（扩展现有 PersonaProfile）
  - 3.3.2 当前池：7 位哲人 + 老卢 / 老张 等现实人格
  - 3.3.3 注册 / 卸载协议
  - 3.3.4 ⭐ **Persona 萃取引擎接口预留**（未来）
- 3.4 **Skill Slot**（技能）
  - 3.4.1 Skill Manifest schema
  - 3.4.2 当前池：Writer / ThesisWriter / Researcher / FactChecker / Socrates
  - 3.4.3 **Skill ↔ Module 的 N:M 关系**（一个 skill 可被多个模块加载）
  - 3.4.4 Skill ↔ Persona 的装配关系（一个人格可装配多个技能）
- 3.5 三层之间的组合矩阵与生效顺序
- 3.6 新 Slot 加入的 dev 流程（几步能跑）
- 3.7 UI 对三层的表达
  - Channel Spirit → 产品整体气质 + Rador 选题筛选
  - Persona → Roundtable 参与者 + Crucible 对话者
  - Skill → Crucible "已加载专家" 面板

**主笔**：CE Team（工程 schema）+ OldYang（哲学 + 现状实证）

---

## §4 Cross-Module Handoff Contract ⭐ 第一公民

**要回答**：四段式工作流中每个箭头传什么、怎么触发、能否回溯、能否回退。

- 4.1 流转拓扑：`Rador → Roundtable → Crucible → Writer → Delivery Console`
- 4.2 触发方式：**用户显式按钮**（默认）
- 4.3 数据契约（每个箭头一节）
  - 4.3.1 `Rador → Roundtable` : `TopicCandidate` schema
    - 字段占位：`title / summary / source / tags / curatedBy / createdAt`
  - 4.3.2 `Roundtable → Crucible` : `Spike[] + RoundtableSession`
  - 4.3.3 `Crucible → Writer` : `Thesis(markdown + metadata)`
  - 4.3.4 `Writer → Delivery Console` : 占位（待文案专项 PRD）
- 4.4 **可回溯**：下游节点一键跳回源头（论文 → 原圆桌 → 原 Topic）
- 4.5 可逆性：送出后的改写规则、分版规则
- 4.6 中断 / 重入 / 版本关联
- 4.7 跨模块流转的 UX 设计（见北极星 §九，handoff 是"产品灵魂瞬间"）

**主笔**：CE Team

---

## §5 Shell 结构

**要回答**：三栏布局的每一栏承载什么？模块间的共享壳怎么设计？

- 5.1 左栏上：四模块切换器（+ 扩展位）
- 5.2 左栏中：Session 列表（语义表）

| 模块 | 列表单位 | 例子 |
|---|---|---|
| GoldenRador | **Item** | "AI 会取代编辑吗" · 3h 前收入 |
| Roundtable | **Session** | "AI 会取代编辑吗 · 4 位哲人" · 进行中 |
| Crucible | **Session** | "AI 与编辑论 · 炼制中" · v0.3 |
| Writer | **Session** | "AI 与编辑论 → X 长文改写" · 待审核 |

- 5.3 左栏下：用户 + Config
- 5.4 中栏：Chat 主区（统一范式，模块内容不同）
- 5.5 右栏：Artifact 抽屉（默认折叠）
- 5.6 响应式断点与降级（1280 / 768）

**主笔**：frontend-design（视觉）+ CE Team（响应式工程）

---

## §6 四模块边界

**要回答**：每个模块干什么、本轮怎么处理、未来怎么演化。

### 6.0 GoldenRador（粗轮廓占位，本轮预留位置）

- **职能**：互联网信息收集 + 当前激活 Channel Spirit 驱动筛选 + Topic 候选池
- **气质锚定**：不是盲抓热点的 feed，是精选池。秉承当前 Channel Spirit（首发 mindhikers）的深度取向。
- **Shell 位置**：左栏上第一个模块按钮
- **输出契约**：`TopicCandidate` → Roundtable
- **内部结构**：【本轮不展开】
- **Skill 占位**：Curator / WebSearch / RSS / Reader 等（待专项 PRD）
- **后续**：专项 PRD

### 6.1 Roundtable（已开发完毕，需剥离 Shell 后入壳）

- **现状**：RT 仓库 `origin/sse-export` 已完成 Unit 1~6
- **迁移方式**：文件级复制 + 路由手工注册（见圆桌迁移方案 v2 + 附录 B）
- **Shell 处理**：⚠️ **不搬 Sidebar.tsx / App.tsx 整层布局** —— 由新 Shell 提供
- **内部核心**：Persona 多方发言（SSE 流式）+ 导演指令 + Spike 提取 + DeepDive
- **输出契约**：`Spike[] + RoundtableSession` → Crucible

### 6.2 GoldenCrucible（主工作流已定，重点：头尾衔接）

- **现状**：SSE 主力战场，多 skill 协同（5 个 skill）
- **头衔接**：从 Roundtable 接收 Spike + Session，炼制的起点
- **中工作流**：已定，本 PRD 不重复
- **尾产出**：`Thesis`（专业论文，markdown + metadata）
- **重点关注**：**头尾契约的 UX**（见 §4.3 + 北极星 §九）

### 6.3 Writer（粗轮廓占位，本轮预留位置）

- **职能**：从 Thesis 改写为 X 长文 / 视频脚本 / 其他传播形态 + 审核
- **Shell 位置**：左栏上第四个模块按钮
- **输入契约**：`Thesis` from Crucible
- **输出契约**：Copy / Script → Delivery Console（占位）
- **内部结构**：【本轮不展开】
- **命名**：Writer（占位，候选 GoldenQuill，待定）
- **后续**：专项 PRD

---

## §7 Routing / State Architecture

**要回答**：URL 结构、状态三态切分、技术选型。

- 7.1 URL scheme: `/m/:moduleId/s/:sessionId?artifact=:artifactId`
- 7.2 State 三态切分
  - **Server state**：React Query（SSE 流、session 列表、artifact）
  - **Client state**：Zustand（UI 临时态、折叠态、主题）
  - **URL state**：Router（路由态、可分享）
- 7.3 刷新 / 回退 / 分享链接的 state 恢复协议
- 7.4 SSE 连接在路由切换时的生命周期

**主笔**：CE Team

---

## §8 Design System & Tokens

**要回答**：Token 层级、组件原语清单、还原度验收。

- 8.1 Token 两层：Primitive（`color.zinc.800`）→ Semantic（`color.text.primary`）
- 8.2 Color / Type / Space / Motion / Radius / Shadow token 表（见北极星 §四 §七）
- 8.3 组件原语库清单
  - `Button / IconButton / Input / Textarea / Card / Panel / Drawer / Badge / Avatar / Chip / SidebarItem / ModuleTab / Divider / Toast / Dialog / Dropdown / Skeleton`
- 8.4 对标 Claude Code 还原度验收标准

**主笔**：frontend-design（主）+ CE Team（工程接入）

---

## §9 Responsive / A11y / Perf Budget

**要回答**：断点、无障碍基线、性能预算。

- 9.1 断点：1280 / 768
- 9.2 WCAG 2.2 AA 基线
  - Landmarks（`<nav>` / `<main>` / `<aside>`）
  - 全键盘可达
  - 焦点环可见
  - 对比度 ≥ 4.5:1
- 9.3 Perf Budget
  - LCP ≤ 2.5s
  - INP ≤ 200ms
  - Shell 首屏 ≤ 150KB gzip
  - 模块 code split（lazy-load per module）

**主笔**：CE Team

---

## §10 Observability

**要回答**：错误边界分层、埋点清单。

- 10.1 ErrorBoundary 分层：Shell / Module / Feature / Component
- 10.2 埋点清单
  - 模块切换
  - Session 切换
  - Artifact 展开 / 折叠
  - **跨模块流转**（4 个 handoff 瞬间独立埋点）
  - Persona / Skill 激活变化
  - SSE 连接 / 中断 / 重连

**主笔**：CE Team

---

## §11 实施路线

**要回答**：从骨架到上线的阶段切分。

- **Phase 0**（本 PRD）：北极星简报 + PRD 骨架落盘，双轨启动
- **Phase 1**：Design System + Shell 空壳（无业务逻辑）
- **Phase 2**：Roundtable 入壳（engine 迁入 + 业务组件适配新 shell，**不搬 RT 的 Sidebar/App**）
- **Phase 3**：GoldenCrucible 包装为 feature slice 入壳
- **Phase 4**：GoldenRador 粗轮廓实现（专项 PRD 后）
- **Phase 5**：Writer 粗轮廓实现（专项 PRD 后）
- **Phase 6**：持续优化 + Persona 萃取引擎接入

**主笔**：OldYang

---

## §12 待解决问题池

本 PRD **不拍板**、但**必须记录**的议题：

- [ ] Persona 萃取引擎的接入协议（未来）
- [ ] Channel Spirit 切换的 UX 方案（未来）
- [ ] 多 Channel 并存的可能性（长期）
- [ ] Delivery Console 对接 API（待文案专项 PRD）
- [ ] Crucible 多 skill 协同的编排 UI（待 Crucible UX 专项）
- [ ] Persona vs Skill 是否未来统一（长期哲学议题）
- [ ] Writer 模块正式命名（Writer / GoldenQuill / 其他）
- [ ] GoldenRador 的 "Rador" 拼写终审（vs 标准 Radar）

---

## 双轨工作交接

### 工程轨（CE Team 主笔章节）

- §3 Pluggable Slot Architecture
- §4 Cross-Module Handoff Contract
- §7 Routing / State Architecture
- §9 Responsive / A11y / Perf Budget
- §10 Observability
- §2 / §5 / §8 中的工程部分

**输入**：本骨架 + 北极星简报 + 现有代码（SSE + RT `sse-export`）
**建议工具**：`ce-plan` + `ce-brainstorm`
**输出**：各章节的详细填充，带工程决策与 schema

### 视觉轨（frontend-design 主笔章节）

- §1 视觉锚点具象化
- §5 Shell 视觉
- §8 Design System & Tokens
- 四屏高保真 demo（见北极星简报 §十）

**输入**：北极星简报（本次交付）
**建议工具**：`frontend-design` Anthropic 官方 skill
**输出**：4 屏 demo + Token 定义 + 组件原语视觉

### 合卷评审（OldYang）

双轨产出后，OldYang 合卷 → 整卷评审 → 用户终审 → PRD v1.0 定稿 → 进入 Phase 1 实施。

---

*编制：OldYang（老杨）*
*日期：2026-04-15*
*状态：Skeleton v0.1 draft，待双轨填充*
