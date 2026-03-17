# SD210 黄金坩埚生成式黑板实验方案

> 日期：2026-03-15
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible`
> 当前稳定分支：`codex/crucible-main`
> 建议实验分支：`codex/crucible-widget-lab`
> 文档性质：实施方案 / 交接级别 / 支线实验
> 目标原则：奥卡姆剃刀、低侵入、可见成效、易回滚

## 1. 这次到底要解决什么问题

黄金坩埚当前已经有了一个很清楚的方向：

1. 右侧是追问和对话
2. 中屏是黑板和挂板
3. 后端已经开始用 `turn -> presentables -> dialogue` 的方式驱动界面

但现在的中屏仍然主要是“整理过的文字内容”。

这会导致两个问题：

1. 对用户来说，抽象关系还是要靠自己脑补，理解成本高
2. 对产品来说，中屏虽然已经叫“黑板”，但还没有形成足够强的辨识度

这次实验不是为了做一个炫技图形系统，而是为了验证一件更小、更硬的事：

**把黄金坩埚里最值得上板的“思辨结构”，用简单、稳定、可交互的方式直接显示出来，能不能明显提升理解效率和产品记忆点。**

一句话说：

**我们不是在做“聊天里随便画网页”，而是在做“坩埚黑板的第一批结构化可视化”。**

## 2. 这次明确不做什么

为了不拖主线，这次必须主动克制。

本实验明确不做：

1. 不做全站生成式 UI 系统
2. 不做任意 HTML 渲染平台
3. 不让模型自由输出脚本并在页面执行
4. 不改现有主链的 socket / chat-stream / host routing 总体结构
5. 不在第一阶段接真实流式增量渲染
6. 不碰其他模块的 UI 语言和协议

这意味着本次不是“把 CodePilot 那套完整复刻到黄金坩埚”，而是：

**只抽走其中对坩埚真正有价值的一层：结构化可视化黑板。**

## 3. 为什么这条路符合奥卡姆剃刀

如果直接做“任意 HTML + iframe + 流式执行脚本”，问题会一下子变多：

1. 安全边界更复杂
2. 调试难度更高
3. 流式半成品很容易闪烁、泄露代码、抖动
4. 一旦要合主线，维护成本会立刻抬高

而黄金坩埚当前最需要的，并不是“更自由的渲染能力”，而是“更稳定的结构化表达能力”。

所以最简方案应该是：

1. 先定义少量固定 widget 类型
2. 模型只输出结构化数据
3. 前端用 React + SVG 直接渲染
4. 只在实验 worktree 内跑通
5. 先用 mock / 回放数据验证价值

这样做有四个好处：

1. 简单：没有任意 HTML 执行
2. 稳定：渲染路径完全在我们控制内
3. 安全：没有脚本逃逸和样式污染问题
4. 易合并：如果实验成功，迁入主线时改动面会很小

## 4. 实验成功的判断标准

这次实验不以“技术酷炫程度”为标准，而以“是否值得合主线”为标准。

只要满足下面四条，就算成功：

1. 用户第一次看到中屏，就能明显感知“这不是普通聊天总结，而是在上板”
2. 至少有 2 种思辨结构的可视化明显比纯文字好理解
3. 实验代码没有侵入主链核心协议，撤掉也很容易
4. 演示过程中没有明显的闪烁、跳高、重绘抖动、脚本泄露等体验事故

如果达不到这四条，就不要急着并主线。

## 5. 建议的总体策略：先做“坩埚可视化实验室”

### 5.1 核心想法

先不要直接改黄金坩埚在线主界面。

先做一个独立的实验页，名字可以叫：

- `Crucible Widget Lab`
- `坩埚可视化实验室`

它只做三件事：

1. 读取固定 fixture 数据
2. 渲染 2-3 种 widget
3. 支持最小交互验证

这样第一阶段就能很快回答一个关键问题：

**这些结构化可视化，到底有没有“值”。**

### 5.2 为什么先做实验室而不是直接接主线

因为现在主线还在继续推进坩埚 orchestrator、bridge 和双阶段工作区。如果这时把实验性 UI 直接焊进主界面，会有三个风险：

1. 主线节奏被实验拖慢
2. 实验中的反复试错会污染稳定代码
3. 很容易在“还没验证价值”时提前承担长期维护成本

所以最稳的策略是：

**先把“值”跑出来，再决定要不要接“线”。**

## 6. 建议的分支与 worktree 设计

### 6.1 总原则

保持“主线稳定工作区”和“实验工作区”完全分开。

当前稳定工作区已经很好：

- 主工作区：`/Users/luzhoua/MHSDC/GoldenCrucible`
- 稳定分支：`codex/crucible-main`

建议新增一个兄弟 worktree：

- 实验工作区：`/Users/luzhoua/MHSDC/GoldenCrucibleLab`
- 实验分支：`codex/crucible-widget-lab`

### 6.2 这样设计的原因

1. 路径层面一眼能看出哪个是主线，哪个是实验
2. 实验中即使结构改得比较猛，也不会污染主工作区
3. 主线可以继续正常修坩埚、修 runtime、修 orchestrator
4. 实验失败时，直接丢弃 lab worktree 就行，心理负担小

### 6.3 不建议的做法

不建议在当前 `codex/crucible-main` 工作区里直接边做主线边塞实验代码。

原因很简单：

1. 脏状态会混在一起
2. 难以判断哪些代码是真正想长期保留的
3. 回滚会很痛苦

### 6.4 推荐命名

分支建议：

1. `codex/crucible-widget-lab`
2. 如果后续要做合并验证，可再开 `codex/crucible-widget-integration`

worktree 路径建议：

1. `/Users/luzhoua/MHSDC/GoldenCrucible`
2. `/Users/luzhoua/MHSDC/GoldenCrucibleLab`

如果后面真的进入合并阶段，再增加第三个工作区：

1. `/Users/luzhoua/MHSDC/GoldenCrucibleIntegration`

但现在先不要多开，先一条实验支线就够。

## 7. 建议的目录设计

### 7.1 第一阶段目录原则

实验代码尽量自成一区，不要一上来拆进现有坩埚主目录。

建议在实验分支中新增：

```text
src/labs/crucible-widget-lab/
├── WidgetLabPage.tsx
├── labTypes.ts
├── labFixtures.ts
├── labScenarios.ts
├── renderers/
│   ├── ConflictMapRenderer.tsx
│   ├── ArgumentChainRenderer.tsx
│   └── ReaderGapRenderer.tsx
└── components/
    ├── WidgetStage.tsx
    ├── WidgetInspector.tsx
    └── WidgetActionBar.tsx
