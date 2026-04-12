🕐 Last updated: 2026-04-12 18:10
🌿 Branch: MHSDC-GC-SAAS-staging
📍 Scope: MHSDC/GoldenCrucible-SaaS

---

## Goal

执行 GoldenCrucible-SaaS V1 实施计划，当前在 **Phase 3 — Unit 7 Staging Acceptance** 前夜。

## 实施计划

`docs/plans/2026-04-12-001-feat-golden-crucible-saas-v1-implementation-plan.md`（7 个 Unit，3 个交付阶段）

## PRD

`docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`（357 行）

---

## Phase 1 — 全部完成 ✅

| Unit | Linear | Commit | 内容 |
|------|--------|--------|------|
| Unit 1 Core Path Readiness | MIN-105 | — | 4 个探索 agent 确认 PRD 就绪 |
| Unit 5 BYOK Guided Onboarding | MIN-109 | `8ee25ac` `edc06f7` | 服务端错误归类 + 前端引导增强 + 诊断测试 |
| Unit 6 Auth Smoke Requests | — | — | 3 个 smoke request 文件（GC-SAAS-001/002/003） |

## Phase 2 — 全部完成 ✅

| Unit | Linear | Commit | 内容 |
|------|--------|--------|------|
| Unit 2 Thesis Convergence Gate | MIN-119 | `d3b04ed` | `detectThesisConvergence()` 纯函数 + thesisReady 全链路 + ChatPanel CTA + 10 测试 |
| Unit 3 ThesisWriter API + Artifact | MIN-120 | `db75abb` | `crucible-thesiswriter.ts` 新建 + `appendCrucibleThesisArtifact` + 前端下载 |
| Unit 4 Thesis Trial Quota | MIN-121 | `f70d001` | 平台用户限 2 次论文 + BYOK/VIP 无限制 + 前端额度展示 |

## Phase 3 — 待执行 🔲

| Unit | Linear | 内容 |
|------|--------|------|
| Unit 7 Staging Acceptance | — | 全链路冒烟 + HANDOFF 回写 + 最终提交 |

---

## Unit 2 变更清单（`d3b04ed`）

- `server/crucible.ts`：`detectThesisConvergence()` 纯函数 + `CrucibleTurnResult.thesisReady`
- `server/crucible-persistence.ts`：`CrucibleConversationSnapshot.thesisReady` + 快照推导
- `src/components/crucible/types.ts`：`CrucibleTurnResponse.thesisReady` + `CrucibleSnapshot.thesisReady`
- `src/components/crucible/CrucibleWorkspaceView.tsx`：`thesisReady` state + SSE 捕获 + 快照持久化
- `src/SaaSApp.tsx`：`crucibleThesisReady` state + hydrate/reset + 传递给 ChatPanel
- `src/components/ChatPanel.tsx`：`thesisReady` + `onEnterThesisWriter` props + CTA 卡片（Sparkles 图标）
- `server/__tests__/crucible-thesis-convergence.test.ts`：6 个收敛检测场景
- `src/components/__tests__/crucible-thesis-entry.test.tsx`：4 个 CTA 显示/点击场景
- 额外：Socrates decision 重构、FactChecker 集成、schemas、history 增强

## Unit 3 变更清单（`db75abb`）

- `server/crucible-thesiswriter.ts`（新建）：thesis 生成处理器
  - 收敛校验 → 辩证地图构建 → ThesisWriter prompt → LLM 调用（支持 BYOK）→ artifact 保存
- `server/crucible-persistence.ts`：`appendCrucibleThesisArtifact` 函数
- `server/index.ts`：`POST /api/crucible/thesis/generate` 路由
- `src/SaaSApp.tsx`：`isGeneratingThesis` / `thesisError` state + `handleEnterThesisWriter` 回调 + Markdown 下载

## Unit 4 变更清单（`f70d001`）

- `server/crucible-trial.ts`：
  - `CRUCIBLE_THESIS_TRIAL_LIMIT = 2`
  - `CrucibleThesisTrialStatus` 接口
  - `getCrucibleThesisTrialStatus`：遍历 conversation artifacts 计数 `thesis_` 前缀
  - `assertCrucibleThesisTrialAccess`：平台模式阻止超额
- `server/crucible-thesiswriter.ts`：LLM 调用前增加 trial 校验（BYOK 跳过）
- `server/index.ts`：`GET /api/crucible/thesis/trial-status` 端点
- `src/SaaSApp.tsx`：`thesisTrialStatus` state + fetch effect + CTA 额度拦截 + warning 展示

---

## 关键架构知识

### 收敛检测

```typescript
detectThesisConvergence(roundIndex, source, decision)
→ roundIndex >= 5 && source === 'socrates' && decision.stageLabel === 'crystallization'
```

### Thesis 数据流

```
CrucibleTurnResult.thesisReady (server)
→ SSE turn event → CrucibleTurnResponse.thesisReady
→ CrucibleWorkspaceView state → CrucibleSnapshot.thesisReady
→ SaaSApp crucibleThesisReady state → ChatPanel thesisReady prop
→ CTA 渲染 (isCrucibleMode && thesisReady && lastOldluMessageId)
→ 用户点击 → handleEnterThesisWriter
→ POST /api/crucible/thesis/generate
→ callConfiguredLlm(thesisPrompt, byokConfig)
→ appendCrucibleThesisArtifact (type: 'asset', id: thesis_${ts})
→ 前端下载 Markdown
```

### Trial Quota 分层

- **VIP**：enabled=false, canGenerateThesis=true（不受限）
- **BYOK**：mode='byok', canGenerateThesis=true（不受限）
- **平台模式**：CRUCIBLE_THESIS_TRIAL_LIMIT=2，遍历 artifacts 计数 thesis_ 前缀

### Artifact 持久化

- 存储：`runtime/crucible/workspaces/{workspaceId}/conversations/{conversationId}.json`
- artifacts 挂在 `conversation.artifacts[]` 上，push 追加
- 导出：`buildCrucibleArtifactExport()` 自动包含所有 artifacts

### LLM 调用模式

- `callConfiguredLlm(prompt, override?)`：非流式，用于 JSON/文本输出
- 配置分层：override (BYOK) → expert config → global config → provider default
- ThesisWriter 复用同一模式

---

## 约束（Verbatim）

- 禁止在 main 直接开发或写无相关的特性代码
- 禁止绕过老卢确认
- 禁止无 issue 归属的提交：`refs MIN-xx <变更摘要>`
- 所有沟通、思考、方案必须使用中文
- 分支：`MHSDC-GC-SAAS-staging`

---

## 下一步

1. **Phase 3 — Unit 7 Staging Acceptance**
   - 全链路冒烟：启动服务 → 创建对话 → 收敛触发 → CTA 出现 → 生成论文 → 验证 artifact → 导出
   - `npm run build` + `npx vitest run` 全量验证
   - HANDOFF 回写 + 父 issue MIN-94 更新
2. 建议在新 session 中执行，当前上下文已消耗约 45%
