---
title: "Unit 3: 圆桌引擎核心"
type: implementation-plan
unit: 3
status: draft
date: 2026-04-11
owner: OldYang
supersedes: none
---

# Unit 3: 圆桌引擎核心

> **定位**：圆桌讨论的核心引擎，负责会话管理、哲人调度、流式输出。
> **与原版差异**：采用 v2 架构的两阶段流式输出（chunk + meta）、三轮 Context 压缩、投机预热机制。

---

## 1. 交付清单

| 文件 | 说明 | 依赖 |
|------|------|------|
| `server/roundtable-types.ts` | 核心类型定义（Session, Turn, Synthesis 等） | Unit 1 |
| `server/roundtable-engine.ts` | 引擎核心逻辑 | Unit 1, Unit 2 |
| `server/index.ts` | SSE 端点注册 | - |
| `server/__tests__/roundtable-engine.test.ts` | 引擎测试 | - |

---

## 2. 核心架构

### 2.1 类型定义

```typescript
// server/roundtable-types.ts

// 会话状态
export type RoundtableStatus = 
  | 'selecting'      // 正在选择发言人
  | 'opening'        // Moderator 开场
  | 'discussing'     // 哲人发言中
  | 'synthesizing'   // Moderator 综合
  | 'awaiting'       // 等待导演指令
  | 'completed';     // 已完成

// 发言者选择结果
export interface SpeakerSelection {
  selectedSlugs: string[];
  reason: string;
  focusAngle: string;
}

// 单轮发言
export interface PhilosopherTurn {
  speakerSlug: string;
  utterance: string;        // 完整发言内容
  action: '陈述' | '质疑' | '补充' | '反驳' | '修正' | '综合';
  briefSummary: string;     // ≤15字核心压缩
  challengedTarget?: string; // 回应对象
  stanceVector?: {
    carePriority: number;      // 0-1
    libertyPriority: number;   // 0-1
    authorityPriority: number; // 0-1
  };
  timestamp: number;
}

// Moderator 综合
export interface RoundSynthesis {
  summary: string;
  focusPoint: string;       // 核心裂缝/张力点
  tensionLevel: 1 | 2 | 3 | 4 | 5; // 1=温和，5=激烈
  suggestedDirections: string[]; // 下轮可能走向
}

// 单轮数据
export interface Round {
  roundIndex: number;
  turns: PhilosopherTurn[];
  synthesis?: RoundSynthesis;
}

// 会话完整状态
export interface RoundtableSession {
  id: string;
  proposition: string;
  sharpenedProposition?: string; // Unit 2 锐化后的命题
  contrastAnchor?: string;       // 对比锚点
  selectedSlugs: string[];
  status: RoundtableStatus;
  rounds: Round[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    totalTokens?: number;
    latencyMs?: number;
  };
}

// SSE 事件类型
export type RoundtableSseEvent =
  | { type: 'roundtable_selection'; data: SpeakerSelection }
  | { type: 'roundtable_synthesis'; data: RoundSynthesis & { roundIndex: number } }
  | { type: 'roundtable_turn_chunk'; data: { roundIndex: number; speakerSlug: string; chunk: string } }
  | { type: 'roundtable_turn_meta'; data: Omit<PhilosopherTurn, 'utterance'> }
  | { type: 'roundtable_awaiting'; data: { sessionId: string; currentRound: number } }
  | { type: 'roundtable_error'; data: { message: string; recoverable: boolean } }
  | { type: 'roundtable_spikes_ready'; data: { spikes: Spike[] } };
```

### 2.2 引擎核心流程