```

同时配一小块共享但仍低侵入的 schema：

```text
src/schemas/crucible-widget.ts
```

### 7.2 为什么不直接放进 `src/components/crucible/`

因为现在还处于实验阶段，直接塞进去会给人一种“这已经是正式架构的一部分”的错觉。

实验代码应该先有明确边界：

1. 它可以长得粗一点
2. 它可以快速试错
3. 它可以被整体删除

等实验通过后，再把真正稳定的部分搬进：

```text
src/components/crucible/widgets/
server/crucible-widget-bridge.ts
```

### 7.3 迁入主线时的目标结构

如果实验成功，建议只迁这几类稳定资产：

```text
src/components/crucible/widgets/
├── WidgetRenderer.tsx
├── widgets/
│   ├── ConflictMapWidget.tsx
│   ├── ArgumentChainWidget.tsx
│   └── ReaderGapWidget.tsx
└── widgetTheme.ts

src/components/crucible/types.ts
src/schemas/crucible-widget.ts
server/crucible-widget-bridge.ts
```

也就是说：

**实验目录只负责“证明有效”，主线目录只接“已经证明稳定”的部分。**

## 8. MVP 范围：只做 3 个 widget

为了简单有力，第一批只做最适合黄金坩埚的 3 类。

### 8.1 Widget A：冲突地图

适用场景：

1. 第一轮 roundtable discovery
2. 展示一个主题最值得打的冲突点

结构：

1. 核心命题
2. 支持理由
3. 反方刺点
4. 当前建议追问口

它解决的问题：

让用户一眼知道“这一轮为什么往这个方向打”。

### 8.2 Widget B：论证链

适用场景：

1. 苏格拉底收敛阶段
2. 展示某个判断是怎么一步步站住或站不住的

结构：

1. 前提
2. 推论
3. 暂时结论
4. 脆弱点

它解决的问题：

让用户知道“不是模型在空谈，而是在沿一条逻辑链推进”。

### 8.3 Widget C：读者困惑板

适用场景：

1. 从抽象命题往写作落地收束
2. 帮用户把“我想说什么”转成“读者真正卡在哪”

结构：

1. 读者困惑
2. 常见误解
3. 应该带走的新判断

它解决的问题：

让坩埚更容易把思辨结果交给下游写作和导演模块。

## 9. 数据协议设计：只允许结构化 schema

### 9.1 第一阶段不要 HTML

第一阶段数据形态应该像这样：

```ts
type CrucibleWidgetPayload =
  | {
      kind: 'conflict_map';
      title: string;
      thesis: string;
      supports: string[];
      attacks: string[];
      nextQuestion: string;
    }
  | {
      kind: 'argument_chain';
      title: string;
      premise: string;
      inference: string;
      conclusion: string;
      weakPoint: string;
    }
  | {
      kind: 'reader_gap';
      title: string;
      readerQuestion: string;
      misconception: string;
      takeaway: string;
    };
