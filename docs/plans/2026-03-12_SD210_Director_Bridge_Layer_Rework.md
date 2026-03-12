# SD210 Director Bridge Layer Rework Plan

> 日期：2026-03-12
> 状态：Draft
> 适用分支：`director0309`

## 1. 背景

Director 主线当前边界已重新定义：

- `Skill` 负责导演语义理解与专业判断
- `DeliveryConsole` 负责桥梁层，把导演意图翻译成项目内部状态与中部 UI 行为
- `UI` 只负责忠实反馈、确认、取消、继续输入与历史展示

上一轮已完成：

- Director Chatbox 切回 Antigravity Director Skill 的 `chat_edit` prompt
- TextReveal 单行/不换行修改已验证成功
- Chatbox 修改后预览图自动刷新已验证成功

但真实验收暴露的新问题，说明当前最薄弱处已经从“Skill 注入链路”转移到“桥梁层动作抽象”。

## 2. 本轮目标

只处理 Director 主线，按以下顺序收敛：

1. 补 Director 桥梁层
2. 收紧 Director Skill 到“理解意图 + 调用桥接动作”
3. 修 ChatPanel/UI 忠实反馈链路

## 3. 现存问题拆分

### 3.1 Skill 侧

- 当前 prompt 仍默认让模型直接产出 `update_option_fields` 的底层参数

### 3.2 桥梁层

- `1-4 -> chapterId / optionId` 没有被系统显式接管
- `A/B/C/D/E/F -> 内部 type` 没有被系统显式接管
- “互联网素材 / 我自己上传 / 用户截图 / 录屏”等别名没有统一映射
- 冲突表达（例如“互联网素材，我自己上传”）没有集中判定逻辑
- 因为缺少上述映射与判定，当前 `1-4`、`D`、类型别名、混合表达的理解稳定性被错误压给了 Skill
- confirm 卡片依旧展示底层 tool 名称，而不是用户可审阅的动作

### 3.3 UI 侧

- streaming 时输入框被整个禁用，无法边看边改草稿
- assistant 流式消息与 tool confirm 之间存在重复落消息风险
- 历史中会混入 `[System Log: Executed tool ...]`
- confirm 卡片只显示 `update_option_fields`，不显示真实将执行的变更

## 4. 方案总览

核心思路：不要继续让 LLM 直接操纵项目内部 patch，而是在 Director 适配器前面补一层“桥接动作层”。

新的调用链：

`Director Skill(chat_edit)` -> `Director Bridge Actions` -> `DirectorAdapter.executeAction()` -> `delivery_store/director_state` -> `UI`

其中：

- Skill 负责听懂用户想改什么、导演上希望达到什么效果、何时需要追问
- Bridge 负责把自然语言意图映射为项目内部动作
- Adapter 只负责执行已结构化的动作并写盘

这里要特别区分两类“语义”：

- `导演语义`
  - 例如“这一条更适合做成互联网素材”“这句金句要单行压住”“这里不该继续文生视频”
  - 这是 Skill 的职责
- `项目语义`
  - 例如 `1-4` 指哪张卡、`D` 对应什么内部类型、“我自己上传”应归到哪个枚举、冲突表达要不要拦截
  - 这是 Bridge 的职责

本轮的关键，不是继续增强导演 Skill 的项目知识，而是把项目语义从 Skill 中剥离出来。

## 5. 桥梁层设计

### 5.1 双层动作契约

桥梁层需要明确区分两套契约：

1. `Skill -> Bridge` 的意图契约
2. `Bridge -> Adapter` 的执行契约

错误做法是让 Skill 直接产出执行契约；正确做法是让 Skill 只产出意图契约。

#### A. Skill -> Bridge：意图契约

Skill 只能调用高层动作，不接触：

- `chapterId`
- `optionId`
- 内部 `type` 枚举
- `update_option_fields`
- `updates.props` 这类 raw patch 结构

建议的高层动作：

- `director_request_type_change`
- `director_request_text_change`
- `director_request_template_change`
- `director_request_layout_adjustment`
- `director_request_prompt_regeneration`
- `director_request_option_delete`

这些动作都只允许出现用户可理解字段，例如：

