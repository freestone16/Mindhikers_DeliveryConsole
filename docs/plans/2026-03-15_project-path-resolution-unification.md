# 2026-03-15 项目路径解析收口方案

## 背景

2026-03-15 在当前主力 worktree `/Users/luzhoua/MHSDC/DeliveryConsole/Director` 冷启动后，出现了两个看似无关、实则同源的异常：

1. 右上角文稿下拉返回“暂无文稿”，后端 `/api/scripts` 实际报 `02_Script 目录不存在`
2. 不同模块对同一项目目录的解析口径不一致，存在 `PROJECTS_BASE` 被顶层缓存、局部 fallback 路径不同的问题

根因不是数据丢失，而是项目路径解析逻辑分散在多个模块中，且部分模块在 ESM import 阶段就读取了依赖 `dotenv` 的环境变量。

## 目标

1. 将 `PROJECTS_BASE` / `getProjectRoot()` 的解析规则收口为单一事实来源
2. 禁止在模块顶层缓存依赖 `dotenv` 的路径变量
3. 保持现有业务 API 和目录结构不变，只替换底层路径解析方式
4. 为后续 worktree / Docker / 本地多窗口运行提供一致行为

## 方案

### 1. 建立共享 helper

新增 [`server/project-paths.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/project-paths.ts)：

- `getProjectsBase()`
- `getProjectRoot(projectId)`
- `resolveProjectPath(projectId, ...segments)`

设计原则：

- 每次调用时再读取 `process.env.PROJECTS_BASE`
- 默认 fallback 仍保持为当前工作区下的 `Projects`
- 不在模块顶层缓存 env 结果

### 2. 替换 server 层分散实现

统一替换以下模块内的本地 `getProjectRoot()` / `PROJECTS_BASE`：

- [`server/index.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/index.ts)
- [`server/chat.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/chat.ts)
- [`server/director.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/director.ts)
- [`server/pipeline_engine.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/pipeline_engine.ts)
- [`server/shorts.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/shorts.ts)
- [`server/assets.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/assets.ts)
- [`server/xml-generator.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/xml-generator.ts)
- [`server/market.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/market.ts)
- [`server/upload_handler.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/upload_handler.ts)
- [`server/distribution.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/distribution.ts)
- [`server/youtube-auth.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/youtube-auth.ts)

### 3. 特殊点处理

#### Distribution queue

[`server/distribution.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/distribution.ts) 中原先的 `_distribution_queue.json` 路径在模块加载时就被固定。改为 `getDistributionQueueFile()` 惰性解析，避免 queue 文件写到错误根目录。

#### 主入口

[`server/index.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/index.ts) 不再顶层缓存 `PROJECTS_BASE`，项目列表、切换项目、文件浏览器、安全校验、启动日志都改成按调用读取。

## 非目标

1. 不修改项目目录结构
2. 不改变任何 API 路径或返回格式
3. 不顺带调整 LLM 业务逻辑
4. 不通过硬编码路径掩盖环境问题

## 验证

1. 单元测试：
   - [`src/__tests__/server/project-paths.test.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/src/__tests__/server/project-paths.test.ts)
   - 验证 fallback、动态 env 切换、嵌套路径解析
2. API 回归：
   - `GET /api/scripts?projectId=CSET-Seedance2` 返回真实文稿列表
3. 静态检索：
   - `server/` 中不再残留本地 `PROJECTS_BASE` / `getProjectRoot` 分散实现

## 风险与控制

### 风险

1. 其他 worktree 若 `.env.local` 配错，会在下次重启后更早暴露
2. 旧进程在未重启前仍保留旧逻辑

### 控制

1. 只收口路径解析，不碰业务协议
2. 用单元测试证明 helper 为动态读取
3. 通过 `rg` 做全量检索，避免遗漏

## 结论

这次修订的目的不是“把当前 bug 补平”，而是把项目路径解析提升为共享基础设施，避免未来任何模块再次靠各自读取 env 或各自 fallback 路径“碰运气工作”。
