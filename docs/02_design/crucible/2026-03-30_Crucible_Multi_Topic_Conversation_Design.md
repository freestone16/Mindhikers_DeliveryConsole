# GoldenCrucible SaaS 多 Topic 并行会话设计

> 更新时间：2026-03-30
> 适用分支：`MHSDC-GC-SSE`
> 当前定位：新特性设计评估，暂不要求赶本轮 `SAAS` 上线

## 1. 一句话结论

这件事在当前 `SAAS` 架构下是能做的，而且不需要推翻重做。

原因很简单：

- 后端已经是 `workspace -> conversations/* -> active_conversation.json` 的结构
- 前端已经有历史对话列表、详情读取、激活恢复
- `turn/stream` 已经接受 `conversationId`，天然支持“回到原话题继续聊”

所以这个需求的本质不是“新增多会话底层”，而是把现在偏技术视角的 `conversation persistence`，升级成用户可感知的“多 topic 工作流”。

## 2. 用户要的到底是什么

用户描述可以收敛成以下产品能力：

1. 同一个用户可以同时维护多条话题线
2. 一个话题没聊完，可以先切去另一个话题继续推进
3. 每个话题按过一次 `Save` 后，之后可以随时回来继续
4. 恢复时要回到该话题自己的上下文，而不是串到别的话题

这里的“同时推进”当前按产品语义理解为：

- 同一账号下维护多条线程
- 支持切换、恢复、续聊

当前不把它定义成：

- 同一页面真正并排跑多个实时 SSE 对话面板
- 同一用户同时发起多个长流式推理并共享一个 UI 状态容器

如果只是前者，当前架构足够承接。

## 3. 当前架构已经具备的能力

### 3.1 后端数据模型其实已经接近成型

当前每个 workspace 下已经有：

- `conversations/<conversationId>.json`
- `conversations/index.json`
- `active_conversation.json`

也就是说，“一个用户有多条 conversation” 这件事，数据层已经成立。

### 3.2 conversation 已经是天然的话题单元

当前 `server/crucible-persistence.ts` 中：

- 每轮对话会 append 到指定 `conversationId`
- conversation 会保存：
  - `topicTitle`
  - `messages`
  - `turns`
  - `artifacts`
  - `sourceContext`
- 还会更新 conversation index 与 active pointer

这已经非常接近“一个话题 = 一条 conversation”。

### 3.3 前端也已经有最小恢复闭环

当前前端已经有：

- 历史列表：`GET /api/crucible/conversations`
- 读取详情：`GET /api/crucible/conversations/:conversationId`
- 激活恢复：`POST /api/crucible/conversations/:conversationId/activate`
- 标题更新 / 归档：`PATCH /api/crucible/conversations/:conversationId`

所以“从列表里点开旧话题继续聊”在技术上已经不是空想，而是半成品状态。

## 4. 现在为什么用户还感觉不到“多话题并行”

### 4.1 入口语义还是“单当前会话”

当前 SaaS 主界面启动时优先恢复：

1. `active conversation`
2. 否则 fallback 到 `autosave`

这让系统内部虽然有多条 conversation，但用户视觉上仍像只有一个“当前坩埚”。

### 4.2 `Save` 语义还是本地快照，不是“保存话题”

当前聊天区的 `S/L`：

- `S`：把当前 local snapshot 复制到另一个 localStorage key
- `L`：从本地 backup key 载回

这更像开发期临时保险丝，不是 SaaS 用户理解里的：

- “保存这条 topic，稍后再继续”

换句话说，用户要的是“保存话题”，当前系统给的是“保存本地快照副本”。

### 4.3 缺少一个明确的“新话题”动作

虽然 conversation 可以有很多条，但现在新 conversation 的诞生更多依赖：

- 切换外部 `topicTitle`
- 或首轮请求自然生成 `conversationId`

对 SaaS 用户来说，还缺一个明确入口：

- `New Topic`
- `另起话题`

### 4.4 autosave 仍是 workspace 级单文件

当前 `autosave.json` 是按 workspace 维度存一份，不是按 conversation 维度多份。

这意味着：

- 已经正式进入 conversation 的对话，恢复主要靠 conversation 文件，问题不大
- 但“尚未形成正式 conversation 的临时草稿”还不是真正多话题化

## 5. 推荐方案：分两层做

## 5.1 Phase A：最小可落地版

目标：
在不重做底层的前提下，把“多条话题线切换恢复”做成可用产品能力。

核心原则：

- 一个 topic 就是一条 `conversation`
- 继续复用现有 `workspace + conversation + active pointer`
- 不先追求“零轮对话草稿保存”
- 先把“聊过至少一轮的话题，可随时切换恢复”做稳

### Phase A 产品定义

