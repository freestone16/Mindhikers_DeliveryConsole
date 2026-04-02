# 2026-04-02 GoldenCrucible 宿主边界根治型整改实施方案

> 适用分支：`MHSDC-GC-SAAS-staging`
> 性质：下一轮代码整改前的 implementation plan
> 目标：从根上恢复“苏格拉底承接业务，SaaS 宿主只做执行壳”的架构边界

---

## 1. 本方案解决什么

这不是“修一个联网搜索 bug”的方案。

这份方案要解决的是：

1. 当前 Golden Crucible SaaS 宿主重新长回了业务判断层
2. 搜索无响应、skill 展示失真、phase 硬编码、fallback 越权，本质上是同一个根因
3. 如果继续补正则、补 query builder、补 host fallback，只会把技术债藏得更深

一句话：

**下一轮要做的不是补丁修复，而是把坩埚主链重构回“苏格拉底决策 -> 宿主执行 -> 苏格拉底成文”的正确链路。**

---

## 2. 非谈判目标

下一轮整改必须同时满足以下目标：

1. **业务判断权回到 Socrates**
   - 是否联网
   - 调哪些工具
   - 搜什么
   - 查什么
   - 这一轮对话往哪推进

2. **宿主退回执行壳**
   - 收上下文
   - 调工具
   - 存证据
   - 回错误

3. **前端只消费真实 runtime 事实**
   - 不再消费宿主脑补出来的 `engineMode / questionSource / toolRoutes`
   - 不再把 `Loaded Skills` 当成“本轮执行过的 skill”

4. **持久化能完整回放一轮**
   - 为什么搜
   - 搜了什么
   - 谁决定搜
   - 哪个工具执行了
   - 执行成功还是失败
   - 最终回答是否基于工具结果

5. **禁止补丁式完成**
   - 不允许用更多 regex 继续判断业务
   - 不允许宿主继续拼“Researcher 状态文字”充当工具结果
   - 不允许继续扩写 host fallback 业务文案

---

## 3. 已审批的边界基线

### 3.1 宿主允许保留的 8 项职责

1. 账号与登录边界
2. workspace / conversation 权限边界
3. HTTP / SSE / streaming 生命周期
4. 持久化与恢复
5. 工具执行器接驳
6. 最小证据链落盘
7. 技术层错误回传
8. 配额、会员、BYOK、访问控制

### 3.2 宿主禁止保留的 7 项职责

1. 决定是否联网
2. 决定搜索 query
3. 决定是否调用 `Researcher / FactChecker`
4. 决定 `phase / engineMode / round stage`
5. 决定对话结构
6. 预写 fallback 业务内容
7. 用静态展示或宿主推断冒充“本轮执行过哪些 skill”

---

## 4. 根因分析

当前问题不是单点 bug，而是 6 个结构根因同时存在。

### 4.1 根因一：主链缺少“先决策、后执行”的正式契约

当前 `server/crucible.ts` 直接做了：

1. `detectCrucibleSearchIntent(...)`
2. `performCrucibleExternalSearch(...)`
3. `buildCrucibleResearchPromptAddon(...)`
4. 然后再把结果拼进 `buildSocratesPrompt(...)`

这意味着主链缺少一个正式的 `decision contract`。

结果：

1. 宿主只能自己先判
2. 工具调度没有单独的协议层
3. 搜索结果也只能以 prompt 补丁形式塞回去

### 4.2 根因二：`server/crucible-orchestrator.ts` 停在半过渡态

这个文件同时混着：

1. prompt 组装
2. `engineMode` 推断
3. `phase` 推断
4. `toolRoutes` 生成
5. fallback payload

它既不像纯 prompt builder，也不像真正 runtime planner。

结果：

1. 业务规划和宿主执行边界混杂
2. 代码容易继续往宿主脑里加逻辑
3. 测试也在加固错误边界

### 4.3 根因三：工具执行没有真实统一协议

当前 `Researcher` 只是：

1. 宿主里的一段 Bing RSS 执行器
2. 输出一段 `Researcher 外部调研补充` 文本
3. 再塞回 prompt

`FactChecker` 则连真实 runtime 执行闭环都没有。

结果：

1. skill 只是“概念存在”
2. 实际执行链仍是宿主私有实现
3. 工具无法被结构化记录和复放

### 4.4 根因四：持久化 schema 只记录宿主判断，不记录决策链

当前 `server/crucible-persistence.ts` 只存：

1. `searchRequested`
2. `searchConnected`
3. `research?: unknown`

但没有存：

1. Socrates 原始 decision
2. toolRoutes 来源
3. 工具输入
4. 工具输出
5. 失败原因
6. 最终回答和工具结果的关系

结果：

1. 排障只能停留在“宿主看起来搜没搜”
2. 无法证明本轮到底是不是 Socrates 决定的
3. 也无法支撑真实 skill trace UI

