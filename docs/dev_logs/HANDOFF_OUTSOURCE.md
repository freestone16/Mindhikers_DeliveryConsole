# 📦 Distribution Terminal — 外包团队接手手册

> **本文件用途**：外包团队进场后第一份必读文档。把"在哪里看实施手册 / 现在做到哪 / 下一步做什么 / 怎么验收"四件事一次说清。
>
> **作者**：老杨（OldYang）｜**最后更新**：2026-04-30｜**分支**：`MHSDC-DT`｜**最新 commit**：`a8fb3bb`

---

## §0 30 秒总览

- **项目**：MindHikers Distribution Terminal（独立创作者发布到 X / 微信公众号 / YouTube / B 站 4 平台）
- **当前阶段**：Phase A 后端骨架已完成 3/4，剩 **A4 + 全部 B/C/D 共 11 个 Unit** 等开发
- **代码状态**：干净，所有改动已 commit + push 到 `origin/MHSDC-DT`
- **测试基线**：7 测试文件 85 测试全过 / `tsc --noEmit` 0 error
- **总估期**：单人串行 ~24 天 / 2 人并行 ~14 天 / 3 人并行 ~10 天

---

## §1 实施手册（**必读**，按顺序读）

> 所有路径相对项目根 `/Users/luzhoua/MHSDC/Distribution Terminal/`。

| # | 文档 | 路径 | 作用 | 读法 |
|---|---|---|---|---|
| 1 | **Plan SSOT（最重要）** | `docs/plans/2026-04-27-001-feat-distribution-terminal-phase1-plan.md` | 14 个 Unit 的完整实施手册（每个 Unit 含 Goal / Files / Approach / Test scenarios / Verification） | **§0 整章先读完**（环境/术语/规范），再按你领走的 Unit 跳到 §9 对应小节 |
| 2 | PRD v1 | `docs/02_design/distribution/prd_v1_distribution_terminal.md` | 产品决策（10 条核心决策 + 视觉规约）。**已定稿，不再讨论 product** | 通读 1 次建立产品共识 |
| 3 | 代码资产复用图 | `docs/02_design/distribution/code_reuse_map.md` | 70% 代码已存在。这份图列出每文件复用度（🟢70/🟡20/🔴10），告诉你哪里可以照搬、哪里要小心改造 | 领到 Unit 时定向查 |
| 4 | 视觉 Demo（3 页 HTML） | `docs/03_ui/demo/{01_landing,02_edit,03_queue}.html` + `_shared.css` | Phase C 前端三大页的视觉真值，**照着复刻即可** | C 阶段必读 |
| 5 | 设计索引 | `docs/02_design/distribution/_master.md` | 设计文档目录页 | 想查具体设计文档时用 |
| 6 | 项目快速理解 | Plan §0.1-0.7 | 工作流 / 技术栈 / 启动命令 / 目录约定 / 代码规范 / PR 流程 | **第一天必读** |
| 7 | OSS 借鉴策略 | `docs/plans/2026-03-22_Distribution_OSS_Borrowing_Map.md` | B 站 connector 走 Playwright 的源头依据 | B3 必读 |
| 8 | 内部交接快照 | `docs/dev_logs/HANDOFF.md` | 老杨内部 handoff（已完成 Unit 的细节） | 接 A4 时快速对齐 |

**领到一个 Unit 后的标准查阅顺序**：
```
Plan §0（项目快速理解） → Plan §9 对应 Unit 小节 → code_reuse_map.md（看你要改的文件复用度） → 直接编码
```

---

## §2 进度总览

### Plan 14 Unit 进度表

```
Phase A 后端骨架（4 unit）
  ✅ A1 类型扩展                  commit a2e3ae5
  ✅ A2 composer-sources V2       commit a2e3ae5
  ✅ A3 重试策略按错误码分类      commit 0ea31d8
  ⬜ A4 定时调度器 + 风控延时改造  ← 下一个开工点

Phase B Connector（4 unit）— 全部待开发
  ⬜ B1 X 真直发                  依赖 A1
  ⬜ B2 微信公众号真草稿 API      依赖 A1
  ⬜ B3 B 站 connector (Playwright) 依赖 A1
  ⬜ B4 dispatch 整合              依赖 B1+B2+B3

Phase C 前端（4 unit）— 全部待开发
  ⬜ C1 前端骨架 + 共享组件        依赖 A1
  ⬜ C2 项目分发台主页             依赖 A2+A4+C1
  ⬜ C3 单卡编辑页                 依赖 A1+C1
  ⬜ C4 队列页重做                 依赖 A3+C1

Phase D 联调（3 unit）— 全部待开发
  ⬜ D1 4 平台 OAuth 端到端        依赖 B1-B4
  ⬜ D2 端到端发布闭环验收         依赖 C2-C4 + D1
  ⬜ D3 文档与运维收尾             依赖 D2
```

