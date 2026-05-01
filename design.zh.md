---
name: Director Design System
version: 0.2.0
date: 2026-05-01
status: target
format: google-stitch-inspired-design-md
purpose: "Director 与 Delivery Console 兄弟模块可复用的 UI 与交互事实源。"
principle: "不要把 Director 完全 Claude Code 化；保留影视生产工作台的温度，同时吸收 Claude Code 的克制、状态透明、命令优先和审计感。"
tokens:
  color:
    bg: "#f4efe5"
    bgSoft: "#f8f4ec"
    panel: "rgba(255, 252, 247, 0.78)"
    panelSolid: "#fffcf7"
    border: "#e4dbcc"
    borderStrong: "#d8c8ae"
    text: "#342d24"
    ink: "#2c2823"
    muted: "#8f8372"
    accent: "#c97545"
    accentDeep: "#b26135"
    successSurface: "#dce9d8"
    successText: "#62835c"
    captureBlue: "#5b8a9b"
    materialGreen: "#5b7c6f"
    infographicOchre: "#a68b4b"
    generativePurple: "#9b6b9e"
  typography:
    body: '"Instrument Sans", "Avenir Next", "Segoe UI", sans-serif'
    display: '"Iowan Old Style", "Palatino Linotype", "Times New Roman", serif'
    mono: '"JetBrains Mono", "SFMono-Regular", monospace'
    normalLetterSpacing: "0"
    labelLetterSpacing: "0.06em-0.12em"
  spacing:
    base: 4
    scale: [4, 8, 12, 16, 24, 34]
  radius:
    control: 6
    card: 8
    majorPanel: 12
  layout:
    topbarHeight: 44
    railWidth: 260
    railCollapsedWidth: 60
    drawerWidth: 360
    drawerCollapsedWidth: 44
    compactRailWidth: 220
    compactDrawerWidth: 320
  motion:
    fast: "180ms ease"
    normal: "280ms ease"
  components:
    shell: "topbar + left rail + center workbench + right drawer + bottom status"
    drawerTabs: ["chat", "runtime", "artifacts", "handoff"]
    directorPhases: ["P1 concept", "P2 storyboard", "P3 render review", "P4 delivery handoff"]
---

# 设计系统 - Director

## 为什么需要这份文件

这份文件是 Director 的视觉与交互事实源。任何 agent 在修改 Director UI，或把 Director 的设计语言借给其他 Delivery Console 模块之前，都应该先读它。

Director 不是营销网站。它是一个影视生产工作台：紧凑、温暖、精确，并且适合反复执行创意生产流程。目标不只是“好看”，而是让界面成为人和 agent 共享的操作面。

## 与 Google DESIGN.md 的关系

本文件遵循 Google Stitch / Google Labs 带火的公开 `DESIGN.md` 约定：用一份 Markdown 设计系统文件，给 AI 编码和设计 agent 一个明确的颜色、字体、间距、组件、布局和产品气质事实源。

Director 当前保留小写文件名 `design.md`，因为这是本模块约定。如果后续工具强依赖大写 `DESIGN.md`，再创建别名或生成副本，不要分叉内容。

## 设计哲学

### 核心判断

不要把 Director 完全 Claude-Code-ify。如果 Director 过度变成冷峻、终端化、通用工具化的界面，它会失去影视创作工作台的温度。

但 Director 应该吸收 Claude Code 的四个长处：

1. **克制：** 减少装饰层，层级更清楚，视觉噪音更少。
2. **状态透明：** 所有生成中、等待确认、失败、已批准、已过期、被阻塞的状态都应该可见且可理解。
3. **命令优先：** 重要动作要像明确命令，而不是散落在界面各处的偶然按钮。
4. **审计感：** 重要动作应该在运行态、对话、产物或交接上下文里留下痕迹。

这样设计就不只是“好看的 UI 风格说明”，而会变成其他模块真正可复用的产品设计准绳。

### 美学方向

- **方向：** 温暖的影视生产操作台。
- **气质：** 冷静、有触感、带编辑感、专注工作。
- **密度：** 紧凑到中等。优先使用高密度但可呼吸的生产表格，而不是超大展示卡片。
- **装饰：** 极简且有意图。使用纸张暖色、精确边框、轻微透明度和图标。
- **核心隐喻：** 一本生产工作簿，包含侧栏、阶段、审阅表格、命令面和侧边上下文。

## 产品语境