```
startRoundtable(proposition, res)
  │
  ├─ 1. selectSpeakers() — tier:fast, temp:0.2
  │     └─ SSE: roundtable_selection
  │
  ├─ 2. moderator.openRound() — tier:standard, temp:0.4
  │     └─ SSE: roundtable_synthesis (roundIndex: 0)
  │
  ├─ 3. for each round:
  │     ├─ for each philosopher (顺序，靶子传递):
  │     │   ├─ callPhilosopher() — tier:premium, temp:0.85
  │     │   │   ├─ 流式 → SSE: roundtable_turn_chunk (逐 chunk)
  │     │   │   └─ 元数据 → SSE: roundtable_turn_meta
  │     │   └─ [投机预热] 检测到 META 时预发下一位请求
  │     └─ moderator.synthesize() — tier:standard, temp:0.4
  │         └─ SSE: roundtable_synthesis
  │
  ├─ 4. SSE: roundtable_awaiting (等导演指令)
  │
  └─ 5. handleDirectorCommand()
       ├─ 止 → extractSpikes() + SSE: roundtable_spikes_ready
       ├─ 投 → 注入观点后继续下一轮
       ├─ 深 → 深入当前裂缝
       ├─ 换 → swap persona
       ├─ ？ → 定向提问
       └─ 可 → 继续下一轮
```

---

## 3. 关键实现细节

### 3.1 两阶段流式输出

**Prompt 模板**：

```
【输出格式 - 两阶段】

第一阶段：直接输出你的发言内容（150-400 字），不要任何 JSON、不要 markdown 代码块。
发言结束后单独一行写 "---META---"，然后跟上 JSON 元数据块：

---META---
{
  "action": "陈述|质疑|补充|反驳|修正|综合",
  "briefSummary": "≤15字核心压缩",
  "challengedTarget": "你回应的哪一位及其哪一点",
  "stanceVector": { "carePriority": 0-1, "libertyPriority": 0-1, "authorityPriority": 0-1 }
}
```

**后端解析逻辑**：

```typescript
// 伪代码
let buffer = '';
let utterance = '';
let metaParsed = false;

for await (const chunk of llmStream) {
  buffer += chunk;
  
  if (!metaParsed && buffer.includes('---META---')) {
    const [textPart, metaPart] = buffer.split('---META---');
    utterance = textPart.trim();
    
    // 发送剩余的文本 chunk
    sendSse({ type: 'roundtable_turn_chunk', data: { ... } });
    
    // 解析并发送 meta
    try {
      const meta = JSON.parse(metaPart.trim());
      sendSse({ type: 'roundtable_turn_meta', data: { ...meta, ... } });
      metaParsed = true;
    } catch {
      // fallback 默认值
      sendSse({ type: 'roundtable_turn_meta', data: { action: '陈述', briefSummary: utterance.slice(0, 15) } });
    }
  } else if (!metaParsed) {
    // 流式发送文本 chunk
    sendSse({ type: 'roundtable_turn_chunk', data: { chunk } });
  }
}

// 如果没有 META 标记（异常情况）
if (!metaParsed) {
  utterance = buffer.trim();
  sendSse({ type: 'roundtable_turn_meta', data: { action: '陈述', briefSummary: utterance.slice(0, 15) } });
}
```

### 3.2 Context 压缩策略

**原始设计（按固定轮次分档）**：

```typescript
function buildRoundMemory(
  persona: PersonaProfile,
  session: RoundtableSession,
  currentRoundIndex: number
): string {
  if (currentRoundIndex <= 1) return ''; // 第 1 轮无历史

  if (currentRoundIndex === 2) {
    // 第 2 轮：每位哲人上一轮的 briefSummary
    const round1 = session.rounds[0];
    const myTurn = round1.turns.find(t => t.speakerSlug === persona.identity.slug);
    const others = round1.turns.filter(t => t.speakerSlug !== persona.identity.slug);
    return `你在第 1 轮说：${myTurn?.briefSummary || '（无记录）'}\n` +
      others.map(t => `${t.speakerSlug} 说：${t.turn.briefSummary}`).join('\n');
  }

  // 第 3 轮+：使用 moderator 综合摘要
  const latestSynthesis = session.rounds[currentRoundIndex - 2]?.synthesis;
  if (!latestSynthesis) return '';
  return `【之前讨论的核心裂缝】${latestSynthesis.focusPoint}\n` +
    `【张力度】${latestSynthesis.tensionLevel || '?'}/5\n` +
    `【你之前的核心立场】保持连贯，除非你主动承认被说服。`;
}
```

**改进设计：按全局 LLM 选型分设压缩门限**

