---
title: "UI Architecture PRD · v0.2（工程轨扩写）"
type: prd
status: active
date: 2026-04-15
owner: OldYang
authors:
  - CE Team（§3 §4 §7 §9 §10 主笔 + §2/§5/§8 工程部分）
  - frontend-design plugin（§1 §5 视觉 §8 设计令牌，待 4 屏 demo 回卷）
origin:
  - docs/plans/2026-04-15_UI_Architecture_PRD_Skeleton.md
  - docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md
related:
  - ../../../GoldenCrucible-Roundtable/docs/plans/2026-04-13_roundtable-to-sse-migration-plan.md
---

# UI Architecture PRD · v0.2

> **本版本与 Skeleton v0.1 的差异**
> - §3 完整扩写三层 Slot schema、注册协议、组合矩阵、Persona 萃取引擎接口预留
> - §4 完整扩写四段 Handoff 数据契约（TopicCandidate / Spike / Thesis）、触发/回溯/回退/鉴权
> - §7 完整扩写 URL scheme、State 三态切分决策（React Query + Zustand + URL path，**替换现有 Hash Router + localStorage**）、SSE 生命周期
> - §9 §10 完整扩写断点/A11y/Perf Budget、ErrorBoundary 分层、埋点清单
> - §2 §5 §8 补工程切面；视觉部分保留占位待 frontend-design 产出 demo 后合卷
> - §1 §6 §11 §12 延续骨架，仅做小幅润色与问题池更新

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

**要回答**：产品气质是什么？视觉锚点是谁？反面清单是什么？

本章内容以北极星简报为准（`docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md`），此处仅做工程轨索引。

- 1.1 设计宣言：奥卡姆剃刀 · 简单 · 强壮 · 底蕴 · 内涵（北极星 §二）
- 1.2 视觉锚点：Claude Code（主）+ Codex（辅）（北极星 §三）
- 1.3 反面清单：详见北极星 §十二
- 1.4 **工程轨的理念承接**：
  - "简单" → 域模型五元组封顶，禁止新增平行维度
  - "强壮" → 每个 UI 状态（hover/focus/disabled/error/empty/loading）在组件原语层有契约
  - "底蕴" → Persona / Skill / Channel 的命名与注册 ID 体系承载叙事（`crucible_oldlu` 胜过 `persona_001`）
  - "内涵" → 每个 URL / state 字段 / 埋点事件都必须可以被"解释"，不留黑盒

**主笔**：OldYang（本章直接引用北极星简报）

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

### 2.4 Session 在各模块的语义差异

见 §5.2 的语义表。Session 在 UI 层**统一为左栏列表项**，但其列表单位的叙事标签各不相同（Item / Session / Session / Session）。

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
    entrypoint: z.string(),                               // 注册到该 Module 的 handler 路径，e.g. 'server/crucible.ts:handleResearcher'
  })).min(1),
  promptSeed: z.string(),
  version: z.string(),
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;
```

#### 3.4.2 当前池

| Skill | 现有实证 | Module Bindings |
|---|---|---|
| Researcher | `src/schemas/crucible-runtime.ts` `CrucibleToolNameSchema.Researcher` + `server/crucible.ts#performCrucibleExternalSearch` | `crucible: support`, `rador: primary`（未来）|
| FactChecker | `server/crucible.ts#performCrucibleFactCheck` | `crucible: support` |
| Socrates | `server/crucible-orchestrator.ts` 决策 prompt | `crucible: primary`, `roundtable: optional` |
| ThesisWriter | `src/schemas/crucible-runtime.ts` `SkillOutputPayloadSchema` + `thesisReady` 标志 | `crucible: primary`（收尾段）|
| Writer | 待 Writer 模块专项 PRD | `writer: primary` |
| Curator | 待 Rador 模块专项 PRD | `rador: primary` |
| PropositionSharpener | `GoldenCrucible-Roundtable/server/proposition-sharpener.ts`（迁入后 → `server/proposition-sharpener.ts`）| `roundtable: primary` |
| SpikeExtractor | `GoldenCrucible-Roundtable/server/spike-extractor.ts`（迁入后）| `roundtable: primary` |
| DeepDive | `GoldenCrucible-Roundtable/server/deepdive-engine.ts`（迁入后）| `roundtable: optional` |

#### 3.4.3 ⭐ Skill ↔ Module 的 N:M 关系

**核心关系**：一个 Skill 可被多个 Module 加载；一个 Module 可加载多个 Skill。此关系由 `SkillManifest.moduleBindings` 直接承载（数组），不需要独立的连接表。

**查询模式**：
- 正向（"Module X 能用哪些 Skill"）：`skills.filter(s => s.moduleBindings.some(b => b.moduleId === 'crucible'))`
- 反向（"Skill Y 在哪些 Module 出场"）：`skill.moduleBindings.map(b => b.moduleId)`

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
1. 写 `personas/<slug>.json`（或 `.yml`，符合 `PersonaManifestSchema`）
2. 启动 → `server/persona-loader.ts` 自动加载
3. 前端 Roundtable / Crucible 的 Persona 选择器自动出现
4. 零代码改动

**加一个新 Skill**：
1. 写 Skill 实现文件 `server/skills/<slug>.ts`（或放在对应 Module 的现有文件）
2. 写 `src/schemas/skills/<slug>.manifest.ts` 或 `docs/02_design/skills/<slug>.skill.yml`
3. `server/index.ts` 启动时聚合加载 manifest 并注册 `entrypoint`
4. 前端 "已加载专家" 面板自动渲染

**加一个新 Module（第 N 个模块）**：
1. `src/modules/<slug>/` 新建 feature slice（组件 + hooks + types）
2. `src/modules/registry.ts` 注册 `ModuleManifest`
3. `server/routes/<slug>.ts` 新建路由 + 挂 `requireWorkspace`
4. 声明 `inputContract` / `outputContract`，若需与现有模块串联则必须指向 §4 的标准 schema 之一
5. Shell 层无需任何改动（左栏上的模块切换器由 `ModuleRegistry` 驱动）

### 3.7 UI 对三层的表达

