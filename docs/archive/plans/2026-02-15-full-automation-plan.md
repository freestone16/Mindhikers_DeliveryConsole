# Delivery Console 自动化执行方案

> **版本**: v1.1  
> **日期**: 2026-02-15  
> **状态**: 规划中

---

## 1. 目标

将现有的半自动 Antigravity 集成方案替换为**自托管 LLM API 方案**，实现：
- 点击"开始工作"后全自动执行
- LLM 提供商可配置（类似 opencode /connect）
- 5 位专家各自独立 Skill
- 详细的接口规范，便于用户自行更新

---

## 2. 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        Delivery Console                           │
├──────────────────────────────────────────────────────────────────┤
│  前端 (React)                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ 项目选择器    │  │ 专家导航      │  │ 专家工作页面          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        后端 (Node.js)                             │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ 项目管理 API │  │ 专家执行 API  │  │ LLM 连接器 (可插拔)   │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ 文件 Watcher │  │ Socket.IO    │  │ 配置管理             │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Skills (Python)                            │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ director_    │  │ music_       │  │ thumbnail_           │ │
│  │ skill.py     │  │ skill.py     │  │ skill.py             │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ shorts_      │  │ marketing_   │                            │
│  │ skill.py     │  │ skill.py     │                            │
│  └──────────────┘  └──────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. LLM 可配置设计

### 3.1 连接器接口

```python
# skills/connectors/base.py
class BaseLLMConnector:
    """LLM 连接器基类"""
    
    def __init__(self, config: dict):
        self.config = config
    
    def chat(self, messages: list, **kwargs) -> str:
        """发送聊天请求，返回内容"""
        raise NotImplementedError
    
    @staticmethod
    def get_provider_name() -> str:
        """返回提供商标识"""
        raise NotImplementedError
```

### 3.2 已支持的连接器

| 连接器             | 标识        | 说明                 |
| ------------------ | ----------- | -------------------- |
| DeepSeekConnector  | `deepseek`  | 性价比高，中文理解好 |
| OpenAIConnector    | `openai`    | GPT-4/3.5            |
| AnthropicConnector | `anthropic` | Claude 系列          |

### 3.3 各专家独立配置（推荐）

```bash
# 全局默认配置
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxx

# 各专家单独配置（覆盖全局）
DIRECTOR_LLM_PROVIDER=openai
DIRECTOR_OPENAI_API_KEY=sk-xxx

MUSICDIRECTOR_LLM_PROVIDER=anthropic
MUSICDIRECTOR_ANTHROPIC_API_KEY=sk-xxx

THUMBNAILMASTER_LLM_PROVIDER=deepseek
SHORTSMASTER_LLM_PROVIDER=deepseek
MARKETINGMASTER_LLM_PROVIDER=deepseek
```

### 3.4 各专家 LLM 配置表

| 专家            | 环境变量前缀       | 默认 LLM |
| --------------- | ------------------ | -------- |
| Director        | `DIRECTOR_`        | 全局默认 |
| MusicDirector   | `MUSICDIRECTOR_`   | 全局默认 |
| ThumbnailMaster | `THUMBNAILMASTER_` | 全局默认 |
| ShortsMaster    | `SHORTSMASTER_`    | 全局默认 |
| MarketingMaster | `MARKETINGMASTER_` | 全局默认 |

### 3.5 配置加载逻辑

```python
# skills/connectors/registry.py
import os

def get_connector(expert_id: str):
    """获取指定专家的 LLM 连接器"""
    prefix = f"{expert_id.upper()}_"
    
    # 1. 优先使用专家专属配置
    provider = os.environ.get(f"{prefix}LLM_PROVIDER") or os.environ.get('LLM_PROVIDER')
    api_key = os.environ.get(f"{prefix}API_KEY") or os.environ.get('API_KEY')
    
    if not provider:
        raise ValueError(f"No LLM provider configured for {expert_id}")
    
    connector_class = CONNECTORS.get(provider)
    return connector_class({'api_key': api_key})
```

### 3.6 如何添加新提供商

1. 在 `skills/connectors/` 目录创建新连接器
2. 继承 `BaseLLMConnector`
3. 实现 `chat()` 方法
4. 在 `skills/connectors/registry.py` 注册

