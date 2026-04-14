🕐 Last updated: 2026-04-14 15:30
🌿 Branch: MHSDC-GC-SAAS-staging
📍 Scope: MHSDC/GoldenCrucible-SaaS

---

## Goal

GoldenCrucible-SaaS V1 Phase 3 staging 冒烟测试 + SaaS/SSE 双边治理同步。

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

## Phase 3 — Staging 冒烟部分完成 / 存在阻塞 ⚠️

| 验证项 | 结果 |
|--------|------|
| TREQ-004 Core Dialogue | ✅ 通过 — SSE 流正常，4 轮对话 + 刷新恢复验证通过（Kimi） |
| TREQ-005 History/Export | ✅ 通过 — 历史列表、恢复、bundle-json(6KB) 和 markdown(4.5KB) 导出正常 |
| TREQ-006 ThesisWriter | ⚠️ 阻塞 — Thesis 后端路由在 staging 返回 404，代码存在但未部署 |
| TREQ-007 BYOK | ⏸️ 待执行 — 依赖 TREQ-006 解阻塞 |
| Production 主链冒烟 | ✅ 通过 — `gc.mindhikers.com` 首页、auth、version 正常 |

### Phase 3 落盘

- **Commit**: `7147b59` (`refs MIN-108`) — 本地已提交，尚未 push 到远程
- **报告路径**: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-00{4,5,6}.report.md`
- **证据路径**: `testing/golden-crucible/artifacts/`

---

## 治理同步 — 已完成 ✅（未提交）

### 改动范围

双边同步了 SaaS 和 SSE 的治理文件，确保核心认知、底座同步规则一致。

| # | 文件 | 仓库 | 改动 |
|---|------|------|------|
| 1 | `AGENTS.md` | SaaS | 完全重写：加 §0.1 核心认知 4 条、§1 架构概览、§6 底座同步完整章节 |
| 2 | `docs/04_progress/rules.md` | SaaS | 新增规则 102-113（核心认知 + 底座同步 + 文档链路） |
| 3 | `docs/04_progress/dev_progress.md` | SaaS | 新增 1.19 里程碑 |
| 4 | `AGENTS.md` | SSE | 加 §0.1 核心认知 + §6 底座同步 + Red Line 补文档链路 |
| 5 | `docs/04_progress/rules.md` | SSE | 新增规则 101-109（底座同步 + 恢复优先级 + 拉齐纪律） |

### 关键决策

- **SaaS ≠ SSE 子集**：SaaS 是独立预发阵地，经过生产级验收
- **底座 = 6 类基础设施**：路由骨架、认证体系、构建配置、前端壳、共享类型/Schema、通用工具
- **触发时机**：SaaS 每次验收收口（准备推 main 之前）
- **冲突原则**：底座以 SaaS 为准，功能以 SSE 为准，判断不了问老卢
- **健康校验**：build + dev 启动 + 冒烟测试

### 状态：⚠️ 5 个文件已修改但未 git commit

需要老卢确认后提交。

---

## 当前阻塞点

### 1. ThesisWriter 后端路由未部署到 staging（阻塞 TREQ-006/007）

- `/api/crucible/thesis/generate` → 404
- `/api/crucible/thesis/trial-status` → 404
- 本地代码中存在这些路由 (`server/index.ts:256-268`)
- Railway staging 部署版本中未生效

### 2. 待回灌的底座修复（3 个 commit）

| Commit | 内容 | 状态 |
|--------|------|------|
| `1847fa2` | auth:migrate 加入启动脚本 | 待回灌 SSE |
| `d897137` | databaseMigration 启用 | 待回灌 SSE |
| `e33fbef` | thesiswriter 正则修复 | 待确认是否被 backsync 覆盖 |

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

---

## 约束（Verbatim）

- 禁止在 main 直接开发或写无相关的特性代码
- 禁止绕过老卢确认
- 禁止无 issue 归属的提交：`refs MIN-xx <变更摘要>`
- 所有沟通、思考、方案必须使用中文
- 分支：`MHSDC-GC-SAAS-staging`

---

## 下一步

1. **老卢确认治理文件改动 → git commit + push**（SaaS 和 SSE 双边）
2. **排查 ThesisWriter 路由未部署到 staging 的根因**
3. **解阻塞后重新执行 TREQ-006 / TREQ-007**
4. **底座回灌**：将 `1847fa2`、`d897137`、`e33fbef` 三个 commit cherry-pick 到 SSE
5. **Linear MIN-108 状态推进为 Done**
6. **推送 commit `7147b59` 到远程**
