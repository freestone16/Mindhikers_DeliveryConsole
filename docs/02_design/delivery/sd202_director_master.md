# 🎬 [SD-202] 导演大师 (Director Master) 系统设计

> **版本**: V3
> **角色**: MindHikers 创作者工具矩阵 - 核心智能引擎
> **状态**: 完整方案确立，待实施
> **设计方**: OldYang (老杨) & 原型架构体系
> **实施方**: OpenCode (GLM-5)
> **前置依赖**: 
> - `docs/00_architecture/architecture_v3_master.md` (三级火箭总纲)
> - `docs/00_architecture/llm_config_design.md` (LLM配置管理)
> **修订记录**:
> - 2026-03-06 (V3.1): 为组件 DirectorSection 增加「重置」按钮，清空本地状态并重置历史，回归 Phase 1。
> - 2026-02-23 (V3): 补充完整 Phase 1-3 实施方案，预览图规格 320×180，集成 LLM 配置系统。
> - 2026-02-23 (V2): 引入 Human-in-the-loop (带环审核) 机制，细化分镜预览 (SiliconFlow/Remotion) 与 Phase 3 渲染台逻辑。

---

## 🔪 0. 核心灵魂：Human-in-the-loop 与 Subagent 协作

导演大师不再是“黑盒”的一键生成，而是一个**分阶段挂起、用户深度参与**的管线系统。

1. **Subagent 独立化**：每一阶段 (Phase) 由独立的子代理负责，降低 LLM 幻觉。
2. **带环审核 (H-I-T-L)**：系统在每一阶段停顿，用户确认或评论修改后方可进入下一环。
3. **视觉草图先行**：在分镜阶段，通过低保真预览（生图或原生渲染）让用户在耗费巨大渲染算力前对画面有直观预期。

---

## 1. 三段式实施流水线 (Implementation Pipeline)

### 1.1 Phase 1: 概念架构师 (Concept Architect)
- **输入**：文稿 `script.md`。
- **输出**：`phase1_视觉概念提案.md`。
- **UI 交互**：前端展示可视化大纲卡片，用户可针对全局基调进行【评论并重生成】或【确认过关】。

### 1.2 Phase 2: 分镜剧务 (Storyboard Planner)
- **前置动作**：用户勾选 B-Roll 选项（A. Remotion代码动画, B. 文生视频[即梦/Veo], C. Artlist实拍资产）。
- **核心逻辑**：针对文稿的**每一章节**，强制生成 **至少 3 个视觉方案** 以供筛选。
- **预览生成**：
    - **B 类 (文生视频)**：调用外部 API (目前 SiliconFlow/Flux，月底切字节原生) 生成低保真预览草图。
    - **A 类 (Remotion)**：**严禁用文生图**，必须调用 Remotion 原生渲染引擎生成准确的 UI 占位图。
- **UI 交互**：三列式布局（脚本原文 | 3 方案备选+预览图 | 评论框+打勾锁定）。用户手动勾选锁定方案，作为后续生成 `visual_plan.json` 的唯一依据。

### 1.3 Phase 3: 渲染交付与 Schema 提取 (Asset Delivery & Schema Extractor)
- **渲染控制台**：用户点击【定稿执行】后进入独立渲染面板。
- **控制逻辑**：支持【批量渲染】或【逐条点击渲染】。
- **参数规格**：
    - **Remotion**: 默认 4K 极清渲染。
    - **文生视频**: 默认 1080p 生产环境级别。
- **最终产出**：
    1.  物理资源：MP4 文件列表存入项目 `06_Video_Broll/`。
    2.  逻辑资产：格式严密的 `visual_plan.json` 落盘。
    3.  资产审计：所有图生视频方案，同步交付提示词与原始图片资产。

---

## 2. 数据契约与接口建议 (Data Contracts)

### 2.1 任务分段 API
```typescript
interface DirectorAction {
  action: 'phase1' | 'phase2_generate' | 'phase2_revise' | 'phase3_render';
  projectId: string;
  chapterIndex?: number; // 允许局部重生成
  userComment?: string;
  selectedOptions?: string[]; // B-Roll configurations
}
```

### 2.2 `visual_plan.json` 结构
(保持 V1 定义，增加 `final_asset_path` 字段记录渲染后的 MP4 路径)。

---

## 3. 老杨的嘱托 (给 GLM-5 的研发要求)

