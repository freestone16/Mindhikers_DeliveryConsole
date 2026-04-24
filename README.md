# GoldenCrucible-Roundtable

> MindHikers 黄金坩埚 — **圆桌讨论模块**> 多角色多视角的对话沙盘，支持命题锐化、Spike 提取与深聊桥接。

---

## 定位

`GoldenCrucible-Roundtable` 是黄金坩埚的**圆桌讨论模块**，支持**多角色多视角的对话沙盘能力**。

用户输入一个命题，系统会召唤多个哲学/学科视角的 Persona 进行结构化讨论，产出 Spike（思想火花），并支持从 Spike 进入深聊模式。

**注意**：Roundtable 不是 SaaS 一期验收阻塞项，是独立的功能模块。后续可能和 GoldenCrucible-SaaS 合并。

---

## 当前状态

- **版本**：v0.1.0
- **分支**：`MHSDC-GC-RT`
- **状态**：Initiation 阶段，Unit 1-6 已完成
- **最后更新**：2026-04-13

### 实施进度

| Unit | 主题 | 状态 |
|------|------|------|
| Unit 1 | PersonaProfile 契约 + 7 哲人档案 | ✅ Done |
| Unit 2 | 命题锐化模块 | ✅ Done |
| Unit 3 | 圆桌引擎核心 | ✅ Done |
| Unit 4 | Spike 提取 + 持久化 | ✅ Done |
| Unit 5 | Spike → 深聊桥接 | ✅ Done |
| Unit 6 | 前端侧边栏 + 导演 UI | ✅ 代码完成 |
| Unit 7 | GUI 风格对齐 | ⏳ 待开发 |

---

## 核心能力

- **命题锐化（Proposition Sharpener）**：用户输入模糊命题，系统自动锐化为可讨论的清晰命题
- **多 Persona 圆桌引擎**：7+ 哲人/学科视角参与结构化讨论
- **Spike 提取**：从讨论中提取高价值思想火花（Spike）
- **深聊桥接**：从 Spike 进入一对一深度对话
- **导演控制面板**：控制讨论节奏、方向、Persona 参与度
- **SSE 流式渲染**：`fetch + ReadableStream + TextDecoder` 实时展示讨论过程

---

## 技术栈

- **前端**：React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **后端**：Node.js + Express 5 + better-auth + PostgreSQL
- **状态管理**：`useReducer` 驱动 SSE 事件
- **测试**：Vitest + Playwright

---

## 快速开始

```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible-Roundtable
npm run dev
```

- 前端：`http://localhost:5180`
- 后端：`http://localhost:3005`

---

## 验证

```bash
npm run typecheck:full   # TypeScript 类型检查
npm run test:run         # 运行测试（当前 49 passing, 2 skipped）
npm run dev              # 启动开发服务器
```

---

## 读取顺序

1. `AGENTS.md`
2. `docs/dev_logs/HANDOFF.md`
3. `docs/plans/2026-04-10_golden-crucible-roundtable_Bootstrap_Plan.md` — Bootstrap 计划
4. `docs/plans/2026-04-12_unit6-frontend-sidebar-director-ui.md` — Unit 6 方案
5. `docs/04_progress/rules.md`
6. `testing/README.md`

---

## 关键文件

| 文件 | 说明 |
|------|------|
| `server/roundtable-engine.ts` | 圆桌引擎核心 |
| `server/proposition-sharpener.ts` | 命题锐化模块 |
| `server/spike-extractor.ts` | Spike 提取器 |
| `server/deepdive-engine.ts` | 深聊桥接引擎 |
| `src/components/roundtable/RoundtableView.tsx` | 前端主视图 |
| `src/components/roundtable/useRoundtableSse.ts` | POST SSE Hook |
| `src/components/Sidebar.tsx` | 左侧导航栏 |

---

## 架构决策

| 维度 | 值 |
|------|-----|
| 前端端口 | 5180 |
| 后端端口 | 3005 |
| API 前缀 | `/api/roundtable/*` |
| SSE 实现 | `fetch + ReadableStream + TextDecoder`（POST SSE）|
| 状态管理 | `useReducer` |
| 设计 Token | 暖色羊皮纸变量 |
| 布局 | Sidebar(240px) + RoundtableView(flex-1) |

---

## 安全提醒

- 不要把真实 API Key 写进 README、设计文档或提交记录
- 修改 `.env` / `.env.local` 后必须重启服务

---

**最后更新**：2026-04-24
