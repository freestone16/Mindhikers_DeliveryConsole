# [SD-207] MarketingMaster 追认式 PRD

> **文档版本**: v1 草案（预留扩展锚点，等待新需求合并）
> **成文日期**: 2026-04-19
> **成文方式**: `ce-brainstorm` 对话式共识（Q1–Q8 决策链见 `docs/dev_logs/2026-04-19_SD207_PRD_Brainstorm.md`）
> **文档受众**: 产品决策方、老杨、codex/opencode 实施团队
> **配套文档**: [sd207_implementation.md](./sd207_implementation.md)（工程实施方案，Future-Proofing 与任务拆解在此）
> **性质说明**: 追认式 PRD —— 把 v4.0.0 已上线的 SD-207 V3 实现 formalize 为产品契约，**不引入新功能**。Future-Proofing 类的代码调整放在实施方案里，由实施团队执行。

---

## 1. 模块定位 & 用户画像

### 1.1 定位（决策 Q1 = B）

**跨平台视频营销发布包准备器，一期实现 YouTube 分支。**

- 目标：给每一条视频生成"可直接贴进平台上传表单的发布字段包"，减少创作者手工整理的时间与遗漏。
- 外层契约预留 `platforms.*` 分支，未来可扩展 B 站 / X / 微信公众号 / 视频号等，扩展时不破坏现有 YouTube 分支。
- **不是**营销数据分析、不是增长建议生成、不是发布动作本身。

### 1.2 用户画像

| 阶段 | 用户 | 使用频率 | 关键诉求 |
| --- | --- | --- | --- |
| 当前（本期） | 老卢（单人） | 高频（每条新视频一次） | 快速、可审核、不出错 |
| 未来（SaaS） | YouTube / 多平台创作者 | 中高频 | 同上 + 多租户隔离、低依赖本机环境 |

SaaS 化属于 Non-Goal，但本 PRD 的架构与契约约定需为 SaaS 迁移**留门不堵**。

## 2. 核心用户场景（Happy Path）

```
1. 老卢在 Header 选文稿 (02_Script/xxx.md)
2. 进入营销大师 → Phase 1.1 候选词生成（SSE 流式）
3. 手动补充/删除关键词 → 进入 1.2 TubeBuddy 打分（SSE 流式，单个失败可重试）
4. 进入 1.3 黄金词选择 → 勾选黄金关键词
5. 进入 Phase 2 → （可选）上传 SRT
6. 对每个黄金词生成 MarketingPlan（SSE，Tab 切换）
7. 在 MarketPlanTable 里审阅编辑：title / description 分块 / tags / thumbnail / playlist / category / license
8. 点击"确认" → 06_Distribution/marketing_package.json + .md 原子双写落盘
9. 老卢可在 Obsidian 打开 .md 终审；如需改动则回 UI 编辑后再点确认
10. Distribution Console 扫 06_Distribution/ 消费，营销大师本期不参与
```

支持的非线性行为：Phase 1 ↔ Phase 2 来回切换；切换文稿自动 Reset 回 Phase 1。

## 3. 功能范围

### 3.1 In-Scope（本期追认）

**Phase 1 — 黄金关键词发掘**
- LLM 候选词生成（SSE 流式，含简繁体变体）
- 用户手动添加/删除关键词（Enter 快捷键 + "+" 按钮）
- TubeBuddy Playwright 打分（SSE，单 keyword 可重试，单 variant 失败不中断 session）
- 勾选黄金词 + LLM 策略点评（`/api/market/v3/analyze-keywords`）

**Phase 2 — 营销方案生成与审阅**
- SRT 字幕上传（可选）
- 每个黄金词生成一套 MarketingPlan（SSE 流式）
- Tab 切换多套 Plans
- MarketPlanTable 全字段审阅：
  - `title`
  - `description`（分块：hook / body / cta / hashtags / links）
  - `tags`
  - `thumbnail`（来自 `03_Thumbnail_Plan/`）
  - `playlist`
  - `category`（默认"教育 (27)"）
  - `license`（默认"标准 YouTube 许可证"）
