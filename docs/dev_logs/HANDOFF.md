🕐 Last updated: 2026-04-17 CST
🌿 Branch: MHSDC-GC-SSE
👤 Conductor: 老杨（OldYang）｜ Owner: 老卢（Zhou Lu）

---

# GoldenCrucible-SSE · 外部团队接手文档

> **当前状态**：Phase 0 完全收尾 ✅ · Phase 1-6 实施计划 v1.1 老卢已批复 ✅ · **Phase 1 可立即启动** 🚀

---

## 一、你在接手什么

这是 **GoldenCrucible** 产品的 UI 大重构项目（代号 UI Architecture）。目标是把现有功能从临时架构重整为一套对标 Claude Code 质感的、可插拔的四段式工作流产品。

**产品主线**（四段式工作流）：
```
GoldenRador（选题）→ Roundtable（圆桌辩论）→ GoldenCrucible（炼制）→ GoldenQuill（改写）
```

**两大架构灵魂**（贯穿所有 Phase，任何时候都不能稀释）：
1. **Pluggable Slot Architecture** —— 三层可插拔：Channel（调性）/ Persona（人格）/ Skill（技能），加新能力不改代码只填卡片
2. **Cross-Module Handoff Contract** —— 四段流转契约，每一棒可追溯、可反悔（30s Toast）、可一键回溯源头

---

## 二、环境与代码库

### 本地路径
```
SSE（你的工作线）：/Users/luzhoua/MHSDC/GoldenCrucible-SSE      分支：MHSDC-GC-SSE
SaaS（生产预发）：/Users/luzhoua/MHSDC/GoldenCrucible-SaaS      ⛔ 禁止外部团队触碰
```

### 端口（SSE 线，⚠️ 不要用 SaaS 的端口）
| 服务 | 端口 |
|---|---|
| Backend | **3009** |
| Frontend | **5182** |

> 权威账本：`~/.vibedir/global_ports_registry.yml`
> 常见错误：SaaS 用 3010/5183，与 SSE 不同，搞混会撞线崩溃。

### 环境变量（复制 `.env.example` 开始）
```bash
cp .env.example .env.local
# 必填项：
PORT=3009
VITE_APP_PORT=5182
VITE_API_BASE_URL=http://localhost:3009
APP_BASE_URL=http://localhost:5182
CORS_ORIGIN=http://localhost:5182
SESSION_SECRET=<32+位随机串>
# LLM Provider 至少配一个：
OPENAI_API_KEY= 或 ANTHROPIC_API_KEY= 或 DEEPSEEK_API_KEY=
```
> ⚠️ `.env` 只写英文注释（中文会让 dotenv 解析失败）

### 本地启动
```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible-SSE
npm install
npm run dev        # 同时启动前后端（concurrently）
npm run build      # 构建验证
npm run typecheck  # 类型检查
```

### 部署
| 线 | 域名 | 权限 |
|---|---|---|
| SSE（你负责）| `golden-crucible-saas-sse.up.railway.app` | 外部团队可部署验证 |
| SaaS（生产）| 另一条域名 | ⛔ 禁止触碰 |

---

## 三、必读文档（按顺序）

| 优先级 | 文件 | 读什么 |
|---|---|---|
| ⭐⭐⭐ 本文件 | `docs/dev_logs/HANDOFF.md` | 当前状态、进入方式 |
| ⭐⭐⭐ 实施计划 | `docs/plans/2026-04-17_UI_Architecture_Phase1-6_Implementation_Plan.md` | **Phase 1 任务分解（你最需要的）**、附录 1 接入指南、附录 2 研发红线、附录 5 已拍板决策 |
| ⭐⭐⭐ PRD v1.0 | `docs/plans/2026-04-16_UI_Architecture_PRD_v1.0.md` | 总纲 + §3（Slot）+ §4（Handoff）+ §7（路由/状态）+ §8（Design System）+ §11（Phase 路线）|
| ⭐⭐ 视觉锚点 | `demos/ui-north-star/` | 视觉终局 4 屏 demo（运行：`python3 -m http.server 5173 --directory demos/ui-north-star`，键盘 1/2/3/4 切屏）|
| ⭐⭐ 扫雷报告 | `docs/dev_logs/2026-04-16_persistence-diff-scan.md` | Phase 2 必读：`appendSpikesToCrucibleConversation` 从 RT 仓库拷入的操作清单 |
| ⭐ 研发红线 | `docs/04_progress/rules.md` | 109+ 条精炼规则，遇到疑问先查这里 |
| ⭐ 北极星简报 | `docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md` | 视觉纪律 + 红线（Phase 1 实现组件原语时参考）|

