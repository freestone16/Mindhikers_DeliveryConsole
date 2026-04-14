🕐 Last updated: 2026-04-14 22:30
🌿 Branch: MHSDC-GC-SSE

## 当前状态

SaaS → SSE 全面回灌治理 **Phase 0-2 已完成**，Phase 3A（老杨自验）待执行。

- Linear: [MIN-135](https://linear.app/mindhikers/issue/MIN-135/saas-sse-全面回灌治理底座同步与文档链路修复)
- 父 issue: MIN-94（黄金坩埚 SAAS 安全上线）
- 计划文件: `docs/plans/2026-04-14_GC_SSE_SaaS_Full_Backsync_Governance_Plan.md`

## 已完成的 Commits

| Commit | Phase | 说明 |
|--------|-------|------|
| `d6270b8` | Phase 0 前置 | 暂存 .agent/ 等删除 |
| `e6e412c` | Phase 0 | 清理 working tree 死代码与 artifacts |
| `bf0fcb9` | Phase 1 | 核心模块回灌 + 架构升级 + 测试同步 + 路由对齐（34 files, +7910/-357） |
| 待提交 | Phase 2 | 治理文件同步 + 文档链路修复 |

## Phase 0：SSE 环境清扫 ✅

- 提交 8,450 文件删除（.agent/、旧 worktrees）
- 物理删除 `node_modules_bad/`（释放 147MB）
- 删除死代码：`server/llm.ts.orig`、`server/llm_backup.ts`、`.codex-tmp-*`
- `.gitignore` 补充 `.codex-tmp-*`、`*.orig`
- Build 验证通过

## Phase 1：SaaS 核心模块回灌 ✅

### 1A 基础设施层（4 文件，直接复制）
- `src/schemas/crucible-runtime.ts`
- `src/components/crucible/sse.ts`
- `server/auth/account-tier.ts`
- `src/auth/AppAuthContext.ts`

### 1B 业务功能层（5 文件，直接复制）
- `server/crucible-byok.ts`、`server/crucible-factcheck.ts`、`server/crucible-trial.ts`、`server/crucible-thesiswriter.ts`
- `src/components/SaaSLLMConfigPage.tsx`

### 1C 架构升级层（8 文件，回灌覆盖，已备份 .sse-backup）
- `server/crucible-orchestrator.ts`（单次→两阶段架构）
- `src/SaaSApp.tsx`、`src/components/ChatPanel.tsx`、`src/components/crucible/CrucibleWorkspaceView.tsx`
- `src/components/crucible/storage.ts`、`src/components/crucible/types.ts`
- `server/index.ts`（全路由对齐）、`src/components/Header.tsx`
- 额外同步：`CrucibleHistorySheet.tsx`、`UserAvatarMenu.tsx`、`server/auth/account-router.ts`

### 1D 测试同步
- 复制 5 个 SaaS 测试文件（thesis、byok、factcheck、runtime、orchestrator）
- 旧架构测试 `crucible-prompt.test.ts` 添加 `describe.skip`
- `vitest.config.ts` 替换为 SaaS 版本

### 1E 路由对齐 ✅
- `/api/crucible/thesis/generate`、`/api/crucible/thesis/trial-status`
- `/api/crucible/byok/diagnostics`、FactCheck、account-tier
- `package.json` start script 已含 `auth:migrate`

- **Build 验证**：`npm run build:app` ✅（JS bundle: 560.95 KB）

## Phase 2：治理文件同步 + 文档链路修复 ✅（待提交）

| # | 动作 | 状态 |
|---|------|------|
| 2.1 | 复制 PRD `2026-04-11_GoldenCrucible_SaaS_PRD.md` | ✅ |
| 2.2 | 复制实施计划 001/002/003 + BYOK_Config_UX | ✅ |
| 2.3 | 复制冒烟测试 TREQ-2026-04-12-*（7 个） | ✅ |
| 2.4 | 复制 `.vibedir/` | ✅ |
| 2.5 | package.json start script（Phase 1 已完成） | ✅ |
| 2.6 | **重写 AGENTS.md**（架构概览 + 模块索引 + PRD 链接） | ✅ |
| 2.7 | **重写 HANDOFF.md**（本文件，回灌后实际状态） | ✅ |
| 2.8 | **更新 rules.md**（补充回灌规则） | ✅ |
| 2.9 | **更新 dev_progress.md**（记录回灌里程碑） | ✅ |

## Phase 3A：老杨自验（待执行）

| # | 动作 | 验证标准 |
|---|------|----------|
| 3A.1 | 完整 build | `npm run build:app` exit 0 |
| 3A.2 | 单元测试 | `npm run test:run` 通过 |
| 3A.3 | Lint | `npm run lint` 无新增 error |
| 3A.4 | 本地启动验证 | `npm run dev` 正常启动 |
| 3A.5 | 功能冒烟 | 登录 → 对话 → 论文 CTA → BYOK 配置 → 历史面板 |
| 3A.6 | 文档链路检查 | AGENTS.md → HANDOFF → rules.md → plans/ 全链路可导航 |
| 3A.7 | Railway 部署验证 | SSE 域名部署成功 |
| 3A.8 | 提交 | `refs MIN-135 complete SaaS backsync to SSE` |

## Phase 3B：老卢验收清单（待执行）

**本地**（V1-V6）：首页加载、登录、对话、论文 CTA、BYOK 配置、历史面板
**云端**（V7-V8）：SSE 域名访问、health check
**文档**（V9-V11）：AGENTS.md、HANDOFF、模块清单

## SSE 独有代码（回灌后需验证兼容性）

| Commit | 内容 |
|--------|------|
| `3455d48` | multi-topic save and restore |
| `9f3ab61` | artifact export hook |
| `7ad4921` | conversation restore flow |
| `3c998dd` | split draft save semantics |
| `4e4b6b0` | lightweight history center |
| `b6d14c8` | SaaS shell + legacy type debt isolation |

## 关键数据

- **SSE 分支**：`MHSDC-GC-SSE`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- **SaaS 分支**：`MHSDC-GC-SAAS-staging`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`（只读来源）
- **SSE backup 文件**：`*.sse-backup`（8 个，未提交到 git，仅工作树中保留）
- **Railway SSE 域名**：`golden-crucible-saas-sse.up.railway.app`
- **Railway SaaS 域名**：`golden-crucible-saas-staging.up.railway.app`

## 执行约束

1. 每个 Phase 完成后提交一次：`refs MIN-135 <phase描述>`
2. 不做任何 SaaS 方向的 push，只做 SSE → SaaS 单向推进
3. Phase 3B 老卢验收通过后才算完成

## 新窗口直接怎么做

1. **窗口目录**：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`（SSE 分支）
2. **先读 3 个文件**：
   - `AGENTS.md`
   - `docs/dev_logs/HANDOFF.md`（本文件）
   - `docs/04_progress/rules.md`
3. **当前待执行**：Phase 3A（老杨自验）→ Phase 3B（老卢验收）
4. SaaS 目录仅作只读来源
