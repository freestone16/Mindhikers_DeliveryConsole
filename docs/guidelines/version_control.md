# MindHikers 研发版本管理规范 (Version Control Guidelines)

为了让功能项的开发、提交和推送过程一目了然，建议采纳以下行业主流标准：

## 1. 核心工作流：分支管理 (Branching Strategy)

不要直接在 `main` 分支上开发。采用 **Feature Branching** 模式：

- **`main`**: 生产分支，始终保持可运行状态。
- **`feat/xxx`**: 功能分支（例如 `feat/sd209-upload`）。每个独立功能项都在自己的分支上开发。
- **`fix/xxx`**: 修复分支。

**优点**：你可以在 Git Graph 中清晰地看到每个功能项的生命周期（从拉出分支到合并回 main）。

---

## 2. 提交规范：约定式提交 (Conventional Commits)

使用固定格式的提交信息，方便自动化工具识别和生成日志：

格式：`<type>(scope): <subject>`

- **`feat`**: 新功能 (feature)
- **`fix`**: 修补 bug
- **`docs`**: 文档改变
- **`refactor`**: 代码重构
- **`chore`**: 构建过程或辅助工具的变动

**示例**：
`feat(director): 实现 Phase 2 的全量状态解耦`
`fix(upload): 修复分片上传在 mac 环境下的路径问题`

---

## 3. 推荐工具 (Tools)

### A. 可视化神器 (一目了然的关键)
1. **VS Code 插件: Git Graph** (强烈推荐 👍)
   - 在编辑器内直接查看彩色的 Git 树状图。
   - 每个分支的演进、合并点清清楚楚。
2. **GitKraken** (专业 GUI)
   - 极其精美的图形界面，支持拖拽合并。
   - 适合处理极其复杂的并行分支。
3. **LazyGit** (终端神器)
   - 针对键盘流开发的 TUI 工具，效率极高。

### B. 追溯工具
- **VS Code 插件: GitLens**
   - 能够实时显示每一行代码是谁在什么时候提交的（Git Blame）。
   - 极大增强了代码的可维护性。

---

## 4. 老杨的研发纪律 (MindHikers 特色)

作为你的“研发大管家”，我会通过以下方式辅助你：
1. **项目看板 (`.agent/PROJECT_STATUS.md`)**：这是功能项的“顶层地图”，我会实时更新每个 SD 任务的状态。
2. **开发日志 (`docs/dev_logs/`)**：记录重大的重构和调试过程。
3. **进度保存流程**：通过 `DevProgressManager` 自动生成 Memory Dump，确保即使 Git 没推完，逻辑上下文也不会丢。

---

## 建议下一步行动

1. **安装插件**：在 VS Code 市场搜索并安装 `Git Graph` 和 `GitLens`。
2. **尝试分支**：下一个任务开始时，对我说：“老杨，我们去 `feat/xxx` 分支开发”。
