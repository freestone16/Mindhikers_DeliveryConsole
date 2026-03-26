🕐 Last updated: 2026-03-26 09:54
🌿 Branch: codex/min-105-saas-shell

## 当前状态
- `3010 / 5183` 已按账本备案口径恢复，当前本地 dev 进程在线：
  - 父进程：`73160` `npm run dev`
  - `concurrently`：`73797`
  - 后端：`73812` `tsx watch server/index.ts`
  - 前端：`73813` `vite --host`
- 当前工作区：
  - `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
- 当前分支：
  - `codex/min-105-saas-shell`

## Railway 上线结果
- 已删除两个无关 Railway 临时项目：
  - `gallant-clarity`
  - `practical-unity`
- 已为当前分支新建并链接干净的 staging 项目：
  - Railway project：`GoldenCrucible-SaaS-Staging`
  - Railway service：`golden-crucible-saas`
- 已补齐当前 staging 最小变量：
  - `SESSION_SECRET`
  - `PROJECT_NAME=golden-crucible-sandbox`
  - `APP_BASE_URL=https://golden-crucible-saas-production.up.railway.app`
  - `CORS_ORIGIN=https://golden-crucible-saas-production.up.railway.app`
- 已修复两类 Railway 部署阻塞：
  1. **部署上下文污染**
     - 新增 `.railwayignore`
     - 排除了 `node_modules_bad`、本地缓存、`dist`、sessions 等无关目录
  2. **仓库遗留大文件与漏声明依赖**
     - 删除了不属于黄金坩埚主链的历史 `.wav` BGM 静态文件
     - 补齐 `yaml` 依赖，修复 Railway 构建时 `Rollup failed to resolve import "yaml"` 报错
- 最新线上结果：
  - 域名：`https://golden-crucible-saas-production.up.railway.app`
  - 最新 deployment：`04bd55e3-ce95-4a82-9083-902546545a0f`
  - 状态：`SUCCESS`
  - `curl https://golden-crucible-saas-production.up.railway.app/health` 返回：
    - `status: ok`
    - `env: production`
  - `agent-browser` 已确认首页在线，页面文本包含：
    - `黄金坩埚 GoldenCrucible`
    - `CRUCIBLE ONLINE`
    - `GoldenCrucible SaaS v4.0.0`

## 安全 / 健壮性扫描结论
- 已完成一轮线上 staging 快速扫描，当前最重要的发现有 3 个：
  1. **LLM 配置接口对公网匿名开放**
     - `GET /api/llm-config/status`
     - `GET /api/llm-config/keys`
     - `POST /api/llm-config/test-all`
     - 目前没有鉴权中间层，属于高风险管理面暴露
  2. **项目切换接口对公网匿名可写**
     - `POST /api/projects/switch`
     - 匿名请求可成功切换当前全局 project，上线后会影响所有连接中的客户端
  3. **基础安全响应头不足**
     - 当前仍暴露 `x-powered-by: Express`
     - 未见 `CSP / HSTS / X-Frame-Options` 等基础头
- 同时确认一项正向结果：
  - CORS 没有把任意 `Origin` 直接反射为允许源
- 当前判断：
  - 这个 staging 可以给熟人小范围试用
  - 但如果要更公开扩散，优先级最高的是先把管理类接口收口到最小鉴权层

## Skill 收口
- 已按黄金坩埚主链收缩 Skill Sync 范围：
  - 删除：`Director` `MusicDirector` `ThumbnailMaster` `ShortsMaster` `MarketingMaster`
  - 保留：`Writer` `ThesisWriter` `Researcher` `FactChecker` `Socrates`

## 本轮新增进展（第 5 件事）
- 已开始并完成“单独吸收 SSE 搜索修复”的最小闭环，且未回退 SaaS 现有宿主壳结构：
  - `server/crucible-research.ts`
  - `src/__tests__/crucible-research.test.ts`
- 已补齐 2 个关键行为：
  1. **泛化搜索指令不再生成废查询**
     - 例如“去网上搜一下最新进展，补充我们的对话”
     - 现在会优先回落到 `topicTitle + 最新研究`
     - 不再把“补充我们的对话”这类话术残留到 query
  2. **搜索材料接通后的 prompt 约束更强**
     - 明确写入“已接通真实外部搜索”
     - 显式限制模型不要再说“我现在去搜索”
     - 要求直接结合当前对话继续推进
- 已完成验证：
  - `npm run test:run -- src/__tests__/crucible-research.test.ts src/__tests__/crucible-orchestrator.test.ts`
  - `2` 个测试文件、`7` 条用例通过
  - `npm run build:railway` 继续通过

## 本轮根因与修复
- 已确认并修复 3 个串联根因：
  1. **缺少 `.env.local`**
     - 导致本地开发默认一直落在 `3004 / 5176`
     - 与账本备案的 `3010 / 5183` 不一致
  2. **前端 runtime 在 dev 模式绕过了 Vite 代理**
     - `src/config/runtime.ts` 原先在 dev 下默认把 API/Socket 直连到后端端口
     - 导致 `5183` 页面不是走同源 `/api` 与 `/socket.io`，而是直接跨端口请求
  3. **`getProjectRoot` 导出链断裂**
     - `server/chat.ts` 已改为从 `project-root` import
     - 但 `server/index.ts` 仍从 `./chat` 取 `getProjectRoot`
     - 首次 socket `select-project` 时触发：
       - `TypeError: (0 , import_chat.getProjectRoot) is not a function`
     - 后端因此崩掉，前端一直停在 `Connecting to GoldenCrucible...`

## 已完成改动
- 新增：
  - `.env.local`
  - `server/project-root.ts`
  - `docs/plans/2026-03-25_GoldenCrucible_SaaS_Next_Step_Implementation_Plan.md`
- 已修改：
  - `src/config/runtime.ts`
  - `src/App.tsx`
  - `src/components/crucible/storage.ts`
  - `src/components/crucible/CrucibleWorkspaceView.tsx`
  - `src/components/ChatPanel.tsx`
  - `server/index.ts`
  - `server/chat.ts`
  - `.env.example`

## 验证结果
- `npm run dev:check` 已确认当前读取到的端口是：
  - 后端 `3010`
  - 前端 `5183`
- `npm run dev` 已成功拉起
- `agent-browser` 复验结果：
  - `http://127.0.0.1:5183/` 可打开
  - `window.socket.io.uri` 已从旧的 `http://127.0.0.1:3010` 修正为 `http://127.0.0.1:5183`
  - `/api/version` 通过 Vite 代理已返回 `200`
  - 页面已恢复主界面，不再卡在 `Connecting to GoldenCrucible...`
  - `window.socket.connected === true`
  - 页面文本已出现：
    - `CRUCIBLE ONLINE`
    - `GoldenCrucible SaaS v4.0.0`

## WIP
- SaaS 主链的本地 dev 口径已经打通
- session 最小持久化、默认 runtime 工作区、Socket/Vite 代理链均已落到可运行状态
- Railway staging 已真实上线
- 后续若继续推进，可转入：
  - 线上 session 恢复的交互细节验证
  - 搜索修复在线上 staging 的真实回合级复验
  - SaaS 壳 UI 收口与提交整理

## 待解决问题
- 仓库里仍有与本轮无关的脏改动，提交时必须只暂存 SaaS 壳相关文件：
  - `skills/*`
  - `runtime/crucible/autosave.json`
- `PROJECTS_BASE` 的强依赖目前只收了 SaaS 主链，没有扩散处理其他老业务模块
