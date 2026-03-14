# SD223 项目全生命周期治理 Skill 落盘记录

> 日期：2026-03-14
> 工作目录：`/Users/luzhoua/DeliveryConsole`
> 分支：`codex/sd208-golden-crucible`
> 状态：进度落盘 / 结构治理强化 / 未提交

## 本轮目标

这轮不继续推进产品代码实现，目标是把“Linear 结构治理经验”升级为“项目全生命周期治理能力”，形成可复用的 Skill 资产，并按协议完成进度保存与备案。

核心目标：

1. 不把治理能力收窄为“只会建 Linear 票”
2. 明确从 `Initiation -> Structuring -> Planning -> Execution -> Sync -> Acceptance -> Retrospective` 的完整链路
3. 将黄金坩埚当前治理经验沉淀为可复用方法
4. 完成 Skill 快照与总账本登记，便于多端协同

## 已完成

### 1. 新增项目全生命周期治理 Skill 草稿

在工作区新增：

- `.vibedir/skill_build/project-lifecycle-governance/SKILL.md`
- `.vibedir/skill_build/project-lifecycle-governance/references/project-lifecycle-playbook.md`

当前 Skill 已覆盖：

1. 生命周期阶段判定
2. 对象层级边界（Initiative / Project / Parent Issue / Issue / Label）
3. `纵向归属 + 横向归属` 治理模型
4. 命名纪律与迁移策略
5. 执行节奏与收尾落盘要求

### 2. 将 Linear 从“目标”降级为“落地面”

本轮关键纠偏是：

- 让 Skill 从 `linear-governance` 升级为 `project-lifecycle-governance`
- 明确 Linear 只属于 `Sync` 阶段的一种执行面，而非治理本体

### 3. 生成 Skill UI 元数据并通过校验

已生成：

- `.vibedir/skill_build/project-lifecycle-governance/agents/openai.yaml`

并执行校验：

- `quick_validate.py` 通过

### 4. 完成多端协同备案

已新增：

- `.vibedir/skill_drafts/codex_ProjectLifecycleGovernance_20260314.md`

并登记：

- `.vibedir/skill_registry.yml`

本轮记录了 `ProjectLifecycleGovernance` 的快照路径、母本路径与变更摘要，满足后续跨端比对与回流要求。

## 当前结论

截至本轮，治理能力已经从“针对黄金坩埚这一次怎么拆 Linear”升级为“项目全生命周期怎么长期治理”的可复用资产，后续可直接用于：

1. 黄金坩埚三轨持续治理
2. 其他模块（导演、营销、分发）的结构梳理
3. 多项目并行时的统一管理口径

## 后续建议

下一窗口可以直接用该 Skill 在真实 Linear 盘子上执行一轮“盘点 -> 迁移草图 -> 批量落地”，建议顺序：

1. 先做对象盘点（Team/Project/Label/Parent Issue）
2. 再做迁移表（keep/rename/move/split/archive/create）
3. 最后批量执行，并把结果回写到 `PROJECT_STATUS` 与 `dev_logs`

## 本轮产物清单

- `.vibedir/skill_build/project-lifecycle-governance/SKILL.md`
- `.vibedir/skill_build/project-lifecycle-governance/references/project-lifecycle-playbook.md`
- `.vibedir/skill_build/project-lifecycle-governance/agents/openai.yaml`
- `.vibedir/skill_drafts/codex_ProjectLifecycleGovernance_20260314.md`
- `.vibedir/skill_registry.yml`
- `docs/dev_logs/2026-03-14_SD223_ProjectLifecycle_Governance_Skill.md`
