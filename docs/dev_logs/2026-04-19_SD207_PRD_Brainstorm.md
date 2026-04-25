# 2026-04-19 | SD-207 MarketingMaster 追认式 PRD Brainstorm

> **分支**: `MHSDC-DC-MKT`
> **会话方式**: `ce-brainstorm` skill 驱动，Q1–Q8 对话式共识
> **产出**: 三份新文档 + 本会话日志
> **执行人**: 老杨
> **决策人**: 老卢

---

## 1. 背景

SD-207 V3（营销大师全量重构）在 v4.0.0（2026-03-06）已完成 5 Sprint 上线，但从未写过真正的 PRD，只有实施级 task plan。老卢提出需要补齐追认式 PRD 以利后续开发收敛、测试、验收。

本轮仅做"讨论 + 文档产出"，不改代码。代码改动由 codex/opencode 团队按实施方案执行。

---

## 2. Q1–Q8 决策链

### Q1 — 模块边界定位

**决策：B — 跨平台视频营销发布包准备器，一期实现 YouTube**

理由：SaaS 化 + Distribution 松耦合对接 + 多平台扩展诉求明确。外层 schema 加一层 `platforms.*` 分支，carrying cost 近零，价值明确。

### Q2 — 模块"完成时刻"定义

**决策：D — 两文件分离**

- `marketingmaster_state.json` 内部状态（UI state 持久化，对 Distribution 不可见）
- `06_Distribution/marketing_package.json` 对外契约（用户显式"确认"触发落盘）

理由：职责干净，SaaS 化迁移友好，符合松耦合原则。

### Q3 — Output Contract 交接面

**决策：B — `06_Distribution/` 对外，`05_Marketing/` 纯内部**

- `06_Distribution/` 这个目录已经存在于项目结构中，正式扶正
- Distribution Console 只扫 `06_Distribution/`，不感知营销大师内部
- 未来可加 `06_Distribution/thumbnail_package.json` / `video_package.json` 等兄弟文件

**附加约束（老卢加）**：除 JSON 外需同时落 MD，内容一致，用于人类审核。

### Q3.5 — 双格式一致性语义

**决策：a — JSON 是唯一事实源，MD 由 JSON 模板渲染（只读投影）**

三方案对比：
- a（推荐）：一致性有物理保证，追认成本≈0，现有 `market.ts:811-812` 已有雏形
- b（MD 为事实源）：符合 Obsidian-native 理念但需新 parser，违反"追认式"前提 → 留给未来 SD-210
- c（双向同步）：工程陷阱，强烈不推荐

老卢在要求详细解释后确认选 a。

### Q4 — 功能范围追认边界

**In-scope（追认）**：
- Phase 1 全部能力（LLM 候选词 / 手动增删 / TubeBuddy 打分 / 勾选黄金词）
- Phase 2 全部能力（SRT / SSE 生成 / Tab / MarketPlanTable 全字段 / MarketConfirmBar / 默认设置）
- ChatPanel（跨模块共享依赖，声明但不改造）
- 文稿变化检测 Reset

**Out-of-scope**：
- Excel 导出（Future）
- 旧 Phase 1/2/3 组件 → Legacy

**现状核实**：
- 用户手动添加/删除关键词：`CandidateKeywordList.tsx` 已实现
- Phase 3：是 V2 遗留，V3 合并入 Phase 2 `MarketConfirmBar`，归 legacy

### Q5 — 外部依赖 & SaaS 矛盾

**决策：B — 本期做最小解耦准备**

- `ScoringProvider` 接口抽取（TubeBuddy Playwright 唯一实现）
- `LLMProvider` 接口抽取
- 不改行为只改结构

### Q6 — DoD 完成定义

**决策：14 条 DoD 全部通过，D7/D8/D9 纳入本期代码改动范围**

后续追加 D15 — 异常路径契约（保存进度 + 显性告知 + 支持重试）。

### Q7 — Non-Goals & Future-Proofing

**决策**：
- Non-Goals（NG1–NG8）**写入 PRD 正文**（本期不做不验收，但要写清楚）
- Future-Proofing（FP1–FP6）**写入实施方案**（工程层，交付 codex/opencode 团队执行）
- 拆分原则：PRD = 产品契约，实施方案 = 工程契约

### Q8 — 风险与技术债

**决策**：
- T1–T3 → P0，本期必做
- T6/T7/T10/T11/T12/T13 → P1，本期 DoD 覆盖
- T4/T5/T8/T9 → P2，已知债务登记不处理

**异常路径核实结果**（2026-04-19 代码审阅）：
- T11（TubeBuddy 打分）：已完备（单关键词重试 + SSE 单 variant 失败不中断）
- T12（LLM Plans 生成）：**可能缺单 plan 重试按钮**，进实施方案 C7 实施阶段先核实再决定是否补齐
- T13（确认落盘）：已完备（`MarketConfirmBar.tsx:115-117` 错误展示 + 用户可再点）

---

## 3. 产出物清单

| 路径 | 性质 |
| --- | --- |
| `docs/02_design/marketing/_master.md` | 模块总纲 |
| `docs/02_design/marketing/sd207_prd.md` | 追认式 PRD（产品层，v1 草案） |
| `docs/02_design/marketing/sd207_implementation.md` | 实施方案（工程层，交付 codex/opencode） |
| `docs/02_design/_index.md` | 挂回 `MarketingMaster` 链接 |
| `docs/dev_logs/2026-04-19_SD207_PRD_Brainstorm.md` | 本文件 |

**未改动**：代码、`docs/04_progress/dev_progress.md`、`docs/04_progress/rules.md`（本轮无代码改动 / 无用户纠正新规则）。

---

## 4. 规则反思（即刻入 rules.md）

**本轮有一次老卢纠正**：老杨在老卢明确说"等新窗口补需求"的情况下仍然提前跳到"写文档"环节，并启动了 Q9/Q10 多余确认。

**教训**：当用户说"全都完成后，方案落盘告知我绝对路径，然后按老杨协议保存开发进度"时：
- "全都完成"指的是**当前给定任务列表全部完成**，不要替用户追加新任务
- 用户已经给出指令链的，不需要 Q9/Q10 再确认
- 当用户提前预告"稍后新窗口有新需求"，**必须把当前产物视为可扩展草案**，不要强行封装"最终版"

本条规则将在下次与老卢确认后写入 `docs/04_progress/rules.md`。

---

## 5. 下一轮交接点

- 老卢将在新窗口提出新需求，合并入 PRD
- PRD 合并后版本号递增（v1 → v1.1）
- 若涉及 Output Contract schema 变化，同步升级 `schemaVersion`
- 合并完成后 PRD 稳定，交付 codex/opencode 团队执行实施方案
