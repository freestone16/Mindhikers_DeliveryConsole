# SD210 黄金坩埚双阶段骨架与黑板收口记录

> 日期：2026-03-12
> 工作目录：`/Users/luzhoua/DeliveryConsole`
> 分支：`codex/sd208-golden-crucible`
> 状态：阶段性完成 / 未提交

## 本轮背景

在新的《黄金坩埚设计架构宣发文案（市场部口径）》基础上，黄金坩埚当前主线被重新明确为：

1. 不是单纯继续修 UI
2. 不是假装已经做完完整“圆桌发散”
3. 而是先把当前真实上线的 `Socrates` 主链收成一个更诚实的双阶段骨架

也就是：

- 架构上承认“圆桌发散 -> 苏格拉底收敛”的双阶段方向
- 代码上先把已上线部分明确标成“当前运行：苏格拉底收敛”
- 同时继续收中屏黑板与 bridge 协议，不再让旧 `cards` 心智拖住现场

## 本轮完成

### 1. 前端坩埚状态去 `cards` 化

本轮将坩埚前端主状态从旧的：

- `clarificationCards`
- `canvasAssets`
- `activeAssetId`

收成新的：

- `roundAnchors`
- `presentables`
- `activePresentableId`

这样做的目的，是让中屏状态更接近 bridge 语义，而不是继续维持“题卡 / 资产混搭”的过渡心智。

### 2. 本地快照结构已升级

`src/components/crucible/storage.ts` 已升级到 `v8`：

1. 新快照主结构围绕 `presentables + activePresentableId + roundAnchors`
2. 兼容读取旧的 `canvasAssets / activeAssetId / clarificationCards`
3. 自动迁移旧本地快照，避免用户现场状态直接丢失

### 3. 中屏黑板视图进一步压缩

`src/components/crucible/CrucibleWorkspaceView.tsx` 已继续收口：

1. 左侧目录仍保留，但只作为黑板索引
2. 中屏提示语改成“黑板 / 挂板 / 焦点”口径，减少答题卡暗示
3. `reference` 视图从多个小卡片改成更连续的黑板阅读面
4. 中屏头部新增“双阶段认知引擎”识别，但当前运行态诚实标注为 `苏格拉底收敛`

### 4. bridge 主协议继续收紧

`server/crucible.ts` 本轮新增：

1. `engineMode`
2. `phase`
3. 明确 `dialogue` 结构

同时：

1. 前端已改为主消费 `dialogue + presentables`
2. 后端响应不再依赖旧的 `speaker / reflection / focus` 兼容字段
3. `turn_log` 同步写入 `engineMode + phase`

### 5. turn log 比首版更可回放

虽然还没到完整调度器阶段，但本轮已把日志从“只知道 roundIndex”推进到：

1. `phase`
2. `engineMode`
3. `skillOutput`
4. `bridgeOutput`

后续继续补导演层时，至少不会再从一团模糊日志起步。

### 6. 双阶段开始真正进入运行时

后续继续推进时，本轮又补了一刀：

1. 新增 `/api/crucible/turn` 路由，开始承载更准确的“坩埚回合”语义
2. 旧的 `/api/crucible/socratic-questions` 仍保留兼容，不直接砍断现场
3. 后端已开始按最小策略切换：
   - 第一轮：`roundtable_discovery`
   - 后续轮次：`socratic_refinement`
4. 第一轮不再只是“苏格拉底第一问”，而是先做一次最小“圆桌寻刺”

注意：

这里的 `roundtable_discovery` 仍然只是最小骨架，不等于完整多智能体圆桌已经实现。
它当前代表的是：

1. 后台先做一轮“冲突扫描”
2. 前台只吐出一个最值得继续打的切口
3. 中屏先挂“冲突地图 / 刺点候选 / 下一刀”

也就是说，双阶段现在已经不只存在于文案或 UI 标签里，而是第一次真正进入了回合决策。

### 7. 右侧去双通路，中屏继续压缩

在实际验收中又暴露出两个真实问题：

1. 同一轮里右侧会出现两条语义相近的老张 / 老卢回复
2. 中屏内容仍然偏多，和右侧当前追问的关联不够一眼明确

本轮继续处理后：

1. `ChatPanel` 在黄金坩埚模式下不再同时保留 `socket chat-stream` 与坩埚注入两条 assistant 通路
2. 右侧 assistant 现在以坩埚回合注入为主，避免同轮“双回”
3. 中屏新增“对应右侧这句”锚点，直接把当前黑板内容和右侧追问绑起来
4. 后端挂板内容进一步限量，避免中屏重新长成第二篇小文章

因此当前中屏的目标已经更明确：

- 不是扩写
- 不是解释器
- 而是右侧当前追问的黑板摘要

### 8. `GoldenMetallurgist` orchestrator contract 已开始独立

继续推进时，又补了一刀结构性收口：

1. 新增 `server/crucible-orchestrator.ts`
2. 将以下内容从 `server/crucible.ts` 抽离：
   - `engineMode` 决策
   - `phase` 决策
   - roundtable / socratic prompt 生成
   - 对应 fallback 策略
3. 新增 `createCrucibleTurnPlan()` 作为坩埚回合的最小 orchestrator contract

当前意义不是“导演层已经完成”，而是：

1. `server/crucible.ts` 退回成接口壳
2. `GoldenMetallurgist` 的回合策略第一次有了独立 policy 文件
3. 后续再接真实导演调度、tool routing 或 soul handoff 时，不必继续把逻辑塞进接口层

### 9. orchestrator 已开始产出 tool routing

继续推进后，当前 orchestrator 不再只返回：

1. `engineMode`
2. `phase`

