# TREQ-2026-03-16-DIRECTOR-008

## 元信息

- module: Director
- request_id: TREQ-2026-03-16-DIRECTOR-008
- created_by: Codex
- priority: P2
- expected_report: `testing/director/reports/TREQ-2026-03-16-DIRECTOR-008-phase4-business-acceptance.report.md`

## 测试目标

对 Director `Phase4` 做正式业务验收，确认 SRT 识别 / XML 生成 / 下载链路可用。

## 背景

这条测试依赖前序阶段至少已有可导出的视觉条目。  
本条优先验证“能否生成和下载 XML”，不强求所有时间轴对齐都完美。

## 前置条件

1. `TREQ-2026-03-16-DIRECTOR-007` 已通过或已推进到 `Phase4`
2. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
3. 已启动：`npm run dev`
4. 必须使用 `agent browser`
5. 页面位于 `Phase 4: 时轴比照与 XML 导出`

## 执行步骤

1. 进入 `Phase4`。
2. 观察是否自动扫描到 SRT 文件。
3. 如果扫描到 SRT：
   - 加载一份 SRT
   - 执行比照
   - 再生成 XML
4. 如果没有 SRT 或比照流程受阻：
   - 走 `跳过 SRT，直接生成 XML`
5. 生成完成后，验证：
   - 是否出现下载按钮
   - `Premiere XML` 下载接口是否可访问
   - `剪映 XML` 下载接口是否可访问
6. 如条件允许，实际触发下载并记录响应情况。

## 预期结果

只有以下结果全部满足，才能写 `passed`：

1. 页面能进入 `Phase4`
2. 至少一种 XML 生成路径成功
3. 至少一个下载入口可用
4. 无明显 `XML生成失败`

如果页面没坏，但缺少输入素材或上游状态不完整，应标为 `blocked`。

## 失败时必须收集

1. Phase4 入口截图
2. SRT 扫描或跳过 XML 的截图
3. 生成成功后的按钮截图
4. 下载接口响应或错误摘要

## 备注

本条更关注交付出口可用性，而不是 AI 对齐质量本身。
