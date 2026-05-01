---
name: Director Design System
version: 0.2.0
date: 2026-05-01
status: target
format: google-stitch-inspired-design-md
purpose: "Reusable UI and interaction source of truth for Director and sibling Delivery Console modules."
principle: "Do not fully Claude-Code-ify Director; keep the warmth of a cinematic production workstation, while absorbing Claude Code's restraint, state transparency, command-first flow, and auditability."
tokens:
  color:
    bg: "#f4efe5"
    bgSoft: "#f8f4ec"
    panel: "rgba(255, 252, 247, 0.78)"
    panelSolid: "#fffcf7"
    border: "#e4dbcc"
    borderStrong: "#d8c8ae"
    text: "#342d24"
    ink: "#2c2823"
    muted: "#8f8372"
    accent: "#c97545"
    accentDeep: "#b26135"
    successSurface: "#dce9d8"
    successText: "#62835c"
    captureBlue: "#5b8a9b"
    materialGreen: "#5b7c6f"
    infographicOchre: "#a68b4b"
    generativePurple: "#9b6b9e"
  typography:
    body: '"Instrument Sans", "Avenir Next", "Segoe UI", sans-serif'
    display: '"Iowan Old Style", "Palatino Linotype", "Times New Roman", serif'
    mono: '"JetBrains Mono", "SFMono-Regular", monospace'
    normalLetterSpacing: "0"
    labelLetterSpacing: "0.06em-0.12em"
  spacing:
    base: 4
    scale: [4, 8, 12, 16, 24, 34]
  radius:
    control: 6
    card: 8
    majorPanel: 12
  layout:
    topbarHeight: 44
    railWidth: 260
    railCollapsedWidth: 60
    drawerWidth: 360
    drawerCollapsedWidth: 44
    compactRailWidth: 220
    compactDrawerWidth: 320
  motion:
    fast: "180ms ease"
    normal: "280ms ease"
  components:
    shell: "topbar + left rail + center workbench + right drawer + bottom status"
    drawerTabs: ["chat", "runtime", "artifacts", "handoff"]
    directorPhases: ["P1 concept", "P2 storyboard", "P3 render review", "P4 delivery handoff"]
---

# Design System - Director

## Why This Exists

This file is the visual and interaction source of truth for Director. Agents should read it before changing Director UI or borrowing Director's design language for another Delivery Console module.

Director is not a marketing site. It is a cinematic production workstation: compact, warm, precise, and built for repeated creative operations. The goal is not just to make the UI look good. The goal is to make the UI usable as a shared operating surface for people and agents.

## Relationship To Google DESIGN.md

This file follows the public `DESIGN.md` convention popularized by Google Stitch / Google Labs: a markdown design-system file that gives AI coding and design agents an explicit source of truth for colors, typography, spacing, components, layout, and product feel.

Director keeps the lowercase filename `design.md` because that is the module convention requested here. If a downstream tool requires uppercase `DESIGN.md`, create an alias or generated copy later rather than forking the content.

## Design Philosophy

### The Core Judgment

Do not fully Claude-Code-ify Director. If Director becomes too stark, terminal-like, or generic, it loses the warmth of a film/video creation workstation.

But Director should absorb four Claude Code strengths:

1. **Restraint:** fewer decorative layers, clearer hierarchy, less visual noise.
2. **State transparency:** every generating, waiting, failed, approved, stale, or blocked state should be visible and understandable.
3. **Command-first flow:** important actions should feel like deliberate commands, not scattered incidental buttons.
4. **Auditability:** meaningful actions should leave a trace in runtime, chat, artifact, or handoff context.

This turns the design from a nice-looking UI style into a product design standard other modules can actually reuse.

### Aesthetic Direction

- **Direction:** Warm cinematic operations console.
- **Mood:** Calm, tactile, editorial, and work-focused.
- **Density:** Compact to medium. Prefer dense but breathable production tables over oversized presentation cards.
- **Decoration:** Minimal and intentional. Use paper warmth, precise borders, subtle translucency, and icons.
- **Core metaphor:** A production workbook with rails, phases, review tables, command surfaces, and sidecar context.