> **设计原则**：压缩触发基于**实际 token 负担**而非固定轮次。全局 LLM 选型由项目配置 `LLM_TIER` 决定，不同模型的 context window、计费策略、内置能力差异显著，因此各自对应一套压缩门限。同一时间只生效一套方案。

**三档压缩级别**：

| 级别 | 名称 | 传入内容 | 信息保真度 |
|------|------|---------|-----------|
| L0 | 全量 | 所有历史轮的完整 utterance | 最高，无损失 |
| L1 | briefSummary | 每人每轮 ≤15 字核心摘要 | 中，保留立场但丢失论证细节 |
| L2 | Moderator 综合 | 仅 focusPoint + tensionLevel | 最低，只保留争议焦点 |

#### 3.2.1 压缩配置接口与预设表

```typescript
// server/compression-config.ts

interface CompressionConfig {
  modelName: string;
  contextWindowTokens: number;   // 模型标称 context window
  effectiveInputTokens: number;  // 实际可用于历史的 input token 上限
  costBreakpoint?: number;       // 超过此值计费翻倍（如 GPT 5.4 的 272K 卡口）
  hasBuiltinCompaction: boolean; // 模型是否自带 context 压缩（如 Opus 4.6）
  l0Threshold: number;           // < 此值：全量（L0）
  l1Threshold: number;           // < 此值：briefSummary（L1），>= 此值：Moderator 综合（L2）
}

const LLM_TIER = process.env.LLM_TIER as 'kimi-k2.5' | 'gpt-5.4' | 'opus-4.6';

const COMPRESSION_PRESETS: Record<string, CompressionConfig> = {
  'kimi-k2.5': {
    modelName: 'Kimi K2.5',
    contextWindowTokens: 256_000,
    effectiveInputTokens: 179_200,   // 256K × 0.7
    costBreakpoint: undefined,       // 无阶梯计费
    hasBuiltinCompaction: false,
    l0Threshold: 50_000,             // ~5-6 轮 × 3 人全量
    l1Threshold: 130_000,            // ~12 轮 × 3 人 briefSummary
  },
  'gpt-5.4': {
    modelName: 'GPT 5.4',
    contextWindowTokens: 1_050_000,
    effectiveInputTokens: 922_000,   // 官方标称 922K input
    costBreakpoint: 272_000,         // 超过 272K 按 2x 计费
    hasBuiltinCompaction: false,
    l0Threshold: 100_000,            // 成本优先：在 272K 卡口前留余量
    l1Threshold: 250_000,            // 接近 272K 卡口时切 L1
  },
  'opus-4.6': {
    modelName: 'Opus 4.6',
    contextWindowTokens: 1_000_000,
    effectiveInputTokens: 872_000,   // 1M - 128K max output
    costBreakpoint: undefined,       // 无长 context 加价
    hasBuiltinCompaction: true,      // 内置 Compaction 兜底
    l0Threshold: 200_000,            // 窗口大 + 无加价，可以大方全量
    l1Threshold: 500_000,            // 极端长圆桌才需要 L2
  },
};

const activeConfig = COMPRESSION_PRESETS[LLM_TIER];
```

#### 3.2.2 方案 A — Kimi K2.5（256K context，成本低，窗口紧凑）

| 压缩级别 | Token 阈值 | 约等于（3人圆桌） | 触发理由 |
|----------|-----------|----------------|---------|
| **L0 全量** | < 50K | 前 5-6 轮 | 256K 窗口下 50K 已占 ~20%，仍然安全 |
| **L1 briefSummary** | 50K – 130K | 6-12 轮 | 逼近安全利用率 70%（180K），需要减负 |
| **L2 Moderator 综合** | > 130K | 12 轮+ | 接近上限，只保留核心裂缝 |

**特点**：
- 安全利用率 **70%**（~180K 可用），窗口是三者中最小的
- 无阶梯计费，单价便宜，压缩主要由**窗口上限**驱动而非成本
- 适合高频短圆桌（3-5 轮），超过 6 轮就开始有感知的压缩
- 无内置 Compaction，应用层压缩是唯一防线

