# Lessons Learned - 经验教训记录

> **目的**：记录用户纠正过的错误模式，防止重复犯错
> **更新机制**：每次用户纠正后立即更新
> **审查机制**：每次会话开始时审查相关 lessons

---

## 📋 Lessons 目录

### Phase 2 - B-roll 方案生成
- [ ] 待记录...

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
