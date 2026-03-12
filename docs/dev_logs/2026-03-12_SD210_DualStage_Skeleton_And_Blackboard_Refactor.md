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