```python
# skills/connectors/registry.py
from .deepseek import DeepSeekConnector
from .openai import OpenAIConnector

CONNECTORS = {
    'deepseek': DeepSeekConnector,
    'openai': OpenAIConnector,
    # 添加新提供商
}

def get_connector(provider: str, config: dict):
    connector_class = CONNECTORS.get(provider)
    if not connector_class:
        raise ValueError(f"Unknown provider: {provider}")
    return connector_class(config)
```

---

## 4. Expert Skill 规范

### 4.1 Skill 接口标准

每个 Expert Skill 必须实现以下接口：

```python
# skills/base_expert.py
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class ExpertInput:
    """Skill 输入数据"""
    project_name: str      # 项目名
    script_path: str       # 文稿路径
    script_content: str    # 文稿内容
    output_dir: str        # 输出目录
    extra: dict            # 额外参数

@dataclass
class ExpertOutput:
    """Skill 输出数据"""
    success: bool          # 是否成功
    output_files: list     # 输出的文件路径
    error: str             # 错误信息（失败时）
    logs: list            # 执行日志

class BaseExpertSkill(ABC):
    """Expert Skill 基类"""
    
    @property
    @abstractmethod
    def expert_id(self) -> str:
        """专家 ID"""
        pass
    
    @abstractmethod
    def run(self, input_data: ExpertInput) -> ExpertOutput:
        """执行 Skill"""
        pass
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        pass
```

### 4.2 导演大师 Skill 规格

```python
# skills/director_skill.py
class DirectorSkill(BaseExpertSkill):
    
    @property
    def expert_id(self) -> str:
        return "Director"
    
    def get_system_prompt(self) -> str:
        return """你是一位资深视频导演。根据提供的文稿，
请生成两阶段视觉执行方案：

## Phase 1: 视觉概念提案
- 整体视觉风格
- 色彩基调
- 关键视觉符号
- 镜头语言

## Phase 2: 分段执行方案
- 每个镜头/场景的详细描述
- 素材来源决策（AI生成/实拍/混排）
- 音效设计建议

输出格式要求：
- Phase 1: phase1_视觉概念提案_{项目名}.md
- Phase 2: phase2_分段视觉执行方案_{项目名}.md
- 放在 {output_dir} 目录下
..."""
    
    def run(self, input_data: ExpertInput) -> ExpertOutput:
        # 1. 构建 Prompt
        prompt = self._build_prompt(input_data)
        
        # 2. 调用 LLM
        response = self.llm.chat(prompt)
        
        # 3. 解析输出，写入文件
        output_files = self._write_outputs(response, input_data.output_dir)
        
        return ExpertOutput(
            success=True,
            output_files=output_files,
            error="",
            logs=["生成完成"]
        )
```

### 4.3 各专家输入输出

| 专家            | 输入            | 输出文件                                           | 说明              |
| --------------- | --------------- | -------------------------------------------------- | ----------------- |
| Director        | 文稿内容        | phase1_视觉概念提案.md, phase2_分段视觉执行方案.md | 34 个镜头详细方案 |
| MusicDirector   | 文稿 + 视觉方案 | 音乐风格定义.md, 分镜配乐.md                       | 背景音乐/音效设计 |
| ThumbnailMaster | 文稿            | 缩略图变体.md                                      | 3-5 个变体        |
| ShortsMaster    | 分镜脚本        | shorts_*.md                                        | 短片剪辑方案      |
| MarketingMaster | 全部方案        | seo_*.md, social_*.md                              | 多平台营销内容    |

---

## 5. 后端 API 设计

### 5.1 执行 Expert Skill

```typescript
// POST /api/experts/run
{
  expertId: "Director",
  scriptPath: "02_Script/深度文稿.md"
}

// Response
{
  success: true,
  taskId: "task_xxx",
  message: "Skill 执行中..."
}
```

### 5.2 状态查询

```typescript
// GET /api/experts/status/:expertId
{
  expertId: "Director",
  status: "running" | "completed" | "failed",
  progress: 50,  // 百分比
  outputFiles: ["04_Visuals/phase2_xxx.md"],
  error: null
}
```

