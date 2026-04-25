# Director 模板决策矩阵 (Template Decision Matrix)

> **用途**：当导演大师面对任何内容场景时，必须先查阅此矩阵，精准选出最合适的 Remotion 模板。禁止凭感觉随机选择。

## 📐 内容场景 → 最佳模板 决策表

| 内容场景 | 首选模板 | 备选模板 | 使用忌讳 |
|---------|---------|---------|---------|
| 提出问题/反问 | `QuoteCard` (quote 字段写问句) | `TextReveal` | ❌ 不要用数据模板展示问句 |
| 权威引用/名人名言 | `QuoteCard` (author + role) | `KineticTypography` | — |
| A vs B 整体对比 | `ComparisonSplit` | `BeforeAfter` | ❌ 两者不在同视频重复使用 |
| 改变前后/转变历程 | `BeforeAfter` | `ComparisonSplit` | ❌ beforeItems最多8条 |
| 纯文字核心观点 | `TextReveal` | `QuoteCard` | ❌ 不适合展示数据 |
| 大字冲击/苹果风 | `KineticTypography` | `TextReveal` | ❌ 逐句不超过7句 |
| 2×2 象限分析 | `DataChartQuadrant` | `MatrixGrid` (cols=2) | ❌ 数据点必须恰好4个 |
| N×M 矩阵对比 | `MatrixGrid` | `DataChartQuadrant` | ❌ 超过2×2时用MatrixGrid |
| 优先级矩阵 | `MatrixGrid` (xLabel+yLabel) | `DataChartQuadrant` | — |
| 排名/Top N 竞争 | `BarChartRace` | `StackedList` | ❌ N≤6用BarChart, N>6用StackedList |
| 要点罗列/清单 | `Checklist` | `StackedList` | ❌ 超过8条精简后再用 |
| 有序步骤/方法论 | `StepProcess` | `Flowchart` | ❌ 线性无分支用StepProcess |
| 决策树/流程判断 | `Flowchart` | `StepProcess` | ❌ 有分支才用Flowchart |
| 因果链/递进模型 (≤5节点) | `ConceptChain` | `TimelineFlow` | ❌ 超过5节点必须改TimelineFlow |
| 历史进程/时间线 | `TimelineFlow` | `StepProcess` | ❌ 有明确年份时用Timeline |
| 占比/份额/比例 | `PieChart` | `MetricRings` | ❌ 类别≤6用Pie, 否则合并"其他" |
| 多维度评测 | `RadarChart` | `MetricRings` | ❌ 维度≥4用Radar, 2-3维用Rings |
| 百分比/KPI 多指标 | `MetricRings` | `StatDashboard` | ❌ ≤4环时用MetricRings |
| 多KPI数据概览 | `StatDashboard` | `MetricRings` | ❌ ≥3个不同指标时用Dashboard |
| 层级/优先级金字塔 | `HierarchyPyramid` | `StackedList` | ❌ 层级≤5个 |
| 知识拆解/分支展开 | `MindmapFlow` | `BentoBoxSaaS` | ❌ 有中心节点→子节点时用Mindmap |
| 产品特性/功能展示 | `BentoBoxSaaS` | `IconGrid` | ❌ 有详细描述用Bento, 纯icon用Grid |
| 图标+标签矩阵 | `IconGrid` | `BentoBoxSaaS` | ❌ cols取3/4/5之一 |
| 交叉能力/领域交集 | `VennDiagram` | `MatrixGrid` | ❌ 圆圈2-3个 |
| 单个大数字强调 | `NumberCounter` | `GaugeChart` | — |
| 赛博/LCD 科技数字 | `SegmentCounter` | `NumberCounter` | — |
| 单值仪表盘 | `GaugeChart` | `MetricRings` | ❌ 只展示一个0-100值时用Gauge |
| 代码/终端展示 | `TerminalTyping` | — | ❌ 不要用TextReveal展示代码 |
| 重点插播/警示 | `Callout` | — | ❌ 全片≤3次,不要滥用 |
| 人类vs机器/两栏对比 | `TwoColumnText` | `ComparisonSplit` | ❌ 纯文字用Two-Column, 要视觉效果用ComparisonSplit |
| 章节过渡/悬念制造 | `SplitReveal` | `CountdownTimer` | ❌ 全片≤2次过渡动画 |
| 倒计时/开场预热 | `CountdownTimer` | `SplitReveal` | ❌ from值1-10 |
| Ken Burns 推镜/氛围感 | `CinematicZoom` | — | ❌ C级模板，不提供imagePrompt |
| 万能兜底 | `SceneComposer` | — | ❌ 最后手段，能用其他的绝不用 |

---

## 🎯 模板分级能力速查

### 信息密度等级

| 等级 | 模板 | 适合内容 |
|------|------|---------|
| **重量级** (信息密集) | BarChartRace, RadarChart, StatDashboard, MatrixGrid, DataChartQuadrant, Flowchart | 需要深度阅读的数据 |
| **中量级** (信息适中) | ConceptChain, TimelineFlow, MindmapFlow, HierarchyPyramid, BentoBoxSaaS, PieChart, MetricRings, StackedList, Checklist, StepProcess, BeforeAfter | 框架/流程/对比 |
| **轻量级** (视觉为主) | TextReveal, KineticTypography, QuoteCard, NumberCounter, SegmentCounter, GaugeChart, Callout, TwoColumnText, IconGrid | 核心观点/情绪共鸣 |
| **氛围级** (过渡/节奏) | CinematicZoom, SplitReveal, CountdownTimer | 章节过渡/氛围营造 |

---

## ❗ 强制约束

1. **同一视频内，单个模板最多出现 2 次**（KineticTypography 和 QuoteCard 为黄金搭档例外，但合计不超过 3 次）
2. **TextReveal + ConceptChain 合计最多出现 3 次**（超过即违规）
3. **每个视频至少使用 6 种不同 remotion 模板**
4. **重量级模板之后必须跟轻量级或氛围级模板**（重→重 = 认知疲劳）
5. **不提供 imagePrompt 的 C 级模板**（TerminalTyping, SceneComposer, CinematicZoom, CountdownTimer）不计入底图多样性要求
