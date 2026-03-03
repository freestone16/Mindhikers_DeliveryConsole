# Lessons Learned - 经验教训记录

> **目的**：记录用户纠正过的错误模式，防止重复犯错
> **更新机制**：每次用户纠正后立即更新
> **审查机制**：每次会话开始时审查相关 lessons

---

## 📋 Lessons 目录

### Phase 2 - B-roll 方案生成
- [x] SSE 错误消息被前端吞噬 → 见下方 L-003

### Remotion 渲染
- [ ] 待记录...

### 前端开发
- [ ] 待记录...

### 通用开发
- [x] 不要擅自修改配置路径 → 见下方 L-001

### 火山引擎集成
- [x] 文生图预览图生成失败 → 见下方 L-002

---

## ✅ 已记录 Lessons

### [通用开发] L-001 - 不要擅自修改 .env 中的路径配置

**日期**：2026-03-03

**问题**：
- 后端日志显示 `Projects Base` 指向 worktree 内的错误路径
- 我误判 `.env` 中的 `PROJECTS_BASE` 是错的，想把它改成 `DeliveryConsole/.claude/Projects`
- 用户制止了我：原来的路径（Obsidian_Antigravity/...）才是正确的生产数据目录

**根本原因**：
- .env 文件没有被复制到 worktree，导致后端 fallback 到了默认路径
- 我看到「路径不对」但没有先验证实际的目录结构，就直接修改配置

**教训 / 规则**：
1. **永远不要修改 .env 中的路径**，除非用户明确要求
2. 看到路径异常时，先查 `ls` 验证目录是否存在，再判断谁对谁错
3. worktree 环境缺少 .env 的解法是**复制 .env 到 worktree**，而不是修改路径
4. 修改配置文件前必须问自己：「我是否 100% 确认原来的值是错的？」

**相关文件**：
- `/Users/luzhoua/DeliveryConsole/.env` — PROJECTS_BASE 正确值
- `/Users/luzhoua/DeliveryConsole/server/index.ts:44` — fallback 逻辑
- `.claude/worktrees/*/focused-darwin/.env` — worktree 启动需要的 .env 副本

---

### [火山引擎集成] L-002 - 文生图预览图生成失败的两个问题

**日期**：2026-03-03

**问题**：
- 文生视频预览图生成失败，API 返回错误 `image size must be at least 3686400 pixels`
- 修复尺寸问题后，虽然任务成功但状态显示 `failed`，错误信息为 `No task_id or image returned`

**根本原因**：
1. **尺寸问题**：默认使用 `1024x1024`（104万像素），但火山引擎要求至少 368 万像素
   - 2048x2048 = 419 万像素 ✓
   - 1920x1080 = 207 万像素 ✗
2. **数据路径问题**：火山引擎 API 返回 `{ data: [ { url: "..." } ] }`，但代码检查的是 `data.data?.images?.[0]?.url`

**教训 / 规则**：
1. **火山引擎图片生成必须使用高分辨率**：
   - 最小像素数：3686400（约 4K）
   - **影视导演（Director）使用 16:9**：2560x1440 (2K, 3,686,400 像素)
   - **短视频大师（Shorts）使用 9:16**：1440x2560 (2K, 3,686,400 像素)
   - 不要使用 1024x1024 或 1920x1080（像素数不够）
   - 不要使用 1:1 正方形（2048x2048），不符合视频比例
2. **分辨率比例必须匹配视频类型**：
   - 横向视频 → 16:9
   - 竖向视频 → 9:16
3. **API 响应解析必须验证实际返回结构**：
   - 先查看完整 API 响应，再写解析逻辑
   - 不要假设数据结构，用 `console.log` 验证
4. **兼容性写法**：支持多种可能的数据路径，提高鲁棒性

**修复代码**：
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

**相关文件**：
- `/Users/luzhoua/DeliveryConsole/server/volcengine.ts:51` - 尺寸参数（2560x1440）
- `/Users/luzhoua/DeliveryConsole/server/volcengine.ts:83-91` - 响应解析逻辑

**更新说明**（2026-03-03）：
- 用户指出 1:1 正方形（2048x2048）不适合影视导演
- 修正为 16:9 横向分辨率（2560x1440）
- 补充分辨率比例匹配规则：影视导演用 16:9，短视频大师用 9:16

---

### [Phase 2] L-003 - SSE 错误消息被前端吞噬

**日期**：2026-03-03

**问题**：
- Phase 2 生成 B-roll 方案时卡在"生成中..."状态
- 后端发送了错误消息 `type: 'error'`，但前端没有处理
- 用户看到界面无响应，不知道具体失败原因
- 所有 JSON 解析错误都被静默忽略（`// Ignore parse errors`）

