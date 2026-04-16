---
title: "UI Architecture · 北极星简报（North Star Brief）"
type: north-star-brief
status: draft
date: 2026-04-15
owner: OldYang
consumer: frontend-design (Anthropic official plugin @ claude-plugins-official)
related:
  - 2026-04-15_UI_Architecture_PRD_Skeleton.md
  - /Users/luzhoua/MHSDC/GoldenCrucible-Roundtable/docs/plans/2026-04-13_roundtable-to-sse-migration-plan.md
---

# UI Architecture · 北极星简报

> **这份简报是 frontend-design 的输入契约。**
> 它定义「终局长什么样」，让 frontend-design 产出 4 屏高保真 demo，作为工程轨（CE 团队）撰写架构 PRD 时的终局锚点。

---

## 一、产品定义

一个以**可插拔频道精神**（mindhikers 为首发）为灵魂、以**可插拔人格**（七哲人 + 现实人格 + 未来萃取引擎）为角色、以**可插拔专家技能**为能力的**思考协同工具**。

**四段式工作流**：

```
GoldenRador     →  Roundtable     →  GoldenCrucible  →  Writer           →  Delivery Console
 雷达选题          圆桌讨论           坩埚炼制            文案改写             已有系统
 mindhikers        Persona 多方       Skill 协同          Channel 调性        视频/长文
 精神筛选          互诘辩论           炼出专业论文        重塑输出            对外传播
```

---

## 二、设计理念

**奥卡姆剃刀** · **简单** · **强壮** · **底蕴** · **内涵**

凡存在的每个元素都要能回答"为什么必须在这里"。能去就去，能减就减。

- **简单**：视觉语言极简，不是 flat 也不是空洞，是**精准的少**
- **强壮**：交互可靠、稳健、不脆（hover / focus / disabled / error / empty 都有定义；responsive；a11y 基线）
- **底蕴**：经典、有文化基因（苏格拉底、坩埚、雷达这些命名本身就是承载）
- **内涵**：每个视觉元素都有语义和叙事支撑，不做装饰

---

## 三、视觉锚点

**主对标**：Claude Code
**辅对标**：Codex

不是对标功能，是对标**质感**。

---

## 四、色彩语言（锚定 Claude Code）

| 用途 | 方向 | 参考值区间 |
|---|---|---|
| 背景主色 | 暖色中性，非纯白（奶白/米白感）| `#faf8f3` 附近 |
| 背景次色 | 比主色略深半阶 | `#f2efe8` 附近 |
| 文本主色 | 暖黑深灰，非纯黑 | `#2c2a26` 附近 |
| 文本次色 | 暖灰 | `#6b6860` 附近 |
| 强调色 | 赭橙 / Anthropic 暖橙，极度克制 | `#cc7849` 附近，仅作 semantic |
| 分割线 | 极淡暖灰，线比面重要 | `#e8e4dc` 附近 |
| Success | 暖绿 | 克制 |
| Warning | 赭黄 | 克制 |
| Error | 赭红 | 克制 |

**禁用**：纯黑 `#000`、纯白 `#fff`、冷灰（蓝调）、紫色渐变、彩虹堆砌、glow、glassmorphism。

彩色**只能**作为 semantic（success/warn/error/info），**不做装饰**。

---

## 五、字体纪律

**双字体策略（底蕴 + 精炼）**：

- **衬线字体**（底蕴锚点）：用于标题、论文正文、哲学引文 —— 承载"苏格拉底、坩埚"的文化叙事
- **无衬线字体**（精炼克制）：用于 UI chrome、数据、按钮、导航

**层次靠 weight 不靠 size**：400 / 500 / 600 三级足够。

**禁用**：Inter、Roboto、Arial、system-ui 默认栈、Space Grotesk（frontend-design 官方禁用清单）。

**推荐方向**：
- 衬线：Fraunces / Newsreader / IBM Plex Serif / 思源宋体
- 无衬线：JetBrains Mono（代码）+ 一种有特征的 sans（非 Inter 系）

---

## 六、动效纪律

- **opacity + 微位移**为主，位移幅度 ≤ 8px
- **150-200ms** cubic-bezier（`cubic-bezier(0.4, 0, 0.2, 1)` 或类似自然曲线）
- 页面切换 / 模块切换 / artifact 展开 都走统一曲线

**禁用**：bounce、spring、弹性、scale 过大、transition 超过 300ms、分散的"惊喜"微交互。

高质感的动效是**克制到几乎察觉不到，但没有会觉得不对**。

---

## 七、布局纪律

- 留白**慷慨**，信息密度靠**节奏**而非填满
- 圆角**温和**：6-8px（不是 2px 硬切，也不是 16px 柔化）
- 边框**细**：1px 足够，用颜色区分层次
- 阴影**轻**：`0 1px 2px` 量级，或完全不用阴影靠线条
- 间距系统：4/8/12/16/24/32/48/64 的 4 的倍数节奏

---

