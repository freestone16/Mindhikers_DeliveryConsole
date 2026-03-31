# GoldenCrucible SSE / SAAS 发布治理口径

> 更新时间：2026-03-27
> 适用分支：`MHSDC-GC-SSE` / `SAAS`

## 1. 目标

本文件只解决一件事：
把 `SSE` 研发验证线与 `SAAS` 正式发布线彻底分开，避免继续出现“新功能直接覆盖生产域名”的流程漂移。

## 2. 职责边界

### `SSE`

- 只承接新功能开发、联调、smoke、收口前演示
- 默认先在 `SSE` 自己的 Railway 服务 / 域名完成验证
- 不直接覆盖 `SAAS` 生产域名

### `SAAS`

- 作为当前对外正式版本的唯一发布线
- 只接收已经在 `SSE` 收稳的功能
- 统一负责最终发布到生产域名

## 3. 标准发布路径

唯一允许的路径：

1. 在 `SSE` 完成功能开发
2. 在 `SSE` 域名完成 smoke
3. 整理 `SSE -> SAAS` 合并清单
4. 合并到 `SAAS`
5. 在 `SAAS` 再跑一轮发布前验收
6. 由 `SAAS` 统一发布当前正式生产域名

禁止路径：

- `SSE` 直接发布当前 `golden-crucible-saas-production.up.railway.app`
- 未在 `SSE` 完整验证就直接把新能力推到 `SAAS`

## 4. SSE 收稳的最小验收口径

在进入 `SAAS` 前，至少要确认以下能力：

- 登录主链可进入
- workspace 可正常建立或读取
- Crucible 会话能写入、读取、恢复
- 历史对话中心可正常列出、查看、恢复
- artifact 导出可用
- `npm run typecheck:saas` 通过
- `npm run build` 通过

## 5. SAAS 发布前检查清单

- 确认本次合并范围来自已验证的 `SSE` 能力
- 确认没有把历史模块类型债重新带回当前主链
- 确认本次需要复验的用户路径已经列清楚
- 确认生产域名仍只由 `SAAS` 负责发布

## 6. 当前已知事实

- 当前 `golden-crucible-saas-production.up.railway.app` 被视为 `SAAS` 正式生产域名
- 本仓库约定中，`SSE` 与 `SAAS` 必须长期保持双线治理
- 本轮已将 repo 内的发布口径、历史中心闭环与 workspace scope 一并收口，后续不应再回到“测试线直碰生产”的旧流程

## 7. 当前限制

- 本轮在当前执行环境中未能重新通过 Railway CLI 拉取在线项目映射，CLI 请求被外部网络握手限制阻断
- 因此本文件中的线上域名归属口径，沿用本仓库已确认结论与现有进度文档，不额外宣称新的在线发现

## 8. 下一步动作

- 补齐独立 `SSE` Railway 测试域名并固定命名
- 形成 `SSE -> SAAS` 合并模板
- 把 smoke 清单沉淀成固定发布卡片
