# L-015 项目路径解析不能分散实现

## 日期

2026-03-15

## 问题

当前主力 worktree 冷启动后，右上角文稿下拉突然为空，后端 `/api/scripts` 返回：

```json
{"scripts":[],"selected":null,"message":"02_Script 目录不存在"}
```

真实项目目录和文稿文件都存在，但部分 server 模块各自实现了 `PROJECTS_BASE` / `getProjectRoot()`：

- 有的在模块顶层缓存 env
- 有的在函数里即时读取
- 有的 fallback 到 `process.cwd()/Projects`
- 有的 fallback 到 `__dirname` 相对路径

这导致不同链路对“项目根目录”理解不一致。

## 根因

1. `PROJECTS_BASE` 不是单一事实来源，而是散落在多个模块
2. ESM import 先执行模块、后执行 `dotenv.config()`，顶层缓存 env 的模块会拿到错误 fallback
3. 旧进程长期存活时问题被掩盖，切到新 worktree 并冷启动后集中暴露

## 修复

新增共享 helper [`server/project-paths.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/project-paths.ts)，统一提供：

- `getProjectsBase()`
- `getProjectRoot(projectId)`
- `resolveProjectPath(projectId, ...segments)`

并将 `server/index.ts`、`server/chat.ts`、`server/director.ts`、`server/distribution.ts` 等所有路径相关模块统一切到这层 helper。

## 为什么以前“看起来一直好”

不是旧方案正确，而是旧进程/旧工作区/未命中对应链路时，潜伏 bug 没被触发。

一旦：

- 切换到新的主力 worktree
- 做干净重启
- 触发依赖 `chat.ts` 或其他路径 helper 的接口

就会显形。

## 经验

1. 依赖 `dotenv` 的环境变量不能在模块顶层缓存
2. 跨模块共享的路径解析必须集中管理，不能每个文件各写一套
3. “以前一直好”不等于代码没有缺陷，可能只是旧进程和旧状态把问题藏住了

## 防再犯动作

1. 在 [`docs/04_progress/rules.md`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/docs/04_progress/rules.md) 增加“项目路径解析必须统一走共享 helper”的规则
2. 增加 [`src/__tests__/server/project-paths.test.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/src/__tests__/server/project-paths.test.ts) 回归测试
3. 新模块若需要项目路径，一律复用 `server/project-paths.ts`