---

## 四、Linear Issue 结构

```
MIN-94  黄金坩埚 SaaS 安全上线（总父 issue）
└── MIN-136  UI Architecture · Phase 1 · Design System + Shell 空壳  ← 你的入口
    ├── MIN-137  P1.T1 · tokens.css 工程化                           工时：M  前置：无
    ├── MIN-138  P1.T2 · 组件原语库第一批（通用）                     工时：L  前置：T1
    ├── MIN-139  P1.T3 · Shell 级原语                                工时：M  前置：T2
    ├── MIN-140  P1.T4 · OriginBreadcrumb Shell 级原语               工时：S  前置：T3
    ├── MIN-141  P1.T5 · React Router v6 切换 + URL scheme           工时：M  前置：T3  ⚠️风险R1
    ├── MIN-142  P1.T6 · React Query v5 + Zustand 骨架               工时：S  前置：T5
    ├── MIN-143  P1.T7 · ErrorBoundary 分层                          工时：S  前置：T6
    ├── MIN-144  P1.T8 · requireWorkspace middleware                  工时：M  前置：无  ⚠️风险R4
    ├── MIN-145  P1.T9 · ModuleRegistry + Slot Registry 骨架         工时：M  前置：T3
    ├── MIN-146  P1.T10 · Shell 空壳 E2E + 响应式验证                 工时：S  前置：T3~T9
    └── MIN-147  P1.T11 · Handoff 原语占位                           工时：S  前置：T2
```

> 工时档：S ≈ 半天内 / M ≈ 1-3 天 / L ≈ 3-5 天。不要做精确人天估算。

**建议并行路径**（Phase 1 最优执行顺序）：
```
T1 → T2 → T3 ──→ T4
              ├─→ T5 → T6 → T7
              └─→ T9
T8（与上述全程并行，无前置）
所有完成 → T10 → T11
```

---

## 五、已拍板的关键决策（不要重议）

| 议题 | 决策 |
|---|---|
| 模块命名 | GoldenRador / Roundtable / GoldenCrucible / **GoldenQuill**（对外文案）/ Delivery Console |
| 代码代号 | `rador` / `roundtable` / `crucible` / **`writer`**（小写，跨 API/Router/Schema 一致）|
| 视觉锚点 | Claude Code（主）+ Codex（辅）；设计理念：奥卡姆 · 简单 · 强壮 · 底蕴 · 内涵 |
| 前端数据层 | **React Query v5**（TanStack Query）|
| 状态管理 | **Zustand**：Shell 全局 1 个 `shellStore` + 每模块 1 个内部 store，**禁跨模块直访** |
| 路由 | **React Router v6 BrowserRouter**；兼容层保留到 Phase 3 结束 |
| Persona 注册表 | 合并到 `personas/*.json` + `PersonaManifestSchema`；`soul_registry.yml` 降级为映射表过渡 |
| 归档策略 | 软归档 + 365 天 TTL |
| Handoff 撤销 | 30 秒 Toast 反悔按钮 |
| Thesis/TopicCandidate 存储 | JSON 文件（与现有 conversation 一致），DB 化延到 v2 |
| 埋点 | 保守档：Sentry + Pino 结构化日志；日志 schema 对齐 PostHog，v2 升级 |
| Slot schema | 三层均预留 `visibility: z.enum(['workspace']).default('workspace')` 字段 |
| SaaS 底座 | Phase 1-6 全程 SaaS 不推新底座迭代，SSE 一气呵成，不触发回灌 |

---

## 六、Phase 1 验收 checklist（Phase 1 完成的标志）

- [ ] `npm run build` + `npm run typecheck` 双绿
- [ ] Shell 空壳能在 1280 / 768 / mobile 三断点正常启动
- [ ] `rg useHashRoute` 零结果（4 处调用点全部迁移到 React Router v6）
- [ ] `rg "var(--gc-"` 所有命中都有对应 token 定义（无悬挂变量）
- [ ] `requireWorkspace` 已注册，现有 Crucible 接口回归通过
- [ ] axe-core 零 violation（空壳范围）
- [ ] Storybook/ladle 覆盖通用原语 ≥ 80%
- [ ] `golden-crucible-saas-sse.up.railway.app` 部署冒烟通过

---

## 七、绝对红线（违反立即停工，找老杨）

