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
- [x] llm.ts 文件被错误覆盖 → 见下方 L-006
- [x] 恢复错误版本时不应修改已工作的代码 → 见下方 L-007
- [x] 选择文件后未重置 phase 导致跳转到旧状态 → 见下方 L-008
- [x] .env 中文注释和路径解析问题 → 见下方 L-009

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

### [LLM 模块] L-006 - llm.ts 文件被错误覆盖，导致 Phase 2 总是显示兜底方案

**日期**：2026-03-03

**问题**：
- Phase 2 启动后，总是显示"兜底方案（LLM 生成失败）"
- SiliconFlow API 验证成功，但 Phase 2 仍然无法正常生成
- 前端显示：所有 B-roll 方案的 `rationale` 都是"兜底方案（LLM 生成失败）"

**根本原因**：
1. `llm.ts` 文件被错误覆盖，从 510 行缩减到 50 行
2. 缺少 Phase 2 生成所需的核心函数：
   - `generateGlobalBRollPlan` - 全局 B-roll 规划生成
   - `generateFallbackOptions` - 兜底方案生成
   - `generateBRollOptions` - 单章节 B-roll 方案生成
   - `BRollOption` 类型定义
3. `director.ts` 导入这些函数时报错，导致每次调用都使用兜底方案
4. **关键问题**：覆盖文件时使用了 `Write` 工具而不是 `Edit`，导致整个文件内容丢失

**诊断过程**：
```bash
# Phase 1: 根因调查
wc -l server/llm.ts          # 只有 50 行
wc -l server/llm_backup.ts  # 510 行（完整文件）

# Phase 2: 模式分析
grep -n "generateGlobalBRollPlan" server/llm.ts      # 未找到
grep -n "generateGlobalBRollPlan" server/llm_backup.ts  # 找到（在 237 行）

# Phase 3: 结论验证
# director.ts 从 './llm' 导入，但 llm.ts 缺少必要的函数
# 导致运行时调用失败，只能使用兜底方案
```

**修复**：
1. 从 `llm_backup.ts` 恢复完整的 `llm.ts` 文件
2. 在恢复的 `callSiliconFlowLLM` 函数中保留新添加的超时逻辑：
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => {
     controller.abort();
     console.error(`[llm.ts] SiliconFlow API timeout after 30s`);
   }, 30000); // 30 秒超时
   ```
3. 重启服务器，确保新代码加载

**教训 / 规则**：
1. **永远不要对大文件使用 Write 工具进行部分修复**：
   - `Write` 工具会覆盖整个文件
   - 对于部分修复，必须使用 `Edit` 工具
   - 如果文件超过 50 行，考虑使用 `Edit` 或 `Edit` with `replace_all`

2. **修复前的验证清单**：
   - ✅ 检查文件完整内容（`Read` 工具读取全部）
   - ✅ 确认要修改的位置和上下文
   - ✅ 使用 `old_string` 包含足够多的上下文（至少 5-10 行）
   - ✅ 验证 `old_string` 在文件中唯一存在

3. **核心文件备份机制**：
   - 修改前创建备份：`cp file.ts file.ts.backup`
   - 发现文件被错误覆盖时，立即从备份恢复
   - 定期清理过期的备份文件

4. **错误检测机制**：
   - 文件被覆盖后，检查行数是否突然减少
   - 检查关键函数是否仍然存在（用 `grep`）
   - 如果发现异常，立即停止并恢复

5. **Phase 2 生成失败的诊断流程**：
   - 检查 `llm.ts` 是否包含 `generateGlobalBRollPlan`
   - 检查 `director.ts` 是否能正确导入函数
   - 查看 `rationale` 字段是否为"兜底方案"
   - 如果都是兜底，检查 `llm.ts` 是否被损坏

**相关文件**：
- `/Users/luzhoua/DeliveryConsole/server/llm.ts` - 已恢复完整内容
- `/Users/luzhoua/DeliveryConsole/server/llm_backup.ts` - 备份文件
- `/Users/luzhoua/DeliveryConsole/server/director.ts:4` - 导入语句

**验证结果**（2026-03-03）：
- ✅ `llm.ts` 恢复为 510 行
- ✅ 所有必要的函数都存在
- ✅ SiliconFlow 超时逻辑保留
- ✅ 代码已提交到 main 分支

---

### [状态管理] L-008 - 选择文件后未重置 phase，导致跳转到旧状态

**日期**：2026-03-03

**问题**：
- 选择文件后，直接跳转到之前失败的 LLM 页面（Phase 2）
- 没有从 Phase 1 重新开始，而是停留在旧的 phase 状态
- 显示"兜底方案（LLM 生成失败）"的内容

**根本原因**：
1. `/api/scripts/select` 端点只重置了 `conceptProposal` 和 `isConceptApproved`
2. **关键缺陷**：没有重置 `phase`、`items`、`renderJobs` 等数据
3. 如果用户之前在 Phase 2 失败，`delivery_store.json` 中的 `phase` 还是 2
4. 选择新文件后，phase 保持为 2，导致自动跳到 Phase 2 页面

**诊断过程**：
```bash
# Phase 1: 检查选择文件的 API 逻辑
grep -A 20 "app.post('/api/scripts/select'" server/index.ts