### 5.3 配置 LLM

```typescript
// POST /api/config/llm
{
  provider: "deepseek",
  apiKey: "sk-xxx"
}
```

---

## 6. 文件结构

```
delivery_console/
├── skills/
│   ├── base_expert.py           # Skill 基类定义
│   ├── director_skill.py        # 导演大师
│   ├── music_skill.py           # 音乐总监
│   ├── thumbnail_skill.py      # 缩略图大师
│   ├── shorts_skill.py          # 短片大师
│   ├── marketing_skill.py      # 营销大师
│   ├── connectors/
│   │   ├── base.py              # 连接器基类
│   │   ├── registry.py          # 连接器注册
│   │   ├── deepseek.py          # DeepSeek 实现
│   │   ├── openai.py            # OpenAI 实现
│   │   └── anthropic.py         # Anthropic 实现
│   └── utils/
│       ├── file_writer.py        # 文件写入工具
│       └── prompt_builder.py     # Prompt 构建工具
├── server/
│   ├── index.ts                 # 主服务
│   ├── skill_executor.py        # Skill 执行器（调用 Python）
│   └── llm_config.py            # LLM 配置管理
├── config/
│   └── experts.ts               # 专家配置
└── docs/
    └── plans/
        └── 2026-02-15-automation-plan.md
```

---

## 7. Visual Audit — 视觉方案双重审核模块

> **来源**: 导演大师能力扩展调研 → 所有 B-Roll（不论由 Remotion / Seedance / Artlist 产出）都需要两层用户审核。

### 7.1 为什么需要 Visual Audit

当前 v3.0 的专家执行后，输出只有 Markdown 文件。用户无法在 Console 中"看到"画面效果，只能去 Obsidian 阅读文字描述。这导致：
1. 用户无法预判渲染效果，浪费渲染算力
2. Seedance 2.0 提示词质量无法可视化验证
3. Remotion 金句卡/概念卡没有预览就直接渲染

### 7.2 双重审核流程

```
导演大师Skill执行
    │
    ▼
输出: visual_plan.json + Markdown方案
    │
    ▼
┌──────────────────────────────────┐
│ 审核 I: 静态预览 (Static Audit)   │
│ ┌──────────────────────────────┐ │
│ │ Remotion 镜头 → 关键帧截图   │ │
│ │ Seedance 镜头 → Prompt + 参考图│ │
│ │ Artlist 镜头  → 搜索关键词   │ │
│ └──────────────────────────────┘ │
│ 用户操作: Approve / Reject+评论   │
└──────────────────────────────────┘
    │ (全部 Approved)
    ▼
┌──────────────────────────────────┐
│ 渲染/生成                         │
│ Remotion → CLI render MP4        │
│ Seedance → API 生成视频           │
└──────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────┐
│ 审核 II: 动态视频 (Video Review)  │
│ 用户播放 MP4 → Approve/Reject    │
└──────────────────────────────────┘
    │ (Approved)
    ▼
素材归档 → 可进入 Shorts 发布流程
```

### 7.3 Phase 2 方案审核界面设计

