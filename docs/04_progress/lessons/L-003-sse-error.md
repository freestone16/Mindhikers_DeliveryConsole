# L-003 - SSE 错误消息被前端吞噬

**日期**：2026-03-03
**分类**：SSE 事件处理

---

## 问题

- Phase 2 生成 B-roll 方案时卡在"生成中..."状态
- 后端发送了错误消息 `type: 'error'`，但前端没有处理
- 用户看到界面无响应，不知道具体失败原因

---

## 根本原因

1. 前端 SSE 事件处理不完整：只处理了 `taskId`、`progress`、`chapter_ready`、`done`，缺少 `error`
2. 错误信息被吞噬：`// Ignore parse errors` 这种注释是危险的

---

## 修复

**前端**：
```typescript
} else if (jsonData.type === 'error') {
  throw new Error(jsonData.error || 'Unknown error');
}
// 不要静默忽略
console.error('[SSE Parse Error]', e, 'Raw data:', line);
```

**后端**：
```typescript
// 错误消息要用户友好
let userFacingError = '全局生成失败，请重试';
if (errorMsg.includes('ECONNREFUSED')) {
  userFacingError = '无法连接到 LLM 服务';
} else if (errorMsg.includes('JSON')) {
  userFacingError = 'LLM 返回的不是有效的 JSON 格式';
}
```

---

## 相关规则

- 每种后端发送的 type 都必须有对应的前端处理逻辑
- 特别处理 `error` 类型，必须抛出并显示给用户
- 不要静默忽略解析错误

---

## 相关文件

- `/Users/luzhoua/DeliveryConsole/src/components/DirectorSection.tsx:159-188`
- `/Users/luzhoua/DeliveryConsole/server/director.ts:487-501`