- **这是什么：** Director 把剧本转成视觉概念、分镜方案、预览渲染、审阅决策和交付交接。
- **给谁使用：** 人类操作者和 AI agent 共同处理生产工作流。
- **主要行为：** 扫描、比较、决策、生成、审阅、修正、批准、交接。
- **复用目标：** 当兄弟模块也需要生产级、agent-native 的工作台气质时，可以借用这套系统。

## 字体

| 角色 | 字体 | 当前用途 | 使用建议 |
|---|---|---|---|
| 正文 / UI | `"Instrument Sans", "Avenir Next", "Segoe UI", sans-serif` | 主外壳、标签、控件、抽屉、表格 | 所有操作型 UI 的默认字体。保持紧凑、清晰、易读。 |
| 展示 / 分区 | `"Iowan Old Style", "Palatino Linotype", "Times New Roman", serif` | 品牌、工作站占位文字、阶段标题 | 少量用于身份感和编辑温度。不要用于高密度表格。 |
| 等宽 / 数据 | `"JetBrains Mono", "SFMono-Regular", monospace` | 路径、ID、日志、技术值 | 用于机器可读值、路径、行 ID 和追踪输出。 |

### 字体层级

| 层级 | 尺寸 | 字重 | 用途 |
|---|---:|---:|---|
| 品牌 / 标题 | `0.95rem-1rem` | `700` | 顶部品牌、Director 阶段标题 |
| 面板标题 | `0.875rem-1rem` | `700` | 阶段面板头、卡片标题 |
| 正文 | `0.875rem` | `400-500` | 常规文本、说明 |
| 紧凑表格 / 正文 | `0.75rem-0.8rem` | `400-600` | 方案行、阶段状态、侧栏条目 |
| 微标签 | `10px-11px` | `600-700` | Badge、元数据、行辅助文字 |
| 数字强调 | `1.125rem-1.5rem` | `700` | 数量和进度摘要 |

### 字体规则

- 普通字距保持 `0`。
- 只有大写分区标签、元数据和 drawer tabs 使用 `0.06em-0.12em`。
- 长篇创意文本使用舒展行高（`1.5-1.65`）和暖墨色，不使用纯黑。
- 衬线字体是身份点缀，不是主界面声音。
- 高密度审阅行优先使用无衬线字体，避免戏剧化字体。

## 颜色

### 核心 Tokens

| Token | Hex / 值 | 角色 |
|---|---|---|
| `--shell-bg` | `#f4efe5` | 主要暖纸张背景 |
| `--shell-bg-soft` | `#f8f4ec` | 中央工作台背景 |
| `--shell-panel` | `rgba(255, 252, 247, 0.78)` | 半透明面板表面 |
| `--shell-panel-solid` | `#fffcf7` | 实色面板表面 |
| `--shell-border` | `#e4dbcc` | 默认分割线和卡片边框 |
| `--shell-border-strong` | `#d8c8ae` | 激活态 / 强边框 |
| `--shell-text` | `#342d24` | 主要暖墨文字 |
| `--shell-ink` | `#2c2823` | 强标题墨色 |
| `--shell-muted` | `#8f8372` | 次级文字和未激活控件 |
| `--shell-accent` | `#c97545` | Director 动作、选中态、暖焦点 |
| `--shell-accent-deep` | `#b26135` | Hover / pressed accent |
| `--shell-success` | `#dce9d8` | 成功态表面 |
| `--shell-success-text` | `#62835c` | 成功文字和确认勾选 |

### 辅助语义色

| 角色 | Hex | 用途 |
|---|---|---|
| 上传 / 用户采集蓝 | `#5b8a9b` | 用户采集 / 来源类型 |
| 素材 / 已批准绿 | `#5b7c6f`, `#62835c` | 已上传 / 已批准 / 已完成状态 |
| 信息图赭色 | `#a68b4b` | 静态信息图类型 |
| 生成式紫色 | `#9b6b9e` | AI 视频 / 生成式类型 |
| 错误红 | Tailwind red family | 预览失败 / 上传失败状态 |

### 颜色规则

- 界面整体保持暖中性色。Accent 是标点，不是墙纸。
- `#c97545` 用于主动作、当前阶段、选中态和暖焦点。
- 绿色只用于已确认、已批准、已上传或已完成状态。
- 类型色作为柔和 tint badge 使用，约 15% 透明度。
- 保持对比度：主文字接近 `#342d24`，次级文字接近 `#8f8372`。
- 除非其他模块明确记录原因，否则避免冷蓝 / 石板灰企业后台主题。

