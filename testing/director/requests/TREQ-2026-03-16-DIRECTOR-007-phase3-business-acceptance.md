# TREQ-2026-03-16-DIRECTOR-007

## 元信息

- module: Director
- request_id: TREQ-2026-03-16-DIRECTOR-007
- created_by: Codex
- priority: P2
- expected_report: `testing/director/reports/TREQ-2026-03-16-DIRECTOR-007-phase3-business-acceptance.report.md`

## 测试目标

对 Director `Phase3` 做正式业务验收，确认渲染队列、状态轮询、单条通过与阶段推进可用。

## 背景

这条测试依赖 `Phase2` 已有至少一个勾选方案。  
由于渲染链可能受外部生成能力影响，本条允许 `blocked`，但不允许“没验证就 passed”。

## 前置条件

1. `TREQ-2026-03-16-DIRECTOR-006` 已通过
2. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
3. 已启动：`npm run dev`
4. 必须使用 `agent browser`
5. 页面已进入 `Phase 3: 视频二审`
6. 状态文件：`04_Visuals/phase3_render_state.json`

## 执行步骤

1. 在 `Phase3` 页面确认至少有一个可渲染条目。
2. 点击 `渲染所有视频`。
3. 观察并记录：
   - 是否出现 `渲染中`
   - 是否出现进度变化或轮询状态
   - 是否出现视频、失败态或“无需 AI 渲染”提示
4. 如果有至少一个条目完成：
   - 对其执行通过打勾
   - 验证页面允许继续推进
5. 如果所有条目都完成且可推进，点击 `提交 → Phase 4`
6. 验证 `phase3_render_state.json` 存在并记录任务状态

## 预期结果

本条通过分两档：

1. `passed`
   - 至少一个渲染任务真实完成或被系统判定为可跳过
   - 页面状态和 `phase3_render_state.json` 一致
   - 页面允许推进到 `Phase4`
2. `blocked`
   - 页面与流程本身正常，但外部渲染依赖导致任务无法在合理时间内完成

## 失败时必须收集

1. 触发前、渲染中、结束后的截图
2. `phase3_render_state.json` 摘要
3. 若失败，记录错误文案与任务状态
4. 若 blocked，说明是 UI/宿主问题还是外部渲染依赖问题

## 备注

本条重点是分清“宿主工作流坏了”还是“外部渲染依赖慢/挂了”。
