# TREQ-2026-05-01-DIRECTOR-UI-DESIGN-SYSTEM-ACCEPTANCE

## Purpose

Validate that Director UI implementation follows the May 1 design target:

- `design.md`
- `design.zh.md`
- `docs/plans/2026-05-01_director-design-target-prd.md`
- `docs/plans/2026-05-01-director-design-system-ui-implementation-plan.md`

## Execution Requirements

- Must use `agent-browser` for page navigation, screenshots, console, and interaction checks.
- Do not replace this with a custom Playwright/Selenium script.
- If `agent-browser` is unavailable, mark the request `blocked`.

## Setup

1. Start Director dev services if they are not already running.
2. Open `http://localhost:5178/`.
3. Confirm the page title or visible UI indicates Director/Delivery Console, not another module page.

## Required Checks

### 1. First Screen

- Capture a screenshot of the first visible Director page.
- Verify the UI is a workstation shell, not a landing-page hero.
- Verify left rail, center workbench, right drawer, and bottom status are present or intentionally collapsed.

### 2. Drawer Tabs

Switch through:

- Chat
- Runtime
- Artifacts
- Handoff

For each tab:

- Capture text/screenshot evidence.
- Verify it has meaningful empty/loading/error/data state.
- If an API fails, report it explicitly. Do not mark passed if Artifacts or Handoff silently fail.

### 3. Rail And Drawer Collapse

- Collapse and expand the left rail.
- Collapse and expand the right drawer.
- Verify the center workbench does not overlap with either side.

### 4. State Transparency

Verify at least one visible command state if available:

- disabled
- loading / generating / processing
- success / approved / completed
- failure / retry
- blocked by missing input

If no data path is available for a state, report it as not covered rather than inventing a pass.

### 5. Visual Design Guardrails

Check the page for obvious violations:

- No landing-page hero replacement
- No decorative gradient blobs/orbs/bokeh backgrounds
- No incoherent card-inside-card nesting
- No excessive orange surfaces
- Dense review/work surfaces remain readable

### 6. Responsive Screenshots

Capture screenshots at:

- `1440x900`
- `980x800`

Verify no obvious:

- text overflow
- button label clipping
- drawer overlap
- rail/workbench collision
- review row layout break

### 7. Browser Diagnostics

Collect:

- console output
- relevant network failures
- screenshot artifact paths

## Pass Criteria

Mark `passed` only if:

1. All required checks have evidence.
2. The page can be used as a Director workstation.
3. Drawer tabs work or failures are explicitly surfaced in UI/report.
4. Screenshots show no major design-system violations.
5. Console/network output does not reveal blocking UI errors.

## Fail / Block Criteria

Mark `failed` if:

- Page opens but key shell regions are missing or broken.
- Drawer tabs silently fail.
- Responsive layout overlaps or clips core controls.
- The implementation visibly violates `design.md` guardrails.

Mark `blocked` if:

- `agent-browser` is unavailable.
- Local dev services cannot be started.
- Required data/project context is unavailable and prevents meaningful UI validation.
