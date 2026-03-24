🕐 Last updated: 2026-03-25 00:00
🌿 Branch: MHSDC-GC-SSE

## 当前状态
- 本轮主成果已从“环境讨论”收束为“Git / 目录治理收口”。
- 目录治理已完成的核心目标：即使删除旧代码目录 `/Users/luzhoua/DeliveryConsole`，当前 SSE 启动层也不应再直接炸掉。
- 已完成的最小治理补丁已本地并入 `MHSDC-GC-SSE`：
  - commit: `b8a8854`
  - 内容：`README.md`、`RELOCATION.md`、`.claude/launch.json`、`ecosystem.config.cjs`、`package.json`、`package-lock.json`
- `b8a8854` 已单独推送到远端 `origin/MHSDC-GC-SSE`，没有夹带搜索排错脏改动。
- 当前 SSE 本地环境可正常启动：
  - backend: `3009`
  - frontend: `5182`
- `main` 没有被改动。

## 已验证结果
- `http://127.0.0.1:3009/health` 返回 `status: ok`
- SSE 正式工作区已重启并可访问：`http://localhost:5182`
- 启动配置层已不再依赖旧目录 `/Users/luzhoua/DeliveryConsole`

## 当前 WIP
- 工作区仍然很脏，存在大量本轮之外的既有改动。
- 我另外开始了“老张搜索链路排错”，但这部分**尚未整理提交**，不应和 Git 治理混成同一个提交。
- 顶层入口文档仍在继续清理旧 `DeliveryConsole` 文案，但这一步只处理 README / handoff / relocation 一类会误导启动的入口文件。
- 当前与搜索排错直接相关的未提交文件主要包括：
  - `server/crucible.ts`
  - `server/crucible-research.ts`
  - `src/__tests__/crucible-research.test.ts`
  - `docs/04_progress/dev_progress.md`
  - `docs/04_progress/rules.md`
  - `runtime/crucible/golden-crucible-sandbox/turn_log.json`

## 新窗口继续 Git 治理怎么做
- 先只做 Git / 目录治理，不要顺手处理老张搜索修复。
- 第一步先看 `git status --short`，确认 `b8a8854` 已经单独上远端，后续只是在它之上继续做文档清理。
- 第二步继续扫仓库里仍残留的 `DeliveryConsole` / 旧路径文档与说明，但优先级低于启动层；先清运行风险，再清历史文案。
- 第三步把入口级文档和纯历史档案分层处理：README / HANDOFF / RELOCATION 优先，旧 plans / memory dump 延后。
- 第四步单独判断远端仓库命名、默认分支 README 展示、以及 SaaS 新 worktree 的后续治理，不要和当前 SSE 脏现场耦合。

## 提醒
- 新窗口开始前先读：
  - `docs/dev_logs/HANDOFF.md`
  - `docs/04_progress/rules.md`
  - `docs/04_progress/dev_progress.md`
- 当前最重要的边界是：**Git / 目录治理** 与 **老张搜索排错** 必须拆开继续做。
