# 交付管控 自动化方案

>台 Skill **版本**: v1.0  
> **日期**: 2026-02-15  
> **状态**: 规划中

## 背景

当前工作流依赖用户在 Antigravity 中手动执行 Skill，存在以下问题：
1. 需手动切换应用，操作繁琐
2. 状态同步依赖文件 Watcher，存在延迟和漏检
3. 无法实现真正的全自动化

## 目标

实现点击"开始工作"后全自动执行 Skill，减少人工干预。

---

## 方案对比

### 方案 A：Python Skill 封装（推荐）

```
前端点击"开始" 
    ↓
后端调用 Python 脚本（Skill）
    ↓
Python 调用 LLM API (DeepSeek/Claude)
    ↓
Python 解析输出，写入 04_Visuals/*.md
    ↓
Watcher 检测到文件，自动更新状态为 completed
```

### 方案 B：后端直连 LLM

```
前端点击"开始"
    ↓
后端 /api/experts/start 调用 LLM API
    ↓
后端拼接 Prompt，直接写入文件
    ↓
Watcher 检测到文件 → 状态变 completed
```

---

## 多维度评测

| 维度 | 方案 A | 方案 B |
|------|--------|--------|
| **安全性** | ⭐⭐⭐⭐⭐ Skill 隔离，API key 不泄露 | ⭐⭐⭐ 后端统一管 Key |
| **健壮性** | ⭐⭐⭐⭐ Skill 崩溃不影响后端 | ⭐⭐⭐ LLM 失败直接挂 |
| **可维护性** | ⭐⭐⭐⭐⭐ Skill 独立，易测试 | ⭐⭐ 代码混在后端难管 |
| **复用性** | ⭐⭐⭐⭐⭐ 可被其他工具调用 | ⭐ 只能本系统用 |
| **实现成本** | ⭐⭐ 需写 Python 脚本 | ⭐⭐⭐ 改动后端代码 |

---

## 推荐方案：方案 A

### 架构设计

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端      │────▶│  后端 API   │────▶│ Python Skill│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   ▼
       │                   │            ┌─────────────┐
       │                   │            │  LLM API    │
       │                   │            │(DeepSeek/   │
       │                   │            │ Claude)     │
       │                   │            └─────────────┘
       │                   │                   │
       ◀───────────────────┴───────────────────┘
                    文件写入 + Watcher
```

### 实施计划

#### Phase 1：导演大师试点

1. **创建 Skill 脚本**
   - 路径：`skills/director_skill.py`
   - 接收参数：文稿路径、项目名
   - 输出：写入 `04_Visuals/phase2_*.md`

2. **Prompt 迁移**
   - 从 Antigravity Director skill 提取指令逻辑
   - 适配 LLM API 格式

3. **后端调用**
   - 新增 API：`POST /api/experts/run`
   - 调用 Python 脚本，捕获输出

4. **状态同步**
   - 复用现有 Watcher 逻辑

#### Phase 2：扩展其他专家

| 专家 | Skill 脚本 | 输出目录 |
|------|------------|----------|
| MusicDirector | `skills/music_skill.py` | 04_Music_Plan |
| ThumbnailMaster | `skills/thumbnail_skill.py` | 03_Thumbnail_Plan |
| ShortsMaster | `skills/shorts_skill.py` | 05_Shorts_Output |
| MarketingMaster | `skills/marketing_skill.py` | 05_Marketing |

---

## 配置要求

### 环境变量

```bash
# LLM API 配置
LLM_PROVIDER=deepseek  # 或 openai / anthropic
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-xxx
```

### 目录结构

```
delivery_console/
├── skills/                    # Skill 脚本目录
│   ├── director_skill.py
│   ├── music_skill.py
│   ├── thumbnail_skill.py
│   ├── shorts_skill.py
│   └── marketing_skill.py
├── config/
│   └── llm_config.py          # LLM 配置
├── server/
│   └── index.ts               # 后端（新增 /run 接口）
└── docs/
    └── plans/
        └── 2026-02-15-skill-automation.md
```

---

## 待定事项

- [ ] 确定 LLM 提供商（DeepSeek / OpenAI / Anthropic）
- [ ] 确认现有 Antigravity Skill 的完整指令逻辑
- [ ] 评估 API 成本

---

## 风险与对策

| 风险 | 对策 |
|------|------|
| LLM 输出格式不稳定 | 增加后处理校验，失败自动重试 |
| API 调用超时 | 设置超时限制，输出进度到前端 |
| 文件冲突 | 使用唯一文件名（时间戳+专家名） |
