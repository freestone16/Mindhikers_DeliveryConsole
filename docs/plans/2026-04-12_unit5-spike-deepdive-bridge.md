---
title: "Unit 5: Spike → 深聊桥接"
type: implementation-plan
unit: 5
status: confirmed
date: 2026-04-12
owner: OldYang
origin: docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md
supersedes: none
---

# Unit 5: Spike → 深聊桥接

> **定位**：将 Unit 4 提取的 Spike 桥接到一对一深聊（DeepDive）模式，让用户可以选中某条 Spike，与相关哲人展开深度追问，形成"圆桌 → 裂缝定位 → 深聊挖掘"的完整认知链路。
> **前置依赖**：Unit 4 已完成（Spike 富类型 + 持久化 + 导演"止"链路）
> **Linear Issue**：MIN-116

---

## 1. 交付清单

| 文件 | 说明 | 依赖 |
|------|------|------|
| `server/deepdive-engine.ts` | 深聊引擎核心：上下文构建、追问循环、总结生成 | Unit 3/4 |
| `server/roundtable-types.ts` | 新增 DeepDive 类型定义（DeepDiveSession / DeepDiveTurn / DeepDiveBridgeRequest 等） | Unit 4 types |
| `server/roundtable-engine.ts` | 导演指令 `深` 扩展：Spike 深聊模式 vs 额外轮次区分 | Unit 3 engine |
| `server/index.ts` | 新增 POST `/api/roundtable/deepdive` 端点 + 导演 `深` 指令路由增强 | 现有 API |
| `server/crucible-persistence.ts` | DeepDive 产物落入 artifact 体系 | Unit 4 persistence |
| `server/__tests__/deepdive-engine.test.ts` | 深聊引擎单测（上下文构建 + 追问 + 总结） | - |
| `server/__tests__/roundtable-engine.test.ts` | 补充导演 `深` 指令 Spike 桥接测试 | Unit 3/4 tests |

---

## 2. 问题框架

Unit 4 完成后，导演点"止"能拿到结构化 Spike 数组（含 title/summary/bridgeHint/sourceSpeaker 等），但：

1. **Spike 是终点不是起点**：当前 Spike 只是被存储下来，无法驱动下一阶段交互。用户看到 5 条裂缝，只能"看看"，不能"追问"。
2. **导演 `深` 指令空转**：当前 `深` 只是多跑一轮 roundtable（`runAdditionalRound`），没有真正进入深聊模式。
3. **缺少一对一追问机制**：圆桌是多角色平行发言，但深聊需要聚焦单一哲人，带着 Spike 上下文深入追问。

Unit 5 的核心使命：**让 Spike 成为深聊的种子**，用户选一条 Spike → 系统自动构建上下文 → 与对应哲人展开多轮追问 → 最终生成 DeepDive 总结。

---

## 3. Requirements Trace

- R1. 用户可以从 Spike 列表中选择一条 Spike，发起深聊（DeepDive）。
- R2. 深聊自动锁定该 Spike 的 `sourceSpeaker`，构建包含圆桌上下文的深度 prompt。
- R3. 深聊支持多轮追问，每轮用户提出追问 → 哲人回复，维持角色一致性。
- R4. 深聊产物（追问链 + 最终总结）落入现有 artifact 体系。
- R5. 导演 `深` 指令增强：若 session 已有 Spike（"止"之后），`深` 进入 DeepDive 模式；否则保持原行为（额外轮次）。
- R6. DeepDive 总结作为新 artifact type `'deepdive'` 存入 persistence。

---

## 4. 类型设计

### 4.1 新增类型

