# [2026-03-06] | [SD-202_Director_Visual] | [✅ Done]

## 进展状态
为 `DirectorSection` 新增了全局一键重置功能，允许用户随时通过界面顶部的“重置”按钮，清空本模块的临时数据缓存（概念题案、打勾选项等），并发送 `chat-clear-history` 清除服务端相关的会话记录，从而彻底返回 Phase 1，开始全新的工作流程。

## 涉及文件
- [M] `src/components/DirectorSection.tsx`: 增加了 `RotateCcw` 的引入；绑定了包含二次确认的 `handleReset` 逻辑；在 Phase 控制栏增设红色的重置按键。

## 后续建议
暂时稳定。后续如有新增 Phase 的状态变量缓存，需确保同步加入 `handleReset` 中一起情况。
