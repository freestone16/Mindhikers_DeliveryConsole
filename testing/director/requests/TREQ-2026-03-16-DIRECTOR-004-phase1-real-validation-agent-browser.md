# TREQ-2026-03-16-DIRECTOR-004

## 元信息

- module: Director
- request_id: TREQ-2026-03-16-DIRECTOR-004
- created_by: Codex
- priority: P1
- expected_report: `testing/director/reports/TREQ-2026-03-16-DIRECTOR-004-phase1-real-validation-agent-browser.report.md`

## 测试目标

用 `agent browser` 对 Director `Phase1` 做真实页面验收，确认这条主链路是否真的生成了概念提案并完成写盘。

## 背景

`002` 证明了协议链路能跑，但属于软 smoke。  
`003` 已经收紧了通过判据，但这轮开始用户明确要求：凡是浏览器环节，都优先由 OpenCode 测试团队使用 `agent browser` 执行。  
因此本条 `004` 是当前权威 request，后续若 `003` 也产出了 report，以 `004` 为准。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
2. 已启动：`npm run dev`
3. 页面入口：`http://localhost:5178/`
4. 项目：`CSET-Seedance2`
5. 文稿：`02_Script/CSET-seedance2_深度文稿_v2.1.md`
6. 目标输出文件：`/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/CSET-Seedance2/04_Visuals/phase1_视觉概念提案_CSET-Seedance2.md`

## 执行工具要求

1. 浏览器交互必须优先使用 `agent browser`
2. 只要页面可操作，就不要退化成“随手脚本点一下”
3. 如 `agent browser` 本身不可用，report 应写 `blocked` 并记录具体阻塞原因

## 执行步骤

1. 记录测试开始时间，以及目标输出文件当前修改时间。
2. 使用 `agent browser` 打开 `http://localhost:5178/`。
3. 验证顶部项目为 `CSET-Seedance2`。
4. 验证右上角文稿为 `CSET-seedance2_深度文稿_v2.1.md`；如不是，先切到这份文稿。
5. 进入 `影视导演`。
6. 截图保留点击前状态，并确认页面能看到 `开始头脑风暴并生成概念提案`。
7. 点击生成按钮。
8. 记录是否进入生成态，优先抓取：
   - `Generating Visual Concept...`
   - loading / spinner
   - `/api/director/phase1/generate` 请求或等价网络证据
9. 最长等待 90 秒，期间持续观察：
   - 页面是否出现 `Visual Concept Proposal`
   - 提案正文是否变成非占位内容
   - 输出文件时间戳是否刷新
10. 结束时再次读取输出文件修改时间，并读取文件前几行确认不是空文件或默认占位文案。
11. 保存关键截图、console、必要的网络/API 证据。

## 预期结果

只有以下结果同时满足，report 才能写 `passed`：

1. 浏览器步骤确实由 `agent browser` 执行。
2. 页面从 Phase1 初始态进入生成流程。
3. 页面最终出现 `Visual Concept Proposal`。
4. 提案正文不是空白，也不是占位文案。
5. 目标输出文件修改时间晚于本次测试开始时间。
6. 未出现以下错误：
   - `Generation failed`
   - `KIMI_API_KEY not configured`
   - `Script file not found`
   - API 500 / SSE 中途错误

## 失败时必须收集

1. `agent browser` 截图
2. 目标文件测试前后的修改时间
3. 目标文件前几行内容，或其摘要
4. 浏览器 console 日志
5. 关键 network/API 证据
6. 如被阻塞，记录 `agent browser` 不可用的具体原因

## 备注

这条 request 的价值在于给规划端提供强证据。  
所以 report 中必须明确写出：

1. `agent browser` 是否实际被使用
2. 哪些通过条件被证明
3. 哪些没有被证明
4. 最终为什么是 `passed` / `failed` / `blocked`