**进度**：**3 / 14（21%）**

### 关键路径

```
A1 → (A2/A3/A4 并行) → (B1/B2/B3 并行 + C1) → (C2/C3/C4 并行) → D1 → D2 → D3
              ↑ 当前卡在这里（A4 未完成）
```

---

## §3 已完成 Unit 的契约（外包必看，影响你的下游 Unit）

### ✅ A1：类型扩展（commit a2e3ae5）

新增/扩展的契约位于 `server/distribution-types.ts`，**所有 B/C 阶段的 Unit 都依赖这些类型**：

- `DistributionTaskAssets` 增字段：`materialGroupId`、`riskDelayEnabled`
- `DistributionPlatformResult` 增字段：`backendUrl`、`errorCategory`、`attemptCount`、`nextRetryAt`
- `DistributionTask` 增字段：`effectiveStartAt`、`attemptCount`
- 新增 4 个平台 override：`PlatformOverrideTwitter` / `PlatformOverrideWechatMp` / `PlatformOverrideYoutube` / `PlatformOverrideBilibili`
- 新增 `DistributionMaterialGroup` / `DistributionComposerSourcesV2` / `DistributionErrorCategory` / `DistributionPlatformReadyState` / `DistributionSupportedPlatform`

**测试**：`src/__tests__/server/distribution-types.test.ts`（17 场景）。

### ✅ A2：composer-sources V2（commit a2e3ae5）

`server/distribution-store.ts` 新增 `getDistributionComposerSourcesV2()`，按 longform / video 素材组返回。

路由约定：
```
GET /distribution/composer-sources?projectId=X         → V1（旧客户端兼容）
GET /distribution/composer-sources?projectId=X&v=2     → V2（新前端用）
```

**C2（项目分发台主页）必须使用 V2**。

**测试**：`src/__tests__/server/distribution-composer-sources.test.ts`（V1 旧 3 个 + V2 新 12 个）。

### ✅ A3：重试策略分类（commit 0ea31d8）

新增 `server/distribution-retry-policy.ts`，导出：

```ts
classifyError(error: unknown, httpStatus?: number): DistributionErrorCategory
applyRetryPolicy(category, attemptCount, policy?): { shouldRetry, delayMs? }
computeNextRetryAt(delayMs, now?): string  // ISO 8601
defaultRetryPolicy: RetryPolicyConfig       // K3 表默认值
```

错误分类规则（详见 Plan §6 K3 表）：

| HTTP / 错误特征 | category | 重试? | 延迟（attempt 1/2/3） |
|---|---|---|---|
| 401 / 403 | `4xx_auth` | ❌ | - |
| 422 | `4xx_content` | ❌ | - |
| 429 | `4xx_rate_limit` | ✅ | 60s / 5m / 15m |
| 5xx | `5xx_server` | ✅ | 5s / 15s / 1m |
| ETIMEDOUT/ECONNREFUSED/fetch failed | `network` | ✅ | 3s / 10s / 30s |
| 其它 / null | `unknown` | ✅ | 10s / 30s / 1m |

**execution-service 的关键钩子**：

```ts
// server/distribution-execution-service.ts
import { setAutoRetryScheduler, scheduleAutoRetry } from './distribution-execution-service';

setAutoRetryScheduler((task, delayMs) => {
  // A4 在这里注入实际的 setTimeout 调度器
});
```

**A4 单元必须使用此钩子，不要另起调度路径。**

**B1/B2/B3 connector 实施者注意**：
- connector 抛 Error 时，请把 HTTP 响应的 `status` 字段挂在 Error 上（如 `Object.assign(new Error(msg), { status: 429 })`），让 `classifyError` 能读到
- 或在返回的 `DistributionPlatformResult` 里直接写 `errorCategory: '4xx_auth'`（更精确）
- B1/B2/B3 实施者根据各平台真实响应**可以微调 K3 边界**（例如 422 算 content 还是 auth）

**测试**：`src/__tests__/server/distribution-retry-policy.test.ts`（26 场景）+ `distribution-execution-service.test.ts`（17 场景，含 8 个分类场景）。

---

## §4 14 个 Unit 实施手册定位（点对点跳转）

