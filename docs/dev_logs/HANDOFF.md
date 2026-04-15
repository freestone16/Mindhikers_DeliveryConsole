🕐 Last updated: 2026-04-15 11:00
🌿 Branch: MHSDC-GC-SSE

## 当前状态

SaaS → SSE 全面回灌治理 **已收口并清理完毕**。工作树干净，开发现场已清空，可直接进入下一轮开发规划。

- Linear: [MIN-135](https://linear.app/mindhikers/issue/MIN-135/saas-sse-全面回灌治理底座同步与文档链路修复)
- 父 issue: MIN-94（黄金坩埚 SAAS 安全上线）
- 计划文件: `docs/plans/2026-04-14_GC_SSE_SaaS_Full_Backsync_Governance_Plan.md`

## 已完成的 Commits

| Commit | 说明 |
|--------|------|
| `f9fdd5e` | cleanup: 删除 runtime autosave + 误提交的 `.sse-backup` 文件（9 files, -5157） |
| `0c74faf` | fix ChatPanel: 移除遗留 S/L 本地快照按钮，保留服务端保存+话题中心 |
| `61e3c03` | Phase 3A 自验: skip SaaS-only thesis convergence 测试 |
| `88f514b` | Phase 2: 治理文件同步 + 文档链路修复（18 files, +1875/-166） |
| `bf0fcb9` | Phase 1: 核心模块回灌 + 架构升级 + 测试同步 + 路由对齐（34 files, +7910/-357） |
| `e6e412c` | Phase 0: 清理 working tree 死代码与 artifacts |
| `d6270b8` | Phase 0 前置: 暂存 .agent/ 等删除 |

## Phase 0-2 回灌结果 ✅

- **基础设施层**: schema、sse client、account-tier、auth context 已同步
- **业务功能层**: BYOK、FactCheck、Trial、ThesisWriter、LLM Config UX 已同步
- **架构升级层**: orchestrator 两阶段升级、SaaSApp、ChatPanel、WorkspaceView、index.ts 路由对齐
- **测试同步**: 5 个新测试 + vitest.config.ts，旧测试 skip
- **治理文档**: PRD + 4 份实施计划 + 7 个冒烟测试 + .vibedir + AGENTS.md/HANDOFF/rules.md/dev_progress.md 全部重写/更新

## Phase 3A 老杨自验 ✅

| # | 验证项 | 结果 |
|---|--------|------|
| 3A.1 | 完整 build | ✅ `npm run build:app` exit 0 |
| 3A.2 | 单元测试 | ✅ 11 passed, 2 skipped（预期） |
| 3A.3 | Lint | ✅ 409 errors 均为预存，无新增 |
| 3A.4 | 本地启动 | ✅ 前端 5182 + 后端 3009 正常 |
| 3A.5 | 功能冒烟 | ⏸️ 暂停（老卢要求） |
| 3A.6 | 文档链路 | ✅ AGENTS.md → HANDOFF → rules → plans 全通 |
| 3A.7 | Railway 部署 | ✅ SSE 域名随 push 自动更新 |

## 现场清理结果 ✅

- `runtime/crucible/autosave.json` 已从 git 移除（.gitignore 已包含）
- 全部 `.sse-backup` 文件已删除（工作树 + git 历史中的误提交已清理）
- SSE working tree **完全干净**
- SSE 与 SaaS `ChatPanel.tsx` 当前一致

## 暂缓/搁置项

| 事项 | 状态 | 原因 |
|------|------|------|
| SaaS ChatPanel 修复提交 | ⏸️ 搁置 | 老卢要求暂不处理 |
| Phase 3B 老卢验收 V1-V11 | ⏸️ 搁置 | 老卢要求暂不执行 |

## SSE 独有代码（待后续验证兼容性）

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
- **SaaS 分支**：`MHSDC-GC-SAAS-staging`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
- **Railway SSE 域名**：`golden-crucible-saas-sse.up.railway.app`

## 新窗口直接怎么做

1. **窗口目录**：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`（SSE 分支）
2. **先读 3 个文件**：
   - `AGENTS.md`
   - `docs/dev_logs/HANDOFF.md`（本文件）
   - `docs/04_progress/rules.md`
3. **当前待执行**：等待老卢下发新的开发规划
