# GoldenCrucible SSE / SaaS Governance Closure Plan

> Date: 2026-04-30
> Scope: `/Users/luzhoua/MHSDC/GoldenCrucible-SSE` and `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
> Branches: `MHSDC-GC-SSE`, `MHSDC-GC-SAAS-staging`, `main`
> Status: plan only; do not implement in this window

## 1. Plain Summary

SSE and SaaS staging are both technically usable, but the governance layer is not fully closed. The code can build, and SaaS staging has accepted the recent shell migration, but the documents, testing board, SkillSync visibility, and SSE/SaaS handoff rules are not yet aligned enough to safely start the next module without ambiguity.

This plan closes that gap in two steps:

1. First, investigate both environments and update governance records without changing product behavior.
2. Then, in a later slice, make small shell/status UI fixes in SSE and cherry-pick them into SaaS staging for validation.

## 2. Verified Current Facts

These facts were checked locally on 2026-04-30 before writing this plan.

### 2.1 SaaS Staging

- Path: `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
- Branch: `MHSDC-GC-SAAS-staging`
- Git status: clean and aligned with `origin/MHSDC-GC-SAAS-staging`
- Latest relevant commits:
  - `14a7a3e refs MIN-136 fix: exclude local agent metadata from Railway snapshot`
  - `e610631 refs MIN-136 fix: allow placeholder database URL during shell validation`
  - `e17f5d2 refs MIN-136 feat: checkpoint SaaS shell slice integration`
- Staging domain: `https://golden-crucible-saas-staging.up.railway.app`

### 2.2 SSE

- Path: `/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- Branch: `MHSDC-GC-SSE`
- Git status: clean and aligned with `origin/MHSDC-GC-SSE`
- Latest relevant commits:
  - `2fe051f refs MIN-136 docs: 记录 SSE 收口与 SaaS 切片迁移方案`
  - `20edf34 refs MIN-136 feat(shell): 收口 SSE 三栏壳层与 artifact 工作流`
  - `06ece69 docs: rewrite README with accurate module identity and current status`
- SSE domain: `https://golden-crucible-saas-sse.up.railway.app`
- Existing saved stash:
  - `stash@{0}: On MHSDC-GC-SSE: codex pre new module cleanup 2026-04-30`

### 2.3 Temporary Branch Cleanup

The following local temporary branches were deleted after explicit approval:

- `codex/saas-shell-staging-apply`
- `codex/saas-shell-slice-integration`

Do not recreate or checkout these branches.

## 3. Problem Statement

The current risk is not that SSE or SaaS staging cannot run. The risk is that the governance record no longer matches the real state:

- SSE documents still describe SaaS staging migration as a future step in some places.
- SaaS staging has accepted the shell migration, but SSE governance has not been updated to reflect the new baseline.
- `rules.md` has exceeded its intended size and contains numbering drift and duplicated rule numbers.
- Testing status files do not yet reflect the latest 2026-04-29 to 2026-04-30 shell migration, Railway snapshot fix, and staging browser verification.
- SkillSync exists in backend/server code but the new SaaS shell does not expose the expected lower-right sync indicator.
- Roundtable is visible as a module, but it must not be misdescribed as a synced standalone skill.

## 4. Non-Goals

This governance closure must not accidentally turn into feature development.

Do not do the following in Phase 0-3:

- Do not implement left module alignment fixes.
- Do not implement the SkillSync lower-right indicator.
- Do not implement Roundtable backend completion.
- Do not merge the whole SSE branch into SaaS staging.
- Do not delete Director, Marketing, Music, Shorts, Distribution, or other non-GC worktree branches.
- Do not drop any stash.
- Do not push or commit without explicit approval.

## 5. Branch And Environment Policy

GoldenCrucible uses three backbone branches:

| Branch | Role | Domain | Rule |
| --- | --- | --- | --- |
| `MHSDC-GC-SSE` | Research and development frontline | `golden-crucible-saas-sse.up.railway.app` | New modules and shell improvements start here |
| `MHSDC-GC-SAAS-staging` | Pre-production acceptance | `golden-crucible-saas-staging.up.railway.app` | Accepts verified SSE slices and release hotfixes |
| `main` | Production | `gc.mindhikers.com` | Receives only staging-validated releases |

Normal flow:

```text
SSE -> SaaS staging -> production
```

Exception:

```text
If SaaS staging has a release-blocking issue, a small hotfix may be made in SaaS staging first.
That fix must then be back-synced into SSE.
```

## 6. SkillSync And Skill Boundary

SkillSync currently syncs this set:

```text
Writer
ThesisWriter
Researcher
FactChecker
Socrates
```

Current actual GoldenCrucible usage:

| Name | Role | Current status |
| --- | --- | --- |
| `Socrates` | Main business brain for Crucible dialogue | Active core |
| `Researcher` | External research tool requested by Socrates | Tool path exists |
| `FactChecker` | Fact-checking tool requested by Socrates | Executor skeleton exists; real provider is incomplete |
| `ThesisWriter` | Thesis generation | Active for thesis path |
| `Writer` | Synced writing skill | Available, not the primary shell path |

