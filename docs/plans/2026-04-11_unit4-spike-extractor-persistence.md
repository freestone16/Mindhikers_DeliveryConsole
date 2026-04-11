---
title: "Unit 4: Spike 提取 + 持久化"
type: implementation-plan
unit: 4
status: draft
date: 2026-04-11
owner: OldYang
origin: docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md
supersedes: none
---

# Unit 4: Spike 提取 + 持久化

> **定位**：把 Unit 3 圆桌过程中的高价值裂缝、金句、可桥接观点沉淀为结构化 Spike，并落入现有 persistence 体系，为 Unit 5 的 Spike → 深聊桥接提供稳定输入。
> **与原版差异**：LLM 提取统一走 `callRoundtableLlm({ tier: 'standard' })`；持久化不新开存储体系，直接并入现有 `crucible-persistence.ts` artifact/export 流。

---

## 1. 交付清单

| 文件 | 说明 | 依赖 |
|------|------|------|
| `server/spike-extractor.ts` | Spike schema、提取逻辑、排序与降级策略 | Unit 3 |
| `server/roundtable-types.ts` | 补充 Spike 类型与持久化相关字段（如需要） | Unit 3 |
| `server/roundtable-engine.ts` | 把当前占位 `extractSpikes()` 替换为完整实现，并接入导演指令 `止` | Unit 3 |
| `server/crucible-persistence.ts` | 扩展 artifact type、会话导出与 snapshot 映射 | 现有 persistence |
| `server/__tests__/spike-extractor.test.ts` | Spike 提取单测 | - |
| `server/__tests__/roundtable-engine.test.ts` | 补充导演指令与 Spike 返回测试 | Unit 3 tests |
| `server/__tests__/crucible-persistence.test.ts` | 补充 artifact 扩展后的持久化测试（如当前仓无此文件则新建） | persistence |

---

## 2. 问题框架

Unit 3 已经能跑完整圆桌，但当前 `extractSpikes()` 只是把“质疑/反驳/带 stanceVector 的 turn”粗暴裁切成最多 5 条摘要，存在三个问题：

1. **语义过浅**：现在只回收 `briefSummary`，没有把“为什么这条值得继续深聊”结构化下来。
2. **无法复用**：当前 Spike 没并入现有 artifact/export 体系，后续 Unit 5 无法稳定消费。
3. **导演闭环不完整**：导演点“止”后虽然能拿到临时数组，但没有 durable 存档，也没有类型升级区分 roundtable 产物。

Unit 4 的目标不是新造一套仓储，而是把 Spike 变成与现有 `CrucibleConversationArtifact` 同等级、可导出、可追溯、可桥接的正式产物。

---

## 3. Requirements Trace

- R1. 导演执行“止”时，系统能够从当前 roundtable session 中提取 1-5 条高价值 Spike。
- R2. Spike 必须包含足够信息供后续深聊桥接使用，而不只是短摘要。
- R3. Spike 必须进入现有 persistence/export 流，出现在 conversation artifacts 中。
- R4. 不引入第二套持久化目录或文件格式，沿用 `runtime/crucible/...` 现有结构。
- R5. 提取失败时必须有 deterministic fallback，不能让导演指令失效。

---

## 4. Scope Boundaries

- 不在 Unit 4 中实现 Spike → 深聊 prompt 拼装，那是 Unit 5。
- 不在 Unit 4 中改前端 SpikeLibrary 交互，那是 Unit 6。
- 不把 roundtable session 直接持久化到新的独立 runtime 根目录；继续沿用现有 crucible persistence。
- 不在本单元引入数据库或外部存储。

---

## 5. Context & Research

### Relevant Code and Patterns

- `server/roundtable-engine.ts`
  - 当前已有 `handleDirectorCommand()` 与占位 `extractSpikes()`；Unit 4 应在此替换为正式提取流程。
- `server/crucible-persistence.ts`
  - `appendTurnToCrucibleConversation()` 已经把 presentables 写入 `conversation.artifacts`。
  - `buildCrucibleArtifactExport()`、`buildConversationSnapshot()`、artifact summary/export 流已经存在，适合作为 Spike 持久化主干。
- `server/crucible-orchestrator.ts`
  - `PresentableDraft` / `SkillOutputPayload` 展示了现有 artifact 输入形状：`type/title/summary/content`。
- `server/roundtable-types.ts`
  - 已有 `Spike` 与 `roundtable_spikes_ready` 事件，但 Spike 结构仍然偏轻。

### Institutional Learnings

- 当前仓已经形成“先把结构化产物并入 artifact 流，再做跨模块桥接”的模式，Unit 4 应延续这一做法，避免 Unit 5 自己兜底解析完整 roundtable transcript。

### External References

- 本单元不需要额外外部资料；本地模式已经足够明确。

---

## 6. Key Technical Decisions