```typescript
// --- DeepDive 相关 ---

export interface DeepDiveBridgeRequest {
  sessionId: string;
  spikeId: string;
  /** 可选：用户自定义追问起点；不提供则用 spike.bridgeHint */
  openingQuestion?: string;
}

export interface DeepDiveSession {
  id: string;
  parentSessionId: string;
  spikeId: string;
  spikeTitle: string;
  spikeContent: string;
  sourceSpeaker: string;
  status: 'active' | 'summarizing' | 'completed';
  turns: DeepDiveTurn[];
  summary?: DeepDiveSummary;
  createdAt: number;
  updatedAt: number;
}

export interface DeepDiveTurn {
  role: 'user' | 'philosopher';
  content: string;
  timestamp: number;
}

export interface DeepDiveSummary {
  title: string;
  coreInsight: string;
  keyQuotes: string[];
  remainingTension: string;
  nextSteps: string[];
}

export interface DeepDiveQuestionRequest {
  deepDiveId: string;
  question: string;
}

export interface DeepDiveSummarizeRequest {
  deepDiveId: string;
}

export interface DirectorDeepResult {
  deepDive: DeepDiveSession;
  spikeId: string;
  sourceSpeaker: string;
}
```

### 4.2 CrucibleConversationArtifact.type 扩展

在现有 `'reference' | 'quote' | 'asset' | 'spike'` 基础上新增 `'deepdive'`。

### 4.3 RoundtableSseEvent 扩展

```typescript
export interface RoundtableDeepDiveChunkEvent {
  type: 'roundtable_deepdive_chunk';
  data: {
    deepDiveId: string;
    chunk: string;
  };
}

export interface RoundtableDeepDiveSummaryEvent {
  type: 'roundtable_deepdive_summary';
  data: DeepDiveSummary;
}

// 合并到 RoundtableSseEvent 联合类型
```

---

## 5. 实施子单元

### Unit 5.1 — DeepDive 类型 + 引擎核心

**文件**：`server/roundtable-types.ts`（类型扩展）+ `server/deepdive-engine.ts`（新建）

**核心逻辑**：

1. **上下文构建** `buildDeepDiveContext()`：
   - 从 parentSession 的 rounds 中提取 `sourceSpeaker` 的所有发言
   - 提取 Spike 所在 round 的 synthesis（裂缝焦点 + 张力）
   - 拼接为深度 prompt，包含：哲人 profile + 圆桌历史 + Spike 聚焦 + 追问规则

2. **追问循环** `askDeepDiveQuestion()`：
   - 接收用户追问 + DeepDiveSession 历史
   - 调用 LLM（tier: `premium`）生成哲人深度回复
   - 支持流式输出（SSE chunk）
   - 维持角色一致性（复用 persona-loader 的 profile）

3. **总结生成** `summarizeDeepDive()`：
   - 收集所有追问链
   - 调用 LLM（tier: `standard`）生成结构化总结
   - 输出 DeepDiveSummary（title + coreInsight + keyQuotes + remainingTension + nextSteps）

**降级策略**：
- LLM 失败时返回"追问未获得有效回复，请重试"
- 总结失败时返回简化版（仅 coreInsight，其余字段为空）

### Unit 5.2 — 导演 `深` 指令增强 + API 端点

**文件**：`server/roundtable-engine.ts` + `server/index.ts`

**核心逻辑**：

1. **导演 `深` 指令分支**：
   ```
   if (session.status === 'completed' && session.spikes?.length > 0 && payload?.spikeId) {
     → 进入 DeepDive 模式
   } else {
     → 保持原行为（runAdditionalRound）
   }
   ```

2. **新增独立端点** `POST /api/roundtable/deepdive`：
   - 接收 `{ sessionId, spikeId, openingQuestion? }`
   - 创建 DeepDiveSession
   - 生成第一条哲人回复（基于 Spike 上下文）
   - 返回 DeepDiveSession（SSE 流式）

3. **追问端点** `POST /api/roundtable/deepdive/question`：
   - 接收 `{ deepDiveId, question }`
   - 追加一轮追问 → 回复
   - SSE 流式

4. **总结端点** `POST /api/roundtable/deepdive/summarize`：
   - 接收 `{ deepDiveId }`
   - 生成 DeepDiveSummary
   - 落入 persistence（artifact type: `'deepdive'`）

### Unit 5.3 — DeepDive 持久化 + 测试闭合

**文件**：`server/crucible-persistence.ts` + 测试文件

**核心逻辑**：

1. **persistence 扩展**：
   - `CrucibleConversationArtifact.type` 新增 `'deepdive'`
   - 新增 `appendDeepDiveToCrucibleConversation()` 函数
   - DeepDiveSummary 格式化为 artifact content

