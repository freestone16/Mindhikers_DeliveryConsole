---
title: "Director Design System UI Implementation Plan"
type: implementation_plan
status: active
date: 2026-05-01
owner: OldYang
origin:
  - docs/plans/2026-05-01_director-design-target-prd.md
related:
  - ../../design.md
  - ../../design.zh.md
  - docs/plans/2026-04-17_director-ui-revamp-plan.md
  - docs/plans/2026-04-17-001-refactor-director-ui-implementation-plan.md
  - docs/plans/2026-04-19-003-feat-context-drawer-plan.md
---

# Director Design System UI Implementation Plan

## Overview

This is a continuation plan, not a greenfield shell rewrite.

The April UI work already produced major pieces of the shared shell: `DeliveryShellLayout`, `WorkstationRail`, `ContextDrawer`, drawer panels, Director workbench shell, and `PhasePanel`. The May 1 design target now asks us to align the existing implementation with `design.md` / `design.zh.md`.

The goal is to turn Director into a reusable design-system sample for Delivery Console: warm, restrained, state-transparent, command-first, and auditable.

## Source Of Truth

Before implementation, read:

1. `design.md`
2. `design.zh.md`
3. `docs/plans/2026-05-01_director-design-target-prd.md`
4. This plan

The older April plans are origin/history, not the current target.

## Scope

In scope:

- CSS token cleanup and layout consistency.
- Left rail context dock integration.
- Drawer tab state/empty/error/refresh improvements.
- Director phase visual consistency.
- Runtime/action trace foundation.
- Agent-browser design-system acceptance request.

Out of scope:

- New backend session model.
- Full command/audit persistence store.
- Full sibling module UI rebuilds.
- Rewriting Phase 1-4 API semantics.

## Implementation Units

### Unit 1 - Shell / CSS Token Alignment

**Goal:** Align `delivery-shell.css` with `design.md` tokens and remove obvious drift.

**Files:**

- `src/styles/delivery-shell.css`
- `src/components/delivery-shell/DeliveryShellLayout.tsx`

**Work:**

- Define or replace unresolved CSS variables such as `--shell-surface` and `--shell-hover`.
- Reduce duplicated hardcoded colors where token substitution is safe.
- Check responsive rules for <= `1440px` and <= `980px`.
- Keep visual changes low-risk and avoid restyling the whole UI in one pass.

**Tests / Verification:**

- `npm run build` or targeted TypeScript check if build remains viable.
- Agent-browser screenshots at desktop and compact widths.
- Check left rail, center workbench, drawer, and status bar do not overlap.

### Unit 2 - ProjectContextDock Integration

**Goal:** Connect the existing `ProjectContextDock` into the left rail so the shell matches the design target.

**Files:**

- `src/components/delivery-shell/DeliveryShellLayout.tsx`
- `src/components/delivery-shell/WorkstationRail.tsx`
- `src/components/delivery-shell/ProjectContextDock.tsx`

**Work:**

- Pass project/script/model/output context into `WorkstationRail`.
- Render `ProjectContextDock` at the rail bottom in expanded mode.
- Keep collapsed rail icon-first and uncluttered.
- Ensure long project/script names wrap or truncate without breaking layout.

**Tests / Verification:**

- Agent-browser: select/open Director page and verify rail bottom context appears.
- Fold/unfold rail and verify no text collision.

### Unit 3 - Drawer Four-Tab Product Surface

**Status:** first pass implemented on 2026-05-01. Runtime now shows current state, recent event, action trace labels, and tool feedback. Artifacts now has refresh, loading/error/empty states, path display, and disabled open/download affordances until API endpoints exist. Handoff now shows current continuation state, next action, refresh, and richer error/empty states.

**Goal:** Upgrade drawer panels from simple side content into product-grade context surfaces.

**Files:**

