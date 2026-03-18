# SD221 Golden Crucible Linear 治理交接文档

> 日期：2026-03-14
> 工作目录：`/Users/luzhoua/DeliveryConsole`
> 分支：`codex/sd208-golden-crucible`
> 状态：交接稿，供新窗口单独治理 Linear
> 作者：Codex（按 OldYang 协议落盘）

## 1. 本文档用途

这份文档只服务一件事：

**把黄金坩埚相关的 Linear 治理工作从当前讨论中拆出来，供后续新窗口单独整理。**

本文档不进入代码实现，不修改当前产品方案，只负责说明：

1. 当前 Linear 盘子为什么会乱
2. 目标结构应该是什么
3. `Initiative / Project / Parent Issue / Sub-issue / Label` 分别如何使用
4. 现有 `MIN-*` issue 建议如何迁移或重命名

---

## 2. 当前已知现状

截至 2026-03-14，本地已查到的 Linear 现状如下：

### 2.1 当前项目

- `Code Nemesis`

当前它是一个 Project，定位偏“阶段性紧急战役”，摘要为：

- 网站建设
- 黄金坩埚核心能力建设
- 上线与支付等阶段性工作

### 2.2 当前已见黄金坩埚相关 issue

- `MIN-7` 网站开发
- `MIN-28` 黄金坩埚：圆桌会议开发完成
- `MIN-30` 黄金坩埚：苏格拉底开发完成
- `MIN-31` 黄金坩埚：交付模块
- `MIN-32` 黄金坩埚：分发模块

### 2.3 当前结构问题

当前结构不是完全错误，但它是“模块平铺视角”，而不是“阶段 + 横向工作线视角”。

因此会产生三个问题：

1. 黄金坩埚内部的 `Phase 1 / 0 / Plus` 没有被清楚区分
2. 共享内核与评测任务没有横向聚合方式
3. 网站、产品、文案、周边模块混在同一个父层下，看起来会乱

---

## 3. 目标结构

## 3.1 正确的高层关系

本轮已确认的正确关系是：

- `Golden Crucible`
  - 更上一级的总计划容器
- `Code Nemesis`
  - 当前紧急阶段性项目
- `Crucible-0 Phase 2`
  - 第二阶段项目
- `Crucible-Plus Phase 3`
  - 第三阶段项目

其中：

- `Code Nemesis / Crucible-0 Phase 2 / Crucible-Plus Phase 3`
  是并列关系
- 它们都从属于更高层的 `Golden Crucible`

## 3.2 在 Linear 中的推荐映射

### 优先方案

如果工作区启用了 Initiative：

- `Golden Crucible` = Initiative
- `Code Nemesis` = Project
- `Crucible-0 Phase 2` = Project
- `Crucible-Plus Phase 3` = Project

### 退化方案

如果当前工作区还未启用 Initiative：

- 保留三个并列 Project
- 另外建一份 `Golden Crucible` 总文档或总父 issue 作为人为 SSOT

注意：

**Initiative 负责装 Projects，不负责直接装 Issues。**

---

## 4. Linear 概念的通俗解释

## 4.1 Initiative

像“总战役 / 总计划 / 总母题”。

适合承载：

- `Golden Crucible`

它的作用是：

- 汇总多个阶段性 Project
- 承接路线图与总目标

它不是 issue 的父层。

## 4.2 Project

像“一场阶段性战役”。

适合承载：

- `Code Nemesis`
- `Crucible-0 Phase 2`
- `Crucible-Plus Phase 3`

## 4.3 Issue

像“一张可执行工作卡”。

`MIN-XXX` 本质上就是 issue 编号，不是项目，也不是版本号。

## 4.4 Parent Issue

像“项目内部的大工作包”。

适合做：

- 开发类父任务
- 文案类父任务
- 上线/配套类父任务

## 4.5 Label

像“横向标签”。

它不是层级，而是用来把散落在不同 Project 里的同类 issue 横向串起来。

例如：

- `workstream:shared-kernel`
- `workstream:eval`

---

## 5. 命名纪律

## 5.1 Project 命名

建议使用：

- `Code Nemesis`
- `Crucible-0 Phase 2`
- `Crucible-Plus Phase 3`

## 5.2 开发父任务命名

本轮已确定应当保留 `-dev` 后缀，用来明确“纯开发工作包”。

建议：

- `Crucible Phase 1-dev`
- `Crucible-0 Phase 2-dev`
- `Crucible-Plus Phase 3-dev`

这能保证：

1. 一眼看出是否纯开发
2. 与内容、上线、周边任务明确分离
3. 后续阶段命名保持统一

## 5.3 兄弟父任务命名建议

如有需要，建议采用同一规则：

- `Crucible Phase 1-content`
- `Crucible Phase 1-launch`
- `Crucible-0 Phase 2-content`
- `Crucible-Plus Phase 3-content`
- `Crucible-Plus Phase 3-research`

命名总规则建议为：

`[阶段名]-[工作类型]`

---

## 6. Shared Kernel / Eval 在线性工具中的正确落法

## 6.1 它们不是什么

`Shared Kernel / Eval` 在当前阶段：

- 不是单独 Project
- 不是 Initiative
- 也不是固定的一张 issue

## 6.2 它们是什么

它们是两条横向工作线：

1. `Shared Kernel`
2. `Eval`

