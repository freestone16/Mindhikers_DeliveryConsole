🕐 Last updated: 2026-04-14 09:35
🌿 Branch: MHSDC-GC-SSE

## 当前状态

SaaS → SSE 全面回灌治理计划已定稿（v3），待执行。

- Linear: [MIN-135](https://linear.app/mindhikers/issue/MIN-135/saas-sse-全面回灌治理底座同步与文档链路修复)
- 父 issue: MIN-94（黄金坩埚 SAAS 安全上线）
- 计划文件: `docs/plans/2026-04-14_GC_SSE_SaaS_Full_Backsync_Governance_Plan.md`

## 计划制定阶段已完成的工作

1. **并行审计**（4 个 explore agent）：
   - SSE 代码库结构、健康度、死代码
   - SaaS staging 代码库结构
   - 两边 diff 分析（58 文件，+7827 / -1091 行）
   - 测试 & CI/CD 就绪度
2. **诊断报告**：6 大治理问题、8 项治理动作
3. **计划 v1** → 老卢第一轮批注（4 处）→ **v2** → 老卢第二轮批注（3 处）→ **v3 定稿**
4. **Linear issue MIN-135 已创建**，所有占位符已替换

### 老卢两轮批注的完整处理记录

**第一轮（v1→v2）：**
1. §1.3 架构分叉 → 改为"以回灌为大致思路" ✅
2. §1.4 SSE 独有 → 明确"本次不动 + 后续提交到 SaaS" ✅
3. §1.5 治理差异 → 增加前提假设，强调文档链路可导航性 ✅
4. §3 验收收尾 → 新增 §3B 老卢验收清单 ✅

**第二轮（v2→v3）：**
1. §0 第 26 行：rules.md 纳入接手链路图 ✅（从 3 条变 4 条）
2. §2.4：OldYang 不需要复制到项目内 ✅（全局路径共享 SSOT）
3. §4：MIN-135 已创建并填入 ✅

## 待执行工作（计划 v3 的 Phase 0→3）

### Phase 0：SSE 环境清扫（前置条件）

| # | 动作 | 说明 |
|---|---|---|
| 0.1 | 暂存并提交当前所有删除 | `git add -A` 确认后提交 |
| 0.2 | 物理删除 `node_modules_bad/` | 释放 147MB |
| 0.3 | 删除死代码文件 | `server/llm.ts.orig`、`server/llm_backup.ts`、`.codex-tmp-*` |
| 0.4 | 确认 `.gitignore` 覆盖 | `node_modules_bad/`、`.codex-tmp-*`、`*.orig` |
| 0.5 | 验证 build 通过 | `npm run build:app` |
| 0.6 | 提交 | `refs MIN-135 clean SSE working tree dead code and artifacts` |

### Phase 1：SaaS 核心模块回灌

**1A 基础设施层（直接复制，无冲突）：**
- `src/schemas/crucible-runtime.ts`
- `src/components/crucible/sse.ts`
- `server/auth/account-tier.ts`
- `src/auth/AppAuthContext.ts`

**1B 业务功能层（直接复制，低冲突）：**
- `server/crucible-byok.ts`
- `server/crucible-factcheck.ts`
- `server/crucible-trial.ts`
- `server/crucible-thesiswriter.ts`
- `src/components/SaaSLLMConfigPage.tsx`

**1C 架构升级层（手动合并，高冲突）— 回灌覆盖前先备份 SSE 原版：**
- `server/crucible-orchestrator.ts`（单次→两阶段）
- `src/SaaSApp.tsx`（659 行差异）
- `src/components/ChatPanel.tsx`（322 行差异）
- `src/components/crucible/CrucibleWorkspaceView.tsx`（360 行差异）
- `src/components/crucible/storage.ts`（308 行差异）
- `src/components/crucible/types.ts`（124 行差异）
- `server/index.ts`（路由注册对齐）
- `src/components/Header.tsx`（319 行差异）

**1D 测试同步：**
- 复制 SaaS 新增测试
- skip 旧架构测试
- 更新 vitest.config.ts

**1E 路由对齐清单（必须逐一核对）：**
- `/api/crucible/thesis/generate`
- `/api/crucible/thesis/trial-status`
- `/api/crucible/byok/diagnostics`
- FactCheck expert route
- Account tier route
- `auth:migrate` 在 start script

### Phase 2：治理文件同步 + 文档链路修复

| # | 动作 |
|---|---|
| 2.1 | 复制 PRD 到 SSE |
| 2.2 | 复制实施计划到 SSE |
| 2.3 | 复制冒烟测试请求到 SSE |
| 2.4 | ~~复制 OldYang~~ → **不需要**（全局路径共享） |
| 2.5 | 同步 `package.json` start script |
| 2.6 | **重写 AGENTS.md** |
| 2.7 | **重写 HANDOFF**（根据回灌后实际状态） |
| 2.8 | 更新 rules.md |
| 2.9 | 更新 dev_progress.md |

### Phase 3：验证与收尾

**3A 老杨自验：** build + test + lint + 本地启动 + 冒烟 + 文档链路检查 + Railway 部署验证 + 提交

**3B 老卢验收清单：**
- V1-V6 本地验收（首页加载、登录、对话、论文 CTA、BYOK 配置、历史面板）
- V7-V8 云端验收（SSE 域名、health check）
- V9-V11 文档验收（AGENTS.md、HANDOFF、模块清单）

## 关键数据（供执行窗口参考）

- **SSE 分支**：`MHSDC-GC-SSE`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- **SaaS 分支**：`MHSDC-GC-SAAS-staging`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`（只读来源）
- **共同祖先**：`29a0414`
- **SaaS 独有**：26 个 commit（MIN-105/107/108/109/119/120/121）
- **SSE 独有**：14 个 commit（多主题保存、artifact 导出、对话恢复等）
- **源码差异**：58 个文件，+7827 / -1091 行
- **SSE TS 文件数**：129，**SaaS**：140，**SaaS 多出 14 个核心业务文件**

## SSE 独有代码（回灌后必须验证兼容性）

| Commit | 内容 |
|---|---|
| `3455d48` | multi-topic save and restore |
| `9f3ab61` | artifact export hook |
| `7ad4921` | conversation restore flow |
| `3c998dd` | split draft save semantics |
| `4e4b6b0` | lightweight history center |
| `b6d14c8` | SaaS shell + legacy type debt isolation |

## 执行约束

1. 每个 Phase 完成后提交一次：`refs MIN-135 <phase描述>`
2. Phase 0 完成前不动源码
3. Phase 1C 回灌覆盖前备份 SSE 原版
4. **不做任何 SaaS 方向的 push**，只做 SaaS → SSE 单向回灌
5. Phase 3B 老卢验收通过后才算完成

## 新窗口直接怎么做

1. **窗口目录**：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`（SSE 分支）
2. **先读 3 个文件**：
   - `docs/plans/2026-04-14_GC_SSE_SaaS_Full_Backsync_Governance_Plan.md`（v3 定稿）
   - `AGENTS.md`（仓级入口）
   - `docs/dev_logs/HANDOFF.md`（本文件）
3. **按 Phase 0 → 1A → 1B → 1C → 1D → 1E → 2 → 3A → 3B 顺序执行**
4. SaaS 目录仅作只读来源，`cp` 文件到 SSE
5. 最终提交：`refs MIN-135 complete SaaS backsync to SSE`
