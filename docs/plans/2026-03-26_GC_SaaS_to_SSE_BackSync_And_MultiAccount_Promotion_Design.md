# 2026-03-26 GoldenCrucible `SaaS -> SSE` 反向同步与多账号后回推 SaaS 设计方案

> 日期：2026-03-26
> 当前讨论对象：
> - Stable：`/Users/luzhoua/MHSDC/GoldenCrucible-GC` / `MHSDC-GC`
> - R&D：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE` / `MHSDC-GC-SSE`
> - Release/Staging：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS` / `codex/min-105-saas-shell`
> 状态：待讨论 / 待审批

---

## 1. 设计目标

这份方案不是只解决“现在要不要把 SaaS 改动同步回 SSE”。

它的真正目标是：

1. **先把 SSE 和 SaaS 的共享底座拉齐**
2. **再在 SSE 上继续研发多账号**
3. **等多账号在 SSE 验证成熟后，再以低冲突方式回推到 SaaS**
4. **确保 SaaS 继续承担对外 staging / 发布职责，而不是重新变成主研发现场**

一句话：

**SSE 应成为“未来功能演进源头”，SaaS 应成为“对外发布收口终点”。**

---

## 2. 三条线的最终职责

### 2.1 Stable：`GoldenCrucible-GC`

职责：

1. 本地稳定基线
2. 对照与回看
3. 非必要不动

禁止承担：

1. 新功能主研发
2. 云端 staging 验证
3. 大规模结构重构

### 2.2 R&D：`GoldenCrucible-SSE`

职责：

1. 新功能研发主线
2. 多账号能力研发主线
3. 搜索、会话、权限、账户、数据边界等产品能力的长期演进主线

它应该成为：

1. **未来共享业务逻辑的事实来源**
2. **多账号能力首先落地和验证的地方**

### 2.3 Release/Staging：`GoldenCrucible-SaaS`

职责：

1. 对外 staging
2. Railway 部署验证
3. 发布口径收口
4. 给朋友/合作方/测试用户访问的外部入口

它应该成为：

1. **云端可访问版本**
2. **发布质量收口版本**

不应该成为：

1. 多账号主研发现场
2. 新能力长期乱长的地方

---

## 3. 当前判断

基于现在的实际现场，我的核心判断是：

1. SaaS 这条线已经沉淀了不少**共享底座改进**
2. 但 SaaS 里同时也混入了不少**发布线专属改动**
3. 如果整条把 `codex/min-105-saas-shell` 反向 merge 到 `MHSDC-GC-SSE`，SSE 会被 staging / Railway / 发布线文档污染
4. 如果什么都不回灌，SSE 接下来做多账号会站在一套更旧、更散的底座上，后续再回 SaaS 会更痛

所以结论不是：

1. “整条回灌”
2. “完全不回灌”

而是：

**只把会影响后续多账号研发的共享底座，精确拆包后反向同步回 SSE。**

---

## 4. 设计原则

接下来必须遵守 6 条原则：

1. **禁止整条 cherry-pick SaaS 发布线提交回 SSE**
   例如不建议直接把 `8407b2a` 整个搬回去。

2. **SSE 只吸收共享底座，不吸收发布线专属口径**

3. **SaaS 保留对外环境、Railway、staging 安全收口职责**

4. **多账号必须先在 SSE 完成，再回推 SaaS**

5. **以后从 SSE 推回 SaaS 时，也必须按“能力包”推进，而不是整线粗暴合并**

6. **每一轮同步都要能回答一句话：**
   - 这是共享业务底座？
   - 还是发布线专属改动？

---

## 5. 本轮 `SaaS -> SSE` 反向同步总策略

### 5.1 推荐策略

采用“**三包必回灌 + 一包待定 + 一整类禁止回灌**”。

### 5.2 三包必回灌

#### 包 A：共享运行时底座

目标：

1. 把 `PROJECTS_BASE` 收口、默认 runtime 工作区、最小 session/autosave 这组共享底座带回 SSE
2. 为后续多账号的数据隔离做准备

建议回灌文件：

1. `package.json`
2. `package-lock.json`
3. `server/project-root.ts`
4. `server/chat.ts`
5. `server/index.ts`
6. `server/assets.ts`
7. `server/director.ts`
8. `server/distribution.ts`
9. `server/market.ts`
10. `server/music.ts`
11. `server/pipeline_engine.ts`
12. `server/shorts.ts`
13. `server/upload_handler.ts`
14. `server/xml-generator.ts`
15. `server/youtube-auth.ts`
16. `src/App.tsx`
17. `src/components/ChatPanel.tsx`
18. `src/components/crucible/CrucibleWorkspaceView.tsx`
19. `src/components/crucible/storage.ts`
20. `src/config/runtime.ts`

