---
title: "Director Design Target PRD"
type: prd
status: active
date: 2026-05-01
owner: OldYang
related:
  - ../../design.md
  - ../../design.zh.md
  - docs/plans/2026-04-17_director-ui-revamp-plan.md
  - docs/plans/2026-04-17-001-refactor-director-ui-implementation-plan.md
  - docs/plans/2026-04-19-003-feat-context-drawer-plan.md
---

# Director Design Target PRD

## Overview

`design.md` and `design.zh.md` are now the target source of truth for Director UI and interaction design. This PRD turns that design target into product requirements, scope boundaries, and acceptance criteria for the next implementation phase.

The core judgment is:

> Do not fully Claude-Code-ify Director. Keep the warmth of a cinematic production workstation, while absorbing Claude Code's restraint, state transparency, command-first flow, and auditability.

This means Director should remain a warm creative operations console, not a generic terminal or a marketing-style hero page. The upgrade should make the UI more useful, traceable, reusable, and agent-native.

## Problem Frame

Director already has a shared shell, right drawer, phase panels, and warm paper visual language. But the system still has drift:

- Some design choices live only in CSS/components instead of a reusable design source of truth.
- Runtime/Handoff still behave more like side panels than first-class action/status surfaces.
- Key workflow actions do not yet share a clear command vocabulary.
- Some async states are visible locally but not summarized in a durable runtime or audit context.
- Existing April UI plans still refer to older demo/live constraints and do not yet point to the May 1 design target.

## Goals

1. Establish `design.md` / `design.zh.md` as the UI and interaction target for Director.
2. Preserve Director's cinematic production warmth while reducing visual noise.
3. Make async, agent-driven, and state-changing actions visible and traceable.
4. Convert the right drawer into a first-class context surface: chat, runtime, artifacts, handoff.
5. Create a reusable standard for other Delivery Console modules.

## Non-Goals

- Do not introduce a new backend Director session model in this phase.
- Do not rewrite all Phase 1-4 APIs or SSE contracts.
- Do not fully rebuild Shorts, Marketing, Music, or Thumbnail business pages.
- Do not turn Director into a cold terminal UI.
- Do not stuff product requirements into `AGENTS.md` or `rules.md`.

## Requirements

### R1 - Design Source Of Truth

All Director UI plans, PRDs, and implementation work must reference:

- `design.md`
- `design.zh.md` for Chinese collaboration

The design files define the target tokens, layout, component behavior, interaction principles, and adoption rules.

### R2 - Warm Cinematic Workstation

Director must keep the warm paper, production-workbook feeling:

- Warm neutral surfaces
- Terracotta primary actions
- Green approvals
- Compact rails
- Dense review grids
- Persistent right-side context drawer

Director must not drift into:

- Landing-page hero layouts
- Decorative gradient blobs/orbs/bokeh
- Card-heavy marketing composition
- Generic cold terminal surfaces

### R3 - Restraint And Visual Consistency

Future UI changes should reduce unnecessary decoration and normalize:

- Radius usage
- Button treatment
- Badge language
- Loading/failed/retry states
- Hardcoded colors vs shared tokens
- Responsive layout behavior

### R4 - State Transparency

Async or agent-driven actions must expose visible state:

- idle
- ready
- generating / processing
- waiting for confirmation
- completed
- approved
- failed
- stale / needs regeneration
- blocked by missing input

Important states should be visible in the local row/panel and summarized in runtime when they affect the workflow.

### R5 - Command-First Flow

Primary actions should use a consistent command vocabulary:

- generate
- revise
- approve
- retry
- render
- export
- handoff

Commands that mutate state must have disabled, loading, success, failure, and retry states where applicable.

### R6 - Auditability

Meaningful user/agent actions should leave a trace in at least one context surface:

- chat
- runtime
- artifacts
- handoff
- future action timeline

Minimum trace candidates:

- concept generated
- offline storyboard JSON imported
- option revised
- option selected/confirmed
- preview generated
- material uploaded
- render started
- output approved
- export/handoff package generated

### R7 - Context Drawer As Product Surface

The right drawer is not a temporary debug panel. It is a product surface:

- Chat: conversation and confirmation cards
- Runtime: model, skill sync, generation state, logs, action/tool traces, errors, retry affordances
- Artifacts: generated files and output status
- Handoff: current continuation state and downstream readiness

### R8 - Other Module Reuse

Other Delivery Console modules should reuse:

- Shared shell structure
- Warm token set
- Drawer model
- Command/state/audit principles

They should adapt only their center workflow and module-specific category badges.

## Acceptance Criteria

1. `design.md` and `design.zh.md` exist at project root and are referenced by PRD/plan/governance assets.
2. A follow-up implementation plan exists and treats current shell/drawer/components as already present, not as greenfield.
3. AGENTS/README/rules/testing documents point future UI work to the design source of truth without duplicating full PRD content.
4. UI implementation requests use agent-browser for page verification when interaction, screenshots, or visual checks are involved.
5. Design-system acceptance requests include screenshots, console/network review, drawer tab checks, state transparency checks, and responsive checks.

## Implementation Phasing

### P0 - Documentation Target

- Finalize `design.md` and `design.zh.md`.
- Add this PRD.
- Add a design-system UI implementation plan.
- Update lightweight governance and testing entry points.

### P1 - Low-Risk UI Alignment

- Token cleanup.
- Undefined CSS variable cleanup.
- Radius/button/badge consistency.
- Low-risk command-state normalization.

### P2 - Runtime / Handoff Upgrade

- Runtime as action/status surface.
- Handoff as continuation state.
- Artifacts with refresh/open/error states.

### P3 - Command / Audit Layer

- Shared command vocabulary.
- Traceable action records.
- Human/agent parity across visible actions.

## Risks

| Risk | Mitigation |
|---|---|
| Old April plans mislead implementers into rebuilding completed shell components | Create a May 1 continuation plan and mark April plans as origin/history. |
| Runtime remains a debug panel despite the new design target | Update Context Drawer plan and implementation units to treat runtime as product surface. |
| Governance docs become bloated | Keep AGENTS/README/rules updates short and pointer-based. |
| UI validation becomes weak smoke testing | Require agent-browser screenshots and state evidence in testing requests. |