| Slot | 主要 UI 触点 | 辅助触点 |
|---|---|---|
| Channel Spirit | 左栏下 Config 区的 Channel 徽章（v1 只读展示）| Rador 选题池的筛选标签自动变化 |
| Persona | Roundtable 的参与者选择器（多选 chip 阵）+ Crucible 的对话者标签（单选/多选，根据 Session 模式）| 头像系统（`PersonaManifest.avatar`）全局一致 |
| Skill | Crucible 右栏抽屉的 "LOADED SKILLS" 面板（来自北极星 §十一）| Writer 右栏的 "改写风格" 面板（v2）|

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

每一次 handoff 都必须由**用户主动点击**触发，不自动推进。这是"有分量、被记住"的产品灵魂瞬间（见北极星 §九）。

**例外占位**：v2 可能引入"自动流转模式"（Rador 选到 Topic 后自动送入 Roundtable 等待），但 v1 强制显式确认。

### 4.3 数据契约

#### 4.3.1 `Rador → Roundtable` : `TopicCandidate`

```ts
// src/schemas/handoff/topic-candidate.ts（新建）
export const TopicCandidateSchema = z.object({
  id: z.string().uuid(),                                  // workspace 内唯一
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
    kind: z.enum(['user', 'skill']),                      // 用户手动收入 / Curator skill 推荐
    id: z.string(),                                       // userId 或 skillId
  }),
  channelAtCuration: z.string(),                          // 收录时的 Channel id（冷冻快照）
  status: z.enum(['candidate', 'sent_to_roundtable', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TopicCandidate = z.infer<typeof TopicCandidateSchema>;
```

**触发接口**：
- `POST /api/rador/topics/:topicId/send-to-roundtable` — 创建一个 RoundtableSession，输入为当前 Topic
- 鉴权：`requireWorkspace` + topicId 必须属于当前 workspace

**产品形态**：Rador 列表中每个 TopicCandidate 卡片末尾有"开始讨论 →"按钮；点击 → 送入 Roundtable，自动切换左栏上的模块按钮到 Roundtable，并高亮新建的 Session。

#### 4.3.2 `Roundtable → Crucible` : `Spike[] + RoundtableSession`

**RoundtableSession schema**（基于 Roundtable `sse-export` 分支的 `server/roundtable-types.ts` 升格为跨模块契约）：

```ts
// src/schemas/handoff/roundtable-session.ts（从 RT 的 roundtable-types.ts 升格）
export const RoundtableSessionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),                                // ⭐ workspace-scoped
  origin: z.object({                                      // ⭐ 可回溯源头
    module: z.literal('rador'),
    topicCandidateId: z.string().uuid(),
  }).nullable(),                                          // 允许用户手动开启（不来自 Rador）
  proposition: z.string(),
  sharpenedProposition: z.string().optional(),
  contrastAnchor: z.string().optional(),
  participants: z.array(z.object({
    personaId: z.string(),                                // 引用 PersonaManifest.id
    personaSnapshot: PersonaManifestSchema.shape.voice,   // ⭐ 冷冻快照（Persona 可能在未来版本升级）
    role: z.enum(['participant', 'moderator']),
  })).min(3).max(5),
  turns: z.array(z.object({
    turnIndex: z.number().int(),
    speakerPersonaId: z.string(),
    act: z.enum(['陈述', '质疑', '补充', '反驳', '修正', '综合']),
    content: z.string(),
    createdAt: z.string().datetime(),
  })),
  rounds: z.array(z.object({                              // 轮次综合
    roundIndex: z.number().int(),
    synthesis: z.string(),
  })),
  directorCommands: z.array(z.object({                    // 导演指令历史（止/投/深/换/？/可）
    command: z.enum(['stop', 'vote', 'deepen', 'swap', 'question', 'approve']),
    payload: z.unknown(),
    issuedAt: z.string().datetime(),
  })),
  status: z.enum(['drafting', 'streaming', 'awaiting_director', 'paused', 'completed', 'sent_to_crucible']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
```

**Spike schema**：

```ts
// src/schemas/handoff/spike.ts
export const SpikeSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),
  origin: z.object({                                      // ⭐ 可回溯到具体圆桌的具体轮次
    module: z.literal('roundtable'),
    sessionId: z.string().uuid(),
    roundIndex: z.number().int(),
    turnIndices: z.array(z.number().int()),               // 触发这个 Spike 的具体发言
  }),
  title: z.string(),
  body: z.string(),                                       // 结晶内容
  category: z.enum(['insight', 'tension', 'question', 'evidence']),
  extractedBy: z.enum(['skill:SpikeExtractor', 'user:manual']),
  confidence: z.number().min(0).max(1).optional(),
  deepDiveSessionIds: z.array(z.string().uuid()).default([]), // DeepDive 追问记录
  createdAt: z.string().datetime(),
});
```

**触发接口**：
- `POST /api/roundtable/sessions/:sessionId/send-to-crucible` — body: `{ selectedSpikeIds: string[] }`
- 副作用：创建 CrucibleSession，初始 stage = `topic_lock`，注入 spike 列表 + roundtable session 引用
- 鉴权：`requireWorkspace` + sessionId / spikeIds 必须属于当前 workspace