### 4.5 根因五：前端状态模型仍消费宿主脑补状态

当前前端还保留并消费：

1. `questionSource`
2. `engineMode`
3. 静态 `Loaded Skills`

结果：

1. UI 与真实执行链割裂
2. 前端继续依赖旧宿主推断模型
3. 只改后端也无法彻底拨正口径

### 4.6 根因六：测试在锁定旧架构

当前测试还在验证：

1. `searchRequested` 是否由宿主判断
2. `toolRoutes` 是否由宿主生成
3. query fallback 是否命中某些 heuristic

这会导致：

1. 开发者一边想收权给 Socrates
2. 一边被旧测试逼着把错误架构继续维护下去

---

## 5. 目标架构

目标架构只有三段：

1. `Socrates Decision Pass`
2. `Host Execution Pass`
3. `Socrates Composition Pass`

### 5.1 Decision Pass

输入：

1. 当前对话上下文
2. workspace / conversation 基本信息
3. 历史 turn 摘要
4. 用户最新一句

输出：结构化 `decision`

建议对象：

```ts
interface SocratesDecision {
  version: 'decision-v1';
  speaker: string;
  reflectionIntent: string;
  focus: string;
  needsResearch: boolean;
  needsFactCheck: boolean;
  toolRequests: Array<{
    tool: 'Researcher' | 'FactChecker';
    mode: 'primary' | 'support';
    reason: string;
    query?: string;
    goal?: string;
    scope?: string;
  }>;
  stageLabel?: string;
}
```

原则：

1. `needsResearch` 由 Socrates 决定
2. query 由 Socrates 决定
3. `toolRequests` 由 Socrates 决定
4. 若没有 toolRequests，宿主不得自己补

### 5.2 Host Execution Pass

宿主只做：

1. 读取 `decision`
2. 逐个执行 `toolRequests`
3. 生成结构化 `toolResults`
4. 记录执行 trace

建议对象：

```ts
interface ToolExecutionTrace {
  tool: 'Researcher' | 'FactChecker';
  requestedBy: 'Socrates';
  mode: 'primary' | 'support';
  status: 'success' | 'failed' | 'skipped';
  input: {
    query?: string;
    goal?: string;
    scope?: string;
  };
  output?: unknown;
  error?: string;
  startedAt: string;
  finishedAt: string;
}
```

原则：

1. 宿主不能私自新增 tool request
2. 宿主可以做超时、重试、错误捕获
3. 宿主可以做最低限度参数清洗
4. 但宿主不能改写 query 的业务意图

### 5.3 Composition Pass

输入：

1. 原上下文
2. `decision`
3. `toolResults`

输出：

1. `dialogue`
2. `presentables`
3. `topicSuggestion`
4. 可选 `uiHints`

建议对象：

```ts
interface SocratesTurnPayload {
  version: 'turn-v2';
  dialogue: {
    speaker: string;
    utterance: string;
    focus: string;
  };
  presentables: Array<{
    type: 'reference' | 'quote' | 'asset';
    title: string;
    summary: string;
    content: string;
  }>;
  topicSuggestion?: string;
  uiHints?: {
    stageLabel?: string;
  };
}
```

原则：

1. Socrates 基于真实工具结果继续生成
2. 宿主不再拼 `Researcher 外部调研补充` 文本
3. 工具结果用结构化对象传递，不用 prompt 文本补丁冒充协议

---

## 6. 代码层整改范围

### 6.1 `server/crucible.ts`

目标：从“大一统业务主脑”退回成薄编排壳。

必须做：

1. 移除 `detectCrucibleSearchIntent(...)`
2. 移除宿主主动 `performCrucibleExternalSearch(...)` 的触发权
3. 移除 `buildCrucibleResearchPromptAddon(...)` 拼 prompt 路径
4. 改成三段式：
   - decision pass
   - tool execution
   - composition pass

### 6.2 `server/crucible-orchestrator.ts`

目标：拆角色，避免继续当“半导演半 prompt builder”。

建议处理：

1. 删除或废弃：
   - `resolveEngineMode`
   - `deriveRuntimePhase`
   - `detectSearchIntent`
   - `buildToolRoutes`
   - 业务型 fallback payload
2. 保留或迁移：
   - 纯 prompt 模板
   - 纯 schema / type 定义

建议拆成：

1. `server/crucible-decision-contract.ts`
2. `server/crucible-socrates-prompts.ts`
3. `server/crucible-tool-executor.ts`

### 6.3 `server/crucible-research.ts`

目标：保留执行器，删除业务脑。

允许保留：

1. 真搜索执行
2. RSS 解析
3. timeout / error handling

必须删除：

1. `detectCrucibleSearchIntent`
2. `buildCrucibleSearchQuery`
3. `buildCrucibleResearchPromptAddon`

理由：

1. 是否搜、搜什么，不应再由宿主决定
2. `Researcher` 的输入应该来自 Socrates decision

