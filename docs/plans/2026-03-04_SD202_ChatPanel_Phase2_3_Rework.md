# SD-202 ChatPanel 改造 & Director Phase 2/3 重构方案

> **模块编号**: SD-202  
> **版本**: v2.0  
> **日期**: 2026-03-04  
> **作者**: 老杨 (OldYang)  
> **状态**: 已确认，待执行  

---

## 概述

对 DeliveryConsole 的 ChatPanel 及 Director Phase 2/3 进行全面改造，实现 Lovart 风格的动态侧栏布局，优化条目审核交互，并新增 Phase 3 SRT → XML 生成流程。

---

## 架构总览

### 🖥️ 界面布局（Lovart 动态压缩）

| 区域             | 宽度 | 说明                                                       |
| ---------------- | ---- | ---------------------------------------------------------- |
| 主内容区         | ~75% | ChatPanel 收起时占满全宽，展开时平滑压缩                   |
| ChatPanel 右侧栏 | ~25% | 从右侧滑入（toggle 按钮位于 ExpertNav 最右侧），300ms 过渡 |

---

### 📋 Phase 2 — 视觉方案审核

每个 **ChapterCard** 采用 5 列结构（从左到右）：

```
序号 | 原文一句话（脚本） | 设计方案/提示词 | 预览图 | ✓ 确认
```

右侧整体是 **ChatPanel**，单独存在，不属于表格列。

**页面底部操作区**：
```
├── [渲染已确认条目] 按钮  →  Remotion + 火山引擎  →  落盘 04_Visuals/
└── 全部勾选后，显示 [提交 → Phase 3] 按钮
```

**重新渲染时自动删除旧视频文件**（避免磁盘积累）。

---

### 💬 ChatPanel 侧栏

```
├── 对话历史
├── 针对任意条目：修改 Prompt / 提示词
├── 触发重新生成 Remotion 预览（旧文件自动删除）
└── 触发重新请求火山引擎预览（旧文件自动删除）
```

---

### 🎬 Phase 3 — SRT 比照 + XML 生成（终态，不再有 Phase 4）

```
上传 SRT 字幕文件
    ↓
LLM 比照：B-Roll Key Sentence ↔ SRT 时间码
    ↓
对齐结果预览表（可手动微调）
    ↓
生成 Premiere FCPXML  ＋  剪映 XML（暂无达芬奇等）
    ↓
一键下载 XML → 结束
```

---

## 涉及文件清单

### 前端

| #   | 文件                                      | 操作          | 说明                                                   |
| --- | ----------------------------------------- | ------------- | ------------------------------------------------------ |
| 1   | `src/App.tsx`                             | MODIFY        | 移除 FAB 气泡，改为 flex 双栏布局 + ExpertNav toggle   |
| 2   | `src/components/RightPanel.tsx`           | MODIFY/DELETE | 弃用 fixed overlay，合并进 App.tsx                     |
| 3   | `src/components/ChatToggleButton.tsx`     | DELETE        | toggle 内联到 ExpertNav                                |
| 4   | `src/components/ChatPanel.tsx`            | MODIFY        | 适配新侧栏，增加对条目的 LLM 修改能力                  |
| 5   | `src/components/director/ChapterCard.tsx` | MODIFY        | 5列布局，删反馈列，checkbox 替代锁定                   |
| 6   | `src/components/director/Phase2View.tsx`  | MODIFY        | onToggleCheck，渲染按钮，Phase3 提交门控               |
| 7   | `src/components/director/Phase3View.tsx`  | REWRITE       | SRT 上传 → 比照表 → XML 生成 → 下载                    |
| 8   | `src/components/director/Phase4View.tsx`  | DELETE        | 合并进新 Phase3                                        |
| 9   | `src/components/DirectorSection.tsx`      | MODIFY        | handleToggleCheck，handleRenderChecked，phase 编号调整 |
| 10  | `src/types.ts`                            | MODIFY        | DirectorChapter 增加 isChecked                         |

