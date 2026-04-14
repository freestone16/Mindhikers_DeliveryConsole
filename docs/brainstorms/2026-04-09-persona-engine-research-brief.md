---
date: 2026-04-09
topic: persona-engine-research
type: research-brief
status: pending-assignment
---

# 人格引擎调研需求说明书

## 背景

GoldenCrucible 圆桌讨论引擎需要让 LLM 扮演多位哲人/专家进行辩证对话。一期采用两层人格模型（价值立场 + 修辞风格）+ 前置对比约束的轻量方案。但以下深层问题需要专人调研，以决定二期是否扩展至更复杂的人格工程。

### 核心架构约束：开放接口 + 可替换引擎

PersonaProfile JSON 是不变的合同。圆桌引擎**只认合同，不认生产者**。任何人格引擎（LLM直接生成、nuwa式蒸馏、未来方案）只要输出符合接口的 JSON 即可接入。调研结论应围绕"如何产出更高质量的 PersonaProfile JSON"展开，而非绑定特定实现。

### 参考项目：nuwa-skill

[alchaincyf/nuwa-skill](https://github.com/alchaincyf/nuwa-skill) 是一个优秀的认知蒸馏框架，值得参考但不照搬：

**值得借鉴**：
- 五层蒸馏结构（表达DNA、心智模型、决策启发式、价值观反模式、诚实边界）
- 三重验证标准（跨域复现、生成力、排他性）
- "诚实边界"概念 — 标注角色不会说什么
- 表达DNA的量化方法（20段落统计：句长、疑问句密度、确定性语气比例）
- "删名字后还认得出"的质量自检标准

**不照搬**：
- 6路并行Agent重度采集（太慢，我们一期需要快速启动）
- SKILL.md 格式（我们需要程序可解析的 JSON）
- 单人视角聊天模式（我们是多人圆桌辩论，人格档案的消费场景不同）

## 调研课题

### 课题 1：Prompt 参数敏感度验证

**核心问题**：纯 prompt engineering 下，LLM 对结构化人格参数的敏感度有多高？

**具体验证**：
- 对比实验：给 LLM 苏格拉底的名字 + 通识知识 vs 苏格拉底的名字 + 两层参数 vs 苏格拉底的名字 + 四层参数（40-50个），输出质量差异是否可被人类评估者感知？
- 边际收益曲线：从 0 层（纯名字）→ 2 层 → 4 层，每层增量带来多少可感知的差异化提升？
- 阈值在哪：超过多少参数后，LLM 开始忽略或混淆参数？

**交付物**：参数敏感度报告 + 推荐的最优层数

### 课题 2：独立上下文架构

**核心问题**：多角色同时辩论时，如何确保每个角色维护独立的"思考空间"？

**具体调研**：
- 单次 LLM 调用生成所有角色发言 vs 每个角色独立调用 → 一致性和差异性对比
- 如果独立调用，如何高效传递"其他角色刚才说了什么"的上下文？
- 上下文窗口分配策略：人格档案占多少 token、历史对话占多少、对比约束占多少？
- Stanford Generative Agents 的记忆-反思-规划三层架构在圆桌场景下是否必要？可否简化？

**交付物**：架构方案对比 + 推荐方案

### 课题 3：人格一致性评估方法

**核心问题**：如何量化评估"这个 LLM 输出是否符合苏格拉底的人格"？

**具体调研**：
- PersonaGym、RPEval、InCharacter 等框架的适用性评估
- Response 级 vs 句子级（atomic-level）评估的成本/收益
- 可否用 LLM-as-Judge 方案（让另一个 LLM 评判一致性），效果如何？
- 多角色场景下，一致性评估需要考虑的特殊因素（角色间交互导致的合理立场演化 vs 穿帮）

**交付物**：评估框架推荐 + 可落地的评估流程

### 课题 4：角色差异化最优策略

**核心问题**：避免"所有角色听起来一样"的最有效方法是什么？

**具体调研**：
- 前置对比约束（prompt 中注入张力锚点）的效果上限
- Persona-Aware Contrastive Learning 在不做 fine-tuning 情况下的替代方案
- 文体指纹控制：LIWC 维度（句长、情感词密度、逻辑连接词比例等）是否可通过 prompt 有效控制？
- 每轮"差异性检查"是否值得做？延迟/质量的 tradeoff

**交付物**：差异化策略推荐 + 实验结果

### 课题 5：人格提取管道可行性（远期）

**核心问题**：从文本语料自动提取 PersonaProfile 的可行性和精度预期。

**具体调研**：
- LLM-based extraction（直接用 LLM 从文本推断参数）的准确率基线
- Haidt MFT 从文本提取的成熟度（Moral Foundations Dictionary）
- Ethos/Pathos/Logos 偏好从文本提取的方法和精度
- 对用户自身（而非历史人物）做人格提取的隐私和伦理考量

**交付物**：可行性报告 + 推荐的提取管道架构

### 课题 6：nuwa-skill 蒸馏框架适配评估

**核心问题**：nuwa-skill 的蒸馏方法论能否适配为 PersonaProfile JSON 的一个生产者？

**具体调研**：
- nuwa 五层蒸馏（表达DNA/心智模型/决策启发式/价值观反模式/诚实边界）与 PersonaProfile 可选扩展字段的映射关系
- nuwa 的三重验证标准在圆桌辩论场景下是否需要调整
- nuwa 的 SKILL.md → PersonaProfile JSON 的自动转换可行性
- nuwa 蒸馏一个人物的时间/成本，是否可接受作为批量生产方案
- "心智模型"在圆桌辩论中的实际驱动效果 vs 纯 MFT+修辞风格

**交付物**：适配方案 + 是否值得接入的决策建议

## 参考资料

### 学术框架（已调研摘要）

| 理论 | 适用性 | 文本可提取度 |
|------|--------|------------|
| Big Five 30 facets | 4/5 — 维度清晰，但对辩论风格区分度不够细腻 | 中等 |
| Haidt MFT 6 foundations | 5/5 — 价值观差异是辩论核心驱动力 | 容易（成熟词典） |
| Ethos/Pathos/Logos 偏好 | 5/5 — 直接塑造辩论风格 | 容易（可自动统计） |
| Toulmin 6 要素 | 5/5 — 可作为论证结构模板 | 中等 |
| CAPS if-then 模型 | 5/5 — 捕捉情境化响应，但需大量语料 | 困难 |
| 认知复杂度 | 5/5 — 决定辩证综合能力 | 中等 |

### AI 实践（已调研摘要）

- Stanford Generative Agents：记忆-反思-规划三层缺一不可
- Persona-Aware Contrastive Learning：不做 fine-tuning 的差异化方案
- PersonaGym：5 维度评估框架（expected action, toxicity control, linguistic habits, persona consistency, action justification）
- 纯 prompt 的 role-playing 在事实一致性上容易漂移，多轮 RL fine-tuning 可降低 55% 不一致率

## 接口契约（PersonaProfile JSON 结构）

调研产出的任何方案，最终必须输出符合以下契约的 JSON：

```
PersonaProfile {
  // === 必填（一期） ===
  identity: { name, era, domain, tagline }
  values: { haidt_mft: { care, fairness, loyalty, authority, sanctity, liberty } }
  rhetoric: { ethos_pathos_logos: [float, float, float], style_fingerprint: {...} }
  meta: { source: "manual" | "llm_generated" | "engine_distilled", version, created_at }

  // === 可选扩展（二期，有就用，没有不崩） ===
  mental_models?: [{ name, description, evidence, application, limitations }]
  heuristics?: [{ rule, description, examples }]
  expression_dna?: { sentence_patterns, high_freq_terms, rhythm, humor_style, certainty_expression }
  personality_traits?: { big_five_facets: {...} }
  argumentation?: { toulmin_preferences: {...} }
  honest_boundaries?: { limitations, coverage, timestamp }
}
```

**设计原则**：圆桌引擎读取时，有扩展字段就用来增强 prompt，没有就只用必填字段。任何生产者（手工、LLM、nuwa、未来方案）只要输出符合此接口即可接入。

## 约束

- 一期产品纯 prompt engineering，不做 fine-tuning
- 人格档案必须是 JSON 格式，符合上述 PersonaProfile 接口契约
- 调研结果需可指导以下决策：a) 一期两层是否足够？b) 哪些可选扩展字段 ROI 最高？c) nuwa 式蒸馏是否值得接入？d) 后续替换/升级生产者的成本评估
- **不阻塞一期工程** — 调研与开发并行

## 交付时间线

与圆桌引擎一期开发并行推进，不阻塞工程。调研结论在一期 MVP 验证后输入二期规划。
