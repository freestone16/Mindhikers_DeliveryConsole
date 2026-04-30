# GoldenCrucible 测试状态板

## Current

- latest_request: `GC-SAAS-STAGING-2026-04-30-roundtable-backend-first-pass`
- latest_status: `passed`
- latest_claim: `none`
- latest_report: `docs/dev_logs/2026-04-30.md`
- updated_at: `2026-04-30T22:19:00+08:00`

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
| SkillSync lower-right indicator | SaaS staging | done | `SkillSync fallback 5/5` visible |
| SkillSync SSOT source popover | SaaS staging | done | Source, target, expected skills visible |
| Roundtable backend API first pass | SaaS local | done | SSE `52f356f` cherry-pick verified locally |
| Roundtable LLM engine completion | SSE/SaaS | not done | Separate backend completion work |
| Left module glyph alignment | SaaS staging | done | Module glyph box stabilized |

## 2026-04-30 Roundtable Backend First Pass

| Item | Environment | Status | Evidence / note |
| --- | --- | --- | --- |
| `/api/roundtable/turn/stream` | SaaS local | done | Returned selection, turn chunks, synthesis, awaiting |
| `/api/roundtable/director` `止` | SaaS local | done | Returned 1 Spike |
| `/m/roundtable` start session | SaaS local | done | 3 speakers, 3 turns, first-round synthesis visible |
| Browser errors | SaaS local | done | agent-browser errors empty |

## Historical Note

`TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke` remains a historical request, but it is no longer the latest board state after the 2026-04-30 shell migration staging smoke.