## 布局

### Shell 结构

Director 使用持久生产 shell：

| 区域 | 默认尺寸 | 用途 |
|---|---:|---|
| Topbar | 高 `44px` | 项目 / 剧本上下文和产品身份 |
| 左侧 rail | `260px`，折叠 `60px` | 工作站导航和会话 / 剧本列表 |
| 中央 workbench | `minmax(0, 1fr)` | 主要阶段工作 |
| 右侧 drawer | `360px`，折叠 `44px` | 对话、运行态、产物、交接 |
| 底部状态栏 | 中央底部 | 在线 / 生成状态 |

### 响应式行为

- 在 <= `1440px` 时，rail 收窄到 `220px`，drawer 收窄到 `320px`。
- 在 <= `980px` 时，变成单列流式布局，rail 和 drawer 与中央内容上下堆叠。
- 折叠后的 rail 保持图标优先，并支持 title / tooltip。
- 固定格式审阅表使用稳定 grid tracks 和 `min-width: 0`。
- 主阶段内容在 `.director-workbench__content` 内滚动，不让整个 shell 滚乱。

### 中央工作台规则

- 中央区域应是工作流表面：面板、行、表格、队列、预览和审阅控件。
- 避免 hero 区块和营销式功能卡片。
- 阶段头保持紧凑：左侧标题 / 状态，右侧阶段命令控件。
- 用户应该始终知道自己在哪、选中了什么、什么在等待，以及下一条合法命令是什么。

## 组件

### 顶栏

- 高度：`44px`。
- 使用带 blur 的暖色半透明背景。
- 品牌区使用展示衬线字体、紧凑图标标识和明确左侧边界。
- 面包屑 / 元信息使用 muted 正文字体。

### 工作站 Rail

- 使用图标 + 标签行，圆角 8px。
- 当前工作站：强边框、近白面板背景、主文字色。
- Hover：轻微纸张上浮（`translateY(-1px)`）和边框显现。
- 分区标签使用大写、muted 色和字距。

### 上下文 Drawer

- 必备 tabs：chat、runtime、artifacts、handoff。
- Tabs 是紧凑的大写标签。
- 当前 tab 使用 accent 文字和底部边框。
- Chat tab 自己控制 padding；非 chat tab 使用 `12px`。
- Chat 应尽量保持挂载，避免本地 blob 和对话状态在切换 tab 时丢失。
- Runtime 应展示当前模型、生成状态、最近日志、工具 / 动作追踪、错误状态和可用的 sync 状态。
- Handoff 应解释当前可继续状态，而不是只列文件。

### 阶段面板

- 表面：`rgba(255, 252, 247, 0.78)`。
- 边框：`#e4dbcc`。
- 圆角：当前主要阶段面板可用 `12px`；新的共享组件优先用 `8px`。
- Header：暖米色背景，`px-5 py-3`，底部边框。
- Body：`p-5`。
- Footer：`px-5 py-3`，顶部边框。

### 空状态和加载状态

- 空状态居中、克制、可操作。
- 使用一个图标、一个标题、一行短说明和可选动作。
- 加载状态使用小型 accent spinner 和明确进度文案。
- 异步任务仍在 pending 时，不要暗示已成功。

### 审阅行

- 高密度比较使用 12 列 grid。
- 当前 Phase 2 行分配：
  - `1` 列：行 ID
  - `2` 列：原文摘录
  - `4` 列：设计 / prompt
  - `4` 列：预览
  - `1` 列：确认
- 预览区域保持 `aspect-video`。
- 高密度审阅文本使用 `text-xs`，元数据使用 `10px`。
- 选中行：accent 边框 + 极淡 accent 背景。
- 已确认行 / 控件：绿色勾选处理。

### 按钮与命令

- 主按钮：accent 背景 `#c97545`，白字，hover `#b26135`。
- 次按钮：暖纸张背景，边框 `#e4dbcc`，墨色文字。
- 危险 / 错误：红色只用于真实失败或破坏性动作。
- 优先使用 lucide icons。
- 重要工作流动作应写成命令：生成、修订、批准、重试、渲染、导出、交接。
- 会改变状态的命令必须有明确的 disabled、loading、success、failure、retry 状态。
- 危险命令必须要求显式确认，并且应该在 runtime / audit 上下文中可见。

