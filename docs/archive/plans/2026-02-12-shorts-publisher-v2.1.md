# Shorts Publisher v2.1 Implementation Plan

## Goal
Enable manual video file linking and marketing data integration for YouTube Shorts publishing workflow.
This bypasses the current "Redner" requirement and allows using externally produced videos.

## Proposed Changes

### 1. Backend: File Browser API
**Component**: `server/index.ts`
- Implement `GET /api/files` endpoint.
- Query params: `dir` (directory path).
- Logic:
  - If `dir` is empty, return User Home or Project Root.
  - List folders and `.mp4` files in the specified directory.
  - Return `{ name, path, isDirectory }[]`.
- Security: Restrict traversal if possible (or allow full system access as this is a local tool).

### 2. Frontend: Manual Link UI
**Component**: `ShortsSection.tsx`, `ShortCard.tsx`
- Add "Link Video" button to `ShortCard` (visible in Draft/Linked state).
- Create `FileBrowserModal.tsx`:
  - UI to navigate directories using the new API.
  - Select a `.mp4` file.
  - Return absolute path.
- **Action**: On selection, update item status to `scheduled` (or `linked`? Plan says `linked` but `scheduled` is closer to previous logic. Let's use a new status `ready_to_schedule` or just stay in `draft` with `videoPath` populated?
  - *Decision*: User agreed to `Linked` status.
  - Update `types.ts`: Add `linked` to `ShortStatus`.

### 3. Frontend: Marketing Data Injection
**Component**: `ScheduleModal.tsx`
- Read `marketing` module from global state.
- Add "Import from Marketing" button next to fields.
- Logic:
  - Title <- `marketing.strategy.seo.titleCandidates[0]`
  - Description <- `marketing.strategy.seo.description` + `\n\n` + `marketing.strategy.social.twitterThread`
  - Tags <- `marketing.strategy.seo.keywords` + `marketing.strategy.geo.locationTags`

## Verification Plan

### Automated Tests
- None (Visual/Integration heavy).

### Manual Verification
1. **Link Video**:
   - Open Shorts Publisher.
   - Click "Link Video" on a draft.
   - Navigate local folders in modal.
   - Select an MP4.
   - Verify status changes to `Linked` and card shows "Video Linked".
2. **Marketing Import**:
   - Open "Schedule" on the linked item.
   - Click "Import Marketing Data".
   - Verify Title/Desc/Tags are populated from `delivery_store.json`.
3. **Upload**:
   - Proceed to Upload.
   - Verify it uploads the *linked* file with the *imported* metadata.
