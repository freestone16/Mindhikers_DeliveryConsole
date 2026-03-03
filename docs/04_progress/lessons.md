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
- [x] 类型导入必须使用 import type → 见下方 L-005

### 服务器启动 / 依赖管理
- [x] node_modules 平台不匹配导致启动失败 → 见下方 L-004

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

### [前端开发] L-005 - 类型导入必须使用 import type

**日期**：2026-03-03

**问题**：
- 页面白屏，浏览器控制台报错：`The requested module '/src/components/RightPanel.tsx' does not provide an export named 'RightPanelMode'`
- App.tsx 第 19 行：`import { RightPanel, RightPanelMode } from './components/RightPanel';`

**根本原因**：
- `RightPanelMode` 在 `RightPanel.tsx` 中是使用 `export type` 导出的类型
- 但 App.tsx 使用了普通导入语句 `import { RightPanelMode }`，而不是 `import type { RightPanelMode }`
- Vite 处理模块导入时，类型导出需要使用 `import type` 语法

**修复**：
```typescript
// App.tsx
import { RightPanel } from './components/RightPanel';
import type { RightPanelMode } from './components/RightPanel';
```

**教训 / 规则**：
1. **TypeScript 类型导入必须使用 `import type`**：
   - 如果是从一个文件中导入 `type`（如 `export type RightPanelMode`），必须使用 `import type`
   - 不要混合类型导入和值导入：分开写 `import { Component }` 和 `import type { Type }`
2. **遇到模块导出错误时检查导出方式**：
   - 看导出的是 `export type`、`export interface` 还是普通 `export`
   - 如果是类型导出，必须使用 `import type`
3. **TypeScript 编译器不会捕获这种运行时错误**：
   - `tsc --noEmit` 会通过，但浏览器运行时会报错
   - 需要查看浏览器控制台的实际错误信息
4. **Vite 的模块处理机制**：
   - Vite 会移除 `import type` 导出（仅用于类型检查）
   - 普通导入会被打包到运行时代码中
   - 类型导入错误只在运行时暴露

**相关文件**：
- `/Users/luzhoua/DeliveryConsole/src/App.tsx:19` - 类型导入修复
- `/Users/luzhoua/DeliveryConsole/src/components/RightPanel.tsx:4` - 类型导出

---

### [服务器启动] L-004 - node_modules 平台不匹配导致启动失败

**日期**：2026-03-03

**问题**：
- 运行 `npm run dev` 时服务器无法启动
- 错误 1：`Cannot find module '@rollup/rollup-darwin-arm64'`
- 错误 2：`You installed esbuild for another platform than the one you're currently using`
- 多个残留的 `tsx watch` 和 `vite` 进程占用端口

**根本原因**：
1. **node_modules 平台不匹配**：
   - node_modules 是在错误的平台/架构上安装的（可能是 x86_64，而当前是 ARM64 Mac）
   - 导致原生二进制包（rollup, esbuild）无法找到正确的版本
2. **进程累积**：
   - 多次启动 `npm run dev` 但没有正确清理
   - concurrently 启动的子进程没有被正确终止
   - 发现 6+ 个残留的 `tsx watch` 进程

**诊断步骤**（系统性调试）：
1. **Phase 1: 根因调查**
   - 运行 `npm run dev` → 发现平台不匹配错误
   - 检查 `lsof -i :3002 -i :5173` → 发现端口被占用
   - 检查 `ps aux | grep tsx` → 发现多个残留进程

2. **Phase 2: 模式分析**
   - 查看错误信息中的关键词：`@rollup/rollup-darwin-arm64`, `esbuild for another platform`
   - 结论：node_modules 是在其他架构上安装的

3. **Phase 3: 假设验证**
   - 假设：删除 node_modules 重新安装可以修复
   - 测试：`rm -rf node_modules && npm install` → 成功

**教训 / 规则**：
1. **服务器启动失败时，系统性诊断流程**：
   - ✅ 先检查错误日志（`npm run dev 2>&1`）
   - ✅ 检查端口占用（`lsof -i :3002 -i :5173`）
   - ✅ 检查进程状态（`ps aux | grep -E "tsx|vite|node.*server"`）
   - ✅ 检查平台特定的错误关键词（`darwin-arm64`, `platform`, `MODULE_NOT_FOUND`）

2. **原生依赖包问题 → 重新安装**：
   - 看到 `Cannot find module '@xxx/darwin-arm64'` → 立即删除 node_modules 重新安装
   - 看到 `esbuild for another platform` → 同上
   - **不要尝试其他修复**（如手动安装单个包），重新安装是正确方案

3. **进程清理优先**：
   - 启动前先检查是否有残留进程
   - 清理命令：`pkill -f "tsx watch" && pkill -f "vite.*host"`
   - 顽固进程：`kill -9 [PID]`

4. **预防措施**：
   - 使用 Ctrl+C 而不是直接关闭终端来停止 concurrently 进程
   - 定期检查残留进程（特别是开发过程中频繁重启时）

**修复命令**：
```bash
# 1. 清理残留进程
pkill -f "tsx watch server/index.ts"
pkill -f "vite.*host"
kill -9 [顽固进程PID]  # 如果 pkill 无效

# 2. 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 3. 启动服务器
npm run dev
```

