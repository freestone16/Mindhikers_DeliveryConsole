# SD210 黄金坩埚接入 Socrates v0.2.0 一期实施方案

> 日期：2026-03-15
> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 分支：`codex/crucible-main`
> 状态：方案草案，等待人工审核
> 作者：Codex（按 OldYang 协议落盘）

## 1. 本稿目的

这份方案专门回答一件事：

**黄金坩埚前端项目，如何在不把宿主层做重、不提前引入复杂用户体系的前提下，先吃到 Antigravity 中 `Socrates v0.2.0` 的第一波红利。**

这里的“红利”分成两类：

1. 对话质量红利
   - 更懂用户以往的认知入口
   - 更会贴着真实盲点追问
   - 更容易把相近议题串起来
2. 产品体验红利
   - 用户能感知到“这轮追问更懂我”
   - 系统会在合适时候提示经验库需要复核
   - 运行日志里能看到经验上下文是否生效

本稿只定义 **一期可落地范围**，并明确哪些能力放入 **二期**，避免一期目标失焦。

---

## 2. 结论先行

建议采用：

**一期先做“只读式 Experience 接入 + 最小前端感知 + 日志可观测”。**

具体来说：

1. 后端读取 `Socrates/EXPERIENCE.md`
2. 只提取少量高价值经验片段注入 `Socrates` prompt
3. 不在一期自动改写 skill 文件
4. 前端只做最小可感知反馈，不上经验库后台
5. `turn_log` 与接口返回补足 `experience meta`

这样做的好处是：

1. 立刻吃到“追问更准”的主红利
2. 不破坏当前“宿主层轻、能力外挂”的治理原则
3. 不把一期拖进账户系统、经验管理台、压缩归档这些长尾工程

---

## 3. 当前现场判断

结合当前仓库，已经具备以下接缝：

1. 后端已能从全局技能库读取 `Socrates/SKILL.md`
2. 黄金坩埚已有独立的 `/api/crucible/turn` 生成链路
3. 前端中屏与右侧对话已有基本 bridge 协议
4. `runtime/crucible/.../turn_log.json` 已经存在，可继续扩展

当前缺口也很明确：

1. 只读取 `SKILL.md`，还没有读取 `EXPERIENCE.md`
2. prompt 还不具备“议题历史 / 认知入口 / 复核状态”输入
3. 前端还没有任何 Experience 生效状态提示
4. 日志还无法判断本轮是否真的用上了经验上下文

因此，一期最优解不是做大 UI，而是先把 **Experience 读入、用上、看得见**。

---

## 4. 一期目标

一期只收三条主线：

### 4.1 主线 A：Experience 只读接入

让黄金坩埚在调用 `Socrates` 时，能够读取并使用 `EXPERIENCE.md` 的少量高价值内容。

### 4.2 主线 B：前端最小可感知

让用户能够感知到系统正在参考“既往经验”，但不打断当前对话主链，也不把 Experience 变成前台主角。

### 4.3 主线 C：日志与验证闭环

让开发者能确认：

1. 有没有读到 Experience
2. 读到了哪些章节
3. 是否触发“超过 30 天建议复核”
4. Experience 是否真的进入了本轮 prompt / turn log

---

## 5. 一期非目标

一期明确不做以下事项：

1. 不自动写回 `EXPERIENCE.md`
2. 不做经验条目压缩、归档、Top 10 淘汰
3. 不做月度 Review 流程 UI
4. 不做每用户独立 Experience 账户
5. 不做完整经验库管理后台
6. 不在前端展示完整“认知入口 / 盲点地图 / 节拍器 / 突破性转折”编辑器
7. 不把 Experience 直接暴露成一个前台人格或可见角色

这些能力统一纳入二期。

---

## 6. 一期方案设计

### 6.1 后端新增 Experience Loader

重点文件：

- `server/skill-loader.ts`
- 必要时新增 `server/socrates-experience.ts`

建议新增一个轻量读取层，职责仅限：

1. 找到 `~/.gemini/antigravity/skills/Socrates/EXPERIENCE.md`
2. 若文件不存在，返回 `loaded: false`
3. 若文件存在，解析：
   - `last_reviewed`
   - `认知入口`
   - `盲点地图`
   - `节拍器`
   - `突破性转折`
   - `议题历史`
4. 每个章节只提取最有价值的前 2-3 条
5. 生成一份短上下文对象，供 prompt 使用

