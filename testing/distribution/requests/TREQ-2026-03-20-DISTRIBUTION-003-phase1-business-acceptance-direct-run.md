# TREQ-2026-03-20-DISTRIBUTION-003

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-20-DISTRIBUTION-003
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-20-DISTRIBUTION-003-phase1-business-acceptance-direct-run.report.md`

## 测试目标

在已有 OpenCode 会话存在的前提下，执行一次受控的 direct-run 黄金测试，验证 Distribution 当前阶段主链路是否达到可交付标准。

## 背景

1. `001` 因 OpenCode 本地数据库只读而失败
2. `002` 因 worker 协议检测到活跃 OpenCode 会话而主动避让
3. 当前需要一条真正进入业务页面与项目文件验证的 live request

本条 request 允许在 `ignore-active-opencode` 显式开启时继续执行，但必须在 report 中记录这是一次受控越过避让的 direct-run。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 必须使用 `agent browser`
4. 页面入口：`http://127.0.0.1:5181/`
5. 指定项目：`CSET-SP3`
6. 执行模型必须显式锁定：`zhipuai-coding-plan/glm-5`
7. 目标项目文件：
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_queue.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_history.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/publish_packages/`

## 执行步骤

1. 打开页面并进入 Distribution 模块。
2. 选择项目 `CSET-SP3`。
3. 在 `Publish Composer` 中确认至少能读到一个真实视频资产。
4. 选择一个视频资产。
5. 只勾选 `youtube` 作为目标平台。
6. 输入最小标题 / 文案 / tags，创建任务。
7. 进入 `Distribution Queue`，确认任务出现并记录 taskId。
8. 记录测试开始时间与执行前文件状态。
9. 点击“立即执行”，等待任务进入最终态。
10. 记录：
    - UI 最终状态
    - 明确成功或失败文案
    - 如有链接则记录
11. 检查项目文件：
    - `distribution_queue.json` 中该 taskId 已更新
    - `distribution_history.json` 有该 taskId 对应记录
    - `publish_packages/` 中有对应 `pkg-<taskId>.json`
12. 如果 YouTube token 缺失：
    - 允许结果为明确失败
    - 但仍需证明页面和文件主链路成立

## 预期结果

只有以下结果全部满足，才能写 `passed`：

1. 页面成功读取真实资产
2. 新任务成功创建
3. 队列任务可执行并进入最终态
4. 页面显示明确结果，不是静默卡死
5. `distribution_queue.json` 记录该任务最终状态
6. `distribution_history.json` 新增该任务记录
7. `publish_packages/` 中存在该任务快照
8. report 明确写出本次为：
   - `actual_model = zhipuai-coding-plan/glm-5`
   - `browser_execution = agent-browser`
   - `execution_mode = direct-run with ignore-active-opencode`

## 失败时必须收集

1. `Publish Composer` 页面截图
2. `Distribution Queue` 最终态截图
3. 浏览器 console / network 关键证据
4. `distribution_queue.json` 摘要
5. `distribution_history.json` 摘要
6. `pkg-<taskId>.json` 路径
7. 后端日志片段

## 备注

1. 这条 request 的目标是业务验收，不是再次证明 worker 避让逻辑。
2. 若实际执行过程中发生 DB lock、模型错误或 agent-browser 不可用，应如实写 `blocked` 或 `failed`。
