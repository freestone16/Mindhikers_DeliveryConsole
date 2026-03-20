# TREQ-2026-03-20-DISTRIBUTION-001

## 元信息

- module: Distribution
- request_id: TREQ-2026-03-20-DISTRIBUTION-001
- created_by: Codex
- priority: P1
- expected_report: `testing/distribution/reports/TREQ-2026-03-20-DISTRIBUTION-001-phase1-business-acceptance.report.md`

## 测试目标

对 Distribution Phase1 首个里程碑做正式业务验收，确认当前主链路已经具备“读项目资产、创建分发任务、在队列中执行、明确回写结果”的能力。

## 背景

本轮代码已经补上：

1. `Publish Composer` 读取项目资产
2. `Distribution Queue` 的 “立即执行” 入口
3. `POST /api/distribution/queue/:taskId/execute`
4. `06_Distribution/distribution_history.json`
5. `06_Distribution/publish_packages/pkg-*.json`

本条 request 的目标不是要求真实把视频成功发到 YouTube。

当前阶段通过线是：

1. 主链路能真实跑起来
2. 结果是“明确成功”或“明确失败”
3. 失败时有可解释错误，不是静默卡死
4. 队列与项目文件都能留下证据

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/Distribution Terminal`
2. 已启动：`npm run dev`
3. 必须使用 `agent browser`
4. 页面入口：`http://127.0.0.1:5181/`
5. 指定项目：`CSET-SP3`
6. 允许使用现有项目资产，不要求创建新素材
7. 目标证据目录：
   - `testing/distribution/artifacts/`
8. 目标项目文件：
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_queue.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/distribution_history.json`
   - `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects/CSET-SP3/06_Distribution/publish_packages/`

## 执行步骤

1. 打开页面并进入 Distribution 模块。
2. 选择项目 `CSET-SP3`。
3. 进入 `Publish Composer`，确认页面能加载真实视频资产。
4. 选择一个视频资产。
5. 只勾选 `youtube` 作为目标平台。
6. 填入最小必要标题 / 文案 / tags，然后提交创建任务。
7. 进入 `Distribution Queue`，确认新任务出现。
8. 记录执行前：
   - 队列任务状态
   - `distribution_queue.json`
   - `distribution_history.json`
   - `publish_packages/` 中最新文件
9. 点击“立即执行”。
10. 等待直到任务进入最终态，记录：
   - 页面状态
   - 错误文案或成功文案
   - 若有结果链接，记录链接
11. 再次检查项目文件变化：
   - `distribution_queue.json` 是否更新
   - `distribution_history.json` 是否新增记录
   - `publish_packages/` 是否存在对应 `pkg-<taskId>.json`
12. 如果没有有效 YouTube token：
   - 允许结果为 `failed`
   - 但必须证明失败信息明确，且页面没有无限 loading

## 预期结果

只有以下结果全部满足，才能写 `passed`：

1. `Publish Composer` 成功加载到 `CSET-SP3` 的真实视频资产
2. 新任务成功创建，并在 `Distribution Queue` 中可见
3. 点击“立即执行”后，任务进入最终态，不是无限 loading
4. 页面上能看到明确结果：
   - 要么成功结果
   - 要么明确失败原因（例如缺少有效 YouTube token）
5. `distribution_queue.json` 在本次测试后被更新，并包含该任务最终状态
6. `distribution_history.json` 在本次测试后新增与该任务对应的记录
7. `publish_packages/` 在本次测试后存在对应 `pkg-<taskId>.json`
8. 未出现“按钮可点但无结果证据”的假通过

## 失败时必须收集

1. `Publish Composer` 页面截图
2. 创建任务后的 `Distribution Queue` 截图
3. 点击执行后的最终态截图
4. 浏览器 console / network 关键证据
5. `distribution_queue.json` 摘要
6. `distribution_history.json` 摘要
7. 对应 `pkg-<taskId>.json` 路径
8. 如失败，后端日志片段

## 备注

1. 本条 request 明确要求真实使用 `agent browser`，不能用手写 Playwright fallback 冒充。
2. 如果 YouTube token 缺失或失效，不应直接判整条 request `blocked`；只要其余主链路被证明成立，且失败文案明确、文件证据齐全，仍可按“阶段目标达成”判断。
3. 报告里必须明确写出：
   - 实际模型
   - 是否真实使用 `agent-browser`
   - 最终状态为何属于通过 / 失败 / 阻塞
