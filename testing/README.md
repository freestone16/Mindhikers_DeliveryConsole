# Director 测试协作操作手册

这套目录用于实现：

- Codex 负责开发、排错、编写测试请求
- OpenCode 负责按请求执行测试
- 用户只做最小调度，不做日志和步骤的人工中继

## 统一口令

以后无论在 `Codex` 还是 `Claude Code`，只要你在项目目录里说：

```text
协调opencode测试
```

代理就应默认执行这三步：

1. 读取 [testing/README.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/README.md)
2. 读取 [testing/OPENCODE_INIT.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/OPENCODE_INIT.md)
3. 读取当前模块自己的 `testing/<module>/README.md`

然后直接进入该模块的 request / claim / report / status 队列，不要再要求用户手动重复协议。
但这一步只表示“环境 ready”，不表示自动开跑。
完成 ready 后，代理必须等待用户明确说明下一步计划。

模块 README 的约定位置示例：

- 导演模块：[testing/director/README.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/README.md)
- 未来其他模块也遵循同样位置，例如 `testing/golden-crucible/README.md`

## 你需要做什么

正常情况下，你只需要做 3 件事：

1. 在 OpenCode 侧启动测试 worker，或让它读取最新 request
2. 查看 `testing/director/status/` 或 `testing/director/reports/` 了解当前状态
3. 测完后回来一句“读取最新 director 测试报告”

初始化和开测细则见：

- [OPENCODE_INIT.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/OPENCODE_INIT.md)
- [CROSS_ENDPOINTS.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/CROSS_ENDPOINTS.md)

## 目录说明

- [`testing/director/requests`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/requests)
  - 只由 Codex 写
  - 存放待执行测试请求
- [`testing/director/claims`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/claims)
  - 由 OpenCode 写
  - 表示某条 request 已被认领
- [`testing/director/reports`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/reports)
  - 由 OpenCode 写
  - 存放测试报告
- [`testing/director/artifacts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/artifacts)
  - 存放截图、日志、抓包等证据
- [`testing/director/status`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/status)
  - 存放状态板和机器可读状态文件

## 最小使用方式

### 方式 A：手动试点

你对 OpenCode 只说一句：

```text
请按 testing/director/requests 里最新的 request 执行测试，先写 claim，再把结果写到 reports，把截图和日志放到 artifacts，并更新 status。
```

然后你只需要看：

- 最新报告是否出现在 `testing/director/reports/`
- 状态板是否更新在 `testing/director/status/BOARD.md`

### 方式 B：未来自动机

后续可以让 OpenCode 常驻一个 worker：

1. 每 60 秒轮询 `requests/`
2. 发现新请求就写 claim
3. 执行测试
4. 写 report 和 artifacts
5. 更新 `status/latest.json` 和 `status/BOARD.md`

启动命令：

```bash
npm run test:worker:director
```

## 你如何监控状态

最简单看这两个文件：

- [BOARD.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/status/BOARD.md)
- [latest.json](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/status/latest.json)

或者直接运行：

```bash
npm run test:status:director
```

它现在会额外显示：

1. `next_request`
2. `pending_request_count`
3. `pending_requests`

你可以按这个理解：

- `queued`：有 request，没人认领
- `claimed`：OpenCode 已认领，准备执行
- `running`：正在执行
- `passed`：通过
- `failed`：失败
- `blocked`：被环境或权限阻塞
- `reviewed`：Codex 已读过报告并开始下一轮处理

## 协作纪律

1. `requests/` 原文件不允许 OpenCode 修改
2. OpenCode 必须先写 claim 再执行
3. 测试失败也必须写 report
4. OpenCode 默认不改代码，除非 request 明确允许
5. Codex 读取 report 后继续修复，不要求你转述细节

## 首个试点请求

- [TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/requests/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.md)

## 下一步扩展

如果导演模块试点顺利，再扩展到：

1. `Shorts`
2. `Marketing`
3. 自动 worker
4. 更完整的状态机和超时回收

## 浏览器执行约定

只要 request 涉及真实页面交互，例如：

1. 打开本地 Web 页面
2. 点击按钮
3. 检查 loading / 完成态
4. 抓取页面截图、console、network

执行端优先使用 `agent browser`。  
不要把这类 request 偷换成“自己写个随意脚本点一下”式的宽松验证。

如果 request 明确写了“必须用 `agent browser`”，那么：

1. 不能把自写 Playwright / Selenium 脚本也算作 `agent browser`
2. 若无法使用真正的 `agent browser`，应在 report 中标成 `blocked` 或 `failed`
3. 任何 fallback 都必须明确标注为 fallback

## UI / 设计系统验收 request

涉及 Director UI、Delivery shell、视觉一致性或页面交互的 request，必须明确引用：

1. `design.md`
2. `design.zh.md`
3. 相关 PRD / 实施计划

这类 request 的验收不能只证明“页面能打开”。至少应覆盖：

1. `agent-browser` 打开本地 Director 页面并截图
2. 左侧 rail、中央 workbench、右侧 drawer、底部 status 不遮挡、不重叠
3. Chat / Runtime / Artifacts / Handoff 四个 tab 可切换，并有明确空态、加载态、错误态或数据态
4. 关键命令具备 disabled / loading / success / failure / retry 等可见状态
5. 生成、上传、渲染、批准、导出等重要动作能在 runtime / chat / artifacts / handoff 中留下可追踪上下文
6. 检查 1440px 和 980px 两档截图，确认文本、按钮、drawer、review rows 没有明显溢出
7. 同步收集 console 和 network；Artifacts/Handoff API 失败不能写 `passed`

UI request 不应把 Director 改成落地页式 hero，也不应引入装饰光斑、抽象圆球、bokeh 背景或卡片套卡片。

## 什么才算测试通过

以后 `passed` 只表示“关键业务结果被证据证明”，不表示“页面没报错”。

最少要满足：

1. request 里列出的核心预期结果被逐条验证
2. report 里给出明确证据路径
3. 如果要求验证写盘、接口或页面内容变化，必须给出对应证据

以下情况不能写 `passed`：

1. 只证明页面能打开
2. 只证明按钮能点击
3. 只证明浏览器 console 没报错
4. 等了几秒但没有拿到完成信号

对 Director Phase1 来说，更接近真实验收的证据通常是：

1. `Generating Visual Concept...` 这类加载态出现过
2. 页面最终出现 `Visual Concept Proposal`
3. 概念提案内容不是空态或占位文案
4. `04_Visuals/phase1_视觉概念提案_<projectId>.md` 的修改时间在本次测试后刷新