- **Decision 1：Spike 提取分两层：规则初筛 + LLM 标准层精炼。**
  - **Rationale**：先用规则初筛候选 turn，能保证 deterministic fallback；再用 `tier:standard` 做排序/压缩，获得更稳定的桥接语义。

- **Decision 2：Spike 持久化直接落入 `CrucibleConversationArtifact`，通过新增 artifact type 区分。**
  - **Rationale**：复用现有 index / snapshot / export 体系，避免第二套存储逻辑。

- **Decision 3：Spike 要保存“摘要 + 桥接线索 + 原始来源定位”。**
  - **Rationale**：Unit 5 需要的不只是 summary，还需要知道 spike 来自哪位哲人、哪一轮、围绕哪条裂缝生成。

- **Decision 4：`extractSpikes()` 不直接写文件，持久化通过 persistence 层统一处理。**
  - **Rationale**：保持 engine 只做编排，避免把文件写入逻辑散落到 roundtable 核心中。

---

## 7. Open Questions

### Resolved During Planning

- Q1. Spike 是否需要单独目录或独立 JSON 文件？
  - **Resolution**：不需要。进入现有 `conversation.artifacts`，靠 artifact type 区分。

- Q2. Spike 提取是否必须全靠 LLM？
  - **Resolution**：不必须。采用“规则初筛 + LLM 精炼 + 规则兜底”的三段式策略。

### Deferred to Implementation

- Q3. Spike artifact type 命名是 `spike` 还是复用 `quote/reference/asset` 之一？
  - **Why deferred**：需要通读 `buildConversationSnapshot()` 和前端 presentable 消费点后决定是否新增枚举，避免破坏现有 UI 分支。

- Q4. 是否要把 roundtable session 自身也映射成 persistence conversation，还是仅持久化 Spike artifact？
  - **Why deferred**：这会影响 Unit 5 的桥接姿势，需要结合实际接口改动量判断。

---

## 8. Implementation Units

- [ ] **Unit 4.1：定义 Spike 契约与候选筛选规则**

**Goal:** 明确 Spike 的结构、候选来源和排序字段，结束“临时数组”状态。

**Requirements:** R1, R2

**Dependencies:** Unit 3 已完成

**Files:**
- Create: `server/spike-extractor.ts`
- Modify: `server/roundtable-types.ts`
- Test: `server/__tests__/spike-extractor.test.ts`

**Approach:**
- 在 `server/spike-extractor.ts` 中定义提取输入：`RoundtableSession` + 可选 `maxSpikes`。
- 定义正式 Spike 结构，除 `id/content/sourceSpeaker/roundIndex/timestamp` 外，补充 `title`、`summary`、`bridgeHint`、`sourceTurnIds` 或等价字段。
- 规则初筛优先抓取：
  - `action` 为 `质疑` / `反驳` / `修正`
  - 高 `tensionLevel` 轮次中的关键发言
  - 被 moderator `focusPoint` 点名的冲突对
- 规则输出候选后，再交给 `tier:standard` 做压缩与排序；若 LLM 失败，回退到规则排序结果。

**Patterns to follow:**
- `server/roundtable-engine.ts` 中现有 `extractSpikes()` 的最小输入口径
- `server/crucible-orchestrator.ts` 中 `PresentableDraft` 的结构约束

**Test scenarios:**
- Happy path — 给定包含 3 轮讨论的 session，返回 1-5 条 Spike，且每条都带来源 speaker / round 信息。
- Edge case — 当 session 无 turns 或无明显冲突时，返回空数组或单条保底 Spike，而不是抛错。
- Error path — LLM 不可用时，走规则兜底，输出仍保持合法结构。
- Integration — 输入包含 moderator synthesis 的 session 时，提取结果能优先覆盖 `focusPoint` 对应冲突。

**Verification:**
- `spike-extractor.ts` 能独立输出稳定、可测试的 Spike 数组，不依赖文件系统。

- [ ] **Unit 4.2：把 Spike 并入 artifact persistence 主干**

**Goal:** 让 Spike 成为可持久化、可导出、可恢复的正式 artifact。

**Requirements:** R2, R3, R4

**Dependencies:** Unit 4.1

**Files:**
- Modify: `server/crucible-persistence.ts`
- Modify: `server/crucible-orchestrator.ts`（仅在共享 type 需要对齐时）
- Test: `server/__tests__/crucible-persistence.test.ts`

**Approach:**
- 审查 `CrucibleConversationArtifact.type` 与 `MaterializedCruciblePresentable.type` 的枚举边界，决定是否新增 `spike`。
- 若新增类型，联动更新 snapshot/export 中的 type 映射与 markdown/json 导出逻辑。
- 提供一个 persistence 入口，把 Spike 列表附加到 conversation artifacts，保持 `id/title/summary/content/roundIndex/createdAt` 一致。
- 导出时保留 roundtable 来源字段，至少能在 artifact content 或 metadata 中追溯原 speaker 与回合。

