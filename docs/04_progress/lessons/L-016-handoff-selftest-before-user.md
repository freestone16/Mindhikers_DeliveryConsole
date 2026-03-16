# L-016 交给用户测试前必须先自测主链路

## 日期

2026-03-15

## 问题

本次导演模块排障中，我虽然修掉了右上角文稿下拉的后端根因，但没有在交给用户前把用户当前真正要用的主链路完整自测一遍。

结果现场暴露出两个问题：

1. Phase1 主按钮一点击就报 `KIMI_API_KEY not configured`
2. 我做完临时验证后关闭了后端，用户再打开页面直接 `ERR_CONNECTION_REFUSED`

## 根因

1. 只验证了局部接口和单点修复，没有回到用户真实操作路径
2. 没有把“当前 dev 服务保持可访问”作为交接条件
3. 当前 worktree 缺失旧主仓 `.env`，但在交接前没有把这件事暴露出来

## 正确做法

1. 修完后先跑用户当前在用的主按钮/主页面/主 API
2. 验证结束后确认前后端仍在运行，端口能访问
3. 若主链路依赖外部配置（如 API Key），必须在交接前先校验，而不是让用户点出来

## 本次修复动作

1. 对比旧主仓运行环境，确认旧仓 `.env` 有可用 LLM key，而当前 worktree 缺失 `.env`
2. 恢复当前 worktree 的 `.env` 运行基线
3. 在导演主链路前增加全局 provider key 前置校验
4. 在规则和 AGENTS 中写入“先自测，再交接”的要求

## 防再犯动作

1. [`docs/04_progress/rules.md`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/docs/04_progress/rules.md) 增加“交给用户测试前必须先自测主链路”
2. [`AGENTS.md`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/AGENTS.md) 增加“自测后保持可用运行态”
3. 以后任何“页面修好了你试试”之前，先确认：
   - 主按钮能跑
   - 页面能打开
   - 服务没被我自己关掉
