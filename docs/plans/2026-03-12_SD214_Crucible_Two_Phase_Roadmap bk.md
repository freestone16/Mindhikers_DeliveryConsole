# SD214 黄金坩埚两阶段实施方案

> 日期：2026-03-12
> 工作目录：`/Users/luzhoua/DeliveryConsole`
> 分支：`codex/sd208-golden-crucible`
> 状态：设计方案 / 待实施
> 作者：Codex（按 OldYang 协议落盘）
> 依据：
> - `docs/02_design/crucible/draft_crucible_v2_architecture.md`
> - `docs/02_design/crucible/interaction_contract.md`
> - `docs/dev_logs/2026-03-12_SD210_Crucible_Interaction_Contract_And_Bridge.md`
> - `docs/plans/2026-03-12_SD210_Crucible_Current_Workplan.md`
> - 当前代码现场 `server/crucible.ts / server/chat.ts / src/components/crucible/CrucibleWorkspaceView.tsx`

## 1. 本方案要解决什么

你现在要的不是单点修补，而是一个明确的两阶段路线：

1. **Phase 1**：尽快收口当前已经完成的大部分设计，让“苏格拉底主链”先稳定、能用、可验证。
2. **Phase 2**：把“圆桌系统作为前置结构”设计成可以工程落地的增量架构，而不是停留在概念蓝图。

这里最关键的一条纪律是：

**第二阶段不能反向拖垮第一阶段。**

也就是说，圆桌系统必须作为前置层增量接入，而不是现在就把已经在运行的 `Socrates -> Bridge -> UI` 主链重新打散。

---

## 2. 当前现场的正确判断

## 2.1 已经成立的东西

结合当前文档与代码，黄金坩埚当前已经成立四个真实基础：

1. **前后台角色边界已成立**
   - 前台仍然是用户 / 老张 / 老卢。
   - `GoldenMetallurgist` 仍然是后台导演，不是前台角色。
2. **对话-呈现协议已成立**
   - `interaction_contract.md` 已经把“老师和黑板”原则写成红线。
   - 右侧只负责对话，中屏只负责呈现。
3. **Bridge 中间层已开始成立**
   - `server/crucible.ts` 已从单纯 `cards` 输出切向 `dialogue + presentables + turn_log`。
4. **SoulProfile / SoulRegistry 路线已开头**
   - 默认灵魂实例与 registry 已有草案和结构脚手架。

## 2.2 当前还没成立的东西

当前最不该误判的是下面几件事：

1. 苏格拉底主链还没有完全收口成“稳定产品”
   - 中屏仍残留明显“卡片面板感”
   - 前端状态命名仍残留 `clarificationCards` 等旧心智
   - 后端仍保留兼容字段
2. 圆桌系统还没有工程化入口
   - `draft_crucible_v2_architecture.md` 给的是战略蓝图，不是可直接开工的模块切片
3. 黄金冶炼师还不是完整 orchestration policy
   - 当前更接近 prompt + bridge 的混合过渡态

## 2.3 结论

所以现在最合理的推进方式不是二选一，而是：

- **先收 Phase 1**
- **再基于 Phase 1 的稳定接口做 Phase 2**

否则会出现三种典型事故：

1. 圆桌还没接稳，右侧与中屏又重新重复
2. 旧 `cards` 心智换壳后继续活着
3. 圆桌的多人发散输出无法接进稳定的黑板协议

---

## 3. 总体架构判断

黄金坩埚后续应明确为一个“双阶段引擎”：

### 阶段 A：前置圆桌发散层

目标：

- 发散
- 造冲突
- 探矿
- 找“刺”

工作模式：

- `Roundtable`
- 多代表人物短时高压对抗
- 主持人压缩争议结构

产物：

- `刺点（Spike）`
- `争议地图`
- `候选命题`

### 阶段 B：苏格拉底收敛层

目标：

- 澄清
- 施压
- 重构
- 结晶

工作模式：

- `Socrates + 默认双灵魂`
- 单焦点深挖
- `Researcher / FactChecker / ThesisWriter` 按需挂载

产物：

- `Mini 论文`
- `脱水大纲`
- `结构化蓝图`

### 两层关系

正确关系是：

`Roundtable (找刺) -> Spike Selection -> Socrates (死磕提炼) -> Thesis/Blueprint`

不是：

`Roundtable + Socrates` 混在同一个回合里同时说话

---

## 4. Phase 1：苏格拉底主链收口方案

## 4.1 Phase 1 目标

把当前已经基本成形的 `Socrates -> Bridge -> UI` 主链收成一个可稳定使用、可回归、可继续扩展的中间态。

一句话：

**先把“老师和黑板”修成钢结构。**

## 4.2 Phase 1 的核心原则