- `targetRef`
  - 例如 `1-4`
- `requestedTypeLabel`
  - 例如 `D` / `互联网素材` / `我自己上传`
- `requestedOutcome`
  - 例如 `单行显示` / `缩边距`
- `replacementText`
  - 用户给出的新文案
- `reason`
  - 导演判断或用户要求摘要

#### B. Bridge -> Adapter：执行契约

Bridge 在完成解析、映射、冲突判定后，才生成底层执行动作，例如：

- `update_option_fields`
- `update_prompt`
- `regenerate_prompt`
- `delete_option`

此时 Bridge 才补齐：

- `chapterId`
- `optionId`
- 内部 `type`
- 最终 `updates`

所以 `update_option_fields` 不该再成为 Skill 的第一层工具，而应只存在于 Bridge 与 Adapter 之间。

### 5.2 目标定位解析

桥梁层统一负责：

- 从 skeleton 中解析 `1-4 -> chapterId / optionId`
- 检查是否存在目标
- 检查序号是否越界
- 生成可审阅的目标描述，如“第 1 章第 4 个方案”

若定位失败：

- 不让模型盲猜真实 ID
- 直接返回可操作澄清，例如“当前第 1 章只有 3 个方案，请确认你要改哪一个”

这一步本质上是项目 UI 索引解析，不属于导演 Skill 的认知范围。

### 5.3 类型映射表

桥梁层建立 Director 专属枚举映射：

- `A = remotion`
- `B = seedance`
- `C = artlist`
- `D = internet-clip`
- `E = user-capture`
- `F = infographic`

并补一份别名字典：

- `互联网素材 / 网素材 / 网上找片段 / 网络素材 -> internet-clip`
- `我自己上传 / 自己上传 / 用户素材 / 用户截图 / 用户录屏 / 本地素材 -> user-capture`
- `文生视频 / AI 视频 / 生成视频 -> seedance`
- `Remotion / 动画模板 / 模板动画 -> remotion`
- `信息图 / infographic -> infographic`
- `Artlist / 素材库 / stock footage -> artlist`

注意：这里的映射是宿主项目的内部约定，不是导演专业知识。它必须只存在于 Bridge，不应该写进导演本体的专业判断里。

### 5.4 冲突判定

由桥梁层而不是 Skill 本体统一裁决冲突表达：

- “互联网素材，我自己上传”
- “改成 D，但是我要自己录屏”
- “做成 Remotion，不过用外部素材”

规则：

- 若一句话命中多个互斥 `type`，标记为 `needs_clarification`
- Skill 只需要收到“需要澄清”的结构化反馈，再用中文追问
- 不允许默认选择一个类型偷偷写盘

也就是说，Skill 可以负责“如何用导演口吻追问”，但不是它来决定两个互斥项目类型谁优先。

### 5.5 可审阅确认描述

confirm 卡片不再直接展示 `update_option_fields`。

桥梁层应产出人类可审阅描述，例如：

- `将把 1-4 改为 D. 互联网素材`
- `将把 2-1 的文案改为“AI 时代最稀缺的是具体表达”`
- `将为 1-2 的 TextReveal 启用单行显示`

底层 patch 只作为 debug 信息保留，不作为主展示文案。

### 5.6 一个具体例子

用户输入：

- `把 1-4 改成 D，我自己上传`

错误链路（当前问题）：

- Skill 直接尝试生成：
  - `update_option_fields({ chapterId, optionId, updates: { type: "..." } })`
- 结果会把以下事情都压给模型：
  - `1-4` 如何找真实目标
  - `D` 映射什么内部类型
  - “我自己上传”是否与 `D` 冲突
  - 冲突时是否要澄清

正确链路（本方案）：

1. Skill 只提交高层意图：
   - `director_request_type_change`
   - `targetRef = "1-4"`
   - `requestedTypeLabel = "D，我自己上传"`
2. Bridge 解析：
   - `1-4 -> chapterId/optionId`
   - `D -> internet-clip`
   - `我自己上传 -> user-capture`
   - 命中互斥类型，判定 `needs_clarification`
3. UI 展示或 Skill 追问：
   - `你说了“D. 互联网素材”和“我自己上传”，这两种类型是冲突的。你要改成哪一种？`

