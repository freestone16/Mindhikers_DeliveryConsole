---
title: feat: 复制 SSE 底座到 Roundtable
type: feat
status: active
date: 2026-04-10
---

# feat: 复制 SSE 底座到 Roundtable

**Target repo:** GoldenCrucible-Roundtable
**Source repo:** GoldenCrucible-SSE

## Overview

将 GoldenCrucible-SSE 的开发底座（配置、最小后端基础设施、前端空壳与公共资源）有选择地迁移到 GoldenCrucible-Roundtable，保证 `npm run dev` 可启动，同时不覆盖 Roundtable 已有治理骨架。

## Problem Frame

Roundtable 目前只有治理骨架，缺少可运行的 dev 底座。需要在不引入 SSE 业务模块的前提下，移植可运行的 Express + Vite + React 基础设施，满足后续圆桌模块开发。

## Requirements Trace

- R1. Roundtable 拥有可运行的 dev 环境底座，`npm run dev` 能启动（前端可为空壳）。
- R2. 严格遵循“只复制底座、不复制业务模块、不覆盖治理文件”的边界。
- R3. 后端端口使用 3005，前端端口使用 5180。
- R4. `.env.example` 保留端口配置说明，禁止复制 `.env` / `.env.local`。

## Scope Boundaries

- 不覆盖 Roundtable 现有治理文件（`AGENTS.md`、`docs/`、`testing/`）。
- 不复制 SSE 业务模块与明确禁用目录（director/shorts/music/remotion/youtube/market/distribution/visual-plan/pipeline 等）。
- 不复制 `node_modules/`、`dist/`、`.git/`、`uploads/`、`logs/`、`runtime/`、`secrets/`。
- 不复制 SSE 文档与技能目录（`docs/`、`skills/`、`.agent/`、`.claude/`、`deliveryConsole/`、`Prompts/`、`Reference/`）。
- 不复制 `server/crucible.ts`。

## Context & Research

### Relevant Code and Patterns

- SSE 配置与脚手架入口：
  - `package.json`
  - `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`
  - `vite.config.ts`
  - `eslint.config.js`
  - `vitest.config.ts`
  - `index.html`
  - `.gitignore` / `.npmrc` / `.env.example`
  - `Makefile` / `ecosystem.config.cjs`
  - `Dockerfile.backend` / `Dockerfile.dev` / `Dockerfile.frontend` / `docker-compose.yml`
- SSE 后端入口与基础设施：
  - `server/index.ts`
  - `server/llm.ts` / `server/llm-config.ts` / `server/llm_backup.ts`
  - `server/project-root.ts` / `server/graceful-shutdown.ts` / `server/health.ts`
  - `server/crucible-persistence.ts` / `server/crucible-orchestrator.ts`
  - `server/crucible-soul-loader.ts` / `server/crucible-research.ts`
  - `server/skill-loader.ts` / `server/chat.ts`
- SSE 前端入口与基础资源：
  - `src/main.tsx` / `src/App.tsx`
  - `src/App.css` / `src/index.css`
  - `src/types.ts` / `src/config/` / `src/schemas/` / `src/hooks/`
  - `public/`
  - `scripts/`

### Institutional Learnings

- 当前仓只有治理约束，无针对脚手架迁移的专项指导；需按规则“先计划再实施”。

### External References

- 无（本次以现有 SSE 模式为准）。

## Key Technical Decisions

- **采用 SSE 作为唯一底座源**：Roundtable 现为空仓，仅保留治理文件，直接对齐 SSE 结构可最小化偏差。
- **最小后端入口**：`server/index.ts` 只保留 health + crucible persistence + LLM config 三类路由，避免引入业务模块。
- **端口重映射**：后端 3005、前端 5180，避免与 SSE 冲突。
- **前端保留空壳**：`src/App.tsx` 精简为最小布局，删除非圆桌路由与业务引用。

## Open Questions

### Resolved During Planning

- 是否需要额外 requirements 文档：否（本次为明确的底座迁移任务）。

### Deferred to Implementation

- `server/index.ts` 具体路由挂载路径以 `server/health.ts`、`server/crucible-persistence.ts`、`server/llm-config.ts` 内部定义为准，实施时以实际导出为准。

## Implementation Units

- [ ] **Unit 1: 复制项目配置与运行底座**

**Goal:** 将 SSE 的配置/构建底座复制到 Roundtable，并完成项目名、版本号与端口修改。

**Requirements:** R1, R2, R3, R4

**Dependencies:** 无

**Files:**
- Create/Copy (if missing):
  - `package.json`（修改 `name` 为 `golden-crucible-roundtable`，`version` 为 `1.0.0`）
  - `package-lock.json`
  - `tsconfig.json`
  - `tsconfig.app.json`
  - `tsconfig.node.json`
  - `vite.config.ts`（前端端口改为 5180）
  - `index.html`
  - `eslint.config.js`
  - `vitest.config.ts`
  - `.gitignore`
  - `.env.example`（仅示例，加入 3005/5180 说明）
  - `.npmrc`
  - `Makefile`
  - `ecosystem.config.cjs`
  - `Dockerfile.backend`
  - `Dockerfile.dev`
  - `Dockerfile.frontend`
  - `docker-compose.yml`

**Approach:**
- 仅在目标不存在时复制；已存在则跳过，避免覆盖治理文件。
- `package.json` 与 `vite.config.ts` 仅做必要字段修改，不引入 SSE 业务依赖变更。
- `.env.example` 保留端口说明，禁止复制 `.env` / `.env.local`。

**Patterns to follow:**
- SSE 的配置文件结构与字段组织方式（见 `package.json`、`vite.config.ts`、`tsconfig.*.json`）。

**Test scenarios:**
- Test expectation: none -- 配置迁移与端口调整为结构性变更，无新增业务行为。

