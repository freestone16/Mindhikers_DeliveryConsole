# TREQ-2026-03-20-DISTRIBUTION-002

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-20-DISTRIBUTION-002
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-20-DISTRIBUTION-002-phase1-business-acceptance-live.report.md`

## 测试目标

在放开 OpenCode 本地数据库权限后的真实环境中，再次对 Distribution Phase1 首个里程碑做正式业务验收。

## 背景

`001` request 已经证明：

1. Distribution testing 队列与 worker 协议可用
2. 失败原因为 OpenCode 本地数据库只读
3. 当前不是业务代码先挂

本条 `002` request 专门用于在真实可写环境中完成第一次有效测试回报。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 必须使用 `agent browser`
4. 页面入口：`http://127.0.0.1:5181/`
5. 指定项目：`CSET-SP3`
6. 本轮执行模型必须显式锁定：`zhipuai-coding-plan/glm-5`
7. 目标项目文件：
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_queue.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_history.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/publish_packages/`

## 执行步骤

1. 打开页面并进入 Distribution 模块。
2. 选择项目 `CSET-SP3`。
3. 在 `Publish Composer` 中确认存在至少一个真实视频资产。
4. 选择一个视频资产。
5. 只勾选 `youtube` 作为目标平台。
6. 填入最小必要标题 / 文案 / tags，创建任务。
7. 进入 `Distribution Queue`，确认新任务出现并记录 taskId。
8. 记录测试开始时间，并记录执行前相关文件状态：
   - `distribution_queue.json`
   - `distribution_history.json`
   - `publish_packages/`
9. 点击“立即执行”。
10. 等待任务进入最终态，并记录页面结果：
    - 最终 status
    - 错误提示或成功提示
    - 如有链接则记录
11. 再次核对文件证据：
    - `distribution_queue.json` 中该 taskId 已更新到最终状态
    - `distribution_history.json` 新增该 taskId 的记录
    - `publish_packages/` 中存在对应 `pkg-<taskId>.json`
12. 如果没有有效 YouTube token：
    - 允许任务最终为 `failed`
    - 但必须证明：
      - 页面没有无限 loading
      - 失败原因明确可读
      - 文件证据完整

## 预期结果

只有以下结果全部满足，才能写 `passed`：

1. 页面成功读取 `CSET-SP3` 的真实视频资产
2. 新任务成功创建，并在队列中可见
3. “立即执行”后任务进入最终态
4. 页面展示了明确结果，而不是静默卡死
5. `distribution_queue.json` 记录了该任务最终状态
6. `distribution_history.json` 新增了该任务记录
7. `publish_packages/` 中存在该任务快照
8. report 明确写出：
   - 实际模型
   - 是否真实使用 `agent-browser`
   - 最终为何判定通过 / 失败 / 阻塞

## 失败时必须收集

1. `Publish Composer` 页面截图
2. `Distribution Queue` 中创建后截图
3. 执行完成后的最终态截图
4. 浏览器 console / network 关键证据
5. `distribution_queue.json` 摘要
6. `distribution_history.json` 摘要
7. 对应 `pkg-<taskId>.json` 路径
8. 如失败，后端日志片段

## 备注

1. 本条 request 明确要求真实使用 `agent browser`。
2. 如果 YouTube token 缺失，只要主链路完成并以明确失败收口，仍可视为当前阶段目标达成。
3. 不要把“未真实发到 YouTube”直接等同于整条 request 失败；要按当前阶段目标判断。