## Product Context

- **What this is:** Director converts scripts into visual concepts, storyboard options, preview renders, review decisions, and delivery handoff.
- **Who it is for:** Human operators and AI agents working together on production workflows.
- **Primary behavior:** Scan, compare, decide, generate, review, correct, approve, and hand off.
- **Reuse goal:** Sibling modules can borrow this system when they need the same production-grade, agent-native workstation feel.

## Typography

| Role | Font | Current Usage | Guidance |
|---|---|---|---|
| Body/UI | `"Instrument Sans", "Avenir Next", "Segoe UI", sans-serif` | Main shell, labels, controls, drawer, tables | Default for all operational UI. Keep it compact and legible. |
| Display/Section | `"Iowan Old Style", "Palatino Linotype", "Times New Roman", serif` | Brand, workstation slot text, stage title | Use sparingly for identity and editorial warmth. Do not use for dense tables. |
| Mono/Data | `"JetBrains Mono", "SFMono-Regular", monospace` | Paths, IDs, logs, technical values | Use for machine-readable values, paths, row IDs, and trace output. |

### Type Scale

| Level | Size | Weight | Usage |
|---|---:|---:|---|
| Brand/title | `0.95rem-1rem` | `700` | Top brand, Director stage title |
| Panel title | `0.875rem-1rem` | `700` | Phase panel headers, card titles |
| Body | `0.875rem` | `400-500` | General text, descriptions |
| Compact table/body | `0.75rem-0.8rem` | `400-600` | Option rows, phase status, rail items |
| Micro label | `10px-11px` | `600-700` | Badges, metadata, row helpers |
| Numeric emphasis | `1.125rem-1.5rem` | `700` | Counts and progress summaries |

### Typography Rules

- Keep normal letter spacing at `0`.
- Use `0.06em-0.12em` only for uppercase section labels, metadata, and drawer tabs.
- Long creative text should use relaxed line height (`1.5-1.65`) and warm ink, not pure black.
- Serif type is an identity accent, not the main interface voice.
- Dense review rows should prefer sans-serif and avoid theatrical typography.

## Color

### Core Tokens

| Token | Hex / Value | Role |
|---|---|---|
| `--shell-bg` | `#f4efe5` | Main warm paper background |
| `--shell-bg-soft` | `#f8f4ec` | Center workbench background |
| `--shell-panel` | `rgba(255, 252, 247, 0.78)` | Translucent panel surface |
| `--shell-panel-solid` | `#fffcf7` | Solid panel surface |
| `--shell-border` | `#e4dbcc` | Default divider and card border |
| `--shell-border-strong` | `#d8c8ae` | Active/strong borders |
| `--shell-text` | `#342d24` | Primary warm ink |
| `--shell-ink` | `#2c2823` | Strong title ink |
| `--shell-muted` | `#8f8372` | Secondary text and inactive controls |
| `--shell-accent` | `#c97545` | Director action, selected state, warm focus |
| `--shell-accent-deep` | `#b26135` | Hover/pressed accent |
| `--shell-success` | `#dce9d8` | Success surface |
| `--shell-success-text` | `#62835c` | Success text and checks |

### Supporting Semantic Colors

| Role | Hex | Usage |
|---|---|---|
| Upload / user capture blue | `#5b8a9b` | User-capture/source category |
| Material / approved green | `#5b7c6f`, `#62835c` | Uploaded/approved/completed states |
| Infographic ochre | `#a68b4b` | Static infographic category |
| Generative purple | `#9b6b9e` | AI video/generative category |
| Error red | Tailwind red family | Failed preview/upload states |

### Color Rules

