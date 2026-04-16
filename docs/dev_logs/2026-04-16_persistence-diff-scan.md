---
title: "Crucible Persistence 两仓分叉 · 扫雷报告"
type: tech-memo
date: 2026-04-16
owner: OldYang
purpose: Phase 2 圆桌迁移的"缺口 1"前置分析，为 backport 提供精确指引
related:
  - /Users/luzhoua/MHSDC/GoldenCrucible-Roundtable/docs/plans/2026-04-13_roundtable-to-sse-migration-plan.md (§1.2 有事实错误)
  - docs/plans/2026-04-14_GC_SSE_SaaS_Full_Backsync_Governance_Plan.md
---

# Crucible Persistence 两仓分叉 · 扫雷报告

## TL;DR

**RT 迁移方案 §1.2 描述有误**：
> 原文："有 `server/crucible-persistence.ts`：版本比 RT 略新，但已包含 `appendSpikesToCrucibleConversation` 和 `appendDeepDiveToCrucibleConversation`"

**事实**：SSE 的 `server/crucible-persistence.ts` **根本没有这两个函数**。两仓在 persistence 层各自演进，**没有交集**，需要真正的 backport 操作（而非"签名适配"）。

## 分叉详情

两仓从共同祖先分叉后各走一路：

```
                  ┌────────────────────────────────────┐
                  │        共同祖先 persistence        │
                  └────────────────┬───────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
        SSE 方向 (MIN-135)                      RT 方向 (MIN-117)
        SaaS 基建                                圆桌功能
        ─────────────                            ─────────────
        + SocratesDecision 类型                  + 'spike' 类型加入 union
        + ToolExecutionTrace 类型                + 'deepdive' 类型加入 union
        + accessMode: 'platform'|'byok'          + appendSpikesToCrucibleConversation (71 行)
        + decisionVersion/decision/toolTraces    + appendDeepDiveToCrucibleConversation (72 行)
        + decisionSummary / thesisReady
        + seedWorkspaceFromLegacySnapshot
```

## SSE 侧缺失的东西（需 backport from RT）

### 1. 类型 Union 扩展（4 处）

| 位置 | SSE 现状 | 需扩展为 |
|---|---|---|
| `MaterializedCruciblePresentable.type` | `'reference' \| 'quote' \| 'asset'` | `... \| 'spike' \| 'deepdive'` |
| `CrucibleConversationArtifact.type` | `'reference' \| 'quote' \| 'asset'` | `... \| 'spike' \| 'deepdive'` |
| `StoredCrucibleConversation.snapshot.presentables[].type` | `'reference' \| 'quote' \| 'mindmap'` | `... \| 'spike' \| 'deepdive'` |
| `StoredCrucibleConversation.artifacts[].type`（隐式） | 同上 | 同上 |

### 2. `appendSpikesToCrucibleConversation`（RT 第 890-961 行）

**签名**：
```ts
export const appendSpikesToCrucibleConversation = (
    context: CruciblePersistenceContext,
    params: {
        sessionId: string;
        topicTitle: string;
        spikes: Array<{
            id: string;
            title: string;
            summary: string;
            content: string;
            sourceSpeaker: string;
            roundIndex: number;
            bridgeHint?: string;
            tensionLevel?: 1 | 2 | 3 | 4 | 5;
            isFallback?: boolean;
        }>;
    },
) => StoredCrucibleConversation;
```

**依赖的内部工具**（需验证 SSE 都存在）：
- `getConversationFile(workspaceDir, conversationId)` ✓ 存在
- `readJsonFile(path, defaultValue)` ✓ 存在
- `buildConversationSnapshot(conversation)` ✓ 存在
- `writeActiveConversationPointer(workspaceDir, conversationId, topicTitle)` ✓ 存在
- `updateConversationIndex(workspaceDir, summary)` ✓ 存在
- `buildConversationSummary(conversation)` ✓ 存在

### 3. `appendDeepDiveToCrucibleConversation`（RT 第 963-1035 行）

**签名**：
```ts
export const appendDeepDiveToCrucibleConversation = (
    context: CruciblePersistenceContext,
    params: {
        sessionId: string;
        topicTitle: string;
        deepDiveId: string;
        spikeTitle: string;
        sourceSpeaker: string;
        summary: {
            title: string;
            coreInsight: string;
            keyQuotes: string[];
            remainingTension: string;
            nextSteps: string[];
        };
        turnCount: number;
    },
) => StoredCrucibleConversation;
```

**依赖的内部工具**：同上，已全部存在于 SSE。

## Backport 难度评估

| 维度 | 评估 |
|---|---|
| 是否改动 SSE 既有函数 | ❌ 不改动 —— 纯新增 |
| 是否改动 SSE 既有类型 | ⚠️ 只扩展 4 处 union，全是宽化（向后兼容）|
| 依赖的内部工具 | ✅ SSE 全部已有 |
| 与 SSE MIN-135 字段的兼容性 | ✅ 无冲突（`accessMode` / `decision` / `toolTraces` 等字段在创建新 conversation 时走默认值即可）|
| 总体难度 | 🟢 **低** |

## Phase 2 Backport 操作清单

当 Phase 2 启动时，按此顺序执行：

1. **扩展类型 union**（4 处）
   - 在 SSE `crucible-persistence.ts` 找到 4 处 type 定义
   - 分别加入 `'spike' | 'deepdive'`

2. **backport 两个 append 函数**
   - 从 RT 第 890-961 行拷 `appendSpikesToCrucibleConversation`
   - 从 RT 第 963-1035 行拷 `appendDeepDiveToCrucibleConversation`
   - **注意**：两个函数内 `StoredCrucibleConversation` 的默认构造要补齐 SSE 新增字段（`accessMode: 'platform'` 等）

3. **验证**
   - `npm run typecheck:full` 必须零错误
   - 已有 SSE 测试必须全绿

4. **后续圆桌引擎迁入**
   - `roundtable-engine.ts` / `deepdive-engine.ts` 调用这两个函数时天然可用

## 附加建议

**Phase 2 执行前**再跑一次本扫雷，确认两仓 persistence 没有进一步分叉（两边都可能继续演进）。

## 对圆桌迁移方案附录 B 的补丁建议

附录 B 的"缺口 1"条目应从：
> ✅ `crucible-persistence.ts` 签名 diff（迁入前必做）

升级为：
> ✅ `crucible-persistence.ts` **backport 两个 append 函数 + 扩展 type union**（本扫雷报告已产出操作清单，Phase 2 启动日直接执行）

---

*扫雷：OldYang*
*日期：2026-04-16*