### Badges

- 使用约 15% 透明度的柔和 tint 背景。
- Badge 用于表达来源 / 类型 / 状态，不要压过主要内容。
- 面向共享模块复用时，优先使用 lucide icon + 文本或纯文本，少用 emoji。
- 类型颜色：
  - Remotion / internet clip：暖 accent
  - Generative / Seedance：柔和紫
  - Artlist / approved / uploaded：绿
  - User capture：蓝
  - Infographic：赭色

### 输入框

- 背景：`#faf6ef` 或面板表面。
- 边框：`#e4dbcc`。
- Focus 边框：accent。
- Placeholder：muted 米色（`#c9baa3` 或 `#8f8372`）。
- Textarea 应紧凑但舒适。
- 避免在高密度审阅表面放过大的输入框。

### 媒体预览

- 使用稳定的 `aspect-video` 容器。
- 占位背景：暖纸张色。
- Zoom overlay：hover 时使用轻微黑色遮罩。
- 全屏 / lightbox：黑色 overlay，媒体居中，右上角关闭图标。
- 预览失败必须显示明确失败状态和重试命令。

## 交互原则

### 状态透明

每个异步或 agent 驱动动作都应该暴露状态：

- Idle
- Ready
- Generating / processing
- Waiting for confirmation
- Completed
- Approved
- Failed
- Stale / needs regeneration
- Blocked by missing input

状态应该在相关行或面板中可见；当动作对工作流重要时，也应汇总到 runtime drawer。

### 命令优先

- 每个阶段应该只有少数清楚的主命令。
- 避免把等价动作散落在许多装饰性控件里。
- 命令应该使用动词，并映射到真实后端或 agent 动作。
- 如果命令改变了持久状态，UI 应显示改变了什么。

### 审计感

重要的人类 / agent 动作应该留下痕迹：

- 生成概念
- 导入离线分镜 JSON
- 修订方案
- 选择或确认方案
- 生成预览
- 上传素材
- 开始渲染
- 批准输出
- 导出 / 交接包

痕迹可以出现在 chat、runtime、artifacts、handoff，或未来的 action timeline 中。关键是工作流不应像不可追踪的魔法。

### Agent-Native 对等

人能做的动作，agent 也应该能表达：

- UI 控件应映射到清晰命令名。
- 状态变化应可见。
- Agent 应能解释它做了什么、哪里失败、什么可以重试。

## 动效

- **方向：** 极简、功能性。
- **快速过渡：** `180ms ease`，用于 hover、颜色、边框和小幅 transform。
- **普通过渡：** `280ms ease`，用于 shell 列宽变化。
- rail / session 行使用小幅 hover lift（`translateY(-1px)`）。
- Spinner 只表示真实异步工作。
- 避免不传达状态的装饰性动效。

## 深度与表面

- 深度来自边框、透明度和轻微色阶，不靠重阴影。
- 默认阴影应非常轻：`0 8px 24px rgba(88, 67, 42, 0.04)`。
- 主要层级：
  - 页面背景：暖纸张渐变
  - Rails / drawers：半透明米色 chrome
  - 中央 workbench：柔和纸张
  - Panels：半透明近白
  - Active controls：边框和 accent

## 应该做

- 先构建真实工作流界面，不做落地页。
- 保持足够高的操作密度，适合重复使用。
- 一致使用暖纸张中性色和墨色。
- 让选中、批准、生成、过期、阻塞和失败状态清楚区分。
- 跨模块保持 rails、drawers 和状态栏稳定。
- 工作站导航、折叠控件、上传、预览、批准、刷新、重试、渲染、导出和关闭等动作使用图标。
- 保留 chat、runtime status、artifacts、handoff 作为一等侧边 tabs。
- 对重要状态变更动作增加审计痕迹。

## 不应该做

- 不要用超大 hero 卡片替换工作台 shell。
- 不要使用装饰性渐变光斑、抽象圆球或 bokeh 背景。
- 不要把每个表面都做成橙色；accent 用于动作和焦点。
- 不要卡片套卡片，除非内部是重复行或 modal。
- 不要让动态文本把审阅行撑得不可预测；使用稳定 grid、clamp 和滚动。
- 如果工作流依赖生成、同步或交接，不要隐藏 runtime / agent 状态。
- 不要把 Director 做成通用终端 UI。保留影视生产温度。

## 其他模块采用指南

