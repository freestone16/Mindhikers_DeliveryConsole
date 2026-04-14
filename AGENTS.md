# Director Agent Rules

## 1. Scope

当前目录是 `S2` 模块入口：

- 路径：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
- 父入口：`/Users/luzhoua/MHSDC/DeliveryConsole/AGENTS.md`
- 全局入口：`/Users/luzhoua/MHSDC/AGENTS.md`

这里不再重复项目级总规则，只补 `Director` 自己的模块边界、验证方式和交付红线。

## 2. OldYang First

凡是工程与治理任务，默认先经 `OldYang`。

当前模块入口只负责：

- 标明 `Director` 的模块边界
- 指向 handoff、计划、rules、testing
- 防止模块入口继续膨胀成第二套项目总纲

## 3. Read Order

进入当前模块后，默认按下面顺序读取：

1. 当前文件 `AGENTS.md`
2. 父入口：`/Users/luzhoua/MHSDC/DeliveryConsole/AGENTS.md`
3. `docs/dev_logs/HANDOFF.md`
4. 当前模块主线计划
5. `docs/04_progress/rules.md`
6. 如任务涉及测试，再读：
   - `testing/README.md`
   - `testing/OPENCODE_INIT.md`
   - 当前模块测试子目录 README

当前层足够时停止下钻，不为“更完整”而盲目扩读。

## 4. Local Red Lines

1. `Director` 只补自身运行、视觉链路和验证约束，不重写上层治理总纲。
2. 视觉执行链路、配置即所得、模型接入与验证链路不要和其他模块混改。
3. 只要涉及页面验证、配置页、运行态结果或真实流程截图，默认优先 `agent-browser`。
4. 交给用户测试前，必须至少自测一条主按钮、主页面或主 API。

## 5. Testing And Browser

1. 用户说“协调opencode测试”时，默认按当前模块测试协议进入 ready，不自动起跑 request。
2. 默认优先读取：
   - `testing/README.md`
   - `testing/OPENCODE_INIT.md`
   - 当前测试模块 README
3. 页面查看、UI 验证、截图、交互检查默认优先 `agent-browser`。
4. 完成前验证至少覆盖一条当前用户真正要用的主链路。

## 6. References

1. 父入口：`/Users/luzhoua/MHSDC/DeliveryConsole/AGENTS.md`
2. 全局入口：`/Users/luzhoua/MHSDC/AGENTS.md`
3. 当前交接：`docs/dev_logs/HANDOFF.md`
4. 当前规则：`docs/04_progress/rules.md`
5. 一期总计划：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/plans/2026-04-06_MHSDC_Governance_Full_Coverage_And_Historical_Migration_Plan.md`
6. 一期覆盖矩阵：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/plans/2026-04-06_MHSDC_Governance_Coverage_Matrix.md`
7. 一期执行板：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/plans/2026-04-06_MHSDC_Governance_Phase1_Pilot_Execution_Board.md`