- `MarketConfirmBar` 用户显式"确认" → 触发对外契约落盘
- 平台默认设置面板（`MarketDefaultSettings`）

**跨 Phase 行为**
- 文稿变化检测 → 自动 Reset 回 Phase 1（v4.1.0 已修复）
- Phase 1 ↔ Phase 2 来回切换，数据保留
- 状态持久化到 `marketingmaster_state.json`（通过 `useExpertState` + Socket.IO）

**对外契约（本期新增/升级）**
- `06_Distribution/marketing_package.json` + `.md` 双写落盘

**跨模块依赖（仅声明，不改造）**
- ChatPanel：跨模块共享依赖，本 PRD 不改造

### 3.2 Out-of-Scope（本期不做，但 PRD 写清楚）

| # | 明确不做 | 归属 |
| --- | --- | --- |
| NG1 | UI 纵向化改版（向 Claude Code 风格对齐） | 下一期独立 PRD |
| NG2 | Obsidian-native MD 编辑（方案 b：MD 为事实源 + parser 回写） | 未来独立 PRD |
| NG3 | B 站 / X / 微信公众号 / 视频号等其他平台实现 | 本期仅 schema 预留 |
| NG4 | Excel 导出 | Future Work |
| NG5 | Distribution Console 自身的开发 | 独立模块，SD-301/302 |
| NG6 | 多租户 / 用户系统 / 权限隔离 | SaaS 化阶段 |
| NG7 | TubeBuddy API 对接替代 Playwright（仅做接口抽取，不做替代实现） | SaaS 化阶段 |
| NG8 | ChatPanel 模块的任何改造 | 跨模块专项 |

## 4. 数据流 & 状态契约

### 4.1 运行时状态（内部）

**文件**：`<project>/marketingmaster_state.json`
**事实源**：UI state（`MarketModule_V3`）
**持久化机制**：`useExpertState` → Socket.IO → 后端写文件
**可见性**：营销大师自身使用，**不对下游可见**

核心字段（当前实现已存在，PRD 仅追认）：
- `phase: 1 | 2`
- `phase1SubStep: 'candidates' | 'scoring' | 'selection'`
- `selectedScript: { filename, path }`
- `candidates: CandidateKeyword[]`
- `goldenKeywords: string[]`（candidate id 列表）
- `srtChapters: SRTChapter[]`
- `plans: MarketingPlan[]`
- `activeTabIndex: number`

详细字段定义以 `src/types.ts` 的 `MarketModule_V3` 为准（实施方案会附带 schema 冻结版）。

### 4.2 对外契约（Output Contract）

**位置**：`<project>/06_Distribution/marketing_package.{json,md}`
**触发**：用户在 `MarketConfirmBar` 点击"确认"
**语义**：同一事务内双写 JSON + MD；JSON 为唯一事实源，MD 由 JSON 模板渲染（方案 a，决策 Q3.5）
**覆盖策略**：后确认覆盖先确认（非增量；若未来需要版本化另议）
**消费者**：Distribution Console（本期不实现消费端）

