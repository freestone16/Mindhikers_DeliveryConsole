# GoldenCrucible-SaaS

> MindHikers 黄金坩埚 — **预发收口线**
> SSE 验证后的功能在这里做生产级验收，通过后合并到 `main` 推 production。

---

## 定位

`GoldenCrucible-SaaS` 是黄金坩埚的**预发阵地（SaaS staging）**。

它不是 SSE 的子集，而是独立的、经过生产级验收的发布收口线。SSE 侧验证通过的功能，通过 cherry-pick 推送到 SaaS，在这里完成 staging 冒烟测试，最终合并到 `main` 分支部署到生产环境 `gc.mindhikers.com`。

**发布流**：`SSE`（研发）→ `SaaS staging`（预发验收）→ `main`（生产）

**底座回灌**：SaaS 验收过程中产生的底座修复（认证、构建、前端壳等），必须回灌 SSE，确保研发前线的底座健全。

---

## 当前状态

- **版本**：v4.0.0
- **分支**：`MHSDC-GC-SAAS-staging`
- **状态**：V1 Phase 1-2 已完成，Phase 3 staging 冒烟测试中
- **最后更新**：2026-04-16

### Phase 验收状态

| Phase | 状态 |
|-------|------|
| Phase 1 — Core Path + BYOK 引导 | ✅ 完成 |
| Phase 2 — ThesisWriter + Trial 额度 | ✅ 完成 |
| Phase 3 — Staging 冒烟 | ⚠️ 部分完成（TREQ-006 对话收敛验证中）|

---

## 核心能力

与 SSE 共享同一套功能集，但只包含**已通过生产级验收**的模块：

- **两阶段对话引擎**：Socrates 决策 → 工具执行 → 合成
- **论文生成（ThesisWriter）**：收敛检测 → 论文生成 → Artifact 持久化
- **BYOK 密钥管理**：引导式配置 + 错误分类
- **FactChecker 事实核查**
- **试用额度控制**：平台用户限 2 次
- **VIP 账户分层**
- **历史面板**：Session 管理 + 导出

---

## 技术栈

与 SSE 完全一致：

- **前端**：React 19 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4
- **后端**：Node.js + Express 5 + better-auth + PostgreSQL
- **校验**：Zod
- **测试**：Vitest + React Testing Library
- **部署**：Railway（staging + production）

---

## 环境拓扑

| 环境 | Railway 服务 | 域名 | Git 分支 |
|------|-------------|------|----------|
| Production | `golden-crucible-saas` | `gc.mindhikers.com` | `main` |
| **Staging** | `golden-crucible-saas-staging` | `golden-crucible-saas-staging.up.railway.app` | `MHSDC-GC-SAAS-staging` |
| SSE 研发 | `golden-crucible-saas-sse` | `golden-crucible-saas-sse.up.railway.app` | `MHSDC-GC-SSE` |

---

## 快速开始

```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible-SaaS
npm run dev
```

- 前端：`http://localhost:5182`
- 后端：`http://localhost:3009`

---

## 常用命令

```bash
npm run dev          # 开发模式
npm run build        # 构建
npm run typecheck:saas  # SaaS 类型检查
npm run test:run     # 运行测试
npm run lint         # 代码检查
npm run start        # 生产启动（含 auth:migrate）
```

---

## 读取顺序

1. `AGENTS.md` — 本仓治理入口
2. `docs/dev_logs/HANDOFF.md` — 当前会话交接状态
3. `docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md` — 产品需求
4. `docs/04_progress/rules.md` — 工程约束集
5. `testing/README.md` → `testing/OPENCODE_INIT.md` — 测试协议

---

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/SaaSApp.tsx` | 前端主入口 |
| `server/index.ts` | 后端路由总入口 |
| `server/crucible-orchestrator.ts` | 两阶段对话引擎 |
| `server/crucible-thesiswriter.ts` | 论文生成 API |
| `server/crucible-byok.ts` | BYOK 密钥管理 |
| `server/auth/account-tier.ts` | VIP 账户分层 |

---

## 安全提醒

- 不要把真实 API Key 写进 README、设计文档或提交记录
- 需要按 worktree 覆盖端口时，优先放到 `.env.local`
- 修改 `.env` / `.env.local` 后必须重启服务

---

**最后更新**：2026-04-24