**Verification:**
- Roundtable 具备完整 dev 配置文件集合，端口与项目信息符合要求。

- [ ] **Unit 2: 后端基础设施拷贝与入口精简**

**Goal:** 复制 SSE 的后端基础设施文件，并将 `server/index.ts` 精简为最小可启动 Express 服务。

**Requirements:** R1, R2, R3

**Dependencies:** Unit 1

**Files:**
- Copy:
  - `server/llm.ts`
  - `server/llm-config.ts`
  - `server/llm_backup.ts`
  - `server/project-root.ts`
  - `server/graceful-shutdown.ts`
  - `server/health.ts`
  - `server/crucible-persistence.ts`
  - `server/crucible-orchestrator.ts`
  - `server/crucible-soul-loader.ts`
  - `server/crucible-research.ts`
  - `server/skill-loader.ts`
  - `server/chat.ts`
- Modify:
  - `server/index.ts`（移除 SSE 业务模块 import 与路由注册，仅保留 health + crucible persistence + LLM config）

**Approach:**
- 以 SSE `server/index.ts` 为模板，删除明确列出的非圆桌模块路由与依赖。
- 仅挂载基础设施路由与 health 路由，保留最小 Express 启动与 graceful shutdown 能力。
- 后端端口从 SSE 默认改为 3005（以 `.env.example` 与启动配置为准）。

**Patterns to follow:**
- SSE `server/index.ts` 的服务初始化与路由挂载结构。

**Test scenarios:**
- Happy path: 启动服务后，health 路由按 `server/health.ts` 约定返回 200/OK。
- Integration: LLM config 路由按 `server/llm-config.ts` 的导出保持可用（无业务依赖时报 404/500）。
- Integration: crucible persistence 路由按 `server/crucible-persistence.ts` 的导出保持可用（无业务依赖时报 404/500）。

**Verification:**
- `server/index.ts` 不再引用 SSE 业务模块且服务可启动。

- [ ] **Unit 3: 前端最小骨架迁移**

**Goal:** 复制前端入口与基础样式文件，`App` 精简为圆桌空壳布局。

**Requirements:** R1, R2

**Dependencies:** Unit 1

**Files:**
- Copy:
  - `src/main.tsx`
  - `src/App.css`
  - `src/index.css`
  - `src/types.ts`
  - `src/config/`
  - `src/schemas/`
  - `src/hooks/`
- Modify:
  - `src/App.tsx`（删除 SSE 非圆桌路由与业务引用，仅保留空壳布局）
- Create:
  - `src/components/`（仅建目录结构，不复制组件）

**Approach:**
- `src/main.tsx` 可沿用 SSE 入口结构，但 `App` 内容保持极简。
- `App.tsx` 仅保留基础布局与占位文本，避免引入 SSE 业务组件。

**Patterns to follow:**
- SSE `src/main.tsx` 与样式文件组织方式。

**Test scenarios:**
- Happy path: 前端启动后显示空壳页面（不加载 SSE 路由）。

**Verification:**
- 前端构建完成后不依赖 SSE 业务模块即可渲染。

- [ ] **Unit 4: 公共资源与工具脚本迁移**

**Goal:** 将公共资源与开发脚本复制到 Roundtable，支持开发体验与静态资源加载。

**Requirements:** R1, R2

**Dependencies:** Unit 1

**Files:**
- Copy:
  - `public/`
  - `scripts/`

**Approach:**
- 仅复制静态与脚本工具，不引入 SSE 私有资源目录。

**Patterns to follow:**
- SSE `public/` 与 `scripts/` 目录结构。

**Test scenarios:**
- Test expectation: none -- 静态资源与脚本迁移无新业务行为。

**Verification:**
- 静态资源可被 Vite 正常加载，脚本可供开发使用。

- [ ] **Unit 5: 安装与最小验证**

**Goal:** 完成依赖安装与 TypeScript 无编译错误验证。

**Requirements:** R1

**Dependencies:** Unit 1-4

**Files:**
- Modify (if needed): `package-lock.json`

**Approach:**
- 依赖安装后执行类型检查，允许因入口精简造成的可预期缺失提示，但需确保 `tsc --noEmit` 不报错。

**Test scenarios:**
- Happy path: `npm run dev` 可启动（前端为空壳）。
- Happy path: `npx tsc --noEmit` 通过。

**Verification:**
- dev 启动成功且类型检查通过。

## System-Wide Impact

- **Interaction graph:** dev 启动路径跨前后端，Vite 代理需指向后端 3005。
- **Error propagation:** 若基础设施路由缺失将导致健康检查或配置读取失败，应提前在 `server/index.ts` 挂载。
- **State lifecycle risks:** 无新增持久化逻辑，仅基础设施复用。
- **API surface parity:** 对外仅保留 health + crucible persistence + LLM config 路由；其余 SSE API 不引入。
- **Integration coverage:** 需确认路由挂载与端口代理保持一致。
- **Unchanged invariants:** Roundtable 治理文件与 testing 入口保持原样不变。

## Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| 复制配置导致端口冲突 | 明确修改 `.env.example` 与 `vite.config.ts` 端口为 3005/5180 |
| `server/index.ts` 精简后仍残留 SSE 业务 import | 逐项移除明确禁用模块的 import/route |
| 复制过程中误覆盖治理文件 | 复制前先判断目标存在则跳过，治理目录不参与复制 |
| TypeScript 引用缺失导致编译失败 | 只保留基础设施模块；如需保留类型定义，按 SSE 模式对齐 |

## Documentation / Operational Notes

- 无需新增文档，但更新后的 `.env.example` 必须明确端口与运行说明。

## Sources & References

- Related code: `package.json`, `vite.config.ts`, `server/index.ts`, `src/main.tsx`
