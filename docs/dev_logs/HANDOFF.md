🕐 Last updated: 2026-04-17 CST
🌿 Branch: MHSDC-GC-SSE

## 当前状态

**UI Architecture PRD · Phase 0 完全收尾 ✅；Phase 1-6 全量实施计划 v1.1 已获老卢终审批复 ✅；下一步：开 Linear issue，Phase 1 启动。**

### 2026-04-17 老卢终审决策（11 条全部拍板）

| # | 议题 | 决策 |
|---|---|---|
| A1 | Writer 命名 | UI 文案 = **GoldenQuill**，代号 `writer` |
| A2 | Rador 拼写 | **GoldenRador** 保留 |
| A3 | Persona 注册表 | 合并到 JSON + 映射表过渡一个 Phase |
| A4 | 前端数据层 | **React Query v5** |
| A5 | Zustand | 壳层 1 + 模块各 1，禁跨模块直访 |
| A6 | Hash 路由兼容层 | 保留到 Phase 3 结束 |
| A7 | 归档 | 软归档 + 365 天 TTL |
| A8a | Handoff 撤销 | 30 秒 Toast 反悔 |
| A8b | Thesis/TopicCandidate/Copy 存储 | JSON 文件 |
| A9 | 埋点 | **保守档**：Sentry + Pino 结构化日志（对齐 PostHog schema，v2 升级） |
| A10 | SaaS 底座回灌 | **本轮不触发**，SaaS 全程冻结底座迭代 |
| A11 | 跨 workspace 共享 | schema 预留 `visibility` 字段 |

### 硬性修正（v1.0 → v1.1）
- 🔴 **端口纠正**：SSE 正确值是 **backend 3009 / frontend 5182**（CE 草案误写成 SaaS 的 3010/5183）
- 基本假设新增第 8 条："SaaS 底座冻结"
- R5 风险降级为"本轮不触发"

### 上轮老卢批复（2026-04-16，PRD v1.0）
- PRD v1.0 合卷通过
- Phase 1-6 全部拆到执行粒度（非仅 Phase 1）
- 外部团队在 SSE 代码库基础上接手（不另起仓库）
- 任务粒度：S/M/L 档，不需人周精确估算

### 本轮线索速查

- **工作线**：UI Architecture 大重构（对标 Claude Code 质感 + 四模块四段式工作流 + 三层可插拔 Slot）
- **上轮线**：MIN-135 SaaS → SSE 全面回灌治理（已闭环）
- **暂缓线**：Roundtable 回搬 SSE（暂缓至 Phase 2，扫雷已完成）

### Phase 0 核心产物（新窗口必读）

| 文件 | 定位 |
|---|---|
| `docs/plans/2026-04-16_UI_Architecture_PRD_v1.0.md` | ⭐ 合卷定稿（主输入，Phase 1 启动基准） |
| `docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md` | 视觉轨契约 + 红线纪律 |
| `docs/plans/2026-04-15_UI_Architecture_PRD_Skeleton.md` | §11 实施路线（Phase 切分原始依据） |
| `docs/dev_logs/2026-04-16_persistence-diff-scan.md` | Phase 2 扫雷（含迁入操作清单） |
| `demos/ui-north-star/` | 视觉终局锚点（4 屏 demo + token + 组件清单）|

### 关键架构决策（已拍板，新窗口勿重议）

- 四模块：GoldenRador / Roundtable / GoldenCrucible / Writer（Writer 命名待定）
- 视觉锚点：Claude Code（主）+ Codex（辅）；设计理念：奥卡姆 · 简单 · 强壮 · 底蕴 · 内涵
- Shell vs Feature Slice 分离（圆桌不搬 Sidebar/App，由新 Shell 取代）
- 流转触发：用户显式按钮；可回溯：下游节点一键跳回源头
- 5 个现有 skill 全属于 Crucible 模块
- 圆桌 persona（7 哲人）与 skill 是两个独立注册体系，均在 Slot Architecture 下统一
- **外部团队在 SSE 代码库（`MHSDC-GC-SSE` 分支）基础上接手**

### 重要修正（PRD v1.0 合卷时修正，新窗口注意）

`appendSpikesToCrucibleConversation` **不在 SSE 侧**，仅存在于 RT 仓库 `server/crucible-persistence.ts`（第 890-961 行）。Phase 2 迁入时从 RT 拷入 SSE，无需新建。PRD v1.0 §4.3.2 和附录 A 已修正，扫雷报告 §启动操作清单已写好。

---

## 新窗口直接怎么做

**身份**：老杨（OldYang），延续架构决策责任，调度 CE 团队

