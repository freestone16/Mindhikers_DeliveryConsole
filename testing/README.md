# GoldenCrucible 测试协作手册

当前黄金坩埚的测试执行链路统一为：

```text
Agent -> opencode run -> OpenCode -> agent-browser -> report/artifacts/status
```

目标不是“有人帮忙点一下页面”，而是让测试具备：

1. 可重复
2. 可审计
3. 可回放
4. 可直接交给生产测试窗口运行

## 统一口令

如果在项目目录里说：

```text
协调opencode测试
```

默认读取：

1. `testing/README.md`
2. `testing/OPENCODE_INIT.md`
3. `testing/golden-crucible/README.md`

然后进入环境 ready，等待明确测试目标。

## 当前硬约束

1. OpenCode 执行模型固定为 `zhipuai-coding-plan/glm-5`
2. 执行命令必须显式传 `--model zhipuai-coding-plan/glm-5`
3. 真实页面交互默认必须使用 `agent-browser`
4. report 必须写清：
   - 实际模型
   - 是否真实使用 `agent-browser`
   - 关键证据路径
   - 最终状态

## 当前主入口

```bash
npm run test:opencode:gc -- --request testing/golden-crucible/requests/<request-file>.md
```

这条命令会：

1. 检查 `opencode` CLI
2. 检查 `agent-browser` CLI
3. 检查是否已有活跃 `opencode` 进程
4. 写入 claim
5. 调用 `opencode run --model zhipuai-coding-plan/glm-5`
6. 校验 report 是否满足硬约束
7. 更新 `status/latest.json` 和 `status/BOARD.md`
