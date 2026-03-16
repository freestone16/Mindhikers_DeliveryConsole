# L-018 - 页面验收优先用 Agent Browser

## 问题

当测试协议已经引入 OpenCode 作为执行端后，如果浏览器步骤仍然允许执行端自由选择随意脚本或弱代理方案，就容易出现两个偏差：

1. 页面行为与真实用户操作不一致
2. 报告里缺少高质量截图、完成态和 network 证据

## 用户纠正

用户明确要求：只要是浏览器环节，OpenCode 测试团队优先使用 `agent browser` 来测。

## 为什么这条纠正重要

对 Director Phase1 这类主链路来说，真正有价值的证据往往来自：

1. 真实页面点击
2. loading 与完成态切换
3. 页面截图
4. 浏览器 console / network

如果浏览器执行层太弱，就算 report 写得很长，也未必能帮助规划端继续排错。

## 本次落地

1. 收紧 `testing/prompts/OPENCODE_TEST_RUNNER.md`
2. 在 `testing/README.md` / `testing/OPENCODE_INIT.md` / `testing/CROSS_ENDPOINTS.md` / `testing/director/README.md` 中显式写入 `agent browser` 约束
3. 新增 `TREQ-2026-03-16-DIRECTOR-004-phase1-real-validation-agent-browser.md` 作为当前权威 request

## 规则沉淀

见 `rules.md` 第 120 条。
