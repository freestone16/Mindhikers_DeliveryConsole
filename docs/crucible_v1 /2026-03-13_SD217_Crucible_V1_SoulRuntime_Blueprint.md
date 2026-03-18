# SD217 黄金坩埚 v1 Soul Runtime 收束方案

> 日期：2026-03-13
> 工作目录：`/Users/luzhoua/DeliveryConsole`
> 分支：`codex/sd208-golden-crucible`
> 状态：方案定稿，等待人工审核
> 作者：Codex（按 OldYang 协议落盘）

## 1. 本轮定稿目标

本轮不进入实现，不继续修 UI 细节，而是把黄金坩埚第一阶段的技术路线彻底收束。

这份文档只回答四件事：

1. 黄金坩埚 v1 的骨架到底是什么
2. 你已经拍板的 1-7 选择如何落成工程边界
3. `7 = B-lite` 到底意味着什么，不意味着什么
4. 第一阶段哪些必须做，哪些明确延后

---

## 2. 本轮已拍板的 1-7 选择

### 2.1 已确认的路线

1. `1 = B`
   - 必须保留“灵魂插槽”的世界观，不砍成只有抽象状态机的纯工程系统。
2. `2 = B`
   - 前台保留 `老卢 / 老张` 双人格切换，但严格执行“一轮一人”。
3. `3 = A+`
   - `Socrates` 默认只做后台方法裁判。
   - 未来可保留极少数 critical 场景或彩蛋式显形接口，但不作为常规前台角色。
4. `4 = B`
   - 第一阶段就按多方法插件卡槽设计，但真正启用的后台方法插件只有 `Socrates`。
5. `5 = B`
   - 从 day1 就立住 `Soul Core / Soul Session / Soul Evidence / Soul Delta` 四类对象边界。
6. `6 = B`
   - 模式借鉴外部成熟体系，但运行时核心坚持自研窄腰，不被任何框架绑死。
7. `7 = B-lite`
   - 第一阶段就立住最小演化闭环，但演化不是 v1 主战场，不做自动人格漂移。

### 2.2 这组选择的总精神

这组选择的本质不是“折中”，而是：

- 保住长期愿景
- 收住第一阶段复杂度
- 让系统从 day1 就具备升级接口
- 但不让“演化”反过来拖垮 v1 的聊天质量与运行时稳定性

换句话说：

**v1 要做成一个可运行、可升级、可审计的人格化讨论基座，而不是一套概念完美但难以稳定运行的多 Agent 宇宙。**

---

## 3. 黄金坩埚 v1 的产品本质

黄金坩埚 v1 不是“多角色聊天玩具”，也不是“群聊式 Agent 舞台剧”。

它的正确定位应被收窄为：

**一个以 chatbox 为主战场、以中屏单份 artifact-lite / 单针脚为公屏、以后台方法裁判维持讨论质量的人格化讨论运行时。**

第一阶段只做三层：

1. **前台人格层**
   - 用户
   - 老张
   - 老卢
2. **后台方法层**
   - `SocratesMethodPlugin`
3. **后台编排层**
   - `CrucibleTurnDirector`
   - `Bridge`

中屏不是第二主战场。

中屏在 v1 的唯一职责是：

- 保留一份最值得挂住的公屏内容
- 优先允许以 `artifact-lite` 形态承载 topic lock / 边界澄清 / round summary
- 不抢 chatbox 主线
- 不承担复杂图表或第二叙事通道

---

## 4. 什么是 Soul Runtime

`Soul Runtime` 不是人格文档，也不是底层大模型。

它是“让人格真正跑起来”的执行层。

更具体地说，它负责：

1. 读取 `Soul Core`
2. 为该人格挂载独立 `Soul Session`
3. 在当前回合中执行该人格的私有思考
4. 生成候选前台回复、候选追问、候选中屏针脚
5. 将结果交给 `Bridge / Director`
6. 写入本轮日志与证据
7. 为未来的 `Soul Delta` 提供证据输入

最简化的理解可以是：

- `Soul Core` 是人格母体
- `Soul Session` 是当前脑内状态
- `Model Adapter` 是推理燃料
- `Soul Runtime` 是人格发动机

---

## 5. 第一阶段的总架构选择

## 5.1 宿主形态

第一阶段采用：

- `TypeScript + Node`
- `Modular Monolith`
- 单仓单后端运行时

不采用：

- 微服务
- 多进程自由群聊
- 重度依赖 preview 状态的外部 Agent 框架

原因很明确：

1. 当前真正的瓶颈不是部署方式，而是人格、方法、状态、升级接口没有真正解耦
2. 第一阶段需要极强的可观测、可回放、可调试能力
3. 过早拆服务会显著放大复杂度，而不会直接提升讨论质量

## 5.2 编排范式

第一阶段采用：

- `Orchestrator + Stateful Handoff`

不采用：

