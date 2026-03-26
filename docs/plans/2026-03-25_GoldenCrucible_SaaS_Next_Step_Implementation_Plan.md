# 2026-03-25 GoldenCrucible SaaS 下一阶段实施方案

> 日期：2026-03-25
> 分支：`codex/min-105-saas-shell`
> 状态：执行中

---

## 1. 目标

本轮只做 4 件事，并且全部围绕 SaaS 主链收口：

1. 环境变量与端口口径最小化
2. session 最小持久化
3. 收缩后端对 `PROJECTS_BASE` 的强依赖
4. Railway 部署链路验证

一句话目标：

**把当前“能跑的 SaaS 壳”推进到“可稳定恢复会话、可脱离本地 Projects 目录运行、可继续上 Railway 验证”的状态。**

---

## 2. 当前判断

基于当前 `docs/dev_logs/HANDOFF.md` 与现有代码，现状如下：

1. 前端壳与单服务生产入口已经打通，`build:railway` 与单端口健康检查已验证通过
2. 坩埚工作台状态仍主要依赖浏览器 `localStorage`
3. 后端多个入口默认假设存在本地 `PROJECTS_BASE`
4. Header 仍保留“工作区 / 文稿”语义，SaaS 口径还不够收束
5. 当前最值得优先保证的是：**黄金坩埚主链在没有本地多项目目录时依然可工作**

---

## 3. 实施范围

### 3.1 环境口径最小化

目标：

1. 明确本地默认口径：`3010 / 5183`
2. 前后端默认走同源或显式的 SaaS 默认地址
3. 尽量减少“必须先补齐一大堆本地环境变量”才能跑起来的门槛

计划动作：

1. 保持 `.env.example` 只暴露 SaaS 当前确实需要的核心变量说明
2. 前端默认自动落到 SaaS 默认项目，不要求先手动切工作区
3. Header 在只有单工作区时收口为最小展示，不强依赖本地 Projects 浏览

验收标准：

1. 本地 dev / 单服务 start 时无需先准备完整 Delivery 多项目目录
2. 首屏进入后自动落到默认坩埚工作区

### 3.2 session 最小持久化

目标：

1. 不再只靠 `localStorage`
2. 同一个浏览器会话刷新后能恢复坩埚工作台
3. 本地备份继续保留，但降级为辅路径

计划动作：

1. 后端新增基于 cookie 的轻量 session id
2. `api/crucible/autosave` 改为按 session 隔离存储
3. 前端坩埚快照改为“服务端 autosave 为主，本地快照为兜底”
4. S/L 手动快照按钮继续保留，但同步到新的主存储口径

验收标准：

1. 刷新页面后可恢复同一 session 的坩埚状态
2. 重置工作区会同时清理服务端 autosave 与本地快照

### 3.3 收缩 `PROJECTS_BASE` 强依赖

目标：

1. 让黄金坩埚 SaaS 主链在没有外部 `PROJECTS_BASE` 时也能工作
2. 把默认工作区退回仓库内 runtime 路径，而不是强绑本地 `../../Projects`

计划动作：

1. 抽公共 project-root 解析层
2. 默认把 SaaS 工作区落到 `runtime/crucible/projects/<PROJECT_NAME>`
3. `api/projects`、`api/scripts`、聊天上下文主链统一走新的解析逻辑
4. 对 `delivery_store.json` 初始化做容错，避免最小工作区下崩溃

验收标准：

1. 不设置 `PROJECTS_BASE` 时，SaaS 默认工作区仍能正常创建与读取
2. `Header`、聊天、坩埚工作台主链不因缺少外部 Projects 目录直接失败

### 3.4 Railway 验证

目标：

1. 确认这轮改动没有破坏现有 `build:railway`
2. 保持 `start` + `/health` + 首页壳渲染可用

计划动作：

1. 跑 `npm run build:railway`
2. 启动单服务入口验证 `/health`
3. 如本地可行，再整理下一轮 Railway staging 配置口径

验收标准：

1. `build:railway` 通过
2. 单服务启动成功，`/health` 返回正常
3. 首页能够加载 SaaS 壳

---

## 4. 本轮文件落点

预计优先修改：

1. `server/index.ts`
2. `server/chat.ts`
3. `server/project-root.ts`（新增）
4. `src/components/crucible/storage.ts`
5. `src/components/crucible/CrucibleWorkspaceView.tsx`
6. `src/App.tsx`
7. `src/components/Header.tsx`

---

## 5. 风险与边界

1. 本轮只保证黄金坩埚 SaaS 主链，不顺手清其他业务域的历史 `PROJECTS_BASE` 依赖
2. 不在这一轮扩成完整账号系统，只做最小 session 持久化
3. Railway 只验证当前分支可部署性，不直接替代正式 demo/prod 流程

---

## 6. 执行顺序

1. 先加 project-root 公共解析层
2. 再改 session autosave 与前端坩埚存储
3. 再收 Header / 默认工作区口径
4. 最后跑 `build:railway` 与单服务验证
