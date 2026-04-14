---
date: 2026-03-23
module: GoldenCrucible SSE
status: ✅ 已完成
---

# 2026-03-23 | GoldenCrucible | 轻量 SaaS 上云清单 + Linear 收口

## [核心变动]

- 新增面向当前 SSE 分支的云端实施清单：
  - `docs/plans/2026-03-23_GoldenCrucible_SSE_SaaS_Cloud_Launch_Checklist.md`
- 清单明确了当前代码现场的 SaaS 阻塞：
  - Delivery 宿主壳仍未抽干净
  - 坩埚链路仍残留 `projectId / scriptPath` 本地语义
  - session 恢复仍主要依赖 `localStorage`
  - 尚无正式 Railway / Vercel / 腾讯云部署配置

## [Linear 处理]

- `MIN-104`：
  - 已补“完成项 / 验证 / 不纳入范围 / 关闭口径”
  - 已关闭为 `Done`
- `MIN-105`：
  - 已切到 `In Progress`
  - 步骤已收束为：SaaS 外壳、切断本地依赖、最小 session 持久化、部署配置、preview/staging、线上 smoke
- `MIN-106`：
  - 保持 `Todo`
  - 已明确不能抢在 SaaS 宿主之前推进
- `MIN-94`：
  - 保持 `In Progress`
  - 继续作为总协调卡

## [结论]

- 下一窗口不应再回到方案发散，而应直接进入 `MIN-105` 实施。
- 当前唯一正确主线是：把 SSE 版黄金坩埚抽成轻量在线宿主，服务少量朋友、合作方、投资人演示。