#### 3.2.3 方案 B — GPT 5.4（1.05M context，272K 以上双倍计费）

| 压缩级别 | Token 阈值 | 约等于（3人圆桌） | 触发理由 |
|----------|-----------|----------------|---------|
| **L0 全量** | < 100K | 前 10 轮 | 272K 卡口前的安全区 |
| **L1 briefSummary** | 100K – 250K | 10-25 轮 | 接近 272K 计费卡口，压缩以控制成本 |
| **L2 Moderator 综合** | > 250K | 25 轮+ | 超过卡口后成本翻倍，必须重度压缩 |

**特点**：
- 标称 1.05M（922K input / 128K output），窗口本身最大
- **关键约束不是窗口而是成本**：超过 272K 每 token 按 2x 计费
- L0→L1 的切换点（100K）刻意保守，为 system prompt + persona profile 预留余量
- 无内置 Compaction，应用层必须在 272K 前主动干预
- 适合中长圆桌（5-10 轮），如需超过 25 轮建议切换到 Opus 4.6

#### 3.2.4 方案 C — Opus 4.6（1M context，无加价，内置 Compaction）

| 压缩级别 | Token 阈值 | 约等于（3人圆桌） | 触发理由 |
|----------|-----------|----------------|---------|
| **L0 全量** | < 200K | 前 20+ 轮 | 1M 无加价，200K 仅占 20%，完全不需要压缩 |
| **L1 briefSummary** | 200K – 500K | 理论上很难达到 | 预防性压缩，减少 Compaction 触发频率 |
| **L2 Moderator 综合** | > 500K | 极端马拉松场景 | 超过 50% 窗口，主动压缩配合内置 Compaction |

**特点**：
- 1M context（128K max output），**无长 context 加价**，token 单价恒定
- **独有优势：内置 Compaction** — 当 context 接近窗口上限时 API 自动摘要压缩历史
- 应用层压缩 + Compaction 形成**双重保险**，策略可以最宽松
- L0 全量区间长达 200K（约 20+ 轮），绝大多数圆桌全程不触发压缩
- 适合深度长圆桌、马拉松式讨论，是三者中最"奢侈"的选型

#### 3.2.5 统一 buildRoundMemory 实现

```typescript
// server/roundtable-engine.ts

import { activeConfig } from './compression-config';

function estimateHistoryTokens(session: RoundtableSession, upToRound: number): number {
  let total = 0;
  for (let i = 0; i < upToRound; i++) {
    for (const turn of session.rounds[i]?.turns || []) {
      total += Math.ceil(turn.utterance.length / 1.5); // 中文约 1.5 字符/token
    }
  }
  return total;
}

function buildFullHistory(
  persona: PersonaProfile,
  session: RoundtableSession,
  upToRound: number
): string {
  const lines: string[] = [];
  for (let i = 0; i < upToRound; i++) {
    const round = session.rounds[i];
    lines.push(`--- 第 ${i + 1} 轮 ---`);
    for (const turn of round.turns) {
      const marker = turn.speakerSlug === persona.identity.slug ? '【你】' : '';
      lines.push(`${marker}${turn.speakerSlug}（${turn.action}）：${turn.utterance}`);
    }
    if (round.synthesis) {
      lines.push(`[主持人综合] ${round.synthesis.summary}`);
    }
  }
  return lines.join('\n');
}

function buildBriefSummaryHistory(
  persona: PersonaProfile,
  session: RoundtableSession,
  upToRound: number
): string {
  const lines: string[] = [];
  for (let i = 0; i < upToRound; i++) {
    const round = session.rounds[i];
    lines.push(`--- 第 ${i + 1} 轮摘要 ---`);
    const myTurn = round.turns.find(t => t.speakerSlug === persona.identity.slug);
    const others = round.turns.filter(t => t.speakerSlug !== persona.identity.slug);
    if (myTurn) lines.push(`【你】说：${myTurn.briefSummary}`);
    for (const t of others) {
      lines.push(`${t.speakerSlug} 说：${t.briefSummary}`);
    }
  }
  return lines.join('\n');
}

function buildSynthesisHistory(
  session: RoundtableSession,
  upToRound: number
): string {
  const latestSynthesis = session.rounds[upToRound - 1]?.synthesis;
  if (!latestSynthesis) return '';
  return `【之前讨论的核心裂缝】${latestSynthesis.focusPoint}\n` +
    `【张力度】${latestSynthesis.tensionLevel || '?'}/5\n` +
    `【你之前的核心立场】保持连贯，除非你主动承认被说服。`;
}

function buildRoundMemory(
  persona: PersonaProfile,
  session: RoundtableSession,
  currentRoundIndex: number
): string {
  if (currentRoundIndex <= 1) return ''; // 第 1 轮无历史

  const estimatedTokens = estimateHistoryTokens(session, currentRoundIndex - 1);

  if (estimatedTokens < activeConfig.l0Threshold) {
    return buildFullHistory(persona, session, currentRoundIndex - 1);
  }
  if (estimatedTokens < activeConfig.l1Threshold) {
    return buildBriefSummaryHistory(persona, session, currentRoundIndex - 1);
  }
  return buildSynthesisHistory(session, currentRoundIndex - 1);
}
```