1. **异步分段响应**：针对长文本的 Phase 2 多方案生成，前端必须支持骨架屏和 SSE (Server-Sent Events) 的流式局部加载。
2. **生图 API 隔离**：后端应封装通用的生图抽象层，支持从 SiliconFlow 无缝滚动到字节系 API。
3. **打勾逻辑持久化**：用户在 Phase 2 的“勾选状态”需落盘（如 `selection_state.json`），即便刷新页面，打勾进度不丢失。
---

## 4. 实施规格表 (Implementation Specs)

### 4.1 预览图规格

| 参数     | 值                     | 说明                   |
| -------- | ---------------------- | ---------------------- |
| 尺寸     | **320 × 180 px**       | 约 4K 全屏的 1/12 高度 |
| 格式     | PNG                    | Remotion still 输出    |
| 存储路径 | `04_Visuals/previews/` | 按章节组织             |

### 4.2 章节结构

```
脚本章节划分：
├── Intro（开场）
├── 第一章
├── 第二章
├── ...
├── 第N章
└── Ending（结尾）

每章节生成：至少 3 个 B-Roll 视觉方案
```

### 4.3 渲染规格

| 类型     | 分辨率                | 帧率  | 说明     |
| -------- | --------------------- | ----- | -------- |
| Remotion | **4K (3840×2160)**    | 30fps | 极清渲染 |
| 文生视频 | **1080p (1920×1080)** | 30fps | 生产级别 |

### 4.4 文件产出

| 文件     | 路径                                   | 内容               |
| -------- | -------------------------------------- | ------------------ |
| 概念提案 | `04_Visuals/phase1_concept.md`         | 视觉基调与风格定义 |
| 预览图   | `04_Visuals/previews/ch{N}_opt{M}.png` | 320×180 缩略图     |
| 选择状态 | `04_Visuals/selection_state.json`      | 用户打勾锁定记录   |
| 视觉方案 | `04_Visuals/visual_plan.json`          | 最终 JSON 契约     |
| 渲染视频 | `06_Video_Broll/ch{N}_*.mp4`           | MP4 成片           |

---

## 5. 后端 API 端点

### 5.1 Phase 1

```
POST /api/director/phase1/generate
  - Input: { projectId, scriptPath }
  - Output: SSE stream → phase1_concept.md

POST /api/director/phase1/revise
  - Input: { projectId, userComment }
  - Output: SSE stream → revised concept
```

### 5.2 Phase 2

```
POST /api/director/phase2/start
  - Input: { projectId, brollTypes: string[] }
  - Output: { taskId }

GET /api/director/phase2/status/:taskId
  - Output: { progress: "1/12", chapters: [...] }

POST /api/director/phase2/select
  - Input: { projectId, chapterId, optionId }
  - Output: { success }

POST /api/director/phase2/lock
  - Input: { projectId, chapterId }
  - Output: { success }
```

### 5.3 Phase 3

```
POST /api/director/phase3/render
  - Input: { projectId, chapterIds?: string[] }  // null = 全部
  - Output: { jobId }

GET /api/director/phase3/status/:jobId
  - Output: { frame: 45, totalFrames: 90, percentage: 50 }
```

---

## 6. LLM 配置集成

导演大师使用 `INF-001` 定义的 LLM 配置系统：

```typescript
// 获取当前专家的 LLM 配置
const llmConfig = await getExpertLLMConfig('director');

// llmConfig.provider: 'anthropic' | 'openai' | ...
// llmConfig.model: 'claude-3-5-sonnet-20241022' | 'gpt-4o' | ...
// API Key 从环境变量自动读取，无需显式传递
```

---

## 7. 实施任务清单

| #   | 任务                              | 优先级 | 依赖   |
| --- | --------------------------------- | ------ | ------ |
| 0   | INF-001 LLM 配置系统              | P0     | 无     |
| 1   | Phase 1 UI + SSE                  | P1     | #0     |
| 2   | Phase 1 后端 API                  | P1     | #0     |
| 3   | Phase 2 B-Roll 选择器             | P1     | #0     |
| 4   | Phase 2 三列式 UI                 | P1     | #3     |
| 5   | Phase 2 预览生成 (Remotion still) | P1     | #4     |
| 6   | Phase 2 预览生成 (SiliconFlow)    | P2     | #4     |
| 7   | Phase 3 渲染控制台 UI             | P1     | #5, #6 |
| 8   | Phase 3 Remotion render 集成      | P1     | #7     |
| 9   | 完整流程测试                      | P1     | #8     |

---

*Created by OldYang (Chief Logic Architect) - 修订于 2026-02-23 (V3)*