1. 不引入圆桌多人前台
2. 不引入新的主流程状态机
3. 不让中屏继续承担问答职责
4. 不让启发式 `hostRouting` 回到主链位置
5. 一切围绕 `dialogue + presentables + turn_log`

## 4.3 Phase 1 需要完成的 5 件事

### A. 中屏黑板主视图收口

目标：

- 中屏看起来像黑板
- 不像第二套答题区
- 不像卡片面板

要点：

1. 继续压缩中屏说明区
2. 强化 `activePresentable` 的单主视图感
3. 降低 `reference` 的卡片段落感
4. 左侧目录只做索引，不做流程控制

### B. 前端状态去 `cards` 心智

目标：

- 前端内部不再把主流程理解成“问题卡生成与回答”

要点：

1. `clarificationCards / generatedCards` 退出主抽象
2. 建立真正的：
   - `CrucibleDialogue`
   - `CruciblePresentable`
   - `CrucibleTurnPayload`
3. 快照结构围绕黑板内容恢复，而不是围绕答题状态恢复

### C. 后端 Bridge 协议收口

目标：

- `server/crucible.ts` 输出真正稳定的 bridge 协议

要点：

1. 主输出收紧到：
   - `dialogue`
   - `presentables`
   - `source`
   - `warning`
   - `searchRequested / searchConnected`
2. `speaker / reflection / focus` 兼容字段进入明确淘汰路径
3. `turn_log` 继续提升可读性与可回放性

### D. turn log 成为真实中间态

目标：

- 让后续 roundtable 和导演调度都能复用当前中间层，而不是重造日志格式

每轮至少稳定记录：

1. 用户该轮输入
2. `skillOutput`
3. `bridgeOutput.dialogue`
4. `bridgeOutput.presentables`
5. `phase`
6. `source`

### E. 建立最小可用验收

目标：

- 不再靠“感觉像对了”

至少要验证：

1. 首问后右侧继续推进，中屏只上黑板内容
2. 长追问不原样复制到中屏
3. fallback 时中屏不退化成右侧镜像
4. 切换目录只切黑板，不切对话主流程

## 4.4 Phase 1 的工程边界

本阶段不做：

1. 圆桌多人系统
2. 多代表动态挂载
3. 主动 / 被动搜索真链路
4. 论文产出闭环
5. 多工具导演编排

## 4.5 Phase 1 的完成标准

达到以下条件，Phase 1 才算结束：

1. 中屏明显摆脱“第二套问答区”
2. 前端主状态不再以 `cards` 为中心
3. 后端 bridge 输出成为稳定主协议
4. `turn_log` 能稳定回放一轮的 skill/bridge/UI 分层
5. 测试与最小人工验收通过

---

## 5. Phase 2：圆桌系统前置层方案

## 5.1 Phase 2 的定位

圆桌系统不是来替代苏格拉底系统，而是作为其前置结构层。

它的职责只有一个：

**在进入死磕前，先用多人高压冲突把“值得死磕的刺”找出来。**

所以它必须是“前置层”，而不是“并列层”。

## 5.2 圆桌系统的产品职责

圆桌前置层应负责：

1. 生成或加载 3 位代表人物
2. 生成 1 位主持人
3. 围绕一个议题进行限轮对抗
4. 每轮把争议压缩成中屏认知地图
5. 在若干轮后输出：
   - `spikes`
   - `controversies`
   - `candidate_theses`
6. 允许用户显式“选刺”，进入 Socrates

圆桌前置层不负责：

1. 直接产出论文
2. 长时间深挖同一焦点
3. 担任下游写作者

## 5.3 圆桌系统的工程形态

建议不要一上来做“自由多人群聊”。

正确工程形态应是：

### A. Roundtable Runtime

负责：

- 维护回合
- 维护代表人物清单
- 维护主持人
- 维护当前争议主题

### B. Roundtable Bridge

负责把圆桌语义输出压成两类：

1. `dialogue`
   - 右侧多人短回合对话
2. `presentables`
   - 中屏认知地图、争议四象限、典型对立结构

### C. Spike Extraction Layer

这是圆桌与苏格拉底之间的硬接口。

它输出的不是一段话，而是结构化对象，例如：

```json
{
  "spikes": [
    {
      "id": "spike_01",
      "title": "AI 时代内容质量塌陷的真正问题不是工具，而是未经锻打的判断",
      "why_it_matters": "它能把“AI 焦虑”从工具讨论转向判断力讨论",
      "supporting_conflicts": [
        "效率提升 vs 判断退化",
        "先发再改 vs 先锻打后发布"
      ]
    }
  ]
}
```

后续进入 Socrates 时，只带一个 `selected_spike`，不把整场圆桌原文全部灌进去。

## 5.4 圆桌系统的数据结构建议

建议新增 4 类结构：

### 1. `RoundtablePersona`

