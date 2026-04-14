---
date: 2026-03-22
module: GoldenCrucible SSE
status: ✅ 已完成
---

# 2026-03-22 | GoldenCrucible | 收回宿主业务判断

## [核心变动]

- 删除 `server/crucible-research.ts`，不再由宿主主动执行外部搜索并把结果硬塞进 prompt。
- 删除 `searchRequested / searchConnected / toolRoutes / phase` 这类宿主业务判断链路。
- `server/crucible-orchestrator.ts` 收敛为薄层 prompt 模板，只负责把上下文交给苏格拉底。
- 删除宿主兜底业务输出：LLM 失败时，server / frontend 不再伪造追问或黑板内容冒充苏格拉底继续对话。
- `buildSocratesPrompt()` 新增硬边界说明：
  - 宿主不做任何业务判断
  - 是否搜索、是否查证、是否调 `Researcher / FactChecker` 全由苏格拉底依据 SKILL.md 自行决定
  - 当用户明确要求联网搜索或事实核查时，苏格拉底必须正面响应该诉求
- 前端 SSE 消费同步瘦身，去掉对 `meta/orchestrator/searchConnected` 的依赖。

## [验证]

- `npm run test:run -- src/__tests__/crucible-prompt.test.ts src/components/crucible/sse.test.ts`
  - 结果：2 个文件通过，4 个测试全部通过
- `npm run build`
  - 结果：仍被市场模块与旧 `DeliveryState` 类型债阻塞
  - 结论：本轮未新增新的坩埚主链构建错误

## [结论]

- 黄金坩埚当前统一口径恢复为：所有讨论业务都由苏格拉底负责，宿主只做 HTTP / SSE、状态同步、日志与结果桥接。