1. 新增 `New Topic` 入口
2. 当前话题首轮发出后自动生成 `conversationId`
3. 话题进入 conversation 后，自动出现在 topic 列表 / 历史列表里
4. 点击某条 topic 即激活该 conversation 并恢复
5. `Save` 按钮改成“保存当前话题”，不再暴露为本地备份心智

### Phase A 技术上基本不用重写后端

后端已有能力可直接复用：

- conversation list
- conversation detail
- conversation activate
- topic title update
- active conversation pointer

真正要改的重点在前端产品层：

- 把 `历史对话` 升级成 `话题列表 / Topic Switcher`
- 给当前工作区增加显式 `New Topic`
- 把 `Save` 从 local backup 语义改成用户语义

### Phase A 对 Save 的建议语义

推荐这样定义：

- 若当前已有 `conversationId`
  - `Save` 代表“确认保留这个话题，并更新标题/状态”
- 若当前还没有 `conversationId`
  - 文案提示“发送第一轮后会自动保存为新话题”

这样可以避免为了第一版强行补一个新的 draft 持久化模型。

## 5.2 Phase B：完整版（真正对齐“按 Save 就能留档”）

如果要严格满足用户这句：

> 每个话题只要按过 save 就会保存进度随时再开

那就需要补齐“未开始正式轮次前，也能独立保存”的能力。

### Phase B 需要新增的能力

1. 新增 `draft conversation` 创建接口
2. 允许在没有首轮 assistant 回复前，就生成 `conversationId`
3. 为每条 conversation 保存独立 snapshot，而不是只靠 workspace 级 `autosave.json`
4. 切换 topic 时，能恢复该 topic 自己最后一次保存的 UI snapshot

### 推荐的数据方向

推荐在现有 conversation 文件上扩，而不是再造一套平行模型：

- 继续保留 `messages / turns / artifacts`
- 增加可选字段：
  - `snapshot`
  - `lastSavedAt`
  - `saveSource`

这样能保持“话题实体只有一个”，避免：

- conversation 一套
- autosave/draft 又一套

最后越做越分裂。

## 6. 我对实现路径的判断

## 6.1 如果只要“能切换并续聊”，当前架构已经有 70% 到 80%

原因：

- conversation 已经存在
- 多 conversation 已经存在
- active pointer 已经存在
- history restore 已经存在

差的主要不是数据底盘，而是产品入口和用户语义。

## 6.2 如果要“Save 后哪怕没正式聊完也绝不丢”，还差一小段持久化收口

这段缺口主要是：

- 当前 `S/L` 仍是 localStorage 备份
- 当前 autosave 仍是 workspace 单文件
- 当前 conversation detail 是从 turn/artifact 重建 snapshot，不是精确保留“上次 UI 状态”

所以：

- `Phase A` 可以较快落地
- `Phase B` 才是真正产品级“保存进度”

## 7. 推荐的 feature 范围

本特性建议单独作为一个新的 SaaS feature，而不是塞进当前上线窗口。

推荐拆成：

### Feature V1

- `New Topic`
- Topic 列表
- 会话切换 / 恢复
- 当前话题重命名
- 归档旧话题
- 首轮后自动成为可恢复 topic

### Feature V1.5

- `Save` 正式改为 conversation 级保存
- 每条 conversation 拥有独立 snapshot
- 支持“尚未完整聊完”的中间状态恢复

### Feature V2

- pinned topics
- topic tags
- 最近访问
- 话题搜索
- 多设备恢复一致性

## 8. 风险与注意事项

### 8.1 不要把“active”误解成“只能有一条 conversation”

当前 `active` 更像“当前正在看的那条”。

它不应该被理解成：

- 这个 workspace 只能存在一条 conversation

否则会误伤现有设计。

### 8.2 不要继续把 Save 留在 local-only 语义

对 SaaS 用户而言，`Save` 默认应理解为服务端可恢复，而不是浏览器本地副本。

本地 `S/L` 可以保留，但应该降级为：

- debug / advanced fallback

而不应再作为主产品能力对外暴露。

### 8.3 不要为“多话题”重新引入 projectId 主身份

当前正确主身份应继续是：

- `workspaceId`
- `conversationId`

`projectId / scriptPath` 最多作为 source context 或兼容字段。

## 9. 最终建议

最终建议非常明确：

1. 把这件事定义成新的 SaaS feature
2. 先做 `Phase A`，快速把“多话题切换与恢复”做成产品可见能力
3. 再做 `Phase B`，把 Save 真正升级成 conversation 级持久化

也就是说：

- 现在不需要重构底盘
- 先把现有 conversation/history 骨架扶正
- 再补 Save 语义和 draft 持久化

这是当前架构下最省改动、也最稳的一条路。