# Phase 2: 发现只有重置 conceptProposal
# deliveryData.modules.director.conceptProposal = "";
# deliveryData.modules.director.isConceptApproved = false;

# Phase 3: 确认没有重置 phase
# deliveryData.modules.director.phase = 1;  // ← 缺失！
# deliveryData.modules.director.items = [];  // ← 缺失！
# deliveryData.modules.director.renderJobs = [];  // ← 缺失！
```

**修复**：
在 `/api/scripts/select` 端点中，选择文件时完整重置所有模块状态：
```typescript
if (deliveryData.modules?.director) {
    // 重置 Director 到 Phase 1，清空所有缓存数据
    deliveryData.modules.director.phase = 1;
    deliveryData.modules.director.conceptProposal = "";
    deliveryData.modules.director.conceptFeedback = "";
    deliveryData.modules.director.isConceptApproved = false;
    deliveryData.modules.director.items = [];
    deliveryData.modules.director.renderJobs = [];
}
if (deliveryData.modules?.music) {
    // 重置 Music 到 Phase 1，清空所有缓存数据
    deliveryData.modules.music.phase = 1;
    deliveryData.modules.music.moodProposal = "";
    deliveryData.modules.music.conceptFeedback = "";
    deliveryData.modules.music.isConceptApproved = false;
    deliveryData.modules.music.items = [];
}
```

**教训 / 规则**：
1. **选择新文件 = 重置所有状态**：
   - 选择新文件应该视为"重新开始"操作
   - 所有专家模块的状态都应该重置到初始值
   - Phase 必须重置到 1（或其他初始值）
   - 所有缓存数据（items、renderJobs 等）必须清空

2. **各专家模块状态独立性**：
   - Director、Music、Shorts 等模块应该有独立的状态
   - 选择文件时，可以重置所有模块，或只重置相关模块
   - 不同模块之间不应该互相干扰

3. **状态重置的完整清单**：
   - `phase` → 重置到初始值（通常是 1）
   - `conceptProposal` / `moodProposal` → 清空
   - `conceptFeedback` → 清空
   - `isConceptApproved` → false
   - `items` / `renderJobs` / `variants` → 清空数组
   - `uploadHistory` / 其他列表 → 清空

4. **用户体验原则**：
   - 用户选择新文件时，期待的是"从零开始"
   - 不应该看到之前的任何数据
   - 界面应该显示"开始"状态，而不是中间状态

5. **防止状态残留**：
   - 检查 `delivery_store.json` 是否包含旧数据
   - 选择文件时，验证所有关键字段是否正确重置
   - 如果发现问题，立即修复逻辑

**相关文件**：
- `server/index.ts:1018-1040` - `/api/scripts/select` 端点

**验证结果**（2026-03-03）：
- ✅ 选择文件后 Director phase 重置到 1
- ✅ items、renderJobs 等数据清空
- ✅ 从 Phase 1 重新开始

---

### [环境配置] L-009 - .env 中文注释和路径解析问题导致环境变量未加载

**日期**：2026-03-04

**问题**：
- Phase 2 显示"兜底方案（LLM 生成失败）"
- SiliconFlow API Key 验证成功，但服务器调用失败
- 服务器日志显示：`[llm.ts] Generation failed, retrying (1/2). Reason: fetch failed`
- 11 分钟生成时间后显示兜底方案

**根本原因**：
1. **路径解析错误**：
   - `server/index.ts` 第 32 行：`path.resolve(__dirname, '../../.env')`
   - `__dirname` = `/Users/luzhoua/DeliveryConsole/server`
   - `path.resolve` 解析为：`/Users/luzhoua/.env` ❌
   - 正确路径应该是：`/Users/luzhoua/DeliveryConsole/.env` ✅

2. **中文注释导致解析失败**：
   - `.env` 第一行：`# 当前服务的内容项目名（对应 Projects/ 下的文件夹名）`
   - 第二行：`# 服务端口`
   - 中文注释导致 `dotenv.config()` 解析失败
   - 整个 `.env` 文件解析为空数组，所有变量都未加载

