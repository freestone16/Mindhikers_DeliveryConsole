# MHSDC Worktree Migration Governance

> 日期：2026-03-25
> 当前工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 当前分支：`MHSDC-GC-SSE`
> 状态：执行中 / 作为“彻底弃用旧 DeliveryConsole 目录”治理清单

## 1. Current State

当前运行与启动层已经基本完成切换：

- `MHSDC-GC-SSE` 的启动配置、README 入口、生态脚本已可独立工作
- 目录治理提交 `b8a8854` 与入口文档收口提交 `2dcd736` 已单独推到远端
- 当前主风险不再是“代码启动依赖旧目录”，而是“文档和协作口径仍持续把旧目录当现行入口”

当前残留大致分三层：

1. 入口级协作文档
   - `README.md`
   - `RELOCATION.md`
   - `AGENTS.md`
   - `claude.md`
   - `.agent/PROJECT_STATUS.md`
2. 活跃计划与设计文档
   - `docs/plans/` 中仍被频繁引用、且头部写死旧工作目录的方案
   - `docs/crucible_v1 /INDEX.md` 这类仍承担入口导航作用的索引文档
3. 纯历史档案
   - 早期 `docs/dev_logs/`
   - `docs/04_progress/lessons/`
   - `.agent/memory_dumps/`

## 2. Target Structure

目标口径统一为：

1. 任何当前执行、启动、排障、交接入口都默认指向 `MHSDC/*` worktree
2. `/Users/luzhoua/DeliveryConsole` 只允许出现在明确标注为“历史记录”的文档里
3. 旧目录相关说法若仍保留，必须说明：
   - 这是历史阶段
   - 当前默认目录是什么
   - 不应再按旧目录执行启动或排障

## 3. Execution Plan

### Phase A: 入口清理

- 统一入口文档标题、目录树示例、当前工作目录描述
- 修正 `.agent/PROJECT_STATUS.md` 的分支与仓库身份
- 修正仍会误导协作的索引文档链接

### Phase B: 活跃文档头部迁移

- 只改文首元信息与迁移说明，不改历史正文结论
- 将 `工作目录` 改为 `当前工作目录`
- 将原分支标记为 `历史落盘分支`
- 增补一行迁移说明，声明当前默认 worktree

### Phase C: 历史档案分层

- 对纯历史文档尽量不重写正文
- 必要时仅补一段文件头说明，避免后续窗口误用
- `.agent/memory_dumps/` 可最后处理，不作为当前执行阻塞

## 4. Open Questions

以下事项单独治理，不与本轮路径清仓绑在同一个提交里：

1. 远端仓库是否改名为更贴近 `MHSDC` / `GoldenCrucible-SSE`
2. 默认分支 README 是否需要改成更通用的工作区总入口
3. `GoldenCrucible-SaaS` 新 worktree 的 README / handoff / 端口治理是否要同步建立一套镜像纪律

## 5. Exit Criteria

满足以下条件后，可认为“仓库内已基本完成对旧 DeliveryConsole 目录的现实弃用”：

1. 当前入口文档已不再把旧目录当默认路径
2. 所有活跃计划文档文首已标明 `MHSDC` 当前目录与历史落盘分支
3. 纯历史档案即使保留旧目录，也不会再误导启动或交接
4. 新窗口接手时，只看 `README.md`、`HANDOFF.md`、`.agent/PROJECT_STATUS.md` 就不会再被带回旧目录