### 3.3 投机预热机制

```typescript
// 伪代码
let pendingPreload: Promise<PhilosopherTurn> | null = null;
let nextSpeakerSlug: string | null = null;

async function processPhilosopherTurn(speakerSlug: string, target: string) {
  // 如果存在预热请求，复用它
  if (pendingPreload && nextSpeakerSlug === speakerSlug) {
    const result = await pendingPreload;
    // 检查预热命中率
    if (isHitRateAcceptable(result, target)) {
      return result;
    }
    // 命中率太低，重新请求
  }
  
  // 正常请求
  const result = await callPhilosopher(speakerSlug, target);
  
  // 预热下一位
  const nextIndex = session.selectedSlugs.indexOf(speakerSlug) + 1;
  if (nextIndex < session.selectedSlugs.length) {
    nextSpeakerSlug = session.selectedSlugs[nextIndex];
    const partialContext = buildPartialContext(result);
    pendingPreload = callPhilosopher(nextSpeakerSlug, partialContext);
  }
  
  return result;
}
```

---

## 4. API 端点

### 4.1 SSE 流式端点

```typescript
// POST /api/roundtable/turn/stream
// Content-Type: application/json

// Request Body
interface StartRoundtableRequest {
  proposition: string;
  sharpenedProposition?: string; // 可选，来自 Unit 2
  contrastAnchor?: string;       // 可选，对比锚点
  preferredPersonas?: string[];  // 可选，用户偏好的哲人
}

// Response: text/event-stream
// SSE 事件见 2.1 中的 RoundtableSseEvent
```

### 4.2 导演指令端点

```typescript
// POST /api/roundtable/director

interface DirectorCommandRequest {
  sessionId: string;
  command: '止' | '投' | '深' | '换' | '？' | '可';
  payload?: {
    injection?: string;      // 命令"投"时：注入的观点
    newPersonaSlug?: string; // 命令"换"时：新哲人 slug
    targetPersona?: string;  // 命令"？"时：提问对象
  };
}
```

### 4.3 会话查询端点

```typescript
// GET /api/roundtable/session/:id
// Response: RoundtableSession
```

---

## 5. Prompt 模板

> **设计原则**：
> 1. **字段对齐**：模板变量与 `PersonaProfile` Schema 一一对应，不使用抽象占位符
> 2. **反媚俗**：显式禁止无根据的认同和客套，要求冲突有实质内容
> 3. **适配 Kimi K2.5**：temperature 固定为 1，通过 prompt 约束补偿随机性（加分隔符、给负面示例、锁定输出格式）
> 4. **可解析**：所有 JSON 输出用 fenced block 包裹，便于后端正则提取

### 5.1 发言者选择

