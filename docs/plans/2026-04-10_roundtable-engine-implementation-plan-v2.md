---
title: "圆桌讨论引擎实施方案 v2（GoldenCrucible-Roundtable 独立仓版）"
type: implementation-plan
status: active
date: 2026-04-10
owner: OldYang
supersedes: none
origin:
  - /Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-09-002-roundtable-implementation-handbook.md
---

# 圆桌讨论引擎实施方案 v2

> **定位**：本文件是 GoldenCrucible-Roundtable 独立仓的实施蓝图。
> **与原版手册的关系**：原版手册（SSE 仓 `docs/plans/2026-04-09-002-roundtable-implementation-handbook.md`）是"SSE 视角"的交接文档，本文件在此基础上做了架构决策调整和优化补充，不覆盖原版。
> **开发哲学**：奥卡姆剃刀 | 有价值 | 简单 | 强壮 | 易维护

---

## 0. 架构决策变更记录（v1 → v2）

### 0.1 仓定位变更

| 维度 | v1（原版手册） | v2（本方案） |
|------|--------------|------------|
| 仓角色 | SSE 内部模块 | 独立 S1 一级仓，与 SSE 同角色 |
| 底座来源 | 直接在 SSE 内开发 | 从 SSE 有选择复制底座 |
| 摘樱桃方向 | SSE → SaaS | Roundtable → SaaS（经 SSE staging 验证） |
| 端口 | 共用 SSE 端口 | 独立端口（前端 5180，后端 3005） |

### 0.2 关键优化补充

1. **LLM 模型分层路由** — 原版只做 temperature 分层，v2 增加 model 选择策略
2. **流式输出格式改造** — 哲人发言从"完整 JSON 一次返回"改为"先流式文本，后附 JSON 元数据"
3. **角色间隙填充** — 前端动画 + 投机预热
4. **渐进式 context 压缩** — 三轮分层策略，token 开销不线性膨胀
5. **端口隔离** — 与 SSE 开发环境零冲突

---

## 1. 三仓协作拓扑

```
┌──────────────────────────────┐
│  GoldenCrucible-SSE          │  ← dev（现有功能开发）
│  端口: 5176 / 3004           │
│  深聊 + Director + Remotion  │
└──────────┬───────────────────┘
           │ 摘樱桃 ←
┌──────────┴───────────────────┐
│  GoldenCrucible-Roundtable   │  ← dev（本仓，圆桌引擎开发）
│  端口: 5180 / 3005           │
│  PersonaProfile + 引擎 + UI  │
└──────────┬───────────────────┘
           │ 摘樱桃 →
┌──────────▼───────────────────┐
│  GoldenCrucible-SaaS         │  ← staging（合并所有特性上线）
│  全功能集成环境              │
└──────────────────────────────┘
```

**关键纪律**：Roundtable 开发好的功能，通过摘樱桃合并到 SaaS。摘樱桃清单见 §6。

---

## 2. 底座构成

Roundtable 的底座从 SSE 有选择复制，仅保留基础设施和圆桌相关依赖：

| 要复制 | 用途 |
|-------|------|
| `package.json` + `tsconfig.*` + `vite.config.ts` | 构建环境一致 |
| `server/llm.ts` + `llm-config.ts` | LLM 调用基础设施（OpenAI 兼容） |
| `server/crucible-persistence.ts` | artifact 存储，Spike 要复用 |
| `server/crucible-orchestrator.ts` | prompt 构建，Bridge 要对接 |
| `server/crucible-soul-loader.ts` | 灵魂文件加载 |
| `server/index.ts`（精简版） | Express 服务器骨架 |
| `src/main.tsx` + `src/App.tsx`（空壳） | 前端入口 |
| `src/index.css` | Claude Code 风格 CSS 变量 |
| `src/schemas/` + `src/config/` | 类型定义和配置 |

