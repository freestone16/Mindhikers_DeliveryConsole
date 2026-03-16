# Director 测试队列

当前目录是 `Director` 模块的测试协作区。

如果上层代理是通过“协调opencode测试”进入本模块，那么它在读取完：

1. `testing/README.md`
2. `testing/OPENCODE_INIT.md`
3. `testing/director/README.md`

之后，就应直接接管本模块测试队列，而不是再向用户追问协议细节。
但这一步只表示环境 ready；代理必须等待用户明确说明下一步测试计划，不能自动发起 request。

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

## Director Phase1 推荐验收信号

这类 request 只要涉及页面点击、等待生成态、检查完成态，执行端应优先使用 `agent browser`。
如果 request 明确要求 `agent browser`，就不能再用自写 Playwright 脚本冒充；做不到时应如实标成 `blocked`。

如果测试目标是 `Phase1`，优先验证下面这些信号：

1. 进入导演模块后，能看到 `开始头脑风暴并生成概念提案`
2. 点击后出现生成中界面 `Generating Visual Concept...`
3. 最终出现 `Visual Concept Proposal`
4. 提案正文不是空白，也不是“等待导演大师的视觉概念提案”这类占位
5. 产物文件 `04_Visuals/phase1_视觉概念提案_<projectId>.md` 的时间戳刷新

如果这些信号缺失，report 应标成 `failed` 或 `blocked`，不要因为“没有明显报错”就给 `passed`。
