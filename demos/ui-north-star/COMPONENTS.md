# GoldenCrucible-SSE · 组件原语清单

> 原语即"画布之上最少的砖"。每块砖都能回答两个问题：**为什么必须在这里** + **下一次出现时它还能保持一样吗**。

## 一、Shell（外壳层）

### `.shell`
三栏容器。`grid-template-columns: 260px 1fr [44|360]px`。  
状态：`.shell--right-expanded` 切换右栏到 360px。  
**关键**：整个应用只有一个 shell 实例；模块切换的是内部而非 shell。

### `.rail`（左栏）
- `.rail__brand` — 品牌锚点（crucible glyph + "GoldenCrucible" + 小号 v0.1）
- `.rail__section` — 可堆叠的纵向分节，节之间用 1px hairline
- `.rail__eyebrow` — 10px uppercase tracking-wide 标签 + 可选右侧 icon-btn
- `.rail__user` — 固定在底部的用户卡（avatar + name + sub + gear）

### `.stage`（中栏）
- `.topbar` — 44px 顶栏：面包屑 + meta（流式状态点 + model）
- 内部插槽：`.empty-stage` / `.thread` / `.paper` / `.handoff`
- 底部可选：`.composer`

### `.artifact`（右栏）
两态：
- `.artifact--collapsed` — 44px 细条，只放竖排 "Artifact" 标签 + chevron
- 展开态：`.artifact__head`（title + tabs）/ `.artifact__body` / `.artifact__foot`（single CTA）

---

## 二、导航原语

### `.mod`（模块 tab）
- 图标 16×16（仅 rador / roundtable / crucible / writer 四款 + `+ 扩展位` slot）
- `aria-current="true"` → 浅画布底 + 赭橙 glyph + 细线描边
- 快捷键 `⌘1/2/3/4` 右侧 mono 显示

### `.mod--slot`
虚线边框 + 斜体 serif "+ 扩展位" —— 明确"这里是未来插拔点"。**不是装饰**：它是 §十一 Channel Spirit / Skill 扩展槽位的可视锚点。

### `.session`（会话行）
- 主标题：medium-weight，ellipsis
- meta：xs、tabular-nums
- `aria-current` 态：3px 赭橙圆点前缀 + 浅画布底 + 细线描边

### `.sessions__empty`
衬线斜体，唯一允许"文学化"的空态表达（承"底蕴"纪律）。

---

## 三、顶栏 & 面包屑

### `.topbar__crumbs`
只用：纯文字 + `/` 或 `›` 分隔 + `<strong>` 强调当前节点。**禁 emoji、禁彩色 chip**。

### `.topbar__meta`
右对齐 meta 区：状态点 `.topbar__dot`（6px 圆点 + 8px soft ring）+ mono 值。

---

## 四、按钮（Button Family）

单一组件 `.btn`，靠 modifier 切态：

| Modifier | 用途 | 视觉 |
|---|---|---|
| 默认 | 次级操作 | 暖米底 + 1px 内描边 |
| `.btn--primary` | 中性主操作 | 暖黑底 + 反白字 |
| `.btn--ochre` | **handoff CTA 专用**（送入坩埚 / Writer） | 赭橙底 + 白字 |
| `.btn--ghost` | 撤销 / 辅助 | 无底无边，hover 才填充 |
| `.btn--sm` | 紧凑变体 | 内边距减半 |

**子原语**：`.btn__kbd` —— 左边 1px 分隔线后的快捷键提示，mono 10px，低对比。

**纪律**：赭橙按钮**全系只出现 3 次**（屏 2 尾、屏 3 主 CTA、屏 4 尾）—— 对应简报 §九 的三个 handoff 瞬间。

---

## 五、Message（消息原语）

### `.msg`
水平 flex：avatar 32px + body。
- `.msg__avatar` — 衬线大字，暖米底 + 内描边；`.msg__avatar--user` 反色
- `.msg__head` — serif name + 斜体 role + mono time（右对齐）
- `.msg__content` — 16px serif，`line-height: 1.75`（论文级）
- **修饰态**：`.msg--spike` —— 2px 赭橙左边界 + 左内边距 16px

### `.msg__spike-tag`
10px uppercase 赭橙 chip + 4px 圆点，置于 `.msg__content` 尾部。Spike 是 Roundtable → Crucible 的语义载体，必须视觉上可一眼识别但不喧宾。

---

## 六、Composer

### `.composer__inner`
圆角 8px + 1px 暖灰边。`:focus-within` 时边框加重到 `--gc-line-strong`。  
内部：textarea（无 border，承继 font）+ 下方一行 chips + 提示 + submit。

### `.composer__chip`
- 默认：暖米底 + 灰点
- `.composer__chip--active`：赭橙小点（≤ 5px）

---

## 七、Artifact 内部原语