**相关文件**：
- `/Users/luzhoua/DeliveryConsole/package.json` - 依赖配置
- `/Users/luzhoua/DeliveryConsole/node_modules/` - 依赖目录（已重新安装）

**验证结果**（2026-03-03）：
- ✅ 前端：http://localhost:5173 正常响应
- ✅ 后端：http://localhost:3002/api/version 返回 `{"version":"v3.7.1"}`
- ✅ Skill Sync 完成（5/5）
- ✅ Socket.IO 客户端连接正常

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

## 2026-03-03 (白屏 + Phase 2 卡死问题)

### 问题 1: App.tsx 白屏 - JS 语法错误
**症状**：页面纯白屏
**原因**：App.tsx 第 227 行使用了 `MessageCircle` 图标但未导入
```tsx
import { Loader2, Users, Send, Clock } from 'lucide-react';  // ← 缺少 MessageCircle
```
**修复**：添加 `MessageCircle` 到导入列表

**教训**：
- 检查导入完整性：确保所有使用的组件/图标都已正确导入
- 组件重命名时注意同步更新所有引用

---

### 问题 2: App.final.tsx 右侧面板类型导入错误
**症状**：编译时提示 `RightPanelMode` 类型未导出
```tsx
import { RightPanel, RightPanelMode } from './components/RightPanel';
// 错误：RightPanelMode 是 type，需要用 import type
```
**修复**：使用 `import type { RightPanelMode } from './components/RightPanel';`

**教训**：
- type 导入使用 `import type` 语法
- 检查类型定义的导出方式（type vs interface vs export type）

---

### 问题 3: 项目切换时业务逻辑不完整，导致卡死在旧状态
**症状**：切换项目后，前端卡死无法操作，提示 "LLM 生成失败"

**根本原因**：
1. 前端 `handleSelectProject` 只设置 `projectId` 和 `lastUpdated`，并发送 socket 事件
2. 后端 `select-project` 事件只读取并发送 `delivery_store.json`
3. **关键缺陷**：`delivery_store.json` 包含了旧项目的 Director Phase 2 审阅状态（`phase2_review_state.json`）
4. 切换项目时，旧项目的临时状态文件没有被清除
5. 前端读取 `delivery_store.json`，接收到旧项目的状态数据
6. 系统认为 Phase 2 还在进行中，导致卡死

**修复**：在 `server/index.ts` 的 `select-project` 事件处理中添加清除旧项目临时状态的逻辑：
```typescript
// 清除旧项目的临时状态文件（防止卡在旧状态）
const oldProjectId = socketToProjectMap.get(socket);
if (oldProjectId && oldProjectId !== projectId) {
    const oldProjectRoot = getProjectRoot(oldProjectId);
    const oldPhase2ReviewPath = path.join(oldProjectRoot, '04_Visuals', 'phase2_review_state.json');
    if (fs.existsSync(oldPhase2ReviewPath)) {
        fs.unlinkSync(oldPhase2ReviewPath);
        console.log(\`[select-project] Cleared old phase2_review_state.json for \${oldProjectId}\`);
    }
}
```

**教训**：
- 临时状态文件必须在切换项目时完全清除
- 不要依赖 `delivery_store.json` 的默认值覆盖
- 项目切换是完整的原子操作：离开旧房间 → 清理旧状态 → 加入新房间 → 设置新监听器

---

### 问题 4: Phase 2 LLM 生成持续失败 (fetch failed)
**症状**：Phase 2 启动后，提示 "LLM 生成失败，重试 2 次后使用兜底方案"，13 分钟后无响应

**根本原因**：
1. SiliconFlow API 调用返回 `fetch failed` 错误
2. 错误处理不完善，没有详细错误信息
3. 缺少超时设置，请求无限等待

**修复**：
1. 添加 30 秒超时设置，防止无限等待
2. 添加 AbortController 用于取消请求
3. 增强错误日志，记录 HTTP status 和错误详情
4. 检查环境变量配置是否正确

**代码位置**：`server/llm.ts` 的 `callSiliconFlowLLM` 函数

**教训**：
- LLM API 调用必须有超时机制
- 错误信息要详细（HTTP status + response text）
- 添加调试日志便于排查问题

---

### 问题 5: SiliconFlow 模型名称配置错误
**症状**：配置文件中模型名称为 `Pro/moonshotai/Kimi-K2.5`，但默认值不同

**修复**：
1. 检查 API 支持的模型列表（`/v1/models`）
2. 使用正确的模型名称
3. 确保 `llm.ts` 中的调用与配置一致

**教训**：
- API 配置变更前测试模型名称是否有效
- 使用官方文档推荐的默认模型

---

### 问题 6: Edit 工具多次失败，代码更新未生效
**原因**：直接编辑文件时，由于缩进或特殊字符导致匹配失败

**修复**：
1. 使用 Bash 命本进行精确替换
2. 验证修改是否成功
3. 必要时验证文件内容

**教训**：
- 复杂修改使用脚本确保准确性
- 验证文件是否正确更新

---
