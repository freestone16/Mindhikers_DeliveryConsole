# TREQ-YYYY-MM-DD-DIRECTOR-XXX

## 元信息

- module: Director
- request_id: TREQ-YYYY-MM-DD-DIRECTOR-XXX
- created_by: Codex
- priority: P1 | P2 | P3
- expected_report: `testing/director/reports/TREQ-YYYY-MM-DD-DIRECTOR-XXX.report.md`

## 测试目标

一句话说明要验证什么问题。

## 背景

说明这轮测试和哪个 bug / 修复相关。

## 前置条件

1. 当前 worktree：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
2. 已启动：`npm run dev`
3. 指定项目 / 文稿 / 页面入口
4. 如需真实页面操作，明确写明是否必须使用 `agent browser`

## 执行步骤

1. 打开页面
2. 做具体点击或请求
3. 记录关键现象

## 预期结果

1. 页面行为
2. API 行为
3. 文件写盘行为
4. 不应出现的报错

## 失败时必须收集

1. 截图路径
2. 后端日志片段
3. 浏览器报错
4. 相关输出文件路径

## 备注

补充说明。

如果本条 request 指定必须使用 `agent browser`，report 里要单独写：

1. 是否真实使用了 `agent browser`
2. 若没有，为什么阻塞
3. 是否发生了 fallback
