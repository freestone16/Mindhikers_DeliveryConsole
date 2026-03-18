---
date: 2026-03-18
module: SD210 GoldenCrucible
status: ✅ 已完成
commits: f1e0ccb, aa93b1b
---

# 2026-03-18 | GoldenCrucible | 10项修复 + Socrates完整加载

## [核心变动]

### 根本性修复：Socrates Skill 内容被截断

**问题**：`server/skill-loader.ts` 中 `extractCoreContent(raw, 4000)` 将 Socrates SKILL.md（17,737字节）截断至 4000 字符（约22%），导致以下规则对 LLM 不可见：
- 15轮最小对话规则
- 强制搜索（每个子议题2轮后主动联网）
- Devil's Advocate（每3轮强制反驳）
- Phase 2 准入自检（15轮 + 3次搜索 + 2次DA + 2个跨学科连接）

**根因链**：
```
skill-sync ✅ 文件完整(17K) → skill-loader ❌ 截断至4K → crucible.ts 拿到残缺摘要 → LLM 不知道规则
```

**修复**：`maxChars: 4000 → 24000`（~6000 tokens，完全在现代LLM窗口内）

**文件**：`server/skill-loader.ts:40`

---

### UI修复清单（commit: aa93b1b）

| # | 问题 | 修复 | 文件 |
|---|---|---|---|
| 1 | 输入后提交白屏 | 补上遗漏的 `Upload` icon import | `ChatPanel.tsx:2` |
| 2 | 提交后无法连续发送 | crucible模式移除 `isStreaming` 发送阻断 | `ChatPanel.tsx:502-503` |
| 3 | Header"圆圈聊+对话"浪费空间 | crucible模式隐藏，badges移至顶行左侧与DSL同行 | `ChatPanel.tsx:745-770` |
| 4 | 右下角草稿按钮点了无反应 | 删除 save/restore draft 按钮 | `ChatPanel.tsx` |
| 5 | 结晶内容点击无反应 | activePresentable 合并查 crystallizedQuotes（Bug修复）| `CrucibleWorkspaceView.tsx:264` |
| 6 | DSL按钮无反馈 | 添加2秒toast气泡（已下载/已保存/已载入）| `ChatPanel.tsx` |
| 7 | 重置按钮分散两处 | 垃圾桶→统一"重置"按钮，同时清空workspace+chat | `ChatPanel.tsx`, `App.tsx`, `CrucibleWorkspaceView.tsx` |
| 8 | 输入区元素未居中 | `items-end → items-center`，移除`mb-1` | `ChatPanel.tsx:978-979` |
| 9 | badges与DSL不在同行 | crucible模式badges内联进header顶行 | `ChatPanel.tsx:747-768` |
| 10 | "结晶金句"命名不准 | 改为"结晶内容" | `CrucibleWorkspaceView.tsx` |

---

## [技术决策]

- **Socrates业务逻辑不在后端硬编码**：deriveRuntimePhase 等逻辑保持不变，业务规则完全由 LLM 从完整 SKILL.md 自行判断，符合"苏格拉底自己把控节奏"的设计原则
- **草稿功能移除**：D/S/L已承担保存功能，底部草稿按钮冗余，一并清理 Upload/Download icon
- **重置统一化**：onResetAll prop 从 App.tsx 向下传递，ChatPanel 的重置按钮同时触发 handleCrucibleReset（workspace状态清空 + chat历史清空）

---

## [存疑/待办]

- 结晶内容的展现形式待定（用户尚未决策，目前仅修复了点击显示的Bug）
- 左侧结晶侧栏不只展示quote，理论上所有crystallization阶段的重要内容都应入库，但写入逻辑尚未调整
- Socrates完整加载后需观察LLM是否正确执行15轮规则、强制搜索等
