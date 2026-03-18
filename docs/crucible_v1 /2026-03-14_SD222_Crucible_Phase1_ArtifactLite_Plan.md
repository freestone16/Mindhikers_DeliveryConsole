# SD222 黄金坩埚 Phase 1 Artifact-Lite 中屏方案

> 日期：2026-03-14
> 工作目录：`/Users/luzhoua/DeliveryConsole`
> 分支：`codex/sd208-golden-crucible`
> 状态：方案草案，等待人工审核
> 作者：Codex（按 OldYang 协议落盘）

## 1. 本稿目的

这份文档专门回答黄金坩埚 `Phase 1` 如何吸收 Antigravity 中 Socrates 对话的 artifact 呈现经验。

目标不是照搬 Antigravity 外壳，而是把其中真正有价值的结构抽出来，落成黄金坩埚自己的 `Artifact-Lite` 协议。

本稿聚焦四件事：

1. 为什么 `Artifact-Lite` 应该纳入 `Phase 1`
2. `Artifact-Lite` 与当前“单针脚中屏”如何兼容
3. chatbox 的等待提示与引导话语应如何配合
4. 后续 Linear 在 `Crucible Phase 1-dev` 中应如何承接这条方案

---

## 2. 结论先行

Antigravity 中 Socrates 对话最值得借鉴的，不是 UI 皮相，而是这条关系：

- chat 负责推进过程
- 公屏 artifact 负责沉淀当前轮次的结构化结果
- 用户被明确引导去看 artifact，再继续下一轮

黄金坩埚 `Phase 1` 当前的中屏仍然偏“针脚摘要”，这不够。

因此建议：

**Phase 1 应把中屏从“单卡摘要”升级为“单份 Artifact-Lite 公屏”，但仍保持一次只挂一份。**

这意味着：

- 不是每轮都出 artifact
- 一旦该出，就优先出结构化 artifact，而不是伪图或半句摘要
- chatbox 需要明确承担“引导用户去看中屏 artifact”的职责

---

## 3. 为什么不能直接照搬 Antigravity artifact

原因不是方向不对，而是当前链路不同。

Antigravity 中当前参考形态更像：

- 真正运行 `Socrates` skill 的动作链
- skill 自然写出一份 artifact
- artifact 直接进入公屏

而黄金坩埚当前 `Phase 1` 还是：

- 后台导演 prompt 驱动
- `Socrates` 只作为方法摘要或方法裁判
- 中屏吃的是当前项目自己的 board/presentable 合同

因此 Phase 1 的正确做法不是“硬接 Antigravity artifact 系统”，而是：

**把 artifact 呈现逻辑收敛成黄金坩埚自己的 `Artifact-Lite` 合同。**

这既能借到效果，也不会让 `Socrates` 重新抢回前台。

---

## 4. `Artifact-Lite` 的定位

`Artifact-Lite` 是黄金坩埚 `Phase 1` 中屏的结构化文档块。

它不是：

- 图表生成器
- 多卡片拼盘
- 另一个 chatbox

它是：

**本轮自然生成、可直接阅读、可直接继续回应的结构化公屏内容。**

## 4.1 与当前单针脚原则的关系

当前原则是：

- 中屏只保一条

这个原则不改。

只需要把“一条”的含义从：

- 一张摘要卡

升级为：

- 一份结构化 artifact

也就是说：

**中屏一次仍然只有一个主要对象，但该对象可以是 `Artifact-Lite`。**

---

## 5. 哪些阶段适合产出 `Artifact-Lite`

并不是每一轮都该挂 artifact。

`Phase 1` 建议优先允许在下列阶段使用：

1. `topic_lock`
   - 例如：议题澄清、边界确认、关键问题列表
2. `boundary_clarification`
   - 例如：本轮讨论什么、不讨论什么
3. `round_summary`
   - 例如：本轮收束出的三点结论与下一步动作

不建议在每一轮碎回复都强制挂 artifact。

原则是：

- 该挂时就挂结构化 artifact
- 不该挂时宁可不挂
- 不再用“文字描述一张并不存在的图”去顶替

---

## 6. `Artifact-Lite` 的最小合同

建议 `Phase 1` 为中屏新增一种标准对象：

- `artifact-lite`

最小字段建议：

- `title`
- `stage`
- `lead`
- `sections`
- `nextActionHint`
- `source`

其中：

### `title`

如：

- `第 0 轮：议题锁定`
- `进入深度讨论前的 5 个澄清问题`

### `stage`

如：

- `topic_lock`
- `clarification`
- `summary`

### `lead`

