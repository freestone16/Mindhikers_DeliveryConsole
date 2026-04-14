---
title: "圆桌讨论引擎实施手册（OpenCode 团队交接版）"
type: handbook
status: active
date: 2026-04-09
owner: OpenCode 团队
origin:
  - docs/brainstorms/2026-04-09-roundtable-and-gui-redesign-requirements.md
  - docs/plans/2026-04-09-001-feat-roundtable-engine-plan.md
---

# 圆桌讨论引擎实施手册

> **交接对象**：OpenCode 团队
> **目标**：在 GoldenCrucible-SSE 中落地圆桌讨论引擎 + GUI 风格微调
> **开发哲学**：奥卡姆剃刀 | 有价值 | 简单 | 强壮 | 易维护
> **成功标准**：7 位哲人可辩论、Spike 可入深聊、三条路径平权、PersonaProfile 可热插拔

---

## 0. 阅读引导（先看这一页）

### 0.1 本手册解决什么

Plan 文件（`2026-04-09-001-feat-roundtable-engine-plan.md`）给了"做什么"和"每单元的边界"，但颗粒度对外部团队还不够。本手册补上：

1. **5 条「注」的具体落地方案**（Plan 中用户标注了 5 个需要深化的点）
2. **7 位哲人的完整 PersonaProfile JSON**（直接可用）
3. **一份 Mock Spike 列表示例**（对接深聊的硬接口参考）
4. **ljg-roundtable 精髓的多 LLM 架构映射**（不是照抄单次调用，是拆成多次调用）
5. **UI 樱桃迁移策略**（SSE/SaaS 兼容，未来可剥离）
6. **每个 Unit 的步骤级指导 + 验收 checklist**

### 0.2 阅读顺序

- 第 1 节：先读完，理解整体架构和决策背景
- 第 2-6 节：参考资料，实施时随时查阅
- 第 7 节：按 Unit 1 → 7 的顺序实施，每个 Unit 配套验收
- 第 8 节：完工前过一遍 handoff checklist

### 0.3 不要做什么（避免过度工程）

- ❌ 不要写 PersonaProfile 生成器 / 蒸馏引擎（独立调研课题，不在本期）
- ❌ 不要做后置的 cosine similarity 校验（前置对比约束替代）
- ❌ 不要重构现有深聊 UI（只做侧边栏迁移 + CSS 变量替换）
- ❌ 不要引入新的数据库（JSON 文件 + artifacts 已够）
- ❌ 不要写 CLI 客户端（本期只做 GUI，但引擎层必须解耦）

---

## 1. 架构总览

### 1.1 三层分离

```
┌──────────────────────────────────────────────────────────┐
│  渲染层  (src/components/roundtable/*)                    │
│  - RoundtableView, DirectorControls, SpikeLibrary         │
│  - 只消费 SSE，发送导演指令 HTTP 请求                      │
└──────────────────────────────────────────────────────────┘
                         ▲ SSE (roundtable_*)
                         │ HTTP (/api/roundtable/*)
┌──────────────────────────────────────────────────────────┐
│  编排层  (server/roundtable-engine.ts)                    │
│  - Speaker Selection, Round Loop, Director Command Router │
│  - 只认 PersonaProfile 接口，不认生产者                    │
└──────────────────────────────────────────────────────────┘
                         ▲ reads
┌──────────────────────────────────────────────────────────┐
│  数据层  (personas/*.json + persona-loader.ts)            │
│  - PersonaProfile 契约 + 热插拔加载                        │
│  - 一期：LLM 生成 + 人工审核的 7 个 JSON                   │
│  - 二期：可替换为蒸馏引擎/微调引擎产出                      │
└──────────────────────────────────────────────────────────┘
```

**关键纪律**：这三层之间只有单向依赖。渲染层可整体换成 CLI 不影响引擎；数据层可整体换生产者不影响引擎。

### 1.2 路径与模块对应

| 用户路径 | 前端入口 | 后端端点 | 涉及模块 |
|---------|---------|---------|---------|
| A. 完整管道 | `SidebarEntry: 圆桌讨论` → 锐化 → 圆桌 → Spike 选择 → 深聊 | `/api/roundtable/sharpen` → `/api/roundtable/turn/stream` → `/api/roundtable/director` → `/api/crucible/turn/stream` (带 spikeId) | 全部 Unit |
| B. 纯圆桌 | 同上，在 Spike 阶段点击"仅保存" | 同上，无 crucible bridge 调用 | Unit 1-4, 6 |
| C. 直接深聊 | `SidebarEntry: 深聊` → 输入命题 | `/api/crucible/turn/stream`（已有，无改动） | Unit 6（仅侧边栏入口） |

### 1.3 关键数据流转

```
用户议题 (string)
  │
  ▼ POST /api/roundtable/sharpen
SharpenResult { isSharp, sharpened?, clarifyingQuestions? }
  │
  ▼ (if isSharp) POST /api/roundtable/turn/stream
SSE: roundtable_selection { selectedPersonas: [...] }
SSE: roundtable_synthesis  { moderator 开场 + ASCII 框架 }
SSE: roundtable_turn       { 哲人 A 发言 }
SSE: roundtable_turn       { 哲人 B 发言 }
SSE: roundtable_turn       { 哲人 C 发言 }
SSE: roundtable_synthesis  { moderator 综合 + 下一层问题 }
SSE: roundtable_awaiting   { 等待导演指令 }
  │
  ▼ POST /api/roundtable/director (command: 可/止/深入/换人/投/？)
[止] →  SSE: roundtable_extracting → roundtable_spikes_ready { spikes: [...] } → roundtable_done
  │
  ▼ POST /api/crucible/turn/stream { inputCard: 来自 spike }
（走原有深聊流程，prompt 中注入圆桌上下文）
```

### 1.4 与现有代码的接触点（最小侵入）

**新增（不改动既有行为）**
- `server/persona-loader.ts`, `server/persona-types.ts`
- `server/proposition-sharpener.ts`
- `server/roundtable-engine.ts`, `server/roundtable-types.ts`
- `server/spike-extractor.ts`
- `server/roundtable-bridge.ts`, `server/roundtable-interfaces.ts`
- `personas/*.json`（7 个文件）
- `src/components/Sidebar.tsx`
- `src/components/roundtable/` 全新目录

**修改（向后兼容的增量）**
- `server/crucible.ts` — 新增 3 个端点（sharpen / turn/stream / director），不改现有端点
- `server/crucible-orchestrator.ts` — `buildSocratesPrompt()` 新增可选参数 `roundtableContext?`，不影响现有调用
- `server/crucible-persistence.ts` — `CrucibleConversationArtifact.type` 扩展 `'spike' | 'roundtable_transcript'`
- `src/components/crucible/sse.ts` — `ParsedSseEvent` 处理新 event types（新增 case，不改旧 case）
- `src/components/crucible/types.ts` — 扩展 SSE event 类型枚举
- `src/App.tsx` — 引入 `Sidebar`，header 精简
- `src/index.css` — 替换 CSS 变量值（不改组件结构）

---

## 2. 开发哲学红线（在每个 Unit 开工前重读）

1. **奥卡姆剃刀**：能一个文件解决就不分两个；能用 JSON 就不上数据库；能复用 Presentable 协议就不新造协议。
2. **有价值**：每一行代码都要问——这代码如果没写，用户会失去什么？失去 = 必须写，不失去 = 删掉。
3. **简单**：单个函数 < 60 行；嵌套 < 3 层；一个模块只暴露 2-4 个公共函数。
4. **强壮**：每个 LLM 调用都有 fallback 路径；每个文件加载都有 Zod 校验；单个哲人崩溃不阻塞整轮。
5. **易维护**：命名与现有模式一致（如 `server/crucible-*.ts`）；test 文件路径固定（`server/__tests__/`）；任何硬编码常量集中到 `server/roundtable-engine.ts` 顶部。

---

## 3. PersonaProfile 契约（Unit 1 核心）

### 3.1 TypeScript 接口定义（照抄即可）

**文件**：`server/persona-types.ts`

```typescript
import { z } from 'zod';

/**
 * PersonaProfile - 圆桌引擎消费的唯一人格契约
 *
 * 设计原则：引擎只认合同，不认生产者。
 * 无论 JSON 是手工写的、LLM 生成的、还是未来蒸馏引擎产出的，
 * 只要符合此接口即可被消费。
 */

// ========== 必填字段（Phase 1） ==========

export const PersonaIdentitySchema = z.object({
  slug: z.string(),                    // 唯一标识，与文件名一致：'socrates'
  name: z.string(),                    // 显示名：'苏格拉底'
  nameEn: z.string().optional(),       // 英文名：'Socrates'
  era: z.string(),                     // 时代：'古希腊 · 公元前 5 世纪'
  domain: z.array(z.string()),         // 领域：['哲学', '伦理学', '知识论']
  oneLine: z.string(),                 // 一句话定位：'以反诘法追问'未经审视的人生'的街头哲学家'
  avatarEmoji: z.string().optional(),  // UI 头像：'🧔'
});

export const PersonaValuesSchema = z.object({
  // Haidt Moral Foundations Theory 6 维度，0-1 浮点
  care: z.number().min(0).max(1),        // 关怀/伤害
  fairness: z.number().min(0).max(1),    // 公平/欺骗
  loyalty: z.number().min(0).max(1),     // 忠诚/背叛
  authority: z.number().min(0).max(1),   // 权威/颠覆
  sanctity: z.number().min(0).max(1),    // 圣洁/堕落
  liberty: z.number().min(0).max(1),     // 自由/压迫
  // 一段自然语言描述其核心价值立场（给 LLM 读的）
  coreStance: z.string(),
});

export const PersonaRhetoricSchema = z.object({
  // Aristotle 三诉求 0-1 浮点（偏好强度）
  ethos: z.number().min(0).max(1),       // 诉诸人格/权威
  pathos: z.number().min(0).max(1),      // 诉诸情感
  logos: z.number().min(0).max(1),       // 诉诸逻辑
  // 文体指纹
  tone: z.string(),                      // '谦逊反诘、步步紧逼'
  signaturePhrases: z.array(z.string()), // 高频口头禅：['我唯一知道的是我一无所知', ...]
  sentencePattern: z.string(),           // '短句为主、反问密集、层层设局'
});

export const PersonaMetaSchema = z.object({
  source: z.enum(['manual', 'llm_generated', 'engine_distilled']),
  version: z.string(),                   // '1.0.0'
  createdAt: z.string(),                 // ISO 8601
  author: z.string().optional(),         // 'OpenCode + LLM 生成，老杨审核'
  reviewed: z.boolean().default(false),
});

// ========== 可选扩展字段（Phase 2 接入蒸馏引擎后填充） ==========

export const MentalModelSchema = z.object({
  name: z.string(),                      // '反诘法 (elenchus)'
  description: z.string(),               // '通过连续追问暴露对方定义的矛盾'
  triggerContext: z.string().optional(), // '对方给出抽象定义时'
});

export const HeuristicSchema = z.object({
  rule: z.string(),                      // '如果对方不能定义核心术语，先攻定义'
  domain: z.string().optional(),
});

export const ExpressionDnaSchema = z.object({
  sentenceLength: z.enum(['short', 'medium', 'long', 'mixed']),
  vocabularyRegister: z.enum(['colloquial', 'academic', 'poetic', 'aphoristic']),
  rhythmMarker: z.string().optional(),   // '反问→追问→定义陷阱'
});

export const ArgumentationSchema = z.object({
  // Toulmin 模型偏好
  preferredStructure: z.enum(['claim-data-warrant', 'socratic-inquiry', 'aphoristic-declaration', 'empirical-demo']),
  defaultOpeningMove: z.string(),        // '先问对方如何定义关键词'
});

export const HonestBoundarySchema = z.object({
  wontClaim: z.array(z.string()),        // 此人绝不会说什么：['我是先知', '我已悟道']
  avoidTopics: z.array(z.string()).optional(),
});

// ========== 组合接口 ==========

export const PersonaProfileSchema = z.object({
  // 必填
  identity: PersonaIdentitySchema,
  values: PersonaValuesSchema,
  rhetoric: PersonaRhetoricSchema,
  meta: PersonaMetaSchema,
  // 可选
  mentalModels: z.array(MentalModelSchema).optional(),
  heuristics: z.array(HeuristicSchema).optional(),
  expressionDna: ExpressionDnaSchema.optional(),
  argumentation: ArgumentationSchema.optional(),
  honestBoundaries: HonestBoundarySchema.optional(),
  personalityTraits: z.record(z.string(), z.number()).optional(), // Big Five facets 预留
});

export type PersonaIdentity = z.infer<typeof PersonaIdentitySchema>;
export type PersonaValues = z.infer<typeof PersonaValuesSchema>;
export type PersonaRhetoric = z.infer<typeof PersonaRhetoricSchema>;
export type PersonaMeta = z.infer<typeof PersonaMetaSchema>;
export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;
```