#### 7.3.1 界面布局

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 导演大师 - Phase 2 审核 (共34个镜头)                                    [阶段选择器]   │
│ 阶段: [方案审核] ● [缩略图审核] ○ [MP4审核]                              进度: 12/34   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│ ┌─────────────────────────────────────┬─────────────────────────────────┬───┬───┐        │
│ │ 📖 第一章：一句话的大片               │                                 │   │   │        │
│ │ ─────────────────────────────────── │                                 │   │   │        │
│ │                                     │ 🎬 Shot 01  │ 🔵 Remotion │ 5s │   │ ✓ │        │
│ │ 对应文案:                           │ 提示词: 蓝色屏幕墙...           │   │   │        │
│ │ "Seedance 2.0 彻底爆了，           │ 音效: Riser → Impact           │   │   │        │
│ │  冯骥老师说这是'地表最强'"          │                                 │   │   │        │
│ │                                     ├─────────────────────────────────┤   │   │        │
│ │ "我看了两段完全不同的钟馗            │ 🎬 Shot 02  │ 🟢 Seedance │ 7s │   │ ✓ │        │
│ │  视频"                             │ Prompt: 微博截图...            │   │   │        │
│ │                                     │ Ref: @Image1                   │   │   │        │
│ │                                     ├─────────────────────────────────┤   │   │        │
│ │ "看完之后似乎就像打了个喷嚏          │ 🎬 Shot 03  │ 🎬 Artlist   │   │   │   │        │
│ │  ...整个观看过程就像一场             │ 关键词: ocean, wave, aerial   │   │   │        │
│ │  高强度的解码游戏"                  │ 搜索建议: 暗色调风暴海面       │   │   │        │
│ │                                     │                                 │   │   │        │
│ └─────────────────────────────────────┴─────────────────────────────────┴───┴───┘        │
│                                                                                         │
│ ┌─────────────────────────────────────┬─────────────────────────────────┬───┬───┐        │
│ │ 📖 第二章：流水线上的精神鸦片         │                                 │   │   │        │
│ │ ─────────────────────────────────── │                                 │   │   │        │
│ │                                     │ 🎬 Shot 10 │ 🔵 Remotion │ 8s │   │   │        │
│ │ 对应文案:                           │ 提示词: 手工作坊...             │   │   │        │
│ │ "以前做奶头乐还是手工...             │ 音效: Ambience → Whoosh        │   │   │        │
│ │  现在一个人一句话2分钟"              │                                 │   │   │        │
│ │                                     ├─────────────────────────────────┤   │   │        │
│ │                                     │ 🎬 Shot 11 │ 🟢 Seedance │ 5s │   │   │        │
│ │                                     │ Prompt: ...                    │   │   │        │
│ └─────────────────────────────────────┴─────────────────────────────────┴───┴───┘        │
│                                                                                         │
│                                                                                         │
│ [保存评论]  [下一轮: 缩略图审核 →]                                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 7.3.2 列说明

| 列 | 内容 | 说明 |
|----|------|------|
| **第1列** | 章节原文 | 按章节合并大格，显示该章节所有对应文案 |
| **第2列** | 视频方案 | 每个 shot 一行，显示类型/提示词/时长等 |
| **第3列** | 用户评论 | 输入框，用户可提交修正意见 |
| **第4列** | ✅确认 | 打勾按钮，用户确认该 shot 已审核完成 |

#### 7.3.3 视频方案字段（按类型区分）

| 类型 | 显示字段 |
|------|----------|
| **Remotion** | 模板类型、Props 详情、时长、动效、音效 |
| **Seedance2** | Prompt、参考图、分辨率、时长、模式(T2V/I2V) |
| **Artlist** | 搜索关键词、搜索建议、备选关键词 |
| **Veo3** | Prompt、时长、物理效果描述 |

#### 7.3.4 三轮审核

| 轮次 | 内容 | 用户操作 | 输出 |
|------|------|----------|------|
| **第1轮** | 方案审核 | 评论/修正 + 打勾确认 | `phase2_*.md` (修正版) |
| **第2轮** | 缩略图审核 | 选择/评论 + 打勾确认 | `thumbnail_*.md` |
| **第3轮** | MP4审核 | 播放/通过/重做 + 打勾确认 | 最终素材 |

#### 7.3.5 状态存储

```json
{
  "phase2_review": {
    "scenes": [
      {
        "id": "shot_001",
        "comment": "第二句提示词再丰富一下",
        "approved": true,
        "approvedAt": "2026-02-15T12:30:00Z"
      }
    ],
    "currentRound": 1,
    "round1Complete": 34,
    "round2Complete": 0,
    "round3Complete": 0
  }
}
```

### 7.4 `visual_plan.json` 数据结构

DirectorSkill 的 `run()` 方法需要在输出 Markdown 的**同时**，额外输出一份结构化的 `visual_plan.json`：

