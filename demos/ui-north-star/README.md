# GoldenCrucible-SSE · UI North Star · 4-Screen Demo

高保真可运行 demo，作为**工程轨写架构 PRD 时的终局锚点**。严格对齐：

- 简报：`docs/plans/2026-04-15_UI_Architecture_North_Star_Brief.md`
- 视觉锚点：Claude Code（主）· Codex（辅）
- 设计理念：奥卡姆 · 简单 · 强壮 · 底蕴 · 内涵

## 运行

纯静态，**无构建步骤**。任选其一：

```bash
# 方式 A · python
python3 -m http.server 5173 --directory demos/ui-north-star

# 方式 B · node
npx serve demos/ui-north-star -l 5173
```

然后打开 <http://localhost:5173>。

## 操作

- 右上角 `Screen 01/02/03/04` 切屏
- 键盘 `1` / `2` / `3` / `4` 直接跳
- `←` / `→` 顺序翻屏

## 4 屏清单

| 屏 | 目的 |
|---|---|
| **01** | Shell 空态 · 四模块 + `+ 扩展位` · 右栏折叠 —— 定基调、定骨架 |
| **02** | Roundtable 讨论态 · 苏格拉底 / 庄子 / 尼采 / 纽波特 · Spike 高亮 · 右侧 Spike 卡片 |
| **03** | ⭐ **Roundtable → Crucible 流转瞬间**（产品灵魂屏） |
| **04** | Crucible 论文定稿 · 右侧 Loaded Skills / Citations · "送入 Writer" CTA |

## 文件

```
demos/ui-north-star/
├── index.html              ← 4 屏单文件
├── styles/
│   ├── tokens.css          ← Design Tokens（单一来源）
│   └── app.css             ← 组件原语 + 4 屏布局
├── scripts/
│   └── app.js              ← 屏切换（键盘 + 点击）
├── DESIGN_TOKENS.md        ← Token 契约（色 / 字 / 距 / 动 / 角 / 影）
├── COMPONENTS.md           ← 组件原语清单
└── README.md               ← 本文
```

## 红线自检（对齐简报 §十二）

- [x] 无紫色渐变、无 glassmorphism、无 glow、无霓虹、无彩虹
- [x] 无 Inter / Roboto / Arial / Space Grotesk
- [x] 无 emoji 作 UI（全部 SVG 线稿 symbol）
- [x] 非默认 shadcn 外观（全组件自定义，赭橙仅作语义）
- [x] 无 bounce / spring / scale 过大 / > 300ms 动画
- [x] 无 icons-as-decoration（每个图标都有功能或语义锚定）
- [x] 无信息填满（留白慷慨，stage padding 48–64）
- [x] 无纯黑 `#000` / 纯白 `#fff` / 冷蓝灰

## 字体

由 Google Fonts 直链加载：**Fraunces**（衬线）· **Instrument Sans**（无衬线）· **JetBrains Mono**（等宽）。

预连接 `fonts.googleapis.com` / `fonts.gstatic.com` 减少首字阻塞。

## 下一步交接建议

1. **工程轨（CE 团队）**：以本 demo 为视觉终局锚点，撰写 Shell / Roundtable / Crucible / Handoff 四份架构 PRD。
2. **Token 同构**：`tokens.css` 可直接复制为未来 SSE 前端的 token 单一来源，React 侧封 `ThemeProvider` 注入。
3. **Handoff 动效**：屏 3 的 `gcDash` 赭橙虚线是仪式感核心，工程实现时请勿简化为 spinner。

—— 对齐 OldYang 北极星简报（2026-04-15） · 本 demo 2026-04-16 交付。
