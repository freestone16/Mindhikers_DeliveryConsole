# SD220 黄金坩埚三轨并行开发治理方案

> 日期：2026-03-14
> 工作目录：`/Users/luzhoua/DeliveryConsole`
> 分支：`codex/sd208-golden-crucible`
> 状态：方案草案，等待人工审核
> 作者：Codex（按 OldYang 协议落盘）

## 1. 本稿目的

这份文档不进入实现，只回答黄金坩埚未来三阶段如何并行推进、如何共享内核、如何分轨验收。

本稿要解决四个问题：

1. `crucible / crucible-0 / crucible-plus` 三条轨道分别是什么
2. 哪些能力必须进入共享内核，哪些只能留在差异轨道
3. 三个阶段如何衔接，而不是互相覆盖或互相污染
4. 后续如何把三阶段扔进 Linear，形成可执行的研发管理结构

---

## 2. 总判断

黄金坩埚的三阶段路线是合理的，但要先把管理层级摆正。

本轮修正后的正确结构应是：

**`Golden Crucible` 是更上一级的计划容器；`Code Nemesis / Crucible-0 Phase 2 / Crucible-Plus Phase 3` 是它下面并列的三个项目。**

其中：

1. `Code Nemesis`
   - 当前最紧急、希望尽快上线的一周级阶段性项目
   - 内部可以同时包含网站开发、黄金坩埚一期产品开发、文案与上线配套动作
2. `Crucible-0 Phase 2`
   - 第二阶段项目，负责前置圆桌篇
3. `Crucible-Plus Phase 3`
   - 第三阶段项目，负责 Soul Runtime 完整体

共享内核与评测不是单独的时间阶段，而是：

- 上述三个项目的横向支撑线
- 可拆成单独支撑项目，或在每个项目内以共享父任务方式管理

关键纪律是：

- 共享内核只能有一套
- 差异轨道只承载真正不同的 runtime / policy
- 阶段衔接依赖合同挂接，不依赖大面积互相覆盖式 merge

---

## 3. 三条项目轨道的正确定位

## 3.1 `Code Nemesis`

这不是黄金坩埚的总容器，而是 `Golden Crucible` 下面当前最紧急的阶段性项目。

它的职责是：

- 在最短时间内把可上线内容凑成闭环
- 内部同时容纳：
  - 网站开发相关动作
  - 黄金坩埚一期产品动作
  - 文案与上线配套动作
- 其中文黄金坩埚相关的部分，对应 `Crucible Phase 1`

它不是：

- 黄金坩埚的唯一总项目
- 第二阶段与第三阶段的总容器
- 完整的长期架构母体

## 3.2 `Crucible-0 Phase 2`

`crucible-0` 不是废案，也不是更老版本，而是“前置篇、起源篇、导火索篇”。

它的职责是：

- 在正式进入 `crucible` 之前，先做议题发酵
- 暴露冲突、拉出对立面、加压命题边界
- 给正式坩埚提供更好的进入点

它在管理结构中的位置是：

**与 `Code Nemesis` 并列的第二阶段项目。**

但在产品结构上的位置是：

**正式黄金坩埚前面的一段 prelude runtime。**

## 3.3 `Crucible-Plus Phase 3`

`crucible-plus` 是第三阶段的完成体方向。

它的职责是：

- 落地 Soul Runtime
- 让老张 / 老卢拥有独立 session
- 把 `Socrates` 变成后台方法裁判插件
- 立住 `Soul Core / Session / Evidence / Delta`
- 为未来更多人格 / 方法插件开放卡槽

它在管理结构中的位置是：

**与 `Code Nemesis`、`Crucible-0 Phase 2` 并列的第三阶段项目。**

它的正确并入方式不是“整个替换产品 UI”，而是：

**在稳定产品外壳下逐步替换底层 runtime。**

---

## 4. 共享内核与差异轨道

## 4.1 为什么必须做“共享内核 + 差异轨道”

如果把三条轨道做成长期复制的整套应用，会立刻遇到：