当另一个 Delivery Console 模块借用 Director 设计语言时：

1. 保留共享 shell：topbar、左侧 rail、中央 workbench、右侧 drawer、底部状态栏。
2. 除非模块有强理由，否则保留暖色 token set。
3. 根据模块自身任务调整中央工作流：
   - Marketing：campaign / keyword / release pipeline 表格。
   - Shorts：script / b-roll / subtitle / render queue。
   - Music：cue sheet / mood reference / export decisions。
   - Thumbnail：concept variants / scoring / preview comparison。
4. 保留 drawer 模型：chat、runtime、artifacts、handoff。
5. 模块专属分类色只作为 badge 或小面积 accent 使用。
6. 任何有意偏离都应写入该模块自己的设计说明。

## 实施优先级

### P0 - 文档目标

- `design.md` 是设计目标事实源。
- `design.zh.md` 是中文协作镜像。
- 后续计划和 PRD 在 UI 工作前应引用这些文档。

### P1 - 低风险 UI 对齐

- 如果装饰性背景干扰工作内容，降低背景强度。
- 新可复用组件优先使用 8px 圆角。
- 面向共享模块复用时，把 emoji-like badge 替换成 lucide icon + 文本。
- 统一命令标签和 loading / failed / retry 状态。

### P2 - 状态与运行态升级

- 把 runtime drawer 扩展成真正的动作 / 状态面。
- 展示当前模型、skill sync、生成状态、最近工具 / 动作追踪、错误和重试入口。
- 让 handoff panel 反映当前可继续状态。

### P3 - 命令与审计层

- 为 generate、revise、approve、retry、render、export、handoff 增加统一命令词汇。
- 重要状态变更必须留下可追踪记录。
- 对齐 chat / agent 动作与可见 UI 状态。

## Agent Prompt 指南

当要求 agent 构建或调整 Delivery Console UI 时，可以包含：

> 使用 `design.md` 作为视觉与交互事实源。构建一个温暖的影视生产操作台：紧凑 rail、纸张质感面板、精确边框、少量衬线标题点缀、Instrument Sans 风格 UI 字体、陶土色主按钮、绿色批准态、高密度审阅网格，以及持久的右侧上下文 drawer。不要完全 Claude-Code-ify；保留创意生产温度，同时吸收克制、状态透明、命令优先和审计感。避免落地页式构图、装饰性光斑、隐藏运行态和一次性调色板。

## 来源文件

当前 Director 实现参考：

- `src/styles/delivery-shell.css`
- `src/components/delivery-shell/DeliveryShellLayout.tsx`
- `src/components/delivery-shell/WorkstationRail.tsx`
- `src/components/delivery-shell/ContextDrawer.tsx`
- `src/components/delivery-shell/drawer/RuntimePanel.tsx`
- `src/components/delivery-shell/drawer/HandoffPanel.tsx`
- `src/components/director/DirectorWorkbenchShell.tsx`
- `src/components/director/DirectorStageHeader.tsx`
- `src/components/director/phase-layouts/PhasePanel.tsx`
- `src/components/director/ChapterCard.tsx`
- `src/components/director/Phase1View.tsx`
- `src/components/director/Phase2View.tsx`
- `src/components/director/Phase3View.tsx`

## 参考

- Google Labs / Stitch 风格 `DESIGN.md` 约定：面向 AI 辅助 UI 生成的 Markdown 设计系统事实源。
- 当前实现 tokens：`src/styles/delivery-shell.css`。
- 当前 shell 实现：`src/components/delivery-shell/DeliveryShellLayout.tsx`。

## 决策记录

| 日期 | 决策 | 理由 |
|---|---|---|
| 2026-05-01 | 从当前 Director UI 创建根目录 `design.md` | 让其他 Delivery Console 模块复用 Director 稳定视觉语言。 |
| 2026-05-01 | 保留小写文件名 | 用户明确要求 `design.md`；内容仍兼容公开 `DESIGN.md` 约定。 |
| 2026-05-01 | 升级为带机器可读 front matter 的目标设计事实源 | 让 agent 和后续模块工作更容易消费。 |
| 2026-05-01 | 增加 Claude Code 校准原则 | 保留 Director 创作温度，同时吸收克制、状态透明、命令优先和审计感。 |
| 2026-05-01 | 新增中文镜像版 `design.zh.md` | 方便中文协作、模块借鉴和治理沉淀，同时不覆盖英文版。 |