**Patterns to follow:**
- `server/crucible-persistence.ts` 的 `appendTurnToCrucibleConversation()` artifact 写入流程
- `server/crucible-persistence.ts` 的 `buildCrucibleArtifactExport()` 导出格式

**Test scenarios:**
- Happy path — 写入 Spike 后，conversation detail 中 `artifacts` 数量增加，且新增 artifact 字段完整。
- Edge case — 旧 conversation 文件不含 Spike 时，读取和导出逻辑保持兼容。
- Error path — 非法 artifact type 或空 content 不写入 persistence，并返回明确错误/兜底。
- Integration — markdown/json export 都能包含新 Spike artifact，不丢字段。

**Verification:**
- Spike 可通过现有 conversation detail/export API 被读取，无需额外 endpoint。

- [ ] **Unit 4.3：闭合导演“止”指令链路**

**Goal:** 让 `POST /api/roundtable/director` 的 `止` 指令走完整提取 + 持久化 + 返回链路。

**Requirements:** R1, R3, R5

**Dependencies:** Unit 4.1, Unit 4.2

**Files:**
- Modify: `server/roundtable-engine.ts`
- Modify: `server/index.ts`（仅当响应结构需补充时）
- Test: `server/__tests__/roundtable-engine.test.ts`

**Approach:**
- 用 `spike-extractor.ts` 替换当前 `extractSpikes()` 占位实现。
- `handleDirectorCommand('止')` 先提取 Spike，再调用 persistence 层保存，再返回结构化 payload。
- 返回体保持适合前端直接消费，至少含 `spikes`、`sessionId`、`artifactCount` 或等价字段。
- 明确失败策略：
  - 提取失败但可兜底 → 返回 fallback Spike + 标记
  - 持久化失败 → 不中断提取返回，但显式提示未保存

**Patterns to follow:**
- `server/roundtable-engine.ts` 中其他导演命令的处理路径
- `server/index.ts` 中现有 roundtable endpoint 的错误处理方式

**Test scenarios:**
- Happy path — 导演发送 `止` 后返回结构化 Spike，并且 session 持久化后可读到这些 artifact。
- Edge case — session 只进行 1 轮讨论时，仍能提取 1 条合理 Spike。
- Error path — session 不存在时返回 404；提取器抛错时返回 recoverable 错误或 fallback 结果。
- Integration — 先跑 Unit 3 讨论，再调用 `止`，随后通过 persistence 读取能看到新增 Spike artifact。

**Verification:**
- `止` 指令从“临时数组返回”升级为“正式产物生成并落盘”。

---

## 9. System-Wide Impact

- **Interaction graph:** `roundtable-engine.ts` → `spike-extractor.ts` → `crucible-persistence.ts` → export/snapshot/read APIs。
- **Error propagation:** 提取失败不应让导演指令彻底失效；持久化失败不应吞掉提取结果。
- **State lifecycle risks:** 同一 session 多次点击“止”可能重复生成 Spike，需要实现去重策略或幂等写入规则。
- **API surface parity:** 如果 artifact type 新增为 `spike`，所有读取 artifact 的下游都要确认兼容。
- **Integration coverage:** 仅做 extractor 单测不够，必须覆盖导演指令到 persistence/export 的全链路。
- **Unchanged invariants:** Unit 4 不改变 Unit 3 的讨论生成流程，只增强“止”后的产物沉淀。

---

## 10. Risks & Mitigation

| 风险 | Mitigation |
|------|------------|
| Spike 新类型破坏现有 artifact 消费分支 | 先审查所有 artifact type 分支；必要时做兼容映射而不是直接替换 |
| 同一轮重复点击“止”导致重复落盘 | 为 Spike 生成稳定 fingerprint，或在写入前按 roundIndex + summary 去重 |
| LLM 提取结果空泛 | 保留规则初筛候选，并要求 LLM 只做压缩与排序，不负责凭空创造 Spike |
| 持久化与 roundtable session 脱节 | 在保存时附带 sessionId / roundIndex / sourceSpeaker 等追溯字段 |

---

## 11. Verification Checklist

- [ ] `server/spike-extractor.ts` 能在无 API Key 场景下通过规则兜底工作
- [ ] `止` 指令返回的 Spike 数量和字段稳定
- [ ] Spike 能出现在 conversation detail / export 中
- [ ] 老会话读取不报错
- [ ] Unit 3 既有测试不被 Unit 4 破坏

---

## 12. Sources & References

- **Origin document:** `docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md`
- **Related code:** `server/roundtable-engine.ts`
- **Related code:** `server/crucible-persistence.ts`
- **Related code:** `server/crucible-orchestrator.ts`