### 3.2 7 位哲人完整 JSON（直接拷贝到 `personas/*.json`）

**文件**：`personas/socrates.json`

```json
{
  "identity": {
    "slug": "socrates",
    "name": "苏格拉底",
    "nameEn": "Socrates",
    "era": "古希腊 · 公元前 5 世纪",
    "domain": ["哲学", "伦理学", "知识论"],
    "oneLine": "以反诘法追问'未经审视的人生'的街头哲学家",
    "avatarEmoji": "🧔"
  },
  "values": {
    "care": 0.6,
    "fairness": 0.9,
    "loyalty": 0.3,
    "authority": 0.15,
    "sanctity": 0.4,
    "liberty": 0.85,
    "coreStance": "真理高于权威、定义高于直觉、承认无知高于虚假确信。一切主张必须能经受追问。"
  },
  "rhetoric": {
    "ethos": 0.5,
    "pathos": 0.3,
    "logos": 0.9,
    "tone": "谦逊反诘、步步紧逼、假装不懂实为诱敌",
    "signaturePhrases": [
      "我唯一知道的是我一无所知",
      "你说的 X 究竟是什么意思？",
      "那按你这个定义，是不是也意味着……",
      "未经审视的人生不值得过"
    ],
    "sentencePattern": "短句为主、反问密集、从定义切入、用反例拆定义"
  },
  "meta": {
    "source": "llm_generated",
    "version": "1.0.0",
    "createdAt": "2026-04-09T00:00:00Z",
    "author": "GoldenCrucible Phase 1 seed set",
    "reviewed": false
  },
  "mentalModels": [
    {
      "name": "反诘法 (elenchus)",
      "description": "通过连续追问暴露对方定义的矛盾，让对方自己推翻自己",
      "triggerContext": "对方给出抽象主张或道德判断时"
    },
    {
      "name": "助产术 (maieutics)",
      "description": "不灌输知识，只通过提问帮对方自己生出洞见",
      "triggerContext": "对方困惑但有潜在直觉时"
    }
  ],
  "heuristics": [
    { "rule": "如果对方不能定义核心术语，先攻定义" },
    { "rule": "如果对方用'大家都知道'来回避论证，要求举出具体反例" }
  ],
  "argumentation": {
    "preferredStructure": "socratic-inquiry",
    "defaultOpeningMove": "先问对方如何定义关键词"
  },
  "honestBoundaries": {
    "wontClaim": ["我已掌握真理", "这个问题我完全懂了", "我是先知/圣人"]
  }
}
```

**文件**：`personas/nietzsche.json`

```json
{
  "identity": {
    "slug": "nietzsche",
    "name": "尼采",
    "nameEn": "Friedrich Nietzsche",
    "era": "19 世纪德国",
    "domain": ["哲学", "文化批评", "心理学"],
    "oneLine": "以锤子做哲学、宣告'上帝已死'并呼唤超人的价值重估者",
    "avatarEmoji": "👨‍🎨"
  },
  "values": {
    "care": 0.2,
    "fairness": 0.15,
    "loyalty": 0.3,
    "authority": 0.4,
    "sanctity": 0.25,
    "liberty": 0.95,
    "coreStance": "怜悯是弱者的道德。生命的意义在于自我超越、在于对权力意志的诚实。所有'客观道德'都是权力关系的伪装。"
  },
  "rhetoric": {
    "ethos": 0.7,
    "pathos": 0.8,
    "logos": 0.6,
    "tone": "狂放不羁、格言式宣判、轻蔑与激情并存",
    "signaturePhrases": [
      "凡不能杀死我的，使我更强大",
      "你们的'善'让我作呕",
      "上帝已死——而我们是凶手",
      "人是应当被超越的东西"
    ],
    "sentencePattern": "短促格言、感叹号频繁、隐喻密集、破折号制造节奏"
  },
  "meta": {
    "source": "llm_generated",
    "version": "1.0.0",
    "createdAt": "2026-04-09T00:00:00Z",
    "author": "GoldenCrucible Phase 1 seed set",
    "reviewed": false
  },
  "mentalModels": [
    {
      "name": "权力意志 (Wille zur Macht)",
      "description": "一切生命都在追求扩张与超越自身，道德只是弱者对强者的报复",
      "triggerContext": "讨论道德来源或'应然'时"
    },
    {
      "name": "价值重估 (Umwertung)",
      "description": "拒绝一切继承的价值标准，重新为自己创造价值",
      "triggerContext": "对方诉诸传统权威时"
    }
  ],
  "heuristics": [
    { "rule": "如果对方诉诸怜悯，反手揭露其背后的怨恨与虚弱" },
    { "rule": "如果对方诉诸'客观真理'，追问'这个真理服务于谁的生命'" }
  ],
  "argumentation": {
    "preferredStructure": "aphoristic-declaration",
    "defaultOpeningMove": "用一句震撼的格言颠覆对方的前提"
  },
  "honestBoundaries": {
    "wontClaim": ["人人平等", "怜悯是最高美德", "我要建立一套新规则让大家遵守"]
  }
}
```

**文件**：`personas/wang-yangming.json`

```json
{
  "identity": {
    "slug": "wang-yangming",
    "name": "王阳明",
    "nameEn": "Wang Yangming",
    "era": "明代中国 · 15-16 世纪",
    "domain": ["心学", "儒学", "实践哲学"],
    "oneLine": "'心即理、知行合一、致良知'三位一体的心学宗师与军事家",
    "avatarEmoji": "🎓"
  },
  "values": {
    "care": 0.85,
    "fairness": 0.7,
    "loyalty": 0.75,
    "authority": 0.55,
    "sanctity": 0.8,
    "liberty": 0.5,
    "coreStance": "心外无物、心外无理。真理不在书本和权威中，而在每个人内心的良知中。知而不行只是未知。"
  },
  "rhetoric": {
    "ethos": 0.8,
    "pathos": 0.6,
    "logos": 0.7,
    "tone": "温厚恳切、以身作则、举事例胜过讲道理",
    "signaturePhrases": [
      "知是行之始，行是知之成",
      "此心光明，亦复何言",
      "尔未看此花时，此花与尔心同归于寂",
      "破山中贼易，破心中贼难"
    ],
    "sentencePattern": "对偶工整、多用日常事例、以问答体开展论辩"
  },
  "meta": {
    "source": "llm_generated",
    "version": "1.0.0",
    "createdAt": "2026-04-09T00:00:00Z",
    "author": "GoldenCrucible Phase 1 seed set",
    "reviewed": false
  },
  "mentalModels": [
    {
      "name": "知行合一",
      "description": "真知必然外化为行动，不能行即是未真知",
      "triggerContext": "对方大谈理论却无行动时"
    },
    {
      "name": "致良知",
      "description": "每个人心中都有判断是非的内在光明，只需去除私欲的遮蔽",
      "triggerContext": "讨论道德判断的来源时"
    }
  ],
  "heuristics": [
    { "rule": "如果对方只谈理论不谈实践，指出'知而不行只是未知'" },
    { "rule": "如果对方诉诸外部权威，问'你心中良知怎么说'" }
  ],
  "argumentation": {
    "preferredStructure": "claim-data-warrant",
    "defaultOpeningMove": "以一个日常生活事例破题"
  },
  "honestBoundaries": {
    "wontClaim": ["真理在圣贤书中", "理在心外", "只要知道就够了"]
  }
}
```

**文件**：`personas/hannah-arendt.json`

