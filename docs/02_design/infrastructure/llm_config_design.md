# [INF-001] LLM 配置管理系统设计

> **版本**: V1.0
> **状态**: 设计完成，待实施
> **适用范围**: 三级火箭全局基础设施
> **安全等级**: 开源友好（API Key 绝不提交到 Git）

---

## 1. 设计目标

为 MindHikers 三级火箭系统提供统一的 LLM 配置管理：

1. **统一配置**：全局默认 LLM，减少重复配置
2. **专家级覆盖**：支持为每个专家大师单独指定 LLM
3. **安全第一**：API Key 存储在 `.env`，绝不提交到版本控制
4. **开源友好**：提供 `.env.example` 模板，新用户一键配置

---

## 2. 架构设计

### 2.1 配置分离原则

```
项目根目录/
├── .env                           # 敏感信息（API Keys），gitignore
├── .env.example                   # 模板文件，提交到 Git
├── .agent/
│   └── config/
│       └── llm_config.json        # 非敏感配置，可提交
└── src/
    └── components/
        └── LLMConfigModal.tsx     # 配置 UI
```

### 2.2 文件职责

| 文件 | 内容 | Git 状态 |
|------|------|----------|
| `.env` | API Keys（敏感） | ❌ gitignore |
| `.env.example` | 模板（空值） | ✅ 提交 |
| `llm_config.json` | Provider/Model 选择 | ✅ 提交 |

---

## 3. 数据契约

### 3.1 环境变量（.env）

```env
# ========== LLM Provider API Keys ==========
# 以下密钥仅存储在本地 .env 文件，绝不提交到 Git

# OpenAI (GPT-4o, GPT-4o-mini, etc.)
OPENAI_API_KEY=

# Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
ANTHROPIC_API_KEY=

# Google (Gemini Pro, Gemini Flash, etc.)
GOOGLE_API_KEY=

# DeepSeek (国产替代)
DEEPSEEK_API_KEY=

# Zhipu AI (GLM-4, etc.)
ZHIPU_API_KEY=

# ========== Media Generation APIs ==========
# SiliconFlow (文生图/文生视频)
SILICONFLOW_API_KEY=

# Artlist (实拍素材搜索)
ARTLIST_API_KEY=
```

### 3.2 配置文件（llm_config.json）

```typescript
// Zod Schema
import { z } from 'zod';

export const LLMProviderSchema = z.enum([
  'openai', 
  'anthropic', 
  'google', 
  'deepseek', 
  'zhipu'
]);

export const LLMConfigSchema = z.object({
  global: z.object({
    provider: LLMProviderSchema,
    model: z.string(),
    baseUrl: z.string().nullable(),
  }),
  experts: z.object({
    crucible: z.object({
      provider: LLMProviderSchema.nullable(),
      model: z.string().nullable(),
    }).nullable(),
    writer: z.object({
      provider: LLMProviderSchema.nullable(),
      model: z.string().nullable(),
    }).nullable(),
    director: z.object({
      provider: LLMProviderSchema.nullable(),
      model: z.string().nullable(),
    }).nullable(),
    music: z.object({
      provider: LLMProviderSchema.nullable(),
      model: z.string().nullable(),
    }).nullable(),
    thumbnail: z.object({
      provider: LLMProviderSchema.nullable(),
      model: z.string().nullable(),
    }).nullable(),
    marketing: z.object({
      provider: LLMProviderSchema.nullable(),
      model: z.string().nullable(),
    }).nullable(),
    shorts: z.object({
      provider: LLMProviderSchema.nullable(),
      model: z.string().nullable(),
    }).nullable(),
  }),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;
```

### 3.3 默认配置示例

```json
{
  "global": {
    "provider": "openai",
    "model": "gpt-4o",
    "baseUrl": null
  },
  "experts": {
    "crucible": null,
    "writer": null,
    "director": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022"
    },
    "music": null,
    "thumbnail": null,
    "marketing": null,
    "shorts": null
  }
}
```

> **规则**：`experts.xxx = null` 表示继承 `global` 配置

---

## 4. 后端 API

### 4.1 获取配置状态

```typescript
// GET /api/llm-config/status
// 返回各 Provider 的 API Key 是否已配置（不返回 Key 本身）

interface ConfigStatus {
  providers: {
    [key: string]: {
      configured: boolean;  // true/false，不返回 Key
      model: string;
    }
  };
  global: {
    provider: string;
    model: string;
  };
  experts: {
    [key: string]: {
      provider: string | null;
      model: string | null;
      inherited: boolean;  // true 表示继承 global
    }
  };
}
```

