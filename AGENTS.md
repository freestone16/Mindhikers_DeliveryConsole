# GoldenCrucible-SSE Agent Rules

> 🕐 最后更新：2026-04-30
> 🌿 分支：`MHSDC-GC-SSE`
> 📦 Linear：[MIN-136](https://linear.app/mindhikers/issue/MIN-136)（Shell / governance closure）→ 父 issue [MIN-94](https://linear.app/mindhikers/issue/MIN-94)

## 0. 项目角色与环境

| 环境 | 分支 | 角色 | 域名 | 本地目录 |
|------|------|------|------|----------|
| **SSE（研发主线）** | `MHSDC-GC-SSE` | 所有新功能先落这里 | `golden-crucible-saas-sse.up.railway.app` | `/Users/luzhoua/MHSDC/GoldenCrucible-SSE` |
| SaaS（staging） | `MHSDC-GC-SAAS-staging` | SSE 验证后 push 到这里 | `golden-crucible-saas-staging.up.railway.app` | `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS` |
| production | `main` | SaaS 验收后合并 | `gc.mindhikers.com` | — |

**发布流**：`SSE`（开发）→ `SaaS staging`（预发）→ `main`（生产）

### 0.1 核心认知

1. **SSE 是研发前线**，所有新功能先在 SSE 开发验证，再摘樱桃到 SaaS staging。
2. **SaaS 不是 SSE 的子集**。SaaS 是独立的、经过生产级验收的预发阵地，底座一致但功能集不同。
3. **底座一致，功能集不同**：两边共享认证、构建、前端壳等基础架构，但 SSE 可能有更新的功能模块尚未进入 SaaS。
4. **SaaS 验收过程中产生的底座修复，必须回灌 SSE**，确保研发前线在健全底座上继续开发。

### 0.2 2026-04-30 当前收口口径

1. **SaaS staging 已接收 SSE 壳层迁移**：关键 shell slice 已通过 cherry-pick 进入 `MHSDC-GC-SAAS-staging`，并已部署到 Railway staging。
2. **SSE 重新成为后续小修起点**：新 shell/status polish 从 `MHSDC-GC-SSE` 开始，验证后再摘樱桃到 SaaS staging。
3. **治理 Phase 0-3 先闭环**：在文档、rules、testing board 对齐之前，不启动左侧模块对齐、SkillSync 指示器、Roundtable backend 等功能修复。
4. **Roundtable 是模块能力，不是同步 skill**：当前 synced skill 集合是 `Writer`、`ThesisWriter`、`Researcher`、`FactChecker`、`Socrates`。
5. **SkillSync 状态仍缺 UI 呈现**：后续 shell/status polish 需要补右下角状态指示与 SSOT source popover。

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
3. `docs/04_progress/rules.md`（先读 2026-04-30 当前规则区，再看 legacy archive）
4. 如需了解产品需求：`docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`
5. 如任务涉及测试：`testing/README.md` → `testing/OPENCODE_INIT.md` → `testing/golden-crucible/README.md`

当前层足够时停止下钻，不为"更完整"而盲目扩读。

## 5. Local Red Lines

1. **SSE 是研发主线** — 新功能先落 SSE，验证后再推 SaaS staging
2. **不做任何 SaaS 方向的 push** — 只做 SSE → SaaS 单向推进
3. **不要整枝 merge SSE 到 SaaS** — SaaS staging 只接收经过验证的小切片或 release hotfix
4. **SSE 独有功能**（多主题保存、artifact 导出、对话恢复）回灌后保留，验证兼容性后再提交到 SaaS
5. **回灌以 SaaS 版为基准** — 架构分叉以 SaaS 版为准，SSE 独有逻辑在 SaaS 基准上验证
6. 历史文档继续走零损失编目，不做无映射迁移
7. 文档链路可导航性是硬性验收标准：AGENTS.md → HANDOFF → rules.md → plans/ 必须全链路可访问
8. Roundtable 未加入 `server/skill-sync.ts` 前，禁止描述为 synced standalone skill

## 6. 底座同步（SaaS → SSE）

SaaS staging 每次验收收口（准备推 main 之前），会做一次底座回灌到 SSE，确保研发前线底座健全。

### 同步范围（底座层）

以下基础设施变更会从 SaaS 回灌到 SSE：

1. **服务启动与路由骨架**：`server/index.ts` 的 app setup、middleware 注册、CORS、错误处理
2. **认证与账户体系**：`server/auth/*`、`account-tier`、`account-router`
3. **环境与构建配置**：`package.json`、`vite.config`、`tsconfig`、`Dockerfile`、`.env` 结构
4. **前端主壳**：`SaaSApp.tsx`、路由壳、layout 组件、主题/CSS token
5. **共享类型与 Schema**：`types.ts`、`schemas/*.ts`
6. **通用工具函数**：SSE 客户端、文件存储、LLM connector 基座、`callConfiguredLlm`

### 不同步范围（功能模块，跟随发布流 SSE → SaaS）

- `crucible-thesiswriter`、`crucible-trial`、`crucible-byok`、`crucible-factcheck`、`crucible-orchestrator` 的业务逻辑
- 前端功能组件的业务逻辑

### 冲突原则

- **底座代码**：以 SaaS staging 版为准（经过生产验收）
- **业务功能代码**：以 SSE 版为准（研发前沿）
- **判断不了**：暂停，问老卢

### 操作方式

1. 优先 `git cherry-pick` 单个底座修复 commit
2. 冲突太大时手动 diff 同步
3. SSE 侧回灌前必须备份原版：`cp file.ts file.ts.sse-backup`

### 健康校验（同步后必做）

1. `npm run build` 通过
2. `npm run dev` 启动无报错
3. 至少一条冒烟测试通过

## 7. Testing And Browser

1. 页面查看、UI 验证、截图、交互检查默认优先 `agent-browser`
2. 冒烟测试请求：`testing/golden-crucible/requests/TREQ-2026-04-12-*`
3. 完成前验证至少覆盖：当前研发主链一条 + 页面或接口验证一条 + handoff 回写

## 8. References

| 文档 | 路径 |
|------|------|
| 全局入口 | `/Users/luzhoua/MHSDC/AGENTS.md` |
| 当前交接 | `docs/dev_logs/HANDOFF.md` |
| 工程规则 | `docs/04_progress/rules.md` |
| 开发进展 | `docs/04_progress/dev_progress.md` |
| 回灌计划 | `docs/plans/2026-04-14_GC_SSE_SaaS_Full_Backsync_Governance_Plan.md` |
| 治理收口计划 | `docs/plans/2026-04-30-001-gc-sse-saas-governance-closure-plan.md` |
| 产品需求 | `docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md` |
| 测试入口 | `testing/README.md` |