### 后端

| #   | 文件                    | 操作   | 说明                                                         |
| --- | ----------------------- | ------ | ------------------------------------------------------------ |
| 11  | `server/director.ts`    | MODIFY | 章节名清理，渲染输出至 04_Visuals，旧文件删除，新 Phase3 API |
| 12  | `server/srt-aligner.ts` | NEW    | SRT 解析、LLM 比照、FCPXML/剪映 XML 生成                     |

---

## 变更详述

### 变更一：动态压缩布局

#### [MODIFY] App.tsx

- 移除 FAB 气泡按钮（`fixed bottom-20 right-6`）
- 在 ExpertNav 最右侧新增 ChatPanel toggle 按钮
- delivery 模式外层改为 `flex` 行布局，主内容和侧栏各为 flex 子元素

```diff
- // overlay FAB 气泡
- <button className="fixed bottom-20 right-6 ..."><MessageCircle /></button>

+ // ExpertNav 右侧 toggle
+ <button onClick={toggleChat} title="对话面板">
+   <MessageSquare />
+ </button>

+ // delivery 双栏布局
+ <div className="flex-1 flex overflow-hidden">
+   <div className="flex-1 overflow-y-auto transition-all duration-300">
+     {/* 主内容 */}
+   </div>
+   <div className={`transition-all duration-300 flex-shrink-0 border-l border-slate-700/50 ${
+     chatOpen ? 'w-[25vw] min-w-[320px]' : 'w-0 overflow-hidden'
+   }`}>
+     <ChatPanel ... />
+   </div>
+ </div>
```

#### [DELETE] ChatToggleButton.tsx

不再需要独立的 FAB 组件。

---

### 变更二：删除『反馈意见』列

#### [MODIFY] ChapterCard.tsx

**列布局从 12 列调整**：

| 列              | 当前       | 新             |
| --------------- | ---------- | -------------- |
| 序号            | col-span-1 | col-span-1     |
| 原文一句话      | col-span-3 | col-span-3     |
| 设计方案/提示词 | col-span-2 | **col-span-3** |
| 预览图          | col-span-3 | **col-span-4** |
| 反馈意见        | col-span-2 | **删除**       |
| 确认            | col-span-1 | col-span-1     |

删除 `<textarea>` 反馈区块和表头的「反馈意见」标签。反馈渠道迁移至 ChatPanel 侧栏。

---

### 变更三：最右列改为 Checkbox Toggle

#### [MODIFY] ChapterCard.tsx

将不可逆「锁定」按钮替换为可反复切换的 ✓ checkbox：

```tsx
<button
  onClick={() => onToggleCheck(chapter.chapterId)}
  className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all
    ${chapter.isChecked
      ? 'bg-green-600 border-green-500 text-white'
      : 'border-slate-500 hover:border-slate-300'
    }`}
>
  {chapter.isChecked && <Check className="w-4 h-4" />}
</button>
```

#### [MODIFY] types.ts

```diff
  interface DirectorChapter {
    ...
    isLocked: boolean;  // 保留向后兼容
+   isChecked: boolean; // 新增：用户初审确认，可随时切换
  }
