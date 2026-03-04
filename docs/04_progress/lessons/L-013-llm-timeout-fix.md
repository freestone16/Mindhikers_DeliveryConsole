# L-013: Phase2 LLM 调用不稳定

**日期**: 2026-03-04
**模块**: Director / Phase2 / LLM 调用
**严重程度**: 高（影响功能稳定性）

---

## 问题描述

用户报告 Phase2 一开始调用 LLM 进行视频方案策划时不稳定：
- 有时能正常生成方案
- 有时会卡住很久
- 错误信息不明确

---

## 根因分析

### 核心问题

**所有 LLM 调用函数缺少超时机制**

代码位置：`server/llm.ts`

检查的 LLM 提供商：
- `callZhipuLLM` - 智谱 AI
- `callOpenAILLM` - OpenAI
- `callDeepSeekLLM` - DeepSeek
- `callSiliconFlowLLM` - SiliconFlow
- `callKimiLLM` - Moonshot Kimi

### 缺少的机制

1. **AbortController** - 无法取消挂起的请求
2. **setTimeout** - 无法设置超时时间
3. **clearTimeout** - 无法清理定时器
4. **AbortError 检查** - 无法区分超时和其他错误
5. **详细错误日志** - 难以排查问题

---

## 修复方案

### 修改文件

`server/llm.ts` - 所有 LLM 调用函数

### 修复模板

为所有 LLM 调用函数添加超时机制：

```typescript
async function callXXXLLM(messages: LLMMessage[], model = 'default-model'): Promise<LLMResponse> {
  const apiKey = process.env.XXX_API_KEY;
  if (!apiKey) {
    throw new Error('XXX_API_KEY not configured');
  }

  // ✅ 添加 AbortController 和超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

  try {
    const response = await fetch('API_URL', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal, // ✅ 传递 signal
    });

    clearTimeout(timeoutId); // ✅ 清理定时器

    if (!response.ok) {
      const error = await response.text();
      console.error(`[llm.ts] XXX API error (${response.status}):`, error);
      throw new Error(`XXX API error: ${error}`);
    }

    const data = await response.json();
    console.log(`[llm.ts] XXX API success, usage:`, data.usage);
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  } catch (error: any) {
    clearTimeout(timeoutId); // ✅ 错误时也要清理

    // ✅ 区分超时错误
    if (error.name === 'AbortError') {
      console.error(`[llm.ts] XXX API request aborted (timeout)`);
      throw new Error('XXX API timeout: request took longer than 30 seconds');
    }

    console.error(`[llm.ts] XXX API failed:`, error.message);
    throw error;
  }
}
```

### 各提供商超时设置

| 提供商 | 超时时间 | 原因 |
|-------|---------|------|
| Zhipu AI | 30秒 | 一般请求 |
| OpenAI | 30秒 | 一般请求 |
| DeepSeek | 30秒 | 一般请求 |
| SiliconFlow | 30秒 | 一般请求 |
| Kimi | 60秒 | 支持长上下文，可能需要更长时间 |

---

## 预防规则

### 1. 所有外部 API 调用必须添加超时

**检查清单**：
- [ ] 是否使用了 AbortController？
- [ ] 是否设置了合理的超时时间？
- [ ] 是否在成功和失败时都清理了定时器？
- [ ] 是否区分了超时错误和其他错误？
- [ ] 是否有详细的错误日志？

### 2. 错误日志要分层

- **用户看到的**：简短可操作的，如"请求超时，请检查网络"
- **开发者看到的**：详细堆栈，如 `[llm.ts] XXX API error (500): {details}`

### 3. 测试清单

```bash
# 运行测试脚本
node test_volc_polling.js

# 检查输出是否包含：
# ✅ AbortController
# ✅ setTimeout
# ✅ signal 传递
# ✅ clearTimeout
# ✅ AbortError 检查
```

---

## 相关规则

- 规则 #78: **LLM API 调用必须有超时机制**（建议 30 秒）
- 规则 #79: 使用 AbortController 取消请求
- 规则 #80: 错误信息要详细：HTTP status + response text

---

## 相关文件

- `server/llm.ts` - 所有 LLM 调用函数
- `test_volc_polling.js` - 自动化测试脚本
- `docs/04_progress/rules.md` - LLM API 调用相关规则
