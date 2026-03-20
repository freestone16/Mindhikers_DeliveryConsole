# Distribution 测试队列

当前目录是 `Distribution` 模块的测试协作区。

如果上层代理是通过“黄金测试”或“协调opencode测试”进入当前仓库，并且当前任务语境是分发终端，那么在读取完：

1. `testing/README.md`
2. `testing/OPENCODE_INIT.md`
3. `testing/distribution/README.md`

之后，就应直接接管本模块测试队列。

## 目录

- `requests/`：Codex 写测试请求
- `claims/`：OpenCode 认领请求
- `reports/`：OpenCode 回写测试报告
- `artifacts/`：截图、日志、录屏
- `status/`：状态板和最新状态

## 协作规则

1. `request` 不可变
2. `claim` 必须先于执行
3. `report` 必须引用 artifact 路径
4. 如被阻塞，状态写 `blocked`
5. 涉及真实页面交互时，默认优先使用 `agent browser`

## Distribution Phase1 推荐验收信号

如果测试目标是当前 Phase1 首个里程碑，优先验证下面这些信号：

1. 进入 Distribution 页面后，`Publish Composer` 能读取到真实项目资产
2. 能在 UI 中创建发布任务，并在 `Distribution Queue` 中看到该任务
3. 队列任务可执行，状态不会静默卡死
4. 执行结果必须在 UI 和项目文件至少一侧被证据证明
5. 如果缺少 YouTube token，必须出现明确失败信息，而不是无限 loading 或空白
6. `06_Distribution/distribution_queue.json`
7. `06_Distribution/distribution_history.json`
8. `06_Distribution/publish_packages/pkg-*.json`
   至少其中两类产物能提供本次执行的证据

## 通过口径

只有在 request 里写明的 Expected 同时满足时，才能写 `passed`。

以下情况不能算通过：

1. 只证明页面能打开
2. 只证明任务能创建，但不能执行
3. 只证明执行按钮能点击，但没有结果证据
4. 出现明显错误却没有被 UI 或报告记录清楚
