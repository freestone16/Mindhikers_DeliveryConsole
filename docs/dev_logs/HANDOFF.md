🕐 Last updated: 2026-04-30 CST
🌿 Branch: MHSDC-DT

# 交接快照 | 2026-04-30（MHSDC-DT）

> 每次会话结束时覆盖写此文件，不累积。
> 新会话启动时第一个读此文件，读完立刻核对当前分支；如分支不一致，按跨分支 handoff 谨慎参考。

## 当前状态

| 项目 | 状态 |
|---|---|
| 分支 | `MHSDC-DT` |
| 最新 commit | `0ea31d8` feat(dt): [A3] 重试策略按错误码分类 + scheduleAutoRetry 钩子 |
| 推送范围 | ⚠️ A3 commit `0ea31d8` **未 push**，需要 `git push origin MHSDC-DT` |
| 当前任务 | Distribution Terminal 一期落地中。Plan 14 个 Unit，已完成 **A1 + A2 + A3**（3/14） |
| 代码状态 | 干净，所有改动已 commit |
| 端口口令 | 前端 `5181`、后端 `3005/3008`、demo `8765` |

## ⚠️ 环境提示

- `.git` 文件指向 `/Users/luzhoua/DeliveryConsole-bk/`
- `.claude/skills/` 已加入 `.gitignore`（个人化 skill 目录，不入库）
- demo 启动：`python3 -m http.server 8765 --directory docs/03_ui/demo` 或 launch.json 的 `demo-static` 配置

## 本会话完成事项（A3）

### 代码层（commit 0ea31d8）

**Unit A3**（重试策略按错误码分类）：

新增 `server/distribution-retry-policy.ts`：
- `classifyError(error, httpStatus?)` → `DistributionErrorCategory`
  - 401/403 → `4xx_auth`
  - 422 → `4xx_content`
  - 429 → `4xx_rate_limit`
  - 5xx → `5xx_server`
  - ETIMEDOUT/ECONNREFUSED/ENOTFOUND/AbortError/"fetch failed" → `network`
  - 其它 → `unknown`
  - 输入 null/undefined 不抛错
- `applyRetryPolicy(category, attemptCount, policy?)` → `{ shouldRetry, delayMs? }`
  - 查 K3 表，attemptCount 超出 delaysMs 长度即停
- `defaultRetryPolicy` 落 K3 详表的默认值
- `computeNextRetryAt(delayMs, now?)` 算 ISO 8601

改 `server/distribution-execution-service.ts`：
- `buildFailureResult` 写入 `errorCategory`
- 新增 `annotateRetryMetadata` 给失败结果补 `attemptCount` + `nextRetryAt`
- `markDistributionTaskRunning` 自增 `task.attemptCount`
- `executeDistributionTask` 终态分流：
  - 全部成功 → `succeeded`
  - 失败但 category 含 unknown/5xx_server/network/4xx_rate_limit 且未达 maxAttempts → `retryable`
  - 失败但全部 4xx_auth/4xx_content → `failed`（直接终止）
- 新增 `setAutoRetryScheduler(fn)` / `scheduleAutoRetry(task, delayMs)` 钩子
  - A3 只暴露接口，默认 no-op
  - A4 单元会注入基于 setTimeout 的实际调度器
  - retryable 任务执行结束后会以失败平台中**最小 delayMs** 调度

新增 `src/__tests__/server/distribution-retry-policy.test.ts`（26 个场景）：
- classifyError × 12（401/403/422/429/500/503/网络/null/嵌套 response）
- applyRetryPolicy × 11（K3 表全覆盖 + 边界）
- 集成 + computeNextRetryAt × 3

扩 `src/__tests__/server/distribution-execution-service.test.ts`（+9 场景）：
- 不支持平台 → unknown 分类 + nextRetryAt
- 单一 401 → task.status='failed'
- 401 + 503 混合 → task.status='retryable'
- 429 attempt=2 → 5min delay
- 多失败时 scheduleAutoRetry 取最小 delay (5_000)
- 全 non-retryable 时不调度
- scheduleAutoRetry 无注入时 no-op
- markDistributionTaskRunning 自增 attemptCount

### 验证结果

```
85 个 distribution 测试全过（7 套测试文件）
  - distribution-composer-sources.test.ts
  - distribution-execution-service.test.ts (9 → 17)
  - distribution-queue-service.test.ts
  - distribution-retry-policy.test.ts (新增, 26)
  - distribution-sse.test.ts
  - distribution-store.test.ts
  - distribution-types.test.ts
tsc --noEmit 0 error
```

