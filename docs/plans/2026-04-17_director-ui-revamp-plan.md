---
title: "Director UI 改造方案（对齐 GoldenCrucible UI Architecture）"
type: design
status: draft
date: 2026-04-17
owner: OldYang
related:
  - /Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-17_UI_Architecture_Phase1-6_Implementation_Plan.md
  - /Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-16_UI_Architecture_PRD_v1.0.md
  - /Users/luzhoua/MHSDC/DeliveryConsole/Director/docs/plans/2026-04-12_director-module-governance-plan.md
---

# Director UI 改造方案（对齐 GoldenCrucible UI Architecture）

## Overview

这次不是单独把 `Director` 页面“换皮”，而是把 `DeliveryConsole` 在 `交付终端` 这一层的信息架构先收正，再让 `Director` 成为第一块落地的新样板。

核心判断：

1. 黄金坩埚最新 PRD 真正可迁移的不是某一种视觉风格，而是 **Shell 分层方式**：
   - 模块切换器
   - Session 列表
   - 中栏工作台
   - 右侧 Artifact / Context Drawer
2. `DeliveryConsole` 当前问题不是 Director 功能不够，而是 **层级混叠**：
   - 顶部有 `黄金坩埚 / 交付终端 / 分发终端`
   - 第二层又有 `影视导演 / 音乐总监 / 缩略图 / Shorts / 营销`
   - Director 内部还有 `P1 / P2 / P3 / P4`
   - 项目、文稿、聊天、调试又散落在顶部和中区
3. 因此本次改造的目标应是：
   - 先把 `DeliveryConsole` 做成一个稳定的共享壳层
   - 再把 `Director` 作为第一优先工作台重做
   - 同时给 `MusicDirector / ThumbnailMaster / ShortsMaster / MarketingMaster` 预留统一入口位

> **实施前置条件**：当前模块 `PR0 Security Hotfix（MIN-122）` 仍是阻断式前置。本文档是 UI 方案，不解锁先修安全问题的顺序。

---

## 1. 当前问题诊断

### 1.1 结构问题

| 问题 | 当前表现 | 影响 |
|---|---|---|
| 顶层层级不清 | 顶部模块切换 + 专家横向导航 + 页面内 phase 并存 | 用户难以判断“我现在是在产品层、模块层，还是工作步骤层” |
| 入口与上下文分离 | `Project / Script` 放在 Header 右侧，Director 工作台里几乎看不到来源上下文 | 进入页面后容易忘记当前操作对象 |
| Director 没有 Session 语义 | 现在更多像“一个大页面 + 当前 project 状态”，不是“一个可回到历史的视觉会话” | 不利于后续版本、回溯、阶段重进 |
| Chat / Debug / Artifact 没有统一容器 | ChatPanel 是单独侧栏，日志在 Phase2 中区，输出状态分散 | 操作焦点反复跳动 |
| 其他模块入口被平铺成同级 tab | `VisualAudit`、`Director`、`Shorts` 等都在一条线上 | 核心生产模块与工具模块语义混乱 |

### 1.2 视觉问题

| 问题 | 当前表现 | 影响 |
|---|---|---|
| 视觉重心偏散 | Header、专家导航、Phase 容器都在抢主视觉 | 进入页面后不知道先看哪 |
| 风格未形成统一语言 | 深色工业风存在，但仍混有 emoji、蓝光按钮、不同层级的硬编码色值 | 不够“像一个完整产品”，更像多个页面拼接 |
| Director 核心工作区空态过大 | P1 首页大面积空白卡片 | 看起来像“还没开始开发完”，不是“专业工作台” |
| 黄金坩埚与 Delivery 缺乏家族感 | 两边都叫 MindHikers 体系，但没有共享的骨架和叙事锚点 | 产品族感不足 |

### 1.3 机会点

黄金坩埚 PRD 已经给出了一个成熟答案：

