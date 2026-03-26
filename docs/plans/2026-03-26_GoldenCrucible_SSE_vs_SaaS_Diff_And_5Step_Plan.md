# 2026-03-26 GoldenCrucible SSE vs SaaS 差异整理与五步工作计划

> 日期：2026-03-26
> 当前 SaaS 分支：`codex/min-105-saas-shell`
> 对照 SSE 分支：`MHSDC-GC-SSE`
> 状态：执行中

---

## 1. 两边当前差异

### 1.1 SSE 线当前实际进度

SSE 当前实际进度分成两层：

1. 已收口并已推远端的主线：
   - Git / 目录治理收口
   - 已确认旧目录 `/Users/luzhoua/DeliveryConsole` 不再是当前启动层的硬依赖
   - 已推送提交：`b8a8854`
2. 已做到但尚未整理提交的业务修复：
   - 黄金坩埚“老张已搜索”回归修复
   - 真实搜索重新接通
   - `turn_log.json` 已能写出：
     - `meta.searchRequested: true`
     - `meta.searchConnected: true`
     - `research.query`
     - `research.sources`

SSE 当前本地口径：

1. backend: `3009`
2. frontend: `5182`
3. 当前重点仍以 SSE 工作区自身治理与搜索回归为主

### 1.2 SaaS 线当前实际进度

SaaS 当前已推进到：

1. 独立 worktree 与账本端口已建立：
   - backend: `3010`
   - frontend: `5183`
2. SaaS 宿主壳已能本地启动
3. 最小 session autosave 主链已落地
4. 默认 runtime 工作区已从本地多项目目录回退到仓库内 `runtime/crucible/projects`
5. `build:railway` 已通过

本轮新增确认的根因修复：

1. `.env.local` 缺失，导致 dev 口径没有真正落到备案端口
2. dev runtime 绕过 Vite 代理，导致 `5183 -> 3010` 直连链路异常
3. `server/index.ts` 中 `getProjectRoot` 导入链断裂，导致 socket 首次选项目时后端崩溃

### 1.3 两边最关键的区别

| 维度 | SSE | SaaS |
|---|---|---|
| 当前主目标 | Git/目录治理 + 搜索回归 | SaaS 宿主壳收口 + 最小持久化 + 部署 |
| 本地口径 | `3009 / 5182` | `3010 / 5183` |
| 搜索修复状态 | 已做出实际修复，但仍在脏现场中 | 还未正式吸收到 SaaS 线 |
| 会话持久化 | 仍偏本地宿主语义 | 已开始切最小 session/autosave |
| 部署状态 | 仍以 SSE 本地演进为主 | 已开始 Railway 入口验证 |

### 1.4 当前协同原则

接下来必须遵守：

1. **前 4 件事继续只收 SaaS 宿主主线**
2. **第 5 件事再单独吸收 SSE 的搜索修复**
3. **禁止把 SSE 脏现场与 SaaS 宿主收尾混成一个提交或一个大杂烩改造**

---

## 2. 五步工作计划

### 1. 环境与端口口径彻底收口

目标：

1. SaaS worktree 的本地开发、验证、文档、脚本全部稳定统一到 `3010 / 5183`
2. 不再出现“账本已备案，但工作区实际没读到这组端口”的漂移

剩余工作：

1. 复核本地启动说明、必要文档和启动辅助脚本
2. 确认 `npm run dev`、`npm run start`、健康检查、页面验证都围绕备案端口展开

### 2. session 最小持久化收口

目标：

1. 页面刷新后坩埚状态可恢复
2. 服务端 autosave 为主，本地手动备份为辅

剩余工作：

1. 做页面刷新/恢复闭环验证
2. 检查重置、手动备份、自动 autosave 三者之间是否一致

### 3. 去 `PROJECTS_BASE` 强依赖的 SaaS 主链收口

目标：

1. SaaS 主链在没有外部本地多项目目录时也能工作
2. 当前 worktree 的默认工作区稳定落到仓库内 runtime 路径

剩余工作：

1. 继续复核主链涉及的项目读取入口
2. 明确哪些模块已完成收口，哪些仍保留历史依赖但不纳入本轮

### 4. Railway / 部署验证收口

目标：

1. 确保当前 SaaS 壳在生产入口和部署口径上可继续推进
2. 让 `MIN-105` 的“可部署演示壳”更接近完成态

剩余工作：

1. 在当前最新代码上复跑关键构建验证
2. 复核 `.env.example` 与生产入口的一致性
3. 整理 staging 需要的最小变量与验证清单

### 5. 单独吸收 SSE 搜索修复

目标：

1. 把 SSE 里已经证明有效的“老张已搜索”回归修复，作为独立工作流引入 SaaS
2. 这件事必须晚于前 4 项宿主收口，避免把 SaaS 基础设施问题与搜索业务修复混在一起

范围：

1. `server/crucible.ts`
2. `server/crucible-research.ts`
3. `src/__tests__/crucible-research.test.ts`
4. `turn_log.json` 证据链字段口径

验收标准：

1. SaaS 线也能稳定写出：
   - `meta.searchRequested: true`
   - `meta.searchConnected: true`
   - `research.query`
   - `research.sources`
2. 至少补一轮最小回归与真实链路验证

---

## 3. 当前执行顺序

从现在开始，按以下顺序推进：

1. 继续完成第 1 项未尽事宜
2. 再完成第 2 项未尽事宜
3. 再完成第 3 项未尽事宜
4. 再完成第 4 项未尽事宜
5. 最后单独开第 5 项，把 SSE 搜索修复吸收到 SaaS

---

## 4. 当前判断

当前最重要的不是立刻搬搜索修复，而是先把 SaaS 宿主主链自身收得足够稳定。

原因：

1. 否则即便把 SSE 搜索修复搬过来，也会再次被宿主层端口、代理、session、项目根路径等问题污染
2. 只有前 4 项收稳，第 5 项搜索修复的验证结果才可信
