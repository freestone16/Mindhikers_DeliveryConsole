# TREQ-YYYY-MM-DD-GC-XXX

## Metadata

- module: GoldenCrucible
- request_id: TREQ-YYYY-MM-DD-GC-XXX
- created_by: Codex
- priority: P1 | P2 | P3
- required_model: `zhipuai-coding-plan/glm-5`
- must_use_agent_browser: true | false
- expected_report: `testing/golden-crucible/reports/TREQ-YYYY-MM-DD-GC-XXX.report.md`

## Goal

一句话写清这轮到底要验证什么。

## Preconditions

1. 当前 worktree：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
2. 本地服务已启动
3. 指定 URL / 页面入口 / 关键数据

## Steps

1. 打开目标页面
2. 执行操作
3. 记录关键现象

## Expected

1. 页面行为
2. 接口或写盘行为
3. 失败时要抓什么证据

## Report Requirements

1. 写明 `actual_model`
2. 写明 `browser_execution`
3. 给出 evidence 路径
4. 最终写出 `status`
