🕐 Last updated: 2026-04-28 20:23 CST
🌿 Branch: codex/saas-shell-slice-integration
📍 Scope: MHSDC/GoldenCrucible-SaaS

---

## 当前一句话

SaaS staging 派生的独立集成分支已完成 SSE 壳层切片迁移 checkpoint，代码层 `typecheck:saas` / `build` 通过，agent-browser 壳层入口验收通过；尚未回灌 `MHSDC-GC-SAAS-staging`。

---

## 本轮目标

按 SSE 交接语句执行 SaaS staging 后续切片移植：

- 禁止整枝 merge SSE → SaaS
- 从 `MHSDC-GC-SAAS-staging` 拉独立集成分支
- 按切片迁移：依赖/Router → tokens/primitives → Shell 原语 → ShellLayout/registry → module stages/artifacts → P0/P1 fixes → 必要后端路由整理
- 每片跑 `npm run typecheck:saas` 与 `npm run build`
- 最终用 agent-browser 验 `/`、`/m/crucible`、`/m/roundtable`、`/llm-config`

---

## 已完成

### 1. 独立集成分支

- 当前分支：`codex/saas-shell-slice-integration`
- 基底：`MHSDC-GC-SAAS-staging`
- 未整枝 merge SSE
- 未回灌 SaaS staging

### 2. 本地 checkpoint commit

- Commit：`b4c8ba2`
- Message：`refs MIN-136 feat: checkpoint SaaS shell slice integration`
- 状态：本地 commit，未 push

Commit 内容范围：

- 依赖：`@tanstack/react-query`、`react-router-dom`、`zustand`
- 入口：`src/main.tsx`、`src/router.tsx`、`src/lib/query-client.ts`
- 主题：`src/styles/*`、`src/index.css`
- primitives：`src/components/primitives/*`
- Shell：`src/shell/*`
- modules：`src/modules/*`
- slots：`src/slots/*`
- SaaS 壳切换：`src/SaaSApp.tsx`
- Crucible artifact state 抄送：`src/components/crucible/CrucibleWorkspaceView.tsx`
- Better Auth trusted origin：`server/auth/index.ts`

### 3. 切片验证

每个主要切片后均已跑：

```bash
npm run typecheck:saas
npm run build
```

最终结果：

- `npm run typecheck:saas` ✅
- `npm run build` ✅
- 构建仍有既有警告：CSS minify 里 `file` 非标准属性提示、chunk size 超 500KB 提示

### 4. agent-browser 壳层验收

已在本地 `http://127.0.0.1:5183` 验证：

- `/` ✅ 自动进入 `/m/crucible`
- `/m/crucible` ✅ Shell 左栏、Crucible 对话区、artifact drawer 可见
- `/m/crucible` artifact drawer ✅ 四个 tab 可见：Thesis / SpikePack / Snapshot / Reference
- `/m/roundtable` ✅ 页面可打开，圆桌输入框与 artifact drawer 可见
- `/m/roundtable` artifact drawer ✅ 四个 tab 可见
- `/llm-config` ✅ BYOK 配置页可打开，关闭后返回 `/m/crucible`
- Console ✅ 未出现 `Rendered more hooks`
- Console ✅ 未出现 `[ShellErrorBoundary] Unhandled error`
- Errors ✅ 无 page error
- Network ✅ `/api/...` 与 `/socket.io/...` 走当前同源 `127.0.0.1:5183`，未出现后端端口 `3010` 直连

---

## 未完成 / 注意事项

### 1. 本地 auth 占位符修复

发现：

- `.env.local` 中 `DATABASE_URL=...` 是占位符
- 旧逻辑只判断 `DATABASE_URL` 是否有值，导致 auth 被误开启
- Better Auth 随后拿 `...` 去连 Postgres，报 `Connection terminated unexpectedly`

处理：

- 已在 `server/auth/index.ts` 增加 `resolveDatabaseUrl()`
- `DATABASE_URL` 为空或等于 `...` 时视为未配置 auth
- 本地因此进入无认证模式，完成 Shell 验收

结论：

- 本地壳层验收已完成
- 真实生产/预发 auth 仍依赖真实 `DATABASE_URL`
- staging 线上登录 smoke 仍建议在回灌前再跑一次

### 2. Roundtable 后端未接入

现状：

- 前端 `RoundtableStage` 已迁入
- 前端请求路径为同源 `/api/roundtable/...`
- 当前 SaaS/SSE server 中未发现对应 roundtable API 路由

处理口径：

- 本轮只保证 staging 可用于壳层/页面验证
- 不把 Roundtable 后端大功能混进本轮壳层迁移
- production 是否露出 Roundtable 入口仍待老卢最后拍板

### 3. 尚未回灌 SaaS staging

当前成果仍在：

- `codex/saas-shell-slice-integration`

尚未执行：

- merge 回 `MHSDC-GC-SAAS-staging`
- cherry-pick 回 `MHSDC-GC-SAAS-staging`
- push

---

## 当前工作区状态

本轮 shell 迁移代码已提交进 `b4c8ba2`。

仍存在大量未提交脏现场，主要是本轮之前/之外的文档、测试报告、pycache 删除、治理资产等；本轮 checkpoint commit 没有收进去。

已确认未提交脏现场包括但不限于：

- `docs/04_progress/dev_progress.md`
- `docs/dev_logs/HANDOFF.md`（本文件，当前保存进度后会变更）
- `testing/golden-crucible/*`
- `skills/__pycache__/*` 删除
- `.claude/skills`
- `.playwright-mcp/`
- `.vibedir/`
- 早期 `docs/plans/2026-04-06*` 等治理文档

不要误以为这些都是本轮 shell 迁移产生的。

---

## 下一步建议

### 推荐继续路线

1. 提交 auth placeholder fix 与进度文档
2. 如老卢确认，准备把 `codex/saas-shell-slice-integration` 的验收成果回灌 `MHSDC-GC-SAAS-staging`
3. 回灌前建议再跑一次：
   - `npm run typecheck:saas`
   - `npm run build`
   - agent-browser `/`、`/m/crucible`、`/m/roundtable`、`/llm-config`
4. 回灌后 staging 线上再做最终 smoke

### 严禁事项

- 不要直接 merge 整个 SSE 分支进 SaaS
- 不要在浏览器验收未完成前回灌 staging
- 不要把未归属的历史脏文件混进 shell 迁移提交
- 不要擅自决定 Roundtable production 可见性

---

## 关键命令记录

已通过：

```bash
npm run typecheck:saas
npm run build
```

本地 dev 曾启动：

```bash
npm run dev
```

本地端口：

- Frontend：`http://localhost:5183/` / `http://127.0.0.1:5183/`
- Backend：`http://0.0.0.0:3010`

本地 `.env.local` 口径：

- `PORT=3010`
- `VITE_APP_PORT=5183`
- `VITE_BACKEND_PORT=3010`
- `APP_BASE_URL=http://127.0.0.1:5183`
- `CORS_ORIGIN=http://127.0.0.1:5183`
- `BETTER_AUTH_URL=http://127.0.0.1:3010`

---

## 接管提示

如果新窗口接管，先执行：

```bash
git branch --show-current
git log --oneline -3
git status --short
npm run typecheck:saas
npm run build
```

期望：

- 分支为 `codex/saas-shell-slice-integration`
- 最新 commit 至少包含 `b4c8ba2`
- shell 迁移代码已在 commit 内
- 工作区仍可能有与本轮无关的历史脏文件
