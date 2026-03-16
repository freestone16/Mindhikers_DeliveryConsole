# TREQ-2026-03-16-DIRECTOR-002

## 元信息

- module: Director
- request_id: TREQ-2026-03-16-DIRECTOR-002
- created_by: Codex
- priority: P1
- expected_report: `testing/director/reports/TREQ-2026-03-16-DIRECTOR-002-phase1-smoke-live.report.md`

## 测试目标

在 OpenCode 真实终端环境中执行导演模块 `Phase1` 页面测试，确认 OpenCode 作为执行端能按协议完成一次完整测试回报。

## 背景

`001` request 已经验证了协议链条本身能生成 claim/report/status，但当时执行环境仍然受到当前沙箱限制。  
本条 `002` request 专门用于你在 OpenCode 自己的真实终端里启动 worker 后，完成第一次有效测试。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
2. 已启动：`npm run dev`
3. OpenCode 环境能正常执行：
   - `opencode providers`
   - `opencode models`
4. 页面入口：`http://localhost:5178/`

## 执行步骤

1. 打开 `http://localhost:5178/`
2. 进入 `影视导演`
3. 保持项目为 `CSET-Seedance2`
4. 保持文稿为 `02_Script/CSET-seedance2_深度文稿_v2.1.md`
5. 点击 `Phase1` 主按钮生成概念提案
6. 记录最终页面现象，并把证据写入 report / artifacts

## 预期结果

1. OpenCode worker 成功认领该 request
2. 页面能发起 Phase1
3. 若生成成功，出现新的概念提案内容
4. 若失败，report 中能明确记录页面错误或环境阻塞原因

## 失败时必须收集

1. 页面截图，保存到 `testing/director/artifacts/`
2. 页面错误提示原文
3. 后端日志关键片段
4. OpenCode 执行日志

## 备注

这条 request 的目标不是“必须通过”，而是确保 OpenCode 真实终端环境下能完成一次有效测试回报。
