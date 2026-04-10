---
title: "Unit 2 V2.1: 命题锐化模块 — 实施口径锁定"
type: implementation-plan
status: active
date: 2026-04-10
owner: OldYang
supersedes: docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md §7 Unit 2
---

# Unit 2 V2.1: 命题锐化模块 (Proposition Sharpener)

> **定位**：本文件锁定 Unit 2 的实施口径，明确模型选择为 kimi-k2.5。
> **与 v2 的关系**：v2 §7 Unit 2 说"使用 tier:fast"，本文件锁定 fast tier 具体模型为 kimi-k2.5，并补充详细实施步骤。
> **审批状态**：已获老卢确认（2026-04-10）。

---

## 0. 口径决策记录

### 0.1 模型选择（已确认）

| Tier | 模型 | 理由 |
|------|------|------|
| fast | `kimi-k2.5` | 用户指定。作为命题锐化这种简单改写任务，kimi-k2.5 速度快、成本低 |
| standard | `kimi-k2.5` | 默认使用，无需切换 |
| premium | `kimi-k2.5` | 默认使用，后续如需更强模型可配置 |

**环境变量**：使用 `KIMI_API_KEY`，已在 `.env.local` 中配置。

### 0.2 文件路径（已确认）

| 产出 | 路径 | 理由 |
|------|------|------|
| LLM 分层路由 | `server/llm.ts` 扩展 | 在现有 `callLLM` 基础上新增 `callRoundtableLlm` |
| 锐化逻辑 | `server/proposition-sharpener.ts` | 独立模块，职责清晰 |
| API 端点 | `server/index.ts` | 在现有 Express app 上注册 |
| 测试 | `server/__tests__/proposition-sharpener.test.ts` | 固定测试位置 |

### 0.3 API 契约（已确认）

**POST /api/roundtable/sharpen**
```typescript
interface SharpenRequest {
  proposition: string;           // 用户输入的原始命题
  mode?: 'detect' | 'sharpen';   // detect=仅检测, sharpen=检测+锐化（默认 sharpen）
}

interface SharpenResponse {
  isSharp: boolean;              // 是否已经是锋利的命题
  original: string;              // 原始输入
  sharpened?: string;            // 锐化后的命题（如果执行了锐化）
  clarifyingQuestions?: string[]; // 澄清问题（如果不够锋利且需要用户澄清）
  reasoning?: string;            // 判断理由（可选，用于调试）
}
```

**POST /api/roundtable/sharpen/apply**
```typescript
interface ApplySharpenRequest {
  selectedProposition: string;   // 用户选择的命题（可能是原始或锐化后的）
  original: string;              // 原始输入（用于追踪）
}

interface ApplySharpenResponse {
  success: boolean;
  finalProposition: string;      // 确认进入圆桌的命题
  sessionId?: string;            // 可选：预创建的会话ID
}
```

---

## 1. LLM 分层路由设计

### 1.1 扩展现有 llm.ts

```typescript
// server/llm.ts

export type ModelTier = 'fast' | 'standard' | 'premium';

interface RoundtableLlmParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  tier: ModelTier;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Roundtable 专用 LLM 调用
 * 支持模型分层路由，优先使用 kimi-k2.5
 */
export async function callRoundtableLlm(params: RoundtableLlmParams): Promise<string> {
  const { messages, tier, temperature = 0.7, maxTokens = 2000 } = params;
  
  // v2.1: 统一使用 kimi-k2.5，后续可按 tier 切换
  const model = 'kimi-k2.5';
  
  // 注意：kimi-k2.5 只支持 temperature = 1
  const effectiveTemp = tier === 'fast' ? 1 : 1; // fast 也用 1，后续如有其他模型可调整
  
  const response = await callLLM(
    messages,
    'kimi',
    model
  );
  
  return response.content;
}
```

### 1.2 Tier 映射策略

| Tier | 用途 | 模型 | Temperature |
|------|------|------|-------------|
| fast | 命题锐化、简单改写 | kimi-k2.5 | 1（模型限制） |
| standard | Speaker Selection、Moderator、Spike 提取 | kimi-k2.5 | 1 |
| premium | 哲人发言 | kimi-k2.5 | 1 |

**注意**：kimi-k2.5 只支持 temperature = 1，这是模型本身的限制。如需更确定性的输出，通过 prompt engineering 控制。

---

## 2. 命题锐化模块设计

### 2.1 Zod Schema

```typescript
// server/proposition-sharpener.ts

import { z } from 'zod';

export const SharpenResultSchema = z.object({
  isSharp: z.boolean(),
  sharpened: z.string().optional(),
  clarifyingQuestions: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
});

export type SharpenResult = z.infer<typeof SharpenResultSchema>;
```

### 2.2 锐化判断标准

**锋利的命题特征**（prompt 中告知 LLM）：
1. **可辩性**：有明确的正反双方，不是纯粹的事实陈述
2. **具体性**：有具体场景/对象，不是宏大抽象概念
3. **价值冲突**：涉及两种以上价值观的权衡
4. **可检验性**：有判断对错的潜在标准

**示例**：
- ❌ 不锋利："AI 会改变教育"（太泛，无冲突）
- ✅ 锋利："生成式 AI 应当被允许作为 K-12 学生的主要学习伙伴"（可辩、具体、价值冲突）

### 2.3 Prompt 模板

```typescript
const SHARPEN_SYSTEM_PROMPT = `你是一位命题锐化专家。你的任务是判断用户输入的议题是否足够"锋利"（可辩、具体、有价值冲突），并在需要时将其改写为锋利的命题。