1. **不在 `main` 直接开发**；功能分支命名 `feature/P{N}.T{M}-xxx`，PR 到 `MHSDC-GC-SSE`，老杨 review 后合并
2. **不触碰 SaaS 生产域名**；SSE 功能先在 SSE Railway 域名验证
3. **不拍板 PRD 未决事项**；发现新盲点写进 PR description 提给老杨
4. **不用 Write 工具改 >50 行文件**；必须用 Edit（patches 方式）
5. **TypeScript 类型导入必须 `import type`**，与普通 import 分行写
6. **新增 CSS token 必须 `rg "var(--"` 校对全量引用**，防浅底白字
7. **SSE 每种后端 event type 前端必须有处理**；`error` 类型必须抛给用户
8. **所有外部请求必须有超时**（30s）+ AbortController
9. **`.env` 只写英文注释**；中文导致 dotenv 解析失败
10. **端口写死前查账本**：`~/.vibedir/global_ports_registry.yml`

> 完整 109 条红线：`docs/04_progress/rules.md`

---

## 八、分支与 Commit 纪律

```bash
# 每个任务建独立分支
git checkout -b feature/P1.T1-tokens-css

# commit 格式
git commit -m "refs MIN-137 P1.T1 tokens.css 工程化为 CSS vars + Tailwind 映射"

# Phase 1 全部任务完成后，老杨统一验收再合 MHSDC-GC-SSE
```

**每个 commit 前必做**：`npm run build` + `npm run typecheck` 通过再提交。

---

## 九、Phase 全景（外部团队参考，只做 Phase 1）

| Phase | 范围 | 状态 |
|---|---|---|
| **Phase 1** | Design System + Shell 空壳 | 🚀 **启动中**（11 任务，MIN-137~MIN-147）|
| Phase 2 | Roundtable 入壳（从 RT 仓库迁入）| ⏳ 等 Phase 1 完成 |
| Phase 3 | GoldenCrucible 包装为 feature slice | ⏳ 等 Phase 2 |
| Phase 4 | GoldenRador 粗轮廓 | ⏳ 等 Phase 3；部分任务可与 Phase 2/3 并行 |
| Phase 5 | GoldenQuill（Writer）粗轮廓 | ⏳ 等 Phase 3 |
| Phase 6 | 持续优化 + v2 能力 | ⏳ 等 Phase 4/5 |

**Phase 2 预告（Phase 1 期间可提前了解）**：
- 从 `GoldenCrucible-Roundtable` 仓库 `origin/sse-export` 分支文件级迁入
- **不搬** `Sidebar.tsx` / `App.tsx`（由新 Shell 取代）
- `appendSpikesToCrucibleConversation` 函数从 RT 侧 `server/crucible-persistence.ts` L890-961 拷入 SSE
- 操作清单：`docs/dev_logs/2026-04-16_persistence-diff-scan.md`

---

## 十、联系与升级

| 角色 | 职责 | 触达方式 |
|---|---|---|
| **老杨（OldYang）** | 架构调度、PR review、未决事项裁决 | 任何时候找老杨，不要自行拍板 |
| **老卢（Zhou Lu）** | 产品 Owner，最终决策 | 通过老杨转达 |

**遇到以下情况立即找老杨**：
- 实施中发现 PRD 与代码现实有矛盾
- 某个任务的前置假设不成立
- 测试/构建连续 2 次以上无法通过
- 需要新增依赖包（评估是否与架构方向冲突）

---

## 十一、已完成的 Commits（参考历史）

| Commit | 说明 |
|---|---|
| `d1c7cc6` | refs MIN-94 UI Architecture Phase 1-6 Implementation Plan v1.1（老卢 approved）|
| `746737d` | refs MIN-94 UI Architecture PRD Phase 0（北极星 + 骨架 + 双轨产出）|
| `9c97467` | refs MIN-135 update HANDOFF: mark cleanup complete |
| `f9fdd5e` | cleanup: 删除 runtime autosave + 误提交 `.sse-backup` 文件 |
| `bf0fcb9` | Phase 1: 核心模块回灌 + 架构升级 + 测试同步 + 路由对齐（34 files）|

## 十二、暂缓 / 搁置项（不在本次交付范围）

| 事项 | 状态 | 原因 |
|---|---|---|
| Roundtable 回搬 SSE | ⏸️ 暂缓至 Phase 2 | Shell 空壳未就绪 |
| SaaS ChatPanel 修复提交 | ⏸️ 搁置 | 老卢要求暂不处理 |
| Phase 3B 老卢验收 V1-V11 | ⏸️ 搁置 | 老卢要求暂不执行 |
| SaaS 底座回灌 | ✅ 本轮不触发 | 2026-04-17 老卢拍板：SSE 一气呵成 |

---

*最后更新：老杨（OldYang），2026-04-17*
*下一次更新时机：Phase 1 完成，或出现重大架构变更*
