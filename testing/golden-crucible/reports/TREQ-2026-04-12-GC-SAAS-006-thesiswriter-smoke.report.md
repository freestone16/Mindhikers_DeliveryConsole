# TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke Report

## Metadata

- request_id: TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke
- executed_at: 2026-04-14T00:30:00+08:00
- actual_model: zhipuai-coding-plan/glm-5
- browser_execution: agent-browser (partial — login + page inspection; CTA/thesis flow blocked)
- status: **blocked**

## Test Summary

ThesisWriter 全链路冒烟测试被阻塞。核心原因：**staging 部署不包含 ThesisWriter 后端路由**（`/api/crucible/thesis/generate` 和 `/api/crucible/thesis/trial-status` 均返回 404）。代码在本地 repo 中存在且完整，但未随 staging 部署上线。前端 CTA 逻辑和后端 convergence 检测逻辑均已实现，但无法端到端验证。

## Environment

- target_url: https://golden-crucible-saas-staging.up.railway.app/
- deployed_version: v4.0.0
- local_version: v4.0.0
- test_account: ThesisWriterTestUser (thesiswriter-test@gc-staging.test)
- trial_status: platform mode, 3 conversations / 10 turns per conversation

## Evidence

- request: `testing/golden-crucible/requests/TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke.md`
- report: `testing/golden-crucible/reports/TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke.report.md`
- status: `testing/golden-crucible/status/latest.json`
- opencode_log: `testing/golden-crucible/artifacts/TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke.opencode.log`
- stdout_log: `testing/golden-crucible/artifacts/TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke.stdout.log`
- stderr_log: `testing/golden-crucible/artifacts/TREQ-2026-04-12-GC-SAAS-006-thesiswriter-smoke.stderr.log`

### Key API Evidence

1. **Login 成功**: `POST /api/auth/sign-in/email` → 200, 返回用户信息
2. **Trial status 正常**: `GET /api/crucible/trial-status` → `{"enabled":true,"mode":"platform","limits":{"conversationLimit":3,"turnLimitPerConversation":10},"usage":{"conversationsUsed":1,"conversationsRemaining":2,...}}`
3. **Thesis 路由缺失**: `GET /api/crucible/thesis/trial-status` → 404 `Cannot GET`
4. **Thesis generate 缺失**: `POST /api/crucible/thesis/generate` → 404 `Cannot POST`
5. **SSE turn 路由存在**: `POST /api/crucible/turn/stream` 可达（从之前测试验证）

## Verification Results

| # | Expected | Result | Status |
|---|----------|--------|--------|
| 1 | 对话达到收敛条件后 ThesisWriter CTA 正确出现 | **无法验证** — convergence 检测逻辑存在于 `server/crucible.ts:645`（roundIndex >= 5 且 stageLabel === 'crystallization'），但 staging 部署版本无法确认是否包含此逻辑 | BLOCKED |
| 2 | 点击 CTA 后论文生成成功，返回有效 Markdown | **无法验证** — `POST /api/crucible/thesis/generate` 返回 404，路由未部署 | BLOCKED |
| 3 | 论文 artifact 保存到 conversation 并可导出 | **无法验证** — 依赖 #2 | BLOCKED |
| 4 | 平台用户论文额度限 2 次，超限后正确拦截 | **无法验证** — `GET /api/crucible/thesis/trial-status` 返回 404，额度查询不可用 | BLOCKED |
| 5 | 超限提示清晰，引导用户了解 BYOK 等后续选项 | **无法验证** — 依赖 #4 | BLOCKED |

## Bug Follow-up

### Bug 1: ThesisWriter 后端路由未部署到 staging

- **Bug Title**: ThesisWriter API endpoints return 404 on staging
- **Symptom**: `GET /api/crucible/thesis/trial-status` and `POST /api/crucible/thesis/generate` return `Cannot GET/POST` (Express default 404)
- **Expected**: Routes should be registered and accessible (code exists in `server/index.ts:256-268`)
- **Actual**: Express returns 404 for both thesis endpoints, while other crucible routes (`/api/crucible/turn/stream`, `/api/crucible/trial-status`) work fine
- **Reproduction**:
  ```bash
  # 1. Login to get session cookie
  curl -s -D - -X POST https://golden-crucible-saas-staging.up.railway.app/api/auth/sign-in/email \
    -H "Content-Type: application/json" \
    -d '{"email":"thesiswriter-test@gc-staging.test","password":"TestPass123!"}'
  # 2. Use returned cookie to hit thesis endpoint
  curl -s -H "Cookie: __Secure-better-auth.session_token=<token>" \
    "https://golden-crucible-saas-staging.up.railway.app/api/crucible/thesis/trial-status"
  # Result: 404 Cannot GET
  ```