### 4.2 保存 API Key

```typescript
// POST /api/llm-config/api-key
// 安全写入 .env 文件

interface SaveApiKeyRequest {
  provider: string;
  apiKey: string;  // 仅在此处传输，不回显
}

interface SaveApiKeyResponse {
  success: boolean;
  message: string;  // "API Key saved successfully"
  // 注意：不返回 apiKey
}
```

### 4.3 更新配置

```typescript
// PUT /api/llm-config
// 更新 llm_config.json（非敏感信息）

interface UpdateConfigRequest {
  global?: {
    provider: string;
    model: string;
  };
  experts?: {
    [key: string]: {
      provider: string | null;
      model: string | null;
    }
  };
}
```

### 4.4 测试连接

```typescript
// POST /api/llm-config/test
// 测试 LLM 连接是否正常

interface TestConnectionRequest {
  provider: string;
  model?: string;
}

interface TestConnectionResponse {
  success: boolean;
  latency?: number;  // 毫秒
  error?: string;
}
```

---

## 5. UI 设计

### 5.1 入口位置

Header 右上角 ⚙️ 设置图标，点击打开配置模态框。

### 5.2 界面布局

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ LLM Configuration                              [X]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ Global Settings ───────────────────────────────────────┐ │
│ │ Provider:  [OpenAI ▼]                                   │ │
│ │ Model:     [gpt-4o ▼]                                   │ │
│ │ API Key:   [••••••••••••••••••••] [Test] ✓ Valid       │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ Expert-Specific Override ──────────────────────────────┐ │
│ │                                                         │ │
│ │ ☐ Crucible     [▼ inherit from global]                  │ │
│ │ ☐ Writer       [▼ inherit from global]                  │ │
│ │ ☑ Director     [Anthropic ▼] [claude-3.5-sonnet ▼]     │ │
│ │ ☐ Music        [▼ inherit from global]                  │ │
│ │ ☐ Thumbnail    [▼ inherit from global]                  │ │
│ │ ☐ Marketing    [▼ inherit from global]                  │ │
│ │ ☐ Shorts       [▼ inherit from global]                  │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─ API Key Management ────────────────────────────────────┐ │
│ │ Provider       Status          Action                   │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ OpenAI         ✓ Configured    [Change]                 │ │
│ │ Anthropic      ✓ Configured    [Change]                 │ │
│ │ Google         ✗ Not set       [Configure]              │ │
│ │ DeepSeek       ✗ Not set       [Configure]              │ │
│ │ Zhipu          ✗ Not set       [Configure]              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [Cancel] [Save Config]  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 首次使用引导

当检测到 `global.provider` 的 API Key 未配置时：

```
┌─────────────────────────────────────────────────────────────┐
│ 🚀 Welcome to MindHikers Delivery Console                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Before you start, please configure your LLM API Key.       │
│                                                             │
│ Provider:  [OpenAI ▼]                                      │
│ API Key:   [________________________]                      │
│                                                             │
│ 💡 Your API Key is stored locally and never uploaded.      │
│                                                             │
│                          [Skip for Now] [Save & Continue]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 安全检查清单

| 检查项 | 状态 | 说明 |
|--------|------|------|
| `.env` 在 `.gitignore` 中 | ✅ 必须 | 防止 Key 泄露 |
| `.env.example` 提供模板 | ✅ 必须 | 新用户快速上手 |
| API Key 不写入 JSON | ✅ 必须 | 配置文件可提交 |
| API Key 不在前端回显 | ✅ 必须 | 前端只显示 `•••••` |
| 配置页有「测试连接」 | ✅ 必须 | 验证 Key 有效性 |
| 首次使用有引导 | ✅ 必须 | 降低上手门槛 |
| Zod 强校验 | ✅ 必须 | 防止脏数据 |

---

## 7. 实施依赖

本模块为基础设施，优先级最高：

```
[INF-001] LLM 配置管理
    ↓
[SD-101] 黄金坩埚
[SD-201] 写作大师
[SD-202] 导演大师  ← 依赖
[SD-203] 音乐大师
...
```

---

*Created by OldYang - 2026-02-23*
