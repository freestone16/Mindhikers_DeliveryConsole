# GoldenCrucible-SaaS Agent Rules

## 0. Railway 环境架构

当前 `GoldenCrucible-SaaS-Staging` 项目下设有三个环境，对应不同的代码分支与用途：

| 环境 | 对应分支 | 用途 | 域名 | 本地目录 |
|------|----------|------|------|----------|
| `production` | `main` | 对外生产环境 | `gc.mindhikers.com` | — |
| `staging` | `MHSDC-GC-SAAS-staging` | SaaS 集成/预发测试 | `golden-crucible-saas-staging.up.railway.app` | `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS` |
| `sse` | `MHSDC-GC-SSE` | SSE 新功能开发线 | `golden-crucible-saas-sse.up.railway.app` | `/Users/luzhoua/MHSDC/GoldenCrucible-SSE` |

**发布流**：`MHSDC-GC-SSE`（开发）→ `MHSDC-GC-SAAS-staging`（预发）→ `main`（生产）

## 1. Scope

当前目录是 `S1` 仓级入口：

- 路径：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
- 个人全局入口：`/Users/luzhoua/.codex/AGENTS.md`
- 上层项目族入口：`/Users/luzhoua/MHSDC/AGENTS.md`

这里不再重复全局治理总纲，只补 `SaaS` 自己的运行、验证与交付约束。

## 2. OldYang First

凡是工程与治理任务，默认先经 `OldYang`。

当前仓的职责是：

- 提供 `SaaS` 特有边界
- 指向当前 handoff、计划、规则与测试入口
- 避免把长篇治理正文继续堆回仓级入口

## 3. Read Order

进入当前仓后，默认按下面顺序读取：

1. 当前文件 `AGENTS.md`
2. `docs/dev_logs/HANDOFF.md`
3. 当前主线计划：
   - `docs/plans/2026-04-06_MHSDC_Governance_Full_Coverage_And_Historical_Migration_Plan.md`
   - `docs/plans/2026-04-06_MHSDC_Governance_Coverage_Matrix.md`
   - `docs/plans/2026-04-06_MHSDC_Governance_Phase1_Pilot_Execution_Board.md`
4. `docs/04_progress/rules.md`
5. 如任务涉及测试，再读：
   - `testing/README.md`
   - `testing/OPENCODE_INIT.md`
   - `testing/golden-crucible/README.md`

当前层足够时停止下钻，不为“更完整”而盲目扩读。

## 4. Local Red Lines

1. `SaaS` 是发布收口线，不要把研发试验线、发布线、线上环境混成一层。
2. 讨论线上问题时，先区分 `local / staging / production`；提到 `gc.mindhikers.com` 时，默认先按 `production` 理解。
3. 治理工作当前主线是“覆盖 rollout + 历史文档映射迁移”，不是再写第二套总纲。
4. 历史项目文档继续遵守零损失原则：先编目、再映射、再迁移，不做无索引删除。
5. 当前 worktree 不干净；治理文档改动不要和宿主边界整改业务改动混提。

## 5. Testing And Browser

1. 页面查看、UI 验证、截图、交互检查、线上页面核验，默认优先 `agent-browser`。
2. 用户说“协调opencode测试”时，默认进入 OpenCode 协同测试模式，只做环境 ready 与协议接管，不自动发起 request。
3. 完成前验证至少覆盖：
   - 当前主页面或主入口一条
   - 当前主 API 或主链路一条
   - 必要的 handoff / 日志回写

## 6. References

1. 个人全局入口：`/Users/luzhoua/.codex/AGENTS.md`
2. 项目族入口：`/Users/luzhoua/MHSDC/AGENTS.md`
3. 当前交接：`docs/dev_logs/HANDOFF.md`
4. 当前总计划：`docs/plans/2026-04-06_MHSDC_Governance_Full_Coverage_And_Historical_Migration_Plan.md`
5. 当前覆盖矩阵：`docs/plans/2026-04-06_MHSDC_Governance_Coverage_Matrix.md`
6. 当前执行板：`docs/plans/2026-04-06_MHSDC_Governance_Phase1_Pilot_Execution_Board.md`
7. 规则文件：`docs/04_progress/rules.md`
8. 测试入口：`testing/README.md`
