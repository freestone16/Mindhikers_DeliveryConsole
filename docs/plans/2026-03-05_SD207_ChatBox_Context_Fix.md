# Bug #1：ChatBox 无法理解「1-3」 — 修复方案

## 问题根本原因

用户在 ChatBox 输入「1-3」时，期望 LLM 知道这是「第1章·第3个B-Roll条目」。但实际上：

| 层次                   | 问题                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **骨架索引格式**       | `getContextSkeleton` 输出 `{id: "ch1", title: "一句话...", opts: [{id: "opt_xxx", ...}]}`，不含「章节序号」和「选项序号」 |
| **内容截断**           | `name` 截10字符，`prompt` 截10字符，`img_prompt` 截20字符 → LLM 无法确认内容                                              |
| **System Prompt 定位** | `loadExpertContext` 只读 `04_Visuals/*.md` 文件，没有对当前数据状态做语义化汇总                                           |
| **用户口语未映射**     | 「1-3」隐含的语义是「chapterIndex=1 的章节，其 options 数组中下标为2的选项」，但 LLM 收到的骨架中无法推断这个映射         |

## 修复策略

**核心思路**：在 `getContextSkeleton` 中，除了保留内部 ID，还要输出「人类可读序号」，即 `chapterIndex` + `optionIndex`，并在骨架 prompt 中明确说明映射规则。

---

## Proposed Changes

### Expert Actions — Director Adapter

#### [MODIFY] [director.ts](file:///Users/luzhoua/DeliveryConsole/server/expert-actions/director.ts)

修改 `getContextSkeleton` 方法：
- 在每个 chapter 骨架中加入 `seq`（= `chapterIndex`）字段
- 在每个 option 骨架中加入 `seq`（= 1-based 数组下标）字段
- 适当放宽 `name` 和 `img_prompt` 的截断长度（20→50字符）
- 在骨架 JSON 前加一段注释性说明文字，告知 LLM「用户提到'1-3'表示第1章第3个选项」

```diff
- const skeleton = chapters.map((ch: any) => ({
-     id: ch.chapterId,
-     title: ch.chapterName,
-     opts: ch.options.map((o: any) => ({
-         id: o.id,
-         type: o.type,
-         name: o.name?.substring(0, 10),
-         prompt: o.prompt?.substring(0, 10),
-         img_prompt: o.imagePrompt?.substring(0, 20)
-     }))
- }));
- return JSON.stringify(skeleton);

+ const skeleton = chapters.map((ch: any, ci: number) => ({
+     seq: ch.chapterIndex ?? (ci + 1),   // 显示序号，如 1, 2, 3（用于匹配「1-X」的前缀）
+     id: ch.chapterId,
+     title: ch.chapterName?.substring(0, 30),
+     opts: (ch.options || []).map((o: any, oi: number) => ({
+         seq: oi + 1,                    // 选项序号，如 1, 2, 3（用于匹配「X-3」的后缀）
+         id: o.id,
+         type: o.type,
+         name: o.name?.substring(0, 30),
+         img_prompt: o.imagePrompt?.substring(0, 50)
+     }))
+ }));
+ const prefix = '/* 用户可能用"章节序号-选项序号"引用条目，如"1-3"代表 seq=1 章节的第3个选项(seq=3) */\n';
+ return prefix + JSON.stringify(skeleton);
```

### Chat 服务 — System Prompt 增强

#### [MODIFY] [chat.ts](file:///Users/luzhoua/DeliveryConsole/server/chat.ts)

修改 `loadExpertContext` — 对 `Director` 专家，在 System Prompt 中增加一段明确的「当前工作上下文」说明，告知 LLM 如何解析用户的简短引用：

```diff
  const systemPrompt = `你是${expertName}的助手。你正在帮助用户完成视频制作任务。
+ ${expertId === 'Director' ? `
+ 
+ ## 重要：理解用户引用方式
+ 用户通常用「章节号-条目号」的方式引用 B-Roll 条目，例如：
+ - "1-3" = 第1章的第3个视觉选项
+ - "2-1" = 第2章的第1个视觉选项
+ 当用户提到某个具体条目时，请结合下方骨架索引（Function Calling 参考）中的 seq 字段来定位。
+ ` : ''}
  当前专家产出目录: ${outputDir}
  ...
```

### Server — chat-stream 骨架注入优化

#### [MODIFY] [index.ts](file:///Users/luzhoua/DeliveryConsole/server/index.ts) — `chat-stream` handler

当前骨架注入逻辑是把 skeleton 追加到**第一条用户消息**尾部（L640-644），但如果对话历史只有一条新消息（前几条没有），这个逻辑会把骨架注入到那条用户消息，而不是 System Prompt。

**修复**：改为将骨架注入 System Prompt（`messagesWithContext[0]`，即 `context.systemPrompt` 里）而不是用户消息，避免污染对话上下文：

```diff
- if (adapter) {
-     const skeleton = adapter.getContextSkeleton(projectRoot);
-     if (skeleton && skeleton !== '[]') {
-         enrichedMessages[0] = {
-             ...enrichedMessages[0],
-             content: enrichedMessages[0].content +
-                 `\n\n## 当前数据部分骨架索引...:\n${skeleton}`
-         };
-     }
- }
- ...
- const messagesWithContext = [
-     { role: 'system' as const, content: context.systemPrompt },
-     ...formatted,
- ];

+ let systemContent = context.systemPrompt;
+ if (adapter) {
+     const skeleton = adapter.getContextSkeleton(projectRoot);
+     if (skeleton && skeleton !== '[]') {
+         systemContent += `\n\n---\n## 📊 当前 B-Roll 数据骨架索引（用于理解用户引用，不可向用户透露原始 ID）\n${skeleton}`;
+     }
+ }
+ const messagesWithContext = [
+     { role: 'system' as const, content: systemContent },
+     ...formatted,
+ ];
```

---

## Verification Plan

### 手动测试
1. 启动 `npm run dev`，加载任意有 B-Roll 数据的项目
2. 打开影视导演 ChatBox
3. 输入：「1-3 的 prompt 改成日落余晖、金色光线」
4. **预期**：LLM 能正确识别第1章第3个选项，并触发 `update_prompt` function call，`chapterId` 和 `optionId` 均非 `undefined`

> [!IMPORTANT]
> 验证时请同时观察浏览器 Console 和 server 终端，确认 `chat-stream` 收到的 `enrichedMessages[0]` 的 system 内容确实包含了骨架索引（打印一行 log 即可）。

### 服务端日志验证
在 `chat-stream` handler 中临时加一行：
```typescript
console.log('[DEBUG] System prompt length:', systemContent.length, 'chars');
```
确认骨架被成功注入。
