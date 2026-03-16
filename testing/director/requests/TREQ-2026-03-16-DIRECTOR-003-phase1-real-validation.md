# TREQ-2026-03-16-DIRECTOR-003

## 元信息

- module: Director
- request_id: TREQ-2026-03-16-DIRECTOR-003
- created_by: Codex
- priority: P1
- expected_report: `testing/director/reports/TREQ-2026-03-16-DIRECTOR-003-phase1-real-validation.report.md`

## 测试目标

像真实验收一样验证 Director `Phase1` 是否真的完成了概念提案生成，而不只是页面可打开、按钮可点击。

## 背景

`002` 已证明 OpenCode 协议链路可运行，但它只完成了软性 smoke：

1. 打开页面
2. 点击 `Phase 1`
3. 等待 5 秒
4. 因为没有明显报错而给出 `passed`

这不足以帮助规划端继续排错。  
本条 `003` 必须验证真实结果，包括页面完成态和本地写盘产物。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
2. 已启动：`npm run dev`
3. 页面入口：`http://localhost:5178/`
4. 项目：`CSET-Seedance2`
5. 文稿：`02_Script/CSET-seedance2_深度文稿_v2.1.md`
6. 目标输出文件：`/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/CSET-Seedance2/04_Visuals/phase1_视觉概念提案_CSET-Seedance2.md`

## 执行步骤

1. 在测试开始时记录当前时间和目标输出文件的修改时间。
2. 打开 `http://localhost:5178/`。
3. 验证顶部项目显示为 `CSET-Seedance2`。
4. 验证右上角文稿选择器当前为 `CSET-seedance2_深度文稿_v2.1.md`，如果不是，先显式切到这份文稿。
5. 进入 `影视导演`。
6. 在点击前截图，确认页面处于 Phase1 初始态，并能看到 `开始头脑风暴并生成概念提案`。
7. 点击生成按钮。
8. 记录点击后是否进入生成中状态；优先抓取：
   - `Generating Visual Concept...`
   - 页面 loading/spinner
   - 对 `/api/director/phase1/generate` 的请求
9. 最长等待 90 秒，不要只等 5 秒；在等待期间持续观察以下任一完成信号：
   - 页面出现 `Visual Concept Proposal`
   - 提案正文区域出现非占位内容
   - 目标输出文件修改时间刷新到本次测试开始之后
10. 结束时再次读取目标输出文件修改时间，并读取文件前几行确认不是空文件或占位文案。
11. 保存关键截图、浏览器 console、必要的网络/API 证据。

## 预期结果

只有以下结果同时满足时，report 才能写 `passed`：

1. 页面确实从初始态进入了生成流程。
2. 页面最终出现 `Visual Concept Proposal`。
3. 提案正文不是空白，也不是默认占位文案。
4. 目标输出文件修改时间晚于本次测试开始时间。
5. 没有出现以下已知错误：
   - `Generation failed`
   - `KIMI_API_KEY not configured`
   - `Script file not found`
   - 任何 API 500 / SSE 错误终止

如果只能证明部分结果，例如“按钮点了但文件没刷新”或“文件刷新了但页面没进入完成态”，都必须写 `failed`，不能写 `passed`。

## 失败时必须收集

1. 点击前、生成中、结束后的页面截图
2. 目标文件测试前后的修改时间
3. 目标文件前几行内容，或其摘要
4. 浏览器 console 日志
5. 如能拿到，`/api/director/phase1/generate` 的响应状态或失败信息
6. 如页面弹窗报错，记录原文

## 备注

这条 request 的目标不是“证明协议能跑”，而是“为规划端提供可继续排错的强证据”。  
所以 report 里必须明确写出：

1. 哪些预期被证明了
2. 哪些没有被证明
3. 最终为什么是 `passed` / `failed` / `blocked`