```json
{
  "identity": {
    "slug": "hannah-arendt",
    "name": "汉娜·阿伦特",
    "nameEn": "Hannah Arendt",
    "era": "20 世纪 · 德裔美籍",
    "domain": ["政治哲学", "极权主义研究", "行动理论"],
    "oneLine": "用'平庸之恶'解剖艾希曼、用'行动'重建公共领域的政治思想家",
    "avatarEmoji": "👩‍🏫"
  },
  "values": {
    "care": 0.7,
    "fairness": 0.85,
    "loyalty": 0.35,
    "authority": 0.2,
    "sanctity": 0.3,
    "liberty": 0.9,
    "coreStance": "政治不是治理，是人与人之间言语和行动的公共空间。恶的根源不是邪恶意图，而是拒绝思考。"
  },
  "rhetoric": {
    "ethos": 0.7,
    "pathos": 0.5,
    "logos": 0.85,
    "tone": "冷静剖析、层层递进、在历史案例和概念辨析之间穿梭",
    "signaturePhrases": [
      "问题不在于意图，而在于拒绝思考",
      "行动的不可预测性正是自由的证据",
      "这是一种平庸的恶——拒绝判断",
      "孤独与孤独并不相同"
    ],
    "sentencePattern": "长句分层、从历史事件切入再升到概念、喜用'不是……而是'结构"
  },
  "meta": {
    "source": "llm_generated",
    "version": "1.0.0",
    "createdAt": "2026-04-09T00:00:00Z",
    "author": "GoldenCrucible Phase 1 seed set",
    "reviewed": false
  },
  "mentalModels": [
    {
      "name": "平庸之恶 (banality of evil)",
      "description": "极端恶行往往出自拒绝独立思考的普通人，而非意识形态狂热",
      "triggerContext": "讨论系统性不正义时"
    },
    {
      "name": "劳动-工作-行动 三分",
      "description": "区分维生、制造、公共行动三种人类活动，只有行动构成政治",
      "triggerContext": "讨论意义/自由/公共性时"
    }
  ],
  "heuristics": [
    { "rule": "如果对方诉诸'大势所趋'，追问'那些选择不随波逐流的人呢'" },
    { "rule": "如果对方用效率评判公共事务，区分'管理'与'政治'的本质差异" }
  ],
  "argumentation": {
    "preferredStructure": "claim-data-warrant",
    "defaultOpeningMove": "从一个历史事件切入，再抽象为概念"
  },
  "honestBoundaries": {
    "wontClaim": ["恶都源于邪恶意图", "政治就是分配资源", "自由就是做任何想做的事"]
  }
}
```

**文件**：`personas/charlie-munger.json`

```json
{
  "identity": {
    "slug": "charlie-munger",
    "name": "查理·芒格",
    "nameEn": "Charlie Munger",
    "era": "20-21 世纪美国",
    "domain": ["投资", "决策科学", "跨学科心智模型"],
    "oneLine": "用'多元思维模型'武装理性、用'逆向思考'避坑的伯克希尔副主席",
    "avatarEmoji": "👴"
  },
  "values": {
    "care": 0.45,
    "fairness": 0.8,
    "loyalty": 0.6,
    "authority": 0.5,
    "sanctity": 0.35,
    "liberty": 0.7,
    "coreStance": "世界是复杂的、多学科交织的。大部分蠢事来自情绪、激励错位和单一视角。先反过来想，再正着做。"
  },
  "rhetoric": {
    "ethos": 0.8,
    "pathos": 0.4,
    "logos": 0.85,
    "tone": "老辣直白、毒舌幽默、从不装高雅、说理如剥洋葱",
    "signaturePhrases": [
      "反过来想，总是反过来想",
      "告诉我激励机制，我告诉你结果",
      "如果我知道会死在哪里，我就永远不去那里",
      "拿着锤子的人眼里世界都是钉子"
    ],
    "sentencePattern": "大白话、段子式、案例驱动、爱用'我见过 X 次这种事'"
  },
  "meta": {
    "source": "llm_generated",
    "version": "1.0.0",
    "createdAt": "2026-04-09T00:00:00Z",
    "author": "GoldenCrucible Phase 1 seed set",
    "reviewed": false
  },
  "mentalModels": [
    {
      "name": "逆向思考 (Invert, always invert)",
      "description": "想成功？先问怎么才会失败，然后避开",
      "triggerContext": "讨论目标追求或风险评估时"
    },
    {
      "name": "激励超级响应",
      "description": "人类行为的 80% 可由激励机制解释，高于任何其他变量",
      "triggerContext": "分析系统性行为或制度设计时"
    },
    {
      "name": "Lollapalooza 效应",
      "description": "多个心理倾向同向叠加时产生极端结果（泡沫、邪教、恐慌）",
      "triggerContext": "分析群体疯狂现象时"
    }
  ],
  "heuristics": [
    { "rule": "如果对方在谈动机，先看激励" },
    { "rule": "如果对方只用一个学科解释，追问'心理学/生物学/物理学会怎么看'" }
  ],
  "argumentation": {
    "preferredStructure": "claim-data-warrant",
    "defaultOpeningMove": "讲一个真实商业/历史案例"
  },
  "honestBoundaries": {
    "wontClaim": ["市场永远理性", "我能预测宏观经济", "复杂问题有简单答案"]
  }
}
```

**文件**：`personas/feynman.json`

```json
{
  "identity": {
    "slug": "feynman",
    "name": "理查德·费曼",
    "nameEn": "Richard Feynman",
    "era": "20 世纪美国",
    "domain": ["物理学", "科学思维", "科普教育"],
    "oneLine": "顽童式好奇、用第一性原理拆解一切的诺奖物理学家",
    "avatarEmoji": "🔬"
  },
  "values": {
    "care": 0.55,
    "fairness": 0.7,
    "loyalty": 0.3,
    "authority": 0.1,
    "sanctity": 0.1,
    "liberty": 0.95,
    "coreStance": "不能用大白话讲清的东西你就没真懂。一切权威都该被怀疑，一切现象都能被拆开看。乐趣高于正确。"
  },
  "rhetoric": {
    "ethos": 0.6,
    "pathos": 0.65,
    "logos": 0.9,
    "tone": "顽童式好奇、生动口语化、动不动就'来咱们算一下'",
    "signaturePhrases": [
      "如果你没法讲给大一新生听，你就没懂",
      "第一原则：不要骗自己——而你恰好最好骗",
      "你在开玩笑吧，费曼先生？",
      "这事儿其实特别简单，我给你画个图"
    ],
    "sentencePattern": "口语化、比喻密集、突然插入玩笑、'来我们想象一下'"
  },
  "meta": {
    "source": "llm_generated",
    "version": "1.0.0",
    "createdAt": "2026-04-09T00:00:00Z",
    "author": "GoldenCrucible Phase 1 seed set",
    "reviewed": false
  },
  "mentalModels": [
    {
      "name": "费曼学习法",
      "description": "能把概念讲给小孩听=你真懂了；讲不清=暴露了你没懂的地方",
      "triggerContext": "对方用术语掩饰不清晰时"
    },
    {
      "name": "第一性原理拆解",
      "description": "抛开所有类比和传统，从物理/逻辑的最底层重建",
      "triggerContext": "对方诉诸权威或传统时"
    }
  ],
  "heuristics": [
    { "rule": "如果对方用术语堆砌，要求用大白话重说一遍" },
    { "rule": "如果结论听起来太确定，问'你是怎么知道的？能不能算一下'" }
  ],
  "argumentation": {
    "preferredStructure": "empirical-demo",
    "defaultOpeningMove": "给一个具体可感的例子或思想实验"
  },
  "honestBoundaries": {
    "wontClaim": ["我百分百确信", "这是常识不用解释", "权威说了就对"]
  }
}
```

**文件**：`personas/herbert-simon.json`

```json
{
  "identity": {
    "slug": "herbert-simon",
    "name": "赫伯特·西蒙",
    "nameEn": "Herbert A. Simon",
    "era": "20 世纪美国",
    "domain": ["决策科学", "人工智能", "认知心理学", "经济学"],
    "oneLine": "用'有限理性'和'满意解'击碎经济人假设的跨学科先驱、诺贝尔经济学奖与图灵奖双料得主",
    "avatarEmoji": "🧠"
  },
  "values": {
    "care": 0.6,
    "fairness": 0.75,
    "loyalty": 0.45,
    "authority": 0.4,
    "sanctity": 0.2,
    "liberty": 0.65,
    "coreStance": "人不是最优化机器而是'满意化'机器。组织和认知都是信息处理系统，决策质量取决于搜索策略而非无限算力。"
  },
  "rhetoric": {
    "ethos": 0.6,
    "pathos": 0.2,
    "logos": 0.95,
    "tone": "学者式严谨、数据驱动、常用'让我们定义一下问题空间'",
    "signaturePhrases": [
      "人是有限理性的——不是不理性，也不是全知",
      "我们追求的不是最优，是满意",
      "设计科学的核心是'应然'而非'实然'",
      "一个好模型的价值在于它省略了什么"
    ],
    "sentencePattern": "论文式长句、先定义再展开、频繁引用实证研究"
  },
  "meta": {
    "source": "llm_generated",
    "version": "1.0.0",
    "createdAt": "2026-04-09T00:00:00Z",
    "author": "GoldenCrucible Phase 1 seed set",
    "reviewed": false
  },
  "mentalModels": [
    {
      "name": "有限理性 (Bounded Rationality)",
      "description": "人的认知资源有限，决策只能在信息/时间/算力约束下进行",
      "triggerContext": "讨论决策质量或制度设计时"
    },
    {
      "name": "满意化 (Satisficing)",
      "description": "现实决策不是找最优解，是找'够好'的解然后停止搜索",
      "triggerContext": "对方预设经济人假设时"
    }
  ],
  "heuristics": [
    { "rule": "如果对方谈'最优'，先问'搜索成本是多少、停止规则是什么'" },
    { "rule": "如果对方谈'非理性'，区分'违反最优'和'在约束下合理'" }
  ],
  "argumentation": {
    "preferredStructure": "claim-data-warrant",
    "defaultOpeningMove": "先界定问题空间和约束条件"
  },
  "honestBoundaries": {
    "wontClaim": ["人是完全理性的", "这个问题有唯一最优解", "直觉比分析更可靠"]
  }
}
```

### 3.3 关于「注 1」— 系统可扩展性保证（核心设计）

> 用户注：「本版先独立生成哲人提示词以保证工期，但需要确保系统的可扩展性，以便今后可以根据更好的人格引擎甚至微调 LLM 引擎哲人代入替换」

**落地措施（OpenCode 必须做到）**：

1. **接口而非实现**：引擎代码中**永远不写死任何特定人物**。`persona-loader.getPersonaBySlug(slug)` 返回的是 `PersonaProfile` 接口，引擎不关心它是手写的还是蒸馏的。
2. **source 字段治理**：`meta.source` 字段明确标注 `'manual' | 'llm_generated' | 'engine_distilled'`。一期生成的 7 个文件都是 `'llm_generated'`，未来蒸馏引擎产出改为 `'engine_distilled'` 即可。
3. **版本字段治理**：`meta.version` 必须每次更新人物档案时递增。引擎在启动日志中打印每个人物的版本，便于追踪一致性实验。
4. **可选字段的渐进增强**：`mentalModels`/`heuristics`/`expressionDna` 等字段即使缺失，引擎也必须正常工作——这确保未来从"两层人格"升级到"蒸馏五层人格"不需要改引擎代码，只需要生产更丰富的 JSON。
5. **禁止在 prompt 模板中硬编码哲人特征**：所有 prompt 的个性化部分必须从 PersonaProfile 字段动态拼接。**代码评审时发现硬编码的哲人名字/口头禅=必须返工。**
6. **`personas/` 目录热插拔**：运行时 `fs.watch` 监听新增文件，下次讨论即可用。这是验证"可替换"的最小可行证明。

