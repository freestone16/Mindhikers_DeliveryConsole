# Director 最小回灌执行计划

**日期**: 2026-04-24
**执行目录**: `/Users/luzhoua/MHSDC/DeliveryConsole/Director`
**执行分支**: `MHSDC-DC-director`
**参考目录**: `/Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal`
**参考分支**: `director-final`
**状态**: ready-for-next-window

## 简单结论

最小回灌应该在 `Director` 目录实施，不应该继续在 `DirectorFinal` 里做。

原因很简单：要变干净、要提交、要继续验收的是 `MHSDC-DC-director`。`DirectorFinal` 已经完成它作为“参考样本”的价值，下一步只拿它对照，不再把它当成新的实施现场。

## 目标

证明或补齐一件事：

> `MHSDC-DC-director` 是否已经完整具备 DirectorFinal 中确认安全的等价路径治理能力。

如果已经具备，不新增代码。

如果仍有缺口，只做路径治理相关的最小 patch。

## 非目标

以下都不是本轮目标：

- 整枝 merge `director-final`
- 整枝 cherry-pick `director-final`
- 搬运 SaaS / GoldenCrucible 壳层
- 改品牌文案
- 改布局结构
- 清理所有历史类型债
- 处理微信、Google、SaaS auth、历史会话等无关能力
- commit 或 push

## Step 0：进入目标目录

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/Director
git branch --show-current
git status --short --branch
```

必须确认当前分支是：

```text
MHSDC-DC-director
```

如果不是，停止。

## Step 1：读取交接

```bash
cat docs/dev_logs/HANDOFF.md
cat docs/04_progress/rules.md
cat docs/dev_logs/2026-04-24.md
```

必要时再读：

```bash
cat docs/plans/2026-04-24-directorfinal-fine-backport-plan.md
```

## Step 2：路径治理缺口扫描

执行：

```bash
rg "from './project-root'|from \"./project-root\"|PROJECTS_BASE\\s*=|process\\.env\\.PROJECTS_BASE" server src --glob '!*.backup' --glob '!server/project-paths.ts'
rg "project-root" server src --glob '!*.backup'
```

记录结果。

通过标准：

- `project-root` 非 backup 引用为 0
- `server/project-root.ts` 不存在
- 除 `server/project-paths.ts` 和测试外，不应直接读取 `process.env.PROJECTS_BASE`
- `server/index.ts` 的注释可以存在，不算问题

## Step 3：对照关键文件

只对照这些文件，不搬整枝差异：

```bash
git diff --no-index /Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal/server/project-paths.ts server/project-paths.ts
git diff --no-index /Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal/server/index.ts server/index.ts
git diff --no-index /Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal/server/distribution.ts server/distribution.ts
git diff --no-index /Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal/src/components/Header.tsx src/components/Header.tsx
git diff --no-index /Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal/src/__tests__/server/project-paths.test.ts src/__tests__/server/project-paths.test.ts
```

注意：

- `git diff --no-index` 返回非 0 只代表有差异，不代表命令失败
- 只看路径治理相关差异
- 不要照搬整文件

## Step 4：判断是否需要 patch

### 无缺口

如果扫描与对照都说明目标分支已经具备等价能力：

1. 不改代码
2. 更新 `docs/dev_logs/2026-04-24.md`
3. 更新 `docs/dev_logs/HANDOFF.md`
4. 进入提交前分拣

### 有缺口

只允许以下 patch：

- import 从 `./project-root` 改到 `./project-paths`
- 静态 `PROJECTS_BASE` 改为 `getProjectsBase()`
- 项目路径拼接改为 `getProjectRoot(projectId)` 或 `resolveProjectPath()`
- 缺测试时补 `src/__tests__/server/project-paths.test.ts`

每个 patch 后都要重新跑对应扫描。

## Step 5：明确禁止搬运的差异

不要搬：

- `src/SaaSApp.tsx`
- `src/components/StatusFooter.tsx`
- `src/components/delivery-shell/DeliveryShellLayout.tsx` 中移除 topbar 的结构
- `src/styles/delivery-shell.css` 的高度策略
- DirectorFinal 的整份 HANDOFF / daily log
- GoldenCrucible / SaaS-only 代码

这些差异如未来要做，必须单独立题、单独计划、单独验证。

## Step 6：验证

最小验证：

```bash
npm run build
npm run test:run -- src/__tests__/server/project-paths.test.ts src/__tests__/director-bridge.test.ts src/__tests__/director-adapter.test.ts src/components/director/ChapterCard.test.tsx src/components/director/Phase1View.test.tsx src/components/director/Phase2View.test.tsx src/components/director/Phase3View.test.tsx src/components/director/Phase4View.test.tsx
```

如果改到 UI 或 shell：

- 用 Agent Browser 打开本地页面
- 检查项目下拉
- 检查脚本列表
- 检查 P1 主区域
- 检查 Drawer tabs

## Step 7：提交前分拣建议

当前工作树可能包含多类改动，不要混成一个提交。

建议拆分：

1. `runtime cache noise`
   - `skills/__pycache__/*.pyc`
   - `skills/connectors/__pycache__/*.pyc`
2. `director adapter root fix`
   - `server/expert-actions/director.ts`
   - `src/__tests__/director-adapter.test.ts`
3. `typescript contract and legacy compatibility`
   - `src/types.ts`
   - `src/schemas/llm-config.ts`
   - ChatPanel / Market / legacy dashboard 兼容文件
4. `director component test alignment`
   - director phase 组件与测试
5. `governance docs`
   - `docs/dev_logs/HANDOFF.md`
   - `docs/dev_logs/2026-04-24.md`
   - `docs/plans/*`
   - `docs/04_progress/dev_progress.md`
   - `docs/04_progress/rules.md`

commit 前必须问老卢：

- 对应 Linear issue 是哪个
- 是否按上面拆分
- 哪些提交用 `refs MIN-xx`
- 是否有收口提交允许用 `fixes` / `closes`

## 完成判据

本轮完成时必须能回答：

1. `MHSDC-DC-director` 是否还有路径治理缺口？
2. 如果有，具体补了哪些最小 patch？
3. `npm run build` 是否通过？
4. focused tests 是否通过？
5. 是否触发 UI smoke？
6. 提交前应如何拆分？

没有这些答案，不进入 commit。
