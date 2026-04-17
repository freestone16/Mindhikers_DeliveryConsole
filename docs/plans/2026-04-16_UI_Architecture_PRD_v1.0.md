---
title: "UI Architecture PRD · v1.0（合卷定稿）"
type: prd
status: final
date: 2026-04-16
owner: OldYang
authors:
  - OldYang（合卷评审 + §1 §2 §6 §11 §12 主笔）
  - CE Team（§3 §4 §7 §8 §9 §10 + §2/§5 工程部分主笔）
  - frontend-design plugin（§1 §5 §8 视觉具象化 + 4 屏高保真 demo）
origin:
  - docs/plans/2026-04-15_UI_Architecture_PRD_Skeleton.md          # 骨架
  - docs/plans/2026-04-15_UI_Architecture_PRD_v0.2.md              # 工程轨扩写
  - docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md      # 视觉轨契约
  - demos/ui-north-star/                                            # 视觉轨产出（4 屏 demo）
related:
  - ../../../GoldenCrucible-Roundtable/docs/plans/2026-04-13_roundtable-to-sse-migration-plan.md
---

# UI Architecture PRD · v1.0（合卷定稿）

> **v1.0 与 v0.2 的差异**
> - 视觉轨产出（`demos/ui-north-star/`）已完成合卷：§1 视觉具象化、§5 Shell 视觉实证、§8 Design System 完整 Token 表 + 组件原语全清单
> - 屏 3 handoff 仪式屏评审通过：`gcDash` 赭橙虚线 + `handoff__watermark` + `shadow-lg` panel 构成"被记住"的产品灵魂瞬间
> - §十二 红线自检：8 / 8 全通过，无违规项
> - 工程轨（§3 §4 §7 §9 §10）评审通过，无须返工；§4.8 workspace 鉴权 + §10.3 日志监控两节额外加分保留
> - 合卷新增：§8.3 明确 `OriginBreadcrumb`（Shell 级原语）与 `paper__crumb`（Paper 视图实例）的层次关系
> - 附录 B：视觉轨产出索引

---

## 总纲

**产品**：以可插拔频道精神为灵魂、可插拔人格为角色、可插拔技能为能力的思考协同工具。

**四段式工作流**：GoldenRador → Roundtable → GoldenCrucible → Writer → Delivery Console

**PRD 两大第一公民**：
1. **Pluggable Slot Architecture**（三层可插拔 slot：Channel × Persona × Skill）
2. **Cross-Module Handoff Contract**（四段流转契约：TopicCandidate / Spike+Session / Thesis / Copy）

**两大工程纪律**（贯穿全篇）：
- 所有模块业务数据以 **workspace 为边界**鉴权隔离；圆桌、坩埚、文案的每一条 API 都必须挂 `requireWorkspace` middleware。
- 下游节点的每一个视图都必须**可回溯到源头**：论文可一键跳回原圆桌 session，原圆桌可一键跳回原 TopicCandidate。

---

## §1 设计理念与北极星

**要回答**：产品气质是什么？视觉锚点是谁？视觉纪律如何落实？

### 1.1 设计宣言

**奥卡姆剃刀** · **简单** · **强壮** · **底蕴** · **内涵**

凡存在的每个元素都要能回答"为什么必须在这里"。能去就去，能减就减。

- **简单**：视觉语言极简，不是 flat 也不是空洞，是**精准的少**
- **强壮**：交互可靠、稳健、不脆（hover / focus / disabled / error / empty 都有定义；responsive；a11y 基线）
- **底蕴**：经典、有文化基因（苏格拉底、坩埚、雷达这些命名本身就是承载）
- **内涵**：每个视觉元素都有语义和叙事支撑，不做装饰

### 1.2 视觉锚点

**主对标**：Claude Code
**辅对标**：Codex

不是对标功能，是对标**质感**。

### 1.3 §十二 红线清单（评审自检 · 8/8 通过）

| # | 禁用项 | 状态 |
|---|---|---|
| 1 | 紫色渐变 / glassmorphism / glow / 霓虹 / 彩虹 | ✅ 通过 |
| 2 | Inter / Roboto / Arial / Space Grotesk | ✅ 通过（Fraunces + Instrument Sans + JetBrains Mono）|
| 3 | emoji 作为 UI 元素（装饰或功能）| ✅ 通过（全 SVG symbol 线稿）|
| 4 | 默认 shadcn 外观（未深度定制）| ✅ 通过（全自定义组件）|
| 5 | bounce / spring / scale 过大 / 动画 > 300ms | ✅ 通过（仅 opacity + translate ≤ 8px，dur-slow = 280ms 仅 handoff 专用）|
| 6 | 大量图标填充（icons-as-decoration）| ✅ 通过（每个 icon 有功能或语义锚定）|
| 7 | 信息填满（density 过高）| ✅ 通过（stage padding 48–64，慷慨留白）|
| 8 | 纯黑 `#000` / 纯白 `#fff` / 冷蓝灰 | ✅ 通过（暖色系：bg-base `#faf8f3`，text-primary `#2c2a26`）|

### 1.4 工程轨的理念承接

- "简单" → 域模型五元组封顶，禁止新增平行维度
- "强壮" → 每个 UI 状态（hover/focus/disabled/error/empty/loading）在组件原语层有契约
- "底蕴" → Persona / Skill / Channel 的命名与注册 ID 体系承载叙事（`crucible_oldlu` 胜过 `persona_001`）
- "内涵" → 每个 URL / state 字段 / 埋点事件都必须可以被"解释"，不留黑盒

**主笔**：OldYang（合卷北极星简报）

---

## §2 Information Architecture

**要回答**：产品的域模型是什么？四模块各自什么定位？未来如何扩展？

### 2.1 域模型五元组

```
Module  —  一个一级功能域（Rador / Roundtable / Crucible / Writer / …）
Session —  Module 内的一次工作实例（一次圆桌 / 一次炼制 / 一次改写）
Artifact —  Session 产出的可结构化对象（Spike / Thesis / Copy / TopicCandidate）
Slot(×3) — 三层正交插槽（Channel / Persona / Skill），详见 §3
Config  —  用户级 + workspace 级的偏好与激活态（当前 Channel、默认 Persona 池、Skill 装配）
```

**正交性约束**：
- 同一条业务数据只能归属一个 `(Module, Session)` 键对
- Artifact 通过 `origin: { module, sessionId }` 反向引用源头（§4 的可回溯基础）
- Slot 的激活态跨 Module 共享（用户在 Rador 选定的 Channel 决定了 Crucible 的语气调性）

### 2.2 四模块命名与定位

| 模块 | 代号 | 职能 | Session 语义 | 输入 | 输出 |
|---|---|---|---|---|---|
| GoldenRador | `rador` | 信息雷达 + 选题筛选 | 一次 Channel 驱动的筛选窗口 | 外部信源 | `TopicCandidate` |
| Roundtable | `roundtable` | 多 Persona 圆桌辩论 | 一次完整圆桌讨论 | `TopicCandidate` | `Spike[] + RoundtableSession` |
| GoldenCrucible | `crucible` | 多 Skill 协同炼制 | 一次炼制过程（四段：锁题 / 深聊 / 结晶 / 定稿）| `Spike[] + RoundtableSession` | `Thesis` |
| Writer | `writer`（命名待定，候选 `quill`）| 改写为对外传播形态 | 一次改写任务 | `Thesis` | `Copy` / `Script` |

### 2.3 扩展位（第 N 个模块）

新模块接入的工程契约（详见 §3.6）：
1. 在 `src/modules/registry.ts` 注册 `ModuleManifest`
2. 声明 `inputContract` / `outputContract`（必须引用 §4 的标准 schema 之一，或经评审的新 schema）
3. 声明 `sessionKind` 语义
4. 贡献自身的 feature slice（业务组件 + hooks），但**不得**改动 Shell 层
5. 在 `server/routes/<module>.ts` 新建独立路由文件，挂 `requireWorkspace` middleware

**视觉表达**：左栏模块列表末尾的 `.mod--slot`（虚线边框 + 斜体 serif "+ 扩展位"），已在屏 1 demo 中体现。

### 2.4 Session 在各模块的语义差异

见 §5.2 的语义表。Session 在 UI 层**统一为左栏列表项**，但其列表单位的叙事标签各不相同。

**主笔**：OldYang（域模型）+ CE Team（schema + 扩展位契约）

