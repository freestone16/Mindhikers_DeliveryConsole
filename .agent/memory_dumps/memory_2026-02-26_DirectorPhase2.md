# 🧠 Memory Dump — SD-202 Director Module Phase 2 重构
> 存档时间: 2026-02-26 14:42 | 会话 ID: 8cad6cad

---

## 🎯 核心目标
重构 Director 模块的 Phase 2，解决 B-roll 均分陷阱、预览失败和引用重复三大问题。

## ✅ 已完成

### 1. 全局 B-roll 智能分配
- **新函数** `generateGlobalBRollPlan()` in `server/llm.ts`
  - 一次性发送全剧本给 LLM，"上帝视角"分配 B-roll
  - 高潮章节 3-5 个方案，普通章节 1 个，严禁均分
  - quote 字段精准锚定每章原文
- **重构** `startPhase2()` in `server/director.ts`
  - 从逐章循环改为单次全局调用
  - fallback 逻辑：全局失败时降级到 `generateFallbackOptions()`

### 2. Remotion 预览引擎重写
- **新文件** `server/remotion-api-renderer.ts`
  - 使用 `@remotion/renderer` 的 `renderStill()` 直接调 Node API
  - 绕过 CLI 的 HTTP server 端口绑定（macOS EPERM 问题）
- **已集成** 到 `director.ts` 的 `generateThumbnail()`
  - 旧 `spawn('npm', ['run', 'still', ...])` 替换为 `renderStillWithApi()`

### 3. 火山引擎 (Volcengine) API 集成修复
- **根因分析**：3 个叠加 bug
  1. `testConnection` 调 `/chat/completions`，但火山引擎是图片生成服务 → 已改为 `/images/generations`
  2. `model` 字段传模型名（如 `doubao-seedream-5.0-litenew`），但方舟平台需要**推理接入点 ID** → 已改为读取 `VOLCENGINE_ENDPOINT_ID`
  3. envVars 检查要求 3 个变量全部配置，但只需 `ACCESS_KEY` → 已放宽
- **改动文件**：
  - `server/volcengine.ts` — 重写，使用 endpoint ID，加了调试日志
  - `server/llm-config.ts` — 修复 testConnection 逻辑和 envVars 检查
  - `src/schemas/llm-config.ts` — 更新模型列表
  - `.env` — 新增 `VOLCENGINE_ENDPOINT_ID=ep-20260226142759-xqc82`

---

## 🔴 待排错（新窗口继续）

### Issue 1: 火山引擎 API 连接测试不通过
- **现象**：LLM Config 面板点 "测试连接" → 报 `InvalidEndpointOrModel`
- **已做**：endpoint ID 已填入代码和 .env，但**重启后尚未验证**
- **排查方向**：
  1. 确认 `.env` 中的值被正确读取（server 启动时的日志）
  2. 手动 curl 测试：
     ```bash
     curl -X POST https://ark.cn-beijing.volces.com/api/v3/images/generations \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer 354e79c0-4219-4af4-8f78-44460ba54973" \
       -d '{"model":"ep-20260226142759-xqc82","prompt":"a blue circle","size":"256x256","num_images":1}'
     ```
  3. 如果 curl 也失败，检查接入点状态（方舟控制台 → 推理接入点 → 是否"健康"）
  4. `volcengine.ts` 已添加 `console.log` 调试日志，重启后看终端输出

### Issue 2: Remotion 预览生成失败
- **现象**：点击 "Generate Preview" 后无反应或报错
- **已做**：创建了 `server/remotion-api-renderer.ts`，但**未验证**
- **排查方向**：
  1. `@remotion/renderer` 是否存在于 RemotionStudio 的 node_modules
  2. `renderStill()` 的 `bundle()` 入口是否正确指向 `src/index.tsx`
  3. 终端查看 `[Remotion API]` 前缀的日志

### Issue 3: Phase 2 生成结果验证
- **待验证**：全局 B-roll 分配是否真正打破均分

---

## 📁 关键文件清单

| 文件                              | 角色                                   |
| :-------------------------------- | :------------------------------------- |
| `server/director.ts`              | Phase 1/2 控制器，预览生成             |
| `server/llm.ts`                   | LLM 调用，含 `generateGlobalBRollPlan` |
| `server/volcengine.ts`            | 火山引擎图片生成 API                   |
| `server/remotion-api-renderer.ts` | Remotion 直接渲染 (新)                 |
| `server/llm-config.ts`            | LLM Config 面板后端                    |
| `src/schemas/llm-config.ts`       | Provider/Model 定义                    |
| `.env`                            | API Keys 和 Endpoint ID                |

## 🔧 环境配置

```
PROJECT_NAME=CSET-SP3
PORT=3002
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-9372b8...
SILICONFLOW_API_KEY=sk-zdtbsz...
VOLCENGINE_ACCESS_KEY=354e79c0-4219-4af4-8f78-44460ba54973
VOLCENGINE_ENDPOINT_ID=ep-20260226142759-xqc82
```

## 💡 设计决策记录
- **B-roll 分配**：从逐章独立 LLM 调用 → 一次性全局分析（God Perspective）
- **Remotion 渲染**：从 CLI spawn → Node API 直调（解决端口限制）
- **Volcengine**：从模型名 → 推理接入点 ID（方舟平台的正确用法）
- **Seedance 预览**：从 SiliconFlow API → Volcengine API（用户纠正的）