**窗口目录**：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`（SSE 分支）

### 第一步：建立上下文（精简版，重点 3 份）

1. `docs/dev_logs/HANDOFF.md`（本文件）—— 当前状态 + CE brief
2. `docs/plans/2026-04-16_UI_Architecture_PRD_v1.0.md` —— 重点读：总纲 + §3 §4 §7 §11
3. `docs/dev_logs/2026-04-16_persistence-diff-scan.md` —— Phase 2 扫雷

如需深入：`docs/04_progress/rules.md` + `docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md`

### 第二步（已完成 ✅）：启动 CE 团队拟 Phase 1-6 全量实施计划

**产出**：`docs/plans/2026-04-17_UI_Architecture_Phase1-6_Implementation_Plan.md` v1.1（已获老卢终审）
- 45 任务（P1=11 / P2=9 / P3=8 / P4=6 / P5=5 / P6=6）
- 两大第一公民索引表已建（附录 3 表 2）
- 附录 5 从"待决议题"升为"已拍板决策清单"

### 第二步（历史原文）：启动 CE 团队拟 Phase 1-6 全量实施计划

**方式**：调用 `ce-plan` skill（推荐）或 `general-purpose` Agent

**CE brief（直接喂给 ce-plan，不需要二次加工）**：

---

#### 任务

拟定 GoldenCrucible-SSE UI Architecture **Phase 1-6 全量实施计划**，供外部团队接手实施。

#### 老卢决策（不可重议）

1. 外部团队在 SSE 代码库（`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`，分支 `MHSDC-GC-SSE`）基础上接手，不另起仓库
2. 任务粒度：S/M/L 档，不需人周精确估算
3. Phase 1-6 全部拆到执行粒度

#### 输入契约（必读顺序）

| 优先级 | 文件 | 作用 |
|---|---|---|
| ⭐ 必读 | `docs/plans/2026-04-16_UI_Architecture_PRD_v1.0.md` | 架构合约（主输入）|
| ⭐ 必读 | `docs/plans/2026-04-15_UI_Architecture_PRD_Skeleton.md` §11 | Phase 切分原始依据 |
| ⭐ 必读 | `docs/dev_logs/2026-04-16_persistence-diff-scan.md` | Phase 2 的迁入操作清单 |
| 按需读 | `docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md` | 视觉纪律（Phase 1 需要）|
| 按需读 | `demos/ui-north-star/` | 视觉终局锚点（CE 可实地查阅）|
| 按需读 | `AGENTS.md` + `docs/04_progress/rules.md` | 研发纪律（外部团队接入附录需用）|

#### 产出约束

1. **文件路径**：`docs/plans/2026-04-17_UI_Architecture_Phase1-6_Implementation_Plan.md`
2. **语言**：中文
3. **任务块格式**（每个任务）：
   - 目标 / 输入 / 产出物 / 验收标准 / 工时档（S/M/L）/ 前置依赖
4. **必备章节**：
   - Phase 间依赖链 DAG（可视化）
   - 每 Phase：目标 + 任务分解 + 验收 checklist
   - 外部团队接入附录（分支、端口、环境变量、本地启动命令、CI/CD、部署域名）
   - 研发纪律摘要（面向外部团队，提炼自 OldYang SSOT 死亡红线）
   - 风险与回滚
   - 文末"待老卢决策事项"（若发现 PRD 盲点，记录此处，不自行拍板）

#### Phase 切分参考（来自 PRD v1.0 §11）

| Phase | 范围 | 交付物 |
|---|---|---|
| Phase 1 | Design System + Shell 空壳 | Token / 原语 / ShellLayout / React Router / React Query / Zustand / ErrorBoundary / `requireWorkspace` middleware |
| Phase 2 | Roundtable 入壳 | 可用的 Roundtable 模块 + Roundtable→Crucible handoff 接口 |
| Phase 3 | GoldenCrucible 入壳 | Crucible feature slice + Roundtable→Crucible handoff 可用 |
| Phase 4 | GoldenRador 粗轮廓 | Rador 模块 + TopicCandidate → Roundtable handoff |
| Phase 5 | Writer 粗轮廓 | Writer 模块 + Crucible→Writer handoff |
| Phase 6 | 持续优化 + v2 能力 | Persona 萃取引擎 + Channel 切换 UX |

#### 约束与禁止

- **不在 `main` 直接开发**
- **不擅自拍板 PRD 未决事项**（记录在文末"待老卢决策事项"）
- `appendSpikesToCrucibleConversation` 不在 SSE 侧（Phase 2 才迁入，操作清单在扫雷报告）
- Phase 2 不搬 RT 的 `Sidebar.tsx` / `App.tsx`（由新 Shell 取代）

---

### 第三步：产出后老杨自查 + 提交老卢

CE 产出落盘后，老杨：
1. 阅读全文，做自查清单（两大第一公民在 Phase 中是否有对应任务块）
2. 确认外部团队接入附录完整
3. 提交老卢终审

---

## 已完成的 Commits

| Commit | 说明 |
|--------|------|
| `746737d` | refs MIN-94 UI Architecture PRD Phase 0（北极星 + 骨架 + 双轨产出）|
| `f9fdd5e` | cleanup: 删除 runtime autosave + 误提交的 `.sse-backup` 文件（9 files, -5157）|
| `0c74faf` | fix ChatPanel: 移除遗留 S/L 本地快照按钮，保留服务端保存+话题中心 |
| `bf0fcb9` | Phase 1: 核心模块回灌 + 架构升级 + 测试同步 + 路由对齐（34 files, +7910/-357）|
| **待提交** | refs MIN-94 UI Architecture Phase 1-6 Implementation Plan v1.1（CE 草案 + 老卢终审合入）|

## 关键数据

- **SSE 分支**：`MHSDC-GC-SSE`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- **SaaS 分支**：`MHSDC-GC-SAAS-staging`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
- **Railway SSE 域名**：`golden-crucible-saas-sse.up.railway.app`
- **PRD v1.0**：`docs/plans/2026-04-16_UI_Architecture_PRD_v1.0.md`
- **Phase 1-6 实施计划（待产出）**：`docs/plans/2026-04-17_UI_Architecture_Phase1-6_Implementation_Plan.md`

## 暂缓/搁置项

| 事项 | 状态 | 原因 |
|------|------|------|
| Roundtable 回搬 SSE | ⏸️ 暂缓至 Phase 2 | Shell 空壳未就绪 |
| SaaS ChatPanel 修复提交 | ⏸️ 搁置 | 老卢要求暂不处理 |
| Phase 3B 老卢验收 V1-V11 | ⏸️ 搁置 | 老卢要求暂不执行 |