- Keep the interface mostly warm neutral. Accent is punctuation, not wallpaper.
- Use `#c97545` for primary actions, active phase, selected state, and warm focus.
- Use green only for confirmed, approved, uploaded, or completed states.
- Use category colors as soft tinted badges, roughly 15% opacity.
- Preserve contrast: main text near `#342d24`, muted text near `#8f8372`.
- Avoid a cold blue/slate enterprise theme unless a different module explicitly documents why.

## Layout

### Shell Structure

Director uses a persistent production shell:

| Zone | Default Size | Purpose |
|---|---:|---|
| Topbar | `44px` tall | Project/script context and product identity |
| Left rail | `260px`, collapsed `60px` | Workstation navigation and session/script list |
| Center workbench | `minmax(0, 1fr)` | Primary phase work |
| Right drawer | `360px`, collapsed `44px` | Chat, runtime, artifacts, handoff |
| Bottom status | Center bottom | Online/generation status |

### Responsive Behavior

- At <= `1440px`, rail narrows to `220px`, drawer to `320px`.
- At <= `980px`, collapse into a single-column flow where rail and drawer stack with center content.
- Collapsed rails remain icon-first and title/tooltip friendly.
- Fixed-format review tables use stable grid tracks and `min-width: 0`.
- Main phase content scrolls inside `.director-workbench__content`, not the entire shell.

### Center Workbench Rules

- Build the center as a workflow surface: panels, rows, tables, queues, previews, and review controls.
- Avoid hero sections and marketing-like feature cards.
- Keep phase headers compact: title/status left, phase command controls right.
- The user should always understand where they are, what is selected, what is waiting, and what the next valid command is.

## Components

### Top Bar

- Height: `44px`.
- Use translucent warm background with blur.
- Brand area uses display serif, compact icon mark, and strong left boundary.
- Breadcrumb/meta text uses muted body type.

### Workstation Rail

- Use icon + label rows with 8px radius.
- Active workstation: strong border, near-white panel background, primary text.
- Hover: subtle paper lift (`translateY(-1px)`) and border reveal.
- Section labels are uppercase, muted, and tracked.

### Context Drawer

- Required tabs: chat, runtime, artifacts, handoff.
- Tabs are compact uppercase labels.
- Active tab uses accent text and bottom border.
- Chat tab owns its own padding; non-chat tabs use `12px`.
- Chat should stay mounted when possible so local blobs and conversation state do not vanish on tab switch.
- Runtime should show current model, generation state, recent logs, tool/action traces, error state, and sync state when available.
- Handoff should explain current continuation state, not just list files.

### Phase Panel

- Surface: `rgba(255, 252, 247, 0.78)`.
- Border: `#e4dbcc`.
- Radius: current major phase panels may use `12px`; new shared components should prefer `8px`.
- Header: warm beige background, `px-5 py-3`, bottom border.
- Body: `p-5`.
- Footer: `px-5 py-3`, top border.

### Empty and Loading States

- Empty states are centered, restrained, and actionable.
- Use one icon, one title, one short line, and optional actions.
- Loading uses a small accent spinner and clear progress copy.
- Never imply success while async work is still pending.

### Review Rows

- Use 12-column grids for dense comparison.
- Current Phase 2 row allocation:
  - `1` column: row id
  - `2` columns: source quote
  - `4` columns: design/prompt
  - `4` columns: preview
  - `1` column: confirmation
- Preview areas keep `aspect-video`.
- Use `text-xs` for dense review text and `10px` for metadata.
- Selected row: accent border and very light accent background.
- Confirmed row/control: green check treatment.

### Buttons And Commands

- Primary action: accent background `#c97545`, white text, hover `#b26135`.
- Secondary action: warm paper background, border `#e4dbcc`, ink text.
- Destructive/error: red only for true failure or destructive action.
- Use lucide icons where available.
- Important workflow actions should be phrased as commands: generate, revise, approve, retry, render, export, hand off.
- Commands that mutate state should have clear disabled, loading, success, failure, and retry states.
- Dangerous commands must require explicit confirmation and should be visible in runtime/audit context.