为什么这包必须先回灌：

1. 多账号的本质不是“先做登录页”
2. 多账号的本质是**用户 / 会话 / 项目根目录 / 状态存储边界**
3. 这组底座不先统一，SSE 上的多账号实现很容易长在旧目录假设和旧存储模型上

#### 包 B：黄金坩埚搜索修复一致化

目标：

1. 保证 SSE 与 SaaS 在 Crucible 搜索行为上口径一致
2. 避免以后多账号分支是在两套搜索行为上继续长

建议回灌文件：

1. `server/crucible-research.ts`
2. `src/__tests__/crucible-research.test.ts`

为什么这包必须回灌：

1. 这已经属于 GC 业务逻辑，不是发布线专属
2. 多账号后如果再补搜索一致性，会把调试面进一步扩大

#### 包 C：干净构建依赖修复

目标：

1. 保证 SSE 在干净安装 / 干净构建环境下也不炸
2. 避免多账号研发完成后，第一次推广才暴露 clean build 问题

建议回灌文件：

1. `package.json`
2. `package-lock.json`

关键点：

1. `yaml` 依赖缺失这件事，不是 SaaS 专属问题
2. 它是典型“本地 node_modules 掩盖问题，云端干净环境才炸”的共享底层问题

### 5.3 一包待定

#### 包 D：Skill Sync 收口

SaaS 当前已经把：

1. `Director`
2. `MusicDirector`
3. `ThumbnailMaster`
4. `ShortsMaster`
5. `MarketingMaster`

从同步名单里移除，只保留：

1. `Writer`
2. `ThesisWriter`
3. `Researcher`
4. `FactChecker`
5. `Socrates`

建议：

1. **默认不要立刻把这包回灌到 SSE**
2. 先确认 SSE 是否已经正式收缩成“只服务 GC 主链”的研发线

理由：

1. 如果 SSE 还保留对 Director/Shorts/Marketing 等旧模块的研发责任，直接回灌会误伤
2. 这包不是多账号研发的硬前置
3. 它可以等 SSE 范围正式收口后，再单独决定

### 5.4 一整类禁止回灌

以下内容不建议从 SaaS 回灌到 SSE：

1. `railway.json`
2. `.railwayignore`
3. staging 域名 / Railway 环境变量
4. Railway 上线记录
5. SaaS staging 文档
6. `.env.local`
7. `.env.example` 中 SaaS 专属端口口径
8. Railway 临时域名相关记录
9. 发布线为减包体而做的资产删减动作

特别说明：

`public/assets/bgm/*.wav` 的删除，不建议默认回灌到 SSE。

原因：

1. 这是“发布线清仓”动作
2. 不是多账号研发必需底座
3. 是否要在 SSE 也删，应该单独作为仓库清理决策，而不是混在反向同步里

---

## 6. 推荐的反向同步工作细项

### 6.1 在 SSE 中建立“回灌承接分支”

建议：

1. 从 `MHSDC-GC-SSE` 切出一条短命分支
2. 名称建议：`codex/sse-backsync-saas-foundation`

用途：

1. 只承接来自 SaaS 的共享底座回灌
2. 不在这条分支顺手做多账号

### 6.2 在 SSE 中分三次提交回灌

不要做成一个大提交。

建议拆成 3 个 commit：

1. `sync(gc-foundation): align project-root session and runtime baseline from saas`
2. `sync(gc-search): align crucible search behavior from saas`
3. `chore(gc-build): fix clean-build dependency parity`

好处：

1. 后续多账号开发时容易知道底座从哪一层开始一致
2. 未来从 SSE 推回 SaaS 时，也能更好挑 commit

### 6.3 在 SSE 完成对齐后的验收

SSE 完成回灌后，至少要验这几项：

1. 本地 dev 仍能启动
2. 默认 runtime 项目目录仍可创建
3. Crucible autosave / 恢复不回退
4. 搜索回归测试通过
5. 干净安装下构建不因缺失 `yaml` 炸掉

达到这些标准，才算“SSE 与 SaaS 共享底座已对齐”。

---

## 7. 多账号研发阶段的推荐设计

### 7.1 多账号只在 SSE 做

建议：