整个过程中，导演 Skill 不需要知道内部 `type` 枚举，也不需要自己拼 `updates`。

## 6. Skill 调整方案

`chat_edit` prompt 需要收紧职责边界：

- 允许 Skill 理解用户意图、比较方案、给导演建议
- 但不再要求它直接输出项目内部字段名和 raw patch 结构
- 优先调用新的 Director Bridge Actions
- 只有桥梁层动作已明确结构字段时，才由系统转换到底层执行动作

prompt 中需要强调：

- 序号引用保留为用户视角的 `targetRef`，不要求 Skill 解析真实 ID
- 类型表达保留为用户原话或用户可理解标签，不要求 Skill 产出内部枚举
- 命中冲突表达时，允许 Skill 请求澄清，但冲突检测规则来自 Bridge

prompt 里需要删掉或替换的内容：

- “优先用 `update_option_fields`”
- “你必须从骨架索引中找到真实 `chapterId / optionId`”
- “直接写入 `updates.type/template/props`”

prompt 里需要改成：

- “优先调用 Director Bridge Actions”
- “保留 `targetRef` 与用户原始类型说法，让系统桥梁层去解析”
- “只有当桥梁层动作明确允许的字段出现时，才传高层参数，不直接拼 raw patch”

## 7. UI 调整方案

### 7.1 输入状态机

目标：streaming 期间允许继续编辑草稿，但不允许重复发送。

调整方式：

- textarea 不再因 `isStreaming` 被禁用
- 发送按钮在 streaming 时禁用
- Enter 提交在 streaming 时拦截
- 用户仍可继续编辑输入框内容，为下一条消息做准备

### 7.2 流式消息单次落盘

统一 assistant 消息生命周期：

- `chat-chunk` 只更新当前 streaming 缓冲
- `chat-done` 才把缓冲落成 1 条 assistant 消息
- `chat-action-confirm` 到来时，若已有 streaming 缓冲，先只落 1 次，再显示确认卡
- 避免 `setStreamingContent` 回调里再嵌套 `setMessages` 导致重复追加

### 7.3 历史清洁

历史中不再保存：

- `[System Log: Executed tool ...]`

建议做法：

- 为 `actionConfirm` / `actionResult` 定义显式消息类型或最小展示文本
- 发给 LLM 的历史只保留用户消息、正常 assistant 文本、必要的确认结果摘要
- 内部 debug 信息只进日志，不混入会话上下文

### 7.4 确认卡片改造

确认卡片展示三层信息：

- 主描述：用户可审阅动作
- 次描述：必要时展示目标卡片与类型标签
- debug 折叠区：仅开发时可看原始 action/payload

默认界面只显示主描述，不再直接把 `update_option_fields` 暴露给用户。

## 8. Bridge 接口草案

这一节把 Bridge 的接口边界写具体，避免实现时重新滑回“让 Skill 直接拼 raw patch”。

### 8.1 总体原则

Bridge 需要明确分成两层：

1. `Skill -> Bridge`：高层意图输入
2. `Bridge -> Adapter`：底层执行计划

错误形态：

- Skill 直接产出 `update_option_fields({ chapterId, optionId, updates })`

正确形态：

- Skill 只产出“我想把 `1-4` 改成 `互联网素材`”
- Bridge 负责解析目标、映射类型、判定冲突、生成 confirm 文案
- Adapter 只执行 Bridge 输出的底层计划

### 8.2 推荐的单入口动作

推荐只暴露一个高层工具给 Director Chat：

- `director_bridge_action`

通过 `intentType` 区分意图：

- `change_type`
- `change_text`
- `change_template`
- `adjust_layout`
- `regenerate_prompt`
- `delete_option`

这样做的好处是：

- Skill 只需要学会一个稳定入口
- 后续新增意图类型不需要继续扩 tool 面
- 更容易把执行层工具隐藏在 Bridge 后面

### 8.3 Skill -> Bridge 入参草案

