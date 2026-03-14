---
name: project-lifecycle-governance
description: 建立并维护项目全生命周期治理，包括立项、分层建模、方案落盘、执行拆解、进度同步、Linear 映射、验收收尾与复盘沉淀。用于用户要求梳理项目治理结构、建立项目管理规范、把开发进度映射到 Linear、拆分阶段与 workstream、校正命名纪律、维护执行节奏，或让多个项目在同一治理框架下持续运行时。
---

# Project Lifecycle Governance

用这套流程把“真实研发工作”治理成一条完整生命线，而不是只在某个工具里临时建卡片。

把文档、结构、执行、状态、工具映射、验收、复盘放到同一个框架里。Linear 只是落地面之一，不是治理本身。

## 工作流

### 1. 先建立治理 SSOT，再做工具动作

先找到项目当前的真实事实源，不要一上来就讨论工具里的卡片结构。

默认顺序：

1. 读取仓库治理文件与进度材料。
2. 找到最近的计划文档、dev log、状态板，而不是依赖过时总表。
3. 判断当前处于生命周期哪个阶段。
4. 只在需要映射到 Linear 时，再读取 Team / Project / Label / Issue 现状。

如果任务与 DeliveryConsole 相关，先读：

- `/Users/luzhoua/DeliveryConsole/.vibedir/governance.md`
- `/Users/luzhoua/DeliveryConsole/.agent/PROJECT_STATUS.md`
- 最新 `docs/dev_logs/` 与 `docs/plans/` 中对应主题的文件

### 2. 先判定生命周期阶段

每次先判断当前工作主要落在哪一段：

1. `Initiation`
   - 立项、边界澄清、命名、目标与非目标
2. `Structuring`
   - 分阶段、分轨道、分 workstream、分责任层
3. `Planning`
   - 方案落盘、实现拆解、依赖梳理、验收口径
4. `Execution`
   - 任务推进、状态维护、问题暴露、节奏治理
5. `Sync`
   - 把现实进度同步到 Linear、状态板、进度文档
6. `Acceptance`
   - 验证、收尾、落盘、归档、交接
7. `Retrospective`
   - 经验复盘、规则补充、lesson 沉淀

不要用一个动作同时替代多个阶段。

### 3. 再判定对象层级，不要先拆票

如果进入结构治理或工具映射，严格使用下面这套对象边界：

- `Initiative`
  - 总战役、总计划、总母题
  - 负责装 `Project`
  - 不直接承担日常执行票
- `Project`
  - 一场阶段性战役，或一个边界明确的执行盘子
  - 负责承载该阶段的父任务与 issue
- `Parent Issue`
  - 项目内部的大工作包
  - 常见类型：`-dev`、`-content`、`-launch`、`-research`
- `Issue / Sub-issue`
  - 真正可执行的工作卡
- `Label`
  - 横向标签，不是层级
  - 适合表达 `workstream:*`、`surface:*`、`risk:*`

如果一个概念横跨多个 Project，不要急着新建 Project；优先判断它是不是 `workstream label`。

### 4. 用“纵向归属 + 横向归属”组织结构

项目治理至少同时回答两件事：

1. 这张票纵向属于哪个 `Project / Parent Issue`
2. 这张票横向属于哪个 `workstream`

典型规则：

- 阶段差异放进 `Project`
- 执行分工放进 `Parent Issue`
- 跨阶段能力放进 `Label`

如果是 `Shared Kernel / Eval` 这种横跨多个项目的长期线，默认用：

- `workstream:shared-kernel`
- `workstream:eval`

不要默认把它们做成独立 Project。

### 5. 让方案与执行成对出现

只要是非微小需求，先有方案，再有执行映射。

最少成对产物：

1. `Plan`
   - 说明目标、边界、阶段、依赖、验收
2. `Execution Structure`
   - 说明这些内容在 Project / Parent Issue / Issue / Label 中如何落位

如果用户要先讨论，不直接创建任务；先产出治理草图。

### 6. 保持命名纪律

优先使用稳定、可延展的命名：

- Project：
  - 使用阶段名或战役名
  - 避免把模块名、状态词、讨论主题混在一起
- Parent Issue：
  - 使用 `[阶段名]-[工作类型]`
  - 例如：`Crucible Phase 1-dev`
- Label：
  - 使用命名空间前缀
  - 例如：`workstream:shared-kernel`

如果现有命名已经广泛使用，先做映射表，再重命名；不要边讨论边大面积改名。

### 7. 维护执行节奏，而不是只建结构

每次进入推进态，都要回答：

1. 当前主线是什么
2. 当前阻塞是什么
3. 哪些是活跃任务
4. 哪些任务只是想法，还不该进执行盘
5. 哪些状态需要同步回文档和 Linear

如果本地状态板、dev log、Linear 三者冲突，优先回到最近的已验证进度来修正。

### 8. 输出治理结论时，固定给四样东西

每次做项目治理，默认输出：

1. `Current State`
   - 当前结构为什么乱
   - 当前处于生命周期哪一段
2. `Target Structure`
   - 目标阶段、对象层级、命名与节奏
3. `Execution / Migration Plan`
   - 哪些对象保留、重命名、迁移、拆分、新建，或哪些执行项需要新建
4. `Open Questions`
   - 还有哪些业务口径未定，导致现在不该动手

如果用户要讨论优先，不要直接修改工具。先给草图与影响面。

### 9. 真正动 Linear 前，先做一次盘点

使用 Linear MCP 时，优先按这个顺序：

1. 读取 Team、Project、Issue Status、Project Label、Issue Label 现状
2. 找重复命名、同义标签、已存在父任务
3. 优先更新现有对象，不重复创建
4. 只有在层级已明确时，才新建 Initiative / Project / Parent Issue / Label

如果要批量迁移 issue，先整理成迁移表，再执行。

### 10. 把“执行票”与“叙事票”拆开

同一个 Project 内，默认至少区分：

- `-dev`
- `-content`
- `-launch`

不要把研发实现、对外文案、上线配套、支付/官网等动作全部堆进一个父任务里。

### 11. 收尾时必须留下治理痕迹

当阶段完成或明显推进后，至少同步一处稳定落点：

1. `docs/dev_logs/` 或对应进度文档
2. `.agent/PROJECT_STATUS.md`
3. Linear 中的状态、父任务、标签或迁移结果
4. 必要时补一条规则或 lesson

不要只在聊天里宣布“完成”。

## 参考资料

需要完整模板、迁移表字段、阶段检查单或黄金坩埚示例时，读取：

- `references/project-lifecycle-playbook.md`