1. bug 修三遍
2. 共享文件频繁冲突
3. 合并时接不回来
4. 测试矩阵膨胀
5. 最终失去单一事实源

所以这套设计的核心不是“把项目拆成三份”，而是：

**把不会因阶段不同而改变的部分统一沉到底座，把真正不同的 runtime / policy 独立放在轨道层。**

---

## 5. 共享内核：明确边界

以下内容应被视为共享内核，不允许三轨各写各的实现语义。

## 5.1 `chat message contract`

这是 chatbox 消息对象的统一合同。

最小职责：

- 统一用户消息、人格消息、系统提示的结构
- 统一作者信息、元信息、时间戳
- 统一前端渲染所需字段

为什么必须共享：

- 如果三轨消息结构不同，chatbox 会裂成三套渲染逻辑
- 阶段切换时前端会反复返工

## 5.2 `board pin contract`

这是中屏单针脚对象的统一合同。

最小职责：

- 统一标题、摘要、正文、类型、缘由
- 保证 `crucible / 0 / plus` 输出给中屏的是同一种数据形状

为什么必须共享：

- 中屏 UI 在三轨中应该是稳定壳体
- 差异只应发生在“内容如何产生”，而不是“内容对象长什么样”

## 5.3 `soul object schema`

这是人格对象的统一合同。

至少应统一：

- `Soul Core`
- `Soul Session`
- `Soul Evidence`
- `Soul Delta`

为什么必须共享：

- 这是未来人格插槽化的根
- 如果三轨各自定义自己的 soul 结构，`plus` 根本接不回来

## 5.4 `turn log / trace contract`

这是每轮讨论如何记账的统一合同。

最小职责：

- 统一 `trace_id`
- 统一 timing
- 统一参与者列表
- 统一前台发言人选择结果
- 统一方法裁判意见
- 统一 fallback / error 记录

为什么必须共享：

- 没有这层，三阶段无法横向比较
- 后续做阶段验收、模型升级、人格升级时没有共同语言

## 5.5 `model adapter`

这是大模型调用的统一插座。

最小职责：

- 统一 `generate / stream / structuredGenerate`
- 暴露模型能力标签
- 屏蔽底层供应商差异

为什么必须共享：

- 模型季度升级时不应带来三轨业务层重写
- 否则“模型升级与人格升级解耦”无法成立

## 5.6 `repository interface`

这是状态存储的统一插座。

最小职责：

- 统一 session、evidence、delta、turn log 的读写接口
- 屏蔽本地 SQLite 与未来云端存储差异

为什么必须共享：

- 本地与云端都要跑
- 三轨都需要持续状态，但不应各自绑死底层存储

## 5.7 `plugin interface`

这部分虽然上轮没有单独列出，但本轮建议正式纳入共享内核。

至少应统一：

- `SoulPlugin`
- `MethodPlugin`

为什么必须共享：

- `crucible-plus` 的可插拔未来必须回流到内核
- `crucible` 和 `crucible-0` 即使先只用最小版，也应吃同一接口

## 5.8 `director / bridge outcome contract`

这是编排器与前台收束层的统一输出合同。

至少应统一：

- `TurnPlan`
- `MethodReview`
- `ForegroundTurn`
- `TurnOutcome`

为什么必须共享：

- 三轨内部怎么编排可以不同
- 但对 UI 与日志的最终结果必须同口径

## 5.9 `eval harness`

这也是共享内核的一部分，而不是“以后再补的工具”。

最小职责：

- 统一基准 case
- 统一对话质量检查点
- 统一阶段对比与回归验收口径

为什么必须共享：

- 你不是只要三个版本都能跑，而是要知道哪个阶段更强、强在哪里

## 5.10 `UI shell`

注意，这里说的不是全部 UI，而是产品外壳与宿主壳体。

应尽量共享：

- chatbox 基本框架
- 中屏挂载位
- 左栏目录框架
- 项目 / 文稿 / 设置入口

为什么必须共享：

- 阶段升级的重点是 runtime 更强，而不是每一阶段重做一套界面系统

---

## 6. 差异轨道：明确边界

