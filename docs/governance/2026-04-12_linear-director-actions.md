---
date: 2026-04-12
topic: linear-director-governance-actions
project: DeliveryConsole - Director (Linear)
project_id: 4492aea8-a0ba-41e0-acbd-a4b149fc4115
team: Mindhikers (MIN)
status: pending-user-confirmation
revision: 2026-04-12-r2 (added PR0 Security Hotfix per ce-review C1-C6 findings)
upstream:
  - docs/brainstorms/2026-04-12-director-module-governance-requirements.md
  - docs/plans/2026-04-12_director-module-governance-plan.md
  - docs/reviews/2026-04-12_director-code-audit.md
---

# Linear Director Project 治理动作清单

## 目的

把 `docs/plans/2026-04-12_director-module-governance-plan.md` 的 R1-R17 主线，与 Linear `DeliveryConsole - Director` project 的 30 条现存 issue 对齐。

本清单是 **executable spec**：用户审核确认后，AI 将按"立即执行"小节逐条调用 Linear MCP 工具完成动作。

## 现状一览（拉取于 2026-04-12）

- **总 issue 数**：30
- **状态分布**：In Progress 1 / Backlog 29
- **优先级**：Urgent 5 / High 18 / Medium 7
- **结构**：按 Phase 1/2/3/4 切，每 Phase 一个 -dev 父任务 + 子任务
- **关键缺口**：横切工程债（视觉路由 / LLM 鲁棒性 / director.ts 拆分 / any 清零 / 日志脱敏 / 临时文件治理）几乎全部没在 Linear 立 issue

## R 编号 ↔ 现存 Issue 映射

| R 编号 | 主题 | 优先级 | 现存 issue | 状态 |
|---|---|---|---|---|
| R1 | 拆 thumbnailTasks 类型枷锁 | P0 | — | **缺口** |
| R2 | volcengine 硬编码清理 | P0 | — | **缺口** |
| R3 | Phase3 video 走 router | P0 | — | **缺口** |
| R4 | Gemini 文生图稳定接入 | P0 | — | **缺口** |
| R5 | Visual Model Registry 单一来源 | P0 | — | **缺口** |
| R6 | delivery_store 确立 SSOT | P0 | MIN-51 / MIN-63 | In Progress / Backlog（重复） |
| R7 | director_state 改纯缓存 | P0 | MIN-51 / MIN-63 | 同上 |
| R8 | thumbnailTasks 持久化 | P1 | MIN-66（弱相关） | Backlog |
| R9 | LLM JSON 解析 + polling 阈值 | P1 | MIN-52（部分） | Backlog |
| R10 | video retry / 错误类型化 | P1 | MIN-72（弱） / MIN-73（弱） | Backlog |
| R11 | director.ts 拆分 | P1 | — | **缺口** |
| R12 | any 清零 | P1 | — | **缺口** |
| R13 | prompt 日志脱敏 | P2 | — | **缺口** |
| R14 | makeTmpCleaner 覆盖完全 | P2 | — | **缺口** |
| R15 | Vitest 单元测试 | P0 | MIN-89 / MIN-91 | Backlog |
| R16 | OpenCode 集成测试 | P0 | MIN-89 / MIN-93 | Backlog |
| R17 | Agent Browser 6 条铁证 E2E | P0 | MIN-89 / MIN-92 | Backlog |

## 立即执行（审核后由 AI 一次性跑完）

### A. 合并重复 issue（4 项）

#### A1. MIN-63 → MIN-51 合并
**动作**：
- 把 MIN-63 的描述要点合并进 MIN-51
- MIN-51 重命名为 `Director Phase2 状态原子化 (R6/R7)`
- MIN-51 描述补充 R6/R7 内容，链接 plan 文件
- MIN-63 状态改 Cancelled，描述顶部加 `→ Merged into MIN-51`
**理由**：标题几乎完全一致；MIN-51 已 In Progress，MIN-63 是 Backlog 重复。

#### A2. MIN-52 → MIN-62 子任务化
**动作**：
- MIN-52 重命名为 `Phase2 全局规划真实剧本回归（R9 验收子项）`
- MIN-52 设置 parentId = MIN-62
- MIN-52 描述更新：移除"待验证 server/llm.ts 分层超时"措辞（commit `ff000ea` 已落地），改为"用真实剧本端到端回归"
**理由**：LLM 超时已修，剩下的只是回归动作；与 MIN-62 重叠。

#### A3. MIN-54 → MIN-66 子任务化
**动作**：
- MIN-54 重命名为 `Phase2 Remotion 预览链路回归（MIN-66 验收子项）`
- MIN-54 设置 parentId = MIN-66
- MIN-54 描述更新：移除已过时的 Node 架构错位措辞
**理由**：与 MIN-66 高度重叠，应作为 MIN-66 的回归子项。