## Plan 进度（14 Unit）

```
Phase A 后端骨架（4 unit）
  ✅ A1 类型扩展                    (commit a2e3ae5)
  ✅ A2 composer-sources V2         (commit a2e3ae5)
  ✅ A3 重试策略按错误码分类        (commit 0ea31d8) ← 本次
  ⬜ A4 定时调度器 + 风控延时改造

Phase B Connector（4 unit）
  ⬜ B1 X 真直发
  ⬜ B2 微信公众号真草稿 API
  ⬜ B3 B站 connector (Playwright)
  ⬜ B4 dispatch 整合

Phase C 前端（4 unit）
  ⬜ C1 前端骨架 + 共享组件
  ⬜ C2 项目分发台主页
  ⬜ C3 单卡编辑页
  ⬜ C4 队列页重做

Phase D 联调（3 unit）
  ⬜ D1 OAuth 端到端
  ⬜ D2 闭环验收
  ⬜ D3 文档收尾
```

进度：**3 / 14（21%）**

## 下一步建议

按 Plan §14 关键路径，下一个推进点是 **A4 定时调度器 + 风控延时改造**。

**下次会话起点：A4 定时调度器 + 风控延时改造**
- 文件：新建 `server/distribution-scheduler.ts`、改 `server/distribution-queue-service.ts:3-35`、改 `server/index.ts`、改 `server/distribution.ts`
- 工作量：~1.5d
- 关键产物：
  1. `createDistributionTask` 输入加 `riskDelayEnabled?: boolean`，计算 `effectiveStartAt`
  2. scheduler 模块：每秒 tick 扫 task.effectiveStartAt 到点 → 触发 execute
  3. scheduler 注入到 A3 的 `setAutoRetryScheduler` 钩子，实现 setTimeout 重试
  4. 可选 `POST /queue/:taskId/reschedule` 端点
- 测试：`src/__tests__/server/distribution-scheduler.test.ts`

A3 已经为 A4 准备好钩子（`setAutoRetryScheduler`），A4 只需注入 setTimeout 实现即可。

## 阻塞项 / 待决策

- [ ] **A3 commit 0ea31d8 未 push**（下次会话开始或继续推进 A4 前需要 `git push origin MHSDC-DT`）
- [ ] 4 平台环境变量（`X_API_KEY`、`WECHAT_MP_APP_ID`、`BILIBILI_COOKIE` 等）需老卢提供，B1/B2/B3 实施时才用得上
- [ ] git config user.name/email 当次提交用了默认 identity（参见 commit author），如需统一可执行 `git commit --amend --reset-author` 或在下次 commit 前修正

## 📍 下次新窗口接续指引（重要）

老卢确认下次开新窗口干 A4。新会话第一句话用：

> 老杨 接 docs/dev_logs/HANDOFF.md 干 A4

OldYang skill 会自动按 §最小接管顺序读这份 HANDOFF + Plan 切到 A4 起点。无需重新解释上下文。

## 关键文档（按重要性）

1. `docs/plans/2026-04-27-001-feat-distribution-terminal-phase1-plan.md` — **Plan SSOT，下次会话起点**
2. `docs/02_design/distribution/prd_v1_distribution_terminal.md` — PRD v1
3. `docs/02_design/distribution/code_reuse_map.md` — 代码复用图
4. `docs/03_ui/demo/` — 视觉规范

## 环境信息

```bash
工作目录: /Users/luzhoua/MHSDC/Distribution Terminal
PROJECTS_BASE=/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects
后端端口: 3008（生产）/ 3005（dev）
前端端口: 5181
demo 端口: 8765
主 git repo: /Users/luzhoua/DeliveryConsole-bk
```

## 下次会话第一步

1. 读本文件
2. `git branch --show-current` 确认在 `MHSDC-DT`
3. `git log --oneline -4` 确认 A3 commit `0ea31d8` 在
4. **先 push**：`git push origin MHSDC-DT`（A3 commit 还没推上去）
5. 读 `docs/plans/2026-04-27-001-feat-distribution-terminal-phase1-plan.md` §9 Phase A Unit A4
6. 启动 A4：建 `server/distribution-scheduler.ts`，把实际调度器注入 A3 留好的 `setAutoRetryScheduler` 钩子