| 不复制 | 原因 |
|-------|------|
| `server/director.ts`、`shorts.ts`、`music.ts` 等 | 非圆桌业务 |
| `server/crucible.ts` | 圆桌有自己的路由前缀 `/api/roundtable/*` |
| `src/components/crucible/` | 圆桌有独立组件目录 |
| `deliveryConsole/`、`Prompts/`、`skills/` | SSE 自己的模块 |

---

## 3. 开发哲学红线

1. **奥卡姆剃刀**：能 JSON 就不上数据库；能复用 SSE 协议就不新造
2. **有价值**：每行代码没写用户会失去什么？失去=写，不失去=不写
3. **简单**：函数 < 60 行，嵌套 < 3 层，模块暴露 2-4 个公共函数
4. **强壮**：每个 LLM 调用都有 fallback；每个文件加载都有 Zod 校验；单个哲人崩溃不阻塞整轮
5. **易维护**：命名与 SSE 模式一致；test 文件路径固定 `server/__tests__/`；硬编码常量集中到文件顶部

---

## 4. LLM 调用策略（v2 新增）

### 4.1 模型分层路由

| 调用类型 | 模型策略 | temperature | 理由 |
|---------|---------|------------|------|
| Speaker Selection | 最便宜最快（如 glm-4-flash） | 0.2 | 纯分析，不需要创意 |
| Moderator 开场+综合 | 中等模型（如 glm-4） | 0.4 | 需要结构化输出，不需要个性 |
| **哲人发言** | **最强可用模型（如 glm-4-plus）** | **0.85** | **核心体验，差异性全靠这一跳** |
| Spike 提取 | 中等模型 | 0.3 | 分析任务，需要准确提取 |
| 命题锐化 | 最便宜最快 | 0.3 | 简单改写 |

### 4.2 实现方式

在 `server/llm.ts` 的 `callConfiguredLlm` 基础上扩展，增加 `modelTier` 参数：

```typescript
type ModelTier = 'fast' | 'standard' | 'premium';

async function callRoundtableLlm(params: {
  prompt: string;
  systemPrompt?: string;
  tier: ModelTier;
  temperature: number;
}): Promise<string>
```

路由逻辑从 `llm-config.ts` 的现有配置中读取每个 tier 对应的模型名。这样用户可以在 settings 里自由切换每个 tier 用什么模型。

### 4.3 成本预估（一场 3 人 3 轮讨论）

| 调用 | 次数 | 模型 | 预估 token/次 | 成本估算 |
|------|------|------|-------------|---------|
| Speaker Selection | 1 | fast | ~800 | ~$0.001 |
| Moderator 开场 | 1 | standard | ~1000 | ~$0.003 |
| 哲人发言 | 9 | premium | ~2000 | ~$0.045 |
| Moderator 综合 | 3 | standard | ~1500 | ~$0.009 |
| Spike 提取 | 1 | standard | ~2500 | ~$0.008 |
| **合计 14 次** | | | | **~$0.066/场** |

---

## 5. 流式输出格式改造（v2 新增）

### 5.1 问题

原版手册要求哲人"严格 JSON 输出"，意味着必须等 LLM 完整返回后才能解析渲染。用户等待 5-8 秒看到一个哲人突然蹦出完整发言，体验差。

### 5.2 改造方案

哲人发言改为**两阶段输出**：

**阶段 1 — 流式文本**（逐字渲染）
```
SSE event: roundtable_turn_chunk
data: { roundIndex: 2, speakerSlug: "socrates", chunk: "你说的" }
data: { roundIndex: 2, speakerSlug: "socrates", chunk: "正义" }
data: { roundIndex: 2, speakerSlug: "socrates", chunk: "究竟是什么意思？" }
...
```

**阶段 2 — 元数据**（发言结束后一次性发送）
```
SSE event: roundtable_turn_meta
data: {
  roundIndex: 2,
  speakerSlug: "socrates",
  action: "质疑",
  briefSummary: "追问正义的定义",
  challengedTarget: "芒格：正义就是制度设计",
  stanceVector: { carePriority: 0.6, libertyPriority: 0.85, authorityPriority: 0.15 }
}
```

