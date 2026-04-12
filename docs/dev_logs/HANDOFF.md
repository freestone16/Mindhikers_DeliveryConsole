🕐 Last updated: 2026-04-12 15:20
🌿 Branch: MHSDC-GC-SAAS-staging
📍 Scope: MHSDC/GoldenCrucible-SaaS

## 当前状态

### 治理阶段（已完成）
- 治理阶段已收口，不再扩治理总纲
- 三端治理 review 已完成，详见 `docs/plans/2026-04-08_Three_End_Governance_Review_Report.md`

### SaaS V1 产品阶段（当前主线）

**已完成：**
1. ✅ **PRD 编写**：`docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`（357 行，11 章节）
   - 经 ce:brainstorm 多轮决策锁定，用户已确认
   - 一期核心：多账号 + workspace + 对谈 + 历史/导出 + ThesisWriter 论文生成 + BYOK + trial
   - 明确不纳入一期：Roundtable、轻协作、正式计费
2. ✅ **代码能力地图扫描**（6 个背景 agent 并行完成）
   - 多账号底座已成立（auth + workspace + persistence）
   - BYOK 已实现大部分（配置页 + 加密存储 + 连通性测试）
   - 导出已实现（bundle-json + markdown）
   - Trial 已实现（3 conv / 10 turns）
   - SSE 主链已完成
   - **ThesisWriter 尚未集成到 SaaS 主线**（仅有 skill 定义文件）
3. ✅ **实施计划编写**：`docs/plans/2026-04-12-001-feat-golden-crucible-saas-v1-implementation-plan.md`
   - 7 个 Implementation Units，3 个交付阶段
   - 严格追溯到 PRD 需求
   - 充分利用已有代码，明确标注复用 vs 新增
   - TDD 导向 + atomic commit strategy
4. ✅ **Linear Min94 治理**（本次会话完成）
   - 重命名 4 个现有 issue 为 Unit 口径
   - 新建 3 个 issue（MIN-119, MIN-120, MIN-121）
   - MIN-94 父 issue 描述升级为 PRD 一期口径

**待执行：**
1. 🔲 **ce:work Phase 1**：Unit 1/5/6
2. 🔲 **ce:work Phase 2**：Unit 2/3/4（ThesisWriter 核心链）
3. 🔲 **ce:work Phase 3**：Unit 7（验收封口）

## WIP / 未提交现场

### 新增（2026-04-12）
- `docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md` — 一期 PRD（已完成）
- `docs/plans/2026-04-12-001-feat-golden-crucible-saas-v1-implementation-plan.md` — 一期实施计划（已完成）
- `docs/plans/2026-04-12_SaaS_BYOK_Config_UX_Enhancement_Implementation_Plan.md` — BYOK 配置页 UX 增强计划
- `src/components/SaaSLLMConfigPage.tsx` — 引导文案扩展、推荐卡片、errorCategory 分类渲染

### 历史治理文档（2026-04-06 ~ 2026-04-08）
- `docs/dev_logs/2026-04-06_MHSDC_DeliveryConsole_Path_And_Git_Facts.md`
- `docs/dev_logs/2026-04-06_MHSDC_Codex_Governance_Handoff.md`
- `docs/plans/2026-04-06_MHSDC_OldYang_Governance_Structuring_And_Planning.md`
- `docs/plans/2026-04-06_MHSDC_Codex_Governance_Execution_Checklist.md`
- `docs/plans/2026-04-06_MHSDC_Historical_Asset_Index.md`
- `docs/plans/2026-04-06_MHSDC_OldYang_Spec_Absorption_Checklist.md`
- `docs/plans/2026-04-06_MHSDC_Entry_Slimming_Checklist.md`
- `docs/plans/2026-04-06_MHSDC_Governance_Full_Coverage_And_Historical_Migration_Plan.md`
- `docs/plans/2026-04-06_MHSDC_Governance_Coverage_Matrix.md`
- `docs/plans/2026-04-06_MHSDC_Governance_Phase1_Pilot_Execution_Board.md`
- `docs/plans/2026-04-07_MHSDC_Thin_Entry_Template.md`
- `docs/plans/2026-04-07_MHSDC_Phase1_Pilot_Alignment_Check.md`
- `docs/plans/2026-04-07_MHSDC_Global_Project_Governance_Charter.md`
- `docs/plans/2026-04-07_MHSDC_Project_Initialization_Protocol.md`
- `docs/plans/2026-04-07_MHSDC_Project_Registration_Template.md`
- `docs/plans/2026-04-07_MHSDC_Phase1_Pilot_Acceptance_Record.md`
- `docs/dev_logs/2026-04-06_MHSDC_OldYang_Governance_Handoff.md`
- `docs/plans/2026-04-06_Claude_Team_Governance_Manual.md`
- `docs/dev_logs/2026-04-06.md`
- `docs/plans/2026-04-08_Three_End_Governance_Review_Report.md`
- `scripts/mhsdc-project-init.sh`
- `skills/oldyang/SKILL.md`
- `skills/oldyang/references/`
- `skills/oldyang/CHANGELOG.md`
- `.vibedir/skill_drafts/codex_oldyang_20260406.md`
- `.vibedir/skill_registry.yml`

