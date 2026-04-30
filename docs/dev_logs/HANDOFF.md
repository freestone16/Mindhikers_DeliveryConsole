Last updated: 2026-04-30 17:30 CST
Branch: `MHSDC-GC-SSE`
Conductor: 老杨（OldYang） | Owner: 老卢（Zhou Lu）

---

# GoldenCrucible-SSE Handoff

## 当前一句话

SSE 重新回到 GoldenCrucible 的研发前线：SaaS staging 已接收并部署 SSE 壳层迁移，当前窗口正在做治理 Phase 0-3 收口；治理完成前不启动新的 UI/status 功能修复。

## 本轮治理结论

### 已确认事实

1. SSE 当前分支是 `MHSDC-GC-SSE`，对齐 `origin/MHSDC-GC-SSE`。
2. SSE 当前仅有未跟踪计划文档：
   - `docs/plans/2026-04-30-001-gc-sse-saas-governance-closure-plan.md`
3. SaaS 当前分支是 `MHSDC-GC-SAAS-staging`，对齐 `origin/MHSDC-GC-SAAS-staging`。
4. SaaS staging 最新相关提交：
   - `14a7a3e refs MIN-136 fix: exclude local agent metadata from Railway snapshot`
   - `e610631 refs MIN-136 fix: allow placeholder database URL during shell validation`
   - `e17f5d2 refs MIN-136 feat: checkpoint SaaS shell slice integration`
5. 共享 stash 中仍有 GC 相关备份：
   - `stash@{0}: On MHSDC-GC-SSE: codex pre new module cleanup 2026-04-30`
   - `stash@{1}: On MHSDC-GC-SAAS-staging: codex pre shell staging apply cleanup 2026-04-29`
   - 本轮不查看、不应用、不删除。

### 与旧 handoff 的差异

旧 handoff 仍写着“下一步准备 SaaS staging 切片移植”。这个口径已经过期。

当前真实状态是：

1. SaaS staging 已经承接 shell migration。
2. Roundtable 入口已在 staging 可见。
3. Railway snapshot 失败已通过 `.railwayignore` 修复。
4. 后续小修应回到 SSE 起步，再摘樱桃到 SaaS staging。

## 当前边界

本轮只做治理 Phase 0-3：

1. 对齐 SSE / SaaS 治理入口文档。
2. 清理 `rules.md` 的当前权威口径，降低重复编号误导。
3. 更新 testing board / latest.json，让测试状态反映 2026-04-29 至 2026-04-30 的事实。
4. 写清楚下一窗口 shell/status polish 的起点和边界。

本轮不做：

1. 左侧模块 glyph / label 对齐。
2. 右下角 SkillSync 状态灯。
3. SkillSync source popover。
4. Roundtable backend API 完成。
5. 整枝 merge SSE 到 SaaS staging。
6. 删除 stash、临时 worktree 或非 GC 分支。

## SkillSync 与 Roundtable 口径

当前 `server/skill-sync.ts` 的同步 skill 集合应按以下口径记录：

```text
Writer
ThesisWriter
Researcher
FactChecker
Socrates
```

Roundtable 当前是模块 / runtime capability，不是 synced standalone skill。除非后续明确把 Roundtable 加进 SkillSync，否则文档和 UI 都不能把它描述为同步来的独立 skill。

## 下一步工作

治理收口完成后，下一窗口可启动 shell/status polish 小切片。

推荐分支：

```text
codex/gc-shell-status-polish
```

推荐任务：

1. 左侧模块 glyph / label 对齐：
   - `坩 / 炼制`
   - `辩 / 圆桌`
2. 右下角 SkillSync 状态指示：
   - synced: green
   - fallback / local-only: warning
   - failed: red
3. 单击状态指示后展示：
   - status
   - synced count
   - SSOT source root
   - target root
   - synced skill names

## 验证要求

治理 Phase 0-3 结束前至少做：

1. `git status --short --branch` 核对两条 worktree。
2. 核对修改文件只包含治理文档、testing 状态与本计划文档。
3. 不运行产品 build 作为硬门槛，因为本轮没有产品代码变更。

shell/status polish 下一窗口再做：

1. `npm run typecheck:saas`
2. `npm run build`
3. agent-browser 优先验证：
   - `/`
   - `/m/crucible`
   - `/m/roundtable`
   - `/llm-config`

## 接管提示

下个窗口如果继续小修，先读：

1. `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/AGENTS.md`
2. `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/dev_logs/HANDOFF.md`
3. `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/04_progress/rules.md`
4. `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-30-001-gc-sse-saas-governance-closure-plan.md`
5. `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/testing/golden-crucible/status/BOARD.md`

记住一句话：

> 先把治理事实闭环，再从 SSE 开小修切片；不要把 Roundtable 说成 synced skill，也不要整枝 merge SSE 到 SaaS。
