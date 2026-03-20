# OpenCode 初始化说明

## 环境基线

进入项目根目录：

```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible
```

确认两个 CLI 可用：

```bash
opencode --help
agent-browser --help
```

如果 `agent-browser` 不存在，先补齐：

```bash
npm install -g agent-browser
agent-browser install
```

## 模型口径

当前黄金坩埚所有测试执行统一强制使用：

```text
zhipuai-coding-plan/glm-5
```

即使 OpenCode 默认模型已经是这个值，也不能只依赖默认配置。
执行命令必须显式传：

```bash
--model zhipuai-coding-plan/glm-5
```

## 为什么不能只靠默认路由

1. 默认 provider / model 以后可能变化
2. 继续旧 session 时可能继承旧模型
3. 生产测试需要可审计口径，命令行显式参数比默认配置更可靠

## 并发纪律

1. 开生产测试前，先退出其他交互式 `opencode` 会话
2. 如果已有活跃 `opencode` 进程，测试脚本会直接阻塞，避免锁库
3. 只要 request 涉及页面交互，执行端就必须优先使用 `agent-browser`