**现有实证**：SSE 侧 `server/crucible-persistence.ts` 已有 `appendSpikesToCrucibleConversation`，handoff 落地无需新建持久化层。

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
  markdown: z.string(),                                   // 论文正文（markdown，含 frontmatter）
  metadata: z.object({
    channelAtFinalization: z.string(),                    // 冷冻当时 Channel
    participantPersonaIds: z.array(z.string()),
    usedSkillIds: z.array(z.string()),
    crystallizedQuotes: z.array(z.object({
      quote: z.string(),
      attribution: z.string(),                            // 引自哪位 Persona / 哪个 Spike
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
- `POST /api/crucible/sessions/:sessionId/finalize-thesis` — 将当前 CrucibleSession 的炼制产物冷冻为 Thesis
- `POST /api/crucible/thesis/:thesisId/send-to-writer` — 送入 Writer 模块
- 鉴权：`requireWorkspace`

**现有实证**：`src/schemas/crucible-runtime.ts` 已有 `SkillOutputPayloadSchema`（包含 `presentables` / `reflection`）和 `thesisReady` 标志 —— Thesis 即是 `thesisReady === true` 时冷冻的快照。

#### 4.3.4 `Writer → Delivery Console` : 占位

待 Writer 专项 PRD 定义。契约雏形：

```ts
// src/schemas/handoff/copy.ts（占位，v2）
export const CopySchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string(),
  origin: z.object({
    module: z.literal('writer'),
    sessionId: z.string().uuid(),
    sourceThesisId: z.string().uuid(),                    // ⭐ 链条完整：Copy → Thesis → Crucible → Roundtable → Topic
  }),
  format: z.enum(['x_long_post', 'video_script', 'newsletter', 'other']),
  content: z.string(),
  status: z.enum(['draft', 'reviewed', 'published']),
});
```

### 4.4 可回溯（⭐ 重点）

**设计原则**：每个下游产物必须能在 **O(1) 点击** 内跳回上游 Session。

**实现机制**：
- 每个 handoff 产物的 schema 都带 `origin: { module, sessionId, ... }` 字段（在 4.3 的 schema 中体现）
- 前端在每个产物的详情视图顶部渲染 **"← 回到源头" 面包屑**，链式显示完整祖先链
- 面包屑点击行为：`router.push(\`/m/\${origin.module}/s/\${origin.sessionId}?highlight=...\`)`（详见 §7.1 URL scheme）
- 当上游 Session 被归档 / 删除，面包屑变为"历史只读"状态（跳转后显示只读视图 + 档案化标记）

**Persona / Skill 冷冻快照**：
- `RoundtableSession.participants[].personaSnapshot` 冷冻当时 Persona 的 voice
- `Thesis.metadata.usedSkillIds` + `Thesis.metadata.participantPersonaIds` 冷冻当时装配
- 未来 Persona 或 Skill 升级，历史 Session 永远按快照渲染（UI 标注"已冷冻"徽章）

**跳转即定位**：`?highlight=turnIndex:5,6` 或 `?highlight=spikeId:xxx`，让回溯落到具体的发言 / 结晶位置（由 Shell 路由 + feature slice 的内部滚动逻辑协作实现）。

### 4.5 可逆性：送出后的改写规则、分版规则

| 场景 | 规则 |
|---|---|
| Topic 送入 Roundtable 后想改 | 不改 TopicCandidate 本身；在 Roundtable 侧调整 `proposition`（断开与 Topic 的文字一致性但保留 `origin` 引用）|
| Roundtable 送入 Crucible 后想加新 Spike | 允许。Crucible Session 订阅 `RoundtableSession.spikeIds`，新 Spike 异步可见（但需用户在 Crucible 侧点击"拉取新 Spike"确认）|
| Thesis 送入 Writer 后 Crucible 又改了结论 | Writer 不自动追随；提示"源头已更新，是否同步新版本？"，同步 = 新建 Writer Session（**不覆盖**旧 Writer Session，分版保留）|

**核心纪律**：**冷冻发生在 handoff 时刻**。下游不订阅上游的实时变更，只接受用户显式触发的"拉新"。

### 4.6 中断 / 重入 / 版本关联

**中断**：SSE 流式过程中浏览器关闭 / 网络断开 → 服务端继续完成当前 turn（Roundtable / Crucible 都是这个策略，已有实证），写入持久化；重入时前端通过 `GET /api/<module>/sessions/:id` 拉取最新状态，从断点续渲。

**重入**：分享链接 / 刷新 / 跨设备继续 —— 由 §7.3 的 State 恢复协议保证。

**版本关联**：同一 Thesis 可派生多个 Writer Session（不同格式 / 不同版本），`Writer.origin.sourceThesisId` 指向同一父；UI 在 Crucible 侧的 Thesis 详情底部列出所有 downstream Writer Session。

### 4.7 跨模块流转的 UX 契约（工程侧视角）

呼应北极星 §九（"产品灵魂瞬间"）。工程侧必须满足：

- Handoff 触发按钮在 Shell 级**全局一致**（组件原语：`HandoffButton`）
- 按钮点击到新 Session 可见的时间 ≤ 800ms（后端预创建 Session 记录，前端乐观跳转）
- 跳转过程伴随 **150-200ms 的 opacity 过渡**（由 Shell 路由动画统一提供，不各模块自己做）
- **可回溯面包屑**全局统一渲染在新 Session 顶部（组件原语：`OriginBreadcrumb`）

### 4.8 workspace-scoped 鉴权适配（⭐ 统一条款）

**强制纪律**：§4 定义的所有 handoff 接口 + §2.2 四个模块的所有业务接口（含圆桌、坩埚、文案）都必须：

1. 挂 `requireWorkspace` Express middleware（新建 `server/auth/workspace-middleware.ts`）
2. 所有请求体 / 路径参数引用的 id（topicId / sessionId / spikeId / thesisId）必须校验属于当前 workspace
3. 持久化写入时自动注入 `workspaceId`
4. 跨 workspace 的引用全部禁止（即使同一用户拥有两个 workspace，也不允许 TopicCandidate 从 A workspace 的 Rador 送到 B workspace 的 Roundtable）

**现有差距**（在 §1.1 研究中发现）：圆桌 API 在 Roundtable 仓库侧**尚未挂 workspace middleware**；迁入 SSE 时必须补齐（这也是迁移方案附录 B 第 2 条"workspace 鉴权适配"的 PRD 级约束）。

**middleware 实现要点**：

```ts
// server/auth/workspace-middleware.ts（新建，PRD 约束，具体实现由 Phase 2 落地）
export const requireWorkspace: RequestHandler = async (req, res, next) => {
  const session = await auth.getSession(req);             // 已有 Better Auth 会话
  if (!session) return res.status(401).json({ error: 'unauthenticated' });
  const ctx = await getWorkspaceContext(pool, session.userId); // 已有
  if (!ctx.activeWorkspace) return res.status(403).json({ error: 'no_active_workspace' });
  (req as any).workspace = ctx.activeWorkspace;           // 注入
  next();
};
```

**路由挂载模式**（建议）：

```ts
// server/routes/roundtable.ts（新建）
const router = Router();
router.use(requireWorkspace);
router.post('/sharpen', sharpenHandler);
router.post('/turn/stream', turnStreamHandler);
// ...
export default router;

// server/index.ts
app.use('/api/roundtable', roundtableRouter);
```

**主笔**：CE Team

---

## §5 Shell 结构

**要回答**：三栏布局每一栏承载什么？模块间共享壳怎么设计？业务 slice 如何接入？

### 5.1 左栏上：四模块切换器（+ 扩展位）

- **渲染源**：`src/modules/registry.ts` 的 `ModuleRegistry`
- **顺序**：`rador → roundtable → crucible → writer → [+ slot]`
- **交互**：点击切换 activeModule；路径 `/m/:moduleId` 同步变化
- **视觉**：由 frontend-design 在 demo 屏 1 中定义（垂直图标栏 / 名称标签）

### 5.2 左栏中：Session 列表（语义表）

| 模块 | 列表单位 | 例子 | 数据源 |
|---|---|---|---|
| GoldenRador | **Item** | "AI 会取代编辑吗 · 3h 前收入" | `GET /api/rador/topics?workspace=current` |
| Roundtable | **Session** | "AI 会取代编辑吗 · 4 位哲人 · 进行中" | `GET /api/roundtable/sessions?workspace=current` |
| Crucible | **Session** | "AI 与编辑论 · 炼制中 · v0.3" | `GET /api/crucible/conversations?workspace=current`（已有）|
| Writer | **Session** | "AI 与编辑论 → X 长文改写 · 待审核" | `GET /api/writer/sessions?workspace=current`（v2）|

**工程契约**：每个 Module 的 Session 列表项必须实现 `SessionListItem` 接口（由 Shell 定义，业务 slice 贡献渲染）：

```ts
interface SessionListItem {
  id: string;
  title: string;                 // 主标题
  subtitle?: string;             // 副标题（例如"4 位哲人"）
  status: string;                // 状态徽章文本
  statusKind: 'active' | 'paused' | 'completed' | 'archived';
  updatedAt: string;
  originBadge?: {                // ⭐ 可回溯徽章：若来自上游 Module
    module: string;
    label: string;
  };
}
```

### 5.3 左栏下：用户 + Config

- 当前用户（Avatar + 昵称，来自 Better Auth session）
- 当前 Channel 徽章（引用 §3.2）
- 设置入口（workspace 切换、Persona 管理、Skill 管理、理论 / 现状）

### 5.4 中栏：Chat 主区（统一范式，模块内容不同）

**共享抽象**：
- 消息流容器 `<ConversationStream>`（组件原语 §8）
- SSE 流式渲染 hook `useStreamingConversation()`（见 §7.4）
- 每个业务 slice 贡献自己的 `<MessageRenderer>`（Roundtable 按 Persona 发言渲染、Crucible 按 Skill 决策 + utterance 渲染、Writer 按草稿版本渲染）

### 5.5 右栏：Artifact 抽屉（默认折叠）

- **触发**：中栏产出 Artifact（Spike / Thesis / Copy / DeepDive 摘要）时，右栏顶部出现一个浮标
- **展开**：点击浮标或快捷键（v2 定）
- **内容路由**：`?artifact=:artifactId` URL 参数同步（见 §7.1）
- **共享抽象**：`<ArtifactDrawer>` + `<ArtifactCard>` 原语；业务 slice 贡献 `<ArtifactContent>` 渲染

### 5.6 响应式断点与降级（1280 / 768）

- `< 1280px`：右栏变**悬浮抽屉**（覆盖中栏而非挤压）
- `< 768px`：
  - 左栏上（模块切换器）→ 底部 tab bar
  - 左栏中（Session 列表）→ 顶部下拉 + Session Picker
  - 左栏下（用户 + Config）→ 合并到顶部抽屉（汉堡菜单）
  - 中栏 / 右栏堆叠显示
- 断点实现：`useMediaQuery('(min-width: 1280px)')` + `useMediaQuery('(min-width: 768px)')`，由 Shell 统一注入 context

**主笔**：frontend-design（视觉与具体像素值，来自 demo 屏 1）+ CE Team（响应式工程与数据接口）

---

## §6 四模块边界

**要回答**：每个模块干什么、本轮怎么处理、未来怎么演化。

### 6.0 GoldenRador（粗轮廓占位，本轮预留位置）

- **职能**：互联网信息收集 + 当前激活 Channel Spirit 驱动筛选 + Topic 候选池
- **气质锚定**：不是盲抓热点的 feed，是精选池。秉承当前 Channel Spirit（首发 mindhikers）的深度取向。
- **Shell 位置**：左栏上第一个模块按钮
- **输出契约**：`TopicCandidate` → Roundtable（§4.3.1）
- **内部结构**：【本轮不展开】
- **Skill 占位**：Curator / WebSearch / RSS / Reader 等（待专项 PRD）
- **后续**：专项 PRD

### 6.1 Roundtable（已开发完毕，剥离 Shell 后入壳）

- **现状**：RT 仓库 `origin/sse-export` 已完成 Unit 1~6
- **迁移方式**：文件级复制 + 路由手工注册（见圆桌迁移方案 v2 + 附录 B）
- **Shell 处理**：⚠️ **不搬 Sidebar.tsx / App.tsx 整层布局** —— 由新 Shell 提供
- **内部核心**：Persona 多方发言（SSE 流式）+ 导演指令（止/投/深/换/？/可）+ Spike 提取 + DeepDive
- **输入契约**：`TopicCandidate`（§4.3.1）或用户直接输入命题
- **输出契约**：`Spike[] + RoundtableSession` → Crucible（§4.3.2）
- **鉴权改造**：所有 `/api/roundtable/*` 挂 `requireWorkspace`（§4.8）

### 6.2 GoldenCrucible（主工作流已定，重点：头尾衔接）

- **现状**：SSE 主力战场，四段式决策流（`topic_lock` / `deep_dialogue` / `crystallization` / `thesis_finalization`）已有实证（`src/schemas/crucible-soul.ts` + `server/crucible-orchestrator.ts`）
- **头衔接**：从 Roundtable 接收 Spike + Session（§4.3.2），进入 `topic_lock` 阶段
- **中工作流**：已定，本 PRD 不重复（参考 `docs/02_design/crucible/`）
- **尾产出**：`Thesis`（§4.3.3）
- **重点关注**：**头尾契约的 UX**（见 §4.3 + 北极星 §九 + 本 PRD §4.7）
- **鉴权**：已有 `/api/crucible/conversations` 支持 workspace context；补齐所有子路由 middleware

### 6.3 Writer（粗轮廓占位，本轮预留位置）

- **职能**：从 Thesis 改写为 X 长文 / 视频脚本 / 其他传播形态 + 审核
- **Shell 位置**：左栏上第四个模块按钮
- **输入契约**：`Thesis` from Crucible（§4.3.3）
- **输出契约**：`Copy` / `Script` → Delivery Console（§4.3.4 占位）
- **内部结构**：【本轮不展开】
- **命名**：Writer（占位，候选 GoldenQuill，待定，见 §12）
- **后续**：专项 PRD

---

## §7 Routing / State Architecture

**要回答**：URL 结构、状态三态切分、技术选型、生命周期。

### 7.1 URL scheme

```
/                                         → 重定向到 /m/crucible（或上次激活模块）
/m/:moduleId                              → 模块首页（展示该模块 Session 列表 + 空中栏）
/m/:moduleId/s/:sessionId                 → 具体 Session（中栏渲染该 Session）
/m/:moduleId/s/:sessionId?artifact=:id    → 右栏抽屉打开特定 Artifact
/m/:moduleId/s/:sessionId?highlight=...   → 定位跳转（用于可回溯，见 §4.4）
/settings/channel                         → Channel 切换器（v2）
/settings/personas                        → Persona 管理（含 v2 萃取引擎入口）
/settings/skills                          → Skill 管理
/auth/*                                   → Better Auth 官方路径
```

**moduleId 取值**：`rador | roundtable | crucible | writer`（外加扩展位 Module 的 slug）

**⭐ 决策：放弃 Hash Router，切换到 URL Path Routing**

**现状**：SSE 侧当前为 `useHashRoute()`（`src/App.tsx`），Roundtable 侧也未用正式路由库。

**Phase 1 切换到**：**React Router v6** 的 BrowserRouter + URL path routing。

**rationale**：
- Hash routing 无法被 SSR 识别（即使当前是 SPA，未来 Marketing 页可能需要 SSR）
- 分享链接的用户体验（`/m/crucible/s/xxx` 比 `#/crucible/xxx` 更专业）
- 回溯跳转（§4.4）需要稳定的 path scheme 与可复制的 URL，hash router 在某些 OAuth 回调下会丢失
- React Router v6 的 nested route + `Outlet` 天然契合 Shell + feature slice 的结构
- 成本：重写 `useHashRoute` 调用点（全仓约 10 处，在 `src/App.tsx` / `src/SaaSApp.tsx` 内聚）

### 7.2 State 三态切分

| 状态类型 | 选型 | 边界 | 典型用例 |
|---|---|---|---|
| **Server state** | **React Query (TanStack Query v5)** | 所有来自 API 的数据（Session 列表、Session 详情、Persona 池、Skill 池）+ SSE 流的起点 | `useQuery(['roundtable', 'sessions', workspaceId], ...)` |
| **Client state** | **Zustand（轻 store）** | UI 临时态：右栏抽屉开合、中栏消息滚动位置、主题、Persona 选择器临时选中 | `useShellStore(s => s.drawerOpen)` |
| **URL state** | **React Router v6 search params** | 可分享 / 可回溯的状态：`moduleId` / `sessionId` / `?artifact` / `?highlight` | `const [searchParams] = useSearchParams()` |

**⭐ 决策：引入 React Query + Zustand，替换现有纯 React Hook + localStorage 模式**

**现状**：SSE 侧纯 hook + localStorage（`readScopedCrucibleSnapshot` / `persistCrucibleSnapshot`），无 server state 缓存层。

**Phase 1 切换到**：
- React Query：统一缓存 + 自动重新获取 + 乐观更新
- Zustand：一个 `shellStore.ts` 统管 Shell 级 UI 态；feature slice 可以有自己的小 store 但不跨 slice 共享
- localStorage：**保留**用于 `activeWorkspaceId` 初始化 + 主题偏好；**退出**作为 Session 业务数据的持久化（业务数据完全走 API + React Query）

**rationale**：
- 现有的 `useDeliveryStore`（Socket.IO + state 融合）在多 Session 场景下已显吃力（refresh 后丢失游标 / 跨 Tab 不同步）
- Session 列表 + 详情的数据流天然适合 React Query 的 query invalidation 模型（handoff 触发时 invalidate 下游 Session 列表）
- Zustand 轻量（3KB）不会引入框架级成本

### 7.3 State 恢复协议（刷新 / 回退 / 分享链接）

**恢复顺序**：

1. **URL 解析**：从 `/m/:moduleId/s/:sessionId?artifact=:id&highlight=...` 解析出 `moduleId` / `sessionId` / `artifact` / `highlight`
2. **认证检查**：若无 session → 跳 `/auth/sign-in?redirect=<current-url>`（Better Auth 已支持）
3. **Workspace 恢复**：从 `active_workspace` 表读当前 workspace；若 URL 的 resource 不属于当前 workspace，提示"资源不在当前 workspace"并提供切换按钮
4. **数据拉取**：React Query 触发 `useQuery(['<module>', 'session', sessionId])`；同时触发相关列表 + artifact 查询（并行）
5. **视图定位**：数据到达后，根据 `?highlight` 参数滚动到具体 turn / spike（feature slice 自行实现）

**分享链接行为**：
- A 用户复制当前 URL 发给 B
- B 打开 → 登录 → 若 B 不是该 workspace 成员 → 403 + "联系 A 邀请你加入 workspace xxx"
- 若 B 是成员 → 自动切换到该 workspace → 正常渲染

### 7.4 SSE 连接在路由切换时的生命周期

**原则**：**SSE 连接绑定 Session，跟随路由退出而终止**。

- 进入 `/m/:moduleId/s/:sessionId` 且该 Session 处于 `streaming` 状态 → 建立 SSE 连接
- 用户切到其他 Session → 关闭当前 SSE（`AbortController.abort()`）
- 服务端检测到 client disconnect → **继续完成当前 turn 的写入**（不中止 LLM），但不再推送事件；客户端下次回到该 Session 时通过 `GET /api/<module>/sessions/:id` 拉取追补
- 切回来 → 重新建立 SSE 连接，若服务端已完成 → 立即关闭 + 渲染最终状态；若仍在流 → 从下一个 event 续流

**实现要点**：
- `useStreamingConversation(sessionId, moduleId)` hook：内部 `AbortController` + `EventSource` 兜底（SSE 的标准 API）
- React Query 的 `queryClient.invalidateQueries(['<module>', 'session', sessionId])` 在流结束时触发，刷新最终数据

**现有实证**：`src/components/crucible/sse.ts` 的 `readSseStream` + `consumeSseBuffer` 已实现 RFC 6453 合规的 SSE 解析 —— Phase 1 抽取为 shell-level hook。

**主笔**：CE Team

---

## §8 Design System & Tokens

**要回答**：Token 层级、组件原语清单、工程接入方式、还原度验收。

### 8.1 Token 两层

```
Primitive Token（值）         e.g. color.zinc.800 = #2c2a26
    ↓ 引用
Semantic Token（语义）         e.g. color.text.primary = {color.zinc.800}
    ↓ 消费
Component / Page               e.g. Button.color = {color.text.primary}
```

**工程接入**：
- Primitive + Semantic token 以 CSS Variables 暴露：`--color-text-primary: #2c2a26`
- 通过 Tailwind 的 `theme.extend.colors` 映射到工具类：`text-text-primary`
- 由 frontend-design 产出最终 `tokens.css` + `tailwind.config.ts`，工程侧引入即可

### 8.2 Token 表（占位，待 frontend-design demo 回卷）

详见北极星 §四（色彩）§五（字体）§六（动效）§七（布局）。本 PRD 工程侧仅声明 Token 维度：

- **Color**：`color.text.{primary,secondary,tertiary}` / `color.bg.{primary,secondary,elevated}` / `color.border.{subtle,default}` / `color.accent.{warm,success,warning,error}`
- **Type**：`font.family.{serif,sans,mono}` / `font.weight.{regular,medium,semibold}` / `font.size.{xs,sm,base,lg,xl,2xl,3xl}` / `font.lineHeight.{tight,normal,relaxed}`
- **Space**：`space.{1,2,3,4,6,8,12,16}` 对应 `4/8/12/16/24/32/48/64` px
- **Motion**：`motion.duration.{fast,base,slow}` = `150/200/250 ms` / `motion.easing.standard` = `cubic-bezier(0.4, 0, 0.2, 1)`
- **Radius**：`radius.{sm,md,lg}` = `4/6/8 px`
- **Shadow**：`shadow.{subtle,elevated}`（克制使用，线条优先）

### 8.3 组件原语清单

**Shell 级（复用跨模块）**：
- 导航：`ModuleTab` / `SidebarItem` / `SessionListItem` / `OriginBreadcrumb`
- 容器：`ShellLayout` / `ArtifactDrawer`
- 消息：`ConversationStream` / `MessageRenderer`（抽象，由业务 slice 贡献具体渲染器）
- Handoff：`HandoffButton`（§4.7 统一原语）

**通用原语**：
- 输入：`Button` / `IconButton` / `Input` / `Textarea` / `Select` / `Dropdown`
- 展示：`Card` / `Panel` / `Badge` / `Avatar` / `Chip` / `Divider` / `Skeleton`
- 反馈：`Toast` / `Dialog` / `Tooltip`
- 列表：`List` / `ListItem`

**业务 slice 级**（由各 feature slice 自主贡献，遵循原语风格）：
- Roundtable：`PropositionInput` / `DirectorControls` / `SpikeLibrary` / `ThinkingIndicator`
- Crucible：`SkillLoadedPanel` / `StageIndicator` / `PresentableCard`
- Writer：待专项

### 8.4 还原度验收

详见北极星 §十三（Claude Code 质感还原 ≥ 80%、12 节纪律全部落实）。工程侧额外约束：

- 每个组件原语在 `docs/03_ui/` 有独立文档页 + 状态矩阵（hover/focus/disabled/error/empty/loading）
- 每个业务 slice 必须通过 Storybook（或 ladle）独立预览
- A11y 自动化测试（axe-core）零 violations

**主笔**：frontend-design（主）+ CE Team（工程接入）

---

## §9 Responsive / A11y / Perf Budget

**要回答**：断点、无障碍基线、性能预算。

### 9.1 断点

| 断点 | 触发 | 行为 |
|---|---|---|
| `≥ 1280px` | Desktop full | 三栏全部渲染；右栏折叠但常驻 |
| `768-1279px` | Desktop narrow / Tablet | 右栏变悬浮抽屉（覆盖中栏） |
| `< 768px` | Mobile | 左栏上 → 底部 tab bar；左栏中 → 顶部下拉；左栏下 → 汉堡菜单；中栏满宽；右栏变全屏抽屉 |

**工程实现**：Shell 通过 `useResponsiveLayout()` hook（内部三个 `useMediaQuery`）返回当前层级，组件原语消费。

### 9.2 A11y：WCAG 2.2 AA 基线

**Landmarks**：
- `<header>`：顶部（如有）
- `<nav aria-label="Modules">`：左栏上模块切换器
- `<nav aria-label="Sessions">`：左栏中 Session 列表
- `<main>`：中栏
- `<aside aria-label="Artifact">`：右栏抽屉

**键盘可达**：
- 所有交互原语必须 `:focus-visible` 可见，使用 Token 化的焦点环（`--focus-ring`）
- 模块切换器：方向键导航 + `Enter` 激活
- Session 列表：方向键上下 + `Enter` 打开
- Handoff 按钮：`Enter` / `Space` 触发 + 触发后焦点自动跟随到新 Session（§4.7）
- 右栏抽屉：`Esc` 关闭 + 焦点回到触发点

**对比度**：
- `color.text.primary` / `color.bg.primary` 对比度 ≥ 4.5:1（正文）
- `color.text.secondary` / `color.bg.primary` 对比度 ≥ 4.5:1（次要文本）
- `color.accent.warm` 作为交互色对比度 ≥ 3:1（AA 大字体 / UI 元素）

**语义化**：
- `role="status"` / `aria-live="polite"`：SSE 流式区（让读屏器合理播报）
- `role="alert"`：关键错误
- `aria-expanded`：抽屉、折叠面板

**动效**：
- `prefers-reduced-motion` 用户：关闭位移动效，保留 opacity 过渡（由 motion token 自动处理）

### 9.3 Perf Budget

| 指标 | 预算 | 测量方式 |
|---|---|---|
| **LCP** | ≤ 2.5s | Web Vitals in production |
| **INP** | ≤ 200ms | Web Vitals（替代已废弃的 FID） |
| **CLS** | ≤ 0.1 | Web Vitals |
| **Shell 首屏 JS** | ≤ 150KB gzip | Vite build report |
| **单模块 chunk** | ≤ 100KB gzip | Vite build report（lazy-loaded） |
| **SSE 首 token 到屏** | ≤ 500ms（本地开发）/ ≤ 1200ms（生产） | 埋点（§10） |
| **Handoff 跳转** | ≤ 800ms | 埋点（§10） |

**Code split 策略**：
- Shell + Auth 走 main chunk
- 每个 Module 独立 `React.lazy()` 入口
- React Query / Zustand 进 main chunk（它们是跨 Module 共享的）
- Roundtable / Crucible 的 SSE 解析器归各自的 chunk（不跨模块共享）

**主笔**：CE Team

---

## §10 Observability

**要回答**：错误边界分层、埋点清单、监控体系。

### 10.1 ErrorBoundary 分层

```
<AppErrorBoundary>                       （兜底：白屏时的友好降级 + 错误上报）
  <ShellErrorBoundary>                   （Shell 级：左右栏出错，中栏仍可用）
    <ModuleErrorBoundary moduleId="x">   （Module 级：其他模块不受影响）
      <FeatureErrorBoundary>             （业务单元：比如 SpikeLibrary 出错，其他业务组件不崩）
        <ComponentErrorBoundary>         （组件级：可选，对已知易错组件包裹）
```

**每层的责任**：

| 层 | 捕获范围 | 降级方案 | 上报 |
|---|---|---|---|
| App | 任何未被下层捕获的错误 | 全屏 "出错了，请刷新" + 日志下载链接 | Sentry：level=fatal |
| Shell | 三栏布局组件错误 | 简化壳 + "重新加载" 按钮 | Sentry：level=error |
| Module | Module 内任一 slice 错误 | 显示该 Module 的空态 + "切换到其他模块" | Sentry：level=error + moduleId tag |
| Feature | 单个业务组件错误 | 该组件位置显示 inline error + 重试按钮 | Sentry：level=warning + featureId tag |

**实现要点**：
- 基于 `react-error-boundary` 封装带上报的 HOC
- 每层都注入 `errorContext`（包括 userId / workspaceId / moduleId / sessionId）方便还原问题
- SSE 流中的错误（`event: error`）不走 ErrorBoundary，走**业务层 toast + 重连提示**

### 10.2 埋点清单

**基础 meta**（每个事件都带）：
```
{ userId, workspaceId, timestamp, sessionId?, moduleId?, appVersion }
```

**Shell 事件**：
| event | 触发时机 | 附加字段 |
|---|---|---|
| `shell.module.switch` | 用户切换左栏上模块 | `from`, `to`, `method` (`click` / `keyboard`) |
| `shell.session.open` | 用户打开一个 Session | `moduleId`, `sessionId`, `entryPoint` (`list` / `deep_link` / `handoff`) |
| `shell.drawer.toggle` | 右栏抽屉开合 | `action` (`open` / `close`), `artifactKind` |
| `shell.settings.open` | 进入 settings | `section` |

**Slot 事件**：
| event | 触发时机 | 附加字段 |
|---|---|---|
| `slot.channel.activate` | Channel 切换 | `from`, `to` |
| `slot.persona.select` | Persona 选择变化（Session 级） | `moduleId`, `sessionId`, `added[]`, `removed[]` |
| `slot.skill.activate` | Skill 激活变化 | `moduleId`, `sessionId`, `skillId`, `action` (`activate` / `deactivate`) |

**Handoff 事件**（⭐ 产品灵魂埋点）：
| event | 触发时机 | 附加字段 |
|---|---|---|
| `handoff.rador_to_roundtable` | §4.3.1 按钮点击 | `topicCandidateId`, `durationMs` |
| `handoff.roundtable_to_crucible` | §4.3.2 按钮点击 | `roundtableSessionId`, `spikeCount`, `durationMs` |
| `handoff.crucible_to_writer` | §4.3.3 按钮点击 | `thesisId`, `durationMs` |
| `handoff.writer_to_delivery` | §4.3.4（v2）| TBD |
| `handoff.trace_back` | 用户点击回溯面包屑 | `fromModule`, `toModule`, `traceDepth` |

**SSE 事件**：
| event | 触发时机 | 附加字段 |
|---|---|---|
| `sse.connect` | SSE 建立 | `moduleId`, `sessionId`, `endpoint` |
| `sse.first_token` | 首 token 到屏 | `latencyMs` |
| `sse.disconnect` | SSE 关闭 | `reason` (`natural_end` / `user_nav` / `network` / `abort`), `durationMs` |
| `sse.reconnect` | 重连 | `attempt`, `latencyMs` |
| `sse.error` | `event: error` 收到 | `errorCode`, `errorMessage` |

**Persona 萃取预留（v2）**：
- `persona.extraction.submit` / `persona.extraction.progress` / `persona.extraction.approve`

**性能埋点**：
- 标准 Web Vitals（LCP / INP / CLS）通过 `web-vitals` 库自动上报
- Handoff 时间（§9.3 预算）单独上报

### 10.3 日志与监控

- **前端**：Sentry SDK（错误 + 性能）+ 自建埋点上报（PostHog / 自建）
- **后端**：
  - 结构化日志（pino / winston）注入 `requestId` / `userId` / `workspaceId`
  - SSE 流日志级别：INFO（connect/disconnect）+ DEBUG（turn）+ ERROR（stream error）
  - LLM 调用日志：模型 / token 用量 / 延迟 / 错误（用于成本与可用性监控）
- **告警阈值（初稿）**：
  - 5xx 率 > 1% → warning
  - SSE 错误率 > 5% → critical
  - Handoff 失败率 > 2% → critical（产品灵魂瞬间，宁可误报）

**主笔**：CE Team

---

## §11 实施路线

**要回答**：从骨架到上线的阶段切分。

| Phase | 范围 | 交付物 | 依赖 |
|---|---|---|---|
| **Phase 0**（已完成）| 北极星简报 + PRD 骨架落盘，双轨启动 | 两份文稿 + 本 PRD v0.2 | — |
| **Phase 1** | Design System + Shell 空壳 | Token / 原语 / ShellLayout / React Router / React Query / Zustand / ErrorBoundary / `requireWorkspace` middleware | Phase 0 |
| **Phase 2** | Roundtable 入壳（engine 迁入 + 业务组件适配新 Shell）| 可用的 Roundtable 模块 + TopicCandidate 输入口（占位） | Phase 1 + 圆桌迁移方案附录 B |
| **Phase 3** | GoldenCrucible 包装为 feature slice 入壳 | 可用的 Crucible 模块 + Roundtable→Crucible handoff（§4.3.2） | Phase 2 |
| **Phase 4** | GoldenRador 粗轮廓实现 | Rador 模块 + TopicCandidate 输出（§4.3.1） | Rador 专项 PRD |
| **Phase 5** | Writer 粗轮廓实现 | Writer 模块 + Thesis→Copy handoff（§4.3.3-4） | Writer 专项 PRD |
| **Phase 6** | 持续优化 + Persona 萃取引擎接入（§3.3.4）+ Channel 切换 UX（§3.2.3）| v2 能力释放 | Phase 3~5 |

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
- [ ] **新增**：Soul Registry（`docs/02_design/crucible/soul_registry.yml`）是否与新 `PersonaManifestSchema` 统一成单一来源（推荐统一，v1 阶段落地时做）
- [ ] **新增**：跨 workspace 的 Persona/Skill/Channel **共享**能力（当前设计为 workspace-scoped，未来企业版可能需要"组织级共享池"）
- [ ] **新增**：Session 的**归档策略**（软归档 vs 硬删除 vs TTL）—— 影响可回溯在历史数据上的表现
- [ ] **新增**：Handoff 的**撤销**操作（送入后 30s 内允许反悔？）—— 需产品侧决策

---

## 双轨工作交接

### 工程轨（CE Team 主笔章节）

- §3 Pluggable Slot Architecture ✅（本版本完成）
- §4 Cross-Module Handoff Contract ✅（本版本完成）
- §7 Routing / State Architecture ✅（本版本完成）
- §9 Responsive / A11y / Perf Budget ✅（本版本完成）
- §10 Observability ✅（本版本完成）
- §2 / §5 / §8 中的工程部分 ✅（本版本完成）

**输出状态**：工程轨 PRD v0.2 已落盘。Phase 1 可以按本文档启动设计评审 → 实施。

### 视觉轨（frontend-design 主笔章节）

- §1 视觉锚点具象化（本 PRD 已索引到北极星）
- §5 Shell 视觉（本 PRD 已留工程契约，视觉待 demo）
- §8 Design System & Tokens（本 PRD 已留 Token 维度，具体值待 demo）
- 四屏高保真 demo（见北极星简报 §十）

**输入**：北极星简报 + 本 PRD v0.2（工程契约）
**建议工具**：`frontend-design` Anthropic 官方 skill
**输出**：4 屏 demo + Token 定义 + 组件原语视觉
**合卷点**：demo 产出后，OldYang 将视觉部分合入本 PRD → v1.0

### 合卷评审（OldYang）

双轨产出后，OldYang 合卷 → 整卷评审 → 用户终审 → PRD v1.0 定稿 → 进入 Phase 1 实施。

---

## 附录 A：关键文件与代码实证索引

**现有 SSE 侧（作为工程基准）**：
- `src/schemas/crucible-soul.ts` — Soul/Persona schema 基础
- `src/schemas/crucible-runtime.ts` — Skill / SocratesTool schema 基础
- `src/components/crucible/soulRegistry.ts` — Persona 客户端加载器
- `server/crucible-orchestrator.ts` — Crucible 四段决策实证
- `server/crucible.ts` — SSE handler + Researcher/FactChecker 实证
- `server/crucible-persistence.ts` — 已有 `appendSpikesToCrucibleConversation`（§4.3.2 关键实证）
- `server/auth/index.ts` — Better Auth 配置
- `server/auth/workspace-store.ts` — `workspace / workspace_member / active_workspace` 表 + `getWorkspaceContext`
- `src/components/crucible/sse.ts` — RFC 6453 SSE 解析器（§7.4 将抽取为 shell hook）

**将迁入 SSE（来自 `GoldenCrucible-Roundtable` 仓库 `origin/sse-export` 分支）**：
- `server/roundtable-engine.ts` / `server/spike-extractor.ts` / `server/deepdive-engine.ts` / `server/proposition-sharpener.ts` / `server/compression-config.ts` / `server/roundtable-types.ts` / `server/persona-loader.ts`
- `src/schemas/persona.ts`（将升格为全局 Persona schema，合并 `soul_registry`）
- `personas/*.json`（7 个哲人）
- 业务组件：`src/components/roundtable/{RoundtableView,DirectorControls,PropositionInput,SpikeLibrary,ThinkingIndicator,useRoundtableSse,types}.tsx`
- **不迁入**：`src/components/Sidebar.tsx` / `src/App.tsx`（Shell 层由新 PRD 提供）

**本 PRD 规划新建**：
- `src/schemas/channel-spirit.ts` — Channel Spirit Manifest（§3.2.1）
- `src/schemas/persona.ts` — Persona Manifest 升格（§3.3.1）
- `src/schemas/skill.ts` — Skill Manifest（§3.4.1）
- `src/schemas/persona-extraction.ts` — Persona 萃取接口预留（§3.3.4）
- `src/schemas/handoff/{topic-candidate,roundtable-session,spike,thesis,copy}.ts` — 四段流转契约（§4.3）
- `src/modules/registry.ts` — Module 注册表（§2.3）
- `server/auth/workspace-middleware.ts` — workspace 鉴权统一 middleware（§4.8）
- `server/routes/<module>.ts` — 每个 Module 的路由独立文件（§4.8）
- `docs/02_design/channels/mindhikers.channel.yml` — 首发 Channel 定义（§3.2.2）

---

*编制：OldYang（老杨） + CE Team*
*日期：2026-04-15*
*版本：v0.2（工程轨完整扩写；视觉轨待 frontend-design demo 合卷为 v1.0）*
*状态：active，Phase 1 可据此启动*