- 左栏上：模块切换
- 左栏中：Session 列表
- 左栏下：当前上下文 / config
- 中栏：主工作流
- 右栏：artifact / 辅助上下文 / 运行态

`Director` 很适合成为 `DeliveryConsole` 第一个采用这套骨架的模块。

---

## 2. 总体改造目标

### 2.1 设计目标

1. 让 `交付终端` 从“专家 tab 集合页”升级为“共享 Shell + 各专家工作台”。
2. 让 `Director` 从“阶段页面”升级为“带 Session 感的导演工作台”。
3. 顶层继续保留 `黄金坩埚 / 交付终端 / 分发终端` 三大产品入口，但把 `Director / Shorts / Thumbnail / Music / Marketing` 下沉到 `交付终端` 内部左栏。
4. 把 `Project / Script / Model / 输出路径` 从 Header 附属信息，提升为导演工作流的持续上下文。
5. 右侧统一为 `Context Drawer`，承接：
   - Chat
   - Artifact / 输出
   - Debug / Logs
   - Handoff / Queue

### 2.2 设计红线

1. 不把黄金坩埚的浅暖纸面风格整套硬搬到 DeliveryConsole。
2. 不让 Header 再承担“全局切换 + 具体工作上下文 + 工具入口”三种职责。
3. 不把 `VisualAudit` 继续当作和 `Director / Shorts / Thumbnail` 同级的主生产模块。
4. 不在本轮先要求所有模块都完成后端 session 化；UI 可以先做“前端 session 壳”，数据契约逐步补齐。

---

## 3. 从 GoldenCrucible PRD 迁移什么，不迁移什么

### 3.1 直接迁移

| GoldenCrucible PRD 概念 | DeliveryConsole 对应实现 |
|---|---|
| `ModuleRegistry` | `DeliveryWorkstationRegistry`，统一管理 `Director / Music / Thumbnail / Shorts / Marketing / tools` |
| 左栏 Session 列表 | 当前专家的任务 / 会话 / 输出列表 |
| 中栏 `Stage` | 当前专家的主工作区 |
| 右栏 `ArtifactDrawer` | `ContextDrawer`，放聊天、产物、日志、handoff |
| `OriginBreadcrumb` | `Project / Script / Session` 来源面包屑；后续可接 `Crucible → Delivery` |
| 统一 CTA 语义 | 关键推进动作统一用赭橙主按钮，减少蓝色泛滥 |

### 3.2 适配后迁移

| GoldenCrucible PRD 概念 | DeliveryConsole 适配方式 |
|---|---|
| workspace-scoped config | 先映射为 `current project`，后续若 Delivery 接 workspace 再平滑升级 |
| Session 语义 | Director 先用 `project + script + lastUpdated` 形成轻量 session 卡；后续再落真实 `DirectorSession` |
| Artifact 抽屉 | 先放 Chat / Logs / 当前输出，后续再扩真正的 artifact 历史 |
| Channel / Persona / Skill 左栏下配置区 | Delivery 先改成 `Project Context Dock`，保留后续插入能力 |

### 3.3 不直接迁移

1. 黄金坩埚的四模块链路（Rador / Roundtable / Crucible / Writer）不是 DeliveryConsole 当前模块关系，不能机械照抄。
2. GoldenCrucible 的暖白大底不适合直接覆盖 Delivery 全局壳层。Delivery 更适合“深色壳 + 暖色工作台”的混合方案。
3. Better Auth 用户区块在 Delivery 当前不是主问题，先不以“用户头像 + workspace 设置”为优先视觉中心。

---

## 4. 新信息架构（IA）

## 4.1 三层层级

### L0：产品族切换

保留在顶栏中部，仅承担产品级切换：

- 黄金坩埚
- 交付终端
- 分发终端

这一层不再承载项目、文稿、专家、phase。

### L1：Delivery Shell

当处于 `交付终端` 时，主界面切换成三栏：