| Unit | Plan 章节 | 估期 | 前置 | 关键文件 |
|---|---|---|---|---|
| ✅ A1 | §9 Phase A · A1 | 0.5d | - | `server/distribution-types.ts` |
| ✅ A2 | §9 Phase A · A2 | 1.5d | A1 | `server/distribution-store.ts` |
| ✅ A3 | §9 Phase A · A3 | 1d | A1 | `server/distribution-retry-policy.ts` |
| ⬜ **A4** | §9 Phase A · A4 | 1.5d | A1+A3 | `server/distribution-scheduler.ts`（新建）+ `distribution-queue-service.ts` |
| ⬜ B1 | §9 Phase B · B1 | 2d | A1 | `server/connectors/x-connector.ts` |
| ⬜ B2 | §9 Phase B · B2 | 2.5d | A1 | `server/connectors/wechat-mp-connector.ts` |
| ⬜ B3 | §9 Phase B · B3 | 3d | A1 | `server/connectors/bilibili-connector.ts`（新建，Playwright） |
| ⬜ B4 | §9 Phase B · B4 | 0.5d | B1-B3 | `server/distribution-execution-service.ts` |
| ⬜ C1 | §9 Phase C · C1 | 1d | A1 | `src/components/distribution-terminal/`（新建子目录） |
| ⬜ C2 | §9 Phase C · C2 | 3d | A2+A4+C1 | `src/components/distribution-terminal/DistributionTerminalHome.tsx` |
| ⬜ C3 | §9 Phase C · C3 | 3d | A1+C1 | `src/components/distribution-terminal/CardEditor.tsx` |
| ⬜ C4 | §9 Phase C · C4 | 2d | A3+C1 | `src/components/distribution-terminal/QueueView.tsx` |
| ⬜ D1 | §9 Phase D · D1 | 1.5d | B1-B4 | OAuth 联调（4 平台） |
| ⬜ D2 | §9 Phase D · D2 | 1d | C2-C4+D1 | 端到端验收 |
| ⬜ D3 | §9 Phase D · D3 | 1d | D2 | 文档与运维 |

> 每个 Unit 的 Plan 小节都包含 **Goal / Requirements / Dependencies / Files / Approach / Patterns to follow / Test scenarios / Verification** 8 个标准段落。Approach 是高层级思路，**外包实施者可在 Approach 范围内自决具体函数签名**。

---

## §5 启动开发环境

```bash
# 1. 拉代码
git clone <repo-url>
cd "Distribution Terminal"
git checkout MHSDC-DT
git pull

# 2. 装依赖
npm install

# 3. 启动开发（前端 + 后端并行）
npm run dev
# 前端：http://localhost:5181
# 后端：http://localhost:3005

# 4. 跑测试（对齐基线 85 测试全过）
npm run test:run

# 5. 类型检查
npx tsc --noEmit
```

**端口口令**（禁用其它端口避免冲突）：
- 前端：`5181`
- 后端：`3005`（dev）/ `3008`（生产）
- demo 静态站：`8765`（`python3 -m http.server 8765 --directory docs/03_ui/demo`）

---

## §6 环境变量清单（**等老卢提供**）

`.env` 在 git 之外。开工前 PM 找老卢索取以下值：

| 变量 | 用途 | 用到的 Unit |
|---|---|---|
| `PROJECTS_BASE` | 项目素材根目录绝对路径 | A2 / C2 / 全部 connector |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REDIRECT_URI` | YouTube OAuth | D1（YouTube 已有现成实现） |
| `X_API_KEY` / `X_API_SECRET` / `X_BEARER_TOKEN` | X / Twitter API v2 | B1 / D1 |
| `WECHAT_MP_APP_ID` / `WECHAT_MP_APP_SECRET` | 微信公众号 API | B2 / D1 |
| `BILIBILI_COOKIE` | B 站 SESSDATA + bili_jct | B3 / D1 |

---

## §7 PR 与分支规范

- **每个 Unit = 一个分支 + 一个 PR**
- 分支命名：`feat/dt-phase<X>-unit<N>-<short-name>`，例如 `feat/dt-phaseA-unit4-scheduler`
- PR 标题：`feat(dt): [A4] 定时调度器 + 风控延时改造`
- PR 描述必须包含：
  1. 关联的 Unit 编号 + Plan 章节
  2. 修改的文件清单
  3. Test scenarios 验证截图/日志
  4. Verification 章节的勾选状态
- **强制门禁**：
  - `npm run lint` ✅
  - `npm run test:run` ✅（至少不破坏 85 测试基线）
  - `npx tsc --noEmit` 0 error
- **不允许合并到 `main`**，必须合并到 `MHSDC-DT` 分支

---

## §8 Definition of Done（验收标准）

每个 Unit 合并前必须满足：

- [ ] Plan 中该 Unit 的 **Test scenarios 全场景**有对应测试代码且全过
- [ ] Plan 中该 Unit 的 **Verification 章节**所有项可勾选
- [ ] `npm run lint` 通过
- [ ] `npm run test:run` 不破坏现有基线
- [ ] `npx tsc --noEmit` 0 error
- [ ] 视觉类 Unit（C 阶段）：与 demo HTML 视觉差异 ≤ 5%
- [ ] PR description 完整

---

## §9 项目目录约定（A2 / connector 用得到）

每个用户项目目录下，分发相关子目录：

```
${PROJECTS_BASE}/<projectId>/
├── 02_Script/                    # 长文素材（写作大师产出，*.md）
│   └── *.md                      # 含封面图 *.png 同名同目录
├── 04_Video/                     # 长视频成片（影视导演 P4 产出）
│   └── *.mp4
├── 05_Marketing/                 # 平台文案（市场大师产出）
│   ├── youtube.md / bilibili.md / x.md / wechat_mp.md
└── 06_Distribution/              # 分发系统数据（**程序写**，禁止用户编辑）
    ├── queue.json / history.json / auth.json
    └── outbound/<platform>/      # 落盘的发布物料
