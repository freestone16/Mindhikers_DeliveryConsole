# Dev Log: SD-202 Remotion 预览图渲染调试

**日期**: 2026-02-27
**耗时**: 约 3 小时
**状态**: 🔴 调试中（后端 OK，前端显示空白）

---

## 📋 本次会话目标

解决 Director Phase 2 的 Remotion 预览图渲染问题，让用户能快速预览 B-roll 方案。

---

## ✅ 已完成的修复

### 1. Kimi K2.5 API 兼容性
- **问题**: `temperature: 0.7` 导致 API 报错
- **修复**: Kimi K2.5 只接受 `temperature: 1`
- **文件**: `server/llm.ts`

### 2. Markdown 转义问题
- **问题**: `\\n` 写入字面量而非换行，`/\\|/g` 匹配每个字符间空位
- **修复**: 改用 `\n` 和 `/\|/g`
- **文件**: `server/director.ts`, `test-director.ts`

### 3. buildRemotionPreview() 转换层
- **问题**: inputProps.layers 为空，渲染无内容
- **修复**: 新增转换函数，将 option 转为 Remotion layers
- **文件**: `server/director.ts`

### 4. 前端传递完整 option
- **问题**: 只传 prompt/type，缺少 name/rationale
- **修复**: 传递完整 option 对象
- **文件**: `src/components/director/ChapterCard.tsx`, `src/types.ts`

### 5. Remotion renderer API 静默失败
- **问题**: `renderStill()` 返回成功但文件不存在
- **修复**: 改用 spawn 调用 `remotion still` CLI
- **文件**: `server/remotion-api-renderer.ts`

### 6. mindhikers-logo.png 404
- **问题**: staticFile() 引用不存在的资源导致渲染失败
- **修复**: 暂时移除 logo 代码
- **文件**: `RemotionStudio/src/BrollTemplates/SceneComposer.tsx`

### 7. SceneComposer layers undefined
- **问题**: layers 为必填，无 defaultProps 导致报错
- **修复**: layers 改为可选，添加 defaultProps
- **文件**: `RemotionStudio/src/BrollTemplates/SceneComposer.tsx`, `index.tsx`

### 8. getThumbnailStatus 404 处理
- **问题**: 任务不存在返回 `{ error }` 前端无法识别
- **修复**: 返回 `{ status: 'failed', error: '...' }`
- **文件**: `server/director.ts`

---

## 🔴 当前阻塞问题

### 现象
- 前端点击"生成预览"
- 状态正常变化（不报错）
- 最终显示**空白**，无图片

### 已验证正常的环节
| 环节 | 状态 | 验证方式 |
|------|------|----------|
| Remotion CLI 渲染 | ✅ | `npx remotion still` 生成 44KB PNG |
| 后端 spawn 调用 | ✅ | 测试脚本输出成功 |
| generateThumbnail API | ✅ | curl POST 返回 `{ success: true }` |
| getThumbnailStatus API | ✅ | curl GET 返回 `{ status: 'completed', imageUrl: 'data:...' }` |
| base64 数据完整性 | ✅ | 长度约 40KB，前缀正确 |

### 待排查
- **前端 pollThumbnail 函数**: 是否被调用？data.imageUrl 是否有值？
- **React state**: setPreviewUrl() 是否触发重渲染？
- **img 渲染**: src 是否被正确设置？CSS 是否隐藏？

---

## 📂 涉及文件

```
DeliveryConsole/
├── server/
│   ├── director.ts              # 多处修改
│   ├── llm.ts                   # temperature 修复
│   └── remotion-api-renderer.ts # 重写为 spawn CLI
├── src/
│   ├── components/director/
│   │   └── ChapterCard.tsx      # 传递完整 option
│   └── types.ts                 # SceneOption.name
└── test-director.ts             # 转义修复

~/.gemini/antigravity/skills/RemotionStudio/
├── src/
│   ├── index.tsx                # defaultProps
│   └── BrollTemplates/
│       └── SceneComposer.tsx    # layers 可选，移除 logo
```

---

## 📝 Commits

| Hash | Message |
|------|---------|
| `fd1de47` | fix(SD-202): 修复 Director Phase2 Markdown 落盘的转义问题 |
| `13b9bc9` | feat(SD-202): Remotion 预览图渲染永久方案 |
| `0f02675` | fix(SD-202): Remotion 预览图渲染修复 (spawn CLI) |
| `04bf75d` | fix(SD-202): 修复 thumbnail 任务不存在时的状态返回 |

---

## 🎯 下一步

1. 在 `ChapterCard.tsx` 的 `poll()` 函数添加 console.log 调试
2. 检查 `previewUrl` state 的使用位置
3. 确认 img 标签的渲染逻辑
4. 备选方案：后端直接返回图片，不依赖轮询