---

## §3 Pluggable Slot Architecture ⭐ 第一公民

**要回答**：三层 Slot 的 schema、注册协议、组合规则、UI 表达。

> **设计哲学**：产品的可进化性通过三层正交的可插拔 slot 实现 —— **Channel Spirit / Persona / Skill**。
> 未来任何产品升级（新调性、新人格、新能力）都应该是"加 slot"而非"改代码"。

### 3.1 三层正交设计哲学

| 维度 | 回答的问题 | 粒度 | 激活范围 |
|---|---|---|---|
| Channel Spirit | **"选什么题"—— 产品气质与选题筛子** | workspace 级，同一时间单选 | 全局影响（Rador 选题 + Crucible/Writer 的语气调性提示）|
| Persona | **"谁来说"—— 角色与视角** | 可池化，多选；每 Session 按需装配 | Module 级（Roundtable 参与者 / Crucible 对话者）|
| Skill | **"用什么方法"—— 能力与工具** | 可装配给 Persona，也可直接挂载到 Module | Session 级（激活态即为"当前加载专家"）|

**为什么必须是三层正交**：

- 把 Channel 和 Persona 合并 → 换调性就要换人格池，违反最小耦合
- 把 Persona 和 Skill 合并 → 同一人格想在 Crucible 做研究、在 Writer 做改写就必须定义两个人格，违反"人格复用"
- 把 Skill 和 Module 合并 → Skill 就变成"写死的功能"，失去了"Skill ↔ Module 是 N:M"的扩展性

三层的加载优先级：**Channel → Persona → Skill**（外层决定内层的语气/激活范围）。

### 3.2 Channel Spirit Slot（频道精神）

#### 3.2.1 Manifest schema

```ts
// src/schemas/channel-spirit.ts（新建）
export const ChannelSpiritManifestSchema = z.object({
  id: z.string().regex(/^channel_[a-z0-9_]+$/),          // e.g. 'channel_mindhikers'
  slug: z.string(),                                       // 'mindhikers'
  displayName: z.string(),                                // '思考徒'
  tagline: z.string(),                                    // '独立观点 · 深度取向 · 精选非聚合'
  spirit: z.object({
    tone: z.string(),                                     // 语气关键词（注入到 Crucible/Writer prompt）
    topicFilters: z.array(z.string()),                    // Rador 筛选标签（正向）
    topicAntiFilters: z.array(z.string()),                // Rador 筛选标签（反向）
    personaBiases: z.array(z.object({                     // 偏好的 Persona tier
      tier: z.enum(['core', 'philosopher', 'guest']),
      weight: z.number().min(0).max(1),
    })),
  }),
  createdAt: z.string().datetime(),
  version: z.string(),                                    // semver
});
export type ChannelSpiritManifest = z.infer<typeof ChannelSpiritManifestSchema>;
```

#### 3.2.2 当前激活：mindhikers

```yaml
# docs/02_design/channels/mindhikers.channel.yml（新建）
id: channel_mindhikers
slug: mindhikers
displayName: 思考徒
tagline: "独立观点 · 深度取向 · 精选非聚合"
spirit:
  tone: "克制、底蕴、不求热度、求真"
  topicFilters: ["原创思考", "长期视角", "跨学科", "反共识"]
  topicAntiFilters: ["标题党", "日更热榜", "AI 生成内容堆砌"]
  personaBiases:
    - { tier: core, weight: 1.0 }
    - { tier: philosopher, weight: 0.8 }
    - { tier: guest, weight: 0.3 }
version: "1.0.0"
```

**视觉表达**：屏 1 左栏 "Topic Pool · mindhikers" eyebrow + 屏 4 论文 kicker "Channel · mindhikers · 哲学工程"。

#### 3.2.3 切换协议（占位，见 §12 待解决议题）

- v1 阶段：**workspace 级单选**，通过 workspace config 持久化
- UI 触点：左栏下 Config 区的 Channel 切换器（v1 仅展示当前激活，切换能力留待 v2）
- 切换副作用：
  1. Rador 选题池重排（以新 Channel 的 `topicFilters` 重算排序）
  2. Crucible / Writer 的 system prompt 注入新 Channel 的 `spirit.tone`
  3. 已存在的 Session 不回溯重排，只影响新 Session

### 3.3 Persona Slot（人格）

#### 3.3.1 Persona Manifest schema

基于现有 `src/schemas/crucible-soul.ts` 的 `SoulProfile` 扩展（**不要新建平行 schema**；当前 `SoulProfile` 就是 Persona 的同义词，仅限 Crucible 模块使用，PRD 层面升格为全局 Persona）：

```ts
// src/schemas/persona.ts（在 crucible-soul.ts 基础上抽取升格）
export const PersonaManifestSchema = z.object({
  id: z.string().regex(/^persona_[a-z0-9_]+$/),          // 'persona_oldlu' / 'persona_socrates'
  slug: z.string(),                                       // 'oldlu' / 'socrates'
  displayName: z.string(),                                // '老卢' / '苏格拉底'
  roleLabel: z.string(),                                  // '立结构' / '诘问'
  tier: z.enum(['core', 'philosopher', 'guest']),         // 对应 Channel 的 bias tier
  origin: z.enum(['curated', 'extracted']),               // ⭐ 'extracted' 预留给 Persona 萃取引擎
  avatar: z.object({
    kind: z.enum(['initial', 'image']),
    value: z.string(),                                    // 'L' 或图片 URL
  }),
  voice: z.object({
    tone: z.string(),                                     // 语气
    mannerism: z.string().optional(),                     // 口头禅 / 风格特征
    promptSeed: z.string(),                               // 注入到 system prompt 的人格种子
  }),
  skillPreferences: z.array(z.string()).default([]),      // 默认装配的 Skill id（可被 Session 级覆盖）
  moduleEligibility: z.array(z.enum(['roundtable', 'crucible', 'writer'])),
                                                          // 该 Persona 可在哪些 Module 出场
  extractionTrace: z.object({                             // ⭐ 仅 origin === 'extracted' 时存在
    sourceSessionIds: z.array(z.string()),                // 来自哪些对话语料
    extractedAt: z.string().datetime(),
    extractorVersion: z.string(),
    confidenceScore: z.number().min(0).max(1),
  }).optional(),
  createdAt: z.string().datetime(),
  version: z.string(),
});
export type PersonaManifest = z.infer<typeof PersonaManifestSchema>;
```

**视觉表达**：屏 2 中 msg 头像 `苏`/`庄`/`尼`/`N`（来自 `PersonaManifest.avatar`），msg 头部 role label（"诘问者 · 古希腊"等）。

#### 3.3.2 当前池

来自 `docs/02_design/crucible/soul_registry.yml` + `GoldenCrucible-Roundtable/personas/*.json`（迁入 `personas/` 后）：

- **Core（2 位现实人格）**：老张（拆概念）、老卢（立结构）
- **Philosopher（7 位哲人）**：苏格拉底、尼采、维特根斯坦、伯林、罗尔斯、阿伦特、波普尔（以 RT 侧 7 个 JSON 为准，迁入后落到 `personas/*.json`）
- **Guest**：留空，待 Persona 萃取引擎产出

#### 3.3.3 注册 / 卸载协议

- **注册**：将 Manifest 文件放入 `personas/` 目录 → 启动时由 `server/persona-loader.ts` 读取 → 写入内存 registry → 前端通过 `GET /api/personas` 拉取可用池
- **卸载**：Manifest 文件移除即可（不做软删除，因为 Persona 是无状态配置，历史 Session 中的引用通过 `snapshotPersona` 固化，见 §4.4）
- **版本升级**：Manifest `version` 字段 semver 递增；已存在的 Session 保留快照版本，不受新版本影响

#### 3.3.4 ⭐ Persona 萃取引擎接口预留（未来）

**定位**：未来版本允许用户从现实语料（某个作者的文集、某个公众号的历史文章、某个研究者的论文）萃取出一个"学着 TA 说话"的 Persona，写入 `origin: 'extracted'`。

**接口预留**（仅定义契约，v1 不实现）：

