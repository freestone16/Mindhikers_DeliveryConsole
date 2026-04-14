# GoldenCrucible 迁移收口记录

> 日期：2026-03-14
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 分支：`codex/crucible-main`
> 状态：迁移层收口完成，存在 unrelated 编译债待后续专项处理

## 本轮目标

将当前工作树从“代码已迁但运行口径混乱、依赖未恢复、文档状态分裂”的状态，收口到“运行时配置统一、关键硬编码清除、文档可交接”的状态。

## 本轮完成

### 1. 统一运行时入口

- 前端功能路径上的 `localhost:3002` / `127.0.0.1:3002` 已统一接入 `src/config/runtime.ts`
- Socket 入口统一走 `runtimeConfig.socketUrl`
- API / 下载 / 视频预览统一走 `buildApiUrl()`
- 清除了 `PublishComposer` 中写死 `/data/projects/...` 的 Docker 路径假设

### 2. 启动与端口检查脚本收口

- 新增 `scripts/runtime-env.js`，让脚本先读取 `.env.local` / `.env`
- `scripts/check-port.js` 改为按环境变量检查端口，而不是写死 `3002/5173`
- `scripts/preview.js` 同步读取运行时端口
- 修复沙盒中的 `EPERM` 假阳性，不再误报“端口被占用”
- `.claude/launch.json` 已对齐当前工作区使用的 `3008 / 5181`

### 3. 依赖层恢复

- 恢复 `node_modules`
- 生成 `package-lock.json`
- `typescript`、`vite`、`vitest` 等构建依赖已可用

### 4. 文档与规则同步

- 补写迁移收口计划到 `docs/plans/2026-03-14_GoldenCrucible_Migration_Closure_Plan.md`
- 在 `docs/04_progress/rules.md` 新增“收口任务不要顺手改 unrelated 模块”的规则
- 本轮后续会同步到 `dev_progress.md` 与 `.agent/PROJECT_STATUS.md`

## 验证结果

### 已通过

1. `npm run dev:check`
   - 输出已改为当前默认端口 `3004 / 5176`
   - 在 Codex 沙盒中显示 `restricted [EPERM]`，并明确标注这不是端口冲突
2. `npm run test:run -- src/components/crucible/hostRouting.test.ts`
   - 3 个测试全部通过
3. `rg` 检查功能路径硬编码
   - `src/`、`scripts/`、`.claude/`、`server/` 内已无残留 `localhost:3002` / `127.0.0.1:3002` / `/data/projects/` 功能入口硬编码

### 未通过 / 待专项处理

1. `npm run build`
   - 当前仍被 **营销大师** 的 `TubeBuddyScore` 类型口径不一致拦住
   - 同时还有旧 `DeliveryState.modules` 兼容债和若干未使用变量红灯

## 边界说明

这次我刻意没有继续深入修改营销大师类型系统。

原因：

1. 用户已明确指出 `TubeBuddyScore` 属于营销大师专项问题
2. 本轮任务是迁移收口，不是跨模块顺手清债
3. 已在 `rules.md` 记录：收口时 build 暴露 unrelated 报错，要先按模块边界隔离

## 当前判断

当前工作树已经适合：

- 继续做黄金坩埚 / 运行时 / 启动链相关开发
- 做文档交接
- 做局部功能验证

当前还不适合直接宣称“全仓 build 健康”，因为仍有 unrelated 存量类型债。