1. 不在当前 `codex/min-105-saas-shell` 上继续做多账号
2. 在 SSE 对齐完成后，从 SSE 再切多账号功能分支

命名建议：

1. `codex/sse-multi-account-foundation`
2. 或 `codex/sse-multi-tenant-auth`

### 7.2 多账号研发应优先拆成 4 层

#### 层 1：身份层

范围：

1. 用户身份
2. 登录态
3. 会话绑定

#### 层 2：作用域层

范围：

1. 用户 -> workspace
2. 用户 -> project
3. 用户 -> autosave/session

#### 层 3：权限层

范围：

1. 哪些接口属于公开读
2. 哪些接口属于登录后可写
3. 哪些接口属于管理员/内测工具

#### 层 4：发布层

范围：

1. Railway 环境变量
2. SaaS 对外入口
3. staging 安全口径

关键点：

1. 层 1-3 在 SSE 完成
2. 层 4 回到 SaaS 再做收口

### 7.3 为什么这样拆

因为你现在已经看到，SaaS 当前真正危险的地方，不是 UI 漂不漂亮，而是：

1. 管理接口裸露
2. 全局 project 状态可被匿名切换

这说明多账号不能只做“登录页”。

它必须本质上解决：

1. 谁能看
2. 谁能改
3. 改的是谁的工作区
4. 影响的是谁的 session

---

## 8. 多账号完成后，`SSE -> SaaS` 的回推策略

### 8.1 不建议直接把 SSE 整线 merge 到当前 SaaS 分支

原因：

1. SSE 会继续长研发现场、测试代码、实验性调试
2. SaaS 是发布线，不应被研发脏现场直接灌满

### 8.2 建议建立“发布提纯分支”

当多账号在 SSE 完成并测试通过后：

1. 从最新 SaaS staging 基线再切一条 promotion 分支
2. 名称建议：`codex/saas-promote-multi-account`

### 8.3 Promotion 时按能力包回推

建议顺序：

1. `Auth/Session Domain` 包
2. `Workspace / Project Scope` 包
3. `Protected API` 包
4. `UI / Account Surface` 包
5. `Railway / Security Hardening` 包

好处：

1. 能把“业务能力”与“发布环境适配”分离
2. 若 staging 验证失败，容易判断是哪一层的问题

### 8.4 最终进入 SaaS 的验收门槛

多账号从 SSE 推回 SaaS 前，建议至少满足：

1. SSE 上单账号老链路不回退
2. SSE 上多账号隔离通过
3. SSE 上关键测试通过
4. SaaS staging 上登录、会话、项目隔离、搜索、刷新恢复通过
5. SaaS staging 上管理接口不再匿名暴露

---

## 9. 当前最合理的执行顺序

按我的判断，最稳的顺序应该是：

1. **先在文档上批准本方案**
2. **下一轮先做 `SaaS -> SSE` 共享底座回灌**
3. **回灌完成后在 SSE 上切多账号功能分支**
4. **多账号开发、测试都在 SSE 完成**
5. **通过后再从 SSE 向 SaaS 做一轮 promotion**
6. **最后在 SaaS 上做 Railway/staging 最终收口**

---

## 10. 本方案下的明确建议

### 10.1 我建议批准的部分

1. 批准包 A、包 B、包 C 回灌到 SSE
2. 包 D 先不回灌，等你确认 SSE 是否彻底转为 GC-only 研发线
3. 禁止把 Railway / staging / 发布线文档整包回灌到 SSE

### 10.2 我建议下一轮优先做的事

下一轮不要先碰多账号。

先做这件事：

**在 SSE 上完成“共享底座对齐包”的精确回灌。**

因为只有这样，后面的多账号才不会长在一套即将被淘汰的旧底座上。

---

## 11. 待你审批的决策点

请重点看这 4 个审批点：

1. 是否同意：SSE 只回灌包 A、B、C，不整线回灌 SaaS
2. 是否同意：包 D（Skill Sync 收口）先延后，不作为本轮硬目标
3. 是否同意：多账号只在 SSE 做，不在当前 SaaS 分支继续展开
4. 是否同意：多账号完成后，用 `promotion 分支 + 能力包回推`，而不是直接整线 merge 回 SaaS

---

## 12. 一句话总结

**先把 SaaS 沉淀出的共享底座精确回灌到 SSE，让 SSE 成为未来多账号研发的干净主线；等多账号成熟后，再把能力包提纯回推到 SaaS，而不是让 SaaS 再次沦为主研发现场。**
