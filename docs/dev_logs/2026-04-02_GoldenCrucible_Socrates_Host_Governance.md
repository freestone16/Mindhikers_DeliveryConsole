# 2026-04-02 GoldenCrucible Socrates Host Governance

## 本轮目的

本轮最初从“网络搜索为什么没有响应”切入，但在排查过程中，问题被升级为一条更根本的治理任务：

- 不是单独修一个搜索 bug
- 而是确认黄金坩埚 SaaS 宿主是否越权承担了业务判断

用户再次明确原则：

- 业务全都交给 Socrates
- 如果 Socrates 的业务逻辑正确，SaaS 只需要正确传递上下文、执行工具、回填结果
- `Researcher / FactChecker` 应该是真正的工具执行链，而不是宿主假装它们被调过

## 现场背景

### 基线收口

本轮先完成了几件与治理前提有关的工作：

1. 重新确认 `MHSDC-GC-SAAS-staging` 是 SaaS 主工作分支
2. 修复主 worktree 被误切到本地旧 `main` 的问题
3. 把分支纪律写入规则，避免以后在主 SaaS worktree 上再误用旧 `main`
4. `lawrencelu1978@gmail.com` 已加入 VIP 白名单
5. 黄金坩埚默认模型已切到 `Kimi / kimi-k2.5`
6. production 的 `KIMI_API_KEY` 已确认存在

### 关于搜索无响应的直接事实

production 日志显示：

- 用户发起的请求已被服务端收到
- 外部搜索已接通，并且拿到了 `5` 条结果
- 后续失败发生在调用 Kimi 阶段，报错为缺少 `KIMI_API_KEY`

因此，“无响应”不是因为搜索根本没发生，而是因为：

1. 当前宿主的搜索逻辑已经运行
2. 但随后调用 LLM 时配置不完整

这只是表层故障；更深的根因是宿主边界本身不对。

## 代码级核查结论

### 1. 宿主当前自己决定是否搜索

文件：

- `server/crucible.ts`
- `server/crucible-research.ts`

证据：

- `server/crucible.ts` 内直接调用 `detectCrucibleSearchIntent(promptContext)`
- 该函数来自 `server/crucible-research.ts`
- 判定依据是正则，而不是 Socrates 先产出结构化决策

结论：

- 是否联网搜索，目前由宿主硬编码判断
- 这违反“业务交给 Socrates”的原则

### 2. 宿主当前自己执行外部搜索

文件：

- `server/crucible.ts`
- `server/crucible-research.ts`

证据：

- `server/crucible.ts` 在 `searchRequested` 成立后直接调用 `performCrucibleExternalSearch(promptContext)`
- `server/crucible-research.ts` 内部直接请求 `https://www.bing.com/search?format=rss...`
- query 也由宿主构造，而不是由 Socrates 产出结构化 `researchQuery`

结论：

- 宿主不仅在判定，而且在亲自充当 `Researcher`
- 当前 `Researcher` 不是工具链角色，而是宿主内部实现细节

### 3. 宿主当前把搜索结果拼成 prompt 附加段

文件：

- `server/crucible-research.ts`

证据：

- `buildCrucibleResearchPromptAddon(result)` 直接输出一段“Researcher 外部调研补充”文本
- 这段文本随后被拼接进 `buildSocratesPrompt(...)` 的输出后面

结论：

- 当前链路不是“工具结果结构化回填”
- 而是宿主用长文本模拟工具结果

### 4. `Researcher / FactChecker / ThesisWriter` 主要停留在计划说明层

文件：

- `server/crucible-orchestrator.ts`

证据：

- 文件中定义了：
  - `CrucibleToolName`
  - `CrucibleToolRoute`
  - `createCrucibleOrchestratorPlan`
  - `toolRoutes`
- 其中确实写了 `Researcher / FactChecker / ThesisWriter` 的“主位/支援位/挂起”逻辑
- 但当前主链 `server/crucible.ts` 并没有真正按 `toolRoutes` 去执行这些工具

结论：

- 这是“编排语义已存在、runtime 执行还不存在”的状态
- 当前 UI 或代码命名里看起来像“多技能协作”，但实际执行仍是单技能主链 + 宿主外搜

### 5. 宿主按轮次硬编码业务阶段

文件：

- `server/crucible-orchestrator.ts`

证据：

- `resolveEngineMode(roundIndex, previousCards)`
- `deriveRuntimePhase(roundIndex)`
- `buildToolRoutes(engineMode, phase, searchRequested)`

这些都意味着：

- `roundtable_discovery`
- `socratic_refinement`
- `topic_lock`
- `deep_dialogue`
- `crystallization`

目前是由宿主根据轮次和历史数量硬推出来的，而不是由 Socrates 判断。

结论：

- 宿主仍然占有 phase / route / mode 的决策权
- 这属于更深一层的业务越权

### 6. 宿主内置了大量预写 fallback 业务内容

文件：

- `server/crucible-orchestrator.ts`

证据：

- `buildRoundtableFallbackPayload(...)`
- `buildSocraticFallbackPayload(...)`

这些函数不仅提供兜底占位文本，而是直接写好了：

- 用户这一轮该追什么
- 黑板应该出现什么焦点
- 下一轮最该追哪根刺

结论：

- 当前 fallback 已经越过“错误兜底”边界，进入业务内容生成
- 这也应逐步收权给 Socrates

### 7. persistence 目前只记录低粒度宿主判断

文件：

- `server/crucible-persistence.ts`

证据：

