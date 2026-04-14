# GoldenCrucible-SSE Agent Rules

> 🕐 最后更新：2026-04-14
> 🌿 分支：`MHSDC-GC-SSE`
> 📦 Linear：[MIN-135](https://linear.app/mindhikers/issue/MIN-135)（回灌治理）→ 父 issue [MIN-94](https://linear.app/mindhikers/issue/MIN-94)

## 0. 项目角色与环境

| 环境 | 分支 | 角色 | 域名 | 本地目录 |
|------|------|------|------|----------|
| **SSE（研发主线）** | `MHSDC-GC-SSE` | 所有新功能先落这里 | `golden-crucible-saas-sse.up.railway.app` | `/Users/luzhoua/MHSDC/GoldenCrucible-SSE` |
| SaaS（staging） | `MHSDC-GC-SAAS-staging` | SSE 验证后 push 到这里 | `golden-crucible-saas-staging.up.railway.app` | `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS` |
| production | `main` | SaaS 验收后合并 | `gc.mindhikers.com` | — |

**发布流**：`SSE`（开发）→ `SaaS staging`（预发）→ `main`（生产）

## 1. 当前架构概览

SSE 已完成 SaaS staging 全面回灌（Phase 0-1），包含以下核心模块：

| 模块 | 关键文件 | 说明 |
|------|----------|------|
| 两阶段对话引擎 | `server/crucible-orchestrator.ts` | `buildSocratesDecisionPrompt` → 工具执行 → `buildSocratesCompositionPrompt` |
| 论文生成 | `server/crucible-thesiswriter.ts` | 论文 API + artifact 持久化 |
| BYOK 密钥管理 | `server/crucible-byok.ts` | 密钥诊断 + 错误分类 |
| FactChecker 专家 | `server/crucible-factcheck.ts` | 事实核查路由 |
| 试用额度 | `server/crucible-trial.ts` | 平台用户限 2 次 |
| VIP 分层 | `server/auth/account-tier.ts` | 账户层级覆盖 |
| BYOK 配置 UX | `src/components/SaaSLLMConfigPage.tsx` | 引导式配置页面 |
| 历史面板 | `src/components/crucible/CrucibleHistorySheet.tsx` | 696 行完整历史管理 |
| 运行时 Schema | `src/schemas/crucible-runtime.ts` | Zod 校验 |
| SSE 事件流 | `src/components/crucible/sse.ts` | 前端 SSE 客户端 |
| 前端主入口 | `src/SaaSApp.tsx` | SaaS-only 壳，不含旧 Delivery 模块 |
| 路由总入口 | `server/index.ts` | 含 thesis/trial/byok/factcheck/account-tier 全部路由 |

### 产品需求与设计文档

- PRD：`docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`
- 实施计划：`docs/plans/2026-04-12-001-*`（SaaS v1）、`002-*`（thesis gate）、`003-*`（CTA）、`2026-04-12_SaaS_BYOK_*`（BYOK UX）

## 2. Scope

- 路径：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- 上层全局入口：`/Users/luzhoua/MHSDC/AGENTS.md`
- 本文件只补 SSE 自己的研发主线约束，不重复全局治理总纲

## 3. OldYang First

凡是工程与治理任务，默认先经 `OldYang`（全局路径 `~/.opencode/skills/OldYang/`）。

## 4. Read Order

1. 当前文件 `AGENTS.md`
2. `docs/dev_logs/HANDOFF.md`（当前状态与下一步）
3. `docs/04_progress/rules.md`（工程约束集，92 条规则）
4. 如需了解产品需求：`docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`
5. 如任务涉及测试：`testing/README.md` → `testing/OPENCODE_INIT.md` → `testing/golden-crucible/README.md`

当前层足够时停止下钻，不为"更完整"而盲目扩读。

## 5. Local Red Lines

1. **SSE 是研发主线** — 新功能先落 SSE，验证后再推 SaaS staging
2. **不做任何 SaaS 方向的 push** — 只做 SSE → SaaS 单向推进
3. **SSE 独有功能**（多主题保存、artifact 导出、对话恢复）回灌后保留，验证兼容性后再提交到 SaaS
4. **回灌以 SaaS 版为基准** — 架构分叉以 SaaS 版为准，SSE 独有逻辑在 SaaS 基准上验证
5. 历史文档继续走零损失编目，不做无映射迁移

## 6. Testing And Browser

1. 页面查看、UI 验证、截图、交互检查默认优先 `agent-browser`
2. 冒烟测试请求：`testing/golden-crucible/requests/TREQ-2026-04-12-*`
3. 完成前验证至少覆盖：当前研发主链一条 + 页面或接口验证一条 + handoff 回写

## 7. References

| 文档 | 路径 |
|------|------|
| 全局入口 | `/Users/luzhoua/MHSDC/AGENTS.md` |
| 当前交接 | `docs/dev_logs/HANDOFF.md` |
| 工程规则 | `docs/04_progress/rules.md` |
| 开发进展 | `docs/04_progress/dev_progress.md` |
| 回灌计划 | `docs/plans/2026-04-14_GC_SSE_SaaS_Full_Backsync_Governance_Plan.md` |
| 产品需求 | `docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md` |
| 测试入口 | `testing/README.md` |