## 八、Shell 结构

**三栏布局**：

```
┌─────────────────┬────────────────────────┬────────────────┐
│ 左栏            │                        │ 右栏           │
│                 │                        │                │
│ ▲ 上：四模块    │                        │                │
│   GoldenRador   │                        │  Artifact      │
│   Roundtable    │     中栏：Chat         │  随需展开      │
│   Crucible      │     对话主区           │  (默认折叠)    │
│   Writer        │     SSE 流式           │                │
│   [+ 扩展位]    │                        │  - 论文草稿    │
│                 │                        │  - Spike 卡片  │
│ 中：Session     │                        │  - 引用链      │
│   列表          │                        │  - 导出面板    │
│   (当前模块)    │                        │                │
│                 │                        │                │
│ ▼ 下：用户      │                        │                │
│   + Config      │                        │                │
└─────────────────┴────────────────────────┴────────────────┘
```

**响应式**：
- `< 1280px`：右栏变抽屉（悬浮覆盖，不挤压中栏）
- `< 768px`：左栏变底部 tab bar（模块切换），session 列表变顶部下拉

---

## 九、跨模块流转 —— 产品灵魂瞬间

**这是最重要的视觉设计点**。

`GoldenRador → Roundtable → GoldenCrucible → Writer` 之间的**"送入下一环"瞬间**，是用户感知"这是一个完整思考流水线"的唯一触点。

设计参考：Claude Code 的 `split-into-new-conversation` —— **克制、有分量、被记住**的过渡。

**必须设计的 handoff 瞬间**：
1. 从 Rador 选一个 Topic → 送入 Roundtable（"开始讨论"）
2. 从 Roundtable 的 Session → 送入 Crucible（"送入坩埚"）
3. 从 Crucible 的论文定稿 → 送入 Writer（"送入文案"）

**可回溯**：每个下游节点都能一键跳回源头 session（论文 → 原圆桌 → 原 Topic）。

---

## 十、必须交付的 4 屏高保真 demo

frontend-design 必须产出可运行的 HTML/React demo（不是 Figma 图），覆盖以下 4 屏：

| 屏 | 内容 | 验证什么 |
|---|---|---|
| **屏 1** | Shell 空态 + 左上四模块切换 + 左下 config + 扩展位 | 定基调、定骨架、展示"可扩展" |
| **屏 2** | Roundtable 讨论态 + Persona 多方发言 + Spike 高亮 | 验证讨论+产出 Spike 的视觉语言 |
| **屏 3** | ⭐ 从 Roundtable 送入 Crucible 的**流转瞬间** | 产品灵魂屏，验证 handoff 质感 |
| **屏 4** | Crucible 论文定稿 + 右侧 artifact 展开 + "送入 Writer" 按钮 | 验证尾端交付 + 全链路可视 |

**GoldenRador 本轮不单独出屏**，只在屏 1 的 shell 上以按钮形态出现即可。

---

## 十一、三层可插拔 Slot —— UI 如何表达

| Slot 层 | UI 表达点 |
|---|---|
| **Channel Spirit**（频道精神）| 产品整体气质 + GoldenRador 选题池的筛选标准；未来可能的切换器位置占位 |
| **Persona**（人格）| Roundtable 的参与者选择器、Crucible 的对话者标签、头像系统 |
| **Skill**（技能）| Crucible 的"当前加载专家"面板（截图里那个 LOADED SKILLS 的进化版） |

---

## 十二、底线（禁用清单）

看一眼就能让人说出"**不是 AI 模板做的**"。质感要让 Linear / Vercel / Raycast / Claude Code 的老玩家一看就点头。

- ❌ 紫色渐变、glassmorphism、glow、霓虹、彩虹
- ❌ Inter / Roboto / Arial / Space Grotesk
- ❌ emoji 作为 UI 元素（装饰或功能都不行）
- ❌ 默认的 shadcn 外观（要深度定制）
- ❌ bounce / spring / 弹性 / scale 过大 / 过长动画
- ❌ 大量图标填充（icons-as-decoration）
- ❌ 信息填满（density 过高）
- ❌ 纯黑 / 纯白 / 冷灰

---

## 十三、frontend-design 的工作交接

**输入**：本简报 + PRD 骨架 + 用户的设计理念对齐（Claude Code / Codex 视觉参考）

**输出**：
1. 4 屏可运行的高保真 demo（HTML 或 React）
2. 一份精炼的 Design Token 定义（color / type / space / motion / radius / shadow）
3. 一份组件原语清单（button / input / card / panel / drawer / badge / avatar / sidebar-item 等）

**验收标准**：
- 还原 Claude Code 质感 ≥ 80%
- 四模块命名与 Golden 系列气质一致
- 屏 3 的 handoff 瞬间有"被记住"的设计感
- 所有 12 节纪律项全部落实，无违反

---

*编制：OldYang（老杨）*
*日期：2026-04-15*
*状态：draft，待用户终审 + 交付 frontend-design*
