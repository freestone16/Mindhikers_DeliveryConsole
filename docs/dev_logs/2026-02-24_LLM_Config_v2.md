# LLM 配置方案 v2 - 专家分离 + 多平台支持

> **日期**: 2026-02-24
> **状态**: 已实施
> **改动**: 老杨

## 背景

现有 LLM 配置只有 global，没有专家级别的分离配置。同时需要支持 SiliconFlow（LLM）和火山引擎（图生/视频）。

## 方案设计

### 一、支持的 Provider

| Provider | 环境变量 | Base URL | 类型 |
|----------|-----------|----------|------|
| `siliconflow` | `SILICONFLOW_API_KEY` | `https://api.siliconflow.cn/v1` | LLM |
| `volcengine` | `VOLCENGINE_API_KEY` | `https://ark.cn-beijing.volces.com/api/v3` | LLM/生成 |
| `openai` | `OPENAI_API_KEY` | `https://api.openai.com/v1` | LLM |
| `anthropic` | `ANTHROPIC_API_KEY` | `https://api.anthropic.com` | LLM |
| `zhipu` | `ZHIPU_API_KEY` | `https://open.bigmodel.cn/api/paas/v4` | LLM |

### 二、模型配置

#### LLM 模型（对话/写作）
- **默认**: SiliconFlow + Kimi-K2.5
- 可选: Qwen2.5-72B, DeepSeek-V2, GPT-4, Claude-3.5

#### 生成模型
- **图生**: doubao-image-01 (火山), Kolors (SiliconFlow)
- **视频**: doubao-video-01 (火山), Wan2.1

### 三、Schema 结构

```typescript
{
  "global": {
    "provider": "siliconflow",
    "model": "Kimi-k2.5",
    "baseUrl": "https://api.siliconflow.cn/v1"
  },
  "generation": {
    "imageModel": "doubao-image-01",
    "videoModel": "doubao-video-01"
  },
  "experts": {
    "director": {
      "enabled": true,
      "llm": { "provider": "siliconflow", "model": "Qwen2.5-72B" },
      "imageModel": "doubao-image-01",
      "videoModel": "doubao-video-01"
    },
    "writer": { "enabled": false, "llm": null, ... },
    // crucible, music, thumbnail, marketing, shorts
  }
}
```

### 四、Web 界面

4 个 Tab：
1. **Global** - 默认 LLM 配置
2. **生成配置** - 默认图生/视频模型
3. **专家配置** - 7 个专家独立配置（可展开）
4. **API Keys** - 统一管理所有 Provider 的 Key

## 改动文件

| 文件 | 改动 |
|------|------|
| `src/schemas/llm-config.ts` | 扩展 Schema，新增 generation、experts |
| `server/llm-config.ts` | 支持新配置，真实 API 测试 |
| `src/hooks/useLLMConfig.ts` | 适配新数据结构 |
| `src/components/LLMConfigModal.tsx` | 重写 UI，4 个 Tab |

---

## 2026-02-24 下午更新：Volcengine 配置修复

### 问题
- volcengine 需要 3 个输入框（AK/SK/Project ID）但用户只有 1 个 API Key
- 保存后自动退出，无法测试

### 修复
1. 简化 volcengine 配置：`envVars` 改为只读 `VOLCENGINE_ACCESS_KEY`
2. 修复保存逻辑：移除 `setSelectedProvider(null)`，保存后保持在当前页面
3. 更新 `server/volcengine.ts`：简化 Bearer Token 方式调用
4. UI 优化：保存后可立即点击测试

### 相关 Commit
- 简化 volcengine 配置为单 API Key 模式
- 修复保存后不退出问题