2. **测试覆盖**：
   - `deepdive-engine.test.ts`：上下文构建、追问循环、总结生成（mock LLM）
   - `roundtable-engine.test.ts`：补充 `深` 指令 Spike 桥接测试
   - `crucible-persistence.test.ts`：补充 deepdive artifact 持久化测试

---

## 6. DeepDive Prompt 设计

### 6.1 追问 Prompt

```
【你是谁】
你是 {persona.displayName}（{persona.slug}），{persona.era}的思想者。
这是从圆桌讨论延伸的一对一深聊，你需要更深入地阐述你的立场。

【圆桌背景】
讨论命题：{proposition}
裂缝焦点：{spike.title} — {spike.summary}
你在圆桌中说：{sourceSpeakerUtterance}

【深聊规则】
1. 这是追问，不是辩论。你只需要更深入地解释你的想法。
2. 用户的问题是真诚的，认真对待每一个追问。
3. 可以使用类比、思想实验、具体例子来帮助理解。
4. 如果追问触及你的 honestBoundary，坦诚说明原因。
5. 200-500 字，比圆桌发言可以更深入。

【对话历史】
{previousTurns}

【用户追问】
{question}

直接输出你的回复，不要 JSON、不要 markdown。```

### 6.2 总结 Prompt

```
你是圆桌讨论的分析师。以下是一场围绕特定 Spike 的深聊记录。
请生成结构化总结。

【Spike 信息】
标题：{spike.title}
内容：{spike.content}
发言者：{sourceSpeaker}

【深聊记录】
{allTurns}

【输出要求】严格 JSON：
{
  "title": "≤20字标题",
  "coreInsight": "50-100字核心洞察",
  "keyQuotes": ["最多3条关键引述"],
  "remainingTension": "仍存在的分歧或未解问题",
  "nextSteps": ["2-3个可能的后续方向"]
}
```

---

## 7. 数据流

```
用户点击 Spike
       │
       ▼
POST /api/roundtable/deepdive
{ sessionId, spikeId, openingQuestion? }
       │
       ▼
DeepDive Engine
├── 创建 DeepDiveSession
├── 构建 context（persona + 圆桌历史 + spike）
├── 如果有 openingQuestion → 生成哲人回复
├── 否则 → 用 spike.bridgeHint 生成开场
       │
       ▼
SSE 流式返回
       │
       ▼
用户追问（多轮）
POST /api/roundtable/deepdive/question
{ deepDiveId, question }
       │
       ▼
用户请求总结
POST /api/roundtable/deepdive/summarize
{ deepDiveId }
       │
       ▼
DeepDiveSummary → 持久化为 artifact(type='deepdive')
```

---

## 8. 实施约束

| 约束 | 值 |
|------|------|
| LLM 模型 | kimi-k2.5（统一） |
| 追问 tier | premium |
| 总结 tier | standard |
| 追问字数 | 200-500 字 |
| 最大追问轮数 | 10（软限制，超后提示用户总结） |
| API 前缀 | `/api/roundtable/deepdive/*` |
| SSE 事件前缀 | `roundtable_deepdive_*` |
| Artifact type | `'deepdive'` |

---

## 9. 与后续 Unit 的关系

- **Unit 6（前端侧边栏 + 导演 UI）**：需要消费 Unit 5 的 Spike 列表 + DeepDive 端点，在前端呈现可点击的 Spike 卡片 → 触发深聊
- **Unit 7（GUI 风格对齐）**：DeepDive 追问界面的视觉风格需要与圆桌 UI 统一

---

## 10. 验收标准

- [ ] 用户可通过 API 从 Spike 发起深聊
- [ ] 深聊锁定对应哲人，上下文包含圆桌历史
- [ ] 支持多轮追问（SSE 流式）
- [ ] 可生成结构化 DeepDive 总结
- [ ] 总结落入 persistence artifact（type='deepdive'）
- [ ] 导演 `深` 指令在 Spike 存在时自动桥接 DeepDive
- [ ] typecheck 零错误
- [ ] 新增测试 ≥8 个

---

*按 OldYang 方案优先协议落盘，实施前需老卢确认。*
