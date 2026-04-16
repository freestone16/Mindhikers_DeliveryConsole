🕐 Last updated: 2026-04-16 CST
🌿 Branch: MHSDC-GC-SSE

## 当前状态

**UI Architecture PRD · Phase 0 已完成**，双轨（视觉 + 工程）已产出，**等待老杨开新窗口做合卷评审**。

老卢（用户）确认两轨产出已完成，本窗口按协议封存并交接新窗口。

### 本轮线索速查

- **工作线**：UI Architecture 大重构（对标 Claude Code 质感 + 四模块四段式工作流 + 三层可插拔 Slot）
- **上轮线**：MIN-135 SaaS → SSE 全面回灌治理（已闭环，摘要见本文件下方"历史节点"）
- **暂缓线**：Roundtable 回搬 SSE（暂缓至 Phase 2，扫雷已完成）

### Phase 0 三份核心文稿（新窗口必读）

| 文件 | 定位 |
|---|---|
| `docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md` | 视觉轨契约（给 frontend-design 的输入） |
| `docs/plans/2026-04-15_UI_Architecture_PRD_Skeleton.md` | 工程轨契约 + 合卷大纲（12 章） |
| `docs/dev_logs/2026-04-16_persistence-diff-scan.md` | Phase 2 前置扫雷（backport 操作清单） |

圆桌迁移方案（RT 侧）追加附录 B：
`/Users/luzhoua/MHSDC/GoldenCrucible-Roundtable/docs/plans/2026-04-13_roundtable-to-sse-migration-plan.md`

### 两大第一公民（PRD 核心约束）

1. **Pluggable Slot Architecture**（三层：Channel Spirit / Persona / Skill，正交可插拔）
2. **Cross-Module Handoff Contract**（四段流转：Rador → Roundtable → Crucible → Writer → Delivery Console）

### 关键架构决策（已拍板，新窗口勿重议）

- 四模块命名：GoldenRador / Roundtable / GoldenCrucible / Writer（Writer 临时名）
- 视觉锚点：Claude Code（主）+ Codex（辅）
- 设计理念：奥卡姆 · 简单 · 强壮 · 底蕴 · 内涵
- Shell vs Feature Slice 分离（圆桌迁移不搬 Sidebar/App，由新 Shell 取代）
- 流转触发：用户显式按钮（默认）
- 可回溯：下游节点一键跳回源头
- 5 个现有 skill（Writer/ThesisWriter/Researcher/FactChecker/Socrates）全部属于 Crucible 模块
- 圆桌 persona（7 哲人）与 skill 是两个独立注册体系，均在 Slot Architecture 下统一

## 已完成的 Commits

| Commit | 说明 |
|--------|------|
| `f9fdd5e` | cleanup: 删除 runtime autosave + 误提交的 `.sse-backup` 文件（9 files, -5157） |
| `0c74faf` | fix ChatPanel: 移除遗留 S/L 本地快照按钮，保留服务端保存+话题中心 |
| `61e3c03` | Phase 3A 自验: skip SaaS-only thesis convergence 测试 |
| `88f514b` | Phase 2: 治理文件同步 + 文档链路修复（18 files, +1875/-166） |
| `bf0fcb9` | Phase 1: 核心模块回灌 + 架构升级 + 测试同步 + 路由对齐（34 files, +7910/-357） |
| `e6e412c` | Phase 0: 清理 working tree 死代码与 artifacts |
| `d6270b8` | Phase 0 前置: 暂存 .agent/ 等删除 |

## Phase 0-2 回灌结果 ✅

- **基础设施层**: schema、sse client、account-tier、auth context 已同步
- **业务功能层**: BYOK、FactCheck、Trial、ThesisWriter、LLM Config UX 已同步
- **架构升级层**: orchestrator 两阶段升级、SaaSApp、ChatPanel、WorkspaceView、index.ts 路由对齐
- **测试同步**: 5 个新测试 + vitest.config.ts，旧测试 skip
- **治理文档**: PRD + 4 份实施计划 + 7 个冒烟测试 + .vibedir + AGENTS.md/HANDOFF/rules.md/dev_progress.md 全部重写/更新

## Phase 3A 老杨自验 ✅

| # | 验证项 | 结果 |
|---|--------|------|
| 3A.1 | 完整 build | ✅ `npm run build:app` exit 0 |
| 3A.2 | 单元测试 | ✅ 11 passed, 2 skipped（预期） |
| 3A.3 | Lint | ✅ 409 errors 均为预存，无新增 |
| 3A.4 | 本地启动 | ✅ 前端 5182 + 后端 3009 正常 |
| 3A.5 | 功能冒烟 | ⏸️ 暂停（老卢要求） |
| 3A.6 | 文档链路 | ✅ AGENTS.md → HANDOFF → rules → plans 全通 |
| 3A.7 | Railway 部署 | ✅ SSE 域名随 push 自动更新 |

