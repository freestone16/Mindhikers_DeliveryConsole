# GoldenCrucible 模块测试说明

当前模块测试目录说明：

- `requests/`：Codex 写测试单
- `claims/`：执行前认领记录
- `reports/`：OpenCode 回写测试报告
- `artifacts/`：截图、日志、辅助证据
- `status/`：机器可读状态与状态板

## 通过定义

以后 `passed` 只表示：

1. request 里要求的关键结果被验证
2. report 给出明确证据路径
3. report 明确写出实际模型为 `zhipuai-coding-plan/glm-5`
4. report 明确说明是否真实使用了 `agent-browser`

以下情况不能算 `passed`：

1. 只证明页面打开了
2. 只证明没有明显报错
3. 没有截图或日志证据
4. 没写清实际模型

## 当前推荐调用

```bash
npm run test:opencode:gc -- --request testing/golden-crucible/requests/<request-file>.md
```
