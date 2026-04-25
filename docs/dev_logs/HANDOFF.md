**时间**: 2026-04-25 09:27 CST
**分支**: `MHSDC-DC-director`

# HANDOFF — Director 模块

## 一句话接力

下一窗口直接在 `/Users/luzhoua/MHSDC/DeliveryConsole/Director` 开，不要再回到 `DirectorFinal` 做实施。本轮已完成 DirectorFinal 差异批量审计与安全 cherry-pick：代码只摘 `StatusFooter` 的 Director 身份文案，治理摘取一条模块重建路径规则；路径治理补丁此前已回灌且扫描干净。下一步进入提交前分拣。

## 当前事实

- 当前 worktree: `/Users/luzhoua/MHSDC/DeliveryConsole/Director`
- 当前分支: `MHSDC-DC-director`
- 远程状态: `origin/MHSDC-DC-director...HEAD` 为 `0 0`，当前无 ahead/behind
- 当前工作树: 有意保留未提交改动，等待老卢验收、分拣和确认提交口径
- 参考来源 worktree: `/Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal`
- 参考来源分支: `director-final`
- `director-final` 已从 `/private/tmp/director-final` 迁到 `/Users/luzhoua/MHSDC/DeliveryConsole/DirectorFinal`
- `/private/tmp/director-final` 已不存在

## 当前结论

`MHSDC-DC-director` 已经完成第二阶段系统性清理，并在 2026-04-25 复核了 DirectorFinal 路径治理对等性：

- `npm run build` 已通过
- focused tests 8 个文件 / 46 个测试已通过
- 真实项目 runtime smoke 已通过
- Agent Browser UI smoke 已通过
- TypeScript 契约漂移、Director adapter 根因、中文测试口径、Market 旧类型引用、runtime/UI 噪音规则都已处理
- 已新增差异审计：`docs/plans/2026-04-25-directorfinal-cherrypick-diff-audit.md`
- 本轮实际 cherry-pick：`src/components/StatusFooter.tsx` 中 `SYSTEM ONLINE` -> `DIRECTOR ONLINE`、`MindHikers Console` -> `Director Console`
- 本轮实际治理回灌：`docs/04_progress/rules.md` 增加“重建模块分支时必须同时迁移路径治理、`.env.example` 和启动口径”
- `server/project-paths.ts` 与 DirectorFinal 一致
- `server/project-root.ts` 已不存在
- 非 backup 文件中 `project-root` 旧引用为 0
- 除 `server/project-paths.ts` 和测试外，无业务代码直接读取 `process.env.PROJECTS_BASE`
- `/api/projects` 运行时读取 `getProjectsBase()`
- `/api/projects/switch` 使用 `getProjectRoot(projectName)`
- `server/distribution.ts` 队列文件路径运行时读取 `getProjectsBase()`
- Header / ProductTopBar 已有项目 loading / error / empty 三态
- `.env.example` 已明确 `PROJECTS_BASE=/path/to/your/Projects`

本轮对照结论：

1. 不做 `git merge director-final`
2. 不做整枝 `git cherry-pick director-final`
3. 本轮不从 DirectorFinal 新增摘路径治理代码补丁，因为目标分支此前已经吃到这组等价能力
4. 不搬 SaaS/Auth/Crucible shell、布局策略或历史会话差异
5. 只摘了与 Director 模块身份一致、且不牵引 shell 的 footer 文案小补丁，以及一条事故治理规则
6. 已批量判定 DirectorFinal 剩余差异，不再按“一颗一颗”无限摘；若要继续，只能另立产品身份/布局策略决策
7. build/focused tests 已复跑通过，下一步进入提交前分拣

## 为什么实施要在 Director，而不是 DirectorFinal

最小回灌的目标是让 `MHSDC-DC-director` 变干净、完整、可提交，所以实施现场应放在 `/Users/luzhoua/MHSDC/DeliveryConsole/Director`。

`DirectorFinal` 的作用只是：

- 提供已验证的参考差异
- 对照路径治理是否已经等价
- 必要时用来查某个实现细节

