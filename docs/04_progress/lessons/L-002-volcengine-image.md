# L-002 - 火山引擎文生图预览图生成失败

**日期**：2026-03-03
**分类**：火山引擎集成

---

## 问题

- 文生视频预览图生成失败，API 返回错误 `image size must be at least 3686400 pixels`
- 修复尺寸问题后，虽然任务成功但状态显示 `failed`，错误信息为 `No task_id or image returned`

---

## 根本原因

1. **尺寸问题**：默认使用 `1024x1024`（104万像素），但火山引擎要求至少 368 万像素
2. **数据路径问题**：火山引擎 API 返回 `{ data: [ { url: "..." } ] }`，但代码检查的是 `data.data?.images?.[0]?.url`

---

## 修复

```typescript
// volcengine.ts
// 影视导演（Director）使用 16:9 横向分辨率
const size = options.size || '2560x1440';  // 2K, 3,686,400 像素

// 响应解析：兼容多种数据路径
if (data.data?.[0]?.url) {
  return { image_url: data.data[0].url };
}
if (data.data?.images?.[0]?.url) {
  return { image_url: data.data.images[0].url };
}
```

---

## 相关规则

- 图片生成最小像素数：3,686,400
- 影视导演（Director）用 2560x1440（16:9 横向）
- 短视频大师（Shorts）用 1440x2560（9:16 竖向）
- API 响应解析先验证实际返回结构，不要假设

---

## 相关文件

- `/Users/luzhoua/DeliveryConsole/server/volcengine.ts:51` - 尺寸参数
- `/Users/luzhoua/DeliveryConsole/server/volcengine.ts:83-91` - 响应解析逻辑