```

#### [MODIFY] Phase2View.tsx / DirectorSection.tsx

- 新增 `onToggleCheck` 回调
- `allLocked` → `allChecked = chapters.every(c => c.isChecked)`

---

### 变更四：去掉章节名「第XX章」前缀

#### [MODIFY] director.ts (server)

`parseMarkdownChapters` 标题解析后清理：
```typescript
title = title.replace(/^第[一二三四五六七八九十\d]+章[：:\s]*/u, '').trim();
```

#### [MODIFY] ChapterCard.tsx

移除前端的 `prefixMatch` 兜底清理代码。

---

### 变更五：渲染已确认条目 + 旧文件自动删除

#### [MODIFY] Phase2View.tsx

在 ChapterCard 列表下方增加：

```tsx
{checkedCount > 0 && (
  <button onClick={onRenderChecked}>
    <Sparkles /> 渲染已确认条目 ({checkedCount})
  </button>
)}
```

#### [MODIFY] director.ts (server)

渲染逻辑中：
1. 渲染前检测并删除 `04_Visuals/{chapterId}_*.mp4` 旧文件
2. 新文件统一写入 `{projectRoot}/04_Visuals/`

---

### 变更六：全部勾选后显示 Phase 3 入口

#### [MODIFY] Phase2View.tsx

```tsx
{allChecked && (
  <button onClick={onProceed}>
    <Play /> 提交 → Phase 3
  </button>
)}
```

---

### 变更七：Phase 3 — SRT 比照 + XML 生成（终态）

> Phase 4 合并进 Phase 3，Phase 3 即最终阶段，产出 XML 下载即结束。

#### [REWRITE] Phase3View.tsx

新界面：
1. **SRT 上传区**（拖拽 / 文件选择）
2. **比照预览表**：`| B-Roll 条目 | Key Sentence | 匹配 SRT 文本 | 开始时间 | 结束时间 |`
3. **[生成 XML]** 按钮
4. **[下载 Premiere XML]** + **[下载剪映 XML]** 两个下载按钮

#### [DELETE] Phase4View.tsx

功能已合入新 Phase3。

#### [NEW] server/srt-aligner.ts

```typescript
parseSRT(content: string): SRTSegment[]
alignBRollToSRT(chapters, srtSegments): AlignResult[]
generateFCPXML(aligned): string     // Premiere
generateJianyingXML(aligned): string // 剪映
```

#### [MODIFY] director.ts (server)

新增 3 个 API：
- `POST /api/director/phase3/align-srt` — 上传 SRT，返回比照结果
- `POST /api/director/phase3/generate-xml` — 生成两份 XML 并落盘
- `GET /api/director/phase3/download-xml/:projectId/:format` — 下载（`format=premiere|jianying`）

---

## 天条约束

1. **渲染文件管理**：重新渲染时必须先删除旧视频文件再写入新文件，杜绝磁盘浪费
2. **Phase 编号**：Phase 1/2/3 三阶段，Phase 3 为终态输出阶段
3. **列结构**：序号 → 原文 → 方案 → 预览 → ✓（仅 5 列，无反馈列）
4. **章节名**：从源头（服务端解析）去除「第XX章」前缀
5. **XML 格式**：仅 Premiere FCPXML + 剪映，暂不支持达芬奇等

---

## 执行顺序

严格按以下顺序执行：

1. types.ts — 基础类型变更
2. ChapterCard.tsx — 5 列布局 + checkbox
3. Phase2View.tsx — onToggleCheck + 渲染按钮 + 提交门控
4. DirectorSection.tsx — handleToggleCheck, handleRenderChecked
5. App.tsx — 动态压缩布局
6. ChatPanel.tsx — 侧栏适配
7. director.ts (server) — 章节名清理，渲染目录，旧文件删除
8. Phase3View.tsx — 全新 SRT→XML 流程
9. srt-aligner.ts (NEW) — SRT 解析 + XML 生成
10. 删除 ChatToggleButton.tsx 和 Phase4View.tsx

---

## Verification Plan

### 编译验证

```bash
cd /Users/luzhoua/DeliveryConsole && npm run build
npm run test:run
```

### 浏览器验证

1. ChatPanel toggle 位于 ExpertNav 最右侧，点击后主内容平滑压缩至 ~75%
2. Phase 2 条目 5 列正确展示，无反馈列，checkbox 可反复切换
3. 章节名无「第XX章」前缀
4. 渲染已确认条目 → 落盘 `04_Visuals/`，重渲染时旧文件被删除
5. 全部勾选 → 出现「提交 Phase 3」
6. Phase 3：上传 SRT → 比照表 → 生成 XML → 分别下载 Premiere 和剪映格式
