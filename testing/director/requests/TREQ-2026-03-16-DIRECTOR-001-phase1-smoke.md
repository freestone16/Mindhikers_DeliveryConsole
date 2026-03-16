# TREQ-2026-03-16-DIRECTOR-001

## 元信息

- module: Director
- request_id: TREQ-2026-03-16-DIRECTOR-001
- created_by: Codex
- priority: P1
- expected_report: `testing/director/reports/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.report.md`

## 测试目标

验证导演模块 `Phase1` 概念生成主链路是否能从页面正常发起，并成功生成新的概念提案。

## 背景

本轮修复包含：

1. 恢复当前 worktree 的 `.env` 运行基线
2. 修复导演模块跟随全局模型配置后的 key 缺失问题
3. 给 Director Phase1/Phase2 增加前置配置校验

需要确认用户主路径已经恢复可用，而不是只在后端日志中看起来没问题。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
2. 已启动：`npm run dev`
3. 页面入口：`http://localhost:5178/`
4. 项目选择为：`CSET-Seedance2`
5. 文稿选择为：`02_Script/CSET-seedance2_深度文稿_v2.1.md`

## 执行步骤

1. 打开 `http://localhost:5178/`
2. 进入 `影视导演` 模块
3. 保持在 `P1` 页签
4. 点击“生成概念提案”或等价的 Phase1 主按钮
5. 等待直到页面出现生成结果，或明确报错

## 预期结果

1. 页面进入生成中状态
2. 最终出现可见的概念提案内容
3. 后端不再出现 `KIMI_API_KEY not configured`
4. 输出文件 `/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/CSET-Seedance2/04_Visuals/phase1_视觉概念提案_CSET-Seedance2.md` 的时间戳被刷新

## 失败时必须收集

1. 页面截图，保存到 `testing/director/artifacts/`
2. 浏览器弹窗或错误提示原文
3. 后端日志关键片段
4. 如文件未刷新，记录目标文件当前时间戳

## 备注

如果页面拦截并提示“当前全局模型未配置可用 API Key”，也算有效结果，但必须把提示文案原样写入报告。