建议返回结构：

```ts
interface SocratesExperienceContext {
  loaded: boolean;
  stale: boolean;
  lastReviewed?: string;
  cognitionEntries: string[];
  blindspotEntries: string[];
  rhythmEntries: string[];
  breakthroughEntries: string[];
  topicHistoryEntries: string[];
  matchedTopicSignals: string[];
}
```

关键约束：

1. 一期只读，不写
2. 一期只做轻解析，不做复杂 Markdown AST 工程
3. 若解析失败，必须优雅降级，不影响主链

### 6.2 Prompt 注入策略

重点文件：

- `server/crucible.ts`
- `server/crucible-orchestrator.ts`

建议在生成 prompt 时追加一个明确但克制的 Experience 区块：

1. 当 `loaded=false` 时，不注入 Experience 内容
2. 当 `loaded=true` 时，只注入精炼摘要
3. 若 `stale=true`，在 prompt 中提示“经验库超过 30 天未复核，请谨慎使用”
4. 若当前议题与历史议题存在明显命中，则注入 `matchedTopicSignals`

注入原则：

1. Experience 是“方法增强层”，不是主 prompt 主角
2. 禁止把 Experience 变成讨好型记忆
3. 注入内容只服务三件事：
   - 更快找到认知入口
   - 更准地压住未检验假设
   - 适度延续历史议题，而不是机械重复

### 6.3 `/api/crucible/turn` 返回扩展

重点文件：

- `server/crucible.ts`
- `src/components/crucible/types.ts`

建议在当前返回结构中新增一个轻量 `experience` 字段：

```ts
interface CrucibleExperienceMeta {
  loaded: boolean;
  stale: boolean;
  lastReviewed?: string;
  cuesUsed: string[];
  topicLinked: boolean;
}
```

返回用途：

1. 供前端显示一个非常轻的状态提示
2. 供日志记录本轮是否启用 Experience
3. 供后续二期继续扩展，而不需要重做合同

注意：

1. 这个字段是系统 meta，不是前台发言内容
2. 不应让用户看到具体私有经验条目全文

### 6.4 `turn_log` 扩展

重点文件：

- `server/crucible.ts`

建议在现有 `turn_log` 中追加：

1. `experience.loaded`
2. `experience.stale`
3. `experience.lastReviewed`
4. `experience.cuesUsed`
5. `experience.topicLinked`

目标是让我们之后排查时能回答：

1. 这轮问题变准，是不是因为 Experience 生效了
2. 这轮没有变准，是没读到、没匹配到，还是 prompt 没用好

### 6.5 前端最小可感知方案

重点文件：

- `src/components/crucible/CrucibleWorkspaceView.tsx`
- `src/components/crucible/types.ts`
- `src/components/ChatPanel.tsx`

一期前端只做最小增强，不做后台。

建议做三处轻提示：

1. 中屏顶部或标题区加一个轻量状态文案
   - `已接入历史经验`
   - `本轮参考了历史议题`
   - `经验库建议复核`
2. thinking 文案从统一句式改成阶段化提示，例如：
   - `正在结合既往经验寻找这一轮最值得继续追的那根刺。`
   - `正在检查这次议题和过往问题是否存在重复盲点。`
3. 若 `stale=true`，只给一个小徽标或轻文案，不弹窗、不阻塞

一期不做：

1. Experience 明细展开面板
2. Experience 时间线
3. 章节级编辑器

### 6.6 降级与容错

必须保证以下情况都不打断主链：

1. `EXPERIENCE.md` 不存在
2. `EXPERIENCE.md` 格式不规范
3. `last_reviewed` 缺失
4. 章节标题与预期不完全一致

降级策略：

1. 不报前台错误
2. 记录服务器告警日志
3. 返回 `experience.loaded=false`
4. 继续按当前无 Experience 方式生成

---

## 7. 一期工作拆解

### 7.1 工作流 A：Experience 读取与解析

必须完成：

1. 增加 Experience 文件发现逻辑
2. 增加轻量章节提取逻辑
3. 增加 `last_reviewed` 与 `30 天未复核` 判断
4. 增加按议题关键词命中 `topic history` 的最小匹配

验收标准：

1. 有 Experience 文件时可读出核心章节
2. 无文件时平稳降级
3. 超过 30 天未复核时可产出 `stale=true`