#### A4. MIN-53 → MIN-73 合并
**动作**：
- MIN-53 状态改 Cancelled，描述顶部加 `→ Merged into MIN-73`
- MIN-73 描述补充 MIN-53 的"Node 架构长期验证"要点
**理由**：同一根因，MIN-53 描述偏旧。

### B. 描述刷新（3 项，不改结构）

#### B1. MIN-66 描述补丁
- 在描述末尾加一段「关联 R8：thumbnailTasks 持久化（按 plan Stage 3 Unit 7 落盘到 `04_Visuals/.tasks/director-thumbnails.json`）」
- 链接 `docs/plans/2026-04-12_director-module-governance-plan.md`

#### B2. MIN-72 描述补丁
- 在描述末尾加一段「关联 R10：video retry 与 errorType 枚举（按 plan Stage 3 Unit 8）」

#### B3. MIN-89 描述补丁
- 在描述末尾加一段「关联 R15/R16/R17：Vitest + OpenCode + Agent Browser 三层测试栈（按 plan Stage 5）」

### C. 新建 issue 填补缺口（7 项，含 PR0 Security Hotfix）

#### C0. 🔥 新建 `PR0: Director Security Hotfix (C1-C6) - 阻断式前置`【Urgent】
- **parentId**: 无（独立 epic 父 issue，挂在 project 根，置顶）
- **状态**: Backlog → 立即推进 In Progress
- **优先级**: Urgent（高于一切其他 Director issue）
- **labels**: `security`, `hotfix`, `pr0-blocker`
- **描述**：
  - **触发原因**：ce-review 子代理审计（2026-04-12）发现 6 条 Critical 安全洞构成完整远程攻击链：任何同 LAN/WiFi 浏览器即可远程读取开发机任意文件 / 污染 delivery_store / 偷 Gemini API key / 注入 .env 劫持 PROJECTS_BASE。
  - **强制规则**：本 issue 必须先于其他所有 Director issue 完成。Stage 1 视觉路由收口（C1 issue）解锁条件 = PR0 全部 6 个 sub-issue done。
  - **6 个 Critical（每个对应一个 sub-issue 或 commit）**：
    - C1 路径穿越 — `assertProjectPathSafe` 写了从未调用（director.ts:1639/2217/243/359/1571）
    - C2 chat-action-execute socket 无授权校验（index.ts:942-1021）
    - C3 update_option_fields 原型污染 + 黑名单过窄（expert-actions/director.ts:186-213）
    - C4 0.0.0.0 绑定 + 全通 CORS（index.ts:40/161/1525）
    - C5 Google Gemini API key 写 URL query string + 错误时回传前端（google-gemini-image.ts:48）
    - C6 saveApiKey 未校验换行 → .env 注入（llm-config.ts:116-156）
  - **关键文件**：见上述各 Critical 标注
  - **验收标准**：见 plan 文件 Stage 0 验收标准段落
  - **关联 audit**：`docs/reviews/2026-04-12_director-code-audit.md`
  - **关联 plan**：`docs/plans/2026-04-12_director-module-governance-plan.md` Stage 0（Unit 0.1-0.6）
- **子任务建议**（可选，建在 PR0 父下）：
  - PR0-1: Unit 0.1 网络收口 — 默认 127.0.0.1 + Origin 白名单 CORS（C4）
  - PR0-2: Unit 0.2 路径穿越闭合 — 强制 assertProjectPathSafe（C1）
  - PR0-3: Unit 0.3 pending confirm 表 — 关闭 socket 授权缺失（C2）
  - PR0-4: Unit 0.4 API key 收口 — Gemini 走 header + 错误响应脱敏（C5）
  - PR0-5: Unit 0.5 update_option_fields 白名单化 + 原型污染防护（C3）
  - PR0-6: Unit 0.6 saveApiKey 输入校验 — .env 注入阻止（C6）

---

#### C1. 新建 `R1-R5: Director 视觉模型配置即所得收口`【Urgent】
- **parentId**: MIN-57（Phase 3-dev）
- **状态**: Backlog
- **优先级**: Urgent
- **描述**：
  - 承接 R1-R5：拆 thumbnailTasks 类型枷锁、清 5 处 volcengine 硬编码、Phase3 video 走 director-visual-runtime、Gemini 稳定接入、确立 visual-models registry 为唯一来源
  - 关键文件：server/director.ts:665/938/1020/1125/1143、server/director-visual-runtime.ts、src/schemas/visual-models.ts
  - 验收：commit `ff000ea` 之后剩余的 5 处硬编码全部清除；Phase3 video 切 google provider 端到端走通
  - 关联 plan：`docs/plans/2026-04-12_director-module-governance-plan.md` Stage 1（Unit 1-3）