#### 4.2.1 JSON 外层 schema（冻结于本 PRD）

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "<ISO-8601 with TZ>",
  "projectId": "<project folder name>",
  "scriptPath": "02_Script/<filename>.md",
  "goldenKeyword": {
    "id": "<candidate-id>",
    "text": "<keyword text>",
    "variants": [/* 可选，若包含简繁体 */],
    "tubeBuddyScore": { /* 可选，存档当时分数 */ }
  },
  "platforms": {
    "youtube": {
      "title": "<string>",
      "description": {
        "hook": "<string>",
        "body": "<string>",
        "cta": "<string>",
        "hashtags": ["<string>", ...],
        "links": [{ "label": "<string>", "url": "<string>" }, ...]
      },
      "tags": ["<string>", ...],
      "thumbnail": "<path relative to project root>",
      "playlist": "<string>",
      "category": "<string, e.g. '教育 (27)'>",
      "license": "<string>"
    }
    /* 未来扩展：platforms.bilibili / platforms.x / platforms.wechat 等 */
  }
}
```

**契约稳定性承诺**：
- `schemaVersion` 递增语义遵循 SemVer（major 破坏 / minor 新增 / patch 修正）
- `platforms.youtube` 分支 v1.0 冻结，未来只能新增字段，不能删除或重命名
- 新增平台分支时不影响已有平台的消费

#### 4.2.2 MD 投影约定

- 由 JSON 经模板函数生成（函数签名与模板规范在实施方案里冻结）
- 顶部 YAML front matter 包含：`schemaVersion`、`generatedAt`、`source: marketing_package.json`、警示文案 `⚠️ 此文件由系统生成，手动修改将在下次"确认"时被覆盖`
- （可选）`source_sha256` checksum 字段，供未来一致性校验

## 5. 外部依赖 & 环境契约

| 依赖 | 当前实现 | SaaS 化矛盾 | 本 PRD 处理 |
| --- | --- | --- | --- |
| TubeBuddy Chrome 扩展 | Playwright 驱动本机 Chrome + 用户 TubeBuddy 账号 | 无法在 SaaS 服务端共享 Chrome profile | 本期抽取 `ScoringProvider` 接口，唯一实现为 `PlaywrightTubeBuddyProvider`（详见实施方案 FP2） |
| 本机 Chrome profile | `TUBEBUDDY_PROFILE_DIR` 环境变量指向本机路径 | 同上 | 登记 P2 已知债务，SaaS 化时解决 |
| LLM API | 后端直调 | 无 API Key 管理 / 无租户计费 / 无 rate limit | 本期抽取 `LLMProvider` 接口（详见实施方案 FP3） |
| 项目存储 | `PROJECTS_BASE` 环境变量 | 多租户需加命名空间 | 登记 P2 已知债务 |

## 6. DoD（完成定义）

### 6.1 功能验收

| # | 验收条件 | 验证方式 |
| --- | --- | --- |
| D1 | Phase 1 端到端走通：选文稿 → 候选词 → 手动增删 → 打分 → 选黄金词 | 手动测试 |
| D2 | Phase 2 端到端走通：(可选) SRT → 生成 Plans → Tab 切换 → 审阅编辑 → 确认 | 手动测试 |
| D3 | "确认"动作产出 `06_Distribution/marketing_package.json` + `.md`，内容一致 | 文件 diff |
| D4 | JSON 外层 schema 含 `platforms.youtube` 分支，预留扩展点 | schema 审阅 |
| D5 | 切换文稿 → 状态自动 Reset 回 Phase 1 | 手动测试 |
| D6 | Phase 1 ↔ Phase 2 来回切换不丢数据 | 手动测试 |
| D15 | 异常路径（Phase1 打分 / Phase2 生成 / 确认落盘）均符合"保存当前进度 + 显性告知用户 + 支持重试"契约 | 手动测试 + code review |

### 6.2 架构 / 代码质量验收

| # | 验收条件 | 验证方式 |
| --- | --- | --- |
| D7 | TubeBuddy 调用抽成 `ScoringProvider` 接口 + 唯一实现 `PlaywrightTubeBuddyProvider` | Code review |
| D8 | LLM 调用抽成 `LLMProvider` 接口 | Code review |
| D9 | `window.__srtTimeline` 全局变量消除，改用状态文件或 React context | Grep 验证 |
| D10 | 旧组件 `MarketPhase1.tsx` / `MarketPhase2.tsx` / `MarketPhase3.tsx` 移入 `src/components/market/legacy/` | 目录检查 |
| D11 | `MarketingSection.tsx` 无任何对 legacy 组件的引用 | Grep 验证 |

### 6.3 文档验收

| # | 验收条件 |
| --- | --- |
| D12 | `docs/02_design/marketing/_master.md` 存在且挂回 `_index.md` |
| D13 | `docs/02_design/marketing/sd207_prd.md` 存在（本文件） |
| D14 | Output Contract schema 冻结在本 PRD 4.2.1 节 |

## 7. 风险与技术债清单

### 7.1 本期处理（P0/P1 → 进实施方案）

| # | 问题 | 等级 | 去向 |
| --- | --- | --- | --- |
| T1 | `window.__srtTimeline` 全局变量 | P0 | 实施方案 C4 |
| T2 | 旧 V2 组件死码 | P0 | 实施方案 C5 |
| T3 | 现有 `.md + .plain.txt` 双写路径散乱 | P0 | 实施方案 C1 |
| T6 | TubeBuddy Playwright 本机依赖 | P1 | 实施方案 FP2 + C2 |
| T7 | LLM 直连无 Key/Rate 管理 | P1 | 实施方案 FP3 + C3 |
| T10 | MD 被手改后会被覆盖 | P1 | 实施方案 FP6 + C6（警示 + 可选 checksum） |
| T11 | TubeBuddy 打分异常路径 | P1 | 追认现有实现；细节见实施方案 |
| T12 | LLM 生成 Plans 异常路径 | P1 | 追认 + 补齐单 plan 重试；实施方案 C7 |
| T13 | 确认落盘异常路径 | P1 | 追认现有实现 |

### 7.2 已知债务（P2，本期不处理）

| # | 问题 | 等级 | 备注 |
| --- | --- | --- | --- |
| T4 | `server/` 各模块 fallback 路径不一致（`__dirname` vs `process.cwd()`） | P2 | dev log 2026-04-02 已登记 |
| T5 | `test-director.ts:11` 老路径硬编码 | P2 | 测试文件，低优先级 |
| T8 | `marketingmaster_state.json` 单文件，多租户会撞车 | P2 | SaaS 化阶段处理 |
| T9 | `.env.local` 中 TubeBuddy 路径硬编码本机 | P2 | SaaS 化阶段处理 |

## 8. 收敛清单（PRD 定稿后由实施团队执行）

本 PRD 定稿后需补做的代码/文档改动（详细步骤与验收命令见实施方案）：

| # | 任务 | 类型 |
| --- | --- | --- |
| C1 | Output Contract 落盘升级（`06_Distribution/marketing_package.{json,md}` 双写） | 代码 |
| C2 | `ScoringProvider` 接口抽取 | 代码 |
| C3 | `LLMProvider` 接口抽取 | 代码 |
| C4 | 消除 `window.__srtTimeline` | 代码 |
| C5 | 旧组件移入 `legacy/` | 代码 |
| C6 | MD 顶部警示 front matter + 可选 checksum | 代码 |
| C7 | T12 单 plan 重试按钮（实施阶段先核实是否缺） | 代码 |
| C8 | `docs/02_design/marketing/_master.md` 新建 + 挂回 `_index.md` | 文档 |
| C9 | 本 PRD + 实施方案落盘 | 文档 |

## 9. 扩展锚点（留给后续新需求合并）

本 PRD 为 v1 草案。后续新需求进入的流程：

1. 新需求在新会话中讨论，沉淀到 `docs/dev_logs/YYYY-MM-DD_SD207_PRD_<topic>.md`
2. 合并入本 PRD 的对应章节，版本号递增至 v1.1 / v1.2 …
3. 若触发 Output Contract schema 变化，须同步升级 `schemaVersion` 并在实施方案中增补迁移说明
4. 若影响 DoD，需在"完成定义"章节中标记新增的 D 项

**当前已预告但未合并的新需求**（由老卢在新窗口提出）：待补。
