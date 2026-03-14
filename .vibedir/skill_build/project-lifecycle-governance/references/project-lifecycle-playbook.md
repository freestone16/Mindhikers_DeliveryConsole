# Project Lifecycle Governance Playbook

## 1. 目标

把“真实研发结构”和“执行节奏”稳定治理起来，再映射到 Linear 或其他工具，避免出现下面四类混乱：

1. 用工具结构代替真实项目结构
2. 用 Project 代替阶段
3. 用 Label 代替层级
4. 用 Issue 标题临时表达治理结构

## 2. 生命周期视角

### 2.1 七段法

| 阶段 | 核心问题 | 典型产物 |
| --- | --- | --- |
| Initiation | 为什么做、做什么、不做什么 | 目标、边界、命名 |
| Structuring | 该按什么层级治理 | 阶段图、项目图、workstream |
| Planning | 具体怎么做 | 方案文档、拆解草图、验收口径 |
| Execution | 当前推进到哪 | 活跃任务、阻塞、状态 |
| Sync | 如何与工具对齐 | Linear 结构、状态板、进度文档 |
| Acceptance | 如何算完成 | 验证记录、交接记录、归档 |
| Retrospective | 下次怎么更稳 | rules、lessons、最佳实践 |

### 2.2 判断规则

如果用户在问：

- “这个项目到底该怎么分层” -> `Structuring`
- “现在做到哪了，怎么同步到 Linear” -> `Sync`
- “这轮做完了怎么落盘” -> `Acceptance`
- “以后怎么避免再乱” -> `Retrospective`

## 3. 对象速查表

| Linear 对象 | 推荐含义 | 不要拿来做什么 |
| --- | --- | --- |
| Initiative | 总计划、总战役、总母题 | 装零散 issue |
| Project | 阶段性项目、战役包 | 表达横向 workstream |
| Parent Issue | 项目内的大工作包 | 代替 Project |
| Issue / Sub-issue | 可执行动作 | 代替路线图 |
| Label | 横向分类 | 代替父子层级 |

## 4. 纵横两条线

治理时，强制把每张票同时归到两条线：

### 3.1 纵向归属

- 属于哪个 Initiative
- 属于哪个 Project
- 属于哪个 Parent Issue

### 3.2 横向归属

- 属于哪个 `workstream:*`
- 是否涉及某个 `surface:*`
- 是否带有某类 `risk:*`

不要用一个对象同时承担纵向和横向两种职责。

## 5. 命名规范

### 4.1 Project

- 用阶段名、战役名、产品线名
- 避免同时包含阶段、工作类型、状态

### 4.2 Parent Issue

统一格式：

`[阶段名]-[工作类型]`

推荐工作类型：

- `dev`
- `content`
- `launch`
- `research`
- `ops`

### 4.3 Label

推荐命名空间：

- `workstream:*`
- `surface:*`
- `risk:*`

## 6. 治理输出模板

每次讨论或执行前，先整理成下面四段：

### 5.1 Current State

- 当前有哪些 Initiative / Project / Issue
- 为什么看起来乱
- 哪些名称是历史包袱，哪些是结构性错误

### 5.2 Target Structure

- 顶层容器怎么放
- 并列 Project 怎么分
- Parent Issue 怎么命名
- 哪些横向线改成 Label

### 5.3 Migration Plan

| 类型 | 当前对象 | 建议动作 | 目标对象 | 原因 |
| --- | --- | --- | --- | --- |
| Project | 示例 | rename | 示例 | 避免语义漂移 |

常见动作：

- `keep`
- `rename`
- `move`
- `split`
- `archive`
- `create`

### 5.4 Open Questions

- 哪些业务边界还没定
- 哪些命名牵涉范围过大
- 哪些对象是否真的需要新建

## 7. 执行节奏模板

每次周转项目时，至少维护下面五行：

1. `Current Milestone`
2. `Primary Track`
3. `Active Work`
4. `Blockers`
5. `Next Governance Action`

如果团队里同时存在文档、代码、Linear 三个面，优先让这五行在三处表达一致。

## 8. 黄金坩埚示例

这是当前 DeliveryConsole 中已经验证过的一套映射口径：

### 6.1 高层关系

- `Golden Crucible` = 上级总容器
- `Code Nemesis` = 当前紧急阶段性 Project
- `Crucible-0 Phase 2` = 第二阶段 Project
- `Crucible-Plus Phase 3` = 第三阶段 Project

### 6.2 横向 workstream

- `workstream:shared-kernel`
- `workstream:eval`

### 6.3 Parent Issue 命名

- `Crucible Phase 1-dev`
- `Crucible Phase 1-content`
- `Crucible Phase 1-launch`
- `Crucible-0 Phase 2-dev`
- `Crucible-Plus Phase 3-dev`

### 6.4 迁移判断

如果历史上已经有 `MIN-*` issue，不要直接删除；先判断它们属于：

1. 需要重命名后保留
2. 需要移动到新的 Project
3. 需要下沉为某个 Parent Issue 的子票
4. 需要归档

## 9. 执行动作前的检查单

1. 是否已经读取本地最新进度与方案，而不是只看旧文档
2. 是否先盘点当前 Linear 现状，再决定新建对象
3. 是否把横向能力错误建成了 Project
4. 是否把 Parent Issue 和 Project 混为一谈
5. 是否已经准备好迁移表，能解释每个改动的原因
6. 是否已经明确当前是哪个生命周期阶段，而不是把所有治理动作混在一起
