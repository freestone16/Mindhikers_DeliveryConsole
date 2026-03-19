# Director 优先的 Runtime Path Governance 实施方案

> 日期：2026-03-19
> 当前记录目录：`/Users/luzhoua/MHSDC/GoldenCrucible`
> 目标实施目录：`/Users/luzhoua/MHSDC/DeliveryConsole/DirectorPathGovernance`
> 当前高频验证母体：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
> 文档性质：基础设施实施方案 / 交接级别 / 跨模块收口
> 作者：Codex（按 OldYang 协议落盘）

## 1. 本稿要解决什么

这次不是在修某一个业务模块，而是在收口一个已经跨模块蔓延的基础设施问题：

**`PROJECTS_BASE` 与 `getProjectRoot()` 的读取、fallback、校验、路径安全策略，目前散落在多个后端文件中，口径并不统一。**

具体表现为：

1. 有的模块从 `process.env.PROJECTS_BASE` 取值
2. 有的模块 fallback 到 `../../Projects`
3. 有的模块 fallback 到 `process.cwd()/Projects`
4. 有的模块甚至直接写 `'/data/projects'`

这会带来三个直接问题：

1. worktree 环境下容易误读路径
2. 本地 / Docker / 新家目录迁移时，行为不一致
3. 一旦调整项目数据根目录，就需要跨多个文件补锅

一句话说：

**现在缺的不是“再找一个对的路径”，而是“建立一条统一的路径真相来源”。**

---

## 2. 为什么先从 Director 劈一支出来

当前现场不存在一个真正意义上的“稳定主干”可供这次基础设施改造安全落地。

因此，这次不采用“找稳定基线统一推进”的思路，而采用：

**先以 Director 作为高频验证母体，把 runtime path governance 跑通，再向其他模块扩散。**

这样做的理由：

1. Director 是当前最常用、路径依赖最复杂、验证价值最高的模块之一
2. Director 的链路长，最容易暴露路径收口是否真生效
3. 如果在 Director 都跑不通，直接全项目铺开风险更大
4. 先拿一个高频模块做母体验证，比在概念层面追求“全局稳定基线”更现实

但这里要特别注意：

**不是直接在 `MHSDC-DC-director` 上裸改基础设施，而是从它再劈一个独立 worktree + 子分支承接。**

---

## 3. 建议的 Git / Worktree 策略

### 3.1 推荐工作区

建议创建一个独立 worktree：

- 路径：`/Users/luzhoua/MHSDC/DeliveryConsole/DirectorPathGovernance`
- 分支：`codex/director-runtime-path-governance`

参考母体：

- 现有 Director 工作区：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
- 现有分支：`MHSDC-DC-director`

### 3.2 为什么不能直接在黄金坩埚现场做

当前工作区 `MHSDC-GC` 的职责是黄金坩埚产品推进。

如果把基础设施收口直接塞进这里，会带来三个问题：

1. 语义污染：坩埚产品改动与全局 infra 改动混在一起
2. Git 边界变脏：后续很难拆清哪些 commit 属于坩埚，哪些属于 infra
3. 扩散成本上升：其他模块需要的是纯基础设施 commit，而不是坩埚业务历史

### 3.3 为什么不建议“直接在 Director 分支上做完再整分支合并”

如果直接在 `MHSDC-DC-director` 上做基础设施，再整分支 merge 到其他模块，会把 Director 自己的业务改动也一起拖过去。

更稳的做法是：

1. 从 `MHSDC-DC-director` 派生独立 infra 分支
2. 在子分支中只保留纯路径治理改动
3. 验证通过后先合回 Director
4. 后续向其他模块扩散时，优先 `cherry-pick` 那几笔纯 infra commit，而不是整分支 merge

---

## 4. 本次改造的边界

### 4.1 本次要做

本次只做以下四件事：

1. 建立统一路径入口
2. 统一 `PROJECTS_BASE` / `projectRoot` 的获取逻辑
3. 清掉多处不一致 fallback
4. 在启动和关键路径上提供明确校验与报错

### 4.2 本次明确不做

这次必须克制，明确不做：

1. 不做前端界面里的“动态改数据根目录”设置页
2. 不做端口治理重构
3. 不重写 Docker 总体结构
4. 不顺手重构 Director 业务逻辑
5. 不碰黄金坩埚、营销大师等模块的 UI / prompt / runtime 协议
6. 不借机统一所有历史文档里的旧端口 / 旧路径文字

一句话：

**这次只收“路径真相来源”，不收“所有环境治理问题”。**

---

## 5. 目标结构

建议新增一个统一入口文件：

```text
server/project-paths.ts
```

建议它至少导出这几个能力：

```ts
getProjectsBase(): string
getProjectRoot(projectId: string): string
ensureProjectsBaseExists(): void
assertProjectPathSafe(targetPath: string): string
```

建议职责如下：

### 5.1 `getProjectsBase()`

职责：

1. 从 `process.env.PROJECTS_BASE` 读取
2. 做 trim / resolve / normalize
3. 不再把 fallback 分散到各个业务模块里

建议原则：

1. 环境变量缺失时，集中在这里决定如何报错或降级
2. 不能让每个模块各自猜路径

### 5.2 `getProjectRoot(projectId)`

职责：

1. 基于 `getProjectsBase()` 派生项目根目录
2. 统一使用相同的 `path` 处理方式
3. 避免各模块各写一套 `path.join` / `path.resolve`

### 5.3 `ensureProjectsBaseExists()`

职责：

1. 在服务启动时尽早执行
2. 若目录不存在，给出明确错误
3. 阻止服务带着错误根路径继续运行