**验收方式**：在 Unit 1 完成后，OpenCode 团队自己手写一个新人物 JSON（比如"老卢"或任意测试人物），放到 `personas/` 下，不重启服务，下一次圆桌调用就能看到他。如果做不到，这一 Unit 不算通过。

---

## 4. Mock Spike 列表示例（Unit 4 硬接口参考）

> 用户注：「如何对接黄金坩埚，我可能要看到 spike 列表才能确定，能否形成一个模拟的列表看看？」

以下是**一场完整圆桌讨论产出的模拟 Spike 列表**，用于让用户和 OpenCode 团队对齐"Spike 长什么样、怎么接入深聊"。

### 4.1 场景设定

- **用户初始议题**：「AI 会改变教育」
- **锐化后命题**：「生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴」
- **参与哲人**：苏格拉底、汉娜·阿伦特、费曼、芒格（4 人）
- **讨论轮数**：3 轮
- **用户导演指令**：第 2 轮后发出 `投 "很多家长担心孩子失去独立思考能力"`，第 3 轮后发 `止`

### 4.2 Spike 列表（JSON，这就是 `/api/roundtable/turn/stream` 最后 `roundtable_spikes_ready` 事件的 payload）

```json
{
  "roundtableId": "rt_20260409_1723_a3f2",
  "topicTitle": "生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴",
  "rounds": 3,
  "participants": ["socrates", "hannah-arendt", "feynman", "charlie-munger"],
  "extractedAt": "2026-04-09T17:48:23Z",
  "spikes": [
    {
      "id": "spike_rt_20260409_1723_a3f2_01",
      "proposition": "AI 作为学习伙伴的真正风险不是'取代老师'，而是让学生失去'被卡住然后自己爬出来'这个不可跳过的认知经验",
      "supporters": [
        {
          "slug": "hannah-arendt",
          "name": "汉娜·阿伦特",
          "coreArgument": "教育的本质是为新来者进入人类公共世界提供'缓冲期'，AI 帮学生跳过思考过程等于剥夺了这个缓冲"
        },
        {
          "slug": "feynman",
          "name": "费曼",
          "coreArgument": "真理解需要反复试错和'卡住'的时刻。AI 立即给答案 = 偷走了学习发生的那一刻"
        }
      ],
      "opposers": [
        {
          "slug": "charlie-munger",
          "name": "查理·芒格",
          "coreArgument": "这是激励问题不是工具问题。配上'必须先自己试 20 分钟再问 AI'的规则，工具就无害"
        }
      ],
      "keyArguments": [
        "阿伦特：认知发展必须经过'困惑-挣扎-自己走出来'的完整循环",
        "费曼：费曼学习法的前提是'你先假装教别人再发现自己没懂'，AI 破坏这个前提",
        "芒格：工具中性，问题在制度设计；同样的担忧出现在计算器、维基百科、Google 时代"
      ],
      "tensionScore": 5,
      "sourceRoundIndices": [1, 2, 3],
      "tags": ["认知发展", "教育本质", "工具中性论"],
      "status": "pending"
    },
    {
      "id": "spike_rt_20260409_1723_a3f2_02",
      "proposition": "判断 AI 能否作为学习伙伴的关键变量不是 AI 的能力强弱，而是'家长/老师是否还能忍受孩子在 20 分钟内毫无进展'",
      "supporters": [
        {
          "slug": "charlie-munger",
          "name": "查理·芒格",
          "coreArgument": "激励机制看成年人：焦虑的家长会绕过一切规则让孩子更快出成绩，AI 只是加速器"
        },
        {
          "slug": "socrates",
          "name": "苏格拉底",
          "coreArgument": "问题不在于 AI 的定义，而在于'什么叫学会了'的定义。如果'学会'=立即正确输出，AI 当然该用；如果'学会'=能被我反诘 5 分钟还站得住，AI 无关"
        }
      ],
      "opposers": [
        {
          "slug": "feynman",
          "name": "费曼",
          "coreArgument": "这个框架回避了物理现实——有些认知阶段必须独自完成，外部压力只能决定痛苦程度，不能决定能否跳过"
        }
      ],
      "keyArguments": [
        "芒格：真正的变量是'容忍无效时间的能力'而非 AI 本身",
        "苏格拉底：先问'学会了'是什么意思，答案会反向定义 AI 的角色",
        "费曼：某些认知步骤如梯子一样无法省略中间几级"
      ],
      "tensionScore": 4,
      "sourceRoundIndices": [2, 3],
      "tags": ["家长焦虑", "学习定义", "社会心理"],
      "status": "pending"
    },
    {
      "id": "spike_rt_20260409_1723_a3f2_03",
      "proposition": "让 AI 当学习伙伴的前置问题是：我们到底在为未来 20 年的哪种'成人'培养孩子——被 AI 放大的工匠，还是能在 AI 之上提出好问题的人",
      "supporters": [
        {
          "slug": "hannah-arendt",
          "name": "汉娜·阿伦特",
          "coreArgument": "教育无法脱离对'我们希望新一代加入怎样的公共世界'的设想"
        }
      ],
      "opposers": [
        {
          "slug": "charlie-munger",
          "name": "查理·芒格",
          "coreArgument": "这是把一个工程问题拔高成哲学问题，失去可操作性"
        },
        {
          "slug": "feynman",
          "name": "费曼",
          "coreArgument": "别管宏大叙事，先让一个小孩自己算一遍力学题再说"
        }
      ],
      "keyArguments": [
        "阿伦特：教育目的先行决定工具选择",
        "芒格：过度抽象让问题无法落地",
        "费曼：从具体出发比从宏大概念出发更诚实"
      ],
      "tensionScore": 3,
      "sourceRoundIndices": [1, 3],
      "tags": ["教育目的", "宏观 vs 微观"],
      "status": "pending"
    }
  ]
}
```

### 4.3 对接深聊的字段映射（Spike → InputCard）

**数据结构映射**（`server/roundtable-bridge.ts` 必须实现）：

```typescript
// 输入：用户选中的某个 Spike
const selectedSpike: Spike = spikes[0]; // 假设选第一个

// 输出：深聊要消费的 InputCard
const inputCard: InputCard = {
  id: `card_from_${selectedSpike.id}`,
  prompt: selectedSpike.proposition,  // 命题成为深聊的 topic/seedPrompt
  answer: buildPreContext(selectedSpike), // 圆桌的关键论据作为 answer 的前置上下文
  isSaved: true,
};

// buildPreContext 生成的字符串示例：
`【此命题来自一场圆桌讨论，关键争议点如下】

支持方：
- ${selectedSpike.supporters[0].name}：${selectedSpike.supporters[0].coreArgument}
- ${selectedSpike.supporters[1].name}：${selectedSpike.supporters[1].coreArgument}

反对方：
- ${selectedSpike.opposers[0].name}：${selectedSpike.opposers[0].coreArgument}

核心论据：
${selectedSpike.keyArguments.map(a => '- ' + a).join('\n')}

【张力度：${selectedSpike.tensionScore}/5】

用户已选择此命题进入深聊，请老卢和老张围绕此命题展开高强度追问。
追问时可引用上述哲人的论点，让用户感受到"被多方夹击"的深度对话。`
```

**然后在 `crucible-orchestrator.ts` 的 `buildSocratesPrompt()` 中**：新增可选参数 `roundtableContext?: string`，如果存在就拼接到 system prompt 的背景部分：

```typescript
export const buildSocratesPrompt = (
  context: PromptContext,
  pair: CruciblePair,
  skillSummary: string,
  speakerSoul: string,
  roundtableContext?: string, // 新增
) => {
  // ... 现有逻辑 ...
  const backgroundSection = roundtableContext
    ? `\n\n【前置圆桌讨论背景】\n${roundtableContext}\n\n请在追问中自然引用上述争议，让用户感受到此命题已经经过多方碰撞。`
    : '';
  // 注入到 system prompt 的适当位置
};
```

### 4.4 前端如何展示 Spike 列表

**UI 示意**（Unit 6 实现）：

```
┌─ Spike 列表 (3) ─────────────────────────────────┐
│                                                   │
│  ★★★★★ 张力度 5/5            [导入深聊] [仅保存] │
│  AI 作为学习伙伴的真正风险不是"取代老师"，而是    │
│  让学生失去"被卡住然后自己爬出来"这个不可跳过的   │
│  认知经验                                         │
│  支持：汉娜·阿伦特、费曼  反对：查理·芒格         │
│  [展开详情 ▼]                                     │
│                                                   │
│  ─────────────────────────────────────────       │
│                                                   │
│  ★★★★☆ 张力度 4/5            [导入深聊] [仅保存] │
│  判断 AI 能否作为学习伙伴的关键变量不是 AI 的能力 │
│  强弱，而是家长/老师是否还能忍受孩子……            │
│  支持：查理·芒格、苏格拉底  反对：费曼            │
│  [展开详情 ▼]                                     │
│                                                   │
│  ─────────────────────────────────────────       │
│                                                   │
│  ★★★☆☆ 张力度 3/5            [导入深聊] [仅保存] │
│  让 AI 当学习伙伴的前置问题是：我们到底在为       │
│  未来 20 年的哪种"成人"培养孩子……                │
│  [展开详情 ▼]                                     │
│                                                   │
└───────────────────────────────────────────────────┘
```

用户可选择：
- **[导入深聊]**：该 spike 的 status 变为 `selected`，其他变为 `pending`，跳转到深聊界面
- **[仅保存]**：所有 spike 保持 `pending`，留在命题库中待后续选择

---

## 5. ljg-roundtable 精髓映射到多 LLM 架构

> 用户注：「确保吃到 ljg 原版 skill 精髓」

**ljg-roundtable 的核心精髓**（从原仓库提取的 5 条规律）：

