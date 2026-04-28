---
title: Distribution Terminal · 代码资产复用图
version: v1.0
date: 2026-04-27
companion_to: prd_v1_distribution_terminal.md
---

# Distribution Terminal · 代码资产复用图

> 配套 [`prd_v1_distribution_terminal.md`](./prd_v1_distribution_terminal.md) 的实现侧速查表。
> 目的：让 ce-plan 阶段不必再扫一遍代码，直接知道每个需求落在哪个文件、是 🟢 直接复用 / 🟡 改造 / 🔴 新建。

---

## 目录

1. [总览：三档复用比例](#1-总览三档复用比例)
2. [后端资产](#2-后端资产)
3. [前端资产](#3-前端资产)
4. [测试资产](#4-测试资产)
5. [改造路径建议](#5-改造路径建议)
6. [风险与坑](#6-风险与坑)

---

## 1. 总览：三档复用比例

| 档位 | 比例 | 含义 |
|---|---|---|
| 🟢 **直接复用** | ~70% | 文件不动 / 改 ≤ 5 行，仅补字段或拼装 |
| 🟡 **改造复用** | ~20% | 保留接口 / 类型 / 部分实现，需要重写其中一段逻辑 |
| 🔴 **新建** | ~10% | 当前没有，从零写 |

---

## 2. 后端资产

### 2.1 类型系统（🟢 直接复用）

| 文件 | 行数 | 状态 | 说明 |
|---|---|---|---|
| `server/distribution-types.ts` | 191 | 🟢 | **PRD 核心语义都在这里**：`deliveryMode: 'published'/'draft_ready'/'artifact_ready'`、`PlatformAuthStatus.draft_ready`、`platformOverrides`、`systemDelayMs`、retry 状态机、SSE 事件类型 |

**关键发现**：草稿态（`draft_ready`）的类型定义已存在第 73 行，意味着 PRD 决策 D3 的语义层是已实现现实，只需前端把它显眼化。

**需要扩展的字段**：
- `DistributionTaskAssets` 需新增公众号专用字段（`summary`、`coverImagePath`、`commentEnabled`、`rewardEnabled`）
- `DistributionTaskAssets` 需新增 B站专用字段（`copyright`、`tid`、`noReprint`、`chargeMode`、`dolby`、`hires`、`dtime`）
- `DistributionTaskAssets` 需新增 X 专用字段（`replySettings`、`communityUrl`、`madeWithAi`、`paidPartnership`）
- 新增 `DistributionTaskAssets.materialGroup`（标识素材组归属）

### 2.2 路由与 API（🟢 直接复用，端点不变）

| 端点 | 文件位置 | 状态 | PRD 对应需求 |
|---|---|---|---|
| `GET /distribution/auth/status` | `server/distribution.ts:44` | 🟢 | R1.5 健康条、R6.5 状态显示 |
| `GET /distribution/auth/url` | `server/distribution.ts:60` | 🟢 | R6.* OAuth 流程入口（仅 YouTube 实现） |
| `POST /distribution/auth/refresh` | `server/distribution.ts:78` | 🟢 | R6.5 刷新 |
| `POST /distribution/auth/revoke` | `server/distribution.ts:92` | 🟢 | R6 解绑 |
| `GET /distribution/queue` | `server/distribution.ts:106` | 🟢 | R4.* 队列展示 |
| `GET /distribution/events` (SSE) | `server/distribution.ts:126` | 🟢 | R4.1 实时推送 |
| `POST /distribution/queue/create` | `server/distribution.ts:135` | 🟢 | R3.4 入队 |
| `DELETE /distribution/queue/:taskId` | `server/distribution.ts:172` | 🟢 | R4.6 删除 |
| `POST /distribution/queue/:taskId/retry` | `server/distribution.ts:202` | 🟢 | R5.3 手动重试 |
| `POST /distribution/queue/:taskId/execute` | `server/distribution.ts:231` | 🟢 | R3.4 立即执行 |
| `GET /distribution/assets` | `server/distribution.ts:317` | 🟢 | 素材列表 |
| `GET /distribution/composer-sources` | `server/distribution.ts:335` | 🟡 | R1.1 自动扫描——**需扩展为返回多素材分组** |
| `GET /distribution/history` | `server/distribution.ts:354` | 🟢 | 历史记录 |

### 2.3 服务层（混合）

| 文件 | 行数 | 状态 | 改造说明 |
|---|---|---|---|
| `server/distribution-store.ts` | 478 | 🟢 | 队列/历史/composer-sources 存储完整 |
| `server/distribution-events.ts` | 72 | 🟢 | SSE 广播完整 |
| `server/distribution-queue-service.ts` | 78 | 🟢 | 入队 / 删除 / 重试封装 |
| `server/distribution-execution-service.ts` | 304 | 🟡 | 执行流程已就绪。**需改造**：重试策略当前是简化版，要扩展为按 HTTP 错误码分类（401 不重试 / 429 递增 / 5xx 立即） |
| `server/distribution-auth-service.ts` | 176 | 🟢 | 4 平台账号状态 CRUD 完整 |
| `server/distribution.ts` (路由聚合) | 370 | 🟢 | 路由层完整 |

### 2.4 平台 connector（核心改造点）

| 文件 | 当前 deliveryMode | 状态 | 改造内容 |
|---|---|---|---|
| `server/connectors/youtube-connector.ts` | `published` | 🟢 | **唯一一个真直发能跑的 connector**。OAuth + publishAt 调度都已实现 |
| `server/connectors/wechat-mp-connector.ts` | `draft_ready` | 🟡 | 当前**只生成 payload 写本地文件**，没真正调微信 API。需补：1) 上传封面到素材库换 thumb_media_id；2) 调 `/cgi-bin/draft/add` |
| `server/connectors/x-connector.ts` | `artifact_ready` | 🟡 | 当前**写本地 JSON 当假发布**，需升级为真 OAuth + POST tweets API 的真直发（`buildXPayload` 字段构造逻辑可保留） |
| `server/connectors/bilibili-connector.ts` | （不存在） | 🔴 | 完全新建。选型在 PRD §9.1 待决（biliup-rs 子进程 / playwright cookie / 直接 HTTP） |

---

## 3. 前端资产

### 3.1 现有组件

| 文件 | 行数 | 状态 | 说明 |
|---|---|---|---|
| `src/components/PublishComposer.tsx` | 631 | 🟡 | 当前是「自由选片→勾平台→发」风格。**保留为 Beta 旁路入口**，主战场新建项目分发台。可复用其内部对 `/composer-sources` 的调用、字段表单、SSE 订阅 hook |
| `src/components/DistributionQueue.tsx` | 722 | 🟡 | SSE/状态机/筛选都对，**视觉规约要按 demo 03 重做**（草稿态橙左边线 / 已发布蓝左边线 / 「打开后台」按钮） |
| `src/components/AccountsHub.tsx` | （未读） | 🟡 | 现存组件，可改造为「管理账号」详情页（健康条点击进入） |

### 3.2 现有平台清单需收敛

`PublishComposer.tsx:36` 的 `AVAILABLE_PLATFORMS` 当前 8 个：
```
twitter, youtube_shorts, youtube, bilibili, douyin, wechat_video, weibo, wechat_mp
```

**改造**：UI 层只显示 4 个（twitter / youtube / wechat_mp / bilibili）。其余 4 个不删除代码，加 `hidden: true` 标志。这样保留二期扩展能力。

### 3.3 需新建的组件（基于 demo 三页）

| 新组件 | 来源 demo | 复用 hook/API |
|---|---|---|
| `DistributionTerminalHome` | `01_landing.html` | `/composer-sources` (扩展)、`/auth/status`、`/queue` 摘要、SSE |
| `DistributionTerminalCard` | `01_landing.html` 卡片 | 4 状态：ready / disabled / published / draft |
| `MaterialGroupBlock` | `01_landing.html` 素材组 | composer-sources 返回的素材组结构 |
| `HealthStrip` | `01_landing.html` 顶部 | `/auth/status` |
| `QueueSummaryPanel` | `01_landing.html` 右栏 | `summarizeQueue` |
| `PublishCardEditor` | `02_edit.html` | `platformOverrides` 字段 |
| `PlatformAdvancedFields.X / .WechatMp / .YouTube / .Bilibili` | `02_edit.html` 折叠区 | 各平台字段定义（PRD §5） |
| `DraftModeBanner` | `02_edit.html` 草稿态横幅 | 静态 UI |
| `RiskDelayToggle` | `02_edit.html` 风控开关 | task.systemDelayMs |
| `BottomActionBar` | `01_landing.html` 底部 | 选择状态 + 立即/定时按钮 |
| `ScheduleModal` (改造现有) | `02_edit.html` 定时弹窗 | 复用 `src/components/ScheduleModal.tsx` |

---

## 4. 测试资产（🟢 全保留）

后端有 5 套测试覆盖（694 行），改造时这是最重要的安全网。

| 文件 | 行数 | 覆盖范围 |
|---|---|---|
| `src/__tests__/server/distribution-store.test.ts` | 167 | 队列/历史持久化 |
| `src/__tests__/server/distribution-execution-service.test.ts` | 252 | 执行流程 + 重试 + 失败处理 |
| `src/__tests__/server/distribution-queue-service.test.ts` | 85 | 入队/删除/重试 |
| `src/__tests__/server/distribution-sse.test.ts` | 92 | SSE 广播 |
| `src/__tests__/server/distribution-composer-sources.test.ts` | 98 | composer-sources 扫描 |

**改造时纪律**：
- 测试不动：意味着 store/queue-service/execution-service/events 的对外契约不能变
- composer-sources 测试**会变**：因为要扩展返回素材组结构，对应测试需更新

---

## 5. 改造路径建议

### 5.1 推荐分批顺序（含风险）

**Batch 1：后端骨架收口**（低风险，改动有限）
1. 扩展 `DistributionTaskAssets` 类型增补各平台字段
2. 扩展 `composer-sources` 返回素材组分组结构
3. 扩展重试策略为错误码分类版

**Batch 2：connector 升级**（中风险，依赖外部 API）
1. X connector 升级为真 OAuth + POST tweets
2. 公众号 connector 补上 thumb_media_id 上传 + draft/add 真调用
3. 决议 B站 connector 选型 → 实现

**Batch 3：前端重组**（中风险，可视化变化大）
1. 新建 `DistributionTerminalHome` 主页（demo 01 落地）
2. 新建 `PublishCardEditor` 编辑页（demo 02 落地）
3. 改造 `DistributionQueue` 视觉规约（demo 03 落地）
4. PublishComposer 标 Beta 移到旁路入口

**Batch 4：联调与验收**
1. 4 平台真实账号端到端跑通
2. 队列 SSE 实时性、重试策略、定时发布全链路验证
3. 草稿态用户体验验证（特别是「打开后台」直达 URL 的正确性）

### 5.2 哪些不能动（守住的契约）

- 路由端点 URL 不变（前端依赖、测试依赖）
- `DistributionTask`、`DistributionTaskEvent` 顶层结构不变（仅增字段，不改名/不删字段）
- SSE 事件类型枚举不变（前端订阅依赖）
- `deliveryMode` 三态不变（这是 PRD 草稿态决策的语义基石）

---

## 6. 风险与坑

### 6.1 一定会遇到的坑

| # | 坑 | 应对 |
|---|---|---|
| 1 | X API 免费 tier 限额 1500 推/月，且没 thread API（要自己拆推） | ce-plan 阶段决定是否做线程拆分；可暂时只支持单推 |
| 2 | 微信公众号 IP 白名单：API 调用需提前在公众号后台配 IP | 部署文档要明确，开发期可关闭 |
| 3 | B站 cookie 寿命短（约 30 天），需引导用户定期重新登录 | 健康条要能提前 7 天告警 |
| 4 | YouTube 配额：每日 10000 单位，一次 upload 约 1600 单位 | 一期日发 3-5 次远低于配额 |
| 5 | `wechat-mp-connector.ts` 当前写本地 JSON 时路径 `outbound/wechat_mp/`，改造为真 API 后这个目录还要不要保留？（debug 价值 vs 占空间） | 建议保留作 audit log |

### 6.2 已经爆过的雷（rules.md 沉淀）

> 待 ce-plan 阶段从 `docs/04_progress/rules.md` 中筛出与分发相关的条目摘录

---

## 附：文件级别速查清单

```
✅ 直接复用（不改）：
   server/distribution-store.ts
   server/distribution-events.ts
   server/distribution-queue-service.ts
   server/distribution-auth-service.ts
   server/connectors/youtube-connector.ts
   src/__tests__/server/distribution-{store,sse,queue-service,execution-service}.test.ts

🔧 改造（保接口、改实现）：
   server/distribution-types.ts          → 增字段
   server/distribution-execution-service.ts → 重试分类策略
   server/distribution.ts                → 极少（增 1-2 端点可能）
   server/connectors/x-connector.ts      → 改为真直发
   server/connectors/wechat-mp-connector.ts → 调真微信 API
   src/components/PublishComposer.tsx    → 降级为 Beta
   src/components/DistributionQueue.tsx  → 视觉重做
   src/__tests__/server/distribution-composer-sources.test.ts → 跟随 API 扩展

🆕 新建：
   server/connectors/bilibili-connector.ts
   src/components/distribution-terminal/
     ├── DistributionTerminalHome.tsx
     ├── PublishCardEditor.tsx
     ├── HealthStrip.tsx
     ├── MaterialGroupBlock.tsx
     ├── DistributionTerminalCard.tsx
     ├── DraftModeBanner.tsx
     ├── RiskDelayToggle.tsx
     ├── BottomActionBar.tsx
     └── platform-fields/
         ├── XAdvancedFields.tsx
         ├── WechatMpAdvancedFields.tsx
         ├── YoutubeAdvancedFields.tsx
         └── BilibiliAdvancedFields.tsx
```
