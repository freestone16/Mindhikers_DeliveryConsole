# Remotion 组件速查表 — 严格 Props 契约

> ⚠️ 以下是每个 Remotion 组件的合法 Props 规范。所有组件均支持可选的基础参数 `theme` (可选值: `deep-space`, `warm-gold`, `sci-fi-purple`, `forest-green`, `crimson-red`, `monochrome-ink`)。`theme` 参数将不仅改变色彩，还会严格接管组件的排版字体、字重及负空间安全距离（30%画布留白）。
> type 为 "remotion" 时，你的 props 字段必须严格符合对应模板的结构，字段名不得错写，否则渲染会直接失败。

---

## 🌟 优先推荐（数据驱动型）

### 1. TextReveal — 文字揭示动画
**适用**：金句、名言、观点、标题出场
```json
{ "text": "未来的终极形态，始于今日的构想。", "textColor": "#ffffff" }
```
单行/不换行需求示例：
```json
{
  "text": "真正的目标不是被告知，而是从生命中涌现。",
  "textColor": "#ffffff",
  "singleLine": true,
  "noWrap": true,
  "containerWidth": "84%",
  "paddingX": "8%",
  "paddingY": "6%",
  "textStyle": {
    "whiteSpace": "nowrap",
    "fontSize": "clamp(24px, 4vw, 48px)",
    "letterSpacing": "-0.02em"
  }
}
```
字段说明：
- `text`(必填，字符串)
- `textColor`(选填，默认 `#fff`)
- `singleLine`(选填，布尔值；当用户明确要求“一行显示”时设为 `true`)
- `noWrap`(选填，布尔值；当用户明确要求“不换行”时设为 `true`)
- `containerWidth`(选填，字符串；控制文本安全宽度，例如 `84%`)
- `paddingX` / `paddingY`(选填，字符串；控制容器内边距)
- `textStyle`(选填，对象；允许传入 `whiteSpace`、`fontSize`、`letterSpacing` 等样式字段)
🚨 **纪律**：
- 如果用户要求“不换行/一行显示”，必须显式写入 `singleLine/noWrap/textStyle.whiteSpace`
- 不要把 `whiteSpace` 单独写在 props 根上指望系统自动转换
- 没有明确单行诉求时，不要滥用 `singleLine/noWrap`

### 2. NumberCounter — 数字滚动计数器
**适用**：统计数据、增长数字、重要指标
```json
{ "title": "全球已突破", "endNumber": 2500000, "suffix": "人" }
```
字段说明：`title`(必填)，`endNumber`(必填，纯数字，不要带单位)，`suffix`(选填，单位字符串)

### 2A. SegmentCounter — 赛博/LCD风格数字计数器
**适用**：科技风格、代码提交、资产数字等有极客感的展示
```json
{ "label": "TOTAL COMMIT", "value": 9999, "prefix": "#" }
```
字段说明：`value`(纯数字，必填)，`label`(顶部标签标题，必填)，`prefix`/`suffix`(前缀后缀，选填)

### 3. ComparisonSplit — 左右分屏对比
**适用**：A vs B、传统 vs 觉醒、归因 vs 涌现
```json
{ "leftTitle": "传统模式", "leftContent": "线性思考，孤岛式运作", "rightTitle": "觉醒模式", "rightContent": "网状连接，指数级涌现" }
```
字段说明：4个字段全部必填，每个控制对应半屏内容

### 4. TimelineFlow — 时间轴演化图
**适用**：历史进程、从...到...的发展路线
```json
{ "title": "进化编年史", "nodes": [{"year": "2015", "event": "萌芽探索期"}, {"year": "2020", "event": "技术验证期"}, {"year": "2024", "event": "爆发增长期"}]}
```
字段说明：`title`(必填)，`nodes`数组每项含`year`和`event`两个字符串字段

### 4A. TerminalTyping — 终端代码打字机
**适用**：命令行交互、AI 对话模拟、硬核执行过程
```json
{ "lines": ["npm run init", "System updated."], "prefix": "$ " }
```
字段说明：`lines`(必填，多行字符串数组)，`prefix`(提示符，选填)

---

## 📊 标准模板

### 5. ConceptChain — 概念链条（A→B→C递进模型）
**适用**：因果链、认知框架、递进逻辑
```json
{
  "title": "认知演化链条",
  "subtitle": "核心模型：递进与连接",
  "conclusion": "说不清的孩子，注定守不住",
  "nodes": [
    {"id": "express", "label": "精准表达", "icon": "💬", "color": "#3498db", "desc": "用语言定义思想"},
    {"id": "think",   "label": "清晰思维", "icon": "🧠", "color": "#9b59b6", "desc": "逻辑与结构能力"},
    {"id": "ethics",  "label": "伦理判断", "icon": "⚖️", "color": "#e74c3c", "desc": "道德与价值观"}
  ]
}
```
字段说明：`nodes`数组每项必须含`id`(唯一字符串)、`label`(节点名)、`icon`(Emoji)、`color`(#hex)、`desc`(短描述)
🚨 **硬性约束：nodes 最少 2 个，最多 5 个。超过 5 个请改用 TimelineFlow。**

### 6. DataChartQuadrant — 四象限分布图
**适用**：二元对比、决策矩阵、象限分析
```json
{
  "title": "认知密度象限图",
  "xAxisLabel": "屏幕时长 →",
  "yAxisLabel": "互动密度 →",
  "quadrants": [
    {"id": "zombie", "label": "僵尸区", "subLabel": "高时长+低互动", "x": 1, "y": 0, "emoji": "🧟", "color": "#ff4757"},
    {"id": "evolve", "label": "进化脑", "subLabel": "高时长+高互动", "x": 1, "y": 1, "emoji": "🧠", "color": "#2ed573"},
    {"id": "passive","label": "被动区", "subLabel": "低时长+低互动", "x": 0, "y": 0, "emoji": "😴", "color": "#ffa502"},
    {"id": "active", "label": "主动区", "subLabel": "低时长+高互动", "x": 0, "y": 1, "emoji": "⚡", "color": "#3742fa"}
  ]
}
```
字段说明：`quadrants`必须**恰好4个**，`x`和`y`只能填0或1

### 7. CinematicZoom — 电影级单图Ken Burns推镜
**适用**：大图氛围感、哲思风格、单帧展示
```json
{ "bgStyle": "dark-gradient", "zoomStart": 1, "zoomEnd": 1.08 }
```
字段说明：`bgStyle`可选值为 "black" | "dark-gradient" | "stripes"；`zoomStart`和`zoomEnd`控制推拉幅度(建议1.0~1.15之间)
注意：实际底图由火山引擎根据 imagePrompt 生成后自动传入，你不需要填 imageUrl。

---

## 🎨 兜底模板

### 8. SceneComposer — 万能文字排版
**仅当所有模板都不适用时降级使用**
```json
{}
```

---

## 🚨 严格执行规则

- type 为 "remotion" 时，**template 和 props 字段都不可缺失**
- props 的字段名必须完全匹配上方规范，**不可拼错、不可省略必填字段**
- 用户要求修改模板内部行为时，必须直接写合法 props，**不要依赖 DeliveryConsole 系统层自动纠偏**
- ConceptChain 的 nodes 超过 5 个时，**必须改用 TimelineFlow**
- DataChartQuadrant 的 quadrants **必须恰好是 4 个**，不多不少
