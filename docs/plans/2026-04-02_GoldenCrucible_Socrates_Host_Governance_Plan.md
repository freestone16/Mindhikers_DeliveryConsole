# 2026-04-02 Golden Crucible Socrates Host Governance Plan

## Goal

把黄金坩埚收回到一条明确原则上：

- Socrates 承接所有业务判断与工具编排
- SaaS 宿主只负责传递上下文、执行工具、持久化结果、回传错误

这次治理不再把重点放在“修一个搜索 bug”，而是修正宿主与业务的权力边界。

## Current Findings

当前 `MHSDC-GC-SAAS-staging` 的实现存在 4 个核心偏差：

1. `server/crucible.ts` 由宿主直接调用 `detectCrucibleSearchIntent(...)`
2. `server/crucible.ts` 由宿主直接调用 `performCrucibleExternalSearch(...)`
3. `server/crucible-research.ts` 由宿主直接构造 query 并请求 Bing RSS
4. `server/crucible-orchestrator.ts` 中的 `Researcher / FactChecker / toolRoutes` 主要停留在计划说明层，没有成为真实 runtime 执行链

这意味着当前链路是：

`用户输入 -> 宿主判断是否搜索 -> 宿主直接搜索 -> 宿主拼 prompt -> Socrates 回答`

而不是目标链路：

`用户输入 -> Socrates 产出结构化决策 -> 宿主执行工具 -> Socrates 基于工具结果继续推进`

## Governance Principle

从这一版开始，黄金坩埚只认下面这条边界：

- Socrates 负责：
  - 理解用户意图
  - 判断是否需要联网
  - 判断是否需要 Researcher / FactChecker
  - 输出每个工具的调用目标和约束
  - 在工具结果返回后生成最终 dialogue / focus / presentables
- 宿主负责：
  - 收集并传递上下文
  - 执行 Socrates 要求的工具
  - 记录工具输入 / 输出 / 失败原因
  - 把执行结果回填给 Socrates
  - 持久化完整证据链

同时明确一条不过度矫正原则：

- 宿主不是“零职责”
- 但宿主允许保留的，只能是确定性执行职责，不能借执行壳重新吃回业务判断

### Approved Host Scope（本轮审批通过）

1. 账号与登录边界
2. workspace / conversation 权限边界
3. HTTP / SSE / streaming 生命周期
4. 持久化与恢复
5. 工具执行器接驳
6. 最小证据链落盘
7. 技术层错误回传
8. 配额、会员、BYOK、访问控制

### Forbidden Host Scope（本轮审批否决）

9. 决定是否联网
10. 决定搜索 query
11. 决定是否调用 `Researcher / FactChecker`
12. 决定 `phase / engineMode / round stage`
13. 决定对话结构
14. 预写 fallback 业务内容
15. 用静态展示或宿主推断冒充“本轮执行过哪些 skill”

## Phase 1: Stop Host Overreach

目标：先把宿主“越权做业务判断”的点收口，不继续扩大技术债。

工作项：

1. 从主链中移除宿主级 `detectCrucibleSearchIntent(...)` 决策依赖
2. 停止让宿主自己根据正则决定 `Researcher` 是否上场
3. 停止让宿主自己拼接“Researcher 状态/补充”文本充当业务层
4. 保留宿主级搜索执行器，但只作为被调工具，不再拥有决策权

阶段验收：

- 宿主不再单独决定是否搜索
- 宿主不再单独决定 query
- 搜索执行前必须先有一份来自 Socrates 的结构化决策

## Phase 2: Introduce Socrates Decision Layer

目标：让 Socrates 先产出本轮业务决策，再进入工具执行。

建议输出结构：

```json
{
  "speaker": "oldzhang",
  "reflection": "......",
  "focus": "......",
  "decision": {
    "needsResearch": true,
    "needsFactCheck": false,
    "toolRoutes": [
      { "tool": "Researcher", "mode": "support", "reason": "用户明确要求补充外部材料" }
    ],
    "researchQuery": "AI时代创作的主体性 最新研究",
    "researchGoal": "补近两年外部讨论与研究线索"
  },
  "presentables": []
}
```

要求：

1. `decision` 必须由 Socrates 产出
2. `toolRoutes` 必须来自 Socrates，而不是宿主硬编码
3. `researchQuery / researchGoal / factCheckScope` 必须来自 Socrates

阶段验收：

- 同一轮是否联网，由 Socrates 决定
- 同一轮调用哪些工具，由 Socrates 决定
- 宿主只消费决策，不再自己补脑

## Phase 3: Turn Researcher / FactChecker Into Real Runtime Tools

目标：把 UI 上“Loaded Skills”背后的语义，变成真实的 runtime 执行链。

工作项：

1. 为 `Researcher` 建立真实工具执行器接口
2. 为 `FactChecker` 建立真实工具执行器接口
3. 宿主根据 `decision.toolRoutes` 执行对应工具
4. 工具结果以结构化形式回填给 Socrates，而不是只拼接长文本

建议结果结构：

```json
{
  "toolResults": {
    "research": {
      "connected": true,
      "query": "...",
      "sources": []
    },
    "factCheck": {
      "checked": true,
      "claims": []
    }
  }
}
```

阶段验收：

- `Researcher` 与 `FactChecker` 在 runtime 中有真实执行痕迹
- UI 展示的 skill 不再只是静态标签
- Socrates 可以基于真实工具结果继续对话

## Phase 4: Strengthen Persistence And Debugging

目标：让后续排障不再靠猜。

持久化至少要记录：

1. Socrates 原始决策
2. 实际执行了哪些工具
3. 每个工具的输入参数
4. 每个工具的输出摘要
5. 每个工具是否成功、失败原因是什么
6. 最终回答是否基于工具结果生成

阶段验收：

- `turns[].meta` 不再只有 `searchRequested / searchConnected`
- 任意一轮都能回放“为什么搜、搜了什么、失败在哪”

## Immediate Execution Order

本轮建议执行顺序：

1. 确认 `production / staging` 的 `KIMI_API_KEY` 都已生效
2. 改造 `server/crucible.ts`，把宿主级搜索判定从主链移除
3. 扩展 `buildSocratesPrompt` / 输出 schema，让 Socrates 产出结构化决策
4. 把 `Researcher` 执行器改成“读取 Socrates 决策后再执行”
5. 回填工具结果给 Socrates，生成最终回答
6. 扩展 persistence 结构，写入完整工具轨迹
7. 前端再消费真实工具执行状态

## Non-Goals

本轮不做这些事：

1. 不把问题收窄成“补几个正则词”
2. 不继续增强宿主硬编码 query builder
3. 不继续让 UI 先显示 skill、runtime 后补逻辑
4. 不把“联网搜索是否需要”这种业务判断留在宿主层
