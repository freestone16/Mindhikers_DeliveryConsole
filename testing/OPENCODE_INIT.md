# OpenCode 初始化说明

## 环境基线

进入模块根目录：

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/MarketingMaster
```

确认工具可用：

```bash
opencode --help
agent-browser --help
```

## 模型口径

默认要求显式使用：

```text
zhipuai-coding-plan/glm-5
```

## 执行纪律

1. 环境 ready 后等待明确 request，不自动开跑。
2. 需要真实页面交互时，默认优先 `agent-browser`。
3. 执行失败也要回写 report 和 artifacts。

