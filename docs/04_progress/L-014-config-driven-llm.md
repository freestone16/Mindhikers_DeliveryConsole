# L-014: 禁止在业务逻辑中硬编码 LLM Provider

**类别**: 架构规范 / LLM 调用  
**日期**: 2026-03-05  
**严重程度**: 🔴 高（会导致配置形同虚设，用户无法通过 UI 切换模型）

---

## 问题描述

在 `shorts.ts`、`director.ts` 等业务文件中，`callLLM()` 的 provider 参数被硬编码为字符串字面量（如 `'deepseek'`），导致用户在前端 LLM 配置页面设置的 Global Provider 对这些调用完全无效。

```typescript
// ❌ 错误示例：硬编码 provider
const response = await callLLM(messages, 'deepseek');
```

## 触发场景

用户在配置页面将 Global LLM 切换为 Kimi (Moonshot)，发起聊天 / 生成脚本 / 修改概念。
- ChatPanel 走 `config.global` → **正确响应**
- Director Phase 1 Revise → **仍发往 DeepSeek**（用户毫不知情）
- ShortsMaster 所有生成 → **仍发往 DeepSeek**

## 根本原因

开发时图方便直接传字符串，没有意识到这条调用链脱离了配置框架。

## 正确做法

**所有** `callLLM()` / `callLLMStream()` 调用，必须先读取 `loadConfig().global`：

```typescript
// ✅ 正确：跟随 global 配置
import { loadConfig } from './llm-config';

const { global: g } = loadConfig();
const response = await callLLM(messages, g.provider as any, g.model);
```

**例外场景**（需在注释中明确说明）：  
某些专家模块有自己的 Per-Expert LLM 配置（`config.experts.director.llm`），此时应优先读专家配置，再 fallback 到 global：

```typescript
// 专家级 per-expert config（Director、Writer 等可能单独配置）
const expertLLM = config.experts.director?.llm;
const provider = expertLLM?.provider ?? config.global.provider;
const model    = expertLLM?.model    ?? config.global.model;
const baseUrl  = expertLLM?.baseUrl  ?? config.global.baseUrl;
```

## 架构约束（强制）

> **DeliveryConsole 架构规则 #1**  
> **"配置优先，禁止硬编码 Provider"**
>
> 系统的 LLM Provider、Model 配置由 `src/schemas/llm-config.ts` 中的 `PROVIDER_INFO` 定义为**唯一真相来源**。  
> 任何新增的 LLM 调用，**必须**通过 `loadConfig()` 读取运行时配置，**严禁**使用字面量字符串指定 Provider。  
> 违反此规则的代码在 Code Review 时应作为阻塞项拒绝合并。

## 配置体系总览

```
src/schemas/llm-config.ts
  └── PROVIDER_INFO          ← 唯一真相：URL / EnvKey / Models
  └── DEFAULT_LLM_CONFIG     ← 默认值

.agent/config/llm_config.json  ← 用户运行时覆盖（由前端 UI 写入）

server/llm-config.ts
  └── loadConfig()           ← 合并 default + 用户覆盖，返回最终配置

server/chat.ts
  └── PROVIDER_BASE_URLS     ← 从 PROVIDER_INFO 动态派生（非手写）
  └── PROVIDER_ENV_KEYS      ← 从 PROVIDER_INFO 动态派生（非手写）
```

## 涉及修复的文件（2026-03-05）

| 文件                              | 函数                                  | 修复内容                                     |
| --------------------------------- | ------------------------------------- | -------------------------------------------- |
| `server/director.ts`              | `reviseConcept()`                     | 硬编码 `'deepseek'` → `g.provider / g.model` |
| `server/shorts.ts`                | `recommend()`                         | 同上                                         |
| `server/shorts.ts`                | `generateScripts()`                   | 同上                                         |
| `server/shorts.ts`                | `regenerateScript()`                  | 同上                                         |
| `server/shorts.ts`                | `generateBrolls()`                    | 同上                                         |
| `server/expert-actions/shorts.ts` | `executeAction('update_script_text')` | 同上                                         |
| `server/chat.ts`                  | module-level maps                     | 从 PROVIDER_INFO 动态派生，彻底移除手写表    |
