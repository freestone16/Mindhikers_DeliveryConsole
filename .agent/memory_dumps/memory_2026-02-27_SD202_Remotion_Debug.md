# Memory Dump: DeliveryConsole (SD-202 Remotion 预览图调试)

**Date**: 2026-02-27
**Session Focus**: Remotion 单帧预览图渲染问题深度排查

---

## 🧠 核心问题：Remotion 预览图"空白"之谜

### 现象描述
- 前端点击"生成预览"后，状态显示正常（不报错）
- 但最终显示空白，无图片
- 浏览器控制台无异常

### 已确认正常的环节
1. **Remotion CLI 渲染** ✅
   - `npx remotion still` 可正常生成 PNG
   - 测试文件 `/tmp/test_final2.png` 44KB，1920x1080

2. **后端 API 流程** ✅
   - `POST /api/director/phase2/thumbnail` 返回 `{ success: true, taskId, taskKey, status: 'processing' }`
   - 后台 spawn 进程成功完成渲染
   - `thumbnailTasks.set()` 正确存储 base64 图片

3. **状态轮询 API** ✅
   - `GET /api/director/phase2/thumbnail/:taskKey` 返回 `{ status: 'completed', imageUrl: 'data:image/png;base64,...' }`
   - 已测试：`curl` 可获取完整 base64 数据

### 可能的问题点（待排查）

#### A. 前端轮询逻辑
```typescript
// src/components/director/ChapterCard.tsx:102-124
const pollThumbnail = async (key: string) => {
  const poll = async () => {
    const res = await fetch(`http://localhost:3002/api/director/phase2/thumbnail/${key}`);
    const data = await res.json();
    if (data.status === 'completed' && data.imageUrl) {
      setPreviewUrl(data.imageUrl);  // ← 这里设置了吗？
      setThumbStatus('completed');
    }
    // ...
  };
  poll();
};
```

**疑点**：
- `poll()` 是否真的被调用了？
- `data.imageUrl` 是否真的有值？
- `setPreviewUrl()` 是否触发了重新渲染？

#### B. 图片显示组件
```typescript
// 需要检查 previewUrl 如何被渲染
{previewUrl && <img src={previewUrl} />}
```

**疑点**：
- `previewUrl` state 是否被正确使用？
- img 标签的 src 是否被正确设置？
- CSS 是否隐藏了图片？

#### C. taskKey 匹配问题
```typescript
// 前端构建
const taskKey = `${chapter.chapterId}-${option.id}`;  // e.g. "ch1-ch1-opt1"

// 后端构建
const taskKey = `${chapterId}-${option.id}`;  // e.g. "ch1-opt1"
```

**疑点**：如果 option.id 已经包含 chapterId，可能导致重复？

---

## 🔧 本次会话修复清单

| 修复项 | 文件 | 状态 |
|--------|------|------|
| Kimi K2.5 temperature=1 | `server/llm.ts` | ✅ |
| Markdown 转义问题 | `server/director.ts`, `test-director.ts` | ✅ |
| buildRemotionPreview() 转换层 | `server/director.ts` | ✅ |
| 前端传递完整 option 对象 | `src/components/director/ChapterCard.tsx` | ✅ |
| SceneOption.name 字段 | `src/types.ts` | ✅ |
| Remotion 改用 CLI spawn | `server/remotion-api-renderer.ts` | ✅ |
| 移除 logo 避免 404 | `RemotionStudio/.../SceneComposer.tsx` | ✅ |
| layers 改为可选 + defaultProps | `RemotionStudio/.../SceneComposer.tsx`, `index.tsx` | ✅ |
| getThumbnailStatus 返回格式 | `server/director.ts` | ✅ |

---

## 📂 关键文件路径

```
DeliveryConsole/
├── server/
│   ├── director.ts          # generateThumbnail, getThumbnailStatus
│   ├── llm.ts               # callKimiLLM (temperature 修复)
│   └── remotion-api-renderer.ts  # renderStillWithApi (spawn CLI)
├── src/
│   ├── components/director/
│   │   └── ChapterCard.tsx  # handleGenerateThumbnail, pollThumbnail
│   └── types.ts             # SceneOption 接口
└── test-director.ts         # 独立测试脚本

~/.gemini/antigravity/skills/RemotionStudio/
├── src/
│   ├── index.tsx            # Composition 注册
│   └── BrollTemplates/
│       └── SceneComposer.tsx  # 主渲染组件
└── package.json
```

---

## 🎯 下一步排查方向

### 1. 前端调试（优先）
```javascript
// 在 ChapterCard.tsx 的 poll() 函数中添加 console.log
console.log('[poll] taskKey:', key);
console.log('[poll] response:', data);
console.log('[poll] imageUrl length:', data.imageUrl?.length);
```

### 2. 检查 img 渲染
搜索 `previewUrl` 在组件中的使用位置，确认：
- 是否有 `<img src={previewUrl} />`
- 是否有条件渲染阻止了显示
- CSS 是否有 `display: none` 或 `visibility: hidden`

### 3. 网络请求检查
浏览器 DevTools → Network → 筛选 `thumbnail`：
- POST 请求是否成功？
- 轮询 GET 请求是否发出？
- 返回的 imageUrl 是否完整？

### 4. 备选方案：直接返回图片
修改后端，生成完成后直接返回 base64，不依赖轮询：
```typescript
// generateThumbnail 中等待渲染完成
await renderStillWithApi(...);
const base64 = fs.readFileSync(outputPath).toString('base64');
return res.json({ success: true, imageUrl: `data:image/png;base64,${base64}` });
```

---

## 📊 数据状态

**selection_state.json** (已恢复高质量数据):
- 7 章节
- 18 个精心设计的 B-roll 方案
- 0 个兜底数据

**Markdown 文件**:
- `04_Visuals/phase2_分段视觉执行方案_CSET-seedance2.md` ✅

---

## 💡 经验教训

1. **Remotion renderer API 静默失败** — 改用 CLI spawn 更可靠
2. **staticFile() 资源必须存在** — 否则整个渲染失败
3. **前端轮询需要处理所有状态** — 包括 404 情况
4. **base64 图片很大** — 单张约 40-60KB，确保传输完整

---

## 🔗 相关 Commit

- `fd1de47` - Markdown 转义修复
- `13b9bc9` - Remotion 预览图永久方案
- `0f02675` - Remotion CLI spawn 修复
- `04bf75d` - thumbnail 状态返回格式修复
