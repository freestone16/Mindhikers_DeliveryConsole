# L-010 - OpenCode 自定义 LLM Provider 配置

**日期**：2026-03-04
**分类**：OpenCode 配置

---

## 问题

- 新开的 OpenCode 窗口找不到自定义模型
- 调用时返回"未提供令牌"错误

---

## 配置位置

- Provider 定义：`~/.config/opencode/opencode.json`
- API Key 存储：`~/.local/share/opencode/auth.json`

---

## 正确的配置方式

**opencode.json**：
```json
{
  "provider": {
    "yinli": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Yinli",
      "options": {
        "baseURL": "https://yinli.one/v1",
        "apiKey": "sk-xxx"
      },
      "models": {
        "claude-sonnet-4-6": {
          "name": "Claude Sonnet 4.6"
        }
      }
    }
  }
}
```

**auth.json**：
```json
{
  "yinli": {
    "type": "api",
    "key": "sk-xxx"
  }
}
```

---

## 关键点

1. 必须指定 `npm: "@ai-sdk/openai-compatible"`
2. 必须在 `models` 中声明可用模型
3. `options.baseURL` 要包含 `/v1` 路径
4. `options.apiKey` 必须直接写在 options 里（不能只靠 auth.json）
5. 模型名格式：`{provider}/{model}`，如 `yinli/claude-sonnet-4-6`

---

## 相关规则

- 自定义 provider 需要同时配置 opencode.json 和 auth.json
- API Key 必须在 options 里显式声明才能传递
- baseURL 要完整包含 API 路径