以下内容可以留在各自轨道内独立演进。

## 6.1 `crucible` 差异层

允许独立的部分：

- 当前主链的 turn policy
- 当前 chatbox 节奏
- 当前最小中屏针脚生成逻辑
- 当前 `Socrates` 的弱方法挂接方式

它的目标是：

- 先稳定上线
- 先把黄金坩埚跑成一个可用产品

## 6.2 `crucible-0` 差异层

允许独立的部分：

- 前置圆桌讨论 policy
- 命题预热与冲突暴露逻辑
- 预热输出对象到正式坩埚的转接逻辑

它的目标是：

- 提升正式坩埚的进入质量
- 让用户在正式进入深度对话前，先获得更有张力的起点

## 6.3 `crucible-plus` 差异层

允许独立的部分：

- Soul Runtime
- 独立 session 管理
- `SocratesMethodPlugin` 强方法裁判
- `Soul Evidence / Delta` 最小闭环
- 新人格 / 新方法卡槽化

它的目标是：

- 把当前产品升级成真正的人格化讨论 runtime

---

## 7. 三项目如何衔接

## 7.1 第一阶段：`Code Nemesis` 内完成 `Crucible Phase 1`

目标：

- 在 `Code Nemesis` 项目内，先把一期主线闭环凑出来并上线
- 先收真实使用反馈
- 建立基础 trace / replay / eval

第一阶段验收分两类：

### 合同验收

- chat message contract 稳定
- board pin contract 稳定
- trace contract 稳定
- model adapter 不炸

### 体验验收

- 老张 / 老卢人格差异成立
- 中屏只保一条
- chatbox 主链顺畅
- 响应速度与稳定性达标

## 7.2 第二阶段：`Crucible-0 Phase 2` 挂接

在管理上，它是独立项目；在产品上，它不是独立长期平行产品，而是：

**把 `crucible-0` 作为前置篇接入已上线的正式黄金坩埚。**

建议挂接流程：

1. 用户先进入 `crucible-0`
2. `crucible-0` 产出 `PreludeOutcome`
3. `PreludeOutcome` 被标准化后送入 `crucible`

第二阶段验收重点：

### 合同验收

- `PreludeOutcome -> CrucibleInput` 映射稳定
- 不破坏共享内核合同

### 体验验收

- 经过 `0` 预热后，正式坩埚的起点质量明显变好
- 不经过 `0` 和经过 `0` 的对话差异可感知、可记录、可比较

## 7.3 第三阶段：`Crucible-Plus Phase 3` 替换底层 runtime

第三阶段也不是整块换壳，而是：

**在共享 UI 壳和共享合同不大改的前提下，把底层 runtime 逐步切换到 `crucible-plus`。**

第三阶段验收重点：

### 合同验收

- 对外 `TurnOutcome` 不乱
- Session / Evidence / Delta 对象结构稳定

### 体验验收

- 对话质量比前两阶段更强
- 人格稳定性更强
- 方法裁判明显更有力
- 季度升级路径清晰成立

---

## 8. 阶段性工程规则

## 8.1 公共 bug fix 规则

所有属于共享内核的问题，优先修在共享层，再决定是否向三轨回流。

典型包括：

- chat message 合同问题
- board pin 合同问题
- trace 丢字段
- model adapter 异常处理
- repository 接口问题

禁止做法：

- 在某一轨道里偷偷修共享问题
- 让相同 bug 在三轨各长一个私有补丁

## 8.2 差异功能规则

每条轨道只准修改自己的 runtime / policy，不要改公共定义语义。

例如：

- `crucible-0` 改前置讨论 policy
- `crucible` 改当前主链 policy
- `crucible-plus` 改 soul runtime 与 plugin 机制

## 8.3 阶段挂接规则

阶段衔接优先采用：

- feature flag
- runtime selector
- 标准化输入输出合同

尽量避免：

- 大面积代码复制
- 一次性粗暴 merge
- 让某一阶段直接覆盖另一阶段的宿主壳体

---

## 9. 三轨目录与工作树建议

