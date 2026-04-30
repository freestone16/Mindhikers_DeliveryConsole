Last updated: 2026-04-30 21:59 CST
Branch: `MHSDC-GC-SSE`
Conductor: 老杨（OldYang） | Owner: 老卢（Zhou Lu）

---

# GoldenCrucible-SSE Handoff

## 当前一句话

SSE 已切回研发主线：Roundtable backend API first pass 已形成本地 commit `52f356f`，shell/status polish 也已从 `03fbb9d` 回并到 SSE 工作区并通过本地验证；下一步只剩提交/推送前确认与 SaaS 差异收口判断。

## 本轮完成事实

### 1. 已回到 SSE 研发主线

- 当前分支：`MHSDC-GC-SSE`
- 当前目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- 小修分支 `codex/gc-shell-status-polish` 已 push，来源 commit `03fbb9d` 的代码文件已回并到 SSE 工作区。
- 本轮没有回到 SaaS staging 做新功能。

### 2. Roundtable backend API 第一段已接通

变更文件：

- `server/routes/roundtable.ts`
- `server/index.ts`
- `src/modules/roundtable/components/PropositionInput.tsx`

已接通的 API：

- `POST /api/roundtable/sharpen`
- `POST /api/roundtable/sharpen/apply`
- `POST /api/roundtable/turn/stream`
- `POST /api/roundtable/director`
- `GET /api/roundtable/session/:id`
- `POST /api/roundtable/deepdive`
- `POST /api/roundtable/deepdive/question`
- `POST /api/roundtable/deepdive/summarize`

当前实现口径：

1. 这是 SSE 可验证 fallback engine，不是最终 LLM 圆桌引擎。
2. SSE 先保证前后端契约、SSE event stream、导演指令、Spike、DeepDive 链路跑通。
3. 后续可在同一 API / event 契约下替换成上游 Roundtable LLM 生成层。
4. Roundtable 仍是 module / runtime capability，不是 synced standalone skill。

### 3. 前端启动状态修复

`PropositionInput` 的本地 `isStarting` 现在会在 `onStartSession` 完成后复位，避免后端接通后按钮一直停在“正在启动圆桌…”。

### 4. shell/status polish 已回并 SSE 工作区

来源：

- SSE 小修分支 commit：`03fbb9d refs MIN-136 fix: polish shell module and SkillSync status`
- SaaS staging 对应 commit：`3507aa6 refs MIN-136 fix: polish shell module and SkillSync status`

已回并文件：

- `server/skill-sync.ts`
- `src/shell/ShellLayout.tsx`
- `src/shell/ShellLayout.module.css`
- `src/shell/SkillSyncStatus.tsx`
- `src/shell/SkillSyncStatus.module.css`
- `src/shell/primitives/ModuleTab.module.css`

当前口径：

1. 这是治理倒挂修复：消除“SaaS staging 已有 shell/status polish，而 SSE 主线缺失”的倒挂。
2. 本轮只回并 shell/status polish，不处理 Roundtable LLM engine 第二段。
3. SaaS release hardening（如 `.railwayignore`、placeholder DB）仍待逐项判断，不混入本切片。

## 验证结果

- `npm run typecheck:saas` 通过。
- `npm run build` 通过，仅保留既有 CSS `file` warning 与 Vite chunk-size warning。
- API 冒烟通过：
  - `POST /api/roundtable/turn/stream` 返回 `roundtable_selection`、`roundtable_turn_chunk`、`roundtable_awaiting` 等事件。
  - `POST /api/roundtable/director` with `止` 返回 Spike。
- agent-browser 本地验证通过：
  - URL: `http://localhost:5182/m/roundtable`
  - 输入：`AI时代教育是不是更好？`
  - 页面显示 3 位参与哲人、3 条发言、第 1 轮综合。
  - 点击“停止提取 Spike”后显示 `Spike 发现 (1)`。
  - browser errors 为空。
- shell/status polish 本地验证通过：
  - URL: `http://localhost:5182/m/crucible`
  - URL: `http://localhost:5182/m/roundtable`
  - 右下角 SkillSync indicator 显示 `5/5`。
  - 点击 popover 可见 SSOT source、target root、`Writer`、`ThesisWriter`、`Researcher`、`FactChecker`、`Socrates`。
  - 左侧模块显示 `炼制` / `圆桌`，无 browser errors。
- 截图：
  - `/tmp/gc-sse-roundtable-backend-api.png`
  - `/tmp/screenshot-1777557550989.png`

## 当前边界

1. 不整枝 merge SSE 到 SaaS staging。
2. 不把 Roundtable 写进 SkillSync synced skill 集合。
3. 当前 fallback engine 只解决“后端 API 可用、UI 可验收”的闭环，不承诺最终讨论质量。
4. 共享 stash 不查看、不应用、不删除：
   - `stash@{0}: On MHSDC-GC-SSE: codex pre new module cleanup 2026-04-30`
   - `stash@{1}: On MHSDC-GC-SAAS-staging: codex pre shell staging apply cleanup 2026-04-29`

## 下一步

