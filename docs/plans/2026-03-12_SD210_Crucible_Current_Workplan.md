# SD210 黄金坩埚当前工作计划

> 日期：2026-03-12
> 当前工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 历史落盘分支：`codex/sd208-golden-crucible`
> 状态：当前执行计划 / 统一版
> 依据：当前代码现场 + `2026-03-12_SD210_Crucible_Interaction_Contract_And_Bridge.md` + 上个窗口交接信息
> 迁移说明：本文形成于旧 worktree 阶段；当前阅读与执行请以 `MHSDC` 目录体系为准，不再以 `/Users/luzhoua/DeliveryConsole` 作为启动入口。

## 1. 当前判断

黄金坩埚这一轮已经不是“继续修 UI 细节”，而是要把下面两件事收成一个稳定中间态：

1. 中屏真正从“第二套问答区”收成“黑板主视图”
2. 运行时真正从“题卡心智 + 兼容字段”收成 `skillOutput -> bridgeOutput -> UI`

当前已完成：

1. 对话-呈现协议已落盘
2. `server/crucible.ts` 已接出 `dialogue + presentables + turn_log` 首版
3. 中屏主路径已开始从 `hostRouting` 启发式分流切向 bridge 协议
4. `hostRouting.test.ts` 已补上最小回归护栏

当前未收口：

1. `src/components/crucible/CrucibleWorkspaceView.tsx` 仍明显残留“卡片面板感”
2. 前端状态命名与流程仍残留 `clarificationCards` / `generatedCards` / “答题卡”心智
3. `server/crucible.ts` 仍保留 `speaker / reflection / focus` 兼容字段
4. 前后端还没有共享一套明确的 bridge 类型
5. `turn_log` 还是首版，`phase` 与 `presentable kind` 还不够稳

补充判断：

本轮阶段性保存尚未形成新 commit。当前工作区是脏状态，因此本计划只约束黄金坩埚链路，不借机清理其他模块。

## 2. 本轮目标

本轮目标只收两条主线，不扩散：

### 主线 A：中屏黑板主视图收口

目标是让中屏只像“黑板”，不再像“另一套题卡答题区”。

### 主线 B：bridge 协议与类型收口

目标是让前后端都围绕 `dialogue + presentables + turn_log` 工作，逐步摆脱旧的 `cards` 心智与兼容字段。

## 3. 本轮非目标

本轮不做以下事项，避免继续把问题后移：

1. 不接真实 `GoldenMetallurgist` 多工具导演编排
2. 不接主动 / 被动互联网搜索真链路
3. 不推进论文产出或项目创建闭环
4. 不重构无关模块或共享宿主层
5. 不把视觉语言升级扩散到全仓

## 4. 工作拆解

### 4.1 工作流 A：中屏黑板主视图收口

重点文件：

- `src/components/crucible/CrucibleWorkspaceView.tsx`
- `src/components/crucible/types.ts`
- `src/components/crucible/storage.ts`

必须完成：

1. 把中屏顶部说明区继续压薄，弱化“阶段说明面板”的存在感。
2. 把主视觉重心进一步推向当前 `active presentable`，不要再让用户感觉是在“看说明 + 看卡片”。
3. 降低 `reference` 渲染里的“三段式小卡片”感，尽量向单块黑板阅读面靠拢。
4. 左侧目录继续保留，但只作为索引，不强化“步骤列表 / 回合列表”感觉。
5. 清理前端状态命名里的答题卡语义，至少不再让主流程由 `clarificationCards` 这个概念主导。

建议实现方式：

1. 中屏状态模型从“题卡数组”改成“presentables + activePresentableId”。
2. `submitNotice` 仅保留必要的轻提示，不再像单独的流程卡片。
3. `showEmptyState` 保留，但已开始后尽量减少解释性容器层级。

验收标准：

1. 中屏默认像黑板，不像表单或答题区。
2. 用户不会被暗示“要来中屏填写回答”。
3. 当前主视图的视觉焦点始终是 active presentable。

### 4.2 工作流 B：前端去 cards 心智

重点文件：

