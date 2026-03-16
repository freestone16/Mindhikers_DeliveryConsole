# 2026-03-16 导演模块 OpenCode 测试协作协议（试点）

## 目标

在 `Director` 模块先试行一套 `Codex 开发排错 + OpenCode 执行测试` 的协作协议，减少 Codex 额度消耗，同时尽量不让用户充当“人工中继节点”。

## 设计原则

1. **Codex 只负责开发、排错、定义测试请求**
2. **OpenCode 只负责执行测试，不擅自改代码**
3. **共享工作目录中的文件是唯一协作媒介**
4. **尽量零中继**：用户不需要在两个 agent 之间复制大段上下文
5. **请求不可变，执行状态与结果分文件回填**，避免并发覆盖

## 目录协议

试点目录位于：

- [`testing/README.md`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/README.md)
- [`testing/director/requests`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/requests)
- [`testing/director/claims`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/claims)
- [`testing/director/reports`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/reports)
- [`testing/director/artifacts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/artifacts)
- [`testing/director/status`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/status)

## 文件职责

### 1. Request

由 Codex 创建，OpenCode 不修改。

命名：

`TREQ-YYYY-MM-DD-DIRECTOR-XXX.md`

内容包含：

- 测试目标
- 前置条件
- 操作步骤
- 预期结果
- 失败时要收集的材料

### 2. Claim

由 OpenCode 创建，表示“我开始执行这个请求”。

命名：

`TREQ-YYYY-MM-DD-DIRECTOR-XXX.claim.md`

内容包含：

- 执行者
- 开始时间
- 计划使用的环境
- 预计输出位置

### 3. Report

由 OpenCode 创建，Codex 读取分析。

命名：

`TREQ-YYYY-MM-DD-DIRECTOR-XXX.report.md`

内容包含：

- 通过/失败/阻塞
- 实际执行步骤
- 关键日志
- 截图或 artifact 路径
- 与预期的差异

### 4. Artifacts

OpenCode 产生的截图、日志、抓包、导出文件统一放这里，报告中只引用路径。

## 状态流转

```text
Codex 写 request
  -> OpenCode 创建 claim
  -> OpenCode 执行测试
  -> OpenCode 写 report + artifacts
  -> Codex 读取 report 并继续修复 / 关闭问题
```

## 零中继协作方式

用户不需要复制上下文正文。最小交互可以是：

1. Codex 生成一个新的 request 文件
2. 用户对 OpenCode 只说一句：
   `请按 testing/director/requests 里最新的请求执行，并把结果写回 reports/artifacts/status`
3. Codex 下一轮直接读取最新 report

也就是说，用户不需要在两个 agent 之间搬运：

- 测试步骤
- 预期结果
- 失败上下文
- 长日志

这些都由仓库内文件承担。

## 运行入口

OpenCode 执行端通过以下命令启动：

```bash
npm run test:worker:director
```

当前项目也提供状态查看命令：

```bash
npm run test:status:director
```

## OpenCode 侧执行纪律

1. 不修改 `requests/` 原文件
2. 必须先写 `claim`，再开始执行
3. 报告必须引用真实 artifact 路径
4. 若因环境问题无法执行，仍然必须写 report，状态标记为 `blocked`
5. 除非请求明确允许，否则 OpenCode 不改代码，只做执行和记录

## Codex 侧执行纪律

1. request 要写得足够可执行，不能只写“帮我测一下”
2. 指令必须包含：
   - 入口页面
   - 具体按钮
   - 请求参数或页面路径
   - 预期现象
   - 失败时要抓哪些材料
3. 读取 report 后，要把结论沉淀到进度或 lessons，而不是停留在对话里

## 试点范围

第一阶段只覆盖 `Director`：

- Phase1 概念生成
- Phase1 修改
- Phase2 启动方案生成
- 关键 UI 可访问性

不在首轮试点中的内容：

- Shorts
- Marketing
- Distribution
- 全局回归矩阵

## 成功标准

如果这套协议满足以下条件，就推广到其他模块：

1. 用户不需要搬运测试细节
2. OpenCode 能独立按 request 执行
3. Codex 能直接从 report 继续排错
4. 同一问题至少完成一轮“请求 -> 回报 -> 修复 -> 再测”

## 当前试点请求

首个示例请求：

- [`testing/director/requests/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.md`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/requests/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.md)

如果试点顺利，下一步再把同样结构推广到 `Shorts` 和 `Marketing`。