Important distinction:

`Roundtable` is currently a module/runtime capability, not a synced standalone skill in `server/skill-sync.ts`.

## 7. Phase 0 - Investigation Only

Goal: create a reliable map of the real environment before changing governance files.

### 7.1 Commands To Run

Run in both repositories:

```bash
git status --short --branch
git log --oneline -10
git stash list --max-count=10
git worktree list --porcelain
```

Run in SSE:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,260p' docs/dev_logs/HANDOFF.md
sed -n '1,260p' docs/04_progress/dev_progress.md
sed -n '1,280p' docs/04_progress/rules.md
find testing -maxdepth 3 -type f | sort
```

Run in SaaS:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,260p' docs/dev_logs/HANDOFF.md
sed -n '1,260p' docs/04_progress/dev_progress.md
sed -n '1,280p' docs/04_progress/rules.md
find testing -maxdepth 3 -type f | sort
```

Compare the two branches:

```bash
git diff --stat MHSDC-GC-SAAS-staging..MHSDC-GC-SSE
git diff --name-status MHSDC-GC-SAAS-staging..MHSDC-GC-SSE
```

If run from a worktree where both branches are available, use explicit branch names. If not, fetch first only with user approval if network access is needed.

### 7.2 Investigation Output

Write a short inventory in the implementation notes or final handoff:

- Current branch and remote alignment for SSE and SaaS.
- Current stashes and whether they are related to GC or other modules.
- Governance files that are stale.
- Testing files that need update.
- Diff categories:
  - foundation/shell
  - business feature
  - docs/governance
  - runtime/testing artifacts

## 8. Phase 1 - Governance Document Alignment

Goal: make the project entry points tell the truth.

### 8.1 SSE Updates

Update:

- `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/AGENTS.md`
- `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/dev_logs/HANDOFF.md`
- `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/04_progress/dev_progress.md`

Required content:

- SSE is again the development frontline after shell migration was accepted into SaaS staging.
- SaaS staging has accepted the shell migration via cherry-picked commits.
- New shell/status polish should start in SSE.
- Phase 0-3 governance closure must finish before small UI/status fixes.
- Roundtable is visible as a module, but backend completion is still separate work.

### 8.2 SaaS Updates

Update:

- `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/AGENTS.md`
- `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/dev_logs/HANDOFF.md`
- `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/04_progress/dev_progress.md`

Required content:

- SaaS staging has accepted shell migration.
- Railway snapshot failure was fixed by excluding local agent/worktree metadata.
- Staging deployment and browser smoke were completed.
- Next incoming slice should come from SSE after governance closure.

## 9. Phase 2 - Rules Cleanup

Goal: make `rules.md` usable again without losing useful knowledge.

Problems to fix:

- Rule count has drifted beyond the stated 50-80 target.
- Numbering has duplicates and gaps.
- Some rules mix old DeliveryConsole concerns with current GC SaaS/SSE concerns.
- Some detailed cases should move into lessons instead of staying in the main rules file.

Recommended approach:

1. Do not rewrite the whole file in one pass.
2. Preserve high-signal rules about:
   - SkillSync boundary
   - Socrates ownership of business decisions
   - SSE/SaaS branch separation
   - Railway domain separation
   - browser and network verification
   - environment and port hygiene
3. Move long historical cases into `docs/04_progress/lessons/` only if the directory already exists or the user approves creating it.
4. Add or keep explicit rules for:
   - SkillSync status must be visible in UI.
   - UI must show the SSOT source for synced skills.
   - Roundtable must not be described as a synced standalone skill unless it is added to SkillSync.
   - Small shell/status fixes start in SSE and are cherry-picked to SaaS staging.

## 10. Phase 3 - Testing Board Alignment

Goal: make testing records reflect current acceptance status.

Update in both lines as appropriate:

- `testing/golden-crucible/status/BOARD.md`
- `testing/golden-crucible/status/latest.json`

Minimum board entries:

- SSE `/m/crucible` smoke
- SSE `/m/roundtable` smoke
- SSE `/llm-config` smoke
- SaaS staging `/` smoke
- SaaS staging `/m/crucible` smoke
- SaaS staging `/m/roundtable` smoke
- SaaS staging `/llm-config` smoke
- Hooks error check
- ShellErrorBoundary check
- unexpected localhost direct network check
- SkillSync lower-right indicator check
- SkillSync SSOT source popover check
- Roundtable backend API completion check

Known current status:

| Item | Status |
| --- | --- |
| SaaS staging shell visible | done |
| SaaS staging Roundtable module visible | done |
| SaaS staging Railway snapshot fix | done |
| Hooks error / ShellErrorBoundary staging check | done in last smoke |
| Unexpected localhost direct network check | done in last smoke |
| SkillSync lower-right indicator | not done |
| SkillSync SSOT source popover | not done |
| Roundtable backend full API | not done |
| Left module glyph alignment | not done |

