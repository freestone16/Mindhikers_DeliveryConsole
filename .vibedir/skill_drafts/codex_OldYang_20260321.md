---
name: OldYang
description: 在 DeliveryConsole 与相关项目中处理代码、架构、实现方案、分支纪律、研发流程治理时使用。用户提到“老杨”或 “OldYang”，或请求编码、设计、调试、实现、分支/工作树、端口治理、implementation plan、研发落盘时应触发。
---

# OldYang Wrapper

真实 SSOT 位于：
`/Users/luzhoua/.gemini/antigravity/skills/OldYang/SKILL.md`

说明：这是 Codex 侧的最小 wrapper，用于保持触发克制与关键硬约束对齐；具体执行以 SSOT 为准。

使用本 skill 时：

1. 所有思考、沟通、方案与最终输出使用中文。
2. 先读取母本 skill，再按其中约束执行；不要在本 wrapper 中复制或改写母本全文。
3. 分支语境校验：任何代码/设计工作开始前先执行 `git branch --show-current`。
   - 若语境错配（分支名与任务明显不一致），必须先停下并引导切分支或新建分支。
   - 禁止在 `main` 上直接做新开发。
4. 会话启动检查（若文件存在则读取，顺序与 SSOT 对齐）：
   - `docs/dev_logs/HANDOFF.md`：读取后立即用 `git branch --show-current` 核对文件头分支名；不一致说明来自其他分支，需谨慎参考；同时以最新时间戳版本为准。
   - `docs/04_progress/rules.md`
   - `docs/dev_logs/YYYY-MM-DD.md`（需要某日细节时）
   - `docs/04_progress/dev_progress.md`（需要版本表时）
5. `docs/dev_logs/HANDOFF.md` 是三层日志结构的交接层，内容必须包含：时间戳（精确到分钟）+ 分支名 + 当前状态 + WIP + 待解决问题。
6. 会话结束时必须覆盖写 `docs/dev_logs/HANDOFF.md`，且文件前两行必须固定为：
   - `🕐 Last updated: YYYY-MM-DD HH:MM`
   - `🌿 Branch: <当前分支名>`
   分支名通过 `git branch --show-current` 获取；以“时间戳 + 分支名”判断归属。
7. 端口与进程备案：启动/占用端口前先查 `~/.vibedir/global_ports_registry.yml`。
   - 若默认端口冲突，顺延寻找空闲端口并在账本中登记归属；禁止静默退让端口或不声明降级。
   - 清理遗留进程按：查账本 -> 查真实 PID -> 先 `kill -15` 优雅退出 -> 无效再 `kill -9`。
8. Git/交付红线：
   - 执行 `git commit` 前必须确认对应 Linear issue（如 `MIN-38`）；默认提交口径 `refs MIN-xx <变更摘要>`。
   - 任何 `git commit`、影响公共分支的 `git merge`、以及 `git push` 到远端前，必须显式拦截并向用户确认后再执行。
9. 新需求或较大改动：优先先出方案文档（如 implementation plan）并等待用户确认，再进入实现。
10. Skill 同步：若需更新 Skill 本身，保持 `.gemini` 下母本为唯一事实来源；Codex 侧只维护最小 wrapper。对本 wrapper 的任何修改都应在当前项目写入 `.vibedir/skill_drafts/` 快照并更新 `.vibedir/skill_registry.yml` 备案。

