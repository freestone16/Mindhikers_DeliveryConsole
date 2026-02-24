# 🎬 [SD-203] Phase 2 Storyboard (分镜剧务) 真实数据流实施方案

> **撰写方**: OldYang (老杨) & 原型架构体系
> **实施方**: GLM-5 研发团队
> **日期**: 2026-02-24
> **背景**: 目前 `DirectorSection` 的 Phase 2 (分镜切分) 环节使用了前端写死的 Mock 数据（仅展示 Intro、第一章、第二章共三行）。真实业务需要解析用户文稿（如 7 个章节的 `CSET-seedance2`），并针对每个章节智能生成 1~3 个视听素材提议（总计生成至少 21 个分镜选项框）。

---

## 🛠 研发行动项清单 (Action Items)

本需求属于纯后端逻辑重构及 前后端 API 联调，请重点攻克以下三个模块：

### 1. 真实文本切块与解析引擎 (Markdown Parser)
- **目标文件**: `server/director.ts` -> `startPhase2` 接口
- **输入**: `scriptPath` (包含在前端请求 payload 中)
- **逻辑要求**:
  - 读取指定路径的 Markdown 文本。
  - 编写基于正则或 AST 的解析器，以 `##` 标题或特定区块分隔符将长文案切分为 N 个离散的高内聚块（Chapter）。
  - 将这 N 块文本初始化为 `DirectorChapter[]` 数组。

### 2. 智能分镜预生成 (B-Roll Options Generator)
- **核心逻辑**: 
  - 针对上一步切分出的每个 Chapter，由于前端要求呈现多选方案，后端需（异步或批量）调用大模型，为每个 Chapter 生成 1~3 款不同的视觉呈现提议（Options）。
  - 三种必备视角风格提议要求：
    - **A. 代码流 (Remotion)**: 侧重 UI 数据可视化。
    - **B. 生成流 (SiliconFlow/原生短视频)**: 侧重写实/概念意象感。
    - **C. 实拍库 (Artlist)**: 侧重标准空镜。
- **并发要求**: 为了不让用户等太久，建议基于 Promise.all 进行多线程并行生成。

### 3. 持久化与状态轮询/流式对接 (State Polling & Persistence)
- **状态树持久化**: 
  - 生成出来的包含 `N chapters * 3 options` 的巨大状态树，必须实时落盘保存在 `04_Visuals/selection_state.json`。
  - 用户页面的刷新不应丢失刚才的生生成结果与用户的打勾状态。
- **前端对接**:
  - 重写现有的 `getPhase2Status`（目前它只返回硬编码的 `progress: '3/12'`）。
  - 建议将其升级为类似 Phase1 的 SSE 流，让前端能够实现“每切分或生成完一个章节选项，画面就自动蹦出一行”的骨架加载效果。

---

## 💡 附录：数据契约参考 (Data Interface Reference)

前端期待从获取状态接口拿到的 `chapters` 核心结构：

```typescript
export interface DirectorChapter {
    chapterId: string;
    chapterIndex: number;
    chapterName: string;         // e.g. "Intro" 或 "第一章：深水困局"
    scriptText: string;          // 本章原文截取
    options: BRollOption[];      // 必须包含长度为 1~3 的生成选项
    selectedOptionId?: string;   // 用户打勾结果
    userComment?: string;        // 用户的审改意见
    isLocked: boolean;           // 阶段锁定标记
}

export interface BRollOption {
    optionId: string;
    type: 'remotion' | 'generative' | 'artlist';
    prompt: string;              // 生成时使用的核心提示词或搜索词
    previewUrl?: string;         // (可选) 预览图占位符路径
}
```

*请 GLM 团队依据此准则进行核心渲染引擎的装轨工作，老杨期待你们的好消息！*