- **Scope / Impact**: Blocks all ThesisWriter testing. No thesis generation, no trial quota checking, no artifact creation possible on staging.
- **Suspected Root Cause**: The staging deployment (`MHSDC-GC-SAAS-staging` branch on Railway) may not include the latest code with thesis routes. The routes are defined in `server/index.ts:256-268` which imports from `./crucible-thesiswriter` and `./crucible-trial`. Possible causes:
  1. The staging branch hasn't been updated with the thesiswriter code
  2. A build/deploy issue causing the thesis routes to not be registered
  3. The `./crucible-thesiswriter` module import fails silently during startup
- **Key Evidence**:
  - `curl -s https://golden-crucible-saas-staging.up.railway.app/api/version` → `{"version":"v4.0.0"}`
  - Local `package.json` version: `4.0.0`
  - Code exists: `server/index.ts:256: app.post('/api/crucible/thesis/generate', generateCrucibleThesis);`
- **Suggested Next Action**:
  1. Check if the staging Railway deployment logs show any import errors for `crucible-thesiswriter`
  2. Verify the `MHSDC-GC-SAAS-staging` branch includes the thesis routes
  3. Trigger a redeploy of the staging environment
  4. After redeploy, re-run this test request

### Bug 2: agent-browser login flow 不完整

- **Bug Title**: better-auth 前端登录按钮点击后不跳转
- **Symptom**: Clicking "使用邮箱登录并继续" button via `agent-browser` succeeds (returns `Done`) but page stays on login form
- **Expected**: After successful login, page should redirect to workspace
- **Actual**: Page remains on login form; no error shown; cookie is not set
- **Workaround**: Use `fetch('/api/auth/sign-in/email', ...)` via `agent-browser eval`, then `location.reload()` — this sets the HttpOnly cookie correctly and the workspace loads
- **Scope / Impact**: Not blocking (workaround exists), but suggests a potential timing or event handling issue in the React auth flow when automated

## Code Analysis Summary

ThesisWriter feature 的代码分析（本地 repo）：

### 后端实现
- **Convergence 检测**: `server/crucible.ts:645` — `detectThesisConvergence()` 在 roundIndex >= 5 且 Socrates decision 的 stageLabel === 'crystallization' 时返回 true
- **论文生成**: `server/crucible-thesiswriter.ts` — `generateCrucibleThesis()` 处理 POST 请求，调用 LLM 生成论文，保存为 `thesis_` 前缀 artifact
- **Trial 额度**: `server/crucible-trial.ts` — `assertCrucibleThesisTrialAccess()` 检查论文生成额度，`getCrucibleThesisTrialStatus()` 返回额度状态
- **Artifact 保存**: `server/crucible-persistence.ts` — `appendCrucibleThesisArtifact()` 保存论文到对话

### 前端实现
- **CTA 按钮**: `src/components/ChatPanel.tsx:1218` — "生成论文" 按钮在 `thesisReady=true` 时出现在最后一个老卢消息下方
- **Thesis 生成调用**: `src/SaaSApp.tsx:294` — `handleEnterThesisWriter()` 调用 `/api/crucible/thesis/generate`
- **额度检查**: 同上 — 生成前检查 `thesisTrialStatus.canGenerateThesis`

## Handoff Notes

### 如果要继续此测试

1. **先修复**: 确认 staging 部署包含 thesis 路由（最关键）
   - 检查 Railway staging 部署日志
   - 确认 `MHSDC-GC-SAAS-staging` 分支包含 `server/crucible-thesiswriter.ts`
   - 触发重新部署

2. **重新测试**: staging 部署修复后，重新执行 TREQ-006
   - 使用已注册的测试账号: `thesiswriter-test@gc-staging.test` / `TestPass123!`
   - 或使用 StagingTestUser 账号（之前测试已存在）
   - 登录 workaround: 使用 `agent-browser eval "fetch('/api/auth/sign-in/email', ...)"` 然后 reload

3. **已知问题**:
   - `agent-browser` 的 "重置" 按钮点击会导致浏览器超时（可能触发了长时间 SSE 操作）
   - 登录按钮直接点击不会跳转，需要用 fetch workaround
   - 已有对话有 12+ 轮深入讨论，可直接观察是否有 convergence CTA

4. **验证优先级**:
   - P0: `/api/crucible/thesis/trial-status` 是否返回正确额度
   - P0: `/api/crucible/thesis/generate` 是否能生成论文
   - P1: CTA 按钮是否在 convergence 后出现
   - P1: 论文 artifact 是否正确保存和导出
   - P2: Trial 额度从 2→1→0 的递减和超限拦截

## Previous Execution Notes

上一轮执行（记录在 `previous.report.md` — 实际上没有生成 report）也遇到了同样的问题：本地 dev 未启动 + agent-browser skill 无法加载。本轮执行确认：
1. staging 环境可用（HTTP 200）
2. agent-browser CLI 可用（v0.20.12）
3. 核心阻塞是 staging 部署缺少 thesis 路由，不是工具链问题
