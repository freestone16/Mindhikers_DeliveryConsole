# [2026-02-26] | [SD-202] | [排查完成] Director Phase 2 预览故障排查报告

## 📌 背景
从 `memory_2026-02-26_DirectorPhase2.md` 恢复上下文后，对 Director Phase 2 存在的三大疑点进行了代码级与环境级排查。

## 🔍 排查结论与修复纪要

### 1. 火山引擎 (Volcengine) API 连接失败
- **结论**：**网络环境问题**。
- **详述**：检查了 `.env` 与 `server/volcengine.ts` 代码，逻辑已正确改用推理接入点 ID（Endpoint ID）。但手动通过 `curl` 与 `nslookup` 测试 `ark.cn-beijing.volces.com` 时，出现 `Could not resolve host` 及 `bind: Operation not permitted`。同时测试 DeepSeek API 也无响应。
- **证实**：当前宿主开发环境存在严格的网络/DNS限制，无法连接外网 API。代码本身无 Bug，需在放行网络的机器或本地环境中验证。

### 2. Remotion 预览生成失败
- **结论**：**代码漏传参数 Bug（已修复）**。
- **详述**：
  1. 检查 `RemotionStudio` 依赖，确认 `@remotion/renderer` (v4.0.429) 和 `SceneComposer` 组件均正常存在。
  2. 检查 `remotion-api-renderer.ts`，Node API 直调逻辑结构合理。
  3. **修复前**：前端 `ChapterCard` 在调用 `/api/director/phase2/thumbnail` 时，漏传了 `projectId`，导致后端只能降级使用 `.env` 中的 `PROJECT_NAME`，这在多项目切换时会引发预览图输出路径错乱或不可见。
  4. **修复后**：已将 `projectId` 从 `Phase2View` -> `ChapterCard` -> `OptionRow` 透传并写入 `fetch` 的 body 中。

### 3. Phase 2 全局 B-roll 分配
- **结论**：**逻辑就绪，待网络恢复后验证**。
- **详述**：后端 `startPhase2` 已接入神级视角的 `generateGlobalBRollPlan`。但由于上述的网络受限问题，无法向 LLM 侧真正发起生成请求验证均分陷阱是否被打破。

## 🚀 下一步计划
1. 在宿主机或老卢的网络畅通环境下，重新走一遍 Phase 1 与 Phase 2 的流程测试。
2. 重点观察：火山引擎首图生成以及 Remotion API 的背后渲染是否真正打通。
