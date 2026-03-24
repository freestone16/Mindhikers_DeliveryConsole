🕐 Last updated: 2026-03-25 00:45
🌿 Branch: MHSDC-GC-SSE

## 当前状态
- 本轮主成果已从“环境讨论”收束为“Git / 目录治理收口”。
- 目录治理已完成的核心目标：即使删除旧代码目录 `/Users/luzhoua/DeliveryConsole`，当前 SSE 启动层也不应再直接炸掉。
- 已完成的最小治理补丁已本地并入 `MHSDC-GC-SSE`：
  - commit: `b8a8854`
  - 内容：`README.md`、`RELOCATION.md`、`.claude/launch.json`、`ecosystem.config.cjs`、`package.json`、`package-lock.json`
- `b8a8854` 已单独推送到远端 `origin/MHSDC-GC-SSE`，没有夹带搜索排错脏改动。
- 入口文档继续完成第二轮收口：
  - `README.md`
  - `AGENTS.md`
  - `claude.md`
  - `.agent/PROJECT_STATUS.md`
- 活跃计划 / 索引文档已开始从旧目录口径切到 `MHSDC`：
  - `docs/plans/2026-03-10_SD210_GoldenMetallurgist_Skill_Architecture.md`
  - `docs/plans/2026-03-12_*`
  - `docs/plans/2026-03-19_SD223_Soul_Inference_Schema_v0.1.md`
  - `docs/crucible_v1 /INDEX.md`
  - `docs/crucible_v1 /2026-03-13~14_*`
- 新增治理清单：
  - `docs/plans/2026-03-25_MHSDC_Worktree_Migration_Governance.md`
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
- 本轮已把入口级文档与一批活跃计划文档切到 `MHSDC` 口径，但仍有历史 plans / design docs / dev_logs / lessons 保留旧绝对路径。
- 当前剩余的旧路径引用大多已降级为“历史档案问题”，不是启动层风险；后续需要继续按批次处理，而不是一把梭全仓替换。
- 当前与搜索排错直接相关的未提交文件主要包括：
  - `server/crucible.ts`
  - `server/crucible-research.ts`
  - `src/__tests__/crucible-research.test.ts`
  - `docs/04_progress/dev_progress.md`
  - `docs/04_progress/rules.md`
  - `runtime/crucible/golden-crucible-sandbox/turn_log.json`

## 新窗口继续 Git 治理怎么做
- 先只做 Git / 目录治理，不要顺手处理老张搜索修复。
- 第一步先看 `docs/plans/2026-03-25_MHSDC_Worktree_Migration_Governance.md`，按里面的 `Phase A / B / C` 继续清仓。
- 第二步继续扫仓库里仍残留的 `DeliveryConsole` / 旧路径文档与说明，但优先级低于启动层；先清运行风险，再清历史文案。
- 第三步优先清仍会被当前窗口引用的 plans / design docs；`lessons`、旧 `dev_logs`、`.agent/memory_dumps` 最后处理。
- 第四步单独判断远端仓库命名、默认分支 README 展示、以及 SaaS 新 worktree 的后续治理，不要和当前 SSE 脏现场耦合。

## 提醒
- 新窗口开始前先读：
  - `docs/dev_logs/HANDOFF.md`
  - `docs/04_progress/rules.md`
  - `docs/04_progress/dev_progress.md`
- 当前最重要的边界是：**Git / 目录治理** 与 **老张搜索排错** 必须拆开继续做。
