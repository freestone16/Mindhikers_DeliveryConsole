## 2026-03-25 GoldenCrucible SaaS Railway Entrypoint

### 分支
- `codex/min-105-saas-shell`

### 今日目标
- 继续按 `MIN-105` 推进 SaaS 壳
- 将当前仓库从本地双进程开发态改为 Railway 可部署的单服务入口
- 补齐 Railway CLI / MCP 接入条件

### 已完成
- 确认当前 SaaS 版仍不是多账号产品，只是单工作区/单实例形态；已明确后续策略为“先单人跑通、架构预留多账号边界”
- 完成 Railway 单服务入口改造：
  - `package.json` 新增 `build:web`、`build:railway`、`start`
  - `server/index.ts` 支持在单端口上同时提供 API、Socket 和构建后的前端静态资源
  - `src/config/runtime.ts` 在生产环境默认走同源 API / Socket，不再强依赖本地端口
  - 新增 `railway.json`
- 完成本地验证：
  - `npm run build:railway` 成功生成 `dist/`
  - 使用 `PORT=3010 APP_BASE_URL=http://localhost:3010 CORS_ORIGIN=http://localhost:3010 npm run start` 的生产入口成功启动
  - `curl http://127.0.0.1:3010/health` 返回 `status: ok`
  - `curl -I http://127.0.0.1:3010/` 返回 `200`
  - Playwright 浏览器快照确认 SaaS 页面壳正常渲染
- 完成 Git 落盘：
  - `608a849` `refs MIN-105 strip app to crucible saas shell`
  - `ab89d10` `refs MIN-105 add railway single-service entrypoint`
  - 两个 commit 均已推到 `origin/codex/min-105-saas-shell`
- 完成 Railway CLI 与 MCP 前置：
  - 安装 `@railway/cli`
  - 完成 CLI 登录，账号为 `contact.mindhiker@gmail.com`
  - 将 Railway MCP server 写入 `~/.codex/config.toml`

### 当前判断
- 现在的 GoldenCrucible SaaS 已经具备 Railway 单服务部署基础
- 仍未完成多账号体系、服务端 session 持久化、`PROJECTS_BASE` 依赖拆除
- Railway MCP 配置已经写入，但通常需要刷新/重开 Codex 会话后才会在工具层正式生效

### 当前未提交 / 现场注意
- 仓库内仍有与本轮无关的 `skills/*` 改动与新增文件，未纳入本轮提交
- `~/.codex/config.toml` 为工作区外配置，已手动写入 Railway MCP server
- `~/.vibedir/global_ports_registry.yml` 里的 SaaS 端口登记仍未正式补写

### 下一步建议
- 刷新 Codex 会话，确认 Railway MCP 生效
- 进入 Railway：
  - 绑定 `codex/min-105-saas-shell`
  - 创建 `golden-crucible-app` service
  - 填写环境变量并部署
- 部署稳定后再继续拆：
  - 服务端 session / auth 预留层
  - `PROJECTS_BASE` 依赖降级
  - 多账号模块设计