1. 左栏上：工作站切换器（专家模块）
2. 左栏中：当前工作站的 Session / 任务列表
3. 左栏下：Project Context Dock
4. 中栏：当前工作站主舞台
5. 右栏：Context Drawer

### L2：Director Workbench

`Director` 进入后，中栏再分为：

1. `StageHeader`
2. `PhaseStepper`
3. `Phase Workspace`
4. `Action Rail / Summary Strip`

---

## 4.2 推荐布局草图

```text
+--------------------------------------------------------------------------------------------------+
| Top Product Bar                                                                                  |
| MindHikers | [黄金坩埚] [交付终端] [分发终端]                     settings / audit / notifications |
+------------------------------+------------------------------------------------+------------------+
| Delivery Left Rail           | Director Stage                                 | Context Drawer   |
|                              |                                                |                  |
| 工作站切换                   | Breadcrumb / Session Title / Status / CTA      | 对话              |
| > Director                   | ------------------------------------------------| 产物              |
|   Shorts                     | Phase Stepper                                   | 日志              |
|   Thumbnail                  | ------------------------------------------------| handoff / queue   |
|   Music                      | Phase Workspace                                 |                  |
|   Marketing                  |                                                |                  |
|                              |                                                |                  |
| 当前工作站 Session 列表      |                                                |                  |
| - 当前脚本 v0.3              |                                                |                  |
| - 当前脚本 v0.2              |                                                |                  |
| - 其它项目历史               |                                                |                  |
|                              |                                                |                  |
| Project Context Dock         |                                                |                  |
| 项目 / 文稿 / 模型 / 输出路径 |                                                |                  |
+------------------------------+------------------------------------------------+------------------+
```

---

## 5. DeliveryConsole 入口重排方案

## 5.1 顶栏保留什么

### 保留

- MindHikers 品牌
- 三大产品切换
- 少量全局工具入口（设置、系统状态、通知）

### 下沉

- `Project`
- `Script`
- `专家切换`
- `聊天开关`

这些都不该继续占 Header。

## 5.2 左栏上：工作站切换器

建议改成纵向列表，统一由 Registry 渲染：

| 分组 | 项目 |
|---|---|
| Core Production | Director / Shorts / Thumbnail / Music / Marketing |
| Tools | VisualAudit |
| System | LLM Config（不作为一级生产入口，可放底部工具位） |

其中：

1. `Director` 保持第一位，作为当前样板模块。
2. `VisualAudit` 从“主专家”降为“工具位”。
3. `LLMConfig` 不再放 Header 右上角孤立图标，改到 Dock / 工具菜单。

## 5.3 左栏中：Session 列表语义

| 模块 | 建议列表单位 |
|---|---|
| Director | 一次视觉导演会话（按 script/version 聚合） |
| Shorts | 一次短视频成品或批量任务 |
| Thumbnail | 一次缩略图方案集 |
| Music | 一次配乐会话 |
| Marketing | 一次营销提案会话 |

短期可先用“当前项目下最近更新记录”模拟列表；中期再把后端状态显式化。

## 5.4 左栏下：Project Context Dock

这是 Delivery 版对 GoldenCrucible “用户 + Config 区”的适配。

固定展示：

- 当前项目
- 当前文稿
- 当前全局模型
- 当前模块输出目录
- 快捷入口：切换项目 / 切换文稿 / 模型配置

这会明显优于当前把这些信息散在顶栏右侧。

---

## 6. Director 工作台改造方案

## 6.1 Director 的新骨架

`Director` 不再是“Phase 内容塞进大卡片”，而应改成：

1. `StageHeader`
2. `PhaseStepper`
3. `Phase Workspace`
4. `ContextDrawer`

### StageHeader 内容

- 左：`Project / Script / Session` breadcrumb
- 中：当前会话标题，例如 `AI 与编辑论 · 视觉导演 v0.3`
- 右：状态 badge、当前视觉模型、主 CTA