```

---

## §10 关键产品语义（必须理解，不然 UI 会做错）

**草稿态 (`draft_ready`) ≠ 已发布 (`published`)**

- 公众号 API 仅支持创建草稿（`/cgi-bin/draft/add`），群发要登录公众号后台手动点
- B 站投稿后要等审核

UI 上必须**强提示**用户去后台完成最后一步（橙色草稿徽章 + 「打开后台」按钮，对应 `DistributionPlatformResult.backendUrl`）。

详见 PRD §3 "状态机" 与 demo `03_queue.html`。

---

## §11 已知风险与延后决策（B/C 阶段实施者注意）

| 问题 | 处理方式 |
|---|---|
| X 是否做线程拆分（>280 字符自动切多推） | **B1 实施者**跑一次 X API 实测决定 |
| 公众号 IP 白名单配置 | 部署阶段（D2）由老卢提供运营服务器 IP |
| B 站 cookie 寿命 | 实测，**D2** 跑 cookie 注入后观察 7-14 天再固化 |
| 是否实现 dryRun 模式 | 一期推迟。如调试困难可单独提需求 |
| 重试策略 HTTP 错误码边界（如 422 算 content 还是 auth） | **B1/B2/B3 实施者**根据各平台真实响应调整 K3 表 |
| `.git` 文件指向 `/Users/luzhoua/DeliveryConsole-bk/`（迁移历史） | git 操作失败时先看 `.git` 文件内容 |

---

## §12 技术决策快查（K1-K8）

| # | 决策 | 备注 |
|---|---|---|
| K1 | B 站 connector 走 Playwright（cookie 注入式） | 见 OSS 借鉴策略文档 |
| K2 | 公众号封面图分两步（先 `/material/add_material` 换 media_id） | 微信 API 强制 |
| K3 | **重试策略可配置 + 默认按错误码分类** | 已在 A3 落地 |
| K4 | 定时发布存 UTC ISO 8601，前端按用户本地时区显示 | A4 实施时遵守 |
| K5 | 新前端用文件级路由（不引入 React Router） | C1 实施时遵守 |
| K6 | 风控延时改为「即时发布也支持延时 + 用户可关」 | A4 实施时遵守 |
| K7 | Connector 测试用 nock 拦截 HTTP | B 阶段必须遵守 |
| K8 | Phase 发布顺序 A → B / C 并行 → D | 不可绕过 |

详见 Plan §6。

---

## §13 沟通节奏

- 每个 Unit 完成后 → 开 PR + demo 录屏
- 每周 1 次 sync → 覆盖该周完成的 Unit + blocker
- 任何 Unit 有 architectural change（偏离本计划）→ **必须先在 PR description 写 RFC 等审批**

---

## §14 推荐人力分配

- **A 阶段**（剩 A4）：分给最熟悉项目的 1 位高级开发，**串行执行**（契约层稳定优先）
- **B 阶段**（4 unit）：3 个 connector 互相独立，可分给 3 位开发并行；B4 收尾给原 dispatch 熟手
- **C 阶段**（4 unit）：C1 先行做骨架，C2/C3/C4 可 3 人并行
- **D 阶段**（3 unit）：必须串行，建议由 1 位资深开发负责验收和文档

**总估期**：单人串行 ~24 天 / 2 人并行 ~14 天 / 3 人并行 ~10 天（受 D 阶段串行限制）

---

## §15 立刻开工清单（PM 第一天的事）

1. ☐ 找老卢拿 §6 的环境变量清单
2. ☐ clone 仓库 + checkout `MHSDC-DT` + `npm install` + `npm run test:run`（确认 85 测试基线）
3. ☐ 通读 Plan §0 整章 + PRD v1
4. ☐ 浏览 demo 三页（`docs/03_ui/demo/01_landing.html` 等）建立视觉共识
5. ☐ 把 14 个 Unit 转成 Linear / Jira 工单（可参考 Plan §14 表）
6. ☐ 按 §14 推荐人力分配领走 A4 第一个开发者
7. ☐ 与老杨 / 老卢约定每周 sync 时间

---

**文档归属**：本 HANDOFF 由老杨（OldYang）维护，每完成一个 Unit 后由老杨更新进度。外包团队不直接修改本文件——有问题在 PR / sync 中提出。