- `src/components/crucible/CrucibleWorkspaceView.tsx`
- `src/components/crucible/types.ts`
- `src/components/crucible/mockRound.ts`
- `src/components/crucible/storage.ts`

必须完成：

1. 新建或明确 bridge 相关前端类型，例如：
   - `CrucibleDialogue`
   - `CruciblePresentable`
   - `CrucibleTurnPayload`
2. 把当前 `generatedPresentables -> generatedCards -> clarificationCards` 这套过渡映射拆掉。
3. 快照结构同步改成围绕 bridge 输出保存，而不是保存“题卡答案状态”。
4. 清理 `mockRound.ts` 中不再符合当前协议的旧心智样例，避免继续误导后续实现。

验收标准：

1. 前端主状态里不再把本轮核心对象称为 `cards`。
2. 快照恢复后，中屏恢复的是“黑板内容”，不是“待答题卡”。

### 4.3 工作流 C：后端 bridge 协议收口

重点文件：

- `server/crucible.ts`

必须完成：

1. 把当前返回结构进一步收紧到：
   - `dialogue`
   - `presentables`
   - `source`
   - `warning`
   - `searchRequested / searchConnected`
2. 把 `speaker / reflection / focus` 这组兼容字段明确标记为过渡态，并在前端迁移完成后删掉。
3. 让 `materializePresentables()` 与 `classifyPresentableType()` 更明确服务于 bridge，而不是继续为 UI 卡片格式兜底。
4. 继续收 `turn_log`，至少把 `phase` 从硬编码 `topic_lock` 改成可推导字段，避免后续日志不可回放。

验收标准：

1. 前端可只消费 bridge 输出完成主流程。
2. 后端返回协议里不存在新的“旧心智回流”字段。
3. `turn_log` 能分清 skill 输出和 bridge 输出。

### 4.4 工作流 D：测试与最小验证补齐

重点文件：

- `src/components/crucible/hostRouting.test.ts`
- 必要时新增 bridge / 类型相关测试

必须完成：

1. 保留 `hostRouting` 作为兜底路径，但不再把它当主链。
2. 为 bridge 主链补最小测试或至少补类型护栏，避免后续改动又退回“复制右侧原话上屏”。
3. 本轮完成后至少重新验证：
   - `npx vitest run src/components/crucible/hostRouting.test.ts`
   - `npx vite build`
   - `git diff --check`

如涉及明显 UI 行为变化，应追加一次最小人工验收：

1. 首问后中屏开始亮起
2. 右侧长追问不原样复制进中屏
3. 切换左侧目录时，中屏只切“黑板内容”，不出现“答题卡感”

## 5. 推荐执行顺序

按下面顺序推进，避免互相打架：

1. 先改前端类型与状态命名，确定中屏主状态不再围绕 `cards`
2. 再收 `CrucibleWorkspaceView.tsx` 的黑板主视图
3. 然后收 `server/crucible.ts` 的兼容字段与 turn log
4. 最后补测试和最小验证

原因：

如果先修视觉、不改状态心智，UI 很快会再次被旧 `cards` 结构拖回去；如果先删后端兼容字段、不先迁前端，又会直接打断现场链路。

## 6. 这一轮完成后的“保存点”定义

满足以下条件，才算这轮真正形成一个可保存点：

1. 中屏主视图已经明显摆脱“第二套问答区”
2. 前端主状态不再以 `cards` 为核心抽象
3. 前端主链只消费 bridge 输出即可跑通
4. 后端 `turn_log` 比当前首版更可读
5. 构建、测试、diff 检查通过

## 7. 下轮再接的事项

只有在本轮收口完成后，才进入下一层：

1. `GoldenMetallurgist` 后台导演骨架
2. `Socrates / Researcher / FactChecker / ThesisWriter` 更真实的编排
3. 主动 / 被动互联网搜索真链路
4. 更完整的 phase 迁移与论文产出

## 8. 执行结论

当前最正确的推进方式，不是继续扩协议，也不是继续补新角色，而是先把“黑板主视图 + bridge 类型 + turn log”这三个中间层收实。

一句话总结本轮：

**先把黄金坩埚从“看起来像有协议”收成“代码里真的按协议运行”。**