### 5.3 Prompt 改造

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

### 5.4 后端解析

```typescript
// 流式读取 LLM response，遇到 "---META---" 作为分界线
// 分界线之前：逐 chunk 发送 roundtable_turn_chunk SSE 事件
// 分界线之后：解析 JSON，发送 roundtable_turn_meta SSE 事件
// 如果没有 META 块：fallback 用固定默认值（action="陈述", briefSummary=截取前15字）
```

---

## 6. 延迟优化策略（v2 新增）

### 6.1 角色间隙填充动画

哲人 A 发言结束后、哲人 B 开始流式输出前，前端显示动态指示器：

```
┌─────────────────────────────────────┐
│ 🧔 苏格拉底：你说的正义究竟是什么…   │
│ （简言之：追问正义定义）            │
│                                     │
│ 🎓 王阳明 正在思考…                 │
│ ▓▓▓░░░░░░░                         │
└─────────────────────────────────────┘
```

- 用哲人的 `avatarEmoji` + "正在思考…" + 呼吸动画条
- 纯前端实现，不依赖后端改动

### 6.2 投机预热

哲人 A 流式输出后半段（检测到 `---META---` 标记时），**提前用 A 已产出的内容构造 B 的 target**，发出 B 的 LLM 请求。

**监控机制**：记录"预请求命中率"——如果 A 的最终 utterance 和预热时用的 partial 差异超过 30%（字符级 diff），标记为"预热浪费"。如果整体浪费率 > 30%，自动降级为纯串行。

### 6.3 渐进式 Context 压缩

| 轮次 | 塞入 prompt 的历史 | token 预算 |
|------|-----------------|-----------|
| 第 1 轮 | 无（只有命题 + 对比锚点） | 0 |
| 第 2 轮 | 每位哲人的 briefSummary（≤15字/人） | ~60-75 字 |
| 第 3 轮+ | 之前所有轮的**综合摘要**（moderator 的 focusPoint + tensionLevel） | ~100-150 字 |

**不传原始 utterance**。moderator 的综合摘要天然是"最值得传递的信息"。

---

## 7. 逐 Unit 实施指南

### Unit 1: PersonaProfile 契约 + Loader + 7 人物

**与原版差异**：无实质差异，直接采用原版 §3 的完整设计。

**产出文件**：
- `server/persona-types.ts` — Zod schema + TypeScript 接口
- `server/persona-loader.ts` — 加载 + 热插拔
- `personas/*.json` — 7 个哲人 JSON

**验收**：手写一个测试 JSON 放入 `personas/`，无需重启即可加载。

**详细设计**：直接复用原版手册 §3.1 - §3.3，此处不重复。

---

### Unit 2: 命题锐化模块

**与原版差异**：使用 `callRoundtableLlm({ tier: 'fast' })` 代替原版的 `callConfiguredLlm`。

**产出文件**：
- `server/proposition-sharpener.ts`
- 在 `server/index.ts` 注册 `POST /api/roundtable/sharpen` 和 `POST /api/roundtable/sharpen/apply`

**详细设计**：直接复用原版手册 § Unit 2，此处不重复。

---

### Unit 3: 圆桌引擎核心

**与原版差异**：
1. 使用 `callRoundtableLlm` 的 `tier` 参数做模型分层
2. 流式输出采用 §5 的两阶段格式（chunk + meta）
3. Context 压缩采用 §6.3 的三轮分层策略
4. Prompt 模板采用 §5.3 的两阶段输出格式

**产出文件**：
- `server/roundtable-types.ts`
- `server/roundtable-engine.ts`
- 在 `server/index.ts` 注册 `POST /api/roundtable/turn/stream`（SSE）、`POST /api/roundtable/director`、`GET /api/roundtable/session/:id`

**核心架构**：

