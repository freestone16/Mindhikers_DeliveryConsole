# L-017 - 真实验收优先于软冒烟

## 问题

Director 与 OpenCode 的第一轮协议测试虽然跑通了 request -> claim -> report -> status，但测试报告把“页面打开成功、按钮点击成功、没有明显报错”误判成了 `passed`。

这类软冒烟会带来两个问题：

1. 规划端误以为主链路业务已通过
2. 下一轮排错几乎拿不到强证据，只能重新人工复测

## 根因

1. request 写得太宽，只要求“完成一次有效测试回报”
2. OpenCode 执行 prompt 没有把 `passed` 定义成硬性断言
3. 报告模板没有强制要求写盘产物、完成态或 API 成功信号

## 正确做法

以后对主链路测试，尤其是 Director Phase1 这类会触发后端生成和本地写盘的流程，必须把通过条件写成硬判据：

1. 页面进入生成态
2. 页面出现完成态
3. 目标输出文件在测试开始后刷新
4. 文件内容不是空态或占位文案

任何一项无法证明，都应该写 `failed` 或 `blocked`，而不是 `passed`。

## 本次落地

1. 收紧 `testing/prompts/OPENCODE_TEST_RUNNER.md`
2. 在 `testing/README.md` / `testing/OPENCODE_INIT.md` / `testing/director/README.md` 中加入“什么才算通过”
3. 新增 `TREQ-2026-03-16-DIRECTOR-003-phase1-real-validation.md`，要求对 Director Phase1 做真实验收

## 规则沉淀

见 `rules.md` 第 119 条。