一段很短的引导语，说明这份 artifact 的目的。

### `sections`

这是核心，允许结构化分段。

每段建议最小字段：

- `heading`
- `items`

例如：

- `议题澄清`
- `讨论重心`
- `不讨论边界`
- `下一轮要确认的问题`

### `nextActionHint`

明确告诉用户下一步怎么回应。

例如：

- `请逐条回应上面的 5 个澄清问题，再进入下一轮。`

### `source`

说明它来自：

- `laozhang`
- `laolu`
- `bridge`
- `socrates-method`

注意：

这不等于前台署名，而是供系统内部与日志使用。

---

## 7. chatbox 如何配合 `Artifact-Lite`

这是 `Phase 1` 必须吸收的第二个关键点。

当前 chatbox 不应只负责输出一段判断，还应承担“把用户引导到中屏 artifact”的职责。

## 7.1 等待提示

等待提示应改成阶段化系统提示，而不是单一傻转圈。

建议按阶段切换，例如：

- `正在读取本轮议题材料...`
- `正在整理议题锁定所需的关键问题...`
- `苏格拉底裁判正在检查本轮问题是否成立...`
- `正在把本轮参考内容写入中屏...`

要求：

- 这是系统提示，不是新人物发言
- 有阶段感，不是固定一句话

## 7.2 老张 / 老卢的引导话语

老张 / 老卢在 chatbox 中需要多承担“导向 artifact”的功能。

建议风格：

### 老张

- `我先把最该澄清的几根刺挂到中屏，你别急着总结，逐条回应。`
- `先看中屏那几条，别跳到结论。我们先把边界钉死。`

### 老卢

- `我先把这一轮的骨架挂到中屏，你顺着那几条逐条确认，我们再往深处走。`
- `先看中屏这份结构稿，确认完，我们再继续往下收。`

关键不是文案本身，而是：

**chatbox 必须把用户自然引到中屏 artifact 上。**

---

## 8. `Artifact-Lite` 与 `Socrates` 的关系

这里要特别守边界。

正确关系是：

- `Socrates` 可以在后台提供方法驱动
- `Artifact-Lite` 可以明显带有苏格拉底式澄清、拆解、边界钉死的风格
- 但前台不必重新变成“苏格拉底亲自出场主持”

也就是说：

**借用苏格拉底的 artifact 机制，不恢复苏格拉底的前台人格地位。**

这和当前 `Phase 1` 的整体方向是一致的。

---

## 9. `Phase 1` 方案如何正式“吃到它”

这条方案不应停留在独立参考件，必须回流到 `Phase 1` 主方案。

因此建议在 `Crucible Phase 1-dev` 中正式吸收以下 4 项：

1. 中屏支持 `artifact-lite` 对象
2. `topic_lock` 阶段优先允许产出 `artifact-lite`
3. chatbox 增加“导向中屏 artifact”的引导话语
4. 等待提示改成阶段化系统状态

这 4 项一旦进入 `Phase 1` 主方案，就不再是“UI 灵感”，而是正式产品能力。

---

## 10. 建议的验收口径

如果 `Artifact-Lite` 进入 `Phase 1`，建议至少按下面口径验收：

1. 中屏不再出现“文字描述一张图”的伪可视化
2. `topic_lock` 阶段能自然挂出可读 artifact
3. chatbox 能明确引导用户去看中屏内容
4. 用户只看中屏 artifact 也能明白这一轮正在干什么
5. `Artifact-Lite` 不会让前台重新变成苏格拉底个人秀

---

## 11. 建议的 Linear 承接方式

因为你晚点会把方案交给 Linear 治理组，所以这里先把建议写清。

在 `Code Nemesis` 的 `Crucible Phase 1-dev` 下，建议后续拆出至少这些开发卡：

1. `Phase 1：中屏支持 artifact-lite 合同`
2. `Phase 1：topic_lock 阶段接入 artifact-lite`
3. `Phase 1：chatbox 增加导向 artifact 的引导语`
4. `Phase 1：等待提示改为阶段化系统状态`

其中：

- 合同与对象问题可带标签 `workstream:shared-kernel`
- 验收与比较问题可带标签 `workstream:eval`

---

## 12. 最终结论

黄金坩埚 `Phase 1` 不应该继续把中屏当作“摘要卡容器”。

更合适的方向是：

**把中屏升级为单份 `Artifact-Lite` 公屏，让 chatbox 负责推进，让 artifact 负责沉淀。**

这样你既能吸收 Antigravity 中 Socrates 对话真正有效的呈现关系，又不会破坏黄金坩埚已经确立的前台人格结构。