### 7.2 工作流 B：Prompt 与接口接线

必须完成：

1. `generateCrucibleTurn` 能拿到 Experience context
2. `buildSocratesPrompt` 能消费 Experience 摘要
3. `/api/crucible/turn` 返回 `experience meta`
4. `turn_log` 记录 Experience 使用情况

验收标准：

1. 实际请求返回里存在 `experience`
2. `turn_log.json` 可看到 Experience 相关元数据
3. 未命中 Experience 时主链仍正常

### 7.3 工作流 C：前端轻提示接线

必须完成：

1. 前端类型接住 `experience meta`
2. 中屏或 chat 区出现轻量状态提示
3. thinking 文案按是否命中 Experience 做轻微区分

验收标准：

1. 用户能感知系统参考了历史经验
2. 页面不会出现“经验库管理工具”的错觉
3. 当前黑板主链不被打断

---

## 8. 推荐执行顺序

建议按以下顺序推进：

1. 先做 Experience loader 与解析
2. 再接 `server/crucible.ts` prompt 与返回合同
3. 然后扩 `turn_log`
4. 最后做前端轻提示

原因：

1. 先把数据链打通，才能判断前端要展示什么
2. 若先做 UI，再回头改接口，很容易产生占位字段和空壳交互

---

## 9. 一期验证方案

按“验证为王”原则，一期完成后至少验证以下场景：

### 9.1 后端验证

1. 有 `EXPERIENCE.md`
   - 能成功返回 `experience.loaded=true`
2. 无 `EXPERIENCE.md`
   - 能平稳返回 `experience.loaded=false`
3. `last_reviewed` 超过 30 天
   - 返回 `experience.stale=true`
4. 议题与历史议题存在明显命中
   - 返回 `topicLinked=true`

### 9.2 前端验证

1. 首问后正常出现中屏内容
2. 命中 Experience 时能看到轻提示
3. `stale=true` 时只显示提醒，不阻塞输入
4. 不命中 Experience 时页面不出现脏占位

### 9.3 回归验证

建议至少执行：

1. `npm run test:run -- src/components/crucible/hostRouting.test.ts`
2. `npm run build`
3. 必要时补一个 `server/crucible.ts` 相关最小测试

---

## 10. 二期范围

以下能力统一收进二期，暂不纳入本轮实施：

### 10.1 Experience 自动写回

包括：

1. 论文输出后自动提炼 3-5 条经验
2. 自动追加写入 `EXPERIENCE.md`
3. 自动去重与频率合并

### 10.2 防臃肿治理

包括：

1. Top 10 限制
2. 超长文件自动压缩
3. 90 天历史归档到 `EXPERIENCE_ARCHIVE.md`

### 10.3 Experience 管理界面

包括：

1. Experience 明细查看
2. 章节级编辑
3. 历史命中记录查看
4. 人工保留/修改/删除条目

### 10.4 月度 Review 流程

包括：

1. 逐条 review 交互
2. `last_reviewed` 回写
3. 月度成长报告输出

### 10.5 用户级 Experience 账户

包括：

1. 每用户独立 Experience 存储
2. Skill 公共、Experience 私有
3. 经验权限边界与隔离

### 10.6 更重的前端产品化

包括：

1. Experience 侧边栏
2. Experience 时间线
3. 经验卡片工作台
4. 更完整的 `Artifact-Lite` 经验衍生黑板

---

## 11. 风险与防线

### 风险 1：Experience 过强，导致追问变得“套模板”

防线：

1. 只注入前 2-3 条精华
2. 明确要求“参考，不复读”
3. 不把历史议题直接复述给用户

### 风险 2：Experience 变成讨好型记忆

防线：

1. prompt 中明确强调只允许用于精准追问
2. 只接“认知入口 / 盲点地图 / 节拍器 / 议题历史”
3. 不引入“用户偏好迎合清单”

### 风险 3：前端过度产品化，稀释主对话链

防线：

1. 一期只做轻提示
2. 不做可编辑后台
3. 不新增大型面板

---

## 12. 一句话收束

这轮最正确的推进方式不是把 `Socrates v0.2.0` 整套产品化搬进黄金坩埚，而是先收一个更稳的一期：

**只读接入 Experience，让黄金坩埚先获得“更懂用户、更会追问、可观测可验证”的第一波红利；把自动写回、管理后台、月度 Review 和账户体系，明确留给二期。**
