# TREQ-2026-03-16-DIRECTOR-006

## 元信息

- module: Director
- request_id: TREQ-2026-03-16-DIRECTOR-006
- created_by: Codex
- priority: P1
- expected_report: `testing/director/reports/TREQ-2026-03-16-DIRECTOR-006-phase2-business-acceptance.report.md`

## 测试目标

对 Director `Phase2` 做正式业务验收，确认从概念提案进入视觉方案生成、勾选方案并提交到 `Phase3` 的主链路可用。

## 背景

这条测试依赖 `Phase1` 已通过。  
重点不是所有候选都完美，而是 `Phase2` 的生成、筛选、勾选、阶段推进是否正常。

## 前置条件

1. `TREQ-2026-03-16-DIRECTOR-005` 已通过
2. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
3. 已启动：`npm run dev`
4. 必须使用 `agent browser`
5. 页面入口：`http://localhost:5178/`
6. 项目：`CSET-Seedance2`
7. 文稿：`02_Script/CSET-seedance2_深度文稿_v2.1.md`
8. 状态文件：`04_Visuals/selection_state.json`

## 执行步骤

1. 打开页面并进入 `影视导演`。
2. 如果停留在 `Phase1`，点击 `Approve & Continue` 进入 `Phase2`。
3. 在 `Phase2` 选择至少一种 B-roll 类型并执行 `Confirm & Generate Previews`。
4. 等待预览方案生成，观察：
   - `正在为你的剧本生成视觉方案...`
   - 卡片列表出现
   - `筛选结果` 统计出现
5. 至少在一个章节中完成：
   - 选择一个方案
   - 勾选确认该方案
6. 点击 `提交 → Phase 3`。
7. 验证页面进入 `Phase 3: 视频二审`。
8. 验证 `selection_state.json` 已更新，且至少包含一个被勾选方案。

## 预期结果

只有以下结果全部满足，才能写 `passed`：

1. `Phase2` 成功生成视觉方案列表
2. 至少一个方案可被选择并勾选
3. 点击提交后页面成功进入 `Phase3`
4. `selection_state.json` 存在且反映出本次选择结果
5. 无明显 API 500 或卡死在无限 loading

## 失败时必须收集

1. 生成前、生成中、生成后的截图
2. 至少一个章节卡片截图
3. `selection_state.json` 摘要
4. 关键 console / network 证据

## 备注

如果生成失败但出现明确兜底文案，也要如实记录，不要硬判通过。