### 6.4 `server/crucible-persistence.ts`

目标：从“记录宿主判断”升级为“记录真实决策链 + 执行链”。

新增建议字段：

```ts
meta: {
  decisionVersion: string;
  source: 'socrates';
}
decision: SocratesDecision;
toolTraces: ToolExecutionTrace[];
toolResults: {
  research?: unknown;
  factCheck?: unknown;
}
```

废弃建议：

1. 继续把 `searchRequested / searchConnected` 当主字段
2. 继续把 `questionSource / engineMode` 当事实状态

### 6.5 前端类型与存储

涉及文件：

1. `src/components/crucible/types.ts`
2. `src/components/crucible/storage.ts`
3. `src/components/crucible/CrucibleWorkspaceView.tsx`
4. `src/components/StatusFooter.tsx`

必须做：

1. 废弃或降级：
   - `questionSource`
   - `engineMode`
2. 新增：
   - `decisionSummary`
   - `toolTraces`
   - `uiHints.stageLabel`（若必须显示阶段标签）
3. `Loaded Skills` 改口径：
   - “已同步技能”继续可以保留
   - 但要和“本轮执行工具”分开显示

### 6.6 测试

必须重写或删除：

1. `src/__tests__/crucible-orchestrator.test.ts`
   - 不再测试宿主 search intent 判定
   - 不再测试宿主 toolRoutes 生成

2. `src/__tests__/crucible-research.test.ts`
   - 保留执行器测试：
     - RSS parsing
     - timeout
     - fetch success/fail
   - 删除 query builder / intent detection 业务测试

新增测试：

1. Socrates decision schema test
2. host executes exactly requested tools test
3. persistence stores decision + tool traces test
4. frontend renders real tool trace, not static sync state test

---

## 7. 下一轮的实际开发顺序

### Phase A：先立契约，不先写执行细节

产物：

1. `SocratesDecision` schema
2. `ToolExecutionTrace` schema
3. `SocratesTurnPayload` schema
4. persistence v2 schema

验收：

1. 所有后端主链文件先对齐同一套对象模型
2. 不再允许再往旧 `searchRequested / toolRoutes / engineMode` 模型上加字段

### Phase B：重写 `server/crucible.ts` 主链

产物：

1. 决策调用
2. 工具执行调度
3. 成文调用

验收：

1. 宿主不再直接判定是否搜索
2. 宿主不再自己构造业务 query
3. 宿主不再把工具结果拼成 prompt 补丁

### Phase C：收拾工具执行器

产物：

1. `Researcher` 作为真正执行器
2. `FactChecker` 作为真正执行器骨架

验收：

1. 它们都是“被 Socrates 调起”的工具
2. 不再是宿主私藏逻辑

### Phase D：升级持久化

产物：

1. `turn` 新 schema
2. workspace conversation detail 新返回
3. trace 可回放

验收：

1. 任一 turn 都能看见：
   - decision
   - tool traces
   - final response

### Phase E：前端只读真实 trace

产物：

1. UI 状态字段替换
2. “已同步技能”与“本轮执行工具”拆开
3. 历史详情可回看 trace

验收：

1. UI 不再依赖宿主脑补状态
2. 用户能区分“技能已加载”和“本轮真的调用了什么”

### Phase F：真实链路验收

至少验证：

1. 不要求联网的一轮
2. 要求联网 research 的一轮
3. 要求 fact-check 的一轮
4. 工具失败但宿主只回技术错误、不伪造业务内容的一轮

---

## 8. 明确禁止的补丁路线

下一轮开发时，以下路线一律禁止：

1. 再补一层 `SEARCH_INTENT_PATTERN`
2. 再优化一层 `buildCrucibleSearchQuery`
3. 再补几句 `Researcher 状态提示`
4. 再多加几条 host-side `toolRoutes`
5. 继续按 `roundIndex` 推 `phase`
6. 继续扩写 host fallback 业务内容
7. 继续让 `Loaded Skills` 暗示本轮执行轨迹

这些都只能让“表面能跑”变得更顺，但不会解决根因。

---

## 9. 完成定义

下一轮只有同时满足以下条件，才算整改完成：

1. 代码中不再存在宿主级“是否联网/搜什么/toolRoutes/phase”的业务判定主链
2. `Researcher / FactChecker` 都进入真实 runtime 执行链
3. persistence 能完整回放 decision + tool traces
4. 前端不再消费 `questionSource / engineMode` 这类宿主推断状态
5. UI 能明确区分：
   - 已同步 skills
   - 本轮实际执行过的工具
6. 联网失败时，系统只返回技术层错误，不再假装 Socrates 继续生成业务内容

---

## 10. 下一轮开发前的唯一入口

下一轮开始实现时，必须直接以本文件为蓝图推进。

如果实现过程中发现需要偏离本方案，先更新文档并重新确认，不允许边写边改口径。