- `Group Chat First`
- 多人格自由轮流上台

v1 的核心回合协议应固定为：

1. 用户输入进入 `CrucibleTurnDirector`
2. `TurnDirector` 决定本轮阶段、目标与参与者
3. 老张独立运行一轮私有思考
4. 老卢独立运行一轮私有思考
5. `SocratesMethodPlugin` 审查本轮方法质量
6. `Bridge` 选择唯一前台发言人
7. 中屏只保一条针脚
8. 本轮回放信息写入日志与证据池

---

## 6. 第一阶段必须立住的四类对象

## 6.1 Soul Core

相对稳定，慢变。

它承载：

- 价值排序
- 红线
- 审美偏好
- 判断偏好
- 表达风格
- 角色使命
- 方法偏好
- 失败信号

它不承载：

- 当前轮次状态
- 临时推理结果
- 自动演化结果

## 6.2 Soul Session

这是人格在当前会话中的独立上下文。

建议第一阶段最小字段：

- `session_id`
- `soul_id`
- `project_id`
- `script_path`
- `topic_id`
- `working_goal`
- `private_notes`
- `open_loops`
- `recent_turn_summary`
- `current_intent`
- `updated_at`

它的意义是：

让老张、老卢不再共用一个混合脑，而是各自持有自己正在追什么、还没追完什么、这轮要怎么推进。

## 6.3 Soul Evidence

这是证据池，不是人格本身。

第一阶段应允许沉淀：

- 高质量历史轮次
- 用户明确认可的表达
- 用户明确否决的表达
- 保留下来的中屏针脚
- 人工修改痕迹
- 方法裁判意见
- 失败案例

它回答的问题是：

**为什么系统认为这个人格应该更像这样。**

## 6.4 Soul Delta

这是演化提案，不是自动升级。

第一阶段允许存在最小字段：

- `delta_id`
- `soul_id`
- `proposal_type`
- `candidate_change`
- `evidence_refs`
- `confidence`
- `risk_level`
- `status`
- `review_notes`

`Soul Delta` 的纪律必须写死：

1. 模型不能直接改 `Soul Core`
2. 外部分析器只能读 `Soul Evidence`
3. 外部分析器只能产出 `Soul Delta`
4. `Soul Delta` 必须人工审核后才可能形成新版本 `Soul Core`

---

## 7. `7 = B-lite` 的真实含义

这是本轮最重要的收束点。

`7 = B-lite` 不等于：

- 第一阶段就做完整人格演化引擎
- 第一阶段就放开自动人格升级
- 第一阶段就让系统自己重写 `Soul Core`
- 第一阶段就把大量工程精力投入到 Delta 批量生成

`7 = B-lite` 真正意味着：

### 7.1 先把“成长的器官”长出来

第一阶段就必须把这些接口和对象边界立住：

- `Soul Evidence` 的存储位
- `Soul Delta` 的对象定义
- `Human Approval` 的接口槽位
- `Soul Version` 的演化路径

这样半年后模型更强、外部人格分析工具更成熟时，不需要推倒系统骨架。

### 7.2 先让 Evidence 自动沉淀

第一阶段应自动沉淀但不过度复杂化的内容包括：

- 本轮谁参与了
- 谁最终上前台
- 为什么选他
- Socrates 提了什么方法审查意见
- 用户是否明显认可或抗拒这轮表达
- 哪条中屏针脚被保留

### 7.3 Delta 可以最小存在，但不强制高频运行

第一阶段允许：

- 在关键轮次手动触发 Delta 提案
- 在离线评估时生成少量 Delta 草案

第一阶段不要求：

- 每轮都生成 Delta
- 实时在线跑复杂人格蒸馏
- 自动批准 Delta

### 7.4 v1 主战场仍然是 chat 质量

`B-lite` 的真正边界是：

**v1 的主战场仍是对话质量、人格稳定性、上下文独立性与运行时健壮性。**

演化机制在第一阶段只能是“基础设施先打桩”，不能反客为主。

---

## 8. 第一阶段的插件策略

## 8.1 前台人格插件

第一阶段只有两个可前台发言的人格插件：

- `OldZhangSoul`
- `OldLuSoul`

它们都应具备：

- 独立 `Soul Core`
- 独立 `Soul Session`
- 独立候选回复
- 独立候选中屏针脚

## 8.2 后台方法插件

第一阶段的后台方法插件只真正启用一个：

- `SocratesMethodPlugin`

它的职责不是替前台说话，而是：

1. 检查前台候选回复是否真的贴着用户刚才那句
2. 检查是否追到了概念、前提、边界
3. 给出下一问候选
4. 指出偷换概念、空话、滑走风险

默认不前台显形。

未来可以保留接口，允许在极少数 critical 场景下受控露面，但这不属于 v1 主线。

## 8.3 未来插件卡槽

尽管 v1 只启用 `Socrates`，但接口设计必须允许未来加入：

