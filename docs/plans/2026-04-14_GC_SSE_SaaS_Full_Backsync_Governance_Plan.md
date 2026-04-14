# GoldenCrucible SaaS → SSE 全面回灌治理计划

> 📅 制定日期：2026-04-14
> 🌿 目标分支：`MHSDC-GC-SSE`（研发主线）
> 📍 数据源分支：`MHSDC-GC-SAAS-staging`（staging 阵地）
> 🔑 Linear：[MIN-135](https://linear.app/mindhikers/issue/MIN-135/saas-sse-全面回灌治理底座同步与文档链路修复)
> 👤 决策人：老卢

---

## 0. 背景与目标

### 治理大目标

**本次治理的核心验收标准：任何团队入驻 SSE，通过以下四条链路即可顺利接手开发。**

```
入驻团队
  ├─ OldYang skill（工程治理知识 — SSOT 在 ~/.opencode/skills/OldYang/）
  ├─ AGENTS.md（仓级入口 → 读序 → 红线 → 测试协议）
  ├─ HANDOFF.md（交接面 → 当前状态 → 下一步 → 验证清单）
  └─ rules.md（工程约束集 → 长期积累的 92 条开发规则与红线）
       ↓
   顺利在 SSE 开展开发工作
```

> **为什么纳入 rules.md 而不纳入更多**：`rules.md`（265 行 / 92 条规则）覆盖通用开发、环境配置、SSE/SaaS 特定约束，是 HANDOFF 之外的"长期工程记忆"，新团队必须了解才能避免踩坑。而 `docs/plans/` 是按需参考、`testing/` 是执行时才需要的——这些在 AGENTS.md 中已有指引，不需要在入驻必读链路中单独列出。

这意味着不仅代码要同步，**文档链路的可导航性、可接手性**同等重要。

### 定位确认

| 环境 | 分支 | 角色 | Railway 域名 |
|---|---|---|---|
| SSE | `MHSDC-GC-SSE` | **研发主线** — 所有新功能（含 Roundtable）先落在这里 | `golden-crucible-saas-sse.up.railway.app` |
| SaaS | `MHSDC-GC-SAAS-staging` | **staging 阵地** — SSE 验证通过后 push 到这里 | `golden-crucible-saas-staging.up.railway.app` |
| Production | `main` | **生产线** — SaaS 验收后合并 | `gc.mindhikers.com` |

### 问题陈述

SaaS 在过去两周独立完成了 thesis convergence、BYOK、trial quota、factcheck 等核心功能，SSE 缺少这些代码。SSE 作为研发主线，底座必须包含 SaaS 的全部已验证成果，才能安全承接即将进入的 Roundtable 摘樱桃。

### 目标（按优先级排列）

1. **可接手**：任何新团队通过 OldYang + AGENTS.md + HANDOFF 即可理解项目全貌并开始工作
2. **底座完整**：SSE 包含 SaaS staging 的全部已验证功能代码
3. **环境干净**：working tree 无死代码、临时文件、过期分支
4. **文档链路通**：AGENTS.md → HANDOFF → rules.md → plans/ → testing/ 全链路可导航
5. **构建通过**：build + test + lint 全绿，具备承接新功能的能力

---

## 1. 两边差异全景

### 1.1 Commit 差异

- **共同祖先**：`29a0414`（2026-03-24 snapshot）
- **SaaS 独有**：26 个 commit（MIN-105/107/108/109/119/120/121）
- **SSE 独有**：14 个 commit（MIN-105 多主题保存、artifact 导出、对话恢复等）
- **源码差异**：58 个文件，+7827 / -1091 行

### 1.2 SaaS 新增核心模块（SSE 缺少）

| 文件 | 功能 | 新增/修改 |
|---|---|---|
| `server/crucible-thesiswriter.ts` | 论文生成 API + artifact 持久化 | 新增 |
| `server/crucible-byok.ts` | BYOK 密钥诊断 + 错误分类 | 新增 |
| `server/crucible-factcheck.ts` | FactChecker 专家 | 新增 |
| `server/crucible-trial.ts` | 试用额度（平台用户限 2 次） | 新增 |
| `server/auth/account-tier.ts` | VIP 分层覆盖 | 新增 |
| `src/components/SaaSLLMConfigPage.tsx` | BYOK 引导式配置 UX | 新增 |
| `src/schemas/crucible-runtime.ts` | 运行时 Zod schema | 新增 |
| `src/components/crucible/sse.ts` | SSE 事件流客户端 | 新增 |
| `src/components/crucible/CrucibleHistorySheet.tsx` | 历史面板（696 行） | 新增 |
| `src/components/UserAvatarMenu.tsx` | 用户头像菜单 | 新增 |
| `src/auth/AppAuthContext.ts` | Auth 上下文扩展 | 新增 |

### 1.3 关键架构分叉：`crucible-orchestrator.ts`

| | SSE（当前） | SaaS（已升级） |
|---|---|---|
| 架构 | 单次调用：`buildSocratesPrompt` | 两阶段：`buildSocratesDecisionPrompt` → 工具执行 → `buildSocratesCompositionPrompt` |
| 工具路由 | 无 | `CrucibleToolName`、`CrucibleToolRouteMode`、`ToolExecutionTrace` |
| Socrates 能力 | 不能调用 Researcher/FactChecker | 可决策调用工具，结果注入第二轮 |

**策略：以 SaaS 版为基准回灌到 SSE**。SSE 独有的多主题保存逻辑需在此基准上重新确认是否已被 SaaS 版包含或需要手动补入。

### 1.4 SSE 独有（SaaS 不含）

| Commit | 内容 | 本次处理 |
|---|---|---|
| `3455d48` | multi-topic save and restore | 保留于 SSE；回灌 SaaS 的 orchestrator 后，验证多主题逻辑是否仍生效；后续单独提交到 SaaS |
| `9f3ab61` | artifact export hook | 同上：保留，验证兼容性，后续提交到 SaaS |
| `7ad4921` | conversation restore flow | 同上 |
| `3c998dd` | split draft save semantics | 同上 |
| `4e4b6b0` | lightweight history center | 同上 |
| `b6d14c8` | SaaS shell + legacy type debt isolation | 与 SaaS 的 SaaSApp.tsx 手动合并 |
| `13b8f99` | backsync from saas for multi-account baseline | 已包含在 SaaS 中，无需处理 |

**原则**：SSE 独有代码本次不删除，回灌完成后逐一验证兼容性，验证通过的将在后续窗口提交到 SaaS。

### 1.5 治理文件差异

本次治理的前提假设：**以后不管什么团队入驻 SSE，通过 OldYang 的知识、通过 SSE 本项目 AGENTS.md 的链接和通过 HANDOFF 文档链接，访问到下述文档都可以清晰获取项目信息。**

因此以下差异不只是"文件复制"，而是**必须确保文档链路通、内容可导航**：

| SaaS 有 / SSE 缺 | 性质 | 本次动作 |
|---|---|---|
| `skills/oldyang/` | OldYang skill 完整目录 | **不需要复制** — OldYang 通过全局路径 `~/.opencode/skills/OldYang/` 访问，所有项目共享同一 SSOT；SaaS 的 `skills/oldyang/` 是 Codex 时代遗留实体目录 |
| `docs/plans/2026-04-11_*_PRD.md` | 产品需求文档 | 复制到 SSE（入驻团队需要理解产品全景） |
| `docs/plans/2026-04-12-*` | 实施计划（4 份） | 复制到 SSE（理解各模块怎么来的） |
| `testing/golden-crucible/requests/TREQ-2026-04-12-*` | 4 个冒烟测试请求 | 复制到 SSE（可执行的验收基准） |
| `.vibedir/` | skill 备案目录 | 复制到 SSE |
| SaaS 的 HANDOFF (4/14) | 最新交接状态 | **不直接复制**；根据 SSE 回灌后的实际状态重写 SSE 的 HANDOFF |

---

## 2. 执行计划

### Phase 0：SSE 环境清扫（前置条件）

> ⚠️ 必须先完成，否则后续操作会遇到大量冲突

| # | 动作 | 命令/方法 | 预期结果 |
|---|---|---|---|
| 0.1 | 暂存并提交当前所有删除 | `git add -A && git status --short \| head -5` 确认后提交 | working tree 中的 `.agent/`、`node_modules_bad/` 等删除被提交 |
| 0.2 | 物理删除 `node_modules_bad/` | `rm -rf node_modules_bad/` | 释放 147MB |
| 0.3 | 删除死代码文件 | `rm server/llm.ts.orig server/llm_backup.ts .codex-tmp-restored-conversation.json` | 清理根目录临时文件 |
| 0.4 | 确认 `.gitignore` 覆盖 | 验证 `node_modules_bad/`、`.codex-tmp-*`、`*.orig` 已在忽略列表 | 无遗漏 |
| 0.5 | 验证 build 通过 | `npm run build:app` | 构建成功 |
| 0.6 | 提交清扫结果 | `refs MIN-135 clean SSE working tree dead code and artifacts` | 一次干净提交 |

**完成标准**：`git status --short` 干净（或只有 `.env` / `.env.local` 等 gitignore 文件），`npm run build:app` 通过。

### Phase 1：SaaS 核心模块回灌

> 以回灌为大致思路：以 SaaS 版为基准，逐模块将代码同步到 SSE

#### 1A. 基础设施层（无冲突风险）

| # | 模块 | SaaS commit | 方法 | 验证 |
|---|---|---|---|---|
| 1A.1 | `src/schemas/crucible-runtime.ts` | `d3b04ed` 的一部分 | 直接复制 | schema 导入无报错 |
| 1A.2 | `src/components/crucible/sse.ts` | 同上 | 直接复制 | 类型正确 |
| 1A.3 | `server/auth/account-tier.ts` | `d122584` | 直接复制 | 导入无报错 |
| 1A.4 | `src/auth/AppAuthContext.ts` | 在 SaaS 的多 commit 中 | 直接复制 | auth 链路无报错 |

#### 1B. 业务功能层（低冲突风险）

| # | 模块 | SaaS commit | 方法 | 验证 |
|---|---|---|---|---|
| 1B.1 | `server/crucible-byok.ts` | `8ee25ac` | 回灌复制 | BYOK 路由注册到 index.ts |
| 1B.2 | `server/crucible-factcheck.ts` | `d3b04ed` | 回灌复制 | FactCheck 路由注册 |
| 1B.3 | `server/crucible-trial.ts` | `f70d001` | 回灌复制 | Trial 路由注册 |
| 1B.4 | `server/crucible-thesiswriter.ts` | `db75abb` | 回灌复制 | Thesis 路由注册 |
| 1B.5 | `src/components/SaaSLLMConfigPage.tsx` | `edc06f7` | 回灌复制 | 页面渲染无报错 |

#### 1C. 架构升级层（高冲突风险，需手动合并）

| # | 模块 | 说明 | 方法 |
|---|---|---|---|
| 1C.1 | `crucible-orchestrator.ts` | 单次 → 两阶段架构升级 | **回灌覆盖**：以 SaaS 版为基准，检查 SSE 多主题逻辑是否需要补入 |
| 1C.2 | `SaaSApp.tsx` | SSE 的版本 vs SaaS 的版本（659 行差异） | **回灌覆盖**：以 SaaS 版为基准，确认 SSE 多主题逻辑已包含 |
| 1C.3 | `ChatPanel.tsx` | 322 行差异（thesis CTA + 工具路由） | **回灌覆盖** |
| 1C.4 | `CrucibleWorkspaceView.tsx` | 360 行差异 | **回灌覆盖** |
| 1C.5 | `storage.ts` | 308 行差异（历史存储升级） | **回灌覆盖** |
| 1C.6 | `types.ts` (crucible) | 124 行差异（新类型） | **回灌覆盖** |
| 1C.7 | `server/index.ts` | 路由注册 + 新模块引入 | 手动对齐 SaaS 的路由表 |
| 1C.8 | `Header.tsx` | 319 行差异 | **回灌覆盖** |

> ⚠️ 1C 层操作前，先备份 SSE 原版文件到 `server/crucible-orchestrator.ts.sse-backup` 等，便于回滚。

#### 1D. 测试同步

| # | 动作 | 来源 |
|---|---|---|
| 1D.1 | 复制 SaaS 的 `server/__tests__/` 新增测试 | `crucible-thesis-convergence.test.ts`、`crucible-byok-diagnostics.test.ts` |
| 1D.2 | 复制 SaaS 的 `src/__tests__/` 新增测试 | `crucible-factcheck.test.ts`、`schemas/crucible-runtime.test.ts`、`__tests__/crucible-orchestrator.test.ts` |
| 1D.3 | 复制 SaaS 的组件测试 | `crucible-thesis-entry.test.tsx`、`saas-llm-config-guidance.test.tsx` |
| 1D.4 | 保留 SSE 独有测试 | `storage.test.ts`、`sse.test.ts`（待后续对齐） |
| 1D.5 | 标记旧架构测试 | `crucible-prompt.test.ts` 添加 `describe.skip('legacy single-prompt', ...)` |
| 1D.6 | 更新 `vitest.config.ts` | 加入 `server/**/*.{test,spec}` glob（对齐 SaaS） |

#### 1E. server/index.ts 路由对齐

**关键清单**（必须逐一核对挂载）：

- [ ] `/api/crucible/thesis/generate` — thesiswriter
- [ ] `/api/crucible/thesis/trial-status` — trial
- [ ] `/api/crucible/byok/diagnostics` — byok diagnostics
- [ ] FactCheck expert route — factcheck
- [ ] Account tier route — account-tier
- [ ] Auth:migrate 在 start script 中的添加

**验证**：`npm run build:app` + `npm run test:run` 通过

### Phase 2：治理文件同步 + 文档链路修复

> 本 Phase 目标不仅是复制文件，而是确保 AGENTS.md → HANDOFF → plans/ → testing/ 全链路可导航

| #   | 动作                             | 说明                                                                                 |
| --- | ------------------------------ | ---------------------------------------------------------------------------------- |
| 2.1 | 复制 PRD 到 SSE                   | `docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`                                 |
| 2.2 | 复制实施计划到 SSE                    | `docs/plans/2026-04-12-001/002/003` + `BYOK_Config_UX`                             |
| 2.3 | 复制冒烟测试请求到 SSE                  | `testing/golden-crucible/requests/TREQ-2026-04-12-*`                               |
| 2.4 | ~~复制 OldYang skill 到 SSE~~ | **不需要** — OldYang 通过全局路径 `~/.opencode/skills/OldYang/` 访问，所有项目共享 SSOT；SaaS 的 `skills/oldyang/` 是 Codex 时代遗留 |
| 2.5 | 同步 `package.json` start script | 添加 `auth:migrate` 前置步骤（对齐 SaaS）                                                    |
| 2.6 | **重写 AGENTS.md**               | 补充回灌后的当前架构描述、模块索引、PRD 链接、关键 schema 说明；确保新团队能从 AGENTS.md 理解项目全貌                     |
| 2.7 | **重写 HANDOFF**                 | 根据回灌后的实际状态重写（不是复制 SaaS 的），包含：回灌结果、当前模块清单、已验证的 commit、验收状态、下一步                      |
| 2.8 | 更新 rules.md                    | 补充回灌相关规则（如"回灌以 SaaS 版为基准"、"SSE 独有逻辑验证后再提交 SaaS"）                                   |
| 2.9 | 更新 dev_progress.md             | 记录本次回灌为里程碑事件                                                                       |

### Phase 3：验证与收尾

> ⚠️ 验收环节：老杨自验完成后，必须让老卢通过本地或 Railway 云端域名访问 SSE 环境，并提供一目了然的验收清单。

#### 3A. 老杨自验

| # | 动作 | 验证标准 |
|---|---|---|
| 3A.1 | 完整 build | `npm run build:app` exit 0 |
| 3A.2 | 单元测试 | `npm run test:run` 通过（旧架构测试已 skip） |
| 3A.3 | Lint | `npm run lint` 无新增 error |
| 3A.4 | 本地启动验证 | `npm run dev` 正常启动，前端 + 后端均无 crash |
| 3A.5 | 功能冒烟 | 手动走一遍核心链路：登录 → 对话 → 论文 CTA → BYOK 配置 |
| 3A.6 | 文档链路检查 | 从 AGENTS.md 出发，逐一确认所有链接可访问、内容有意义 |
| 3A.7 | Railway 部署验证 | push 后 `golden-crucible-saas-sse.up.railway.app` 部署成功、health check 通过 |
| 3A.8 | 提交 | `refs MIN-135 complete SaaS backsync to SSE` |

#### 3B. 老卢验收清单

> 以下清单供老卢快速验收，预计 5-10 分钟

**本地验收**（`npm run dev` 启动后）：

| # | 验收项 | 操作 | 预期结果 | ✅/❌ |
|---|---|---|---|---|
| V1 | 首页加载 | 浏览器打开 `http://localhost:5182` | 页面正常渲染，无白屏 | |
| V2 | 登录/注册 | 点击登录，使用 Google 或邮箱登录 | 登录成功，跳转到主界面 | |
| V3 | 对话主链 | 新建对话，输入任意问题 | Socrates 正常回复，SSE 流式输出 | |
| V4 | 论文 CTA | 连续对话 5+ 轮，观察是否出现"进入论文"按钮 | CTA 按钮出现（两阶段架构生效的标志） | |
| V5 | BYOK 配置 | 进入 LLM 配置页，查看 BYOK 引导界面 | 配置页面正常渲染 | |
| V6 | 历史面板 | 点击历史按钮 | 历史列表可展开、可恢复 | |

**云端验收**（Railway 部署后）：

| # | 验收项 | 操作 | 预期结果 | ✅/❌ |
|---|---|---|---|---|
| V7 | SSE 域名访问 | 打开 `golden-crucible-saas-sse.up.railway.app` | 页面正常 | |
| V8 | Health check | 访问 `/health` | 返回 JSON 状态 | |

**文档验收**：

| # | 验收项 | 操作 | 预期结果 | ✅/❌ |
|---|---|---|---|---|
| V9 | AGENTS.md | 读取 `AGENTS.md` | 能理解项目角色、读序、红线 | |
| V10 | HANDOFF | 读取 `docs/dev_logs/HANDOFF.md` | 时间戳为今天、分支正确、回灌结果已记录 | |
| V11 | 模块清单 | 从 AGENTS.md 或 HANDOFF 找到各模块说明 | 能快速理解有哪些功能模块 | |

### Phase 4：Roundtable 摘樱桃准备（后续）

> 本计划不含 Roundtable 实施本身，只确保底座 ready

| # | 准备动作 | 说明 |
|---|---|---|
| 4.1 | 确认 SSE 与 SaaS 的 `crucible-orchestrator.ts` 完全对齐 | 两阶段架构是 Roundtable 的前置依赖 |
| 4.2 | 确认测试覆盖 | orchestrator 测试、工具路由测试在 SSE 中通过 |
| 4.3 | 确认 Railway SSE 部署正常 | `golden-crucible-saas-sse.up.railway.app` 验证 |
| 4.4 | Roundtable 进入后，优化完成再 push 到 SaaS | 按 `SSE → SaaS → main` 流程 |

---

## 3. 风险清单

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| orchestrator 回灌覆盖引入 bug | 核心链路断裂 | 回灌前备份 SSE 原版；Phase 3 冒烟验证覆盖 |
| SSE 独有的多主题保存逻辑与新架构冲突 | 功能回归 | 回灌后逐一验证 SSE 独有功能；不兼容的立即标记 |
| `server/index.ts` 路由挂载遗漏 | 404 | Phase 1E 清单逐项勾选 |
| 类型债（`tsconfig.saas.json` 排除的旧模块） | build 误报 | 沿用 SaaS 的隔离策略，不扩大 typecheck 范围 |
| 旧架构测试与新架构不兼容 | 测试红 | 1D.5 已安排 skip 旧测试 |
| 文档链路断裂 | 新团队无法接手 | Phase 2.6-2.8 专门修复；Phase 3A.6 验证 |

---

## 4. 执行约束

1. **每个 Phase 完成后提交一次**，commit message 格式：`refs MIN-135 <phase描述>`
2. **Phase 0 完成前不动源码**
3. **Phase 1C（架构升级）回灌覆盖前备份 SSE 原版**
4. **不做任何 SaaS 方向的 push**，只做 SaaS → SSE 单向回灌
5. **Phase 3B 老卢验收通过后才算完成**
6. **Roundtable 相关代码不在本计划范围**

> Linear issue 已创建：[MIN-135](https://linear.app/mindhikers/issue/MIN-135/saas-sse-全面回灌治理底座同步与文档链路修复)，挂在 MIN-94（黄金坩埚 SAAS 安全上线）下。

---

## 5. 预估工作量

| Phase | 预估时间 | 说明 |
|---|---|---|
| Phase 0：清扫 | 15 min | 机械操作 |
| Phase 1A：基础设施 | 10 min | 直接复制，无冲突 |
| Phase 1B：业务功能 | 30 min | 逐模块复制 + 路由注册 |
| Phase 1C：架构升级 | 60-90 min | 回灌覆盖 + 备份 + 验证 |
| Phase 1D：测试同步 | 15 min | 复制 + skip 旧测试 + vitest config |
| Phase 1E：路由对齐 | 15 min | 清单核对 |
| Phase 2：治理同步 | 30 min | 文件复制 + AGENTS.md/HANDOFF 重写 |
| Phase 3A：自验 | 30 min | build + test + 冒烟 + 文档链路 |
| Phase 3B：老卢验收 | 10 min | 按验收清单走一遍 |
| **合计** | **3.5-4.5 小时** | |

---

## 6. 待确认项

| # | 问题 | 状态 |
|---|---|---|
| D1 | 关联的 Linear issue 编号？ | ✅ 已创建 MIN-135 |
| D2 | `docker-compose.yml` 端口（5173/3002 → 5182/3009）是否一起修？ | 本次修（顺手的事） |
| D3 | Roundtable 摘樱桃预计什么时候进入？ | 影响回灌优先级，待老卢确认 |

---

*计划 v3 — 已处理第二轮批注 3 处（rules.md 纳入链路 / OldYang 不复制 / MIN-135 已创建）。待老卢最终确认后执行。*