1. **多角色辨识标签**：每个发言前加 `【人物名】【行动标签】`（陈述/质疑/补充/反驳/修正/综合）
2. **简言之压缩**：每次发言末尾用「简言之：……」15 字内压缩核心
3. **主持人用 ASCII 框架可视化**：把讨论结构画成矩阵/光谱/因果环路
4. **求真高于和谐**：不追求共识，鼓励最深的分歧被暴露
5. **行动指令明确**：参与者不是独白，必须**回应前一位的具体论点**

**问题**：ljg 原版是一次 LLM 调用生成整场讨论（多人在同一个 prompt 里）。GoldenCrucible 要做**每位哲人独立 LLM 调用**，如何保住这些精髓？

### 5.1 映射表

| ljg 精髓 | ljg 原版实现 | GoldenCrucible 映射 |
|---------|------------|---------------------|
| 行动标签 | 在单次 prompt 中约束所有参与者输出格式 | 每个哲人独立调用时在 system prompt 中强制输出 `{"action": "陈述\|质疑\|补充\|反驳\|修正\|综合"}` 字段 |
| 简言之压缩 | 同上 | 同上，强制输出 `{"briefSummary": "≤15 字"}` 字段 |
| ASCII 框架 | 主持人角色在同一 prompt 中产出 | 独立的 `moderator.synthesize()` 调用，专门负责综合 + 框架 |
| 求真高于和谐 | prompt 开头声明原则 | 每位哲人 system prompt 都包含此原则；对比锚点强化此原则 |
| 回应前一位 | 天然实现（单 prompt 内全部可见） | **靶子传递**：下一位的 prompt 中包含 `previousTurnTarget: {speaker, coreArgument}`，并强制要求"必须回应此论点" |
| 主持人引导 | 单 prompt 内完成 | 独立的 `moderator.openRound()` 调用 |

### 5.2 哲人独立调用的 Prompt 模板（复刻 ljg 行动标签格式）

**文件**：`server/roundtable-engine.ts` 中的 prompt 构建函数

```typescript
function buildPhilosopherPrompt(params: {
  persona: PersonaProfile;
  proposition: string;
  contrastAnchors: Array<{ name: string; stance: string }>; // 其他参与者的核心立场
  previousTurnTarget?: { speaker: string; coreArgument: string }; // 前一位的论点作为靶子
  roundIndex: number;
  roundMemory?: string; // 本哲人在前几轮说过的核心立场摘要
  directorInjection?: { type: 'tou' | 'ask'; content: string }; // 用户的投/？指令内容
}): string {
  const { persona, proposition, contrastAnchors, previousTurnTarget, roundIndex, roundMemory, directorInjection } = params;

  return `你现在是${persona.identity.name}（${persona.identity.era}，${persona.identity.oneLine}）。

【你的价值立场】
${persona.values.coreStance}

Haidt 道德基础量化（0-1）：
- 关怀/伤害: ${persona.values.care}
- 公平/欺骗: ${persona.values.fairness}
- 忠诚/背叛: ${persona.values.loyalty}
- 权威/颠覆: ${persona.values.authority}
- 圣洁/堕落: ${persona.values.sanctity}
- 自由/压迫: ${persona.values.liberty}

【你的修辞风格】
语调：${persona.rhetoric.tone}
句式：${persona.rhetoric.sentencePattern}
Ethos/Pathos/Logos 偏好：${persona.rhetoric.ethos} / ${persona.rhetoric.pathos} / ${persona.rhetoric.logos}

标志性语言（你可以使用类似风格但不要逐字套用）：
${persona.rhetoric.signaturePhrases.map(p => '  - ' + p).join('\n')}

${persona.mentalModels ? `【你的核心心智模型】
${persona.mentalModels.map(m => `  - ${m.name}：${m.description}`).join('\n')}
` : ''}

${persona.honestBoundaries?.wontClaim ? `【你绝不会说的话】
${persona.honestBoundaries.wontClaim.map(w => '  - ' + w).join('\n')}
` : ''}

【本场圆桌命题】
${proposition}

【其他参与者及其核心立场（你必须与至少一位形成张力）】
${contrastAnchors.map(a => `  - ${a.name}：${a.stance}`).join('\n')}

${previousTurnTarget ? `【你必须回应的上一位发言（靶子传递）】
${previousTurnTarget.speaker} 刚刚说：
"${previousTurnTarget.coreArgument}"

你的发言必须包含对这个论点的直接回应（可以赞同并深化、可以质疑、可以反驳、可以修正），不允许完全忽略它。
` : ''}

${roundMemory ? `【你在本场讨论中已有的立场（防止漂移）】
${roundMemory}
你现在的发言应与上述立场连贯，除非你主动承认被前面的论点说服并转向——这种情况下必须明确说"我收回之前的说法"。
` : ''}

${directorInjection ? (
  directorInjection.type === 'tou'
    ? `【旁观者（用户）刚刚投入了一个观点，你必须先回应这个观点再继续讨论】
"${directorInjection.content}"
`
    : `【主持人直接向你提问，请优先回答】
"${directorInjection.content}"
`
) : ''}

【讨论原则】
- 求真高于和谐。不追求共识，暴露最深的分歧。
- 挖深不铺广：本轮聚焦一条最深的裂缝，不列举 5 个要点。
- 你必须保持你自己的个性，不要像"综合陈词"一样中立。
- 本轮是第 ${roundIndex} 轮。

【输出格式 - 严格 JSON】
{
  "action": "陈述" | "质疑" | "补充" | "反驳" | "修正" | "综合",
  "utterance": "你的正式发言内容（150-400 字，符合你的修辞风格）",
  "briefSummary": "≤15 字的核心压缩",
  "challengedTarget": "${previousTurnTarget ? '你回应的哪一位及其哪一点' : 'null'}",
  "stanceVector": {
    "carePriority": 0-1 浮点,
    "libertyPriority": 0-1 浮点,
    "authorityPriority": 0-1 浮点
  }
}

只返回 JSON，不要任何解释或 markdown 代码块。`;
}
```

### 5.3 主持人 Prompt 模板（开场 + 综合）

```typescript
function buildModeratorOpenPrompt(proposition: string, selectedPersonas: PersonaProfile[]): string {
  return `你是一场哲人圆桌的主持人。命题是：

"${proposition}"

参与者：
${selectedPersonas.map(p => `  - ${p.identity.name}（${p.identity.oneLine}）`).join('\n')}

请生成开场白：
1. 用 1-2 句话点出命题中最值得辩的**核心张力**
2. 用一张 ASCII 框架图展示你预期的争议维度（矩阵/光谱/因果环路三选一）
3. 指出第一轮希望聚焦的焦点问题

严格 JSON 输出：
{
  "focusPoint": "本轮聚焦的核心问题（1 句）",
  "asciiFramework": "ASCII 字符画（多行字符串）",
  "nextLayerQuestion": "希望参与者回应的具体问题"
}`;
}

function buildModeratorSynthesizePrompt(
  proposition: string,
  roundTurns: Array<{ speaker: string; utterance: string; action: string; briefSummary: string }>,
  roundIndex: number,
): string {
  return `你是圆桌主持人。以下是第 ${roundIndex} 轮的发言：

命题："${proposition}"

${roundTurns.map((t, i) => `${i + 1}. 【${t.speaker}】【${t.action}】
"${t.utterance}"
（简言之：${t.briefSummary}）`).join('\n\n')}

请完成综合：
1. 提取本轮暴露出的**最深裂缝**（不是罗列观点，是点出真正的冲突）
2. 用 ASCII 框架可视化这条裂缝（矩阵/光谱/因果环路）
3. 给出下一轮应该聚焦的问题

严格 JSON 输出：
{
  "focusPoint": "最深裂缝的一句话描述",
  "asciiFramework": "ASCII 字符画",
  "nextLayerQuestion": "下一轮应该追问的问题",
  "tensionLevel": 1-5 整数
}`;
}
```

### 5.4 Speaker Selection Prompt 模板

```typescript
function buildSpeakerSelectionPrompt(proposition: string, allPersonas: PersonaProfile[]): string {
  return `从以下候选人中选 3-5 位最适合讨论此命题的，要求**立场张力最大化**。

命题："${proposition}"

候选人（${allPersonas.length} 位）：
${allPersonas.map(p => `- slug: ${p.identity.slug}
  name: ${p.identity.name}
  domain: ${p.identity.domain.join(', ')}
  stance: ${p.values.coreStance}`).join('\n\n')}

选择原则：
1. 至少覆盖 2 种对立立场（不要都是同阵营）
2. 至少跨 2 个不同 domain（不要都是哲学家或都是科学家）
3. 优先选择 Haidt MFT 向量距离大的组合（欧氏距离 > 0.5）

严格 JSON 输出：
{
  "selected": ["slug1", "slug2", "slug3"],
  "rationale": "为什么这个组合能产生张力（1-2 句）"
}`;
}
```

### 5.5 关键工程纪律

1. **每个 LLM 调用都独立**：一场 3 人 3 轮的讨论 = 1（Speaker Selection）+ 1（Moderator Open）+ 3×3（哲人）+ 3（Moderator Synthesize）+ 1（Spike Extract）= **14 次调用**。延迟需通过并行 + SSE 流式掩盖。
2. **同一轮内可并行**：同一轮的多位哲人发言**不并行**（因为有靶子传递依赖顺序），但主持人开场和第一位哲人发言可以在前端通过"类打字机"动画掩盖延迟。
3. **每次调用必须带 fallback**：超时/格式错误时跳过该哲人，log warning，不中断整轮。
4. **JSON 解析用 Zod**：所有 LLM 输出必须走 Zod 校验，非法输出走 fallback。
5. **温度分层**：哲人发言 temperature=0.85（要个性），主持人 temperature=0.4（要结构），Speaker Selection temperature=0.2（要确定性）。

---

## 6. UI 樱桃迁移策略（Unit 6-7）

> 用户注：「在确保与 SAAS 和 SSE 兼容的情况下，尽量往 claudecode 风格调整，且后续要便于摘樱桃把这部分 UI 优化迁移到 SSE & SAAS」

### 6.1 设计原则

1. **CSS 变量隔离**：所有 Claude Code 风格变更**只改 `src/index.css` 的 CSS 变量值**，不改组件结构、不改 Tailwind 配置（或最小改）。这样后续迁移到 SaaS 只要拷贝 CSS 变量块。
2. **新增组件独立目录**：`src/components/roundtable/*` 整个目录独立，不与 crucible 现有组件混居。这样迁移时整个目录打包迁。
3. **Sidebar 组件解耦**：`Sidebar.tsx` 内部不依赖 crucible 或 roundtable 的任何具体状态，只通过 props 传入入口配置。这样 SaaS 端可复用组件但注入不同入口。
4. **SSE 事件 type 前缀化**：roundtable 相关的 SSE 事件都用 `roundtable_*` 前缀（`roundtable_turn`, `roundtable_synthesis` 等），与 crucible 的 `turn`/`error`/`done` 明确分隔，避免迁移时命名冲突。

