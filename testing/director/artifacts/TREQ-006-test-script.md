# Agent Browser Test Script for TREQ-006

## Test Configuration
- URL: http://localhost:5178/
- Project: CSET-Seedance2
- Module: 影视导演 (Film Director)
- Target Phase: Phase2 Business Acceptance

## Execution Steps

### Step 1: Navigate and Enter Director
1. Open http://localhost:5178/
2. Take screenshot: `01-initial-page.png`
3. Click on "影视导演" (Film Director) entry
4. Take screenshot: `02-director-entry.png`

### Step 2: Phase1 → Phase2 Transition
1. If currently at Phase1, look for "Approve & Continue" button
2. Click the button to advance to Phase2
3. Take screenshot: `03-phase2-entered.png`

### Step 3: Phase2 Generation
1. In Phase2, select at least one B-roll type (e.g., "数据可视化", "seedance", etc.)
2. Click "Confirm & Generate Previews" button
3. Wait for generation to complete:
   - Look for "正在为你的剧本生成视觉方案..." loading message
   - Wait for card list to appear
   - Verify "筛选结果" statistics appear
4. Take screenshots:
   - `04-generation-loading.png` (during generation)
   - `05-generation-complete.png` (after completion)

### Step 4: Select and Confirm Proposal
1. Navigate to at least one chapter card
2. Select one visual proposal option
3. Check/confirm the selected proposal
4. Take screenshot: `06-proposal-selected.png`

### Step 5: Submit to Phase3
1. Click "提交 → Phase 3" button
2. Wait for transition to complete
3. Verify page shows "Phase 3: 视频二审"
4. Take screenshot: `07-phase3-entered.png`

### Step 6: Final Verification
1. Check browser console for errors
2. Check network tab for failed requests
3. Take final screenshot: `08-final-state.png`

## Evidence Collection
- All screenshots saved to artifacts directory
- Console logs saved to `console-logs.txt`
- Network logs saved to `network-logs.txt`
- selection_state.json timestamp verified