**诊断过程**：
```bash
# Phase 1: 检查 dotenv 解析结果
node -e "
const dotenv = require('dotenv');
const result = dotenv.config({ path: require('path').resolve(__dirname, '../.env') });
console.log('All keys:', Object.keys(result.parsed || {}));
"
# 输出：All keys: []  ← 空数组，解析失败！

# Phase 2: 使用绝对路径测试
node -e "
const dotenv = require('dotenv');
const result = dotenv.config({ path: '/Users/luzhoua/DeliveryConsole/.env' });
console.log('All keys:', Object.keys(result.parsed || {}));
console.log('SILICONFLOW_API_KEY length:', result.parsed?.SILICONFLOW_API_KEY?.length || 0);
"
# 输出：
# All keys: [ 'PROJECT_NAME', 'PORT', 'PROJECTS_BASE', 'SILICONFLOW_API_KEY', ... ]
# SILICONFLOW_API_KEY length: 51  ← 正确！

# Phase 3: 检查路径解析
node -e "
const path = require('path');
console.log('Original:', path.resolve(__dirname, '../../.env'));
console.log('Fixed:', path.resolve(__dirname, '../.env'));
"
# 输出：
# Original: /Users/luzhoua/.env  ❌
# Fixed: /Users/luzhoua/DeliveryConsole/.env  ✅

# Phase 4: 移除中文注释后测试
sed -i '' '1d' .env  # 移除第一行中文注释
# 再次测试 dotenv 解析 → 成功
```

**修复**：
1. 修改 `server/index.ts` 第 32 行：
   ```typescript
   // 修改前：
   dotenv.config({ path: path.resolve(__dirname, '../../.env') });

   // 修改后：
   dotenv.config({ path: path.resolve(__dirname, '../.env') });
   ```

2. 移除 `.env` 文件中的中文注释：
   ```bash
   # 创建新的 .env 文件，不包含中文注释
   cat > .env << 'EOF'
   # Project Name
   PROJECT_NAME=CSET-SP3

   # Server Port
   PORT=3002
   ...
   EOF
   ```

**教训 / 规则**：
1. **`.env` 文件编码和内容规则**：
   - ✅ 只使用英文注释
   - ✅ 避免使用特殊字符（中文、emoji 等）
   - ✅ 使用 `#` 开头的英文注释
   - ❌ 不要使用中文、特殊 Unicode 字符

