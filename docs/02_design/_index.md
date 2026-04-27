# MindHikers 设计文档索引 (02_design)

> 修订日期: 2026-04-08
> 本目录按当前 `MHSDC` 治理口径组织，不再使用“一级 / 二级 / 三级火箭”的旧叙事。
> 团队成员需要了解任何系统组件前，请先阅读对应子目录下的 `_master.md` 文件。

---

## 一级业务目录

### [黄金坩埚 (GoldenCrucible-GC)](./crucible/_master.md)
负责高密度推演、结晶化沉淀、主题资产与核心内容生产。

### [交付终端 (DeliveryConsole)](./delivery/_master.md)
负责内容交付、专家协作、渲染装配、项目级交付链路与宿主层接线。

### [分发终端 (DistributionTerminal)](./distribution/_master.md)
负责内容投递、平台分发、反馈回收与分发侧流程管理。

---

## DeliveryConsole 二级能力模块

以下能力模块统一按 `DeliveryConsole` 二级模块理解：

1. `Director`
2. `MarketingMaster`
3. `ThumbnailMaster`
4. `MusicDirector`
5. `ShortsMaster`

说明：

1. 二级模块的业务归属不因 worktree 隔离而改变。
2. 不要再把 `MarketingMaster` 改挂到 `DistributionTerminal`。

---

## 横切支撑

### [信息深潜 (Info Hub)](./infohub/_master.md)
负责雷达侦搜、素材提取与外部信息转结构化资产。

### [基础设施 (Infrastructure)](./infrastructure/_master.md)
负责项目级隔离、模型配置、密钥治理、运行时与环境边界。

---

## 协同约定

1. 了解任何功能前，先读对应 `_master.md`，再沿索引进入对应详细设计文档。
2. 新增设计资产时，必须把文档挂回对应 `_master.md` 的索引表，禁止新增孤儿文档。
3. 如历史文档仍使用“火箭级次”表述，以当前索引和 `AGENTS.md` 的治理口径为准。
