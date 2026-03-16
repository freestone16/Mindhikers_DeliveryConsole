# TREQ-2026-03-16-DIRECTOR-005

## 元信息

- module: Director
- request_id: TREQ-2026-03-16-DIRECTOR-005
- created_by: Codex
- priority: P1
- expected_report: `testing/director/reports/TREQ-2026-03-16-DIRECTOR-005-phase1-business-acceptance.report.md`

## 测试目标

对 Director `Phase1` 做正式业务验收，确认真实页面交互、生成完成态、写盘产物三者同时成立。

## 背景

这条是正式业务测试的第一单。  
它不是协议冒烟，而是 `Phase1` 的权威业务验收。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
2. 已启动：`npm run dev`
3. 必须使用 `agent browser`
4. 页面入口：`http://localhost:5178/`
5. 项目：`CSET-Seedance2`
6. 文稿：`02_Script/CSET-seedance2_深度文稿_v2.1.md`
7. 输出文件：`/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/CSET-Seedance2/04_Visuals/phase1_视觉概念提案_CSET-Seedance2.md`

## 执行步骤

1. 记录测试开始时间和输出文件当前时间戳。
2. 使用 `agent-browser` CLI 打开 `http://localhost:5178/`。
3. 确认项目为 `CSET-Seedance2`，文稿为 `CSET-seedance2_深度文稿_v2.1.md`。
4. 进入 `影视导演`，截图保留 Phase1 初始态。
5. 点击 `开始头脑风暴并生成概念提案`。
6. 观察并记录：
   - 是否出现 `Generating Visual Concept...`
   - 是否出现 `Visual Concept Proposal`
   - console / network 是否存在 `POST /api/director/phase1/generate`
7. 最长等待 90 秒。
8. 结束时再次读取输出文件时间戳，并读取前几行确认不是占位文案。

## 预期结果

只有以下结果全部满足，才能写 `passed`：

1. 浏览器执行实际由 `agent-browser` CLI 完成
2. 页面进入生成态
3. 页面进入完成态
4. 输出文件时间戳晚于测试开始时间
5. 输出内容不是占位文案
6. 无 `Generation failed` / `KIMI_API_KEY not configured` / `Script file not found`

## 失败时必须收集

1. 进入前、生成中、完成后的截图
2. console / network 证据
3. 文件测试前后时间戳
4. 文件前几行内容摘要

## 备注

如果本条失败，先不要继续 Phase2-Phase4。