### Badges

- Use soft tinted backgrounds at about 15% opacity.
- Badges communicate source/type/status without dominating the row.
- Prefer lucide icon + text or plain text over emoji for reusable modules.
- Category colors:
  - Remotion/internet clip: warm accent
  - Generative/Seedance: muted purple
  - Artlist/approved/uploaded: green
  - User capture: blue
  - Infographic: ochre

### Inputs

- Background: `#faf6ef` or panel surface.
- Border: `#e4dbcc`.
- Focus border: accent.
- Placeholder: muted beige (`#c9baa3` or `#8f8372`).
- Textarea rows should be compact but comfortable.
- Avoid oversized input boxes inside dense review surfaces.

### Media Preview

- Use stable `aspect-video` containers.
- Placeholder background: warm paper.
- Zoom overlay: subtle black overlay on hover.
- Fullscreen/lightbox: black overlay, centered media, close icon in corner.
- Failed preview must show a visible failed state and a clear retry command.

## Interaction Principles

### State Transparency

Every async or agent-driven action should expose state:

- Idle
- Ready
- Generating / processing
- Waiting for confirmation
- Completed
- Approved
- Failed
- Stale / needs regeneration
- Blocked by missing input

State should be visible in the relevant row or panel and summarized in the runtime drawer when the action matters to the workflow.

### Command-First Flow

- Each phase should have a small number of obvious primary commands.
- Avoid scattering equivalent actions across many decorative controls.
- Commands should use verbs and map to real backend or agent actions.
- If a command changes durable state, the UI should show what changed.

### Auditability

Meaningful user/agent actions should leave a trace:

- Generated a concept
- Imported offline storyboard JSON
- Revised an option
- Selected or confirmed an option
- Generated preview
- Uploaded material
- Started render
- Approved output
- Exported/handoff package

The trace can appear in chat, runtime, artifacts, handoff, or a future action timeline. The important point is that the workflow should not feel like untraceable magic.

### Agent-Native Parity

Any action a human can take should be expressible to an agent:

- The UI control should map to a clear command name.
- The resulting state change should be visible.
- The agent should be able to explain what it did, what failed, and what can be retried.

## Motion

- **Approach:** Minimal and functional.
- **Fast transition:** `180ms ease` for hover, color, border, and small transforms.
- **Normal transition:** `280ms ease` for shell column changes.
- Use small hover lift (`translateY(-1px)`) on rail/session rows.
- Spinners indicate real async work only.
- Avoid decorative motion that does not communicate state.

## Depth And Surfaces

- Depth comes from border, translucency, and slight tonal layering, not heavy shadows.
- Default shadow should stay extremely light: `0 8px 24px rgba(88, 67, 42, 0.04)`.
- Primary hierarchy:
  - Page background: warm paper gradient
  - Rails/drawers: translucent beige chrome
  - Center workbench: soft paper
  - Panels: translucent off-white
  - Active controls: border and accent

## Do

- Build real workflow screens first, not landing pages.
- Keep operational density high enough for repeated use.
- Use warm paper neutrals and ink colors consistently.
- Make selection, approval, generation, stale, blocked, and failure states visually distinct.
- Keep rails, drawers, and status bars stable across modules.
- Use icons for workstation navigation, collapse controls, upload, preview, approve, refresh, retry, render, export, and close.
- Preserve chat, runtime status, artifacts, and handoff as first-class sidecar tabs.
- Add audit traces for meaningful state-changing actions.

## Don't

- Do not replace the workstation shell with oversized hero cards.
- Do not introduce decorative gradient blobs, abstract orbs, or bokeh backgrounds.
- Do not make every surface orange; accent is for action and focus.
- Do not put cards inside cards unless the inner item is a repeated row or modal.
- Do not let dynamic text resize review rows unpredictably; use stable grids, clamping, and scroll.
- Do not hide runtime/agent state if the workflow depends on generation, sync, or handoff.
- Do not turn Director into a generic terminal UI. Keep the cinematic production warmth.