```ts
// src/schemas/persona-extraction.ts（新建，占位）
export interface PersonaExtractionRequest {
  sourceKind: 'text_corpus' | 'url_list' | 'session_replay';
  sources: Array<{ uri: string; weight?: number }>;
  seedName: string;                // 建议名（'某某风格'）
  targetTier: 'philosopher' | 'guest';
  workspaceId: string;             // ⭐ workspace-scoped
}

export interface PersonaExtractionJob {
  jobId: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  progress: number;                // 0-1
  draftManifest?: PersonaManifest; // 萃取完成后的草稿
  reviewRequired: true;            // v1 策略：必须人工审阅后才能入 registry
}
```

**预留的 API 端点（v1 返回 501 Not Implemented）**：
- `POST /api/personas/extract` — 发起萃取任务（挂 `requireWorkspace`）
- `GET /api/personas/extract/:jobId` — 查询进度
- `POST /api/personas/extract/:jobId/approve` — 审阅后入池

**UI 触点预留**：左栏下 Config → "我的人格"→ "从语料中萃取" 按钮（v1 灰态 + Tooltip "v2 开放"）

### 3.4 Skill Slot（技能）

#### 3.4.1 Skill Manifest schema

基于现有 `src/schemas/crucible-runtime.ts` 的 `CrucibleToolNameSchema` 扩展（从"Crucible 专属工具"升格为"全局 Skill"）：

```ts
// src/schemas/skill.ts（新建）
export const SkillManifestSchema = z.object({
  id: z.string().regex(/^skill_[a-z0-9_]+$/),
  slug: z.string(),                                       // 'researcher' / 'fact_checker' / 'thesis_writer'
  displayName: z.string(),
  roleLabel: z.string(),                                  // '研究员' / '事实核查'
  category: z.enum(['research', 'critique', 'composition', 'review', 'curation']),
  capabilities: z.object({
    inputShape: z.string(),                               // 简述输入
    outputShape: z.string(),                              // 简述产出
    sideEffects: z.array(z.enum(['external_search', 'web_fetch', 'file_write', 'llm_call'])),
  }),
  moduleBindings: z.array(z.object({                      // ⭐ N:M 关系的核心字段
    moduleId: z.enum(['rador', 'roundtable', 'crucible', 'writer']),
    role: z.enum(['primary', 'support', 'optional']),     // 在该 Module 中的角色
    defaultActivated: z.boolean(),
    entrypoint: z.string(),                               // 注册到该 Module 的 handler 路径
  })).min(1),
  promptSeed: z.string(),
  version: z.string(),
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;
```

**视觉表达**：屏 4 右侧 "Loaded Skills" 面板（`.skill` 原语），每个 skill 有 24×24 glyph chip + 名称 + 描述 + 状态 pill。

#### 3.4.2 当前池

| Skill | 现有实证 | Module Bindings |
|---|---|---|
| Researcher | `src/schemas/crucible-runtime.ts` + `server/crucible.ts#performCrucibleExternalSearch` | `crucible: support`, `rador: primary`（未来）|
| FactChecker | `server/crucible.ts#performCrucibleFactCheck` | `crucible: support` |
| Socrates | `server/crucible-orchestrator.ts` 决策 prompt | `crucible: primary`, `roundtable: optional` |
| ThesisWriter | `src/schemas/crucible-runtime.ts` `SkillOutputPayloadSchema` | `crucible: primary`（收尾段）|
| Writer | 待 Writer 模块专项 PRD | `writer: primary` |
| Curator | 待 Rador 模块专项 PRD | `rador: primary` |
| PropositionSharpener | `GoldenCrucible-Roundtable/server/proposition-sharpener.ts`（迁入后）| `roundtable: primary` |
| SpikeExtractor | `GoldenCrucible-Roundtable/server/spike-extractor.ts`（迁入后）| `roundtable: primary` |
| DeepDive | `GoldenCrucible-Roundtable/server/deepdive-engine.ts`（迁入后）| `roundtable: optional` |

#### 3.4.3 ⭐ Skill ↔ Module 的 N:M 关系

**角色矩阵**（当前池的全景）：

| Skill ＼ Module | rador | roundtable | crucible | writer |
|---|---|---|---|---|
| Researcher | primary（未来）| — | support | optional（未来）|
| FactChecker | — | optional | support | optional |
| Socrates | — | optional | **primary** | — |
| ThesisWriter | — | — | **primary** | support |
| Writer | — | — | — | **primary** |
| Curator | **primary** | — | — | — |
| PropositionSharpener | — | **primary** | — | — |
| SpikeExtractor | — | **primary** | — | — |
| DeepDive | — | optional | — | — |

**激活顺序**（Module 内部）：
1. 读取该 Module 的 `defaultActivated === true` 的 Skill 作为基线
2. 根据 Session 级用户选择覆盖
3. 在该 Session 内的 `activeSkills[]` 作为"当前加载专家"面板数据源

#### 3.4.4 Skill ↔ Persona 的装配关系

- `PersonaManifest.skillPreferences` 声明默认装配（例如"老卢默认装 ThesisWriter + Researcher"）
- Session 级可以为某个 Persona 临时加载 / 卸载 Skill（写入 `Session.personaSkillAssignments`）
- 约束：临时装配的 Skill 必须在当前 Module 的 bindings 中存在且角色为 `primary` 或 `support` 或 `optional`

### 3.5 三层之间的组合矩阵与生效顺序

```
生效顺序（由外到内）：
  Channel.spirit.tone
    → 注入 Persona.voice.promptSeed 前面
    → 再注入 Skill.promptSeed 前面
    → 组成最终 system prompt
```

**组合合法性校验**（启动时 + Session 创建时）：
- Persona.moduleEligibility 必须包含当前 Module
- Skill.moduleBindings 必须包含当前 Module
- 如果 Channel.personaBiases 指定 tier 权重为 0，该 tier 的 Persona 被软降序（不是硬禁用）

### 3.6 新 Slot 加入的 dev 流程（"几步能跑"）

**加一个新 Channel**：
1. 写 `docs/02_design/channels/<slug>.channel.yml`
2. 启动 → 前端左栏下出现新 Channel 可选项
3. 零代码改动

**加一个新 Persona**：
1. 写 `personas/<slug>.json`（符合 `PersonaManifestSchema`）
2. 启动 → `server/persona-loader.ts` 自动加载
3. 前端 Roundtable / Crucible 的 Persona 选择器自动出现
4. 零代码改动

**加一个新 Skill**：
1. 写 Skill 实现文件 `server/skills/<slug>.ts`
2. 写 `src/schemas/skills/<slug>.manifest.ts` 或 `docs/02_design/skills/<slug>.skill.yml`
3. `server/index.ts` 启动时聚合加载 manifest 并注册 `entrypoint`
4. 前端 "已加载专家" 面板自动渲染

**加一个新 Module（第 N 个模块）**：
1. `src/modules/<slug>/` 新建 feature slice
2. `src/modules/registry.ts` 注册 `ModuleManifest`
3. `server/routes/<slug>.ts` 新建路由 + 挂 `requireWorkspace`
4. 声明 `inputContract` / `outputContract`
5. Shell 层无需任何改动（左栏上的模块切换器由 `ModuleRegistry` 驱动）

### 3.7 UI 对三层的表达

| Slot | 主要 UI 触点 | 辅助触点 |
|---|---|---|
| Channel Spirit | 左栏下 Config 区的 Channel 徽章（v1 只读展示）| Rador 选题池的筛选标签自动变化 |
| Persona | Roundtable 的参与者选择器（多选 chip 阵）+ Crucible 的对话者标签 | 头像系统（`PersonaManifest.avatar`）全局一致 |
| Skill | Crucible 右栏抽屉的 "LOADED SKILLS" 面板 | Writer 右栏的 "改写风格" 面板（v2）|

**主笔**：CE Team（工程 schema）+ OldYang（哲学 + 现状实证）

---

## §4 Cross-Module Handoff Contract ⭐ 第一公民

**要回答**：四段式工作流中每个箭头传什么、怎么触发、能否回溯、能否回退、如何鉴权。

### 4.1 流转拓扑

```
 Rador          Roundtable          Crucible           Writer          Delivery Console
   │                │                   │                 │                  │
   │ TopicCandidate │ Spike[] +         │ Thesis          │ Copy / Script    │
   │                │ RoundtableSession │                 │                  │
   └───────────────>└──────────────────>└────────────────>└─────────────────>│
        handoff-1         handoff-2           handoff-3         handoff-4
       (v1 实现)          (v1 实现)           (v1 实现)      (v2 / 专项 PRD)
```

