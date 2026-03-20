# GoldenCrucible 测试能力整体实施方案

> 日期：2026-03-20
> 项目：GoldenCrucible
> 目标：在黄金坩埚中落地完整的 `Codex -> opencode run -> agent-browser` 测试能力

---

## 1. 背景

当前我们已经把目标方向讨论清楚了：

1. 由 Codex 侧负责测试协调，而不是把测试完全外包给人工切到 OpenCode 再手动操作
2. OpenCode 作为执行端，通过 `opencode run` 启动一次性测试执行
3. 涉及真实页面交互时，执行端优先使用 `agent-browser`
4. 当前测试场景下，执行模型必须强制锁定为 `GLM-5`

同时，当前环境也有几个关键现实约束：

1. 本机 `opencode` CLI 与 `agent-browser` CLI 都已可用
2. 本机 OpenCode 默认模型当前已配置为 `zhipuai-coding-plan/glm-5`
3. 但不能只依赖默认模型，因为后续改 provider、继续旧 session、或切换默认路由时都可能静默漂移
4. `opencode models` 当前存在环境噪音，可能报 `Failed to fetch models.dev` 或 sqlite 写权限错误，因此不适合作为唯一健康检查
5. 黄金坩埚当前仓库内还没有完整的 `testing/` 目录协议与执行脚本

结论：

**黄金坩埚需要的不只是“会测试”，而是一套可重复、可审计、可被 Codex 主控的测试执行系统。**

---

## 2. 目标

本轮整体目标分成 5 个能力面：

1. **协议能力**
   - 在仓库内建立完整 `testing/` 目录与文档入口
   - 明确 request / claim / report / artifacts / status 的单一事实来源

2. **执行能力**
   - Codex 可以直接发起 `opencode run`
   - OpenCode 可以按 request 执行测试并回写报告

3. **浏览器能力**
   - 真实页面交互优先使用 `agent-browser`
   - 不能把自写 Playwright / Selenium 冒充成 `agent-browser`

4. **模型锁定能力**
   - 当前测试场景强制使用 `zhipuai-coding-plan/glm-5`
   - 每次执行命令显式传 `--model zhipuai-coding-plan/glm-5`
   - report 必须写出实际模型，否则结果无效

5. **验收能力**
   - `passed` 代表“业务结果被证据证明”
   - 不是“页面能打开”或“没有明显报错”

---

## 3. 非目标

以下内容不属于本轮第一优先级：

1. 立刻做完整 CI 云端集成
2. 立刻实现所有模块的并行 worker
3. 立刻覆盖黄金坩埚所有页面的自动化回归
4. 修 OpenCode 本身全部环境问题

本轮先把**最小可用、可扩展的测试骨架**搭起来。

---

## 4. 核心设计决策

### 4.1 执行拓扑

当前黄金坩埚采用：

```text
Codex -> opencode run -> OpenCode -> agent-browser -> report/artifacts/status
```

而不是：

```text
人工切到 OpenCode -> 人工打开页面 -> 人工口述结果
```

原因：

1. 更少上下文切换
2. 可被脚本化
3. 可回放
4. 更适合后续升级为 queue-worker

### 4.2 模型强制策略

模型口径统一为：

```text
zhipuai-coding-plan/glm-5
```

执行层面采用双保险：

1. OpenCode 本地默认模型保持为 `GLM-5`
2. 但每次测试命令仍显式传：

```bash
--model zhipuai-coding-plan/glm-5
```

原因：

1. 默认配置不是测试契约
2. CLI 参数比默认值更可审计
3. 未来允许日常开发使用别的路由，但测试口径不能漂

### 4.3 浏览器执行策略

只要 request 涉及真实页面交互：

1. 必须优先用 `agent-browser`
2. fallback 必须在 report 中显式声明
3. 如果 request 明确写了“必须 agent-browser”，没有真实使用时不得写 `passed`

### 4.4 通过定义

以后 `passed` 只表示：

1. request 中列出的关键预期被逐条验证
2. report 给出明确证据路径
3. 若要求验证写盘、接口、页面最终内容变化，则对应证据都已成立
4. report 写明实际模型为 `zhipuai-coding-plan/glm-5`

---

## 5. 目标目录结构

```text
testing/
├── README.md
├── OPENCODE_INIT.md
├── prompts/
│   └── OPENCODE_TEST_RUNNER.md
├── scripts/
│   ├── run-opencode-request.mjs
│   ├── opencode-test-worker.mjs
│   └── print-status.mjs
└── golden-crucible/
    ├── README.md
    ├── requests/
    │   └── REQUEST_TEMPLATE.md
    ├── claims/
    │   └── CLAIM_TEMPLATE.md
    ├── reports/
    │   └── REPORT_TEMPLATE.md
    ├── artifacts/
    └── status/
        ├── BOARD.md
        └── latest.json
```

说明：

1. 第一阶段不必一次性全做满
2. 但目录设计要一步到位，避免后面返工

---

## 6. 分阶段实施

## Phase 0：协议落盘

目标：把“口头约定”变成仓库内的正式协议。

