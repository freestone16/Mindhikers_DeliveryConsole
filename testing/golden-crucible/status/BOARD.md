# GoldenCrucible 测试状态板

## Current

- latest_request: `GC-SAAS-STAGING-2026-04-30-shell-migration-smoke`
- latest_status: `passed-with-known-gaps`
- latest_claim: `none`
- latest_report: `docs/dev_logs/2026-04-30.md`
- updated_at: `2026-04-30T17:30:00+08:00`

## 2026-04-30 Staging Smoke Matrix

| Item | Environment | Status | Evidence / note |
| --- | --- | --- | --- |
| SaaS staging `/` smoke | Railway staging | done | Auth page and post-login shell visible |
| SaaS staging `/m/crucible` smoke | Railway staging | done | New shell visible |
| SaaS staging `/m/roundtable` smoke | Railway staging | done | Roundtable module visible and enterable |
| SaaS staging `/llm-config` smoke | Railway staging | done | BYOK config page visible |
| Hooks error check | Railway staging | done | No Hooks error in last smoke |
| ShellErrorBoundary check | Railway staging | done | No ShellErrorBoundary in last smoke |
| Unexpected localhost direct network check | Railway staging | done | Network stayed on staging origin |
| Railway snapshot fix | Railway staging | done | `14a7a3e` excludes local agent metadata |
| SkillSync lower-right indicator | SSE then SaaS | not done | Future shell/status polish |
| SkillSync SSOT source popover | SSE then SaaS | not done | Future shell/status polish |
| Roundtable backend API completion | SSE/SaaS | not done | Separate backend completion work |
| Left module glyph alignment | SSE then SaaS | not done | Future shell/status polish |

## Historical Note

`TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke` remains a historical request, but it is no longer the latest board state after the 2026-04-30 shell migration staging smoke.