### `.spike-card`
- `.spike-card__num` 20×20 赭橙 chip，mono 10px，连号 `01/02/03`
- `.spike-card__src` serif 斜体（"Nietzsche · 根因"）
- `.spike-card__body` 13px serif，`line-height: 1.4`
- `.spike-card__meta` mono xs

### `.skill`（屏 4 · Loaded Skills）
- `.skill__glyph` 24×24 方块 chip（crucible/compass/scale 等 SVG），唯一允许赭橙着色
- `.skill__name` serif semibold
- `.skill__desc` xs 三元灰，single line-height snug
- `.skill__status` mono 10px 小 pill（loaded = 暖绿底）

### `.cite`（引文条目）
mono `[01]` 定宽序号 + body + `cite__src`（mono hairline）。脚注在正文中以 `.paper__cite` 上标赭橙 mono 呈现。

---

## 八、Paper · 论文原语

### 层级
- `.paper__kicker` — Channel 标识（"mindhikers · 哲学工程"），前缀 24px 赭橙 hairline
- `.paper__title` — 40px Fraunces regular，`letter-spacing: -0.02em`
- `.paper__subtitle` — 16px serif italic，次色
- `.paper__byline` — 四列 dl（作者 / Skills / 源 / 版本），hairline 上下边
- `.paper__abstract` — 左边赭橙 hairline，eyebrow 小字 "Abstract"
- `.paper__h2` — 20px semibold serif，前缀 mono `§1/§2/§3`
- `.paper__p` — 14px serif, leading 1.75
- `.paper__pull` — 20px italic，3px 赭橙左边界 + source attribution
- `.paper__cite` — 上标 mono 赭橙小字

### `.paper__crumb`
"返回原圆桌 · xxx"—— §九 可回溯线的视觉体现。Hover 时字色转赭橙。

---

## 九、Handoff 仪式原语（屏 3 专用）

### `.handoff`
全屏容器：`.handoff__backdrop`（赭橙极淡径向渐变 + 垂直暖灰渐变）+ `.handoff__watermark`（480px crucible glyph，opacity 0.04，6s 呼吸）

### `.handoff__panel`
- 最大宽 880，padding 48–64，圆角 8
- 唯一使用 `--gc-shadow-lg` 的组件（"从画布中庄重浮起"）
- 入场动效：8px translateY + opacity，280ms

### `.handoff-node`（source / target 信息盒）
- 上部 eyebrow（"Source · Roundtable" / "Target · Crucible" + 12px glyph）
- 主标题 serif semibold
- `.handoff-node__summary-row` — 虚线 hairline 分割，label / mono value 两列

### `.handoff__arrow`
中间 80px 柱：叠加一根 dashed 赭橙运动线（`gcDash` 1.4s 线性循环）+ 箭头 SVG。**唯一允许的连续动效** —— 物理上表达"流"。

### `.handoff__checklist`
2 列 grid：每行 `check/circle` icon + label + mono meta。`data-state="done|pending"` 切换 icon 颜色。

---

## 十、零散原语

### `.avatar`（26px / 32px）
圆形，serif semibold 大字。用户用反色，persona 用暖米底。

### `.kbd`
3px 圆角，暖米沉底 + 1px 内描边，mono 10px。

### `.divider-hairline`
1px `--gc-line-hairline` 横线，上下 16px margin。

---

## 十一、Glyph 库（SVG symbols，皆 1.25 stroke-width）

`<use href="#g-rador">`  radar crosshair  
`<use href="#g-roundtable">`  五座环绕中心圆  
`<use href="#g-crucible">`  倒置梯形 + 两耳 + 内部火滴  
`<use href="#g-writer">`  nib + baseline  
`<use href="#g-crucible-hero">`  仅 handoff 水印用的 200×200 版  

UI icons：`i-plus / i-search / i-gear / i-chev-left/right / i-check / i-circle / i-arrow-right / i-attach / i-book / i-compass / i-scale`。

**纪律**：所有图标为 SVG 线稿，**无彩色填充**（只有 glyph `fill="currentColor"` 的火滴/座位），绝不使用 emoji。

---

## 十二、未实现但已预留的扩展点

| 位置 | 预留形式 | 未来承接 |
|---|---|---|
| `.mod--slot` | 虚线 "+ 扩展位" | Channel Spirit 切换器 / 第五模块 |
| `.rail__section` eyebrow 右按钮 | 通用 icon-btn | 搜索 / 筛选 / 排序 |
| `.composer__chip` | flex gap | Persona 选择器 / 引用锚点 / mode 切换 |
| `.artifact__tabs` | 3 tab pill | 技能 / 引用 / 导出 · 后续可加 diff / history |

这份清单是**当前 demo 的全部原语**。遵循奥卡姆：凡未列出的 class，本 demo 都不该引入。