### 5.4 `assertProjectPathSafe(targetPath)`

职责：

1. 确保目标路径仍在 `PROJECTS_BASE` 白名单内
2. 用于文件读写、上传、导出等关键路径
3. 避免路径拼接被带出工作区

---

## 6. Director 首批改造文件

第一批只改 Director 首次验证真正必要的后端文件。

建议优先级如下：

### P0：必须先改

1. `server/project-paths.ts`（新增）
2. `server/index.ts`
3. `server/director.ts`
4. `server/chat.ts`

### P1：Director 常见联动链路

1. `server/upload_handler.ts`
2. `server/assets.ts`
3. `server/youtube-auth.ts`

### P2：第二波扩散时再收

1. `server/shorts.ts`
2. `server/music.ts`
3. `server/market.ts`
4. `server/pipeline_engine.ts`
5. `server/xml-generator.ts`
6. `server/distribution.ts`

这里的关键策略不是“第一天全改完”，而是：

**先让 Director 链路完成闭环，再把已经验证过的路径入口推广到其他模块。**

---

## 7. 推荐实施顺序

### 阶段 A：开场与账本登记

1. 新建 `DirectorPathGovernance` worktree
2. 新建分支 `codex/director-runtime-path-governance`
3. 先读取 `~/.vibedir/global_ports_registry.yml`
4. 为该 worktree 补录 session / 端口 / 模块说明

注意：

这次主题是路径治理，不是端口治理；但 worktree 启动前仍必须先查全局账本，避免现场冲突。

### 阶段 B：建立统一路径入口

1. 新增 `server/project-paths.ts`
2. 把 `PROJECTS_BASE` 的读取、归一化、存在性校验集中到这个文件
3. 在 `server/index.ts` 启动阶段调用 `ensureProjectsBaseExists()`

### 阶段 C：先接 Director 主链

1. `server/index.ts` 改为只用统一入口
2. `server/director.ts` 改为只用统一入口
3. `server/chat.ts` 改为只用统一入口

目标：

先确保 Director 常用主链不再各自拥有 fallback。

### 阶段 D：补安全边界

1. 对上传、文件读写、导出等路径补 `assertProjectPathSafe(...)`
2. 把关键错误日志写清楚
3. 路径不存在时尽量 fail fast，不要静默 fallback

### 阶段 E：最小验证

至少做这几项：

1. 服务能正常启动
2. 启动日志能打印正确 `PROJECTS_BASE`
3. Director 能正常扫描项目或读取目标项目文件
4. 至少走通一条真实的 Director API / Socket 关键链路

### 阶段 F：提交与扩散

1. 将纯 infra 改动压成 2 到 4 个边界清晰的 commit
2. 先合回 Director 分支
3. 再将纯 infra commit `cherry-pick` 到其他需要的模块

---

## 8. 建议的提交拆分

建议不要一个大提交糊到底。

推荐至少拆成下面三类：

### Commit 1：统一入口

内容：

1. 新增 `server/project-paths.ts`
2. 在 `server/index.ts` 接入基础校验

目标：

先建立基础设施骨架。

### Commit 2：Director 主链迁移

内容：

1. `server/director.ts`
2. `server/chat.ts`
3. 必要的联动路径调用方

目标：

把 Director 首条闭环跑通。

### Commit 3：安全与文档

内容：

1. 路径安全断言
2. 启动错误提示
3. 最小文档 / 开发进度记录

目标：

把这次改动从“能跑”提升到“可维护、可扩散”。

---

## 9. Git 操作注意事项

这部分是本稿最重要的执行纪律。

### 9.1 要做的

1. 用独立 worktree 承接本次改造
2. 让分支名带明确 infra 语义
3. 保持 commit 只包含路径治理相关修改
4. 扩散到其他模块时优先 `cherry-pick` 纯 infra commit

### 9.2 不要做的

1. 不要在当前 `MHSDC-GC` 工作区里直接切到 infra 分支
2. 不要把黄金坩埚未提交改动带进这次路径治理
3. 不要直接把整个 Director 分支 merge 到其他模块
4. 不要顺手夹带 UI 修复、prompt 变更、runtime 产物
5. 不要一边改路径治理，一边做其他模块业务需求

---

## 10. 验收标准

这次方案是否成立，不看“改了多少文件”，只看下面几条是否成立：

1. Director 主链已经不再散落多套 `PROJECTS_BASE` fallback
2. `PROJECTS_BASE` 的真相来源已经集中到一个文件
3. 修改 `.env.local` 后，服务能按新根目录正确工作
4. 根目录不存在时，服务能明确报错而不是静默假设
5. 纯 infra commit 已经足够干净，可以独立 `cherry-pick`

---

## 11. 后续扩散建议

Director 跑通后，再按收益和风险排序向其他模块推广：

1. GoldenCrucible
2. ShortsMaster
3. MusicDirector
4. 其他读写项目目录较重的模块

扩散时的原则：

1. 不追求“一天全项目统一”
2. 每迁一个模块，就做一次最小验证
3. 只复用已验证过的 infra commit，不重新发明一版路径入口

---

## 12. 给下一窗口的开场提示

如果在新的 Director 窗口继续这件事，建议先做这几步：

1. 读取 `~/.vibedir/global_ports_registry.yml`
2. 确认当前所在 worktree / branch 不是 `main`
3. 打开本方案文档
4. 先盘点 Director 链路里 `PROJECTS_BASE` 的实际使用点
5. 只做 P0 范围，不要一上来全仓开改

下一窗口的首要目标不是“全项目收口完成”，而是：

**在 Director 中建立第一条可验证、可复用、可迁移的路径治理闭环。**