不是完整 soul，而是一次发散期的临时代表人物。

字段建议：

- `id`
- `display_name`
- `stance`
- `archetype`
- `provocation_style`
- `forbidden_moves`

### 2. `RoundtableTurn`

每轮记录：

- `question_under_discussion`
- `utterances`
- `moderator_summary`
- `candidate_spikes`

### 3. `CognitiveMapPresentable`

给中屏黑板消费：

- `type`
- `title`
- `summary`
- `content`
- `topology_kind`

### 4. `SpikeCandidate`

这是后续进入苏格拉底阶段的唯一合法输入对象。

## 5.5 圆桌系统的 UI 原则

要和当前黑板协议完全兼容。

正确呈现：

1. 右侧：多人短回合辩论
2. 中屏：主持人每轮刷新的认知地图
3. 左侧：只做索引，不变成第二套流程控制器

禁止：

1. 中屏堆多人长文本
2. 右侧和中屏重复同一句话
3. 圆桌模式重新走 `hostRouting` 启发式猜分流

## 5.6 圆桌到苏格拉底的切换规则

这是 Phase 2 最关键的工程点。

建议切换必须显式发生：

### 入口条件

满足任一即可：

1. 用户手动点“选这根刺，进入死磕”
2. 主持人连续两轮都把争议收敛到同一 spike
3. 圆桌轮数达到上限

### 切换动作

系统不传整场圆桌 raw transcript，而只传：

1. `selected_spike`
2. `controversy_summary`
3. `key_oppositions`
4. `seed_evidence`

### 切换后

Socrates 阶段重新回到当前稳定的：

- 默认双灵魂
- 单焦点深挖
- `dialogue + presentables + turn_log`

## 5.7 Phase 2 的推荐实施顺序

### Step 1：只做结构，不做真多人

先定义：

- `RoundtablePersona`
- `RoundtableTurn`
- `SpikeCandidate`
- `RoundtableBridgeOutput`

### Step 2：做主持人与黑板

先让“主持人 + 中屏认知地图”成立，再引入多代表人物。

### Step 3：做 3 人固定圆桌 MVP

先固定 3 位代表 + 1 位主持人，不做动态自动生成。

### Step 4：做 spike 选取与切换

让用户从圆桌顺滑进入 Socrates。

### Step 5：最后再谈动态人格生成

只有当固定 roundtable MVP 稳定后，才考虑：

- 动态 archetype 组合
- 哲学家 / 科学家 profile 挂载
- 多 Agent 物理隔离

---

## 6. 两阶段之间的接口约束

这是全方案里最重要的一部分。

Phase 2 只有在下面这个条件下才能落地：

**它必须复用 Phase 1 已经稳定的黑板协议，而不是重新发明一套 UI 输出模型。**

因此，强制约束如下：

1. Roundtable 也必须输出 `dialogue + presentables`
2. Roundtable 也必须有自己的 `turn_log`
3. Spike Extraction 必须输出结构化对象，而不是原始长文
4. 切入 Socrates 时，输入对象必须比圆桌 transcript 更小、更净、更聚焦

换句话说：

- Phase 1 修的是“通用黑板底盘”
- Phase 2 只是给这个底盘增加一个“发散前置发动机”

---

## 7. 我的设计判断

如果只看战略，我认同最新 v2 草案：

- 圆桌系统确实应该成为前置结构
- 苏格拉底系统应该成为后置提炼结构

但如果看工程顺序，我反而更保守：

### 我支持的顺序

1. 先完成 Phase 1
2. 再启动 Phase 2

### 我不支持的顺序

1. 现在就把圆桌系统和苏格拉底系统同时重写
2. 在当前 bridge 还不稳定时引入多人前台
3. 在旧 `cards` 心智尚未退出时上 roundtable

原因很简单：

**没有稳定的 bridge 和黑板协议，圆桌只会把现有混乱放大。**

---

## 8. 执行建议

现在建议的执行方式是：

### 第一刀

完全按 `2026-03-12_SD210_Crucible_Current_Workplan.md` 收口当前苏格拉底主链。

### 第二刀

在此基础上单开一份 `Roundtable MVP` 实施方案，范围只做到：

1. 固定 3 代表 + 1 主持人
2. 每轮中屏认知地图
3. spike 结构化提取
4. 进入 Socrates 的切换按钮

### 第三刀

再考虑：

1. 圆桌 persona registry
2. 动态哲学家 / 科学家 archetype
3. 多 Agent 物理隔离

---

## 9. 一句话结论

黄金坩埚的正确路线不是“要不要圆桌”，而是：

**先把苏格拉底主链收成稳定底盘，再让圆桌系统以前置发散层的身份挂上去。**

Phase 1 解决“能用、稳定、可回归”。

Phase 2 解决“前置发散、找刺、结构升级”。
