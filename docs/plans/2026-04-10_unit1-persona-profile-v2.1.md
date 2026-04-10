---
title: "Unit 1 V2.1: PersonaProfile 契约 + Loader + 7 哲人 — 实施口径锁定"
type: implementation-plan
status: active
date: 2026-04-10
owner: OldYang
supersedes: docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md §7 Unit 1
---

# Unit 1 V2.1: PersonaProfile 契约 + Loader + 7 哲人

> **定位**：本文件锁定 Unit 1 的实施口径，消除 v2 方案中的歧义。
> **与 v2 的关系**：v2 §7 Unit 1 说"直接复用原版 §3"，本文件补充 Roundtable 仓的实际路径决策和实施顺序。
> **审批状态**：已获老卢确认（2026-04-10）。

---

## 0. 口径决策记录

### 0.1 文件路径（已确认）

| 产出 | 路径 | 理由 |
|------|------|------|
| Zod Schema + TS Type | `src/schemas/persona.ts` | 与现有 `crucible-soul.ts` 风格一致；前后端共享 |
| 服务端 Loader | `server/persona-loader.ts` | 职责清晰，与现有 `crucible-soul-loader.ts` 对称 |
| 哲人配置文件 | `personas/*.json`（仓根目录） | 独立于 server/，便于运营编辑和摘樱桃 |
| Loader 单测 | `server/__tests__/persona-loader.test.ts` | 固定测试位置 |

**决策理由**：
- v2 方案写的是 `server/persona-types.ts`，但现有 SSE 仓的模式是 schema 放 `src/schemas/`，保持一致性
- HANDOFF 写的是 `server/personas/*.json`，但仓根 `personas/` 更利于独立管理和后续摘樱桃
- 最终统一到上述路径，不再有歧义

### 0.2 热插拔策略（已确认）

**Unit 1 采用方案 A：按需重读（无缓存、无 watch）**

行为描述：
```
loadAllPersonas() 被调用时：
  1. fs.readdirSync('personas/') 扫描 .json 文件
  2. 逐个 fs.readFileSync → JSON.parse → PersonaProfileSchema.parse
  3. 返回 PersonaProfile[]
  4. 坏文件：log warning + skip，不阻塞其他
  5. 空目录：返回空数组 []
```

满足"无需重启即可加载"的方式：
- 每次请求到来时重新读磁盘
- 新 JSON 文件放入后，下一次 API 调用自动生效
- 不引入 chokidar/watch，不引入内存缓存

**后续升级路径**（Unit 3+ 视需要决定）：
- B. 启动加载 + 手动刷新 API（`POST /api/roundtable/personas/reload`）
- C. 文件监听（chokidar watch，自动更新缓存）

### 0.3 git 初始化（已执行）

- ✅ `git init`
- ✅ 创建分支 `feat/unit1-persona-profile`

---

## 1. PersonaProfile Schema 设计

### 1.1 设计原则

1. **先服务 prompt 构造**：PersonaProfile 的首要消费者是 LLM prompt，不是前端 UI
2. **先保证差异性**：字段设计要让 7 个哲人的 prompt 输出天然不同
3. **先够用再扩展**：不预设"未来可能需要"的字段

### 1.2 Schema 结构

```typescript
// src/schemas/persona.ts

import { z } from 'zod';

// --- 基础枚举 ---

export const ActionSchema = z.enum([
  '陈述', '质疑', '补充', '反驳', '修正', '综合'
]);

// --- 核心字段 ---

export const PersonaProfileSchema = z.object({
  // 身份
  slug: z.string().min(1),           // 文件名级唯一标识，如 "socrates"
  displayName: z.string().min(1),    // 显示名，如 "苏格拉底"
  avatarEmoji: z.string().min(1),    // 头像 emoji，如 "🏛️"
  era: z.string().min(1),            // 时代标签，如 "古希腊"

  // 认知定位
  corePhilosophy: z.string().min(1), // 核心哲学，≤100字
  thinkingStyle: z.string().min(1),  // 思维风格标签
  signatureQuestion: z.string().min(1), // 标志性提问方式

  // 差异性锚点（对比用）
  anchors: z.object({
    carePriority: z.number().min(0).max(1),      // 关怀优先级 0-1
    libertyPriority: z.number().min(0).max(1),    // 自由优先级 0-1
    authorityPriority: z.number().min(0).max(1),  // 权威优先级 0-1
    fairnessPriority: z.number().min(0).max(1),   // 公平优先级 0-1
  }),

  // 发言规则
  preferredActions: z.array(ActionSchema).min(1), // 偏好行为
  voiceRules: z.object({
    tone: z.array(z.string().min(1)).min(1),      // 语调关键词
    habits: z.array(z.string()).default([]),       // 表达习惯
    avoid: z.array(z.string()).default([]),        // 避免事项
  }),

  // 对比锚点（用于 prompt 中构造差异压力）
  contrastPoints: z.array(z.object({
    dimension: z.string().min(1),    // 维度名，如 "知识的本质"
    stance: z.string().min(1),       // 立场，如 "知识即回忆"
  })).min(1),

  // 诚实边界
  honestBoundary: z.string().min(1), // 该哲人不会说什么/做什么
});

export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;
```

### 1.3 字段说明

