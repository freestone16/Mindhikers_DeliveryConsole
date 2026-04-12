🕐 Last updated: 2026-04-12 20:30
🌿 Branch: MHSDC-GC-SAAS-staging
📍 Scope: MHSDC/GoldenCrucible-SaaS

---

## Goal

执行 GoldenCrucible-SaaS V1 实施计划。**Phase 1/2/3 全部本地验证完成，staging 冒烟待执行。**

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

## Phase 3 — 本地验证完成 ✅ / Staging 冒烟待执行 🔲

| 验证项 | 结果 |
|--------|------|
| `npm run build` | ✅ 通过（1950 modules, 1.95s） |
| `npx vitest run` | ✅ 12 文件 / 50 测试全通过 |
| 本地服务启动 | ✅ 前端 5183 + 后端 3010 正常 |
| API 端点可达性 | ✅ 6 个核心端点全部验证 |
| 认证网关 | ✅ 未认证请求正确返回 401 |
| `crucible-thesiswriter.ts` 正则修复 | ✅ `[\r\n]` 替换断行字面量 |
| Smoke Request 文件 | ✅ TREQ-004/005/006/007 已创建 |

---

## Phase 3 修复清单

- `server/crucible-thesiswriter.ts:103`：正则表达式语法错误
  - 原：`value.replace(/` + 字面量换行 → `Unterminated regular expression`
  - 修：`value.replace(/[\r\n]/g, '')`

## Smoke Request 目录

| TREQ | 文件 | 覆盖 |
|------|------|------|
| TREQ-004 | `core-dialogue-smoke` | 对话主链：新建 → 3轮 → 刷新恢复 → 继续对话 |
| TREQ-005 | `history-and-export-smoke` | 历史列表、active 恢复、bundle-json / markdown 导出 |
| TREQ-006 | `thesiswriter-smoke` | 收敛触发 → CTA → 生成论文 → artifact → trial 额度 |
| TREQ-007 | `byok-smoke` | BYOK 配置 → 连通性测试 → 对谈 → 论文 → 清除回退 |

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

1. **staging 环境全链路冒烟**
   - 部署最新代码到 Railway staging（`MHSDC-GC-SAAS-staging` 分支）
   - 用 Google 账号登录执行 TREQ-004/005/006/007
   - 每条 smoke 写 report + evidence
2. **production 环境至少一条主链 smoke**
3. **Linear MIN-94 父 issue 状态更新**（标记 Phase 3 完成）
4. **最终提交**：正则修复 + smoke request 文件 → `refs MIN-108 add staging acceptance smoke requests and regex fix`