```
【角色】你是圆桌讨论的选角导演，任务是从候选哲人中挑出最能产生真实分歧的组合。

【候选哲人档案】
{{#each personas}}
---
slug: {{slug}}
displayName: {{displayName}}（{{era}}）
核心哲学: {{corePhilosophy}}
立场锚点: care={{anchors.carePriority}} liberty={{anchors.libertyPriority}} authority={{anchors.authorityPriority}} fairness={{anchors.fairnessPriority}}
关键对比轴:
{{#each contrastPoints}}
  - {{dimension}}: {{stance}}
{{/each}}
---
{{/each}}

【讨论命题】
原始命题：{{proposition}}
{{#if sharpenedProposition}}锐化命题：{{sharpenedProposition}}{{/if}}
{{#if contrastAnchor}}对比锚点：{{contrastAnchor}}{{/if}}

【选择标准——按优先级排序】
1. 锚点对立：在 carePriority / libertyPriority / authorityPriority 上至少存在两组 ≥0.4 的差值
2. 对比轴碰撞：至少有一个 contrastPoints.dimension 被两位候选人以相反 stance 覆盖
3. 时代/文化互补：东西方、古代/现代至少各一位
4. 人数：3-5 人。3 人时偏好三角张力（A↔B, B↔C, C↔A），不要出现 2v1 抱团

【反模式——不要这样选】
- 不要选 3 个立场接近的人"友好交流"
- 不要因为哲人有名就选，要因为在该命题上有真实分歧才选

【输出格式】严格 JSON，不要添加任何额外文字：
```json
{
  "selectedSlugs": ["slug1", "slug2", "slug3"],
  "reason": "20-50字：谁和谁在哪个维度对立",
  "focusAngle": "讨论最可能撕裂的核心角度"
}
```


### 5.2 哲人发言

```
【你是谁】
你是 {{displayName}}（{{slug}}），{{era}}的思想者。
你不是在"扮演角色"——你就是这个人，带着你真实的信念发言。

【你的哲学内核】
{{corePhilosophy}}

【你的思考方式】
{{thinkingStyle}}

【你的招牌追问】
当你觉得对方定义模糊或论证空洞时，你倾向于问：
"{{signatureQuestion}}"

【你的语言风格】
语气：{{voiceRules.tone}}
语言习惯：{{voiceRules.habits}}
绝对不要：{{voiceRules.avoid}}

【你的立场坐标】
care={{anchors.carePriority}} liberty={{anchors.libertyPriority}} authority={{anchors.authorityPriority}} fairness={{anchors.fairnessPriority}}

【你的底线】
{{honestBoundary}}

