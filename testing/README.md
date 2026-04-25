# MarketingMaster 测试协作手册

当前模块测试链路统一为：

```text
Agent -> opencode run -> OpenCode -> agent-browser -> report/artifacts/status
```

## 统一口令

在本模块目录中，如果用户说：

```text
协调opencode测试
```

默认读取：

1. `testing/README.md`
2. `testing/OPENCODE_INIT.md`
3. `testing/marketing-master/README.md`

读取完成后只进入环境 ready，不自动发起 request。

## 协作纪律

1. 页面交互和截图验证默认优先 `agent-browser`。
2. request 由 Codex 维护，OpenCode 负责 claim/report/artifacts/status。
3. 无明确测试目标时，不自动开跑。