**根本原因**：
1. **前端 SSE 事件处理不完整**：只处理了 `taskId`、`progress`、`chapter_ready`、`done` 四种类型，缺少 `error` 类型
2. **错误信息被吞噬**：后端的 `console.error` 输出到服务器日志，但前端无法看到
3. **用户友好的错误消息缺失**：后端只发送通用的"全局生成失败，请重试"，没有根据错误类型提供更有用的提示

**教训 / 规则**：
1. **SSE 事件处理必须包含完整的类型覆盖**：
   - 每种后端发送的 `type` 都必须有对应的前端处理逻辑
   - 特别是 `error` 类型，必须抛出错误并显示给用户
2. **不要静默忽略解析错误**：
   - `// Ignore parse errors` 这种注释是危险的
   - 应该记录到 console 以便调试
   - 如果检测到错误消息，应该抛出给用户
3. **错误消息应该用户友好**：
   - 后端应该根据错误类型提供不同的提示
   - 网络错误 → "无法连接到 LLM 服务"
   - JSON 解析错误 → "LLM 返回的不是有效的 JSON 格式"
   - 验证错误 → "LLM 生成的数据格式不正确"
   - 超时错误 → "请求超时，请检查网络连接"
4. **错误信息应该分层**：
   - 用户看到：简短的、可操作的消息
   - 开发者看到：详细的错误堆栈和调试信息（details 字段）

**修复代码**：

前端（`src/components/DirectorSection.tsx:159-188`）：
```typescript
for (const line of lines) {
  if (line.startsWith('data: ')) {
    try {
      const dataStr = line.replace('data: ', '');
      const jsonData = JSON.parse(dataStr);

      if (jsonData.type === 'taskId') {
        // taskId received for polling if needed
      } else if (jsonData.type === 'progress') {
        setLoadingProgress(`${jsonData.current}/${jsonData.total}`);
      } else if (jsonData.type === 'chapter_ready') {
        allChapters.push(jsonData.chapter);
        setChapters([...allChapters]);
      } else if (jsonData.type === 'done') {
        setChapters(jsonData.chapters || allChapters);
        setLoadingProgress('completed');
      } else if (jsonData.type === 'error') {
        throw new Error(jsonData.error || 'Unknown error');
      }
    } catch (e: any) {
      // Don't ignore errors - log them for debugging
      console.error('[SSE Parse Error]', e, 'Raw data:', line);
      // If this is a real error from server, propagate it
      if (line.includes('"type":"error"')) {
        throw new Error('Server error: ' + line);
      }
    }
  }
}
```

后端（`server/director.ts:487-501`）：
```typescript
} catch (error: any) {
  console.error('[Phase 2] Global Generation failed:', error);
  const errorMsg = error?.message || error?.toString() || '未知错误';
  console.error('[Phase 2] Error details:', errorMsg);

  // 提取更有用的错误信息
  let userFacingError = '全局生成失败，请重试';
  if (errorMsg.includes('ECONNREFUSED')) {
    userFacingError = '无法连接到 LLM 服务，请检查网络或 API 配置';
  } else if (errorMsg.includes('VALIDATION_FAILED')) {
    userFacingError = 'LLM 生成的数据格式不正确，已尝试自动修复但失败';
  } else if (errorMsg.includes('JSON')) {
    userFacingError = 'LLM 返回的不是有效的 JSON 格式';
  } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
    userFacingError = '请求超时，请检查网络连接';
  }

  res.write(`data: ${JSON.stringify({
    type: 'error',
    error: userFacingError,
    details: errorMsg
  })}\n\n`);
} finally {
  res.end();
}
```

**相关文件**：
- `/Users/luzhoua/DeliveryConsole/src/components/DirectorSection.tsx:159-188` - 前端 SSE 错误处理
- `/Users/luzhoua/DeliveryConsole/server/director.ts:487-501` - 后端错误处理

---

## 📝 Lessons 模板

```markdown
### [模块/区域] - [问题简述]

**日期**：YYYY-MM-DD

**问题**：
- [具体问题描述]

**原因**：
- [根本原因分析]

**教训**：
- [避免重复的规则/模式]

**相关文件**：
- [相关文件路径和行号]
```

---

## 🔄 自动更新触发

以下情况必须更新此文件：
- 用户明确纠正了我的错误
- 修复 bug 后发现了模式化的错误原因
- 代码审查中发现系统性问题

---

## 🎯 Lessons 审查清单

每次会话开始时，检查：
- [ ] 当前任务模块的 lessons 是否有相关记录
- [ ] 是否有类似的错误模式需要避免
- [ ] 是否需要复习特定的规则或约定