#### C2. 新建 `R9: LLM 输出鲁棒性与轮询阈值治理`【High】
- **parentId**: MIN-55（Phase 2-dev）
- **状态**: Backlog
- **优先级**: High
- **描述**：
  - safeParseLLMJson 静默删除 svgPrompt 不再容忍，需告警；polling 阈值集中到一处常量
  - 关键文件：server/director.ts（infographic maxPolls=30、Phase3 video 153s 实测但写 120s）
  - 关联 plan：Stage 3 Unit 7

#### C3. 新建 `R11: director.ts 拆分（2242 行 → server/director/ 子目录）`【High】
- **parentId**: 无（横切工程债，独立挂在 project 根）
- **状态**: Backlog
- **优先级**: High
- **描述**：
  - 当前 server/director.ts 2242 行，需拆为 server/director/{index, phase1, phase2, phase3, queue, state, types}
  - 必须保持外部接口不变，纯结构性重构
  - 关联 plan：Stage 4 Unit 11

#### C4. 新建 `R12: any 类型清零`【Medium】
- **parentId**: 无
- **状态**: Backlog
- **优先级**: Medium
- **描述**：
  - 散落的 fallback options / buildRemotionPreview 返回值 / actionArgs 等使用 any/as any
  - 用 zod schema + 明确类型替换
  - 关联 plan：Stage 4 Unit 9

#### C5. 新建 `R13: prompt 日志脱敏`【Medium】
- **parentId**: 无
- **状态**: Backlog
- **优先级**: Medium
- **描述**：
  - server/volcengine.ts:58 prompt 日志未脱敏，可能泄露用户输入内容
  - 引入统一脱敏 helper
  - 关联 plan：Stage 4 Unit 10

#### C6. 新建 `R14: Remotion 临时文件清理覆盖完全`【Medium】
- **parentId**: MIN-73
- **状态**: Backlog
- **优先级**: Medium
- **描述**：
  - 已有 makeTmpCleaner 闭包但 Remotion props 序列化到 /tmp 链路覆盖不全
  - 关联 lessons L-013（临时文件生命周期闭包模式）
  - 关联 plan：Stage 4 Unit 10

## 不动的 issue（19 项 — 仅作清单核对）

保留不变（原结构合理）：MIN-55, 56, 57, 58, 59, 60, 61, 62, 64, 65, 67, 71, 72, 73, 74, 75, 76, 77, 78, 89, 90, 91, 92, 93

## 执行后预期状态

| 指标 | 治理前 | 治理后 |
|---|---|---|
| 总 issue 数 | 30 | 30 - 2 cancel + 7 new = **35** |
| In Progress | 1 | 2（MIN-51 + 新 PR0） |
| Cancelled | 0 | 2（MIN-53, MIN-63） |
| R 编号有 issue 承接 | 7/17 | 17/17 |
| Critical 安全洞有 issue 承接 | 0/6 | **6/6**（PR0 父 + 6 sub） |
| 横切工程债父 issue | 0 | 5（PR0 + R1-5/R9/R11/R12/R13） |

> 注：MIN-52/MIN-54 转为子任务，仍计入 issue 总数。
> PR0 父 issue 不含 sub-issue 时为 +1；如启用 6 个 sub-issue 拆分则为 +7（共 35+6=41）。

## 不在本清单范围

- 不动其他 9 个 Linear project（Code Nemesis / Crucible / Distribution Terminal 等）
- 不删除任何 issue（只做 Cancel）
- 不动 milestone / cycle / label 体系
- 不创建 sub-sub-task

## 用户决策点

请确认以下四件事：

1. **C0 PR0 Security Hotfix 父 issue 颗粒度**：
   - (a) 只建 1 个父 issue，6 个 Critical 写在描述里（轻量）
   - (b) 建 1 父 + 6 子 issue（重，但 Linear 看板更清晰）
2. **A 段 4 项合并动作**：是否同意按上述方式合并/取消？
3. **C 段其余 6 个新建 issue 标题与父任务挂载**（C1-C6 排除 C0）：是否合适？特别是 C3/C4/C5 是否要挂在某个 Phase -dev 父下，还是保留独立？
4. **执行节奏**：你确认后，AI 是一次性串行跑完所有 Linear MCP 调用，还是分段执行（先 PR0，再 A，再 B，再 C）让你边看边批？

确认后我会立刻动手。