```
startRoundtable(proposition, res)
  │
  ├─ 1. selectSpeakers() — tier:fast, temp:0.2
  │     └─ SSE: roundtable_selection
  │
  ├─ 2. moderator.openRound() — tier:standard, temp:0.4
  │     └─ SSE: roundtable_synthesis
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

**Prompt 模板**：哲人独立调用的 prompt 沿用原版 §5.2 的设计（PersonaProfile 动态拼接 + 对比锚点 + 靶子传递 + 诚实边界），仅输出格式改为 §5.3 的两阶段。

**Context 压缩实现**（v2 新增）：

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
    return `你在第 1 轮说：${myTurn?.turn.briefSummary || '（无记录）'}\n` +
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

---

### Unit 4: Spike 提取 + 持久化

**与原版差异**：使用 `tier:standard` 代替默认模型。

**产出文件**：
- `server/spike-extractor.ts`
- 扩展 `crucible-persistence.ts` 的 artifact type

**详细设计**：直接复用原版 § Unit 4。

---

### Unit 5: Spike → 深聊桥接

**与原版差异**：无实质差异。

**产出文件**：
- `server/roundtable-bridge.ts`
- `server/roundtable-interfaces.ts`（未来对接占位）
- 修改 `crucible-orchestrator.ts` 增加 `roundtableContext?` 参数

**详细设计**：直接复用原版 § Unit 5。

---

### Unit 6: 前端 — 侧边栏 + 圆桌导演 UI

**与原版差异**：
1. 间隙动画（§6.1）
2. 流式渲染（对应 §5 的 chunk + meta 格式）
3. 投机预热的前端感知（显示"正在思考…"的时机变化）

**产出文件**：
- `src/components/Sidebar.tsx`
- `src/components/roundtable/types.ts`
- `src/components/roundtable/RoundtableView.tsx`
- `src/components/roundtable/DirectorControls.tsx`
- `src/components/roundtable/SpikeLibrary.tsx`
- `src/components/roundtable/ThinkingIndicator.tsx`（v2 新增，间隙动画组件）

**SSE 客户端改动**：新增处理 `roundtable_turn_chunk` 和 `roundtable_turn_meta` 两种事件。

**ThinkingIndicator 组件**（v2 新增）：

```tsx
interface ThinkingIndicatorProps {
  speakerName: string;
  avatarEmoji: string;
}
// 渲染：{avatarEmoji} {speakerName} 正在思考… + CSS 呼吸动画
```

---

### Unit 7: GUI 风格对齐

**与原版差异**：无。

直接复用原版 § Unit 7 和 §6.3 的 Claude Code CSS 变量。

---

## 8. 摘樱桃清单（Roundtable → SaaS）

### 8.1 后端迁移包

```
server/persona-types.ts
server/persona-loader.ts
server/roundtable-types.ts
server/roundtable-engine.ts
server/proposition-sharpener.ts
server/spike-extractor.ts
server/roundtable-bridge.ts
server/roundtable-interfaces.ts
personas/*.json（7 个文件）
```

### 8.2 后端增量修改（需要 diff 合并）

```
server/index.ts — 新增 roundtable 路由注册
server/crucible-orchestrator.ts — roundtableContext? 参数
server/crucible-persistence.ts — artifact type 扩展
```

### 8.3 前端迁移包

```
src/components/Sidebar.tsx
src/components/roundtable/ 整个目录
src/components/crucible/sse.ts 的新增 case（diff）
src/components/crucible/types.ts 的新增类型（diff）
```

### 8.4 CSS 迁移

```
src/index.css 的 :root 变量块（diff）
```

---

## 9. 交接 Checklist

### 9.1 代码质量

- [ ] 所有新增 `.ts` 文件通过 `tsc --noEmit`
- [ ] 所有测试 pass
- [ ] 无 `any` 滥用
- [ ] 所有 LLM 调用都有 Zod 校验 + fallback
- [ ] 引擎代码中无硬编码哲人名字/口头禅
- [ ] 所有 LLM 调用走 `callRoundtableLlm` 的 tier 路由

### 9.2 功能验收

- [ ] 路径 A（完整管道）：议题 → 锐化 → 圆桌 → Spike → 选 1 → 深聊
- [ ] 路径 B（纯圆桌）：议题 → 锐化 → 圆桌 → 保留所有 Spike
- [ ] 路径 C（直接深聊）：议题 → 深聊（不受影响）
- [ ] 6 种导演指令均有对应行为
- [ ] 热插拔：新增 persona JSON 无需重启即可用
- [ ] 流式渲染：哲人发言逐字出现（不是等完再显示）
- [ ] 间隙动画："正在思考…"指示器在哲人间隙显示

### 9.3 延迟验收（v2 新增）

- [ ] 单哲人发言：TTFT（首 token 时间）< 3 秒
- [ ] 哲人间隙：用户感知等待 < 1.5 秒（含动画）
- [ ] 第 3 轮的 TTFT 不超过第 1 轮的 1.3 倍（context 压缩生效）
- [ ] 投机预热命中率 > 70%（如果启用了投机预热）

### 9.4 差异性验收

- [ ] 任意两位哲人的发言无需看名字也可区分
- [ ] 至少 1 个 Spike 是用户初始议题里未预料到的角度
- [ ] 同一位哲人跨轮立场连贯

### 9.5 鲁棒性验收

- [ ] 单个哲人 LLM 超时：整轮不崩溃
- [ ] LLM 返回非 JSON（或无 META 块）：走 fallback
- [ ] 前端刷新后：通过 sessionId 恢复讨论
- [ ] `personas/` 目录为空：不崩溃

---

## 10. 风险提示

1. **差异性不足**：先 dump 实际 prompt 检查对比锚点是否注入，再调 PersonaProfile。不要上 embedding 后置校验。
2. **多 LLM 延迟**：先在日志里打印每个调用耗时，再决定优化策略。投机预热有浪费率监控，超过 30% 自动降级。
3. **Spike 提取不稳定**：temperature 降到 0.3 通常能稳定。
4. **流式解析 split**：`---META---` 标记在流式 chunk 里可能被切分，需要 buffer 机制做边界检测。
5. **摘樱桃冲突**：Roundtable 和 SSE 如果同时修改了 `crucible-orchestrator.ts`，合并时需要手动 resolve。

---

## 11. 端口与配置

| 配置项 | Roundtable 值 | SSE 值 |
|--------|-------------|--------|
| 后端端口 | 3005 | 3004 |
| 前端端口 | 5180 | 5176 |
| SSE 前缀 | `roundtable_*` | `turn`/`error`/`done` |
| API 路由前缀 | `/api/roundtable/*` | `/api/crucible/*` |
| Persona 目录 | `personas/` | 无 |

---

## 12. 与原版手册的映射表

| 本方案章节 | 原版手册章节 | 差异说明 |
|-----------|------------|---------|
| §4 LLM 策略 | 原版 §5.5 | 新增 model tier 分层 |
| §5 流式格式 | 原版 §5.2 prompt 模板 | 输出格式改为两阶段 |
| §6 延迟优化 | 原版无 | 全新 |
| §7 Unit 1 | 原版 §3 + Unit 1 | 无差异 |
| §7 Unit 2 | 原版 Unit 2 | 使用 tier:fast |
| §7 Unit 3 | 原版 Unit 3 + §5.2 | 流式格式 + context 压缩 + 模型分层 |
| §7 Unit 4 | 原版 Unit 4 | 使用 tier:standard |
| §7 Unit 5 | 原版 Unit 5 | 无差异 |
| §7 Unit 6 | 原版 Unit 6 | + 间隙动画 + 流式渲染 |
| §7 Unit 7 | 原版 Unit 7 | 无差异 |
| §8 摘樱桃清单 | 原版 §6.2 | 重写为 Roundtable→SaaS 方向 |

---

## 13. 参考资料

- **原版实施手册**：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-09-002-roundtable-implementation-handbook.md`
- **原版 Plan**：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-09-001-feat-roundtable-engine-plan.md`
- **SSE 现有代码**：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE/server/`
- **项目治理协议**：`/Users/luzhoua/.codex/project-governance/project-initialization-protocol.md`
