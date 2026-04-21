🕐 Last updated: 2026-04-21 21:49 CST
🌿 Branch: director-final

## 当前状态
- 已从 `origin/main` 拉出干净分支 `director-final`，并把 Director 主链相关代码选择性迁入新分支
- Director 运行时缺失依赖已补齐：`server/svg-architect.ts`、`server/google-gemini-image.ts`、`src/schemas/visual-models.ts`
- 本地前后端已跑通：
  - 前端：`http://localhost:5176/`
  - 后端健康检查：`http://localhost:3004/health`
- 关键验证已通过：
  - `npm run typecheck:full`
  - `npm test -- --run src/__tests__/director-bridge.test.ts src/__tests__/director-adapter.test.ts src/components/director/ChapterCard.test.tsx src/components/director/Phase1View.test.tsx src/components/director/Phase2View.test.tsx src/components/director/Phase3View.test.tsx src/components/director/Phase4View.test.tsx`

## 本轮关键结果
- 修复了 `director-final` 后端启动链路中的真实缺失依赖，而不是继续沿用旧 worktree 的存量进程
- 把 Director 视觉运行时和当前分支的旧版 LLM generation 配置协议做了兼容处理，避免因为 schema 漂移导致服务启动即崩
- 把 Director 中文化后的测试断言同步到当前 UI 文案，恢复测试可信度
- 清理了运行态噪音文件：`runtime/crucible/autosave.json` 已恢复，不应混入后续 commit

## 当前未完成事项
- 还没有创建 commit，也没有 push 远端
- 按 `OldYang` 红线，`git commit` 前仍缺明确 Linear issue 归属
- 浏览器级自动验收工具在当前环境存在限制：
  - `agent-browser` 受本地 socket/daemon 权限影响，不能稳定回传快照
  - Playwright 受运行目录权限影响，不能正常初始化
- Safari 手工窗口里能确认本地页签曾打开到 `deliver`，但这一轮没拿到正式截图级证据；后续仍需补一轮可复用验收证据

## 当前工作树说明
- 当前工作树仍有未提交改动，主要分为两组：
  - Director 主链改动：SaaS shell 接回、Director workbench、phase 视图、bridge/runtime、样式与测试
  - 为 `typecheck:full` 兜底的兼容性改动：`llm-config`、`expert-actions`、`market` 相关类型与 mock
- 提交时必须拆开，不要重新混成一个大 commit

## 下一步建议
1. 先拿到老卢确认的 Linear issue 编号
2. 按两到三个逻辑单元拆 commit：
   - Director shell / runtime / UI 主链
   - Director 测试与中文化同步
   - 如有必要，再单独拆出全量类型兼容修复
3. push 远端同名分支 `director-final`
4. 补正式浏览器验收证据，至少覆盖首页打开与一条主入口链路

## 新窗口最建议起点
1. 先看 `git status --short --branch`
2. 确认老卢给出的 Linear issue 编号
3. 按当前 handoff 的拆分口径整理 staging
4. commit / push 后再补一轮浏览器验收
