🕐 Last updated: 2026-03-27 20:39
🌿 Branch: MHSDC-DC-director

## 当前状态

- Director Phase2 卡住问题已定位到后端 LLM 请求无硬超时。
- 已在 `server/llm.ts` 为全部 LLM provider 接入统一超时包装，默认 `300s`，可由 `LLM_REQUEST_TIMEOUT_MS` 覆盖。
- 当前全局 LLM 配置仍是 `kimi / kimi-k2.5`，本次卡住大概率发生在 `generateGlobalBRollPlan()` 等待 Moonshot 返回阶段。
- 用户已明确要求：停止“局部补丁式”推进，先完成 Director 视觉模型“配置即所得”的系统设计。

## 本轮完成

- 排查当前运行态：
  - `PROJECTS_BASE` 实际指向 `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects`
  - `CSET-Seedance2/04_Visuals/director_state.json` 在 `2026-03-27 19:51` 更新到 Phase2
  - 但 `selection_state.json` 与 `phase2_分段视觉执行方案_CSET-Seedance2.md` 仍停留在 `2026-03-26 17:53`
- 结论：
  - 这次 Phase2 没有跑到落盘阶段
  - 前端长时间转圈不是 UI 假死，更像后端在等上游 LLM
- 代码修复：
  - `server/llm.ts`
  - 新增 `fetchWithTimeout()`
  - 覆盖 `zhipu/openai/deepseek/siliconflow/yinli/kimi` 全部 `fetch`
  - 超时报错格式统一为 `"<Provider> request timeout after 300s"`
- 配置页增强：
  - `src/components/LLMConfigPage.tsx`
  - 视觉模型配置页顶部已改为统一“核心凭证区”
  - 新增 `Google Gemini Image` 视觉服务入口
  - 下方新增“已配置视觉服务”列表，已支持展示 Google / Volcengine
- 配置后端增强：
  - `src/schemas/llm-config.ts` 新增 generation provider `google`
  - `server/llm-config.ts` 已支持保存/读取/测试 `GOOGLE_API_KEY`
- 设计方案落盘：
  - `docs/plans/2026-03-27_director-visual-model-config-as-truth.md`
  - 核心判断：必须新增显式视觉模型目录 + Director 统一 runtime router，不能继续只改 UI

## 验证情况

- 已执行 `npm run build`
- 结果：失败，但失败项均为仓库既有 TS 存量错误，未指向本次 `server/llm.ts` 改动
- 未完成一条真正的 Phase2 端到端回归，需要用户在页面上重新触发一次以验证超时/报错体验
- 已用 `agent-browser` 确认本地应用主页可打开；视觉配置页结构改动未做完整点击链验收
- 当前阶段为设计态，尚未开始按新方案收口 Director 视觉执行链路

## WIP

- 如需继续收口，下一步建议：
  - 先等待用户审阅 `docs/plans/2026-03-27_director-visual-model-config-as-truth.md`
  - 审阅通过后按方案进入实现：先建 registry，再建 runtime router，再替换 Director 图片入口
  - LLM 超时问题后续与视觉配置即所得改造并行验证

## 待解决问题

- 仓库当前 `npm run build` 仍被大量历史 TS 错误阻塞，影响常规回归验证。
- 当前没有单独的 Director Phase2 超时自动化测试。