锋利命题的标准：
1. 可辩性：有明确的正反双方，不是纯粹的事实陈述
2. 具体性：有具体场景/对象，不是宏大抽象概念  
3. 价值冲突：涉及两种以上价值观的权衡
4. 可检验性：有判断对错的潜在标准

输出格式（严格 JSON）：
{
  "isSharp": true/false,
  "sharpened": "如果原命题不够锋利，给出改写后的锋利命题；如果已经锋利，省略此字段",
  "clarifyingQuestions": ["如果需要用户澄清才能锐化，给出1-3个问题；如果可以直接锐化，返回空数组"],
  "reasoning": "简要说明判断理由"
}`;

function buildSharpenPrompt(proposition: string): string {
  return `请判断以下议题是否足够锋利，并在需要时进行锐化：

"${proposition}"

如果议题已经锋利（满足上述4个标准），返回 isSharp: true。
如果不够锋利，返回 isSharp: false 并给出 sharpened 改写版本。`;
}
```

### 2.4 接口设计

```typescript
// server/proposition-sharpener.ts

export interface SharpenOptions {
  mode?: 'detect' | 'sharpen';
}

/**
 * 检测并锐化命题
 * @param proposition 原始命题
 * @param options 选项
 * @returns 锐化结果
 */
export async function sharpenProposition(
  proposition: string,
  options: SharpenOptions = {}
): Promise<SharpenResult> {
  // 实现：调用 LLM，解析 JSON，Zod 校验，fallback 处理
}

/**
 * 应用锐化结果，返回最终进入圆桌的命题
 * @param original 原始命题
 * @param selected 用户选择的命题（可能是原始或锐化后的）
 * @returns 最终命题
 */
export function applySharpenedProposition(
  original: string,
  selected: string
): { finalProposition: string; success: boolean } {
  // 实现：简单校验后返回
}
```

---

## 3. API 端点实现

### 3.1 POST /api/roundtable/sharpen

```typescript
app.post('/api/roundtable/sharpen', async (req, res) => {
  const { proposition, mode = 'sharpen' } = req.body;
  
  if (!proposition || typeof proposition !== 'string') {
    return res.status(400).json({ error: 'Missing proposition' });
  }
  
  try {
    const result = await sharpenProposition(proposition, { mode });
    res.json({
      ...result,
      original: proposition,
    });
  } catch (error) {
    console.error('[sharpen] Error:', error);
    // Fallback：返回原命题，标记为已锐化（降级策略）
    res.json({
      isSharp: true,
      original: proposition,
      sharpened: proposition,
      reasoning: 'Fallback due to error',
    });
  }
});
```

### 3.2 POST /api/roundtable/sharpen/apply

```typescript
app.post('/api/roundtable/sharpen/apply', async (req, res) => {
  const { selectedProposition, original } = req.body;
  
  if (!selectedProposition || !original) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const result = applySharpenedProposition(original, selectedProposition);
  
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid selection' });
  }
  
  res.json({
    success: true,
    finalProposition: result.finalProposition,
  });
});
```

---

## 4. 实施顺序

### Step 1: 扩展 llm.ts
- 添加 `ModelTier` 类型
- 添加 `callRoundtableLlm()` 函数
- 确认 `tsc --noEmit` 通过

### Step 2: 创建 proposition-sharpener.ts
- Zod schema 定义
- Prompt 模板
- `sharpenProposition()` 实现
- `applySharpenedProposition()` 实现
- 确认 `tsc --noEmit` 通过

### Step 3: 更新 index.ts
- 注册 `POST /api/roundtable/sharpen`
- 注册 `POST /api/roundtable/sharpen/apply`
- 移除 placeholder 端点

### Step 4: 创建测试
- 测试：锋利命题检测
- 测试：不锋利命题锐化
- 测试：fallback 行为
- 测试：API 端点
- `npm run test:run` 确认通过

### Step 5: 验证
- `npm run typecheck:full` 确认全仓无错误
- `npm run dev` 启动，手动测试端点
- 更新 HANDOFF.md

---

## 5. 验收 Checklist

- [ ] `server/llm.ts` 已扩展 `callRoundtableLlm()`
- [ ] `server/proposition-sharpener.ts` 存在且编译通过
- [ ] `POST /api/roundtable/sharpen` 端点工作正常
- [ ] `POST /api/roundtable/sharpen/apply` 端点工作正常
- [ ] Zod 校验失败时有 fallback
- [ ] LLM 调用失败时有 fallback
- [ ] 测试覆盖主要场景
- [ ] `npm run typecheck:full` 零错误
- [ ] `npm run test:run` 全部通过

---

## 6. 与 v2 方案的关键差异

| 项目 | v2 方案 | V2.1 实施 |
|------|---------|-----------|
| fast 模型 | 未指定具体模型 | 锁定 kimi-k2.5 |
| temperature | 可配置 | kimi-k2.5 固定为 1 |
| 端点路径 | /api/roundtable/* | 同上，具体实现细节锁定 |

---

## 7. 风险与降级

| 风险 | 影响 | 降级策略 |
|------|------|---------|
| kimi-k2.5 API 不稳定 | 锐化失败 | Fallback 返回原命题 |
| JSON 解析失败 | 结果不可用 | Zod 校验 + 固定默认值 |
| 命题过长 | token 超限 | 截断至 500 字符后处理 |

---

## 8. 参考资料

- 原版实施手册：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-09-002-roundtable-implementation-handbook.md` § Unit 2
- v2 计划：`docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md` §7 Unit 2
- Unit 1 V2.1 计划：`docs/plans/2026-04-10_unit1-persona-profile-v2.1.md`