### 4.2 触发方式：用户显式按钮（默认）

每一次 handoff 都必须由**用户主动点击**触发，不自动推进。这是"有分量、被记住"的产品灵魂瞬间（见北极星 §九 + §1.3 + 附录 B 屏 3）。

**视觉实现**：统一原语 `HandoffButton`（`.btn.btn--ochre`），赭橙底白字；全系共出现 3 次（屏 2 底部"送入坩埚"/ 屏 3 主 CTA / 屏 4 底部"送入 Writer"）。

### 4.3 数据契约

#### 4.3.1 `Rador → Roundtable` : `TopicCandidate`

```ts
// src/schemas/handoff/topic-candidate.ts（新建）
export const TopicCandidateSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),                                // ⭐ workspace-scoped
  title: z.string().min(1).max(240),
  summary: z.string().min(1).max(1200),
  sources: z.array(z.object({
    kind: z.enum(['url', 'rss', 'manual', 'import']),
    uri: z.string().optional(),
    excerpt: z.string().optional(),
    fetchedAt: z.string().datetime().optional(),
  })).min(1),
  tags: z.array(z.string()).default([]),
  curatedBy: z.object({
    kind: z.enum(['user', 'skill']),
    id: z.string(),
  }),
  channelAtCuration: z.string(),                          // 收录时的 Channel id（冷冻快照）
  status: z.enum(['candidate', 'sent_to_roundtable', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TopicCandidate = z.infer<typeof TopicCandidateSchema>;
```

**触发接口**：`POST /api/rador/topics/:topicId/send-to-roundtable`（`requireWorkspace`）

#### 4.3.2 `Roundtable → Crucible` : `Spike[] + RoundtableSession`