2. **路径解析的最佳实践**：
   - 使用 `path.join()` 而不是 `path.resolve()` 处理 `..` 相对路径
   - `path.join(__dirname, '../.env')` → 正确的相对路径连接
   - `path.resolve(__dirname, '../../.env')` → 可能解析到意外的绝对路径

3. **环境变量加载验证**：
   - 服务器启动后，验证关键变量是否正确加载
   - 在日志中输出关键变量的长度（API Key 长度 > 0）
   - 如果变量未加载，立即排查 dotenv 解析问题

4. **`dotenv.config()` 故障排查**：
   - 检查文件路径是否存在：`fs.existsSync(envPath)`
   - 测试 dotenv 解析：`const result = dotenv.config({ path }); console.log(result.parsed)`
   - 检查文件编码：`file .env` → 应该是 `ASCII text` 或 `UTF-8 text`
   - 移除问题行（中文注释、特殊字符）

5. **防止环境变量问题**：
   - `.gitignore` 应该包含 `.env`
   - 提供一个 `.env.example` 模板，只包含英文注释
   - 在 README 中明确说明不要在 `.env` 中使用中文注释

**相关文件**：
- `server/index.ts:32` - dotenv.config() 路径修复
- `.env` - 移除中文注释（本地文件，不提交）

**验证结果**（2026-03-04）：
- ✅ `path.resolve(__dirname, '../.env')` 正确解析
- ✅ `dotenv.config()` 正确加载所有变量
- ✅ `SILICONFLOW_API_KEY` 长度为 51（正确）
- ✅ 服务器成功重启

---

### [版本恢复] L-007 - 恢复到已知正常工作的版本时，不要添加新修改

**日期**：2026-03-03

**问题**：
- 从 `llm_backup.ts` 恢复 `llm.ts` 后，添加了超时逻辑
- 结果 Phase 2 仍然显示兜底方案
- 服务器日志显示：`[Phase1] Error: TypeError: (0 , import_llm.callLLM) is not a function`

**根本原因**：
1. 在 `llm_backup.ts` 中添加超时逻辑时，修改了文件结构
2. 新的超时代码与 TypeScript 编译系统不兼容
3. `tsx watch` 检测到变化后重新编译，但编译失败
4. 模块加载时 `callLLM` 函数未正确导出

**修复**：
- 使用 `git checkout c9237d6 -- server/llm.ts` 恢复到已知正常工作的版本
- 不添加任何新修改，只恢复原始代码

**教训 / 规则**：
1. **恢复版本的策略**：
   - 使用 `git checkout <commit> -- <file>` 恢复文件
   - 不要在恢复后立即添加新修改
   - 先验证恢复的版本是否正常工作

2. **版本回滚的步骤**：
   - Phase 1: 使用 git 恢复文件
   - Phase 2: 重启服务器
   - Phase 3: 验证功能是否正常
   - Phase 4: 如果正常，再考虑添加新功能
   - Phase 5: 每次添加新功能后重启验证

3. **避免"修复过度"**：
   - 恢复版本时，不要同时修复其他问题
   - 一次只做一个改变（恢复 + 验证）
   - 确认恢复成功后，再进行下一步

4. **版本标记机制**：
   - 在 dev_progress.md 中记录已知正常工作的 commit hash
   - 例如：`Phase 2 正常工作的版本: c9237d6`
   - 恢复时参考这些标记

5. **诊断失败的原因**：
   - 检查服务器日志的编译错误
   - 检查 `tsx watch` 是否重新加载成功
   - 检查模块是否正确导出函数

**相关文件**：
- `server/llm.ts` - 恢复到 c9237d6 版本
- `server/llm_backup.ts` - 之前修改失败的版本

**验证结果**（2026-03-03）：
- ✅ `llm.ts` 恢复为 503 行
- ✅ 服务器正常启动
- ✅ Phase 1 正常生成
- ✅ Phase 2 应该能正常调用 LLM

---