```ts
type DirectorBridgeIntentType =
  | 'change_type'
  | 'change_text'
  | 'change_template'
  | 'adjust_layout'
  | 'regenerate_prompt'
  | 'delete_option';

interface DirectorBridgeActionInput {
  intentType: DirectorBridgeIntentType;
  targetRef: string; // 用户视角，例如 "1-4"
  userRequest: string; // 用户原话
  requestedTypeLabel?: string; // 例如 "D" / "互联网素材" / "我自己上传"
  replacementText?: string; // 直接替换文案时使用
  requestedTemplate?: string; // 用户明确要求模板名时使用
  layoutIntent?: string; // 例如 "单行显示" / "缩边距" / "更紧凑"
  styleHint?: string; // regenerate_prompt 使用
  rationale?: string; // Skill 的导演判断摘要
}
```

这里要注意：

- `targetRef` 保留用户说法，不在 Skill 层展开真实 ID
- `requestedTypeLabel` 保留用户说法，不在 Skill 层转换内部枚举
- `layoutIntent` 保留导演意图，不在 Skill 层直接写 props patch

### 8.4 Bridge 解析结果草案

```ts
type DirectorBridgeResolutionStatus =
  | 'ready_to_confirm'
  | 'needs_clarification'
  | 'invalid_target'
  | 'unsupported_intent';

interface DirectorBridgeResolution {
  status: DirectorBridgeResolutionStatus;
  target?: {
    targetRef: string;
    chapterSeq: number;
    optionSeq: number;
    chapterId: string;
    optionId: string;
    chapterTitle?: string;
    optionName?: string;
  };
  normalizedIntent?: {
    intentType: DirectorBridgeIntentType;
    resolvedType?: 'remotion' | 'seedance' | 'artlist' | 'internet-clip' | 'user-capture' | 'infographic';
    resolvedTemplate?: string;
    resolvedTextPatch?: Record<string, unknown>;
    resolvedPropsPatch?: Record<string, unknown>;
    regenerateHint?: string;
  };
  clarification?: {
    reason:
      | 'target_not_found'
      | 'type_conflict'
      | 'ambiguous_alias'
      | 'missing_required_value';
    message: string;
    choices?: string[];
  };
  confirmCard?: {
    title: string;
    summary: string;
    targetLabel: string;
    diffLabel?: string;
  };
  executionPlan?: {
    actionName: 'update_option_fields' | 'update_prompt' | 'regenerate_prompt' | 'delete_option';
    actionArgs: Record<string, unknown>;
  };
}
```

关键纪律：

- 只有 `ready_to_confirm` 才生成 `executionPlan`
- `chapterId/optionId/updates` 只允许出现在 `executionPlan`
- `needs_clarification/invalid_target` 直接回澄清文本，不进入执行

### 8.5 典型分支

#### 分支 A：目标越界

用户：

- `把 1-4 改成 D`

如果第 1 章只有 3 个方案：

```json
{
  "status": "invalid_target",
  "clarification": {
    "reason": "target_not_found",
    "message": "当前第 1 章只有 3 个方案，请确认你要修改哪一个。"
  }
}
```

#### 分支 B：类型冲突

用户：

- `把 1-4 改成 D，我自己上传`

Bridge 返回：

```json
{
  "status": "needs_clarification",
  "clarification": {
    "reason": "type_conflict",
    "message": "你同时表达了“D. 互联网素材”和“我自己上传”，这两种类型冲突。你要改成哪一种？",
    "choices": ["D. 互联网素材", "E. 我自己上传"]
  }
}
```

#### 分支 C：可确认执行

用户：

- `把 1-4 改成互联网素材`

Bridge 返回：

```json
{
  "status": "ready_to_confirm",
  "confirmCard": {
    "title": "确认修改",
    "summary": "将把 1-4 改为 D. 互联网素材",
    "targetLabel": "第 1 章 · 方案 4",
    "diffLabel": "type -> internet-clip"
  },
  "executionPlan": {
    "actionName": "update_option_fields",
    "actionArgs": {
      "chapterId": "ch1",
      "optionId": "opt4",
      "updates": {
        "type": "internet-clip"
      }
    }
  }
}
```

### 8.6 confirm 卡片载荷草案

UI 不应只接收一段 description 字符串。

建议改成结构化载荷：

