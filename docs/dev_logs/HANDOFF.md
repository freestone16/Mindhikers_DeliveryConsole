Last updated: 2026-04-30 19:40 CST
Branch: `MHSDC-GC-SSE`
Conductor: 老杨（OldYang） | Owner: 老卢（Zhou Lu）

---

# GoldenCrucible-SSE Handoff

## 当前一句话

SSE 已切回研发主线并开始 Roundtable backend API completion：`/api/roundtable/*` 不再是空 router，本地已经能从 `/m/roundtable` 发起一轮圆桌、生成轮次综合、执行导演“止”并展示 Spike。

## 本轮完成事实

### 1. 已回到 SSE 研发主线

- 当前分支：`MHSDC-GC-SSE`
- 当前目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
- 小修分支 `codex/gc-shell-status-polish` 已 push，但尚未合入 SSE 主线。
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
- 截图：
  - `/tmp/gc-sse-roundtable-backend-api.png`

## 当前边界

1. 不整枝 merge SSE 到 SaaS staging。
2. 不把 Roundtable 写进 SkillSync synced skill 集合。
3. 当前 fallback engine 只解决“后端 API 可用、UI 可验收”的闭环，不承诺最终讨论质量。
4. 共享 stash 不查看、不应用、不删除：
   - `stash@{0}: On MHSDC-GC-SSE: codex pre new module cleanup 2026-04-30`
   - `stash@{1}: On MHSDC-GC-SAAS-staging: codex pre shell staging apply cleanup 2026-04-29`

## 下一步

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
- 当前有未提交 Roundtable backend API 变更，除非本窗口已完成提交。
- 本地 dev 若仍在跑：前端 `http://localhost:5182/`，后端 `http://localhost:3009/`。