### [服务器启动] L-004 - node_modules 平台不匹配导致启动失败

**日期**：2026-03-03

**问题**：
- Phase 2 启动后，总是显示"兜底方案（LLM 生成失败）"
- SiliconFlow API 验证成功，但 Phase 2 仍然无法正常生成
- 前端显示：所有 B-roll 方案的 `rationale` 都是"兜底方案（LLM 生成失败）"

**根本原因**：
1. `llm.ts` 文件被错误覆盖，从 510 行缩减到 50 行
2. 缺少 Phase 2 生成所需的核心函数：
   - `generateGlobalBRollPlan` - 全局 B-roll 规划生成
   - `generateFallbackOptions` - 兜底方案生成
   - `generateBRollOptions` - 单章节 B-roll 方案生成
   - `BRollOption` 类型定义
3. `director.ts` 导入这些函数时报错，导致每次调用都使用兜底方案
4. **关键问题**：覆盖文件时使用了 `Write` 工具而不是 `Edit`，导致整个文件内容丢失

**诊断过程**：
```bash
# Phase 1: 根因调查
wc -l server/llm.ts          # 只有 50 行
wc -l server/llm_backup.ts  # 510 行（完整文件）

# Phase 2: 模式分析
grep -n "generateGlobalBRollPlan" server/llm.ts      # 未找到
grep -n "generateGlobalBRollPlan" server/llm_backup.ts  # 找到（在 237 行）

# Phase 3: 结论验证
# director.ts 从 './llm' 导入，但 llm.ts 缺少必要的函数
# 导致运行时调用失败，只能使用兜底方案
```

**修复**：
1. 从 `llm_backup.ts` 恢复完整的 `llm.ts` 文件
2. 在恢复的 `callSiliconFlowLLM` 函数中保留新添加的超时逻辑：
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => {
     controller.abort();
     console.error(`[llm.ts] SiliconFlow API timeout after 30s`);
   }, 30000); // 30 秒超时
   ```
3. 重启服务器，确保新代码加载

**教训 / 规则**：
1. **永远不要对大文件使用 Write 工具进行部分修复**：
   - `Write` 工具会覆盖整个文件
   - 对于部分修复，必须使用 `Edit` 工具
   - 如果文件超过 50 行，考虑使用 `Edit` 或 `Edit` with `replace_all`

2. **修复前的验证清单**：
   - ✅ 检查文件完整内容（`Read` 工具读取全部）
   - ✅ 确认要修改的位置和上下文
   - ✅ 使用 `old_string` 包含足够多的上下文（至少 5-10 行）
   - ✅ 验证 `old_string` 在文件中唯一存在

3. **核心文件备份机制**：
   - 修改前创建备份：`cp file.ts file.ts.backup`
   - 发现文件被错误覆盖时，立即从备份恢复
   - 定期清理过期的备份文件

4. **错误检测机制**：
   - 文件被覆盖后，检查行数是否突然减少
   - 检查关键函数是否仍然存在（用 `grep`）
   - 如果发现异常，立即停止并恢复

5. **Phase 2 生成失败的诊断流程**：
   - 检查 `llm.ts` 是否包含 `generateGlobalBRollPlan`
   - 检查 `director.ts` 是否能正确导入函数
   - 查看 `rationale` 字段是否为"兜底方案"
   - 如果都是兜底，检查 `llm.ts` 是否被损坏

**相关文件**：
- `/Users/luzhoua/DeliveryConsole/server/llm.ts` - 已恢复完整内容
- `/Users/luzhoua/DeliveryConsole/server/llm_backup.ts` - 备份文件
- `/Users/luzhoua/DeliveryConsole/server/director.ts:4` - 导入语句

**验证结果**（2026-03-03）：
- ✅ `llm.ts` 恢复为 510 行
- ✅ 所有必要的函数都存在
- ✅ SiliconFlow 超时逻辑保留
- ✅ 代码已提交到 main 分支

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
