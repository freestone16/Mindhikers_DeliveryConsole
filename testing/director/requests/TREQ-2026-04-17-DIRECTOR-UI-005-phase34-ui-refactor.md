# TREQ-2026-04-17-DIRECTOR-UI-005

## 元信息

- module: Director
- request_id: TREQ-2026-04-17-DIRECTOR-UI-005
- created_by: Codex
- priority: P1
- expected_report: `testing/director/reports/TREQ-2026-04-17-DIRECTOR-UI-005-phase34-ui-refactor.report.md`

## 测试目标

对 Director `Phase3` 和 `Phase4` 的 UI 重构做验收，确认暖纸面配色、编排感、交付序列可视化正确呈现。

## 背景

本次重构基于 Unit 5 计划，核心改动：
- P3: 新增 RenderPipelineBoard 编排概览条、状态点、序号、类型图标
- P4: 新增交付序列 Stepper（找到 SRT → 对齐时轴 → 生成 XML → 下载交付）、下一步 Handoff 提示
- 全局: 从深色 slate 迁移到暖纸面配色（#c97545 强调色、#e4dbcc 边框、#f4efe5 背景）

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
2. 已启动：`npm run dev`
3. 分支：`MHSDC-DC-director`
4. 页面已进入 Director 模块

## 执行步骤

### Phase 3 验证
1. 点击 Phase 3 标签进入「视频二审」
2. 确认顶部出现 RenderPipelineBoard（待渲染/渲染中/已完成/已通过 统计）
3. 确认每个章节卡片有：状态彩色圆点、序号、类型标签（Remotion动画/文生视频等）
4. 确认按钮为暖色（#c97545）而非蓝色
5. 确认整体背景为暖纸面（#f7f2ea）

### Phase 4 验证
1. 点击 Phase 4 标签进入「时轴比照与 XML 导出」
2. 确认顶部出现交付序列 Stepper（4 个步骤带 ArrowRight 连接）
3. 确认当前步骤高亮（#c97545 背景）
4. 确认 SRT 上传区域使用暖色边框
5. 若生成 XML 成功，确认出现「交付完成」绿色状态 + 下载按钮
6. 确认出现「下一步 Handoff」提示卡片

## 预期结果

全部满足才能写 `passed`：
1. Phase 3 显示 RenderPipelineBoard 和状态统计
2. Phase 3 章节卡片有状态点和序号
3. Phase 4 显示交付序列 Stepper
4. Phase 4 有「下一步 Handoff」提示
5. 所有配色为暖纸面，无残留深色 slate 元素

## 失败时必须收集

1. Phase 3 和 Phase 4 的页面截图
2. 任何残留的深色/蓝色元素位置
3. console 错误日志

## 备注

本次为纯 UI 重构，不涉及业务逻辑改动。API 调用和 SSE 处理保持原样。