## Adoption Guide For Other Modules

When another Delivery Console module borrows Director's design language:

1. Keep the shared shell: topbar, left rail, center workbench, right drawer, bottom status.
2. Keep the warm token set unless the module has a strong reason to diverge.
3. Adapt the center workflow to the module's job:
   - Marketing: campaign / keyword / release pipeline tables.
   - Shorts: script / b-roll / subtitle / render queue.
   - Music: cue sheet / mood reference / export decisions.
   - Thumbnail: concept variants / scoring / preview comparison.
4. Preserve the drawer model: chat, runtime, artifacts, handoff.
5. Use module-specific category colors only as badges or small accents.
6. Document intentional deviations in that module's own design notes.

## Implementation Priority

### P0 - Documentation Target

- `design.md` is the design target source of truth.
- `design.zh.md` mirrors this document for Chinese collaboration.
- Future plans and PRDs should reference these documents before UI work.

### P1 - Low-Risk UI Alignment

- Reduce decorative background intensity if it competes with work content.
- Prefer 8px radius for new reusable components.
- Replace emoji-like badges with lucide icon + text where shared module reuse matters.
- Normalize command labels and loading/failed/retry states.

### P2 - State And Runtime Upgrade

- Expand runtime drawer into a true action/status surface.
- Show current model, skill sync, generation state, recent tool/action traces, errors, and retry affordances.
- Make handoff panel reflect current continuation state.

### P3 - Command And Audit Layer

- Add a unified command vocabulary for generate, revise, approve, retry, render, export, and handoff.
- Ensure important state mutations leave traceable records.
- Align chat/agent actions with visible UI state.

## Agent Prompt Guide

When asking an agent to build or adjust Delivery Console UI, include:

> Use `design.md` as the visual and interaction source of truth. Build a warm cinematic operations console: compact rails, paper-toned panels, precise borders, sparse serif title accents, Instrument Sans-style UI text, terracotta primary actions, green approvals, dense review grids, and a persistent right-side context drawer. Do not fully Claude-Code-ify it; preserve creative production warmth while adopting restraint, state transparency, command-first flow, and auditability. Avoid landing-page composition, decorative blobs, hidden runtime state, and one-off palettes.

## Source Files

Current Director implementation references:

- `src/styles/delivery-shell.css`
- `src/components/delivery-shell/DeliveryShellLayout.tsx`
- `src/components/delivery-shell/WorkstationRail.tsx`
- `src/components/delivery-shell/ContextDrawer.tsx`
- `src/components/delivery-shell/drawer/RuntimePanel.tsx`
- `src/components/delivery-shell/drawer/HandoffPanel.tsx`
- `src/components/director/DirectorWorkbenchShell.tsx`
- `src/components/director/DirectorStageHeader.tsx`
- `src/components/director/phase-layouts/PhasePanel.tsx`
- `src/components/director/ChapterCard.tsx`
- `src/components/director/Phase1View.tsx`
- `src/components/director/Phase2View.tsx`
- `src/components/director/Phase3View.tsx`

## References

- Google Labs / Stitch-style `DESIGN.md` convention: markdown design-system source of truth for AI-assisted UI generation.
- Current implementation tokens: `src/styles/delivery-shell.css`.
- Current shell implementation: `src/components/delivery-shell/DeliveryShellLayout.tsx`.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-01 | Created root `design.md` from current Director UI | Let other Delivery Console modules reuse Director's stable visual language. |
| 2026-05-01 | Kept lowercase filename | User explicitly requested `design.md`; content remains compatible with public `DESIGN.md` convention. |
| 2026-05-01 | Upgraded to target design source of truth with machine-readable front matter | Make the file easier for agents and future module work to consume. |
| 2026-05-01 | Added Claude Code calibration principle | Preserve Director's creative warmth while adopting restraint, state transparency, command-first flow, and auditability. |