## 现场清理结果 ✅

- `runtime/crucible/autosave.json` 已从 git 移除（.gitignore 已包含）
- 全部 `.sse-backup` 文件已删除（工作树 + git 历史中的误提交已清理）
- SSE working tree **完全干净**
- SSE 与 SaaS `ChatPanel.tsx` 当前一致

## 暂缓/搁置项

| 事项 | 状态 | 原因 |
|------|------|------|
| SaaS ChatPanel 修复提交 | ⏸️ 搁置 | 老卢要求暂不处理 |
| Phase 3B 老卢验收 V1-V11 | ⏸️ 搁置 | 老卢要求暂不执行 |

## SSE 独有代码（待后续验证兼容性）

| Commit | 内容 |
|--------|------|
| `3455d48` | multi-topic save and restore |
| `9f3ab61` | artifact export hook |
| `7ad4921` | conversation restore flow |
| `3c998dd` | split draft save semantics |
| `4e4b6b0` | lightweight history center |
| `b6d14c8` | SaaS shell + legacy type debt isolation |

## 关键数据

- **SSE 分支**：`MHSDC-GC-SSE`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- **SaaS 分支**：`MHSDC-GC-SAAS-staging`，目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
- **Railway SSE 域名**：`golden-crucible-saas-sse.up.railway.app`

## 新窗口直接怎么做

**身份**：老杨（OldYang），延续本会话的架构决策责任

**窗口目录**：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`（SSE 分支）

### 第一步：建立上下文（必读，顺序不可乱）

1. `/Users/luzhoua/.codex/AGENTS.md` —— 全局治理入口
2. `AGENTS.md` —— 本项目治理
3. `docs/dev_logs/HANDOFF.md`（本文件） —— 当前交接点
4. `docs/04_progress/rules.md` —— 80 条精炼规则
5. `docs/04_progress/dev_progress.md` § 1.25 —— 本轮详细进展
6. Phase 0 三份核心文稿（上方"本轮线索速查"列出）
7. `CLAUDE.md` —— 本项目工作流契约

### 第二步：开展合卷评审工作

**待评审的两个产出**（老卢已确认完成，老杨已实地核查位置）：

**视觉轨**（frontend-design 产出）· 位置：`demos/ui-north-star/`
```
demos/ui-north-star/
  ├── index.html             ← 4 屏高保真 demo 主入口
  ├── styles/
  │   ├── tokens.css         ← Design Token 定义
  │   └── app.css            ← 应用样式
  ├── scripts/
  │   └── app.js             ← 交互脚本
  ├── DESIGN_TOKENS.md       ← Token 文档（color/type/space/motion 等）
  ├── COMPONENTS.md          ← 组件原语清单
  └── README.md              ← 产出说明
```
**启动方式**：浏览器打开 `demos/ui-north-star/index.html` 即可查看 4 屏 demo。

**工程轨**（CE 团队产出）· 位置：`docs/plans/2026-04-15_UI_Architecture_PRD_v0.2.md`
- 单一 markdown 文件，基于 `PRD_Skeleton.md` 骨架填充
- 评审时对照 `PRD_Skeleton.md` § 3 §4 §7 §9 §10 的深度要求

**合卷评审五步法**：
1. **视觉轨一致性评审**：
   - 对照 `North_Star_Brief.md` § 十二 红线清单逐条核对
   - 重点验证屏 3（Roundtable → Crucible 流转瞬间）是否有"被记住"的设计
   - 确认无紫色渐变 / glassmorphism / Inter 字体 / emoji UI 等禁用项
2. **工程轨完整性评审**：
   - § 3 Pluggable Slot Architecture —— 三层正交 schema 是否写全、Persona 萃取引擎接口是否预留
   - § 4 Cross-Module Handoff Contract —— 四段数据契约是否齐、可回溯是否设计
   - § 7 Routing / State —— URL scheme、三态切分是否清晰
3. **交叉评审**：视觉轨设计在工程轨架构下是否可实现；工程轨 schema 是否支撑视觉叙事
4. **合卷成 PRD v1.0**：写到 `docs/plans/2026-04-16_UI_Architecture_PRD_v1.0.md`
5. **提交老卢终审**：提交前做一次自查清单

**发现偏差时**：
- 轻度：老杨直接在合卷时修正
- 重度：回小轮，给对应轨出一份"返工请求清单"

### 第三步：终审通过后 → Phase 1 启动

PRD v1.0 获老卢终审通过 → 启动 Phase 1（Design System + Shell 空壳）→ 新建 Linear issue 跟踪。

### 第四步：持续守候

合卷评审期间老杨应**拒绝被其他任务切分注意力**。合卷是关键节点，全情投入。

---

## 历史节点：MIN-135 SaaS → SSE 回灌（已闭环 2026-04-14）