## 实施计划 Unit 概览（Linear 已映射）

| Unit | 名称 | 阶段 | Linear Issue | 依赖 | 状态 |
|------|------|------|-------------|------|------|
| 1 | Core Path Readiness | Phase 1 | MIN-105（已重命名） | 无 | In Progress |
| 2 | Thesis Convergence Gate | Phase 2 | MIN-119（新建） | Unit 1 | Backlog |
| 3 | ThesisWriter API & Artifact | Phase 2 | MIN-120（新建） | Unit 2 | Backlog |
| 4 | Thesis Trial Quota | Phase 2 | MIN-121（新建） | Unit 3 | Backlog |
| 5 | BYOK Guided Onboarding | Phase 1 | MIN-109（已重命名） | Unit 1 | Todo |
| 6 | Auth & Workspace Isolation | Phase 1 | MIN-107（已重命名） | Unit 1 | Todo |
| 7 | Staging & Production Acceptance | Phase 3 | MIN-108（已重命名） | Unit 2-6 | Todo |

### 历史口径（保持现状）
- MIN-95, 96, 97, 98, 99（Duplicate，PRD 前早期口径）
- MIN-104（Done，SSE Refactor）

### 关键代码复用地图

| 领域 | 状态 | 关键文件 |
|------|------|----------|
| Auth + Workspace | ✅ 已实现 | `server/auth/workspace-store.ts`, `src/auth/AuthProvider.tsx` |
| Crucible Engine | ✅ 已实现 | `server/crucible.ts`, `server/crucible-orchestrator.ts`, `server/crucible-persistence.ts` |
| Trial | ✅ 已实现 | `server/crucible-trial.ts` |
| BYOK | ✅ 基本完成 | `server/crucible-byok.ts`, `src/components/SaaSLLMConfigPage.tsx` |
| 导出 | ✅ 已实现 | `server/crucible-persistence.ts` (buildCrucibleArtifactExport) |
| ThesisWriter | ❌ 未集成 | 仅有 `skills/ThesisWriter/SKILL.md`，缺 API/前端/触发/额度 |
| 话题收敛检测 | ❌ 不存在 | 需新增 |
| 论文 trial 额度 | ❌ 不存在 | 需新增（独立于对话额度） |

## 下一步

1. **ce:work Phase 1**：Unit 1 Core Path Readiness + Unit 5 BYOK Guided Onboarding + Unit 6 Auth & Workspace Isolation
2. **ce:work Phase 2**：Unit 2 收敛检测 + Unit 3 ThesisWriter API + Unit 4 论文额度
3. **ce:work Phase 3**：Unit 7 验收封口 + handoff 回写

## 阻塞 / 注意事项
- OldYang 红线：禁止在 main 直接开发、禁止绕过老卢、禁止无 issue 归属的提交、禁止静默推送
- 语言强制：所有沟通、思考、方案必须使用中文
- 当前 worktree 不干净；治理文档改动不要和业务改动混提
- 历史项目文档遵守零损失原则：先编目、再映射、再迁移，不做无索引删除

## 参考文档

### SaaS V1 产品阶段（当前主线）
- **PRD**：`docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md`
- **实施计划**：`docs/plans/2026-04-12-001-feat-golden-crucible-saas-v1-implementation-plan.md`

### 治理阶段（已完成）
- `docs/plans/2026-04-08_Three_End_Governance_Review_Report.md`
- `docs/plans/2026-04-06_MHSDC_Governance_Full_Coverage_And_Historical_Migration_Plan.md`
- `docs/plans/2026-04-06_MHSDC_Governance_Coverage_Matrix.md`
- `docs/plans/2026-04-06_MHSDC_Governance_Phase1_Pilot_Execution_Board.md`
- `docs/plans/2026-04-07_MHSDC_Phase1_Pilot_Acceptance_Record.md`
- `docs/plans/2026-04-06_Claude_Team_Governance_Manual.md`
- `skills/oldyang/SKILL.md`
- `/Users/luzhoua/.codex/project-governance/project-initialization-protocol.md`

### 设计文档
- `docs/02_design/crucible/2026-03-30_GoldenCrucible_SaaS_Trial_Quota_And_BYOK.md`
- `docs/02_design/crucible/souls/oldzhang_soul.profile.yml`
- `docs/02_design/crucible/souls/oldlu_soul.profile.yml`

### 测试入口
- `testing/README.md`
- `testing/OPENCODE_INIT.md`
- `testing/golden-crucible/README.md`
