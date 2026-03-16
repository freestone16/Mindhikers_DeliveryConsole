# 跨端协作说明

这套协议是跨端通用的，角色只有两种：

1. **规划端**
   - Codex
   - Claude Code
   - 未来其他能写 request 的端
2. **执行端**
   - OpenCode worker

## 规划端要做什么

规划端只需要：

1. 往 `testing/director/requests/` 写 request
2. 等待 `reports/` 和 `status/` 更新
3. 读取报告继续排错

规划端写 request 时，必须把“什么才算通过”写清楚，尤其是：

1. 页面成功信号
2. API 或网络成功信号
3. 写盘产物
4. 明确失败判据

所以不管是 Codex 还是 Claude Code，都只要遵循同一个 request 模板：

- [testing/director/requests/REQUEST_TEMPLATE.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/requests/REQUEST_TEMPLATE.md)

## 执行端要做什么

执行端统一由 OpenCode worker 完成：

```bash
npm run test:worker:director
```

如果 request 涉及页面交互，OpenCode 执行时应优先选择 `agent browser`。
如果 request 明确要求 `agent browser`，执行端不得用自写浏览器脚本冒充完成。

## 典型组合

### 组合 A

- Codex 写 request
- OpenCode 跑测试
- Codex 读 report

### 组合 B

- Claude Code 写 request
- OpenCode 跑测试
- Claude Code 或 Codex 读 report

### 组合 C

- 你手工写 request
- OpenCode 跑测试
- Codex / Claude Code 任一端读 report

核心原则是：

**规划端与执行端解耦，request / report 文件是唯一事实来源。**

所以无论是 Codex 还是 Claude Code，都不要只写“点一下看看是否正常”这类软 request；要尽量写成可判定、可复核、可回放的验收单。