【你在关键维度上的立场】
{{#each contrastPoints}}
- {{dimension}}: {{stance}}
{{/each}}

================================

{{#if roundMemory}}
【历史记忆】
{{roundMemory}}
{{/if}}

【当前讨论命题】
{{#if sharpenedProposition}}{{sharpenedProposition}}{{else}}{{proposition}}{{/if}}

{{#if targetContext}}
【你需要回应的内容】
{{targetContext}}
{{/if}}

【发言规则】
1. 从你的哲学内核出发，不要泛泛而谈
2. 你的 preferredActions 是 [{{preferredActions}}]，优先使用这些动作
3. 如果你要反驳，必须指出对方论证的具体漏洞，而不是"我不同意"
4. 如果你要认同，必须说出对方的哪句话说服了你，且解释为什么这与你的哲学一致。禁止无根据的"我同意你的看法"
5. 可以使用你的招牌追问来逼对方澄清
6. 保持你的底线——如果讨论方向违反你的 honestBoundary，明确拒绝
7. 150-400 字。宁可犀利简短，不要冗长平庸

【输出格式 - 两阶段】

第一阶段：直接输出你的发言内容（150-400 字），不要任何 JSON、不要 markdown 代码块。
发言结束后单独一行写 "---META---"，然后紧跟 JSON 元数据块：

---META---
{
  "action": "陈述|质疑|补充|反驳|修正|综合",
  "briefSummary": "≤15字核心压缩",
  "challengedTarget": "你回应的哪一位及其哪一点（无则 null）",
  "stanceVector": { "carePriority": 0-1, "libertyPriority": 0-1, "authorityPriority": 0-1 }
}

```

### 5.3 Moderator 综合

```
【角色】你是圆桌主持人。你不参与辩论，你的工作是精确诊断讨论的结构。

【当前状态】
命题：{{proposition}}
第 {{roundIndex}} 轮，共 {{selectedSlugs.length}} 位哲人参与。

{{#if previousSynthesis}}
【上一轮综合】
核心裂缝：{{previousSynthesis.focusPoint}}
张力度：{{previousSynthesis.tensionLevel}}/5
你需要对比：本轮裂缝是否位移？张力是升温还是降温？
{{/if}}

【本轮发言记录】
{{#each turns}}
{{speakerSlug}}（{{action}}）：{{briefSummary}}
  → 完整发言：{{utterance}}
{{/each}}

【你需要做的分析】
1. **summary**：客观概括本轮核心论点（30-50字），不要评价对错
2. **focusPoint**：提炼最有张力的争议点。格式："A 认为……而 B 认为……"，必须点名
3. **convergenceSignals**：哪些哲人的立场在靠近？靠近了多少？（如果没有就写"无明显收敛"）
4. **tensionLevel**：1-5 打分
   - 1=大家在各说各话，无交锋
   - 2=有礼貌分歧，但没有直接回应
   - 3=有明确的论点对论点交锋
   - 4=出现了对核心信念的挑战
   - 5=有人的底线被触及，讨论白热化
5. **suggestedDirections**：3 个可能的下轮走向，每个必须基于本轮实际出现的未解分歧，不要凭空编造

【输出格式】严格 JSON，不要添加任何额外文字：
```json
{
  "summary": "30-50字客观概括",
  "focusPoint": "A 认为……而 B 认为……",
  "convergenceSignals": "描述收敛趋势或'无明显收敛'",
  "tensionLevel": 3,
  "suggestedDirections": [
    "基于X分歧继续深入：……",
    "引入Y维度扩展：……",
    "追问Z的定义模糊：……"
  ]
}

```

---

## 6. 测试策略

### 6.1 单元测试

```typescript
// server/__tests__/roundtable-engine.test.ts

describe('RoundtableEngine', () => {
  describe('selectSpeakers', () => {
    it('应返回 3-5 个不同的哲人');
    it('应处理 persona 列表为空的情况');
    it('应处理 LLM 超时 fallback');
  });

  describe('callPhilosopher', () => {
    it('应解析两阶段输出');
    it('应处理无 META 标记的 fallback');
    it('应正确构建 roundMemory');
    it('应处理单个哲人超时');
  });

  describe('buildRoundMemory', () => {
    it('第 1 轮返回空字符串');
    it('第 2 轮使用 briefSummary');
    it('第 3 轮+使用 synthesis');
  });

  describe('SSE events', () => {
    it('应按正确顺序发送事件');
    it('应在错误时发送 roundtable_error');
    it('应支持客户端重连恢复');
  });
});

```

### 6.2 集成测试

- 完整一轮讨论（3 哲人 1 轮）
- 导演指令"止"→Spike 提取流程
- 异常恢复（单个哲人失败不影响整体）

---

## 7. 验收标准

### 7.1 功能验收

- [ ] 发言者选择返回有效哲人列表
- [ ] 哲人发言两阶段输出正确（chunk + meta）
- [ ] Context 压缩三轮策略生效
- [ ] 导演 6 种指令均有对应行为
- [ ] 单个哲人超时/失败不阻塞整体

### 7.2 性能验收

- [ ] TTFT（首 token 时间）< 3 秒
- [ ] 哲人间隙用户感知 < 1.5 秒
- [ ] 第 3 轮 TTFT 不超过第 1 轮 1.3 倍

### 7.3 差异性验收

- [ ] 不同哲人发言有明显风格差异
- [ ] 同一哲人跨轮立场连贯
- [ ] 出现用户未预料到的讨论角度

---

## 8. 风险提示

1. **流式解析边界**：`---META---` 可能被 chunk 切分，需 buffer 机制
2. **投机预热命中率**：需监控浪费率，>30% 时自动降级
3. **Context 压缩过度**：第三轮摘要可能丢失关键 nuance
4. **LLM 返回格式不稳定**：必须有完整的 fallback 策略

---

*本方案基于架构蓝图 §7 Unit 3 细化，供老卢审核后实施。*