不要在 `DirectorFinal` 继续做新修复后再搬，因为那会制造第二个待同步源头，让回灌边界继续变复杂。

## 绝对边界

1. 不做 `git merge director-final`
2. 不做整枝 `git cherry-pick director-final`
3. 不把 DirectorFinal 的 SaaS / GoldenCrucible 壳层差异搬进 Director
4. 不删除目标分支当前有效的 Director shell / ProductTopBar 结构
5. 不覆盖目标分支自己的 HANDOFF / daily log 历史，只追加或重写当前交接结论
6. 不在未确认 Linear issue 前 commit
7. 不 push

## 下一窗口启动命令

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/Director
```

必读文件：

```bash
docs/dev_logs/HANDOFF.md
docs/plans/2026-04-24-director-minimal-backport-execution-plan.md
docs/04_progress/rules.md
```

先核对现场：

```bash
git branch --show-current
git status --short --branch
```

期望分支：

```text
MHSDC-DC-director
```

## 已完成复核事项

### 1. 路径治理缺口扫描

在 `/Users/luzhoua/MHSDC/DeliveryConsole/Director` 执行：

```bash
rg "from './project-root'|from \"./project-root\"|PROJECTS_BASE\\s*=|process\\.env\\.PROJECTS_BASE" server src --glob '!*.backup' --glob '!server/project-paths.ts'
rg "project-root" server src --glob '!*.backup'
```

判断标准：

- 非 backup 文件不应再 import `project-root`: 已满足
- `server/project-root.ts` 不应存在: 已满足
- `process.env.PROJECTS_BASE` 原则上只应出现在 `server/project-paths.ts` 和相关测试里: 已满足；额外只剩 `server/index.ts` 的说明性注释
- `server/index.ts` 中关于 `PROJECTS_BASE` 的说明性注释不是问题: 已确认

### 2. 对照 DirectorFinal，但不要搬整枝差异

只允许参考这些能力：

- `server/project-paths.ts` 是否为路径 SSOT
- `ensureProjectsBaseExists()` 是否在服务启动前执行
- `/api/projects` 是否运行时读取 `getProjectsBase()`
- `/api/projects/switch` 是否使用 `getProjectRoot(projectName)`
- `server/distribution.ts` 队列路径是否运行时读取
- Header / ProductTopBar 是否已有 loading / error / empty 三态
- `.env.example` 是否明确 `PROJECTS_BASE=/path/to/your/Projects`

对照结论：以上能力目标分支均已具备；这不代表两边没有差异，而是这组可安全回灌的路径治理补丁已经落到目标分支，不需要本轮重复摘。

本轮新增 cherry-pick：

- `src/components/StatusFooter.tsx`
  - `SYSTEM ONLINE` -> `DIRECTOR ONLINE`
  - `MindHikers Console` -> `Director Console`
  - 未摘 DirectorFinal 中的 `activeChatExpertId`、`/api/llm-config/chatbox`、SaaS runtime config 等牵引链路
- `docs/04_progress/rules.md`
  - 增加模块重建必须迁移路径治理、`.env.example` 和启动口径的事故规则

不要回灌这些 DirectorFinal 差异：

- `src/SaaSApp.tsx`
- `src/components/delivery-shell/DeliveryShellLayout.tsx` 中移除 `ProductTopBar` 的结构变化
- `src/styles/delivery-shell.css` 的布局高度策略，除非目标分支复现布局问题
- GoldenCrucible / SaaS-only 路由、认证、历史会话相关差异

## 已完成验证

### 1. 复跑验证

不要为了“回灌”制造代码改动。本轮已复跑：

```bash
npm run build
npm run test:run -- src/__tests__/server/project-paths.test.ts src/__tests__/director-bridge.test.ts src/__tests__/director-adapter.test.ts src/components/director/ChapterCard.test.tsx src/components/director/Phase1View.test.tsx src/components/director/Phase2View.test.tsx src/components/director/Phase3View.test.tsx src/components/director/Phase4View.test.tsx
```

结果：

- `npm run build`: 通过
- focused tests: 8 files / 46 tests 通过
- build 仅有既有 CSS minify warning 与 chunk size warning，不阻塞
- Agent Browser: 默认 delivery shell 主界面可打开，无页面错误；但当前默认 Director shell 不渲染 `StatusFooter`，所以本轮 footer 文案只完成源码/build 验证，不包装成默认页面可见验证

## 下一步具体事项

### 1. 如果后续又发现路径治理缺口

只允许做最小 patch：

- `./project-root` import 改成 `./project-paths`
- 静态 `PROJECTS_BASE` 常量改成运行时 `getProjectsBase()`
- 项目根路径拼接改成 `getProjectRoot(projectId)` 或 `resolveProjectPath()`
- 如缺测试，只补 `src/__tests__/server/project-paths.test.ts` 的聚焦断言

不要顺手重构 UI、文案、布局或旧模块类型债。

### 2. 提交前分拣

当前目标分支仍有 tracked pycache 删除状态：

```text
skills/__pycache__/*.pyc
skills/connectors/__pycache__/*.pyc
```

推荐处理：

- 单独作为 runtime cache 噪音治理提交
- 不和 Director adapter / 类型契约 / 测试口径修复混在一个 commit
- commit 前必须问老卢确认 Linear issue 与提交拆分

当前新生成的 `testing/director/artifacts/*.png` 已被 `.gitignore` 压住。若需要把截图作为正式证据，必须显式说明并单独处理。

如果触达页面、布局、项目切换、脚本列表或 shell 结构，再使用 Agent Browser 做 UI smoke。本轮只更新治理文档，不触发 UI smoke。

## 已完成内容摘要

### 类型契约漂移修复

- `src/types.ts` 补齐 `Phase`
- 扩展 `ChatMessage.kind/systemTitle`
- 扩展 `ToolCallConfirmation.status = executed`
- 兼容新版/旧版 `TubeBuddyScore`
- 允许旧 Dashboard 临时读取可选 `DeliveryState.modules`
- `src/schemas/llm-config.ts` 用 schema 解析 provider
- `src/components/ChatPanel.tsx` 替换 `findLastIndex`，避免 ES2023 API 和当前 ES2022 lib 不匹配

### Director Phase 组件清理

- 修复 director 组件中错误的 `Phase` import
- 清理未使用 import / prop / 局部变量
- `Phase3View` 去掉不安全类型转换
- `DirectorStageHeader` 接收 `onBackToSessions`

### Market / Legacy UI 兼容清理

- Market 相关组件兼容 flat 与 nested `TubeBuddyScore`
- `StatusDashboard`、`ScheduleModal` 对旧 `modules` 状态做可选兼容
- `SRTUploader` 上传时带上 `projectId`

### Director adapter 根因修复

- `update_option_fields` 的 `props` 改成深度合并
- `type/prompt/imagePrompt/template/props/quote/svgPrompt` 变更会失效旧 preview
- `VALID_TYPES` 补齐当前 Phase2 真实 B-Roll 类型，同时保留旧别名兼容
- `director-adapter.test.ts` 锁住深合并与 preview 失效行为

### 运行时噪音治理

- `.gitignore` 增加 `__pycache__/`、`*.py[cod]`
- `.gitignore` 增加 `testing/director/artifacts/*.png`

## 最近验证结果

- `npm run build`: 通过
- focused tests: 8 files / 46 tests 通过
- `/health`: 正常
- `/api/projects`: 返回真实 `CSET-*` 项目
- `/api/projects/switch`: 可切换到 `CSET-Seedance2`
- `/api/scripts?projectId=CSET-Seedance2`: 返回真实脚本
- Agent Browser UI smoke: 页面、项目下拉、脚本列表、P1 主区域、Drawer tabs 正常

## 交付目标

下一窗口最终应产出：

1. 输出可给老卢确认的提交拆分建议
2. 等老卢确认 Linear issue 后，再进入 commit