```json
{
  "version": "1.0",
  "project": "CSET-Seedance2",
  "created_at": "2026-02-15T12:00:00Z",
  "scenes": [
    {
      "id": "scene_001",
      "timestamp": "00:00-00:05",
      "script_line": "当AI开始替代人类的创造力...",
      "type": "remotion",
      "template": "QuoteCardA",
      "props": {
        "text": "当AI开始替代人类的创造力...",
        "style": "question"
      },
      "sfx": "Impact - Cinematic Boom",
      "status": "pending_review",
      "review_comment": null
    },
    {
      "id": "scene_002",
      "timestamp": "00:05-00:12",
      "script_line": "在硅谷的实验室里，一个年轻的研究员...",
      "type": "seedance",
      "mode": "T2V",
      "resolution": "1080P",
      "duration": "7s",
      "prompt": "一位身穿白色实验服的亚洲女性研究员...",
      "references": {
        "images": ["@Image1: lab_reference.jpg"],
        "videos": [],
        "audio": []
      },
      "sfx": "Ambience - Cyber Hum",
      "status": "pending_review",
      "review_comment": null
    },
    {
      "id": "scene_003",
      "timestamp": "00:12-00:18",
      "script_line": "数据显示，2025年AI生成内容增长300%",
      "type": "artlist",
      "search_keywords": ["Technology", "Data visualization", "Close-Up", "4K+"],
      "search_tips": "搜索 'holographic data' 配合 'Close-Up' 筛选",
      "sfx": "Bell - Positive Bell",
      "status": "pending_review",
      "review_comment": null
    }
  ],
  "metadata": {
    "total_duration_estimate": "6:30",
    "remotion_count": 8,
    "seedance_count": 12,
    "artlist_count": 6,
    "visual_style": "赛博朋克 × 包豪斯极简"
  }
}
```

### 7.4 DirectorSkill 扩展

在 §4.2 的 `DirectorSkill` 基础上，`run()` 方法需要增加 JSON 输出：

```python
# skills/director_skill.py (扩展)
class DirectorSkill(BaseExpertSkill):
    
    def run(self, input_data: ExpertInput) -> ExpertOutput:
        # 1. Phase 1: 视觉概念提案 (Markdown)
        phase1_md = self._generate_concept(input_data)
        
        # 2. Phase 2: 分段执行方案 (Markdown)
        phase2_md = self._generate_execution_plan(input_data)
        
        # 3. 🆕 Phase 3: 结构化视觉方案 (JSON)
        visual_plan = self._generate_visual_plan(input_data, phase2_md)
        
        # 4. 写入文件
        output_files = []
        output_files.append(
            self._write(phase1_md, f"{input_data.output_dir}/phase1_视觉概念提案.md")
        )
        output_files.append(
            self._write(phase2_md, f"{input_data.output_dir}/phase2_分段视觉执行方案.md")
        )
        output_files.append(
            self._write_json(visual_plan, f"{input_data.output_dir}/visual_plan.json")
        )
        
        return ExpertOutput(
            success=True,
            output_files=output_files,
            error="",
            logs=["Phase 1/2/3 生成完成，visual_plan.json 已就绪"]
        )
```

### 7.5 前端 Visual Audit 模块

#### 新增组件

| 组件                | 文件                                         | 职责                                       |
| ------------------- | -------------------------------------------- | ------------------------------------------ |
| `VisualAuditPage`   | `src/components/VisualAuditPage.tsx`         | 顶层容器：左侧文稿 + 右侧 Timeline         |
| `SceneCard`         | `src/components/audit/SceneCard.tsx`         | 单个场景卡片（按 type 渲染不同内容）       |
| `RemotionPreview`   | `src/components/audit/RemotionPreview.tsx`   | 展示 Remotion 关键帧截图 (Start/Mid/End)   |
| `SeedancePreview`   | `src/components/audit/SeedancePreview.tsx`   | 展示 Prompt 文本 + 参考图 + (未来)预览视频 |
| `ArtlistPreview`    | `src/components/audit/ArtlistPreview.tsx`    | 展示搜索关键词 + 外链跳转到 Artlist        |
| `ReviewControls`    | `src/components/audit/ReviewControls.tsx`    | Approve/Reject按钮 + 评论输入框            |
| `RenderProgressBar` | `src/components/audit/RenderProgressBar.tsx` | 渲染进度条（全部Approved后可触发）         |

#### 新增 API