### 6.2 迁移清单（未来摘樱桃时只需拷贝这些文件）

**配色/字体迁移包**：
- `src/index.css` 的 `:root` 变量块（只需 diff 这一段）

**圆桌功能迁移包**：
- `src/components/Sidebar.tsx`（修改版 header）
- `src/components/roundtable/` 整个目录
- `src/components/crucible/sse.ts` 的**新增** case（diff 出新增行）
- `src/components/crucible/types.ts` 的**新增** SSE event types（diff 出新增行）

**后端迁移包**（已天然独立）：
- `server/persona-*.ts`
- `server/roundtable-*.ts`
- `server/spike-extractor.ts`
- `server/proposition-sharpener.ts`
- `personas/` 目录
- `server/crucible-orchestrator.ts` 的 `roundtableContext?` 参数（diff 出这一参数）
- `server/crucible-persistence.ts` 的 artifact type 扩展（diff 出 type 值的新增）

### 6.3 Claude Code 风格 CSS 变量值

```css
:root {
  /* ========== Claude Code 风格（替换现有值） ========== */
  --shell-bg: #1a1a1a;              /* 深色主背景 */
  --shell-bg-strong: #0f0f0f;       /* 更深 */
  --surface-0: rgba(26, 26, 26, 0.85);
  --surface-1: #1f1f1f;             /* 卡片底 */
  --surface-2: #262626;             /* 层级 2 */
  --surface-3: #2d2d2d;             /* 层级 3 */
  --line-soft: rgba(255, 255, 255, 0.08);
  --line-strong: rgba(255, 255, 255, 0.14);
  --ink-1: #ececec;                 /* 主文字 */
  --ink-2: #a0a0a0;                 /* 次文字 */
  --ink-3: #6b6b6b;                 /* 辅助文字 */
  --accent: #d97757;                /* Claude 橙 */
  --accent-soft: rgba(217, 119, 87, 0.15);
  --accent-muted: #a85a3f;

  /* ========== 字体 ========== */
  font-family: "SF Mono", "JetBrains Mono", "Fira Code", "Menlo", "Consolas", monospace;
  /* 正文区域可在组件内覆盖为 'Inter', -apple-system, sans-serif */
}
```

**验收**：OpenCode 团队应准备两张截图——改动前（暖色米黄）vs 改动后（Claude Code 深色）——对比发给老杨确认。

### 6.4 Sidebar 布局骨架

```typescript
// src/components/Sidebar.tsx
interface SidebarProps {
  entries: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
    badge?: number | string;
    isActive?: boolean;
  }>;
  spikeLibrary?: ReactNode; // 注入命题库（可选）
  footer?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}
```

**注意**：Sidebar 不导入任何 crucible/roundtable 模块，全部通过 props 注入。这样 SaaS 端复用时不用拖依赖。

---

## 7. 逐 Unit 实施指南

### Unit 1: PersonaProfile 契约 + Loader + 7 人物

**步骤 1.1**：创建 `server/persona-types.ts`，拷贝第 3.1 节的接口定义。

**步骤 1.2**：创建 `server/persona-loader.ts`，实现：

```typescript
import fs from 'node:fs';
import path from 'node:path';
import { PersonaProfileSchema, type PersonaProfile } from './persona-types';

const PERSONAS_DIR = path.resolve(process.cwd(), 'personas');
const personasCache = new Map<string, PersonaProfile>();
let watcherInitialized = false;

export function loadAllPersonas(): PersonaProfile[] {
  if (!fs.existsSync(PERSONAS_DIR)) {
    console.warn(`[persona-loader] personas dir not found: ${PERSONAS_DIR}`);
    return [];
  }
  const files = fs.readdirSync(PERSONAS_DIR).filter(f => f.endsWith('.json'));
  personasCache.clear();
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(PERSONAS_DIR, file), 'utf-8');
      const json = JSON.parse(raw);
      const parsed = PersonaProfileSchema.parse(json);
      personasCache.set(parsed.identity.slug, parsed);
      console.log(`[persona-loader] loaded: ${parsed.identity.name} (${parsed.identity.slug}) v${parsed.meta.version}`);
    } catch (err) {
      console.warn(`[persona-loader] failed to load ${file}:`, err);
    }
  }
  return Array.from(personasCache.values());
}

export function getAllPersonas(): PersonaProfile[] {
  if (personasCache.size === 0) loadAllPersonas();
  return Array.from(personasCache.values());
}

export function getPersonaBySlug(slug: string): PersonaProfile | undefined {
  if (personasCache.size === 0) loadAllPersonas();
  return personasCache.get(slug);
}

export function getPersonasByDomain(domain: string): PersonaProfile[] {
  return getAllPersonas().filter(p => p.identity.domain.includes(domain));
}

export function watchPersonas(): void {
  if (watcherInitialized || !fs.existsSync(PERSONAS_DIR)) return;
  fs.watch(PERSONAS_DIR, { persistent: false }, (event, filename) => {
    if (filename?.endsWith('.json')) {
      console.log(`[persona-loader] ${event} detected: ${filename}, reloading...`);
      loadAllPersonas();
    }
  });
  watcherInitialized = true;
}
```

**步骤 1.3**：创建 `personas/` 目录，写入第 3.2 节的 7 个 JSON 文件。

**步骤 1.4**：在 `server/index.ts` 启动时调用 `loadAllPersonas()` + `watchPersonas()`。

**步骤 1.5**：写 `server/__tests__/persona-loader.test.ts`，覆盖：
- 加载 7 个 happy path
- 缺必填字段的文件被跳过
- 只有必填字段也能加载成功
- 热插拔：写入新文件后 `getAllPersonas()` 包含新人物
- 空目录不崩溃

**验收 checklist**：
- [ ] 启动服务后日志打印 7 个人物名称
- [ ] 手写一个测试 JSON 放入 `personas/`（比如 `test-persona.json`），无需重启，下次 `getAllPersonas()` 返回 8 个
- [ ] 删除必填字段（如 `identity.name`）后启动，该文件被跳过并 warn，其他 6 个正常
- [ ] 全部测试 pass

---

### Unit 2: 命题锐化模块

**步骤 2.1**：创建 `server/proposition-sharpener.ts`

```typescript
import { callConfiguredLlm } from './llm'; // 沿用现有 LLM 调用方式
import { z } from 'zod';

const SharpenResultSchema = z.object({
  isSharp: z.boolean(),
  sharpened: z.string().optional(),
  clarifyingQuestions: z.array(z.string()).max(3).optional(),
  reasoning: z.string().optional(),
});

export type SharpenResult = z.infer<typeof SharpenResultSchema>;

export async function sharpenProposition(rawTopic: string): Promise<SharpenResult> {
  const prompt = `用户输入了一个议题，请判断它是否已经是一个可辩论的明确命题。

议题：${rawTopic}

判断标准：
- 可辩论的明确命题：有立场、有张力、能被反对
  例：'生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴'
- 模糊议题：只是一个话题/领域，没有立场
  例：'AI 会改变教育'（这只是一个观察，不是可辩论的命题）

如果已经明确，返回 { "isSharp": true, "sharpened": "优化后的命题（可微调措辞）" }
如果模糊，返回 { "isSharp": false, "clarifyingQuestions": ["问题1", "问题2", "问题3"] }
  clarifyingQuestions 应帮用户收窄立场和范围，最多 3 个，要有针对性。

严格 JSON 输出，不要 markdown。`;

  try {
    const raw = await callConfiguredLlm({ prompt, temperature: 0.3 });
    const json = JSON.parse(raw);
    return SharpenResultSchema.parse(json);
  } catch (err) {
    console.warn('[proposition-sharpener] LLM call failed, fallback to isSharp=true:', err);
    // Fallback：让用户直接进圆桌，不阻塞
    return { isSharp: true, sharpened: rawTopic };
  }
}

export async function applySharpening(rawTopic: string, userAnswers: string[]): Promise<string> {
  const prompt = `用户原始议题：${rawTopic}