| 字段 | 消费者 | 用途 |
|------|--------|------|
| `slug` | Loader, Engine, SSE | 文件名/路由级唯一标识 |
| `displayName` | 前端 UI | 头像下方名字 |
| `avatarEmoji` | 前端 UI | 头像显示 + "正在思考" 动画 |
| `era` | 前端 UI | 信息卡片标签 |
| `corePhilosophy` | Prompt | system prompt 核心段落 |
| `thinkingStyle` | Prompt | prompt 中"你的思维方式是..." |
| `signatureQuestion` | Prompt | 差异化提问风格 |
| `anchors` | Engine + Prompt | 立场向量，用于 speaker selection + prompt 注入 |
| `preferredActions` | Prompt | "你倾向于..." 行为约束 |
| `voiceRules` | Prompt | 语调/习惯/禁忌 |
| `contrastPoints` | Prompt | **关键**：构造"你与其他哲人的核心分歧"段落 |
| `honestBoundary` | Prompt | "你绝不会..." 安全约束 |

---

## 2. Loader 设计

### 2.1 接口

```typescript
// server/persona-loader.ts

export function loadAllPersonas(personasDir?: string): PersonaProfile[];
// 扫描目录，读取 JSON，Zod 校验，返回有效列表

export function loadPersonaBySlug(slug: string, personasDir?: string): PersonaProfile | null;
// 按 slug 查找单个 persona

export function validatePersonaFile(filePath: string): { valid: boolean; errors?: string[] };
// 校验单个文件，返回校验结果（测试用）
```

### 2.2 行为规则

1. **扫描**：`fs.readdirSync(dir)` 过滤 `.json` 文件
2. **读取**：`fs.readFileSync` + `JSON.parse`
3. **校验**：`PersonaProfileSchema.parse()`，失败则 log warning + skip
4. **排序**：按文件名字母序（稳定可预测）
5. **空目录**：返回 `[]`，不抛错
6. **坏文件**：单个失败不阻塞，汇总到 warning 日志
7. **路径默认值**：`path.resolve(process.cwd(), 'personas')`，可覆盖

### 2.3 不做的事

- ❌ 不做内存缓存
- ❌ 不做文件监听
- ❌ 不做 HTTP 热重载端点（Unit 3 再加）
- ❌ 不做 persona 优先级/排序配置（后续按需加）

---

## 3. 7 个哲人 JSON

### 3.1 名单

| slug | displayName | era | avatarEmoji | 核心哲学关键词 |
|------|------------|-----|-------------|--------------|
| socrates | 苏格拉底 | 古希腊 | 🏛️ | 无知之知、追问定义 |
| nietzsche | 尼采 | 19世纪德国 | ⚡ | 超人意志、价值重估 |
| wang-yangming | 王阳明 | 明代中国 | 🌿 | 知行合一、致良知 |
| hannah-arendt | 汉娜·阿伦特 | 20世纪德国/美国 | 🔦 | 极权主义批判、平庸之恶 |
| charlie-munger | 查理·芒格 | 20-21世纪美国 | 🧠 | 多元思维模型、逆向思考 |
| richard-feynman | 理查德·费曼 | 20世纪美国 | 🔬 | 构建即理解、反cargo cult |
| herbert-simon | 赫伯特·西蒙 | 20世纪美国 | 🎯 | 有限理性、满意原则 |

### 3.2 差异性设计要点

7 个哲人需要在以下维度上有**可区分的分布**：

1. **立场向量**（anchors）：care/liberty/authority/fairness 四维，不能有两人在三维度以上重合
2. **思维风格**（thinkingStyle）：每个必须不同
3. **对比锚点**（contrastPoints）：至少覆盖 3 个共享维度，且立场不同
4. **语调**（voiceRules.tone）：7 种不同的语调组合

---

## 4. 实施顺序

### Step 0: git init + 分支 ✅
- `git init`
- 创建分支 `feat/unit1-persona-profile`

### Step 1: Schema
- 创建 `src/schemas/persona.ts`
- Zod schema + TypeScript type
- `tsc --noEmit` 确认编译通过

### Step 2: Loader
- 创建 `server/persona-loader.ts`
- 实现 `loadAllPersonas` + `loadPersonaBySlug` + `validatePersonaFile`
- `tsc --noEmit` 确认编译通过

### Step 3: 7 个哲人 JSON
- 创建 `personas/` 目录
- 逐一创建 7 个 JSON 文件
- 每个文件通过 Zod 校验

### Step 4: 最小验证
- 创建 `server/__tests__/persona-loader.test.ts`
- 测试用例：正常加载、坏文件跳过、空目录、slug 查找
- `npm run test:run` 确认通过

### Step 5: 验收 + 收尾
- `npm run typecheck:full` 确认全仓无错误
- `npm run dev` 启动，确认服务正常
- 更新 HANDOFF.md

---

## 5. 验收 Checklist

- [ ] `src/schemas/persona.ts` 存在且编译通过
- [ ] `server/persona-loader.ts` 存在且编译通过
- [ ] `personas/` 目录下有 7 个有效 JSON
- [ ] 每个 JSON 通过 `PersonaProfileSchema.parse()`
- [ ] `server/__tests__/persona-loader.test.ts` 全部通过
- [ ] 新增 persona JSON 后无需重启即可加载
- [ ] `personas/` 目录为空时不崩溃
- [ ] 单个坏 JSON 不阻塞其他 persona 加载
- [ ] `npm run typecheck:full` 零错误

---

## 6. 风险与降级

| 风险 | 影响 | 降级策略 |
|------|------|---------|
| Schema 字段不够用 | Unit 3 prompt 构造受限 | Unit 3 时再扩展，schema 设计允许增量添加 |
| 7 个哲人差异不够 | 发言区分度不足 | 先 dump 实际 prompt 检查对比锚点，再调 JSON |
| JSON 体积过大 | token 消耗 | 先不管，Unit 3 做 context 压缩时再处理 |