- `src/components/delivery-shell/ContextDrawer.tsx`
- `src/components/delivery-shell/drawer/RuntimePanel.tsx`
- `src/components/delivery-shell/drawer/ArtifactsPanel.tsx`
- `src/components/delivery-shell/drawer/HandoffPanel.tsx`

**Work:**

- Runtime: show model, skill sync, active generation state, recent logs, error state, and action/tool trace placeholders.
- Artifacts: add refresh affordance, empty state, error state, and open/download affordance where current API supports it.
- Handoff: show current continuation state, not only raw stage/file lists.
- Preserve ChatPanel persistent mounting behavior.

**Tests / Verification:**

- Agent-browser: switch Chat / Runtime / Artifacts / Handoff tabs.
- Verify each tab has meaningful empty/loading/error/data states.
- Verify API failures are visible and cannot be counted as passed.
- 2026-05-01 verification: `npm run build` passed; agent-browser checked Runtime / Artifacts / Handoff at `http://localhost:5178/`; screenshots saved to `/private/tmp/director-shots/unit3-handoff-1440.png` and `/private/tmp/director-shots/unit3-handoff-980.png`.

### Unit 4 - Director Phase Visual Consistency

**Goal:** Bring Phase 1-4 workbench surfaces into closer alignment with the design target.

**Files:**

- `src/components/director/phase-layouts/PhasePanel.tsx`
- `src/components/director/Phase1View.tsx`
- `src/components/director/Phase2View.tsx`
- `src/components/director/Phase3View.tsx`
- `src/components/director/Phase4View.tsx`
- `src/components/director/ChapterCard.tsx`

**Work:**

- Normalize command labels and button states.
- Prefer icon + text or plain text badges over emoji-like badges for reusable module patterns.
- Keep 12-column review rows stable.
- Ensure previews retain `aspect-video`.
- Ensure failed preview/upload/render states have retry affordances.

**Tests / Verification:**

- Agent-browser: verify P1 empty/generate state and P2 review grid when data is available.
- Check no obvious text overflow in dense rows.

### Unit 5 - State Transparency And Audit Foundation

**Goal:** Make meaningful state transitions visible in runtime or adjacent context.

**Files:**

- `src/components/DirectorSection.tsx`
- `src/components/delivery-shell/DeliveryStatusBar.tsx`
- `src/components/delivery-shell/drawer/RuntimePanel.tsx`
- `src/components/director/ChapterCard.tsx`

**Work:**

- Identify existing runtime log/event sources.
- Surface meaningful actions: generate, revise, approve, retry, render, export, handoff.
- Add lightweight action trace UI where data already exists.
- Do not invent durable persistence in this unit.

**Tests / Verification:**

- Trigger at least one main user action and verify visible state change.
- Verify runtime/handoff context reflects enough information to continue or diagnose.

### Unit 6 - Design-System Acceptance Request

**Goal:** Turn the design-system validation into a reusable OpenCode/agent-browser request.

**Files:**

- `testing/director/requests/TREQ-2026-05-01-DIRECTOR-UI-DESIGN-SYSTEM-ACCEPTANCE.md`
- `testing/README.md`
- `testing/director/README.md`

**Work:**

- Write a request that requires agent-browser.
- Cover first screen, rail/drawer collapse, four drawer tabs, P1, P2 when data is available, responsive widths, console/network, and screenshot artifacts.
- Define pass/fail criteria based on design target evidence, not "page opened."

## Sequencing

1. Unit 1
2. Unit 2
3. Unit 3
4. Unit 4
5. Unit 5
6. Unit 6

Unit 1 and Unit 2 are low-risk alignment. Unit 3 and Unit 5 carry the main product value. Unit 6 should be created before declaring the implementation done.

## Acceptance Criteria

- UI implementation references `design.md` and `design.zh.md`.
- Shell and drawer remain stable in desktop and compact layouts.
- Runtime/Handoff reflect state, not only static panels.
- Important commands have visible loading/failure/retry states where applicable.
- Agent-browser screenshots and reports prove the design-system behavior.