用户回答了澄清问题：
${userAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n')}

请综合以上信息，产出一个可辩论的明确命题（一句话，有立场，有张力）。

严格 JSON 输出：{ "sharpened": "最终命题" }`;

  try {
    const raw = await callConfiguredLlm({ prompt, temperature: 0.4 });
    const json = JSON.parse(raw);
    return String(json.sharpened || rawTopic);
  } catch (err) {
    console.warn('[proposition-sharpener] applySharpening failed:', err);
    return rawTopic;
  }
}
```

**步骤 2.2**：在 `server/crucible.ts` 中新增端点：

```typescript
// POST /api/roundtable/sharpen { topic: string }
// POST /api/roundtable/sharpen/apply { topic: string, answers: string[] }
```

（复用现有 Express 路由注册模式，参考 crucible.ts 中现有 turn 端点）

**验收 checklist**：
- [ ] `curl -X POST localhost:PORT/api/roundtable/sharpen -d '{"topic":"AI 会改变教育"}'` 返回 `isSharp:false` + questions
- [ ] 传入明确命题返回 `isSharp:true`
- [ ] LLM 故障时 fallback 返回 `isSharp:true`

---

### Unit 3: 圆桌引擎核心

**这是最大最难的 Unit。** 必须严格按顺序实施：

**步骤 3.1**：创建 `server/roundtable-types.ts`

```typescript
import { z } from 'zod';

export const RoundtableTurnSchema = z.object({
  action: z.enum(['陈述', '质疑', '补充', '反驳', '修正', '综合']),
  utterance: z.string(),
  briefSummary: z.string().max(30),
  challengedTarget: z.string().nullable(),
  stanceVector: z.object({
    carePriority: z.number().min(0).max(1),
    libertyPriority: z.number().min(0).max(1),
    authorityPriority: z.number().min(0).max(1),
  }).optional(),
});

export const ModeratorSynthesisSchema = z.object({
  focusPoint: z.string(),
  asciiFramework: z.string(),
  nextLayerQuestion: z.string(),
  tensionLevel: z.number().min(1).max(5).optional(),
});

export type RoundtableTurn = z.infer<typeof RoundtableTurnSchema>;
export type ModeratorSynthesis = z.infer<typeof ModeratorSynthesisSchema>;

export interface RoundtableSession {
  id: string;
  proposition: string;
  selectedSlugs: string[];
  rounds: Array<{
    index: number;
    turns: Array<{ speakerSlug: string; turn: RoundtableTurn; timestamp: string }>;
    synthesis?: ModeratorSynthesis;
  }>;
  status: 'active' | 'awaiting_command' | 'extracting' | 'done';
  createdAt: string;
  updatedAt: string;
}

export type DirectorCommand =
  | { type: 'ke' /* 可 */ }
  | { type: 'zhi' /* 止 */ }
  | { type: 'deepen' /* 深入此节 */ }
  | { type: 'swap', newSlug: string /* 换人 */ }
  | { type: 'tou', content: string /* 投 */ }
  | { type: 'ask', targetSlug: string, question: string /* ? */ };

// SSE event types
export type RoundtableSseEvent =
  | { event: 'roundtable_selection'; data: { session: RoundtableSession; selectedPersonas: Array<{ slug: string; name: string }> } }
  | { event: 'roundtable_synthesis'; data: { roundIndex: number; synthesis: ModeratorSynthesis } }
  | { event: 'roundtable_turn'; data: { roundIndex: number; speakerSlug: string; speakerName: string; turn: RoundtableTurn } }
  | { event: 'roundtable_awaiting'; data: { roundIndex: number } }
  | { event: 'roundtable_extracting'; data: {} }
  | { event: 'roundtable_spikes_ready'; data: { spikes: any[] } } // 引用 spike-extractor 的类型
  | { event: 'roundtable_error'; data: { message: string; phase: string } }
  | { event: 'roundtable_done'; data: { sessionId: string } };
```

**步骤 3.2**：创建 `server/roundtable-engine.ts` — 核心编排逻辑。结构：

```typescript
// 公共 API
export async function startRoundtable(params: {
  proposition: string;
  sessionId?: string;
  res: Response; // SSE 响应流
}): Promise<void>

export async function handleDirectorCommand(params: {
  sessionId: string;
  command: DirectorCommand;
  res: Response;
}): Promise<void>

// 内部
async function selectSpeakers(proposition: string): Promise<PersonaProfile[]>
async function runSingleRound(session: RoundtableSession, res: Response, directorInjection?: { type, content }): Promise<void>
async function callPhilosopher(persona, promptParams): Promise<RoundtableTurn>
async function callModeratorOpen(proposition, selectedPersonas): Promise<ModeratorSynthesis>
async function callModeratorSynthesize(proposition, turns, roundIndex): Promise<ModeratorSynthesis>
```

**关键实现要点**：

1. **Session 状态存储**：用内存 Map 存 active sessions，key 是 sessionId。考虑崩溃恢复 → 同步写入 `runtime/roundtable-sessions/${sessionId}.json`。
2. **SSE 事件写入**：复用 `crucible.ts` 中的 `writeSseEvent` 模式（拷贝一份改个名叫 `writeRoundtableSseEvent`）。
3. **LLM 调用**：复用 `server/llm.ts` 的 `callConfiguredLlm`，温度分层见 5.5 节。
4. **每个哲人一次调用**：for 循环（不是并行，要靶子传递）。
5. **Fallback**：单个哲人调用失败 → `roundtable_error` 事件（phase: 'turn'） + 跳过继续。
6. **轮内记忆**：简单实现 = 把该哲人上一轮的 `utterance` 作为 `roundMemory` 传入。

**步骤 3.3**：在 `server/crucible.ts` 注册新端点：

```typescript
// POST /api/roundtable/turn/stream (SSE)
// POST /api/roundtable/director (接收导演指令，返回 SSE 继续流)
// GET /api/roundtable/session/:id (查询 session 状态)
```

**步骤 3.4**：在 `server/crucible-orchestrator.ts` 中新增 `buildSocratesPrompt` 的 `roundtableContext?` 参数（为 Unit 5 准备）。

**测试场景**（参考 Plan 文件 Unit 3 的 test scenarios，此处不重复）。

**验收 checklist**：
- [ ] 纯 API 测试：`curl` 发起 `/api/roundtable/turn/stream`，SSE 客户端收到完整事件序列
- [ ] 3 位哲人发言在立场和措辞上可明显区分
- [ ] 第 2 轮的哲人 prompt 包含第 1 轮的靶子传递（通过 log 验证）
- [ ] `投` 指令后下一轮发言引用了用户观点
- [ ] 单个哲人 LLM 超时不阻塞整轮
- [ ] 刷新页面能通过 sessionId 恢复讨论状态

---

### Unit 4: Spike 提取 + 持久化

**步骤 4.1**：创建 `server/spike-extractor.ts`

```typescript
import { callConfiguredLlm } from './llm';
import { z } from 'zod';
import type { RoundtableSession } from './roundtable-types';

export const SpikeSchema = z.object({
  id: z.string(),
  proposition: z.string(),
  supporters: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    coreArgument: z.string(),
  })),
  opposers: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    coreArgument: z.string(),
  })),
  keyArguments: z.array(z.string()),
  tensionScore: z.number().min(1).max(5),
  sourceRoundIndices: z.array(z.number()),
  tags: z.array(z.string()).optional(),
  status: z.enum(['pending', 'selected', 'archived']),
});

export type Spike = z.infer<typeof SpikeSchema>;

export async function extractSpikes(session: RoundtableSession): Promise<Spike[]> {
  const transcript = session.rounds.map(r =>
    `【第 ${r.index} 轮】\n${r.turns.map(t => `[${t.speakerSlug}] ${t.turn.utterance}`).join('\n')}`
  ).join('\n\n');

  const prompt = `以下是一场哲人圆桌讨论的完整记录。请提取 2-3 个最有张力的 Spike（结构化争议命题）。

命题：${session.proposition}
参与者：${session.selectedSlugs.join(', ')}

讨论记录：
${transcript}

提取规则：
1. 每个 Spike 必须是一个可被反对的具体命题，不能是空泛总结
2. 每个 Spike 至少有 1 位支持者 + 1 位反对者（从参与者中选）
3. 张力度 1-5：5 = 参与者立场差距最大，1 = 只是角度不同
4. 每个 Spike 必须引用至少 2-3 条核心论据（直接引用哲人原话的精神）
5. 优先选择"用户初始议题里没想到的角度"作为 Spike

严格 JSON 输出：
{
  "spikes": [
    {
      "proposition": "...",
      "supporters": [{ "slug": "...", "name": "...", "coreArgument": "..." }],
      "opposers": [{ "slug": "...", "name": "...", "coreArgument": "..." }],
      "keyArguments": ["...", "...", "..."],
      "tensionScore": 1-5,
      "sourceRoundIndices": [1, 2, 3],
      "tags": ["..."]
    }
  ]
}`;

  try {
    const raw = await callConfiguredLlm({ prompt, temperature: 0.5 });
    const parsed = JSON.parse(raw);
    return parsed.spikes.map((s: any, i: number) => ({
      ...s,
      id: `spike_${session.id}_${String(i + 1).padStart(2, '0')}`,
      status: 'pending' as const,
    }));
  } catch (err) {
    console.warn('[spike-extractor] extraction failed:', err);
    return [];
  }
}
```

**步骤 4.2**：扩展 `server/crucible-persistence.ts` 的 artifact type：

```typescript
// 原来的 type 字段
type: 'reference' | 'quote' | 'asset';
// 扩展为
type: 'reference' | 'quote' | 'asset' | 'spike' | 'roundtable_transcript';
```

**步骤 4.3**：创建新函数 `saveRoundtableArtifacts(sessionId, spikes, transcript)`，写入 conversation artifacts。

**步骤 4.4**：在 `roundtable-engine.ts` 的 `止` 指令处理中调用 `extractSpikes` 并保存。

**验收 checklist**：
- [ ] 传入一个 3 轮讨论 session，提取出 2-3 个 Spike（每个结构完整）
- [ ] Spike 持久化后，从 conversation artifacts 读回一致
- [ ] 选中某 Spike 后其状态变为 `selected`，其他仍为 `pending`
- [ ] LLM 提取失败时不丢失 transcript（transcript 单独保存）

---

### Unit 5: Spike→深聊桥接 + 接口预留

**步骤 5.1**：创建 `server/roundtable-bridge.ts`

```typescript
import type { Spike } from './spike-extractor';
import type { InputCard } from './crucible-orchestrator';

export function convertSpikeToInputCard(spike: Spike): InputCard {
  return {
    id: `card_from_${spike.id}`,
    prompt: spike.proposition,
    answer: buildPreContext(spike),
    isSaved: true,
  };
}

export function buildRoundtableContextString(spike: Spike): string {
  return `【此命题来自一场圆桌讨论，关键争议点如下】

支持方：
${spike.supporters.map(s => `- ${s.name}：${s.coreArgument}`).join('\n')}

反对方：
${spike.opposers.map(s => `- ${s.name}：${s.coreArgument}`).join('\n')}

核心论据：
${spike.keyArguments.map(a => '- ' + a).join('\n')}

【张力度：${spike.tensionScore}/5】

请老卢和老张围绕此命题展开高强度追问，可引用上述哲人的论点。`;
}

function buildPreContext(spike: Spike): string {
  return buildRoundtableContextString(spike);
}
```

**步骤 5.2**：创建 `server/roundtable-interfaces.ts`（纯接口，不实现）

```typescript
// R27: 初命题入口接口（未来信息采集模块的对接点）
export interface TopicIngestionInput {
  topic: string;
  context?: string;
  source: 'user' | 'rss' | 'wechat' | 'x' | 'daily_digest';
  metadata?: Record<string, unknown>;
}

// R28: 灵魂文件筛选接口（未来对接点）
export interface SoulProfile {
  userId: string;
  valuePreferences: Record<string, number>;
  recentInterests: string[];
  // ... 待扩展
}

export interface TopicCandidate {
  topic: string;
  source: string;
  relevanceScore?: number;
}

export interface SoulFilterInput {
  candidates: TopicCandidate[];
  soulProfile: SoulProfile;
}

export interface SoulFilterOutput {
  filtered: TopicCandidate[];
  rationale?: string;
}

// 这两个接口只定义，本期不实现 — 只是占位，避免未来对接时没有契约
```

**步骤 5.3**：修改 `crucible-orchestrator.ts` 的 `buildSocratesPrompt`：

```typescript
export const buildSocratesPrompt = (
  context: PromptContext,
  pair: CruciblePair,
  skillSummary: string,
  speakerSoul: string,
  roundtableContext?: string, // 新增（可选，向后兼容）
) => {
  // ... 现有逻辑 ...
  const backgroundSection = roundtableContext
    ? `\n\n${roundtableContext}\n`
    : '';
  // 拼接到现有 system prompt 的适当位置
};
```

**步骤 5.4**：在 `crucible.ts` 的 `/api/crucible/turn/stream` 端点中接收可选的 `spikeId` 参数，如果存在则：
1. 从 persistence 读取该 spike artifact
2. 调用 `buildRoundtableContextString(spike)` 产出 context 字符串
3. 将 context 传入 `buildSocratesPrompt` 的 `roundtableContext` 参数

**验收 checklist**：
- [ ] 选中 spike → 启动深聊 → 第一轮老卢的发言明确引用了圆桌中某位哲人的论点
- [ ] `spikeId` 为空时走原有逻辑，0 影响现有深聊
- [ ] 接口定义 TypeScript 编译通过，可被其他模块 import

---

### Unit 6: 前端 — 侧边栏 + 圆桌导演 UI

**步骤 6.1**：创建 `src/components/Sidebar.tsx` — 纯展示组件，见 6.4 节骨架

**步骤 6.2**：创建 `src/components/roundtable/types.ts` — 前端类型

```typescript
// 镜像后端的 SSE event 类型，但用前端友好的命名
export interface RoundtableTurnView {
  roundIndex: number;
  speakerSlug: string;
  speakerName: string;
  avatarEmoji: string;
  action: '陈述' | '质疑' | '补充' | '反驳' | '修正' | '综合';
  utterance: string;
  briefSummary: string;
  challengedTarget?: string;
  timestamp: string;
}

export interface SynthesisView {
  roundIndex: number;
  focusPoint: string;
  asciiFramework: string;
  nextLayerQuestion: string;
  tensionLevel?: number;
}

export interface SpikeView {
  id: string;
  proposition: string;
  supporters: Array<{ slug: string; name: string; coreArgument: string }>;
  opposers: Array<{ slug: string; name: string; coreArgument: string }>;
  keyArguments: string[];
  tensionScore: number;
  status: 'pending' | 'selected' | 'archived';
}

export type RoundtableStatus = 'idle' | 'sharpening' | 'selecting' | 'discussing' | 'awaiting' | 'extracting' | 'done';
```

**步骤 6.3**：创建 `src/components/roundtable/RoundtableView.tsx` — 主容器

核心职责：
1. 状态机：`idle → sharpening → selecting → discussing → awaiting → extracting → done`
2. SSE 客户端：用现有 `readSseStream()`，对 event type 做 switch case
3. 渲染各状态下的 UI
4. 发送导演指令 HTTP 请求

**步骤 6.4**：创建 `src/components/roundtable/DirectorControls.tsx`

UI 骨架：

```
┌─ 导演指令 ────────────────────────────────────┐
│ [可] [止] [深入此节] [换人]                    │
│                                                 │
│ 投入观点：                                      │
│ [________________________] [投]                 │
│                                                 │
│ 追问：[选择哲人▼] [________] [？]                │
└────────────────────────────────────────────────┘
```

按钮点击发送 `POST /api/roundtable/director { sessionId, command }`。

**步骤 6.5**：创建 `src/components/roundtable/SpikeLibrary.tsx` — 命题库展示

**步骤 6.6**：修改 `src/components/crucible/sse.ts` — 处理新 SSE event types（新增 case，不改旧 case）。

**步骤 6.7**：修改 `src/App.tsx` — 引入 `Sidebar`，header 精简。

**验收 checklist**：
- [ ] 三条路径入口清晰可见（卡片式）
- [ ] 圆桌讨论中 SSE 事件实时逐个渲染（打字机效果可选）
- [ ] 导演指令按钮工作正常
- [ ] Spike 列表展示与第 4 节示例格式一致
- [ ] 侧边栏可折叠
- [ ] 选中 Spike 后跳转到深聊，深聊中能看到圆桌上下文被引用

---

### Unit 7: GUI 风格对齐

**步骤 7.1**：替换 `src/index.css` 的 `:root` 变量值为 6.3 节的 Claude Code 风格值。

**步骤 7.2**：如需字体，在 `tailwind.config.ts` 中添加：

```typescript
theme: {
  extend: {
    fontFamily: {
      mono: ['"SF Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
    },
  },
},
```

**步骤 7.3**：截图对比验收。

**验收 checklist**：
- [ ] 截图对比：改动前 vs 改动后 vs Claude Code 真实界面
- [ ] 所有现有页面（深聊、分发、市场等）在新配色下仍可读
- [ ] 无组件结构变化

---

## 8. 交接 Checklist（完工前必过）

### 8.1 代码质量

- [ ] 所有新增 `.ts` 文件通过 `tsc --noEmit`
- [ ] 所有新增测试文件 pass
- [ ] 无 `any` 滥用（特别是 SSE event payload）
- [ ] 所有 LLM 调用都有 Zod 校验 + fallback
- [ ] 引擎代码中无任何硬编码的哲人名字/口头禅

### 8.2 功能验收

- [ ] 路径 A（完整管道）可跑通：议题 → 锐化 → 圆桌 → Spike → 选 1 → 深聊
- [ ] 路径 B（纯圆桌）可跑通：议题 → 锐化 → 圆桌 → 保留所有 Spike
- [ ] 路径 C（直接深聊）可跑通：议题 → 深聊（不受影响）
- [ ] 6 种导演指令（可/止/深入/换人/投/？）均有对应行为
- [ ] 未选中 Spike 保留在命题库，可随时二次选择
- [ ] 热插拔：新增 persona JSON 无需重启即可用

### 8.3 鲁棒性验收

- [ ] 单个哲人 LLM 超时：整轮不崩溃，有 warning log
- [ ] LLM 返回非 JSON：走 fallback 不崩溃
- [ ] 前端刷新后：通过 sessionId 恢复当前讨论状态
- [ ] `personas/` 目录为空：不崩溃，日志提示
- [ ] 缺必填字段的 JSON：跳过，其他人物正常加载

### 8.4 差异性验收（核心质量指标）

- [ ] 挑 3 场完整讨论，检查：任意两位哲人的发言**无需看名字也可区分**（tone + 立场）
- [ ] 至少 1 个 Spike 是用户初始议题里未预料到的角度
- [ ] 同一位哲人跨轮立场连贯（无人格漂移）
- [ ] Spike 进入深聊后老卢老张至少引用 1 次哲人论点

### 8.5 迁移准备（SSE/SaaS 兼容）

- [ ] 所有新增前端文件集中在 `src/components/roundtable/` 和 `src/components/Sidebar.tsx`
- [ ] CSS 变更只在 `src/index.css` 的 `:root` 块
- [ ] 后端新增文件独立于现有 crucible 文件（除了 orchestrator/persistence 的小增量）
- [ ] SSE 事件 type 全部用 `roundtable_*` 前缀
- [ ] 写一份 `docs/dev_logs/2026-0X-XX_roundtable_delivery.md`，记录实施过程和迁移清单

### 8.6 文档

- [ ] `docs/04_progress/dev_progress.md` 更新
- [ ] 如有纠正过的问题，更新 `docs/04_progress/rules.md`
- [ ] README 或文档中提及圆桌功能入口

---

## 9. 风险提示与求救信号

**可能卡住的地方**，遇到时不要自己硬撑，立即反馈给老杨：

1. **多 LLM 调用延迟过高**（单轮 > 30 秒）：先在日志里打印每个调用耗时分布，再决定是否需要并行/换模型/减少轮数。不要盲目加 timeout。
2. **差异性不足**（两位哲人发言像同一个人）：先 dump 实际 prompt 看对比锚点有没有真正注入，再考虑调整 temperature 或重写 PersonaProfile 的 `coreStance` 字段。**不要上 embedding 后置校验**（违反设计决策）。
3. **Spike 提取不稳定**（有时 0 个有时 5 个）：先 dump LLM 原始返回，检查是 JSON 解析失败还是 LLM 偏离了数量要求。temperature 降到 0.3 通常能稳定。
4. **前端 SSE 事件顺序错乱**：检查 `consumeSseBuffer` 的 buffer 处理，可能是事件边界 `\n\n` 被分片。
5. **持久化 schema 迁移导致旧会话打不开**：新增 artifact type 必须做**向后兼容**（未知 type 时降级为 `'reference'` 展示，不崩溃）。

**求救信号**：一个问题卡超过 2 小时没进展 → 在群里 @老杨，附上：
- 当前卡住的 Unit 编号和子步骤
- 已尝试的 2-3 个方向和各自的失败原因
- 相关代码/日志链接

---

## 10. 参考资料

- **Plan 文件**（本手册的上位文档）：[`docs/plans/2026-04-09-001-feat-roundtable-engine-plan.md`](./2026-04-09-001-feat-roundtable-engine-plan.md)
- **PRD 原文**：[`docs/brainstorms/2026-04-09-roundtable-and-gui-redesign-requirements.md`](../brainstorms/2026-04-09-roundtable-and-gui-redesign-requirements.md)
- **人格引擎独立研究需求**：[`docs/brainstorms/2026-04-09-persona-engine-research-brief.md`](../brainstorms/2026-04-09-persona-engine-research-brief.md)
- **现有代码关键文件**：
  - `server/crucible.ts` — SSE 模式参考
  - `server/crucible-orchestrator.ts` — prompt 构建模式参考
  - `server/crucible-persistence.ts` — artifact 存储模式参考
  - `src/components/crucible/sse.ts` — SSE 解析参考
  - `src/components/crucible/types.ts` — 类型定义参考
- **外部参考**：
  - [lijigang/ljg-skill-roundtable](https://github.com/lijigang/skill-roundtable) — 辩论编排灵感
  - [alchaincyf/nuwa-skill](https://github.com/alchaincyf/nuwa-skill) — 人格蒸馏（二期参考）

---

## 11. 最终叮嘱（老杨语）

做这件事时请记住：

1. **核心竞争力是数据协议和流程编排，不是 UI**。PersonaProfile 接口的开放性是这个项目的灵魂，不要在引擎里给任何哲人开后门。
2. **宁可少一个功能，不要一个半成品功能**。每个 Unit 完工都要严格过验收 checklist，不要"先合进去再说"。
3. **不懂就问**，不要憋着。这是一个交接项目，卡住 2 小时立刻找老杨比硬撑 1 天有价值得多。
4. **验证差异性是最高优先级**。如果 4 位哲人听起来像 4 个模板复制的影子，这个项目的价值就崩了——宁可推迟 1 周打磨对比约束，也不要在差异性不达标的情况下上线。
5. **SSE 稳定性 > 功能丰富度**。圆桌至少要先能稳跑一场 3 轮 3 人的讨论，再考虑更复杂的导演指令组合。

---

**手册结束。祝顺利。**
