🕐 Last updated: 2026-03-27 09:22
🌿 Branch: MHSDC-GC-SSE

## 当前状态
- 当前默认前端入口已切为独立 SaaS 壳：`src/SaaSApp.tsx`
- 当前 `build` / `build:railway` 已不再被导演 / 营销等历史模块类型债阻塞
- Google 登录已完成真实 smoke，可作为当前可用登录入口

## 本轮关键结果
- 新增独立 SaaS 主壳：
  - `src/SaaSApp.tsx`
  - 只保留 `黄金坩埚` 与 `分发终端`
  - 当前默认入口不再 import `Director / Shorts / Marketing` 历史交付模块
- Header 已支持模块白名单：
  - `src/components/Header.tsx`
  - SaaS 壳只显示 `crucible / distribution`
  - 在 SaaS 壳里 project / script 选择器不再因处于坩埚页而锁死
- 构建链路已完成分仓：
  - `tsconfig.saas.json`
  - `npm run typecheck:saas`
  - `npm run build` / `npm run build:railway` 改为校验 SaaS 主链
  - `npm run typecheck:full` 保留整仓历史债清单
- 当前打包体积已明显下降：
  - `721.22 kB -> 562.12 kB`

## 本轮代码落点
- 新增：
  - `src/SaaSApp.tsx`
  - `tsconfig.saas.json`
- 修改：
  - `src/main.tsx`
  - `src/components/Header.tsx`
  - `package.json`
  - `docs/04_progress/dev_progress.md`
  - `docs/04_progress/rules.md`

## 验证结果
- `npm run typecheck:saas`：通过
- `npm run build`：通过
- `npm run typecheck:full`：失败，但失败项已退回历史模块：
  - `src/components/market/*`
  - `src/components/MarketingSection.tsx`
  - `src/components/ScheduleModal.tsx`
  - `src/components/StatusDashboard.tsx`

## 当前 WIP
- 已完成：
  - Google 登录真实 smoke
  - SaaS 主链入口分仓
  - 历史类型债对当前 build 的阻塞隔离
- 未完成：
  - `Crucible turn / conversation / artifact` 的 `workspace-aware` 改造
  - 用户登录后态的头像菜单真实功能接线
  - 微信网站应用登录接通

## 待解决问题
- 当前只是把历史模块从 SaaS 主链入口和 build 中切掉了，整仓旧债本身并未清除
- 若后续要彻底清债，应单开历史模块收口任务，不要再回灌进 `MIN-105`
- Google `Client Secret` 已在对话中出现，测试完成后建议旋转一版

## 新窗口直接怎么做
1. 优先推进 `workspace-aware persistence`：
   - `turn`
   - `conversation`
   - `artifact`
2. 然后接登录后态真实功能：
   - 历史对话
   - 下载
   - 会员计划
3. 最后补微信网站应用登录