### 为什么建议新开 `codex/gc-roundtable-llm-engine-bridge`

这是建议，不是硬性要求。

建议开分支的原因：

1. 当前 `MHSDC-GC-SSE` 是研发主线，最新本地 commit `52f356f` 已经是一个可回滚的小闭环。
2. 第二段会迁入/适配上游 Roundtable LLM engine，预计新增 10+ 个后端、schema、persona、测试文件，风险和 first pass 不同。
3. 独立分支可以让第二段失败时直接丢弃或重做，不污染当前可用主线。
4. 如果老卢明确要继续在 `MHSDC-GC-SSE` 上直推，也可以；但默认更稳的是从当前主线切 `codex/gc-roundtable-llm-engine-bridge`。

### SSE / SaaS staging 当前真实差距

不要看全量 diff 的 8562 文件。里面包含历史 agent 元数据、`node_modules_bad`、runtime/testing artifacts、旧文档删除等噪声，不是当前同步目标。

按当前产品/治理入口看，真实差距分 4 类：

1. **SSE 独有，SaaS 未接收**
   - `52f356f refs MIN-136 feat: connect roundtable backend API first pass`
   - 内容：`/api/roundtable/*` first pass、Roundtable 页面可跑一轮、Spike UI 可见。
   - 当前状态：只在本地 `MHSDC-GC-SSE`，尚未 push，SaaS staging 未接收。
2. **SaaS staging 已有，SSE 主线刚回并到工作区**
   - SaaS commit `3507aa6 refs MIN-136 fix: polish shell module and SkillSync status`
   - 来源 SSE 小修分支 commit `03fbb9d`。
   - 内容：右下角 SkillSync status、source popover、ModuleTab glyph 对齐。
   - 当前状态：代码已回并并验证，尚未 commit / push。
3. **SaaS staging release hardening**
   - `14a7a3e` Railway snapshot ignore 修复、`e610631` placeholder DB 修复等仍属于 SaaS 预发验收硬化。
   - 是否回灌 SSE 需逐项判断，不能整枝 merge。
4. **历史结构差异**
   - README、AGENTS、docs/dev_logs、testing 历史记录、旧 runtime/artifact 等差异很大。
   - 这些不是下一步要一次性同步的目标，只能按“当前会影响开发/发布”的小切片处理。

### 治理未完成项

优先级从高到低：

1. 决定是否将当前 shell/status polish 工作区变更提交到 `MHSDC-GC-SSE`。
2. 决定是否 push `52f356f` 与后续 shell/status polish commit 到 `origin/MHSDC-GC-SSE`。
3. 逐项判断 SaaS release hardening 是否需要回灌 SSE：`.railwayignore`、placeholder DB。
4. SaaS staging 是否接收 `52f356f`：建议等 SSE push 后，再评估是否 cherry-pick；当前 first pass 是 fallback engine，不应包装成最终 LLM 质量。
5. 第二段 Roundtable LLM engine bridge 独立切片：persona loader、speaker selection、spike extractor、deepdive engine、persistence integration。
6. 历史 diff 噪声不作为治理阻塞，但需要继续坚持“不整枝 merge SSE 到 SaaS staging”。

### 第二段评估

不建议在同一个上下文里继续直接做第二段。

原因：

1. 第二段不是小修，而是上游 Roundtable LLM engine 迁入。
2. 预计新增/适配文件包括：
   - `server/roundtable-engine.ts`
   - `server/roundtable-types.ts`
   - `server/spike-extractor.ts`
   - `server/deepdive-engine.ts`
   - `server/proposition-sharpener.ts`
   - `server/compression-config.ts`
   - `server/persona-loader.ts`
   - `src/schemas/persona.ts`
   - `personas/*.json`
   - `server/__tests__/*roundtable*/*spike*/*deepdive*/*persona*`
3. 还需要手工适配 SSE 的 `server/llm.ts` 超时机制与 `server/crucible-persistence.ts`，不能直接整文件复制。
4. 当前 first pass 已形成一个可验证、可回滚的小闭环，应先作为独立提交保存。

推荐下一切片：

```text
codex/gc-roundtable-llm-engine-bridge
```

范围：

1. 继续把 fallback engine 替换/升级为真实 Roundtable LLM 生成层：
   - speaker selection
   - persona loading
   - spike extractor
   - deepdive engine
   - persistence integration
2. 保持当前 `/api/roundtable/*` 外部契约不变，让前端不用再改一次。
3. 若要推 SaaS staging，必须等 SSE 这边提交验证后 cherry-pick 小切片，不能整枝 merge。

## 接管提示

新窗口先执行：

```bash
git branch --show-current
git status --short --branch
git diff --stat
```

期望：

- 分支：`MHSDC-GC-SSE`
- 当前本地比 `origin/MHSDC-GC-SSE` ahead 1：`52f356f`
- 工作区还有 shell/status polish 回并变更与本轮文档回写，尚未 commit。
- 本地 dev server 本轮验证后应停止。
- 新窗口第一件事：确认是否提交当前 shell/status polish + 文档闭环，再确认是否 push。