### PhaseStepper 内容

- P1 概念
- P2 视觉方案
- P3 渲染编排
- P4 导出交付

从“右上角 4 个小按钮”升级为真正的阶段导航条。

---

## 6.2 Phase 1 改造

### 当前问题

- 页面空态太空
- 当前项目 / 文稿 / 输出目标不可见
- 生成动作像一次性按钮，不像一个专业工作流入口

### 目标态

中栏采用 `7:5` 双区布局：

#### 左区：Concept Canvas

- 概念提案正文
- revision 历史
- 批注入口
- `生成 / 再生成 / 批准进入 P2`

#### 右区：Context Panel

- 当前项目
- 当前脚本摘要
- 输出目录：`04_Visuals`
- 当前模型 / provider
- 输入来源说明
- 导入 JSON 快捷卡

### 交互口径

1. 主按钮统一为赭橙色，而非蓝色。
2. `Approve & Continue` 变成更明确的工作流文案：`确认概念，进入视觉方案`.
3. 空态不再写“请先选择项目和视频剧本”的大空白，而是直接展示 `Project Context Dock` 的缺失状态卡。

---

## 6.3 Phase 2 改造

### 当前问题

- 过滤器、日志、批量操作都挤在中区
- 用户在“选镜头方案”和“看系统运行态”之间不断切焦点
- 审阅状态还不够像 Excel / 剪映这类熟悉工具

### 目标态

#### 顶部 Summary Strip

- 当前过滤条件
- 已选镜头数 / 当前可见数 / 总数
- 当前生成状态
- 最近错误摘要

#### 中区 Workspace

- 左：章节导航（chapter list）
- 中：镜头方案卡片流 / 表格式选择区
- 右：由 `ContextDrawer` 承接详细日志与预览，不再内嵌在中栏主体

#### 交互原则

1. 批量勾选保留 Excel 式三态 checkbox。
2. 过滤 chips 固定在 Summary Strip 下方，不能和日志面板争空间。
3. `DebugPanel` 下沉到右侧 Drawer 的 `运行态` tab。

---

## 6.4 Phase 3 改造

P3 应从“继续堆页面卡片”升级为“渲染编排台”。

### 中栏主结构

- 上：Render Pipeline 状态条
- 左：待渲染清单
- 中：当前任务详情 / SRT / XML / B-roll 绑定
- 下：错误恢复与重试动作

### 右侧 Drawer

- 渲染日志
- 任务队列
- 输出预览

这一步能把当前“Phase 逻辑存在，但工作台感弱”的问题补上。

---

## 6.5 Phase 4 改造

P4 定位为“导出与交付确认”。

### 目标内容

- 本次输出文件清单
- 交付检查项（尺寸、路径、生成时间、缺失项）
- 下一站 handoff：
  - 送入 Shorts
  - 送入 Distribution / Queue
  - 回到 Director 再修

### 设计要点

1. 使用和 GoldenCrucible 一致的 handoff 语义按钮。
2. 明确“当前产物已完成 / 待确认 / 有阻塞”三种状态。

---

## 7. 视觉系统建议

## 7.1 综合色彩策略

不建议直接把 GoldenCrucible 的浅色纸面 UI 铺满 DeliveryConsole，而建议使用：

### 壳层

- 深石墨 / 深蓝黑
- 负责稳定、系统感、模块切换、运行状态

### 工作台

- 暖灰纸面 / 亚麻白 / 深棕文本
- 负责 Concept、Storyboard、Script、Paper 类内容阅读

### 强调色

- 赭橙：主 CTA、handoff、关键确认
- 墨蓝：信息态、导航高亮
- 墨绿：成功、已同步、已完成
- 赤陶红：错误、阻塞、需干预

## 7.2 字体建议

- 标题 / 会话名：`Fraunces`
- 正文 / UI：`Instrument Sans`
- 路径 / 模型 / 技术信息：`JetBrains Mono`

