# GoldenCrucible-SSE

> MindHikers 黄金坩埚 — **研发前线**
> 所有新功能先在这里开发验证，再摘樱桃到 SaaS staging。

---

## 定位

`GoldenCrucible-SSE` 是黄金坩埚的**研发主线（SSE = Server-Sent Events + 研发前线）**。

所有新功能、新模块、新实验，先在 SSE 落地验证，稳定后再通过 cherry-pick 推送到 `GoldenCrucible-SaaS` 进行预发验收。

**发布流**：`SSE`（研发）→ `SaaS staging`（预发）→ `main`（生产 `gc.mindhikers.com`）

---

## 当前状态

- **版本**：v4.0.0
- **分支**：`MHSDC-GC-SSE`
- **状态**：P1 主骨架已落地，正在进行 Codex 风格细修与浏览器级验收补齐
- **最后更新**：2026-04-23

---

## 核心能力

- **两阶段对话引擎**：Socrates 决策 → 工具执行 → Socrates 合成
- **论文生成（ThesisWriter）**：收敛检测 → 论文生成 → Artifact 持久化 → Markdown 导出
- **BYOK 密钥管理**：引导式配置 + 错误分类 + 诊断测试
- **FactChecker 事实核查**：独立专家路由
- **试用额度控制**：平台用户限 2 次，BYOK/VIP 不受限
- **VIP 账户分层**：`account-tier` 覆盖
- **历史面板**：Session 列表 + 对话恢复 + 导出（bundle-json / markdown）
- **SSE 事件流**：前端 `fetch + ReadableStream` 实时渲染

---

## 技术栈

- **前端**：React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + react-router-dom + Zustand
- **后端**：Node.js + Express 5 + Socket.io + better-auth + PostgreSQL
- **校验**：Zod
- **测试**：Vitest + React Testing Library
- **部署**：Docker + Railway + PM2

---

## 快速开始

```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible-SSE
npm run dev
```

- 前端：`http://localhost:5182`
- 后端：`http://localhost:3009`

端口以 `~/.vibedir/global_ports_registry.yml` + `.env.local` 为准。

---

## 常用命令

```bash
npm run dev          # 开发模式
npm run build        # 构建
npm run typecheck:saas  # SaaS 类型检查
npm run test:run     # 运行测试
npm run lint         # 代码检查
npm run pm2:start    # PM2 启动
```

---

## 读取顺序

进入本仓后，按以下顺序读取：

1. `AGENTS.md` — 本仓治理入口
2. `docs/dev_logs/HANDOFF.md` — 当前会话交接状态
3. `docs/plans/` — 当前主线计划（PRD / 实施方案）
4. `docs/04_progress/rules.md` — 工程约束集
5. `testing/README.md` → `testing/OPENCODE_INIT.md` — 测试协议

---

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/SaaSApp.tsx` | 前端主入口 |
| `src/modules/crucible/CrucibleStage.tsx` | 主对话舞台 |
| `src/shell/ShellLayout.tsx` | 三栏壳层布局 |
| `server/crucible-orchestrator.ts` | 两阶段对话引擎 |
| `server/crucible-thesiswriter.ts` | 论文生成 API |
| `server/crucible-byok.ts` | BYOK 密钥管理 |
| `src/schemas/crucible-runtime.ts` | 运行时 Zod Schema |

---

## 安全提醒

- 不要把真实 API Key 写进 README、设计文档或提交记录
- 需要按 worktree 覆盖端口时，优先放到 `.env.local`
- 修改 `.env` / `.env.local` 后必须重启服务

---

**最后更新**：2026-04-24