而是开始显式产出每轮的最小 `toolRoutes`，包括：

- `Socrates`
- `Researcher`
- `FactChecker`
- `ThesisWriter`

当前还不是“真实多工具执行链”，但已经先把：

1. 谁是本轮主工具
2. 谁是支援位
3. 谁暂时挂起
4. 为什么这样排

写进了 turn plan、接口响应和 turn log。

这一步的意义在于：

后续接真实工具调用时，不再从“phase 名字”硬跳到“直接执行”，而是中间已有一层明确的导演决策。

### 10. 前端坩埚 turn contract 再收一层

本轮也顺手把前端对坩埚回合返回的消费，从匿名内联结构收成显式类型：

- `CrucibleTurnResponse`
- `CrucibleOrchestratorState`
- `CrucibleToolRoute`

这样宿主层后续继续接 orchestrator 信息时，不需要再一边猜字段、一边手抄匿名对象。

## 本轮没有做的事

为避免“文案先行把实现吹过头”，本轮明确没有做：

1. 没有实现完整的圆桌发散编排
2. 没有接 `GoldenMetallurgist` 真导演策略
3. 没有接主动 / 被动互联网搜索
4. 没有推进论文产出闭环

这次只是把双阶段方向压进当前代码骨架，而不是谎称双阶段已经完成。

## 验证结果

本轮完成后已验证：

1. `npx vitest run src/components/crucible/hostRouting.test.ts` 通过
2. `npx vite build` 通过
3. `git diff --check` 通过

## 当前保存点判断

本轮完成后，黄金坩埚已经从：

- “看起来像有协议，但代码里还是 `cards` 过渡态”

推进到：

- “双阶段方向已进入代码语义，当前上线的是苏格拉底收敛主链，中屏黑板与 bridge 命名更一致”
- “第一轮已开始走最小 roundtable discovery，后续轮次再切回 Socratic 收敛”

下一刀再继续往下，就应该开始补：

1. 更明确的 phase 切换条件
2. 更完整的圆桌发散阶段编排
3. `GoldenMetallurgist` 的真正后台 orchestrator 输入输出

## 11. 坩埚模块切换卡顿的首刀收口

针对“本地切到黄金坩埚也要等几秒”的体感问题，本轮先没有误判为后端慢，而是先拆启动链：

1. `chat-load-context` 并不是切模块即触发，而是首条用户消息发送时才触发
2. 坩埚聊天历史文件很小，不构成主要延迟来源
3. soul 文档与 profile 解析量级只有毫秒级

因此首刀先收前端装配策略，而不是去乱动后端协议。

本次改动：

1. `src/App.tsx` 不再在每次切入坩埚时都重新 cold mount 整棵坩埚子树
2. 首次进入坩埚后，`CrucibleWorkspace + ChatPanel` 保活；后续只做显示/隐藏切换
3. 坩埚右侧 `ChatPanel` 的 `isOpen` 改为跟随当前模块状态，避免隐藏态仍按“当前可见”心智继续初始化

这一步的目标很克制：

- 先压掉“切模块像重新开页面”的体感延迟
- 不在这一刀里同时改 socket 协议、上下文装载、视觉层或 soul 注册方式

如果这刀还不够，再继续往下拆：

1. 坩埚空态黑板的重视觉层
2. `soulRegistry` 客户端顶层 YAML parse
3. 首挂载阶段的 observer / snapshot 副作用

## 12. 中屏重新收回“黑板”边界

验收后发现中屏出现了两类回退：

1. 又开始用多块提示卡解释“中屏是什么”
2. 又把右侧会话内容改写后同步到了中屏，造成黑板和 chatbox 的边界变糊

这轮修正只围绕一个原则：

- 中屏是黑板，不是第二个会话区

本次收口：

1. `server/crucible.ts`
   - `presentables` 默认只保留 1 条
   - 上板内容统一压成 2-3 个板书 bullet
   - 如果板书内容和右侧 utterance 只是近似复述，则直接过滤不上板
2. `src/components/crucible/CrucibleWorkspaceView.tsx`
   - 删除中屏里多余的“我是谁 / 我不同步什么 / 我现在在干嘛”说明块
   - 删除“对应右侧这句”复述区
   - 黑板正文改成更短的标题 + bullets，不再像一篇小文章

这刀的目标不是美化，而是重新把认知负担压回去：

1. 右侧负责对话推进
2. 中屏只负责挂结论性板书
3. 用户一眼就能看出两者不是同一层东西

## 13. 继续按奥卡姆剃刀压 header 和板书文案

进一步验收后，又暴露出两处“信息没有继续收干净”的问题：

1. 中屏 `Blackboard Focus` 下方的几行板书有时不够完整，像被切碎
2. 左中右 header 还在讲太多不必要的话，风格不统一

本轮继续压缩：

1. `server/crucible.ts`
   - 黑板内容优先按原始换行分条，而不是粗暴按标点切句
   - 这样能保住“冲突地图 / 左侧 / 右侧 / 下一刀”这种更完整的板书语义
2. `src/components/crucible/CrucibleWorkspaceView.tsx`
   - 整块删除“议题锁定中”那层中间 header
   - 中屏只保留顶部总 header 和黑板主体
   - `Blackboard Focus` 改成中文标签 `黑板焦点`
   - 左侧目录标题也切到同一套小标签样式
3. `src/components/ChatPanel.tsx`
   - 删除“右侧对话是主线...”和“上下文已加载”小字
   - 保留 `标题待定`，并把标题字级抬高到更像一个真正的右侧标题

这轮的目标很明确：

1. 黑板文字先求完整、再求短
2. header 只保留定位，不承担解释
3. 左中右用同一套“标签 + 标题”层级说话
