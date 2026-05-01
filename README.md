# Director — 影视导演大师

> **DeliveryConsole** 二级模块  
> 负责 MindHikers 视频项目的视觉策略、分镜编排与 Remotion 动画生成

---

## 这是什么

`Director` 是 DeliveryConsole 的视频导演工作台，核心能力是把脚本转化为可执行的视觉方案：

- **Phase 1**：头脑风暴 → 概念卡生成
- **Phase 2**：B-Roll 方案 → 场景/镜头/画面细节编排
- **Phase 3**：最终分镜 → 可交付的视觉执行清单
- **Phase 4**：章节整合 → 完整视频结构

技术栈覆盖前端 React 组件、后端 adapter 逻辑、LLM 提示词工程，以及 Remotion 动画渲染链路。

---

## 当前状态

| 维度 | 状态 |
|------|------|
| 分支 | `MHSDC-DC-director` |
| 阶段 | Design System v0.2.0 target + UI 续作规划 |
| 构建 | `npm run build` 通过 |
| 测试 | 8 文件 / 45 测试通过 |
| 运行时 | Dev server + smoke 验证通过 |

**最近一次清理（2026-04-24）**：
- TypeScript 类型契约漂移修复
- Director Phase 组件清理
- Market / Legacy UI 兼容清理
- Director adapter 根因修复（props 深合并 + preview 失效）
- 测试口径修正

本地领先 `origin/MHSDC-DC-director` 4 个 commit，有意保留未提交改动，等待验收后再 commit / 回灌。

**设计系统更新（2026-05-01）**：
- 根目录 `design.md` 已成为 Director UI 与交互英文事实源。
- 根目录 `design.zh.md` 是中文协作镜像。
- 后续 UI PRD、实施计划和页面验收必须引用这两份设计准绳。

---

## 设计系统

Director 当前采用“温暖影视生产工作台”的设计方向：保留创意生产温度，同时吸收 Claude Code 的克制、状态透明、命令优先和审计感。

| 文件 | 说明 |
|------|------|
| `design.md` | Director 视觉与交互目标事实源，兼容 Google Stitch 风格 `DESIGN.md` 约定 |
| `design.zh.md` | 中文协作镜像 |
| `docs/plans/2026-05-01_director-design-target-prd.md` | 设计目标 PRD |
| `docs/plans/2026-05-01-director-design-system-ui-implementation-plan.md` | 设计系统 UI 续作实施计划 |

---

## 快速开始

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/Director
npm run dev
```

默认端口以 `~/.vibedir/global_ports_registry.yml` + `.env.local` 为准。

---

## 核心文件

| 文件 | 说明 |
|------|------|
| `server/expert-actions/director.ts` | Director adapter — 核心后端逻辑 |
| `design.md` / `design.zh.md` | UI 与交互设计事实源 |
| `src/styles/delivery-shell.css` | Delivery shell 视觉 token 与布局样式 |
| `src/components/delivery-shell/*` | 共享 Shell、Rail、Drawer、StatusBar |
| `src/components/director/*` | Phase 1–4 前端组件 |
| `src/types.ts` | 类型契约 |
| `docs/dev_logs/HANDOFF.md` | 当前交接状态 |
| `docs/04_progress/rules.md` | 模块规则 |

---

## 治理入口

- 模块 AGENTS：`./AGENTS.md`
- 父入口：`/Users/luzhoua/MHSDC/DeliveryConsole/AGENTS.md`
- 全局入口：`/Users/luzhoua/MHSDC/AGENTS.md`

---

*最后更新：2026-05-01*
