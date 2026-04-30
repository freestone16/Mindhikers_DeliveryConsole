# GoldenCrucible-SaaS Agent Rules

> 🕐 最后更新：2026-04-30
> 🌿 分支：`MHSDC-GC-SAAS-staging`
> 📦 Linear：[MIN-136](https://linear.app/mindhikers/issue/MIN-136)（Shell / governance closure）→ 父 issue [MIN-94](https://linear.app/mindhikers/issue/MIN-94)

## 0. 项目角色与环境

| 环境 | 分支 | 角色 | 域名 | 本地目录 |
|------|------|------|------|----------|
| **SaaS（staging）** | `MHSDC-GC-SAAS-staging` | 预发阵地，最接近生产环境 | `golden-crucible-saas-staging.up.railway.app` | `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS` |
| SSE（研发主线） | `MHSDC-GC-SSE` | 所有新功能先落这里 | `golden-crucible-saas-sse.up.railway.app` | `/Users/luzhoua/MHSDC/GoldenCrucible-SSE` |
| production | `main` | SaaS 验收后合并 | `gc.mindhikers.com` | — |

**发布流**：`SSE`（研发）→ `SaaS staging`（预发验收）→ `main`（生产）

### 0.1 核心认知

1. **SaaS 不是 SSE 的子集**。SaaS 是独立的、经过生产级验收的预发阵地。
2. **SSE 是研发前线**，最新功能模块先在 SSE 开发验证，再摘樱桃到 SaaS。
3. **底座一致，功能集不同**：两边共享认证、构建、前端壳等基础架构，但 SSE 可能有更新的功能模块尚未进入 SaaS，SaaS 可能有验收中产生的修复尚未回灌 SSE。
4. **SaaS 验收过程中产生的底座修复，必须回灌 SSE**，确保研发前线在健全底座上继续开发。

### 0.2 2026-04-30 当前收口口径

1. **SaaS staging 已接收 SSE 壳层迁移**：关键 shell slice 已通过 cherry-pick 进入 `MHSDC-GC-SAAS-staging`，并已部署到 Railway staging。
2. **Railway snapshot 失败已修复**：`14a7a3e` 通过 `.railwayignore` 排除本地 agent/worktree 元数据。
3. **下一功能切片回到 SSE 起步**：shell/status polish 先在 `MHSDC-GC-SSE` 实现和验证，再摘樱桃到 SaaS staging。
4. **Roundtable 是模块能力，不是同步 skill**：当前 synced skill 集合是 `Writer`、`ThesisWriter`、`Researcher`、`FactChecker`、`Socrates`。
5. **SkillSync 状态仍缺 UI 呈现**：右下角状态指示与 SSOT source popover 是后续小修，不是当前治理收口。

## 1. 当前架构概览

SaaS 已完成 V1 Phase 1-2 实施，Phase 3 staging 冒烟部分完成（存在阻塞）。

| 模块 | 关键文件 | 说明 |
|------|----------|------|
| 两阶段对话引擎 | `server/crucible-orchestrator.ts` | `buildSocratesDecisionPrompt` → 工具执行 → `buildSocratesCompositionPrompt` |
| 论文生成 | `server/crucible-thesiswriter.ts` | 论文 API + artifact 持久化 |
| BYOK 密钥管理 | `server/crucible-byok.ts` | 密钥诊断 + 错误分类 |
| FactChecker 专家 | `server/crucible-factcheck.ts` | 事实核查路由 |
| 试用额度 | `server/crucible-trial.ts` | 平台用户限 2 次 |
| VIP 分层 | `server/auth/account-tier.ts` | 账户层级覆盖 |
| BYOK 配置 UX | `src/components/SaaSLLMConfigPage.tsx` | 引导式配置页面 |
| 历史面板 | `src/components/crucible/CrucibleHistorySheet.tsx` | 完整历史管理 |
| 运行时 Schema | `src/schemas/crucible-runtime.ts` | Zod 校验 |
| SSE 事件流 | `src/components/crucible/sse.ts` | 前端 SSE 客户端 |
| 前端主入口 | `src/SaaSApp.tsx` | SaaS-only 壳，不含旧 Delivery 模块 |
| 路由总入口 | `server/index.ts` | 含 thesis/trial/byok/factcheck/account-tier 全部路由 |

### 产品需求与设计文档

- PRD：`docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`
- 实施计划：`docs/plans/2026-04-12-001-*`（SaaS v1 实施计划）

## 2. Scope

- 路径：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
- 个人全局入口：`/Users/luzhoua/.codex/AGENTS.md`
- 上层项目族入口：`/Users/luzhoua/MHSDC/AGENTS.md`

这里不再重复全局治理总纲，只补 `SaaS` 自己的运行、验证与交付约束。

## 3. OldYang First

凡是工程与治理任务，默认先经 `OldYang`（全局路径 `~/.opencode/skills/OldYang/`）。

当前仓的职责是：

- 提供 `SaaS` 特有边界
- 指向当前 handoff、计划、规则与测试入口
- 避免把长篇治理正文继续堆回仓级入口

## 4. Read Order

进入当前仓后，默认按下面顺序读取：

1. 当前文件 `AGENTS.md`
2. `docs/dev_logs/HANDOFF.md`（当前状态与下一步）
3. `docs/04_progress/rules.md`（工程约束集）
4. 如需了解产品需求：`docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`
5. 如需了解 V1 实施计划：`docs/plans/2026-04-12-001-*`
6. 如任务涉及测试：`testing/README.md` → `testing/OPENCODE_INIT.md` → `testing/golden-crucible/README.md`

当前层足够时停止下钻，不为"更完整"而盲目扩读。

## 5. Local Red Lines

1. `SaaS` 是发布收口线，不是临时测试分支；不要把研发试验线、发布线、线上环境混成一层
2. 讨论线上问题时，先区分 `local / staging / production`；提到 `gc.mindhikers.com` 时，默认先按 `production` 理解
3. 历史项目文档继续遵守零损失原则：先编目、再映射、再迁移，不做无索引删除
4. SaaS 以自身为基准验证回灌内容；发现架构分叉时以 SaaS 版为准
5. 当用户明确要求"先拉齐 SaaS 再继续 SSE 开发"时，必须先完成 SSE → SaaS 内容同步、发布与线上核验，再回到 SSE 继续迭代
6. 文档链路可导航性是硬性验收标准：AGENTS.md → HANDOFF → rules.md → plans/ 必须全链路可访问

## 6. 底座同步（SaaS → SSE）

SaaS staging 每次验收收口（准备推 main 之前），必须做一次底座回灌到 SSE，确保研发前线的底座健全。

### 同步范围（底座层）

以下基础设施变更必须回灌 SSE：

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
2. 冲突太大时手动 diff 同步（对照 SaaS 与 SSE 的文件差异，逐文件搬运）
3. SSE 侧回灌前必须备份原版：`cp file.ts file.ts.sse-backup`

### 健康校验（SSE 侧同步后必做）

1. `npm run build` 通过
2. `npm run dev` 启动无报错
3. 至少一条冒烟测试通过

## 7. Testing And Browser

1. 页面查看、UI 验证、截图、交互检查、线上页面核验，默认优先 `agent-browser`
2. 用户说"协调opencode测试"时，默认进入 OpenCode 协同测试模式，只做环境 ready 与协议接管，不自动发起 request
3. 完成前验证至少覆盖：
   - 当前主页面或主入口一条
   - 当前主 API 或主链路一条
   - 必要的 handoff / 日志回写

## 8. References

| 文档 | 路径 |
|------|------|
| 个人全局入口 | `/Users/luzhoua/.codex/AGENTS.md` |
| 项目族入口 | `/Users/luzhoua/MHSDC/AGENTS.md` |
| 当前交接 | `docs/dev_logs/HANDOFF.md` |
| 工程规则 | `docs/04_progress/rules.md` |
| 开发进展 | `docs/04_progress/dev_progress.md` |
| 产品需求 | `docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md` |
| V1 实施计划 | `docs/plans/2026-04-12-001-feat-golden-crucible-saas-v1-implementation-plan.md` |
| SSE/SaaS 治理收口计划 | `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-30-001-gc-sse-saas-governance-closure-plan.md` |
| 治理一期执行板 | `docs/plans/2026-04-06_MHSDC_Governance_Phase1_Pilot_Execution_Board.md` |
| 测试入口 | `testing/README.md` |