```ts
interface DirectorConfirmCardPayload {
  title: string;
  summary: string;
  targetLabel: string;
  diffLabel?: string;
  debugActionName?: string;
  debugActionArgs?: Record<string, unknown>;
}
```

默认展示：

- `title`
- `summary`
- `targetLabel`
- `diffLabel`

调试折叠区才显示：

- `debugActionName`
- `debugActionArgs`

### 8.7 chat-stream / execute 分工草案

建议后端分工如下：

1. `chat-stream`
   - LLM 只调用 `director_bridge_action`
   - 服务端执行 `resolveDirectorBridgeAction()`
   - 若结果是 `needs_clarification/invalid_target`，直接发 assistant 文本
   - 若结果是 `ready_to_confirm`，发结构化 confirm 卡片

2. `chat-action-execute`
   - 只接收 Bridge 已经生成好的 `executionPlan`
   - Adapter 按既有执行工具落盘

这样可以保证：

- `update_option_fields` 不再直接暴露给 Director Skill
- confirm 卡片展示的是用户动作，而不是底层 patch
- execute 阶段不再做项目语义猜测

### 8.8 第一轮最小落地范围

第一轮建议只先支持 4 类高频意图：

- `change_type`
- `change_text`
- `adjust_layout`
- `regenerate_prompt`

先不扩到：

- 复杂模板整体替换
- 多字段联动 patch
- 跨卡片复制结构

理由：

- 这四类已覆盖目前最频繁验收问题
- 足够验证 Bridge 架构是否稳定

## 9. 预计改动文件

核心：

- `server/expert-actions/director.ts`
- `server/expert-actions.ts`
- `server/index.ts`
- `server/chat.ts`
- `src/components/ChatPanel.tsx`
- `src/types.ts`

可能新增：

- `server/director-bridge.ts`
- `src/components/chat/` 下的确认卡片子组件

Skill 侧：

- `~/.gemini/antigravity/skills/Director/prompts/chat_edit.md`

## 10. 实施顺序

### Phase A：桥梁层

1. 抽出 Director bridge 解析器
2. 实现目标定位与类型/别名映射
3. 实现冲突判定
4. 让 confirm 文案从 bridge 生成
5. 保持底层 adapter 执行逻辑尽量少改

### Phase B：Skill

1. 修改 `chat_edit` prompt，改为面向桥接动作
2. 删除 prompt 中“默认直接写 raw patch”的表述
3. 补充冲突表达与澄清纪律

### Phase C：UI

1. 调整 ChatPanel 输入状态机
2. 修复 assistant 重复追加
3. 清洁历史消息
4. 升级确认卡片文案

## 11. 验证方案

### 自动化

- 新增/更新 Director bridge 单测
  - `1-4` 解析成功
  - `D -> internet-clip`
  - “我自己上传” -> `user-capture`
  - “互联网素材，我自己上传” -> `needs_clarification`
- 更新 ChatPanel 测试
  - streaming 时输入框可编辑
  - assistant 流式消息只落一次
  - confirm 卡片显示桥梁层描述
- 保留现有 Director adapter / ChapterCard / Phase2View 测试

### 手测

- “把 1-4 改成 D”
- “把 1-4 改成互联网素材”
- “把 1-4 改成我自己上传”
- “把 1-4 改成互联网素材，我自己上传”
- streaming 过程中修改输入框草稿，不发送下一条
- 确认执行后，历史不再出现 `[System Log: Executed tool ...]`

## 12. 风险与约束

- 若一次性同时重构 bridge、adapter、UI，容易把责任边界再次打乱，因此必须分三阶段提交
- Director Skill 在全局 Antigravity 技能库，修改后必须保持快照备案
- 这轮不处理 Phase3/4 渲染回归，只聚焦 Director Chat 编辑链路

## 13. 推荐提交边界

建议最终拆成 3 组 commit：

1. `feat(director): add bridge-layer target/type resolution for chat edits`
2. `fix(skill): tighten director chat_edit prompt to bridge actions`
3. `fix(chatpanel): keep draft editable during streaming and clean confirm history`

---

结论：本轮不应继续补系统层导演特判，应优先把 Director 桥梁层抽象为显式动作与映射表，再让 Skill 和 UI 各自退回正确边界。
