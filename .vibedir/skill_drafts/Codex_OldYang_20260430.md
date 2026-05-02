# Codex OldYang Skill Draft Snapshot - 2026-04-30

## Change

Added a default WIP/document/commit classification rule to OldYang.

## New Practice

- `WIP` means uncommitted workspace changes, not inherently a problem.
- Report WIP by logical unit, not by noisy file list.
- A bugfix closure may include code, types, required dependency changes, focused validation updates, `rules.md`, daily debug log, `HANDOFF.md`, and necessary `dev_progress.md`.
- Pure governance/planning docs (`AGENTS.md`, `docs/plans/*.md`, `docs/reviews/*.md`, README/testing initialization) stay in a separate governance commit.
- Local machine/private config (`.env*`, `.agent/config/*`, browser profiles, account state, token/cookie/provider config) is excluded by default unless explicitly requested.
- Ask user only for true exceptions: private config inclusion, mixed function/governance scope, resources or large generated assets.

## Files Updated

- `/Users/luzhoua/.codex/skills/OldYang/SKILL.md`
- `/Users/luzhoua/.codex/skills/OldYang/refs/development-principles.md`
