🕐 Last updated: 2026-04-29 12:43 CST
🌿 Branch: MHSDC-DT

# 交接快照 | 2026-04-29（MHSDC-DT）

> 每次会话结束时覆盖写此文件，不累积。
> 新会话启动时第一个读此文件，读完立刻核对当前分支；如分支不一致，按跨分支 handoff 谨慎参考。

## 当前状态

| 项目 | 状态 |
|---|---|
| 分支 | `MHSDC-DT` |
| 最新 commit | `8bc6bdd` docs: HANDOFF 更新（**已 push** 2026-04-29 12:46） |
| 推送范围 | `060a8f1..8bc6bdd` 共 3 个 commit 已 push 到 origin/MHSDC-DT |
| 当前任务 | Distribution Terminal 一期落地中。Plan 14 个 Unit，已完成 **A1 + A2**（2/14） |
| 代码状态 | 干净，所有改动已 commit |
| 端口口令 | 前端 `5181`、后端 `3005/3008`、demo `8765` |

## ⚠️ 环境提示

- `.git` 文件指向 `/Users/luzhoua/DeliveryConsole-bk/`
- `.claude/skills/` 已加入 `.gitignore`（个人化 skill 目录，不入库）
- demo 启动：`python3 -m http.server 8765 --directory docs/03_ui/demo` 或 launch.json 的 `demo-static` 配置

## 本会话完成事项

### 文档层（commit ca3c297）

| 文档 | 状态 |
|---|---|
| `docs/02_design/distribution/prd_v1_distribution_terminal.md` | ✅ PRD v1 定稿（10 条核心决策 + 视觉规约） |
| `docs/02_design/distribution/code_reuse_map.md` | ✅ 代码资产复用图（🟢70/🟡20/🔴10） |
| `docs/plans/2026-04-27-001-feat-distribution-terminal-phase1-plan.md` | ✅ Plan v1.0（14 个外包友好 Unit） |
| `docs/03_ui/demo/{01_landing,02_edit,03_queue}.html + _shared.css` | ✅ Demo 三页（cream 主题） |
| `docs/02_design/distribution/_master.md` | ✅ 索引更新 + 模块改名 |
| `.claude/launch.json` | ✅ 加 demo-static 配置 |
| `.gitignore` | ✅ 排除 `.claude/skills/` |

### 代码层（commit a2e3ae5）

**Unit A1**（类型层契约）：
- `server/distribution-types.ts` 增字段：
  - `DistributionTaskAssets`: `materialGroupId`、`riskDelayEnabled`
  - `DistributionPlatformResult`: `backendUrl`、`errorCategory`、`attemptCount`、`nextRetryAt`
  - `DistributionTask`: `effectiveStartAt`、`attemptCount`
- 新增 4 个 `PlatformOverride<Twitter|WechatMp|Youtube|Bilibili>` 收紧类型
- 新增 `DistributionMaterialGroup` / `DistributionComposerSourcesV2` / `DistributionErrorCategory` / `DistributionPlatformReadyState` / `DistributionSupportedPlatform`
- 新增 `src/__tests__/server/distribution-types.test.ts`（17 个场景）

**Unit A2**（composer-sources V2）：
- `server/distribution-store.ts` 新增 `getDistributionComposerSourcesV2()`：按 longform/video 素材组返回
- 新增辅助函数 `buildLongformGroup`、`buildVideoGroup`、`findMarketingFile`、`slugifyGroupId`
- `server/distribution.ts` 路由 `/composer-sources` 支持 `?v=2` query 参数（V1 默认行为完全不变）
- 扩展 `src/__tests__/server/distribution-composer-sources.test.ts`（V1 旧 3 个 + V2 新 12 个）

### 验证结果

```
51 个 distribution 测试全过（6 套测试文件）
tsc --noEmit 0 error
分类提交原则遵守：治理文档 + 功能代码各 1 commit
```

## Plan 进度（14 Unit）

```
Phase A 后端骨架（4 unit）
  ✅ A1 类型扩展                    (commit a2e3ae5)
  ✅ A2 composer-sources V2         (commit a2e3ae5)
  ⬜ A3 重试策略按错误码分类
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

进度：**2 / 14（14%）**

## 下一步建议

按 Plan §14 关键路径，A1 完成后 A2/A3/A4 可以并行。但当前是单人推进，建议串行：

**下次会话起点：A3 重试策略按错误码分类**
- 文件：新建 `server/distribution-retry-policy.ts`、改 `server/distribution-execution-service.ts:160-282`
- 工作量：~1d
- 关键产物：`classifyError(error, status)` + `applyRetryPolicy(category, attempt)` 两个纯函数
- 测试：`src/__tests__/server/distribution-retry-policy.test.ts` 至少 11 场景

## 阻塞项 / 待决策

- [x] ~~两个未 push 的 commit~~ → 已 push（2026-04-29 12:46）
- [ ] 4 平台环境变量（`X_API_KEY`、`WECHAT_MP_APP_ID`、`BILIBILI_COOKIE` 等）需老卢提供，B1/B2/B3 实施时才用得上

## 📍 下次新窗口接续指引（重要）

老卢确认下次开新窗口干 A3。新会话第一句话用：

> 老杨 接 docs/dev_logs/HANDOFF.md 干 A3

OldYang skill 会自动按 §最小接管顺序读这份 HANDOFF + Plan 切到 A3 起点。无需重新解释上下文。

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
3. `git log --oneline -3` 确认最新 2 个 commit 在
4. 读 `docs/plans/2026-04-27-001-feat-distribution-terminal-phase1-plan.md` §9 Phase A Unit A3
5. 启动 A3：建 `server/distribution-retry-policy.ts`