交付物：

1. `testing/README.md`
2. `testing/OPENCODE_INIT.md`
3. `testing/golden-crucible/README.md`
4. `testing/golden-crucible/requests/REQUEST_TEMPLATE.md`

关键内容：

1. 统一口令：`协调opencode测试`
2. 当前默认链路：`Codex -> opencode run -> agent-browser`
3. 当前强制模型：`zhipuai-coding-plan/glm-5`
4. `passed` 的硬判据

验收标准：

1. `AGENTS.md` 不再指向缺失文档
2. 新人只读 `testing/` 就能理解协作协议

## Phase 1：Direct-run MVP

目标：让 Codex 能直接发起一次 OpenCode 测试执行。

交付物：

1. `testing/scripts/run-opencode-request.mjs`
2. `package.json` 新增执行脚本，如 `test:opencode:gc`

执行逻辑：

1. 校验 request 文件存在
2. 校验 `opencode` 与 `agent-browser` CLI 可用
3. 检查是否已有活跃 `opencode` 进程
4. 以显式 `--model zhipuai-coding-plan/glm-5` 启动 `opencode run`
5. 将 request 内容作为 SSOT 交给 OpenCode 执行

验收标准：

1. 可用一条最小 request 成功跑通
2. 执行命令层能明确看到 GLM-5 被强制指定

## Phase 2：报告与证据闭环

目标：让“执行过”升级成“可审计”。

交付物：

1. `REPORT_TEMPLATE.md`
2. `CLAIM_TEMPLATE.md`
3. `status/latest.json`
4. `status/BOARD.md`

关键要求：

1. report 必写实际模型
2. report 必写是否真实使用 `agent-browser`
3. report 必写关键证据路径
4. status 能快速告诉我们当前测试最新状态

验收标准：

1. 任何一次测试，都能从 request 追到 report 和 artifacts
2. 不存在“说测过了，但找不到证据”的口径

## Phase 3：Queue-worker 能力

目标：在 direct-run 稳定后，补充异步轮询能力。

交付物：

1. `testing/scripts/opencode-test-worker.mjs`
2. `testing/scripts/print-status.mjs`
3. 对应 `package.json` worker / status 脚本

适用场景：

1. 夜间批量回归
2. 多 request 排队
3. 长耗时验收

注意：

1. queue-worker 是第二阶段增强，不是第一阶段前置依赖
2. 先把 direct-run 跑稳，再引入轮询

## Phase 4：通过判据收紧

目标：把“软冒烟”升级成“硬验收”。

关键动作：

1. 为黄金坩埚主链定义模块级通过判据
2. 将“页面打开”与“业务完成”明确区分
3. 对关键页面增加写盘、接口、最终 UI 三类证据要求

验收标准：

1. 不再因为“没报错”就写 `passed`
2. 关键业务功能都能给出可复核证据

---

## 7. 关键风险与应对

### 风险 1：模型口径漂移

表现：

1. OpenCode 默认模型改了
2. 延续旧 session 用到了别的模型

应对：

1. 每次测试命令显式传 `--model zhipuai-coding-plan/glm-5`
2. report 必写模型

### 风险 2：OpenCode sqlite / 外网噪音

表现：

1. `opencode models` 报 `Failed to fetch models.dev`
2. sqlite 报 `attempt to write a readonly database`

应对：

1. 当前测试链不依赖 `opencode models` 作为唯一健康检查
2. 先以 CLI 可执行 + 显式模型参数为准
3. 环境问题另开专项修

### 风险 3：假装用了 agent-browser

表现：

1. 实际是自写浏览器脚本
2. report 却写成 `agent-browser`

应对：

1. prompt 明确约束
2. report 强制写明浏览器执行方式
3. 无证据则不能写 `passed`

### 风险 4：交互式 OpenCode 与测试执行抢库

表现：

1. `database is locked`
2. worker / direct-run 互相干扰

应对：

1. 执行前先检查活跃 `opencode` 进程
2. 发现活跃会话则直接 `blocked`

---

## 8. 推荐实施顺序

建议按以下顺序推进：

1. Phase 0：协议文档
2. Phase 1：Direct-run MVP
3. Phase 2：报告与状态闭环
4. Phase 4：通过判据收紧
5. Phase 3：Queue-worker 能力

原因：

1. 我们当前最缺的是“能稳定发起一次正确的测试执行”
2. 不是“先上复杂轮询框架”

---

## 9. 本轮建议的最小落地范围

如果只做第一批最值当的内容，建议先落：

1. `testing/README.md`
2. `testing/OPENCODE_INIT.md`
3. `testing/golden-crucible/README.md`
4. `testing/golden-crucible/requests/REQUEST_TEMPLATE.md`
5. `testing/scripts/run-opencode-request.mjs`
6. `package.json` 中的 `test:opencode:gc`

做到这一步，就已经具备：

1. 协议入口
2. 模型硬约束
3. Codex 直接驱动 OpenCode
4. agent-browser 优先执行

后续再补 worker 和更完整的状态机。