- `ScientificReasoningPlugin`
- `PsychologyLensPlugin`
- `BiasAuditPlugin`
- `ResearcherPlugin`
- `FactCheckerPlugin`

这就是“世界观保留，但实现收紧”的关键。

---

## 9. 第一阶段的技术选型

## 9.1 运行时核心

建议：

- 自研窄腰 `Soul Runtime`
- 模式借鉴外部成熟体系
- 运行时核心不绑定单一框架

原则总结为：

**接口自研，模式借鉴，运行时自控，拒绝框架绑死。**

## 9.2 模型层

建议抽象统一 `Model Adapter`，至少支持：

- `generate()`
- `stream()`
- `structuredGenerate()`
- `supportsJsonMode()`
- `supportsToolCalling()`
- `supportsLongContext()`

这样季度升级时：

- 换模型
- 提升推理档位
- 做 A/B 对比

都不需要改人格协议。

## 9.3 存储层

第一阶段建议：

- `SQLite + Files`

其中：

- 结构化状态放数据库
- 长文本与快照放文件目录

同时从第一阶段就定义 repository 抽象：

- `SoulCoreRepository`
- `SoulSessionRepository`
- `SoulEvidenceRepository`
- `SoulDeltaRepository`
- `TurnLogRepository`

这样本地与云端将来可以共用同一套 runtime 接口。

## 9.4 观测层

第一阶段必须上：

- `trace_id`
- 每轮 timing
- 参与的 soul / plugin
- 前台发言人决策原因
- 方法裁判意见
- fallback 情况
- 中屏针脚选择原因

没有这层，就没有季度升级后的效果比较。

---

## 10. 第一阶段的目录与模块边界建议

建议新增这些逻辑目录：

- `server/soul-runtime/`
- `server/soul-plugins/`
- `server/soul-repositories/`
- `server/model-adapters/`
- `server/evals/`

建议的角色边界：

1. `chat.ts`
   - 只处理入口协议与上下文挂接
2. `CrucibleTurnDirector`
   - 只处理回合编排，不写人格内容
3. `Soul Runtime`
   - 只跑人格与方法插件
4. `Bridge`
   - 只做前台选人和中屏单针脚选择
5. `Repositories`
   - 只做状态读写

明确禁止：

- 在宿主层继续堆积复杂 prompt 逻辑
- 让 Director 同时兼做人格作者
- 让中屏变成第二主战场

---

## 11. 第一阶段必须做、可以延后、不做

## 11.1 v1 Must-have

1. 老张、老卢独立 `Soul Session`
2. 前台严格“一轮一人”
3. `SocratesMethodPlugin` 后台化
4. 中屏只保一份公屏内容，优先支持 `artifact-lite`
5. `Soul Core / Session / Evidence / Delta` 边界立住
6. `Evidence` 自动沉淀最小闭环
7. `Model Adapter` 基础抽象
8. `Turn Log / Trace / Replay` 最小观测能力
9. 等待提示改为阶段化系统状态
10. chatbox 具备“导向中屏 artifact”的引导语

## 11.2 v1.1 可延后

1. 手动触发的 Delta 提案生成
2. 更精细的 `Soul Version` 管理
3. `Researcher / FactChecker` 真正接入后台主链
4. 更系统的离线评测 harness
5. 更丰富的中屏呈现形式

## 11.3 明确不属于 v1

1. 前台群聊式多人格热闹互动
2. 自动人格改写
3. 多方法插件同时在线竞争
4. 复杂图表化中屏
5. 微服务拆分
6. 完整自主型多 Agent 社会模拟

---

## 12. 第一阶段的成功标准

第一阶段不是看“概念是否壮观”，而是看这五件事是否成立：

1. 老张、老卢说话明显更像两个人，而不是一个 prompt 在换名字
2. 对话链条更完整，少空话、少滑走、少半句摘要
3. `Socrates` 虽不露面，但方法张力明显更强
4. 每轮结果可回放、可比较、可审计
5. 季度升级时，模型升级与人格升级可以拆开观察

如果这五条成立，`Soul Runtime` 才算真的开始长出来。

---

## 13. 最终结论

黄金坩埚 v1 的正确路线不是：

- 把世界观砍成纯工具系统
- 也不是把第一阶段做成宏大的多 Agent 宇宙

正确路线应是：

**保住灵魂插槽世界观，收紧为一个可运行、可升级、可审计的窄腰人格运行时。**

因此 v1 的一句话定义应当是：

**以前台双人格、后台单方法裁判、最小演化闭环为核心的人格化讨论基座。**

其中：

- `老卢 / 老张` 是前台人格
- `Socrates` 是后台方法裁判
- `Soul Runtime` 是运行时发动机
- `Evidence / Delta` 是未来季度升级的根接口

这条线既保住了长期愿景，也把第一阶段的工程复杂度控制在可交付范围内。