```

这样做的价值很直接：

1. 后端可校验
2. 前端可控
3. mock 数据好写
4. 后续想换渲染方式也容易

### 9.2 为什么这比 HTML 更适合现在

因为黄金坩埚当前需要的是“表达确定的结构”，不是“模型自由发挥前端实现”。

模型越自由，我们越难控制体验和可靠性。

第一阶段的正确顺序应该是：

1. 先证明结构本身有价值
2. 再考虑是否需要更自由的渲染能力

## 10. 前端实现策略

### 10.1 第一阶段：React + SVG 直接渲染

第一阶段所有 widget 都建议使用 React + SVG。

原因：

1. 轻量
2. 易控
3. 无额外安全边界问题
4. 对主题适配更容易

### 10.2 不做的事情

第一阶段不做：

1. iframe
2. sandbox
3. postMessage
4. script finalize
5. HTML 增量解析

这些都属于第二阶段问题。

### 10.3 主题和视觉策略

尽量复用现有坩埚色彩和排版，不单独发明一套“花哨实验风格”。

原因：

1. 方便判断它是否真的适配坩埚
2. 未来如果要合主线，迁移成本更低

## 11. 交互设计策略

交互只保留最小闭环，不追求复杂。

每个 widget 只需要有 1-2 个明确动作，例如：

1. `继续深挖这个刺点`
2. `把这个脆弱点改写成追问`
3. `把这个读者困惑送去写作入口`

这些动作在实验阶段甚至不需要接真后端。

可以先只做：

1. 本地回调
2. 控制台记录
3. 生成下一轮 mock prompt

只要能证明“交互方向是对的”就够。

## 12. 实施分期

## 阶段 0：实验底座

目标：

1. 建立独立 lab 页面
2. 能切换 3 个 fixture 场景
3. 能稳定渲染 3 个 widget

涉及文件：

1. `src/labs/crucible-widget-lab/*`
2. `src/schemas/crucible-widget.ts`

验收：

1. 独立页面可打开
2. 三类 widget 都能看到
3. 样式稳定，没有明显布局抖动

## 阶段 1：半真实回放

目标：

1. 用坩埚真实回合日志或手工整理结果喂给 lab
2. 验证“真实内容上板后是否仍然成立”

建议方式：

1. 从现有 `turn_log` 里挑 3-5 轮代表性样本
2. 人工整理成 widget payload fixture

验收：

1. 不是只有 demo 数据好看
2. 至少两类真实回合上板后仍明显优于纯文字

## 阶段 2：主线前的最小桥接

目标：

1. 在实验分支里给 `presentables` 增加 `widget` 类型
2. 仅在坩埚中屏增加一个受控渲染口
3. 保持旧 `reference` 路径不受影响

这一步要非常克制：

1. 只做一个 feature flag
2. 默认关闭
3. 不替换现有主屏逻辑

验收：

1. 打开 flag 时能看到 widget
2. 关闭 flag 时主线行为完全不变

## 阶段 3：是否值得合并的评审点

只有同时满足以下条件，才建议进入主线合并讨论：

1. widget 确实提升了理解效率
2. 协议依然简单
3. 对现有坩埚代码侵入很小
4. 不会引出一串新的维护债

如果这四条没有同时成立，实验就留在 lab，不强并。

## 13. 验证与止损机制

### 13.1 每阶段都要有明确的“停下点”

阶段 0 停下点：

1. 如果三种 widget 看起来都像“花哨卡片”，没有比文字更强，就停

阶段 1 停下点：

1. 如果真实数据一喂进去就显得很乱，说明 schema 设计不对，先别碰主线

阶段 2 停下点：

1. 如果 feature flag 接入后开始影响现有坩埚稳定性，就立即回退到 lab-only

### 13.2 回滚策略

因为整个实验在独立分支和独立 worktree 上，所以回滚非常简单：

1. 不合并就等于天然回滚
2. 即使做了最小主线桥接，也只需删掉 `widget` 相关受控入口
3. 不会伤到现有坩埚主链

## 14. 交接级别的任务拆解

### 14.1 任务包 A：实验底座

目标：

1. 搭建 lab 页面
2. 建好三类 widget renderer
3. 接好 fixture 切换

交付物：

1. 可运行的 lab 页面
2. 三类 renderer
3. 基础主题适配

### 14.2 任务包 B：协议与样本

目标：

1. 定义 `crucible-widget` schema
2. 整理真实回合样本
3. 产出 fixture 数据

交付物：

1. `src/schemas/crucible-widget.ts`
2. `labFixtures.ts`
3. 真实样本说明

### 14.3 任务包 C：受控桥接

目标：

1. 让中屏在 flag 开启时能读 widget payload
2. 保留旧 presentable 主路径

交付物：

1. `widget` 类型 presentable
2. 受控渲染入口
3. flag 开关说明

### 14.4 任务包 D：验收与决策

目标：

1. 录一轮演示
2. 比较纯文字黑板 vs widget 黑板
3. 给出“合并 / 继续实验 / 停止”的建议

交付物：

1. 演示结论
2. 决策建议
3. 是否进入集成分支

## 15. 合并策略建议

### 15.1 不要直接从实验分支合到主线

建议顺序：

1. `codex/crucible-widget-lab` 先完成实验
2. 如果确认值得进入主线，再新开 `codex/crucible-widget-integration`
3. 只挑稳定文件做干净迁移

### 15.2 为什么要多一道 integration

因为实验分支上的代码通常会包含：

1. 临时调试代码
2. 过度试验的视觉尝试
3. 不值得长期保留的样本和脚手架

所以正确做法不是“整枝合并”，而是：

**从实验分支里提炼出真正稳定的协议、组件和最小入口，再干净落到 integration 分支。**

## 16. 最终建议

如果只用一句话总结这次实施策略：

**不要一上来做“坩埚里的任意生成式 UI 系统”，而是先做一个完全隔离的“坩埚结构化可视化实验室”，用最少的 widget、最少的协议、最小的渲染能力，先证明它真的让思辨变得更好理解。**

这是当前最符合你要求的路线：

1. 简单
2. 有力
3. 健壮
4. 不拖主线
5. 成功了好合并
6. 失败了好止损

## 17. 建议的下一步

下一步不要立刻开干大集成，而是按下面顺序行动：

1. 建立 `codex/crucible-widget-lab` 分支和 `/Users/luzhoua/MHSDC/GoldenCrucibleLab` worktree
2. 先只完成阶段 0：lab 页面 + 3 个 widget + fixture
3. 跑一轮真实样本回放
4. 只有在确认“确实明显更好理解”之后，才讨论是否进入 integration 分支