这和黄金坩埚 PRD 统一，同时也能把 Director 从“工程页”提到“产品页”的质感。

## 7.3 图标与动效

1. 去掉 emoji 模块标签。
2. 保留线性 SVG icon。
3. 动效只用：
   - opacity
   - translateY / translateX（≤ 8px）
   - 150ms-280ms
4. Drawer 开合、phase 切换、handoff 过渡统一一个动画语法。

---

## 8. 组件层建议

## 8.1 新增共享组件

- `DeliveryShellLayout`
- `WorkstationRail`
- `SessionListPanel`
- `ProjectContextDock`
- `ContextDrawer`
- `StageHeader`
- `PhaseStepper`
- `OriginBreadcrumb`

## 8.2 Director 专属组件

- `DirectorSessionHeader`
- `DirectorConceptCanvas`
- `DirectorContextPanel`
- `StoryboardSummaryStrip`
- `StoryboardChapterRail`
- `RenderPipelineBoard`
- `ExportChecklistPanel`

## 8.3 现有文件改造重点

| 文件 | 动作 |
|---|---|
| `src/App.tsx` | 收拢为壳层路由与主布局编排 |
| `src/components/Header.tsx` | 从“超载 Header”改成纯产品级顶栏 |
| `src/components/ExpertNav.tsx` | 重写为左栏 `WorkstationRail` |
| `src/components/DirectorSection.tsx` | 拆为 Stage 容器 + session 头 + phase 工作区 |
| `src/components/director/Phase1View.tsx` | 改为双区工作台 |
| `src/components/director/Phase2View.tsx` | 日志下沉，强化 summary + batch 操作 |
| `src/components/ChatPanel.tsx` | 并入 `ContextDrawer` 的 tab 体系 |

---

## 9. 推荐实施顺序

## Stage A：Shell 收口，不改业务逻辑

1. 先重做 Header / 左栏 / 右栏骨架
2. Director 先挂进去，功能逻辑不变
3. 其余模块先作为占位入口接入

## Stage B：Director Phase 1 / 2 改造

1. 做 `StageHeader + PhaseStepper`
2. 重做 P1 的 Concept Canvas
3. 重做 P2 的 Summary Strip + Drawer 分工

## Stage C：Director Phase 3 / 4 改造

1. 引入 Render Pipeline 视图
2. 引入导出与 handoff 面板

## Stage D：其他模块跟进

1. Shorts / Thumbnail / Music / Marketing 按同一壳层接入
2. VisualAudit 改挂到工具区

---

## 10. 验收标准

1. 用户一眼能分清：
   - 我在哪个产品层
   - 我在哪个交付模块
   - 我正在处理哪个项目 / 文稿 / 会话
   - 我当前在 Director 的哪个阶段
2. `Director` 页面不再出现“巨大空白 + 顶部信息过远”的割裂感。
3. Chat / Logs / Artifact 不再散落在多个位置，而是统一进入右侧 Drawer。
4. `Music / Thumbnail / Shorts / Marketing` 的入口位已经与 `Director` 对齐，不需要后续再重设计一次导航。
5. 顶栏不再出现 emoji 型按钮。
6. 主 CTA、handoff、阶段切换的视觉语义统一。

---

## 11. 最终判断

这次 Director UI 改造，最重要的不是把一个页面做漂亮，而是借 `Director` 把 `DeliveryConsole` 的共享壳层第一次收正。

如果只改 `DirectorSection` 本身，不动入口层，那么 2 周后 Shorts / Thumbnail / Marketing 还会继续挤在旧导航里，整套系统仍然会显得像“多个页面并排挂在一起”。

所以建议：

1. **先做共享壳层**
2. **再做 Director 工作台**
3. **最后让其他模块按同一入口协议接入**

`Director` 负责做第一个样板，但目标始终是整个 `DeliveryConsole` 的 UI 架构升级。
