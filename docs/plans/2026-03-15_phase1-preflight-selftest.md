# 2026-03-15 Phase1 前置校验与交接自测方案

## 背景

2026-03-15 用户在验证导演模块时，连续遇到两类问题：

1. Phase1 无法开展，后端日志实际报 `KIMI_API_KEY not configured`
2. 在我完成局部接口验证后，用户再次打开页面时出现 `ERR_CONNECTION_REFUSED`

这说明问题不只在代码逻辑，还在交付流程：

- 当前 worktree 缺失迁移前可用的 `.env`
- 修复后没有先把用户当前主链路自测到底
- 验证结束后还把临时后端关掉，导致用户一上手就断开

## 目标

1. 恢复当前主力 worktree 与旧主仓一致的运行基线
2. 在 Phase1 / Phase2 真正发起 LLM 调用前做配置就绪检查
3. 把“先自测、再交给用户”的要求升级为项目规约

## 方案

### 1. 恢复 worktree 运行基线

将旧主仓 `/Users/luzhoua/DeliveryConsole/.env` 同步到当前 worktree，恢复迁移前已可用的 provider key 基线。

### 2. 增加前置配置校验

在 [`server/llm-config.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/llm-config.ts) 增加 provider 凭证检查 helper，并在以下链路真正调用 LLM 前先校验：

- [`server/director.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/director.ts)
- [`server/expert-actions/director.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/expert-actions/director.ts)

同时在 [`src/components/DirectorSection.tsx`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/src/components/DirectorSection.tsx) 前端按钮侧提前拦截，直接告诉用户“当前全局模型缺少 API Key”，避免点了才从日志里发现。

### 3. 强化交接前自测

把以下要求写入规约：

1. 交给用户测试前，必须先自测用户当前正在使用的主链路
2. 自测结束后，dev 服务必须保持运行可访问
3. 局部接口验证不能替代主入口验证

## 验证

1. 检查当前 worktree `.env` 已恢复
2. 启动 `npm run dev`
3. 触发导演 Phase1 主按钮，确认不再立即报缺少 key
4. 交接前确认 `http://localhost:5178/` 可访问

## 结论

这次不是单点 bug，而是“环境迁移缺口 + 缺少交接前自测”的组合问题。修复必须同时覆盖代码、环境和流程。