更准确说，它们是跨三个 Project 的长期 workstream。

## 6.3 为什么使用统一标签

因为你不想为它们单开 Project，但它们又横跨多个项目。

所以建议采用统一标签来横向聚类：

- `workstream:shared-kernel`
- `workstream:eval`

这些标签的含义是：

- 某张 issue 属于哪个 Project，是“纵向归属”
- 某张 issue 打了什么 `workstream:*`，是“横向归属”

例如：

- `Code Nemesis` 里的“统一 chat message contract”
  - 可打 `workstream:shared-kernel`
- `Crucible-0 Phase 2` 里的“验证 Prelude 是否提升正式坩埚起点质量”
  - 可打 `workstream:eval`
- `Crucible-Plus Phase 3` 里的“比较 plus runtime 与 phase 1 的人格稳定性差异”
  - 也可打 `workstream:eval`

这样即便这些 issue 分散在不同 Project 里，也能通过标签横向拎出来一起管理。

---

## 7. 建议的 Linear 结构

## 7.1 顶层

### Initiative

- `Golden Crucible`

如果暂时无法启用 Initiative，则把这层保留在文档里作为人为 SSOT。

## 7.2 第二层：并列 Projects

1. `Code Nemesis`
2. `Crucible-0 Phase 2`
3. `Crucible-Plus Phase 3`

## 7.3 第三层：每个 Project 内的父任务

### `Code Nemesis`

建议至少有：

- `网站开发`
- `Crucible Phase 1-dev`
- `文案与上线配套`

### `Crucible-0 Phase 2`

建议至少有：

- `Crucible-0 Phase 2-dev`
- `Crucible-0 Phase 2-content`

### `Crucible-Plus Phase 3`

建议至少有：

- `Crucible-Plus Phase 3-dev`
- `Crucible-Plus Phase 3-content`
- `Crucible-Plus Phase 3-research`

可按后续实际情况精简。

---

## 8. 现有 issue 的初步迁移建议

下面只是治理起点建议，不是最终唯一答案。

## 8.1 `MIN-7` 网站开发

当前它更像 `Code Nemesis` 里的一个大父任务，而不是黄金坩埚的总容器。

建议：

- 保留在 `Code Nemesis`
- 将其视为 `网站开发` 父任务
- 不再让它承接整个黄金坩埚路线

## 8.2 `MIN-28` 黄金坩埚：圆桌会议开发完成

这条更接近：

- `Crucible-0 Phase 2-dev`

建议：

- 迁移到 `Crucible-0 Phase 2`
- 作为 `Crucible-0 Phase 2-dev` 下面的开发卡

## 8.3 `MIN-30` 黄金坩埚：苏格拉底开发完成

这条当前命名过于粗。

建议不要把“苏格拉底”当成单一模块一次性做完，而应拆开。

建议拆成两类：

1. 当前 `Code Nemesis / Crucible Phase 1-dev`
   - 与当前版本弱方法挂接相关的工作
2. `Crucible-Plus Phase 3-dev`
   - `SocratesMethodPlugin` 强方法裁判相关工作

如果短期不想拆卡，也至少要改标题，避免“开发完成”这种一次性完结口径。

## 8.4 `MIN-31` 黄金坩埚：交付模块

这条不一定是黄金坩埚核心 phase 线。

建议判断：

- 若它属于 `Code Nemesis` 的上线配套能力，则留在 `Code Nemesis`
- 若它是更长期能力，则后续再单列到更合适的项目

## 8.5 `MIN-32` 黄金坩埚：分发模块

处理逻辑同 `MIN-31`。

它可能更适合作为：

- `Code Nemesis` 的周边交付/上线能力

而不是黄金坩埚核心 runtime 路线的一部分。

---

## 9. 建议的第一批标签

建议先控制数量，不要一上来建太多标签。

第一批足够：

- `workstream:shared-kernel`
- `workstream:eval`
- `track:phase1`
- `track:phase2`
- `track:phase3`

其中：

- `workstream:*` 表示横向工作线
- `track:*` 表示这张卡属于哪个阶段轨道

这样后续筛选会比较清楚。

---

## 10. 新窗口治理时的建议顺序

建议在新窗口里按这个顺序治理：

1. 先确认 Initiative 是否在当前工作区启用
2. 再确认是否保留 `Code Nemesis` 为当前 Project
3. 新建：
   - `Crucible-0 Phase 2`
   - `Crucible-Plus Phase 3`
4. 在三个 Project 里建立统一父任务
5. 建立第一批标签
6. 最后再迁移现有 `MIN-7 / 28 / 30 / 31 / 32`

不要反过来先移动 issue，否则很容易再次变乱。

---

## 11. 交接结论

Linear 部分的正确治理方式，不是继续在当前 `Code Nemesis > MIN-7` 下面堆模块卡，而是：

1. 在概念上把 `Golden Crucible` 提到更上一级
2. 让 `Code Nemesis / Crucible-0 Phase 2 / Crucible-Plus Phase 3` 成为并列项目
3. 每个 Project 内用统一的 `-dev` 命名管理纯开发父任务
4. 用 `workstream:*` 标签横向管理 `Shared Kernel / Eval`

这套结构定下来之后，后续无论是开发推进、阶段验收，还是商业化与产品叙事，都会更清楚。
