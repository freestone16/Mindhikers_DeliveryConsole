# GoldenCrucible-SSE Agent Rules

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

- 路径：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- 上层全局入口：`/Users/luzhoua/MHSDC/AGENTS.md`

这里不再重复全局治理总纲，只补 `SSE` 自己的研发主线约束。

## 2. OldYang First

凡是工程与治理任务，默认先经 `OldYang`。

当前仓的职责是：

- 作为研发主线保留实验、演进与回灌能力
- 对接当前 handoff、计划、规则与测试入口
- 不再承载长篇总规则正文

## 3. Read Order

进入当前仓后，默认按下面顺序读取：

1. 当前文件 `AGENTS.md`
2. `docs/dev_logs/HANDOFF.md`
3. 当前主线计划与交接文档
4. `docs/04_progress/rules.md`
5. 如任务涉及测试，再读：
   - `testing/README.md`
   - `testing/OPENCODE_INIT.md`
   - `testing/golden-crucible/README.md`

当前层足够时停止下钻，不为“更完整”而盲目扩读。

## 4. Local Red Lines

1. `SSE` 是研发主线，不要把正式发布、生产域名、Cloudflare、Railway 收口内容整包当成当前仓主责。
2. `SSE` 与 `SaaS` 需要通过共享底座回灌保持同步，但不能把两者角色抹平。
3. 当前治理一期已锁定 `SSE` 为试点对象；后续入口改写要与 `SaaS` 保持同骨架、不同边界。
4. 历史文档继续走零损失编目，不做无映射迁移。

## 5. Testing And Browser

1. 页面查看、UI 验证、截图、交互检查默认优先 `agent-browser`。
2. 用户说“协调opencode测试”时，默认进入 OpenCode 协同测试模式，只做环境 ready 与协议接管，不自动发起 request。
3. 完成前验证至少覆盖：
   - 当前研发主链一条
   - 当前页面或接口验证一条
   - 必要的 handoff / 日志回写

## 6. References

1. 全局入口：`/Users/luzhoua/MHSDC/AGENTS.md`
2. 当前交接：`docs/dev_logs/HANDOFF.md`
3. 当前规则：`docs/04_progress/rules.md`
4. 一期总计划：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/plans/2026-04-06_MHSDC_Governance_Full_Coverage_And_Historical_Migration_Plan.md`
5. 一期覆盖矩阵：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/plans/2026-04-06_MHSDC_Governance_Coverage_Matrix.md`
6. 一期执行板：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/plans/2026-04-06_MHSDC_Governance_Phase1_Pilot_Execution_Board.md`
7. 测试入口：`testing/README.md`