- `StoredCrucibleTurn.meta` 当前只有：
  - `searchRequested`
  - `searchConnected`
- `research` 虽有原样存储位，但没有明确结构化 schema
- 也没有记录：
  - Socrates 的原始 tool decision
  - 实际执行了哪些工具
  - 各工具的输入输出摘要

结论：

- 现有持久化不足以支撑“真实工具编排”的可调试性
- 后续必须扩成决策链和执行链双轨落盘

### 8. 前端的 `Loaded Skills` 不是执行轨迹

文件：

- `src/components/StatusFooter.tsx`

证据：

- `Loaded Skills` 展示的数据来源是 `skill-sync-status`
- 这只表示技能目录已同步成功，不表示当前这一轮真实调用了哪些工具

结论：

- 当前 UI 会让人误以为 `Researcher / FactChecker / Socrates` 已参与本轮执行
- 实际上这只是“已同步技能列表”，不是 runtime trace

### 9. 前端快照与状态继续消费宿主推断结果

文件：

- `src/components/crucible/types.ts`
- `src/components/crucible/storage.ts`
- `src/components/crucible/CrucibleWorkspaceView.tsx`

证据：

- 快照里仍保留：
  - `questionSource`
  - `engineMode`
- `storage.ts` 有默认回填：
  - `parsed.engineMode || 'socratic_refinement'`
- `CrucibleWorkspaceView.tsx` 也直接把这些宿主状态用于界面显示与本地持久化

结论：

- 前端仍在消费宿主推断出的业务状态
- 不是消费 Socrates 的真实决策结果

## 总结

本轮最关键的结论不是“搜索功能不稳定”，而是：

当前 Golden Crucible SaaS 宿主并不是一个空壳。

它仍然直接承担了：

1. 是否搜索的判断
2. 搜索 query 的构造
3. 搜索执行
4. phase / mode / tool route 的推断
5. fallback 业务内容生成
6. skill 展示语义
7. 工具轨迹的事实定义

因此，要解决的不是单独一个搜索点，而是整个宿主边界。

## 已落地的治理准备

1. 规则追加
   - `docs/04_progress/rules.md`
   - 新增原则：黄金坩埚业务判断必须交给 Socrates，不得由宿主硬编码替代

2. 治理计划文档
   - `docs/plans/2026-04-02_GoldenCrucible_Socrates_Host_Governance_Plan.md`

## 历史方案复查与本轮审批结果

继续回看 `docs/` 中旧方案与开发日志后，可以确认一件事：

- 历史方案并不是要求宿主 `100%` 什么都不做
- 但允许留下来的，只能是“确定性执行职责”
- 带业务判断味道的能力，已经在 2026-03-22 到 2026-03-27 的 SSOT 中被明确收回给 Socrates

### A. 允许宿主保留的 8 项职责（本轮已获用户审批）

1. 账号与登录边界
2. workspace / conversation 权限边界
3. HTTP / SSE / streaming 生命周期
4. 持久化与恢复
5. 工具执行器接驳
6. 最小证据链落盘
7. 技术层错误回传
8. 配额、会员、BYOK、访问控制

这些职责的共同特征是：

1. 可解释
2. 确定性
3. 不替 Socrates 做认知判断
4. 不冒充 skill 生成业务表达

### B. 不允许宿主保留的 7 项职责（本轮已获用户否决）

9. 决定是否联网
10. 决定搜索 query
11. 决定是否调用 `Researcher / FactChecker`
12. 决定 `phase / engineMode / round stage`
13. 决定对话结构
14. 预写 fallback 业务内容
15. 用静态展示或宿主推断冒充“本轮执行过哪些 skill”

### C. 与历史文档的关系

#### 更早阶段确实存在较厚的宿主/导演心智

证据：

- `docs/01_philosophy/golden_spirit_app_v1.1.md`
- `docs/dev_logs/2026-03-10_SD210_GoldenMetallurgist_Architecture_Decision.md`
- `docs/dev_logs/2026-03-12_SD210_DualStage_Skeleton_And_Blackboard_Refactor.md`

这些文档里曾允许：

1. `5` 阶段状态机
2. 后台导演 / orchestrator
3. `phase / engineMode / toolRoutes`
4. 最小工具编排骨架

#### 但 3 月下旬已经把边界收窄

关键证据：

- `docs/04_progress/dev_progress.md` 中的 `1.6 2026-03-22（坩埚主链收回宿主业务判断）`
- `docs/02_design/crucible/2026-03-27_GoldenCrucible_SaaS_V1.0.md`

这些文档已经明确要求：

1. 宿主删除 `phase / searchRequested / toolRoutes` 业务判断
2. 宿主不替苏格拉底决定 `phase / 是否搜索 / 对话结构`
3. 宿主只保留：
   - 账号、workspace、SSE、日志、存储、工具接驳
   - 最小搜索证据

### D. 本轮最终判断

因此，当前治理不应走向另一个极端，把宿主所有能力都删空。

正确方向是：

1. 保留宿主里可解释的执行、权限、持久化、留证职责
2. 把重新长回来的业务判断层再次收权给 Socrates
3. 避免为了反越权而误删宿主应承担的平台职责

## 下一步建议

从实施顺序看，应该这样推进：

1. 先移除宿主级“是否联网/何时联网”的硬编码主逻辑
2. 给 Socrates 增加结构化决策输出
3. 按 Socrates 决策执行 `Researcher / FactChecker`
4. 把工具执行结果结构化回填给 Socrates
5. 扩 persistence 与前端，让 UI 只消费真实工具轨迹