## 11. Phase 4 - Later Shell/Status Polish Slice

This phase must happen after governance closure.

Recommended branch:

```text
codex/gc-shell-status-polish
```

Implement in SSE first:

1. Align left module glyphs and labels:
   - `坩 / 炼制`
   - `辩 / 圆桌`
2. Add lower-right SkillSync status indicator:
   - green for synced
   - warning for fallback/local-only
   - red for failed
3. On click, show:
   - status
   - count
   - SSOT source root
   - target root
   - synced skill names
4. Preserve current shell layout and avoid broad UI redesign.

Likely files:

- `src/shell/primitives/ModuleTab.tsx`
- `src/shell/primitives/ModuleTab.module.css`
- `src/shell/ShellLayout.tsx`
- `src/shell/ShellLayout.module.css`
- `src/components/StatusFooter.tsx` or a new smaller shell status component
- `server/skill-sync.ts`

## 12. Phase 5 - SSE Verification

Run:

```bash
npm run typecheck:saas
npm run build
```

Browser verification must use agent-browser first:

- `/`
- `/m/crucible`
- `/m/roundtable`
- `/llm-config`

Acceptance:

- Left module glyph and label alignment looks stable.
- Lower-right SkillSync indicator is visible.
- Clicking the indicator shows SSOT source and synced skill names.
- No Hooks error.
- No ShellErrorBoundary.
- No unexpected direct localhost calls except expected same-origin local dev proxy during local validation.

## 13. Phase 6 - Cherry-Pick To SaaS Staging

After SSE verification:

1. Switch to SaaS staging worktree.
2. Create a receiving branch from `MHSDC-GC-SAAS-staging`.
3. Cherry-pick only the verified polish commit.
4. Do not merge the full SSE branch.
5. Run:

```bash
npm run typecheck:saas
npm run build
```

6. Deploy to SaaS staging.
7. Validate with agent-browser.

Recommended receiving branch:

```text
codex/saas-shell-status-polish-apply
```

## 14. Phase 7 - SaaS Staging Verification

Staging domain:

```text
https://golden-crucible-saas-staging.up.railway.app
```

Verify:

- `/`
- `/m/crucible`
- `/m/roundtable`
- `/llm-config`

Network check:

- No unexpected localhost direct calls.
- API/socket calls should target the staging origin.

UI check:

- Module glyph alignment is correct.
- SkillSync lower-right indicator is visible.
- Click popover shows SSOT source and synced skills.

## 15. Phase 8 - Final Handoff And Commit Policy

After Phase 0-3:

Write a handoff paragraph for the next SSE implementation window. It must include:

- Updated document paths.
- Exact branch.
- What was changed.
- What remains for the shell/status polish slice.
- Verification performed.
- Whether anything was committed or only left as working tree changes.

Commit policy:

- Governance closure commit message:

```text
refs MIN-136 docs: close GC SSE SaaS governance loop
```

- Shell/status polish commit message:

```text
refs MIN-136 fix: polish shell module and SkillSync status
```

Do not push without explicit user confirmation.

## 16. Go / No-Go Criteria

### Go To Phase 4

Phase 4 may start only when:

- SSE and SaaS governance documents no longer contradict each other.
- Testing board reflects the current known statuses.
- `rules.md` no longer misleads future agents about current branch flow.
- Both worktrees are clean or intentionally staged for commit.

### No-Go

Do not start shell/status polish if:

- SSE and SaaS disagree about which line owns new development.
- testing status still claims old results as current without dates.
- SkillSync source/status is still undocumented.
- There is unreviewed dirty state outside the intended files.

## 17. Handoff Text For Next Window

Use this after Phase 0-3 is complete:

```text
老杨，继续 GoldenCrucible SSE 小修切片。治理 Phase 0-3 已完成，请先读取：

1. /Users/luzhoua/MHSDC/GoldenCrucible-SSE/AGENTS.md
2. /Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/dev_logs/HANDOFF.md
3. /Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/04_progress/rules.md
4. /Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-30-001-gc-sse-saas-governance-closure-plan.md
5. /Users/luzhoua/MHSDC/GoldenCrucible-SSE/testing/golden-crucible/status/BOARD.md

任务：在 SSE 新建小修分支，实现 shell/status polish：
- 左侧模块 glyph/label 对齐：坩/炼制、辩/圆桌
- 右下角 SkillSync 绿灯
- 单击展示 SSOT source root、target root、同步 skill 名称

边界：
- Roundtable 不是同步来的独立 skill，不能误写。
- 当前同步 skill 集合是 Writer、ThesisWriter、Researcher、FactChecker、Socrates。
- 先在 SSE 验证 typecheck/build/agent-browser，再回 SaaS staging 摘樱桃。
- 不整枝 merge SSE。
```