## 9.1 工作树建议

建议保持三条独立 worktree / branch：

- `codex/sd208-golden-crucible`
- `codex/crucible-0`
- `codex/crucible-plus`

所有 worktree 都应单独备案端口与运行身份，遵守项目宪法。

## 9.2 目录建议

共享内核建议逐步收敛到例如：

- `src/contracts/`
- `server/contracts/`
- `server/model-adapters/`
- `server/repositories/`
- `server/plugins/`
- `server/evals/`

差异轨道建议收敛到例如：

- `server/crucible-runtime/`
- `server/crucible-0-runtime/`
- `server/crucible-plus-runtime/`

重点不是文件名本身，而是：

- 公共契约不混进差异 policy
- 差异 runtime 不反向污染共享内核

---

## 10. Linear 管理建议

这部分是后续扔进 Linear 时建议采用的结构。

## 10.1 不建议的做法

不建议把三阶段直接扁平化成一堆散 issue。

那样很快会再次变乱，原因是：

- 共享内核任务与差异轨道任务混在一起
- 阶段验收点不清晰
- 上线任务和架构任务混在一起

## 10.2 建议的结构

建议按“两层容器 + 横向支撑线”来管理。

### 上一级：`Golden Crucible`

如果 Linear 支持 Initiative，建议把 `Golden Crucible` 设为 Initiative。

如果当前工作区暂时不打算上 Initiative，也至少要在概念上把它视作高于 `Code Nemesis` 的计划容器。

### 项目层：三个并列项目

1. `Code Nemesis`
2. `Crucible-0 Phase 2`
3. `Crucible-Plus Phase 3`

### 横向支撑线

横向支撑线不属于时间先后顺序，而是贯穿三个项目：

1. `Shared Kernel`
2. `Cross-Phase Eval Harness`

它们可以有两种落法：

1. 单独作为支撑项目
2. 作为 `Golden Crucible` 下的长期父任务，再把子任务分配到三个项目里

如果你现在想先求稳、先少开容器，我建议先用第二种。

## 10.3 任务切分原则

每个 issue 先判断归属：

1. 这是共享内核问题吗？
2. 这是某一轨道的 runtime / policy 问题吗？
3. 这是阶段验收任务吗？
4. 这是上线挂接任务吗？

不要再按“想到什么修什么”式命名。

---

## 11. 本轮建议的第一批 Linear 大项

如果下一步要整理进 Linear，建议先整理成下面这种结构：

### 计划容器

- `Golden Crucible`

### 并列项目

1. `Code Nemesis`
2. `Crucible-0 Phase 2`
3. `Crucible-Plus Phase 3`

### 横向大项

1. `Shared Kernel Contracts`
   - chat / board / turn / trace / plugin / repository 合同统一
2. `Cross-Phase Eval Harness`
   - 三项目共用的评测与回归基座

### `Code Nemesis` 内部建议的大父任务

1. `网站开发`
2. `黄金坩埚 Phase 1`
3. `文案与上线配套`

这时：

- `Code Nemesis` 是“短期紧急战役”
- `Crucible-0 / Plus` 是“后续并列项目”
- `Shared Kernel / Eval` 是“横向支撑线”

这样 Linear 才会从“模块平铺”变成“结构清楚”。

---

## 12. 最终结论

黄金坩埚三阶段路线是合理的，但管理层级必须摆正：

**`Golden Crucible` 在上，`Code Nemesis / Crucible-0 Phase 2 / Crucible-Plus Phase 3` 在下并列。**

其中：

- `Code Nemesis` 是短期紧急战役，其中包含 `Crucible Phase 1`
- `Crucible-0 Phase 2` 是第二阶段并列项目
- `Crucible-Plus Phase 3` 是第三阶段并列项目

工程正确路径仍然应是：

**共享内核 + 差异轨道 + 分阶段挂接上线。**

只要共享合同守住、差异轨道收清、验收规则明确，这三阶段不但不会拖慢进度，反而会让黄金坩埚的升级路径变得更清楚、更稳、更可管理。
