# GoldenCrucible-SSE · Design Tokens

> 锚定北极星简报 §四–§七。每个 token 都能回答"为什么必须在这里"。

## Color

### Surface · 暖色中性，不用纯白

| Token | Value | 用途 |
|---|---|---|
| `--gc-bg-base` | `#faf8f3` | 主画布（中栏背景） |
| `--gc-bg-raised` | `#f2efe8` | 侧栏、面板、按钮底色 |
| `--gc-bg-sunken` | `#ede9e0` | 输入井、hover 填充 |
| `--gc-bg-quiet` | `#f6f3ec` | 行斑马（留白节奏） |
| `--gc-bg-inverted` | `#2c2a26` | primary 按钮 / inverted chip |

### Text · 暖黑暖灰，不用纯黑

| Token | Value | 用途 |
|---|---|---|
| `--gc-text-primary` | `#2c2a26` | 正文、标题 |
| `--gc-text-secondary` | `#6b6860` | 次级信息、描述 |
| `--gc-text-tertiary` | `#9a968b` | eyebrow、meta |
| `--gc-text-quiet` | `#b7b2a5` | placeholder |
| `--gc-text-inverted` | `#faf8f3` | 反白 |

### Line · 线比面重要

| Token | Value | 用途 |
|---|---|---|
| `--gc-line-hairline` | `#efeae0` | 极淡内部分割 |
| `--gc-line-subtle` | `#e8e4dc` | 默认边框 |
| `--gc-line-default` | `#d9d4c8` | 更强边框 |
| `--gc-line-strong` | `#bfb8a8` | focus / 强分隔 |

### Semantic · 彩色只作语义，不作装饰

| Token | Value | 用途 |
|---|---|---|
| `--gc-accent` | `#cc7849` | 赭橙 · 唯一暖调强调（Spike、主 CTA、handoff） |
| `--gc-accent-hover` | `#b86a3f` | hover |
| `--gc-accent-ink` | `#8c4a24` | 小字上的赭橙（可读性） |
| `--gc-accent-tint` | `#f5e6d8` | 赭橙底色（chip / selection） |
| `--gc-accent-hairline` | `#e7c7a8` | 赭橙细线 |
| `--gc-success` | `#6b8759` | 暖绿，克制 |
| `--gc-warning` | `#c89b3c` | 赭黄，克制 |
| `--gc-error` | `#b85c4c` | 赭红，克制 |

**禁用**：纯黑 `#000`、纯白 `#fff`、冷蓝灰、紫色渐变、霓虹、glow、glassmorphism。

---

## Typography

**双字体策略**：
- **Fraunces**（衬线）— 标题、论文正文、哲学引文。承载"苏格拉底、坩埚"的文化叙事。
- **Instrument Sans**（无衬线）— UI chrome、按钮、导航、meta。
- **JetBrains Mono**（等宽）— 代码、计数、kbd、version suffix。

**禁用**：Inter / Roboto / Arial / system-ui stack / Space Grotesk。

### Size · 13px 基准，层次靠 weight 不靠 size

| Token | Value | 典型用途 |
|---|---|---|
| `--gc-size-xs` | 11 px | meta、eyebrow |
| `--gc-size-sm` | 12 px | rail 文本、chip |
| `--gc-size-base` | 13 px | UI 默认 |
| `--gc-size-md` | 14 px | 正文 |
| `--gc-size-lg` | 16 px | 引文、副标题 |
| `--gc-size-xl` | 20 px | 章节标题 |
| `--gc-size-2xl` | 28 px | 论文 §section |
| `--gc-size-3xl` | 40 px | 论文标题 / handoff 标题 |
| `--gc-size-4xl` | 56 px | Screen 1 大标题 |

### Weight · 只取三级

| Token | Value |
|---|---|
| `--gc-weight-regular` | 400 |
| `--gc-weight-medium` | 500 |
| `--gc-weight-semibold` | 600 |

### Leading

| Token | Value | 用途 |
|---|---|---|
| `--gc-leading-tight` | 1.2 | 大标题 |
| `--gc-leading-snug` | 1.4 | 副标题 |
| `--gc-leading-body` | 1.6 | UI 正文 |
| `--gc-leading-prose` | 1.75 | 论文正文 |

### Tracking · 极克制

- `--gc-tracking-wide` (`0.08em`) — 仅 eyebrow / kicker / small-caps 用
- `--gc-tracking-micro` (`0.04em`) — byline 极微调

---

## Spacing · 4 倍节奏

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64
```

留白是节奏而非填空。stage 两侧 padding 48–64，rail 内部 padding 16。

---

## Radius · 温和圆角

| Token | Value |
|---|---|
| `--gc-radius-sm` | 4 px — chip、tag |
| `--gc-radius-md` | 6 px — 按钮、卡片（默认） |
| `--gc-radius-lg` | 8 px — 面板、composer |
| `--gc-radius-pill` | 999 px — 头像、状态点 |

2 px 太硬、16 px 太柔；温和圆角是底蕴本能。

---

## Shadow · 线优于面

| Token | Value | 用途 |
|---|---|---|
| `--gc-shadow-sm` | `0 1px 2px rgba(44,42,38,0.04)` | 按钮、细浮起 |
| `--gc-shadow-md` | `0 2px 6px rgba(44,42,38,0.05)` | tab 选中态 |
| `--gc-shadow-lg` | `0 12px 32px -8px rgba(...,0.12), 0 2px 6px rgba(...,0.05)` | 仅 handoff 仪式面板用 |

默认靠 1px 边线划分层次，阴影仅在需要"从画布中浮起"时使用。

---

## Motion · 克制到几乎察觉不到

| Token | Value |
|---|---|
| `--gc-ease` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--gc-dur-fast` | 150 ms — hover、chip 切换 |
| `--gc-dur-base` | 200 ms — 面板切换、tab |
| `--gc-dur-slow` | 280 ms — **仅 handoff 仪式** |

**唯一允许的动效形式**：opacity + translate ≤ 8px。

**禁用**：bounce、spring、scale > 1.05、transition > 300ms、分散"惊喜"微交互、rotate 装饰。

---

## Layout

| Token | Value | 意义 |
|---|---|---|
| `--gc-col-left` | 260 px | 左栏固定宽 |
| `--gc-col-right` | 360 px | 右栏展开态 |
| `--gc-col-right-collapsed` | 44 px | 右栏折叠态（细条） |
| `--gc-topbar-h` | 44 px | 顶栏高 |
| `--gc-prose-max` | 680 px | 论文阅读最大宽 |

响应式断点（见简报 §八）：
- `< 1280px` → 右栏变悬浮抽屉
- `< 768px` → 左栏变底部 tab bar

---

## Token 命名约定

全部以 `--gc-` 前缀，语义三段：`category-role-level`。绝不把具体颜色写进组件，一切走 token。这保证未来切换 Channel Spirit（简报 §十一）时，只要改 token 就能换皮。