| 方法 | 路径                                 | 说明                                             |
| ---- | ------------------------------------ | ------------------------------------------------ |
| GET  | `/api/visual-plan`                   | 读取当前项目的 `visual_plan.json`                |
| POST | `/api/visual-plan/scenes/:id/review` | 提交单个场景的 Approve/Reject + 评论             |
| POST | `/api/visual-plan/render`            | 触发渲染（仅 Remotion 类型，Seedance 未来接API） |
| GET  | `/api/visual-plan/render/status`     | 渲染进度查询 (ws 推送)                           |

---

## 8. Seedance 2.0 × Remotion 混合渲染集成

> **来源**: 导演大师调研报告 Part 3 — 两个生态的融合架构

### 8.1 阶段规划

| 阶段   | 时间        | Seedance 2.0         | Remotion             | Console               |
| ------ | ----------- | -------------------- | -------------------- | --------------------- |
| **P0** | 立即        | Prompt 纯文本展示    | 关键帧截图预览       | Visual Audit 静态审核 |
| **P1** | 2026.02.24+ | API 接入（火山引擎） | 一键渲染 MP4         | 动态视频审核          |
| **P2** | 未来        | 批量异步生成         | Remotion Bits 组件库 | Timeline 编排         |

### 8.2 Remotion 新增能力（P0 落地）

来自调研发现的高价值 npm 包，建议安装到 `MHS-demo` 项目中：

| 包名                     | 用途                                        | 安装命令                       |
| ------------------------ | ------------------------------------------- | ------------------------------ |
| `remotion-glitch-effect` | Glitch 故障艺术效果（脑腐/焦虑视觉化）      | `npm i remotion-glitch-effect` |
| `remotion-bits`          | AI Agent 友好组件库（粒子/文字动效/Motion） | `npx remotion-bits init`       |
| `remotion-animate-text`  | 逐字/逐字符动画（补充金句卡能力）           | `npm i remotion-animate-text`  |

### 8.3 Seedance 2.0 提示词资产库（P0 落地）

