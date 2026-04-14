---
title: unit-2: Thesis Convergence Gate
type: feat
status: active
date: 2026-04-12
origin: docs/plans/2026-04-12-001-feat-golden-crucible-saas-v1-implementation-plan.md
issue: MIN-119
---

# Unit 2: Thesis Convergence Gate

## 目标

在 Crucible 对话链路中新增“话题收敛检测”，并把 `thesisReady` 信号透传到前端，在对话页渲染 ThesisWriter CTA。

## 范围与边界

- 仅新增 `thesisReady` 计算/透传与 CTA 入口，不实现 ThesisWriter 实际生成逻辑
- 仅在 Crucible 模式下且满足收敛条件时展示 CTA
- 不修改 SSE 事件类型，不新增 npm 依赖，不改 auth/workspace/trial/byok 逻辑

## 实施步骤

1. 服务端新增 `thesisReady` 字段
   - `server/crucible.ts`：`CrucibleTurnResult` 增加 `thesisReady?: boolean`
   - 在 `resolveCrucibleTurn()` 中基于 `roundIndex >= 5 && source === 'socrates' && decision?.stageLabel === 'crystallization'` 设置
2. 持久化快照补齐 `thesisReady`
   - `server/crucible-persistence.ts`：`CrucibleConversationSnapshot` 增加 `thesisReady?: boolean`
   - `buildDerivedConversationSnapshot()` 基于 turn 决策推导
   - `appendTurnToCrucibleConversation()` 透传 `thesisReady` 并写入 snapshot
3. 前端类型与状态透传
   - `src/components/crucible/types.ts`：`CrucibleTurnResponse` 与 `CrucibleSnapshot` 增加 `thesisReady?: boolean`
   - `CrucibleWorkspaceView.tsx`：`applyTurnResponse()` 接收并落入 snapshot state
4. 对话页 CTA
   - `src/components/ChatPanel.tsx`：增加 `thesisReady` 与 `onEnterThesisWriter` props
   - 仅在 `thesisReady && isCrucibleMode` 且最后一条 oldlu 消息后展示 CTA
5. 测试与验证
   - 新增 `server/__tests__/crucible-thesis-convergence.test.ts`
   - 新增 `src/components/__tests__/crucible-thesis-entry.test.tsx`
   - 运行 `npx vitest run` 与 `npm run build`

## 风险与回滚

- 风险：收敛判定过早/过晚影响 CTA 可见性；仅用 `roundIndex + stageLabel` 最小化干预
- 回滚：移除 `thesisReady` 字段与 CTA 渲染，删除对应测试文件

## 验收标准

- SSE `turn` data 中在满足条件时出现 `thesisReady: true`
- Snapshot 中 `thesisReady` 可复现
- CTA 在 Crucible 模式且 `thesisReady` 时显示
- 测试覆盖收敛/未收敛/回退场景
- `npx vitest run` 与 `npm run build` 均通过