```ts
// src/schemas/handoff/roundtable-session.ts
export const RoundtableSessionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),                                // ⭐ workspace-scoped
  origin: z.object({                                      // ⭐ 可回溯源头
    module: z.literal('rador'),
    topicCandidateId: z.string().uuid(),
  }).nullable(),
  proposition: z.string(),
  sharpenedProposition: z.string().optional(),
  contrastAnchor: z.string().optional(),
  participants: z.array(z.object({
    personaId: z.string(),
    personaSnapshot: PersonaManifestSchema.shape.voice,   // ⭐ 冷冻快照
    role: z.enum(['participant', 'moderator']),
  })).min(3).max(5),
  turns: z.array(z.object({
    turnIndex: z.number().int(),
    speakerPersonaId: z.string(),
    act: z.enum(['陈述', '质疑', '补充', '反驳', '修正', '综合']),
    content: z.string(),
    createdAt: z.string().datetime(),
  })),
  rounds: z.array(z.object({
    roundIndex: z.number().int(),
    synthesis: z.string(),
  })),
  directorCommands: z.array(z.object({
    command: z.enum(['stop', 'vote', 'deepen', 'swap', 'question', 'approve']),
    payload: z.unknown(),
    issuedAt: z.string().datetime(),
  })),
  status: z.enum(['drafting', 'streaming', 'awaiting_director', 'paused', 'completed', 'sent_to_crucible']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

```ts
// src/schemas/handoff/spike.ts
export const SpikeSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),
  origin: z.object({                                      // ⭐ 可回溯到具体轮次
    module: z.literal('roundtable'),
    sessionId: z.string().uuid(),
    roundIndex: z.number().int(),
    turnIndices: z.array(z.number().int()),
  }),
  title: z.string(),
  body: z.string(),
  category: z.enum(['insight', 'tension', 'question', 'evidence']),
  extractedBy: z.enum(['skill:SpikeExtractor', 'user:manual']),
  confidence: z.number().min(0).max(1).optional(),
  deepDiveSessionIds: z.array(z.string().uuid()).default([]),
  createdAt: z.string().datetime(),
});
```

**触发接口**：`POST /api/roundtable/sessions/:sessionId/send-to-crucible`（body: `{ selectedSpikeIds: string[] }`，`requireWorkspace`）

**迁入实证**：`appendSpikesToCrucibleConversation`（RT 仓库 `server/crucible-persistence.ts` 第 890–961 行）在 Phase 2 迁入时直接拷入 SSE，无需新建持久化层。⚠️ 注意：扫雷报告（`docs/dev_logs/2026-04-16_persistence-diff-scan.md`）已确认该函数**当前仅存在于 RT 侧**，SSE 侧 `crucible-persistence.ts` 尚无此函数；Phase 2 迁入操作清单已写好，见扫雷报告 §启动操作清单。

#### 4.3.3 `Crucible → Writer` : `Thesis`

```ts
// src/schemas/handoff/thesis.ts
export const ThesisSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),
  origin: z.object({                                      // ⭐ 可回溯到 Crucible Session
    module: z.literal('crucible'),
    sessionId: z.string().uuid(),
    finalizedRoundIndex: z.number().int(),
  }),
  title: z.string(),
  markdown: z.string(),                                   // 论文正文（含 frontmatter）
  metadata: z.object({
    channelAtFinalization: z.string(),
    participantPersonaIds: z.array(z.string()),
    usedSkillIds: z.array(z.string()),
    crystallizedQuotes: z.array(z.object({
      quote: z.string(),
      attribution: z.string(),
      sourceSpikeId: z.string().uuid().optional(),
    })),
    citations: z.array(z.object({
      uri: z.string(),
      excerpt: z.string().optional(),
      fetchedAt: z.string().datetime().optional(),
    })),
  }),
  status: z.enum(['draft', 'finalized', 'sent_to_writer', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

**触发接口**：
- `POST /api/crucible/sessions/:sessionId/finalize-thesis`
- `POST /api/crucible/thesis/:thesisId/send-to-writer`
- 均挂 `requireWorkspace`

#### 4.3.4 `Writer → Delivery Console` : 占位

```ts
// src/schemas/handoff/copy.ts（占位，v2）
export const CopySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),
  origin: z.object({
    module: z.literal('writer'),
    sessionId: z.string().uuid(),
    sourceThesisId: z.string().uuid(),                    // 完整链条
  }),
  format: z.enum(['x_long_post', 'video_script', 'newsletter', 'other']),
  content: z.string(),
  status: z.enum(['draft', 'reviewed', 'published']),
});
```

### 4.4 可回溯（⭐ 重点）

**设计原则**：每个下游产物必须能在 **O(1) 点击** 内跳回上游 Session。

**实现机制**：
- 每个 handoff 产物的 schema 都带 `origin: { module, sessionId, ... }` 字段
- 前端在每个产物的详情视图顶部渲染 **`<OriginBreadcrumb>`**（Shell 级通用组件，见 §8.3），链式显示完整祖先链
- 点击行为：`router.push('/m/${origin.module}/s/${origin.sessionId}?highlight=...')`
- 上游 Session 被归档时，面包屑变为"历史只读"状态

**视觉实证**：屏 4 论文中的 `.paper__crumb`（"返回原圆桌 · 注意力碎片化"）是 `<OriginBreadcrumb>` 在 Paper 视图的具体渲染实例；屏 3 的 "此刻将被记入 handoff trail —— 随时可回溯" 是触发文案。

**Persona / Skill 冷冻快照**：
- `RoundtableSession.participants[].personaSnapshot` 冷冻当时 Persona 的 voice
- `Thesis.metadata.usedSkillIds` + `Thesis.metadata.participantPersonaIds` 冷冻当时装配

**跳转即定位**：`?highlight=turnIndex:5,6` 或 `?highlight=spikeId:xxx`，落到具体的发言 / 结晶位置。

### 4.5 可逆性：送出后的改写规则、分版规则

| 场景 | 规则 |
|---|---|
| Topic 送入 Roundtable 后想改 | 不改 TopicCandidate 本身；在 Roundtable 侧调整 `proposition` |
| Roundtable 送入 Crucible 后想加新 Spike | 允许。Crucible Session 订阅新 Spike，用户点击"拉取新 Spike"确认 |
| Thesis 送入 Writer 后 Crucible 又改了结论 | 提示"源头已更新，是否同步新版本？"，同步 = 新建 Writer Session（分版保留）|

**核心纪律**：**冷冻发生在 handoff 时刻**。下游不订阅上游实时变更。

### 4.6 中断 / 重入 / 版本关联

**中断**：SSE 流式过程中断 → 服务端继续完成当前 turn，重入时从断点续渲。

**重入**：分享链接 / 刷新 / 跨设备继续 —— 由 §7.3 的 State 恢复协议保证。

**版本关联**：同一 Thesis 可派生多个 Writer Session，`Writer.origin.sourceThesisId` 指向同一父。

### 4.7 跨模块流转的 UX 契约（工程侧视角）

呼应北极星 §九（"产品灵魂瞬间"）。工程侧必须满足：

- Handoff 触发按钮在 Shell 级**全局一致**（组件原语：`HandoffButton` = `.btn.btn--ochre`）
- 按钮点击到新 Session 可见的时间 ≤ 800ms（后端预创建 Session 记录，前端乐观跳转）
- 跳转过程伴随 **150-200ms 的 opacity 过渡**（由 Shell 路由动画统一提供）
- **可回溯面包屑** `<OriginBreadcrumb>` 全局统一渲染在新 Session 顶部

### 4.8 workspace-scoped 鉴权适配（⭐ 统一条款）

**强制纪律**：§4 定义的所有 handoff 接口 + 四个模块的所有业务接口都必须：

1. 挂 `requireWorkspace` Express middleware（新建 `server/auth/workspace-middleware.ts`）
2. 所有请求体 / 路径参数引用的 id 必须校验属于当前 workspace
3. 持久化写入时自动注入 `workspaceId`
4. 跨 workspace 的引用全部禁止

```ts
// server/auth/workspace-middleware.ts（新建）
export const requireWorkspace: RequestHandler = async (req, res, next) => {
  const session = await auth.getSession(req);
  if (!session) return res.status(401).json({ error: 'unauthenticated' });
  const ctx = await getWorkspaceContext(pool, session.userId);
  if (!ctx.activeWorkspace) return res.status(403).json({ error: 'no_active_workspace' });
  (req as any).workspace = ctx.activeWorkspace;
  next();
};
```

**现有差距**：圆桌 API 在 Roundtable 仓库侧**尚未挂 workspace middleware**；迁入 SSE 时必须补齐。

**主笔**：CE Team

---

## §5 Shell 结构

**要回答**：三栏布局每一栏承载什么？模块间共享壳怎么设计？业务 slice 如何接入？

### 5.1 左栏上：四模块切换器（+ 扩展位）

- **渲染源**：`src/modules/registry.ts` 的 `ModuleRegistry`
- **顺序**：`rador → roundtable → crucible → writer → [+ slot]`
- **交互**：点击切换 activeModule；路径 `/m/:moduleId` 同步变化
- **视觉实证**：屏 1 左栏 `.mod-list`，含 4 个 `.mod`（含 `.mod__glyph` SVG + `.mod__name` + `.mod__kbd`）和 1 个 `.mod--slot`（虚线 + 斜体 serif "扩展位"）

### 5.2 左栏中：Session 列表（语义表）

| 模块 | 列表单位 | 例子 | 数据源 |
|---|---|---|---|
| GoldenRador | **Item** | "AI 会取代编辑吗 · 3h 前收入" | `GET /api/rador/topics?workspace=current` |
| Roundtable | **Session** | "AI 会取代编辑吗 · 4 位哲人 · 进行中" | `GET /api/roundtable/sessions?workspace=current` |
| Crucible | **Session** | "AI 与编辑论 · 炼制中 · v0.3" | `GET /api/crucible/conversations?workspace=current`（已有）|
| Writer | **Session** | "AI 与编辑论 → X 长文改写 · 待审核" | `GET /api/writer/sessions?workspace=current`（v2）|

**工程契约**：每个 Module 的 Session 列表项必须实现 `SessionListItem` 接口：

```ts
interface SessionListItem {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  statusKind: 'active' | 'paused' | 'completed' | 'archived';
  updatedAt: string;
  originBadge?: { module: string; label: string; };       // ⭐ 可回溯徽章
}
```

**视觉实证**：屏 2 左栏 session 列表（`.session`），aria-current 态用 3px 赭橙圆点前缀 + 浅底 + 细线描边。

### 5.3 左栏下：用户 + Config

- 当前用户（Avatar + 昵称，来自 Better Auth session）
- 当前 Channel 徽章（引用 §3.2）
- 设置入口（workspace 切换、Persona 管理、Skill 管理）

### 5.4 中栏：Chat 主区（统一范式，模块内容不同）

**共享抽象**：
- 消息流容器 `<ConversationStream>`
- SSE 流式渲染 hook `useStreamingConversation()`（见 §7.4）
- 每个业务 slice 贡献自己的 `<MessageRenderer>`

**视觉实证**：屏 2 的 `.thread`（Roundtable 消息列表），屏 4 的 `.paper`（Crucible 论文视图）—— 同一中栏插槽，不同 slice 渲染。

### 5.5 右栏：Artifact 抽屉（默认折叠）

- **触发**：中栏产出 Artifact 时，右栏顶部出现浮标
- **展开**：点击浮标或快捷键（v2 定）
- **内容路由**：`?artifact=:artifactId` URL 参数同步（见 §7.1）
- **视觉实证**：屏 1 折叠态（`.artifact--collapsed`，44px 细条 + 竖排 "Artifact" 标签）；屏 2/4 展开态（`.artifact__head` + `.artifact__body` + `.artifact__foot`）

### 5.6 响应式断点与降级（1280 / 768）

- `< 1280px`：右栏变**悬浮抽屉**（覆盖中栏而非挤压）
- `< 768px`：左栏上 → 底部 tab bar；左栏中 → 顶部下拉；左栏下 → 汉堡菜单

**主笔**：frontend-design（视觉与像素值，来自 demo 四屏）+ CE Team（响应式工程与数据接口）

---

## §6 四模块边界

### 6.0 GoldenRador（粗轮廓占位，本轮预留位置）

- **职能**：互联网信息收集 + 当前激活 Channel Spirit 驱动筛选 + Topic 候选池
- **气质锚定**：不是盲抓热点的 feed，是精选池。秉承当前 Channel Spirit（首发 mindhikers）的深度取向。
- **Shell 位置**：左栏上第一个模块按钮（屏 1 默认激活）
- **输出契约**：`TopicCandidate` → Roundtable（§4.3.1）
- **Skill 占位**：Curator / WebSearch / RSS / Reader 等（待专项 PRD）

### 6.1 Roundtable（已开发完毕，剥离 Shell 后入壳）

- **现状**：RT 仓库 `origin/sse-export` 已完成 Unit 1~6
- **迁移方式**：文件级复制 + 路由手工注册（见圆桌迁移方案 v2 + 附录 B）
- **Shell 处理**：⚠️ **不搬 Sidebar.tsx / App.tsx 整层布局** —— 由新 Shell 提供
- **内部核心**：Persona 多方发言（SSE 流式）+ 导演指令（止/投/深/换/？/可）+ Spike 提取 + DeepDive
- **输入契约**：`TopicCandidate`（§4.3.1）或用户直接输入命题
- **输出契约**：`Spike[] + RoundtableSession` → Crucible（§4.3.2）
- **鉴权改造**：所有 `/api/roundtable/*` 挂 `requireWorkspace`（§4.8）

### 6.2 GoldenCrucible（主工作流已定，重点：头尾衔接）

- **现状**：SSE 主力战场，四段式决策流（`topic_lock` / `deep_dialogue` / `crystallization` / `thesis_finalization`）已有实证
- **头衔接**：从 Roundtable 接收 Spike + Session（§4.3.2），进入 `topic_lock` 阶段
- **尾产出**：`Thesis`（§4.3.3）
- **重点关注**：**头尾契约的 UX**（见 §4.3 + 北极星 §九 + §4.7）

### 6.3 Writer（粗轮廓占位，本轮预留位置）

- **职能**：从 Thesis 改写为 X 长文 / 视频脚本 / 其他传播形态 + 审核
- **输入契约**：`Thesis` from Crucible（§4.3.3）
- **命名**：Writer（占位，候选 GoldenQuill，待定，见 §12）

---

## §7 Routing / State Architecture

### 7.1 URL scheme

```
/                                         → 重定向到 /m/crucible（或上次激活模块）
/m/:moduleId                              → 模块首页
/m/:moduleId/s/:sessionId                 → 具体 Session
/m/:moduleId/s/:sessionId?artifact=:id    → 右栏抽屉打开特定 Artifact
/m/:moduleId/s/:sessionId?highlight=...   → 定位跳转（用于可回溯，见 §4.4）
/settings/channel                         → Channel 切换器（v2）
/settings/personas                        → Persona 管理（含 v2 萃取引擎入口）
/settings/skills                          → Skill 管理
/auth/*                                   → Better Auth 官方路径
```

**⭐ 决策：Phase 1 切换到 React Router v6 BrowserRouter**（放弃当前 `useHashRoute()`）

**rationale**：Hash routing 无法被 SSR 识别；分享链接体验差；回溯跳转（§4.4）在某些 OAuth 回调下会丢失；React Router v6 的 nested route + `Outlet` 天然契合 Shell + feature slice 结构。成本：重写约 10 处 `useHashRoute` 调用点。

### 7.2 State 三态切分

| 状态类型 | 选型 | 边界 | 典型用例 |
|---|---|---|---|
| **Server state** | **React Query (TanStack Query v5)** | 所有来自 API 的数据 + SSE 流的起点 | `useQuery(['roundtable', 'sessions', workspaceId], ...)` |
| **Client state** | **Zustand（轻 store）** | UI 临时态：右栏抽屉开合、中栏消息滚动位置、主题 | `useShellStore(s => s.drawerOpen)` |
| **URL state** | **React Router v6 search params** | 可分享 / 可回溯的状态：`moduleId` / `sessionId` / `?artifact` / `?highlight` | `const [searchParams] = useSearchParams()` |

**决策依据**：现有纯 hook + localStorage 在多 Session 场景下已显吃力（refresh 后丢失游标 / 跨 Tab 不同步）；Session 列表 + 详情天然适合 React Query 的 query invalidation 模型（handoff 触发时 invalidate 下游列表）。

### 7.3 State 恢复协议（刷新 / 回退 / 分享链接）

**恢复顺序**：
1. URL 解析：从路径 + search params 解析 `moduleId` / `sessionId` / `artifact` / `highlight`
2. 认证检查：无 session → 跳 `/auth/sign-in?redirect=<current-url>`
3. Workspace 恢复：resource 不属于当前 workspace → 提示切换
4. 数据拉取：React Query 并行触发相关查询
5. 视图定位：根据 `?highlight` 参数滚动到具体 turn / spike

### 7.4 SSE 连接在路由切换时的生命周期

**原则**：SSE 连接绑定 Session，跟随路由退出而终止。

- 进入 `/m/:moduleId/s/:sessionId` 且该 Session `streaming` → 建立 SSE 连接
- 切到其他 Session → 关闭当前 SSE（`AbortController.abort()`）
- 服务端检测到 disconnect → **继续完成当前 turn 的写入**（不中止 LLM）
- 切回来 → 重新建立 SSE 连接，若已完成 → 立即关闭 + 渲染最终状态

**现有实证**：`src/components/crucible/sse.ts` 的 `readSseStream` + `consumeSseBuffer` 已实现 RFC 6453 合规解析 —— Phase 1 抽取为 shell-level hook。

**主笔**：CE Team

---

## §8 Design System & Tokens

**要回答**：Token 层级、组件原语清单、工程接入方式、还原度验收。

### 8.1 Token 两层

```
Primitive Token（值）         e.g. --gc-bg-base = #faf8f3
    ↓ 引用
Semantic Token（语义）         e.g. --gc-text-primary = {warm near-black}
    ↓ 消费
Component / Page               e.g. .msg__content { color: var(--gc-text-primary) }
```

**工程接入**：
- Primitive + Semantic token 以 CSS Variables 暴露：`demos/ui-north-star/styles/tokens.css` 即为工程侧 token 单一来源，React 侧封 `ThemeProvider` 注入
- 通过 Tailwind 的 `theme.extend.colors` 映射到工具类（Phase 1 建设）

### 8.2 Token 表（合卷版，来源：`demos/ui-north-star/styles/tokens.css` + `DESIGN_TOKENS.md`）

#### Color

| 类别 | Token | Value | 用途 |
|---|---|---|---|
| Surface | `--gc-bg-base` | `#faf8f3` | 主画布（中栏背景） |
| | `--gc-bg-raised` | `#f2efe8` | 侧栏、面板 |
| | `--gc-bg-sunken` | `#ede9e0` | 输入井、hover 填充 |
| | `--gc-bg-quiet` | `#f6f3ec` | 行斑马 |
| | `--gc-bg-inverted` | `#2c2a26` | primary 按钮 / inverted chip |
| Text | `--gc-text-primary` | `#2c2a26` | 正文、标题 |
| | `--gc-text-secondary` | `#6b6860` | 次级信息 |
| | `--gc-text-tertiary` | `#9a968b` | eyebrow、meta |
| | `--gc-text-quiet` | `#b7b2a5` | placeholder |
| | `--gc-text-inverted` | `#faf8f3` | 反白 |
| Line | `--gc-line-hairline` | `#efeae0` | 极淡内部分割 |
| | `--gc-line-subtle` | `#e8e4dc` | 默认边框 |
| | `--gc-line-default` | `#d9d4c8` | 更强边框 |
| | `--gc-line-strong` | `#bfb8a8` | focus / 强分隔 |
| Semantic | `--gc-accent` | `#cc7849` | 赭橙 · 唯一暖调强调 |
| | `--gc-accent-hover` | `#b86a3f` | hover |
| | `--gc-accent-ink` | `#8c4a24` | 小字上的赭橙 |
| | `--gc-accent-tint` | `#f5e6d8` | 赭橙底色 chip |
| | `--gc-success` | `#6b8759` | 暖绿 |
| | `--gc-warning` | `#c89b3c` | 赭黄 |
| | `--gc-error` | `#b85c4c` | 赭红 |

#### Typography

**字体栈**：
- `--gc-font-serif`: Fraunces → Iowan Old Style → Source Serif Pro → Georgia（衬线锚点）
- `--gc-font-sans`: Instrument Sans → Söhne → Helvetica Neue（UI chrome）
- `--gc-font-mono`: JetBrains Mono → SF Mono → Menlo（代码、计数、kbd）

**禁用**：Inter / Roboto / Arial / system-ui stack / Space Grotesk

**Size 阶梯**（13px 基准，层次靠 weight 不靠 size）：
`xs=11px / sm=12px / base=13px / md=14px / lg=16px / xl=20px / 2xl=28px / 3xl=40px / 4xl=56px`

**Weight**：`regular=400 / medium=500 / semibold=600`

**Leading**：`tight=1.2 / snug=1.4 / body=1.6 / prose=1.75`

#### Spacing · 4 倍节奏

`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px`（`--gc-s-1` 到 `--gc-s-16`）

#### Radius / Shadow / Motion

| 维度 | Token | Value |
|---|---|---|
| Radius | `--gc-radius-sm/md/lg/pill` | `4/6/8/999 px` |
| Shadow | `--gc-shadow-sm` | `0 1px 2px rgba(44,42,38,0.04)` |
| | `--gc-shadow-lg` | `0 12px 32px -8px ...`（仅 handoff panel 专用）|
| Motion | `--gc-ease` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| | `--gc-dur-fast/base/slow` | `150/200/280ms`（280ms 仅 handoff 仪式）|

### 8.3 组件原语清单（合卷版，来源：`demos/ui-north-star/COMPONENTS.md`）

**Shell 级（复用跨模块）**：
- 导航：`ModuleTab`（`.mod`）/ `SidebarItem`（`.session`）/ `SessionListItem`（接口见 §5.2）
- 容器：`ShellLayout`（`.shell`）/ `ArtifactDrawer`（`.artifact`）/ `Rail`（`.rail`）/ `Stage`（`.stage`）
- 消息：`ConversationStream`（`.thread`）/ `MessageRenderer`（`.msg`，含 `.msg--spike` 变体）
- Handoff：`HandoffButton`（`.btn.btn--ochre`，§4.7 统一原语）
- **`OriginBreadcrumb`（Shell 级通用原语）**：渲染下游产物到上游 Session 的祖先链；在 Paper 视图中以 `.paper__crumb` 实例化，样式有 Paper 上下文的局部定制（serif 字体 + hover 转赭橙色），但逻辑由 Shell 统一提供

**通用原语**：
- 输入：`Button`（`.btn`，含 `--primary / --ochre / --ghost / --sm` 变体）/ `IconButton` / `Input` / `Textarea` / `Composer`（`.composer`）
- 展示：`Card` / `Panel` / `Badge` / `Avatar`（`.avatar`）/ `Chip`（`.composer__chip`）/ `Divider`（`.divider-hairline`）/ `Skeleton`
- 反馈：`Toast` / `Dialog` / `Tooltip` / `Kbd`（`.kbd`）

**业务 slice 级**（由各 feature slice 贡献）：
- Roundtable：`PropositionInput` / `DirectorControls` / `SpikeLibrary`（`.spike-card`）/ `ThinkingIndicator`
- Crucible：`SkillLoadedPanel`（`.skill`）/ `StageIndicator` / `PresentableCard` / `CitationList`（`.cite`）
- Paper：`PaperView`（`.paper`，含 `__kicker/__title/__subtitle/__byline/__abstract/__h2/__p/__pull/__cite`）

**Handoff 仪式原语**（屏 3 专用）：
- `HandoffPanel`（`.handoff__panel`）/ `HandoffNode`（`.handoff-node`）/ `HandoffArrow`（`.handoff__arrow` + `gcDash` 动效）/ `HandoffChecklist`（`.handoff__checklist`）

**Glyph 库**（SVG symbols，1.25px stroke-width）：
`g-rador`（crosshair ring）/ `g-roundtable`（五座环绕中心圆）/ `g-crucible`（倒置梯形 + 火滴）/ `g-writer`（nib + baseline）/ `g-crucible-hero`（handoff watermark 200×200）

### 8.4 对标 Claude Code 还原度验收

- 视觉轨自检：§十二 红线 8/8 全通过（见 §1.3）
- 工程侧额外约束：
  - 每个组件原语在 `docs/03_ui/` 有独立文档页 + 状态矩阵
  - 每个业务 slice 通过 Storybook（或 ladle）独立预览
  - A11y 自动化测试（axe-core）零 violations

**主笔**：frontend-design（主，来自 demo 产出）+ CE Team（工程接入）

---

## §9 Responsive / A11y / Perf Budget

### 9.1 断点

| 断点 | 触发 | 行为 |
|---|---|---|
| `≥ 1280px` | Desktop full | 三栏全部渲染；右栏折叠但常驻 |
| `768-1279px` | Desktop narrow / Tablet | 右栏变悬浮抽屉 |
| `< 768px` | Mobile | 左栏上 → 底部 tab bar；左栏中 → 顶部下拉；左栏下 → 汉堡菜单 |

**工程实现**：Shell 通过 `useResponsiveLayout()` hook 返回当前层级，组件原语消费。

### 9.2 A11y：WCAG 2.2 AA 基线

**Landmarks**：
- `<nav aria-label="Modules">`：左栏上模块切换器
- `<nav aria-label="Sessions">`：左栏中 Session 列表
- `<main>`：中栏
- `<aside aria-label="Artifact">`：右栏抽屉

**键盘可达**：
- 模块切换器：方向键导航 + `Enter` 激活
- Session 列表：方向键上下 + `Enter` 打开
- Handoff 按钮：`Enter` / `Space` 触发 + 触发后焦点自动跟随到新 Session
- 右栏抽屉：`Esc` 关闭 + 焦点回到触发点

**对比度**：
- `text-primary` / `bg-primary` ≥ 4.5:1（正文）
- `text-secondary` / `bg-primary` ≥ 4.5:1（次要文本）
- `accent` 作为交互色 ≥ 3:1（AA 大字体 / UI 元素）

**语义化**：
- `role="status"` / `aria-live="polite"`：SSE 流式区
- `role="alert"`：关键错误
- `aria-expanded`：抽屉、折叠面板
- `prefers-reduced-motion`：关闭位移动效，保留 opacity 过渡

### 9.3 Perf Budget

| 指标 | 预算 | 测量方式 |
|---|---|---|
| **LCP** | ≤ 2.5s | Web Vitals in production |
| **INP** | ≤ 200ms | Web Vitals |
| **CLS** | ≤ 0.1 | Web Vitals |
| **Shell 首屏 JS** | ≤ 150KB gzip | Vite build report |
| **单模块 chunk** | ≤ 100KB gzip | Vite build report |
| **SSE 首 token 到屏** | ≤ 500ms（本地）/ ≤ 1200ms（生产）| 埋点（§10）|
| **Handoff 跳转** | ≤ 800ms | 埋点（§10）|

**Code split 策略**：
- Shell + Auth → main chunk
- 每个 Module → 独立 `React.lazy()` 入口
- React Query / Zustand → main chunk（跨 Module 共享）

**主笔**：CE Team

---

## §10 Observability

### 10.1 ErrorBoundary 分层

```
<AppErrorBoundary>                       （全屏降级 + 错误上报）
  <ShellErrorBoundary>                   （Shell 级：左右栏出错，中栏仍可用）
    <ModuleErrorBoundary moduleId="x">   （Module 级：其他模块不受影响）
      <FeatureErrorBoundary>             （业务单元：SpikeLibrary 出错，其他不崩）
        <ComponentErrorBoundary>         （组件级：对已知易错组件包裹）
```

| 层 | 降级方案 | 上报 |
|---|---|---|
| App | 全屏 "出错了，请刷新" + 日志下载 | Sentry: level=fatal |
| Shell | 简化壳 + "重新加载" | Sentry: level=error |
| Module | 该 Module 空态 + "切换到其他模块" | Sentry: level=error + moduleId tag |
| Feature | inline error + 重试按钮 | Sentry: level=warning + featureId tag |

### 10.2 埋点清单

**基础 meta**（每个事件都带）：
```
{ userId, workspaceId, timestamp, sessionId?, moduleId?, appVersion }
```

**Shell 事件**：
| event | 触发时机 | 附加字段 |
|---|---|---|
| `shell.module.switch` | 切换左栏上模块 | `from`, `to`, `method` |
| `shell.session.open` | 打开一个 Session | `moduleId`, `sessionId`, `entryPoint` (`list / deep_link / handoff`) |
| `shell.drawer.toggle` | 右栏抽屉开合 | `action`, `artifactKind` |

**Slot 事件**：
| event | 触发时机 | 附加字段 |
|---|---|---|
| `slot.channel.activate` | Channel 切换 | `from`, `to` |
| `slot.persona.select` | Persona 选择变化 | `moduleId`, `sessionId`, `added[]`, `removed[]` |
| `slot.skill.activate` | Skill 激活变化 | `moduleId`, `sessionId`, `skillId`, `action` |

**Handoff 事件**（⭐ 产品灵魂埋点）：
| event | 触发时机 | 附加字段 |
|---|---|---|
| `handoff.rador_to_roundtable` | §4.3.1 按钮点击 | `topicCandidateId`, `durationMs` |
| `handoff.roundtable_to_crucible` | §4.3.2 按钮点击 | `roundtableSessionId`, `spikeCount`, `durationMs` |
| `handoff.crucible_to_writer` | §4.3.3 按钮点击 | `thesisId`, `durationMs` |
| `handoff.trace_back` | 用户点击可回溯面包屑 | `fromModule`, `toModule`, `traceDepth` |

**SSE 事件**：
| event | 触发时机 | 附加字段 |
|---|---|---|
| `sse.connect` | SSE 建立 | `moduleId`, `sessionId`, `endpoint` |
| `sse.first_token` | 首 token 到屏 | `latencyMs` |
| `sse.disconnect` | SSE 关闭 | `reason`, `durationMs` |
| `sse.error` | `event: error` 收到 | `errorCode`, `errorMessage` |

### 10.3 日志与监控

- **前端**：Sentry SDK（错误 + 性能）+ 自建埋点上报（PostHog / 自建）
- **后端**：结构化日志（pino / winston）注入 `requestId` / `userId` / `workspaceId`；SSE 流日志级别 INFO/DEBUG/ERROR
- **告警阈值（初稿）**：
  - 5xx 率 > 1% → warning
  - SSE 错误率 > 5% → critical
  - Handoff 失败率 > 2% → critical（产品灵魂瞬间，宁可误报）

**主笔**：CE Team

---

## §11 实施路线

| Phase | 范围 | 交付物 | 依赖 |
|---|---|---|---|
| **Phase 0**（已完成）| 北极星简报 + PRD 骨架落盘，双轨启动，视觉轨 demo + 工程轨 v0.2 产出 | 本 PRD v1.0 | — |
| **Phase 1** | Design System + Shell 空壳 | `tokens.css` 工程化 + 组件原语 + ShellLayout + React Router v6 + React Query + Zustand + ErrorBoundary + `requireWorkspace` middleware | Phase 0 |
| **Phase 2** | Roundtable 入壳（engine 迁入 + 业务组件适配新 Shell）| 可用的 Roundtable 模块 + TopicCandidate 输入口（占位）| Phase 1 + 圆桌迁移方案附录 B |
| **Phase 3** | GoldenCrucible 包装为 feature slice 入壳 | 可用的 Crucible 模块 + Roundtable→Crucible handoff（§4.3.2）| Phase 2 |
| **Phase 4** | GoldenRador 粗轮廓实现 | Rador 模块 + TopicCandidate 输出（§4.3.1）| Rador 专项 PRD |
| **Phase 5** | Writer 粗轮廓实现 | Writer 模块 + Thesis→Copy handoff（§4.3.3-4）| Writer 专项 PRD |
| **Phase 6** | 持续优化 + Persona 萃取引擎（§3.3.4）+ Channel 切换 UX（§3.2.3）| v2 能力释放 | Phase 3~5 |

**主笔**：OldYang

---

## §12 待解决问题池

本 PRD **不拍板**、但**必须记录**的议题：

- [ ] Persona 萃取引擎的详细接入协议（§3.3.4 已预留接口契约，实施设计待 v2 专项）
- [ ] Channel Spirit 切换的 UX 方案（v1 只读，v2 如何切换、是否允许多 Channel 并存）
- [ ] 多 Channel 并存的可能性（长期哲学议题）
- [ ] Delivery Console 对接 API（待文案专项 PRD）
- [ ] Crucible 多 skill 协同的编排 UI（待 Crucible UX 专项）
- [ ] Persona vs Skill 是否未来统一（长期哲学议题）
- [ ] Writer 模块正式命名（Writer / GoldenQuill / 其他）
- [ ] GoldenRador 的 "Rador" 拼写终审（vs 标准 Radar）
- [ ] Soul Registry（`docs/02_design/crucible/soul_registry.yml`）是否与新 `PersonaManifestSchema` 统一成单一来源（推荐统一，v1 阶段落地时做）
- [ ] 跨 workspace 的 Persona/Skill/Channel **共享**能力（当前设计为 workspace-scoped，未来企业版可能需要"组织级共享池"）
- [ ] Session 的**归档策略**（软归档 vs 硬删除 vs TTL）—— 影响可回溯在历史数据上的表现
- [ ] Handoff 的**撤销**操作（送入后 30s 内允许反悔？）—— 需产品侧决策

---

## 双轨合卷状态

### 工程轨（CE Team 主笔章节）

- §3 Pluggable Slot Architecture ✅
- §4 Cross-Module Handoff Contract ✅（含 §4.8 workspace 鉴权，加分项）
- §7 Routing / State Architecture ✅
- §9 Responsive / A11y / Perf Budget ✅
- §10 Observability ✅（含 §10.3 日志监控，加分项）
- §2 / §5 / §8 工程部分 ✅

### 视觉轨（frontend-design 主笔章节）

- §1 视觉锚点具象化 ✅（4 屏 demo + 红线自检）
- §5 Shell 视觉实证 ✅（demo 四屏 + COMPONENTS.md）
- §8 Design System & Tokens ✅（DESIGN_TOKENS.md + 组件原语全清单）
- 四屏高保真 demo ✅（`demos/ui-north-star/index.html`）

### 合卷评审（OldYang）

- 红线核对：8/8 全通过
- 工程轨深度：§3/§4/§7/§9/§10 全部满足骨架要求，有两节超出（§4.8 + §10.3）
- 交叉评审：视觉叙事与工程架构完全自洽；屏 3 handoff 仪式屏符合"被记住"标准
- v1.0 合卷修正：`OriginBreadcrumb` 层次说明（§4.4 + §8.3），§8.2 Token 表由 demo 填充

**v1.0 状态：合卷完成，待老卢终审。Phase 1 可据此启动实施。**

---

## 附录 A：关键文件与代码实证索引

**现有 SSE 侧（工程基准）**：
- `src/schemas/crucible-soul.ts` — Soul/Persona schema 基础
- `src/schemas/crucible-runtime.ts` — Skill / SocratesTool schema 基础
- `src/components/crucible/soulRegistry.ts` — Persona 客户端加载器
- `server/crucible-orchestrator.ts` — Crucible 四段决策实证
- `server/crucible.ts` — SSE handler + Researcher/FactChecker 实证
- `server/crucible-persistence.ts` — ⚠️ 当前版本**不含** `appendSpikesToCrucibleConversation`；该函数在 RT 侧，Phase 2 迁入时拷入（§4.3.2）
- `server/auth/index.ts` — Better Auth 配置
- `server/auth/workspace-store.ts` — `workspace / workspace_member / active_workspace` 表
- `src/components/crucible/sse.ts` — RFC 6453 SSE 解析器（§7.4 将抽取为 shell hook）

**将迁入 SSE（来自 `GoldenCrucible-Roundtable` `origin/sse-export`）**：
- `server/roundtable-engine.ts` / `spike-extractor.ts` / `deepdive-engine.ts` / `proposition-sharpener.ts` / `roundtable-types.ts` / `persona-loader.ts`
- `src/schemas/persona.ts`（升格为全局 Persona schema）
- `personas/*.json`（7 个哲人）
- 业务组件：`RoundtableView / DirectorControls / PropositionInput / SpikeLibrary / ThinkingIndicator / useRoundtableSse`
- **不迁入**：`src/components/Sidebar.tsx` / `src/App.tsx`

**本 PRD 规划新建**：
- `src/schemas/channel-spirit.ts` — Channel Spirit Manifest（§3.2.1）
- `src/schemas/persona.ts` — Persona Manifest 升格（§3.3.1）
- `src/schemas/skill.ts` — Skill Manifest（§3.4.1）
- `src/schemas/persona-extraction.ts` — Persona 萃取接口预留（§3.3.4）
- `src/schemas/handoff/{topic-candidate,roundtable-session,spike,thesis,copy}.ts`（§4.3）
- `src/modules/registry.ts` — Module 注册表（§2.3）
- `server/auth/workspace-middleware.ts` — workspace 鉴权统一 middleware（§4.8）
- `server/routes/<module>.ts` — 每个 Module 的路由独立文件（§4.8）
- `docs/02_design/channels/mindhikers.channel.yml` — 首发 Channel 定义（§3.2.2）

---

## 附录 B：视觉轨产出索引

| 文件 | 内容 | 工程侧用途 |
|---|---|---|
| `demos/ui-north-star/index.html` | 4 屏高保真可运行 demo（纯静态，无构建步骤）| 视觉终局锚点；Phase 1 实施参考 |
| `demos/ui-north-star/styles/tokens.css` | Design Token 单一来源（CSS Variables，`--gc-*` 前缀）| 直接复制为前端 token 根文件，React 侧 `ThemeProvider` 注入 |
| `demos/ui-north-star/styles/app.css` | 组件原语样式 + 4 屏布局 | Phase 1 组件原语库的视觉参考 |
| `demos/ui-north-star/scripts/app.js` | 屏切换交互（键盘 + 点击）| 无工程依赖，仅 demo 用 |
| `demos/ui-north-star/DESIGN_TOKENS.md` | Token 契约文档（色/字/距/动/角/影）| 本 PRD §8.2 Token 表来源 |
| `demos/ui-north-star/COMPONENTS.md` | 组件原语清单（含语义说明）| 本 PRD §8.3 原语清单来源 |
| `demos/ui-north-star/README.md` | 产出说明 + 运行方式 + 红线自检 | 验收文档 |

**运行方式**：
```bash
python3 -m http.server 5173 --directory demos/ui-north-star
# 打开 http://localhost:5173，键盘 1/2/3/4 切屏
```

---

*编制：OldYang（老杨）合卷*
*视觉轨：frontend-design plugin（2026-04-16 交付）*
*工程轨：CE Team（2026-04-15 交付）*
*合卷日期：2026-04-16*
*版本：v1.0 定稿，待老卢终审*
*分支：MHSDC-GC-SSE*
*下一步：老卢终审通过 → 新建 Linear issue → Phase 1 启动*