将 [awesome-seedance](https://github.com/ZeroLu/awesome-seedance) 和 [seedance-prompt-skill](https://github.com/songguoxs/seedance-prompt-skill) 的最佳实践整合进 Director Skill 的 `references/` 目录：

- `references/seedance_styles.md` — 7大风格类提示词模板
- `references/seedance_negative_prompts.md` — 负面提示词库
- `references/seedance_camera_vocab.md` — 运镜词汇表（补充现有 `seedance2_prompt_guide.md`）

### 8.4 协同场景表（与 Director Skill 联动）

| 场景           | Seedance 职责        | Remotion 职责     | Console 审核要素                               |
| -------------- | -------------------- | ----------------- | ---------------------------------------------- |
| **金句+氛围**  | 生成氛围 B-Roll 视频 | 叠加金句卡 + Logo | 审核 I: Prompt + 关键帧；审核 II: 合成效果     |
| **数据叙事**   | 生成隐喻画面         | 渲染图表/数字动画 | 审核 I: 数据准确性 + Prompt；审核 II: 交叉剪辑 |
| **概念可视化** | 感性画面             | 逻辑推演链        | 审核 I: 概念映射是否准确                       |
| **Shorts片头** | 3s Hook 画面         | 品牌元素/CTA      | 审核 I: Hook 设计；审核 II: 品牌一致性         |

---

## 11. Skill 自动同步机制

> **目标**: 每次启动 Console 时自动检查并同步 Antigravity skills，保持最新

### 11.1 同步策略

| 项目 | 说明 |
|------|------|
| 源目录 | `/MindHikers/.agent/skills/` (Antigravity) |
| 目标目录 | `delivery_console/skills/` |
| 触发时机 | 后端启动时 + 前端连接成功后 |
| 同步方式 | 全量复制（目录小，几秒完成） |
| 用户感知 | 左下角状态栏显示同步日志 |

### 11.2 同步流程

```
后端启动
    │
    ▼
检查源目录是否存在
    │
    ├── 不存在 → 跳过，使用内置 skills
    │
    ▼
遍历 5 个专家 skills (Director/MusicDirector/...)
    │
    ▼
对比源与目标的 mtime
    │
    ├── 源更新 → 复制到目标目录
    │           │
    │           ▼
    │        记录同步日志
    │
    └── 无更新 → 跳过
    │
    ▼
Socket 推送同步状态到前端
    │
    ▼
前端左下角显示: "✅ Skills 已同步" 或 "📋 同步 3 个 skills"
```

### 11.3 后端实现

```python
# server/skill_sync.py
import shutil
import os
from pathlib import Path

SOURCE_SKILLS = "/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/.agent/skills"
TARGET_SKILLS = "./skills"

EXPERTS = ["Director", "MusicDirector", "ThumbnailMaster", "ShortsMaster", "MarketingMaster"]

def sync_skills():
    """同步 skills 目录"""
    if not os.path.exists(SOURCE_SKILLS):
        return {"status": "skipped", "reason": "源目录不存在"}
    
    synced = []
    for expert in EXPERTS:
        src = Path(SOURCE_SKILLS) / expert
        dst = Path(TARGET_SKILLS) / expert
        
        if not src.exists():
            continue
            
        # 对比 mtime
        if not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime:
            shutil.copytree(src, dst, dirs_exist_ok=True)
            synced.append(expert)
    
    return {"status": "ok", "synced": synced}
```

### 11.4 前端日志展示

```tsx
// 左下角状态栏扩展
const StatusFooter = ({ syncLogs }) => (
  <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur border-t border-slate-800 py-1 px-4 text-xs">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      {/* 左侧: 连接状态 */}
      <span className="text-slate-500">
        {isConnected ? '🟢 Online' : '🔴 Offline'}
      </span>
      
      {/* 右侧: Skill 同步状态 */}
      <span className="text-slate-400">
        {syncStatus === 'syncing' && '🔄 同步 Skills...'}
        {syncStatus === 'done' && `✅ Skills 已同步 (${syncedCount}个)`}
        {syncStatus === 'error' && '❌ Skills 同步失败'}
      </span>
    </div>
  </footer>
);
```

### 11.5 API 接口

```typescript
// GET /api/skills/sync-status
{
  lastSync: "2026-02-15T12:00:00Z",
  synced: ["Director", "MusicDirector"],
  status: "ok"
}

// POST /api/skills/sync (手动触发)
{
  "success": true,
  "synced": ["Director", "ThumbnailMaster"]
}
```

---

## 12. 更新日志

| 日期       | 版本 | 变更                                                    |
| ---------- | ---- | ------------------------------------------------------- |
| 2026-02-15 | v1.0 | 初始规划：LLM 可配置 + Expert Skill 框架                |
| 2026-02-15 | v1.1 | 整合 Visual Audit 双重审核 + Seedance/Remotion 混合渲染 |

---

## 10. 待完成事项

### 基础框架
- [ ] 确认 LLM 提供商
- [ ] 实现 BaseExpertSkill 基类
- [ ] 实现 DirectorSkill（用户自行更新）
- [ ] 实现 LLM 连接器（可配置）
- [ ] 后端 Skill 执行器
- [ ] 前端进度展示

### Visual Audit (§7)
- [ ] 定义 `visual_plan.json` schema 并验证
- [ ] DirectorSkill 增加 JSON 输出 (`_generate_visual_plan`)
- [ ] 前端 `VisualAuditPage` + `SceneCard` 组件
- [ ] 后端 `/api/visual-plan` CRUD API
- [ ] Remotion 关键帧截图集成 (`npx remotion still`)
- [ ] Seedance Prompt 文本展示 + 参考图预览

### Seedance/Remotion 资产 (§8)
- [ ] 安装 `remotion-glitch-effect` / `remotion-bits` / `remotion-animate-text`
- [ ] 整合 awesome-seedance 风格库至 Director Skill references
- [ ] 整合 seedance-prompt-skill 的负面提示 + 时间戳分镜至 Director Skill

### 测试
- [ ] 单元测试：`visual_plan.json` schema 解析
- [ ] 集成测试：Expert 执行 → JSON 输出 → Console 读取展示
- [ ] 手动测试：完整 E2E 流程（脚本选择 → 专家执行 → 静态审核 → 渲染 → 视频审核）
