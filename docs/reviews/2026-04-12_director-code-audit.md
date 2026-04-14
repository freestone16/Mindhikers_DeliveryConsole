---
date: 2026-04-12
scope: Director module
type: security + optimization audit
author: ce-review subagent
plan: docs/plans/2026-04-12_director-module-governance-plan.md
---

# Director Module Code Audit Report

## 摘要

- **严重问题数（Critical）**：6
- **高优先级（High）**：7
- **中优先级（Medium）**：6
- **改进建议（Low）**：5
- **与 plan 的关系**：本报告完全不复述 plan 已覆盖的 R1-R17（5 处 volcengine 硬编码、三写非原子、thumbnailTasks 内存 Map、safeParseLLMJson 静默删字段、视频字符串 retry、日志脱敏、director.ts 拆分、any 清理、*.backup 清理、polling 阈值集中）。只报告 plan 雷达之外的问题。
- **紧急上报**：是。**C1（路径穿越）+ C2（chat-action-execute 无授权）+ C4（0.0.0.0 绑定 + 全通 CORS）+ C5（Google API Key 进 URL）** 四条组合起来相当于：任何与本机同一 LAN/WiFi 的主机都能远程读取开发机任意文件 / 写入项目仓库 / 偷 API key / 触发 LLM 消费账单。建议把这几条直接纳入 PR1 前的 hotfix，**不要等 Stage 4**。

---

## Critical（必须立刻修）

### C1. 多个 Director API 存在直接的路径穿越漏洞

- **文件**：
  - `server/director.ts:1639-1672` （`serveVideoFile`）
  - `server/director.ts:2217-2242` （`phase4ReadSrt`）
  - `server/director.ts:243-258` （`generatePhase1` 的 `scriptPath`）
  - `server/director.ts:359-399` （`startPhase2` 的 `scriptPath`）
  - `server/director.ts:1571-1586` （`phase3DownloadXml` 的 `projectId` + `format`）
- **现象**：
  - `serveVideoFile` 直接 `path.join(projectRoot, '04_Visuals', 'videos', filename)`，`filename` 来自 `req.params.filename`，无任何过滤。
  - `phase4ReadSrt` 同样直接 `path.join(dir, filename)` 读任意文件，再 `res.json({ content })` 把内容原文回给客户端。
  - `generatePhase1` 与 `startPhase2` 接收 `scriptPath` 作为 body 字段拼到 `projectRoot`。
  - `assertProjectPathSafe` 在 `server/project-paths.ts:64` 已实现但**没有任何调用方**（Grep 全仓无匹配）。
- **风险**：
  - `GET /api/director/phase4/read-srt/..%2F..%2F..%2Fetc%2Fpasswd?projectId=<任意>` 会把 `/etc/passwd` 文件内容以 JSON 字段返给调用者。
  - `POST /api/director/phase1/generate {projectId:"x", scriptPath:"../../../../Users/luzhoua/.ssh/id_rsa"}` 会把私钥塞进 LLM prompt 并写入 04_Visuals 目录。
  - 配合 C4 的 0.0.0.0 绑定，这是**远程任意文件读取**。
- **复现路径**：开发机 `curl -s 'http://<dev-host>:3005/api/director/phase4/read-srt/..%2F..%2F..%2F..%2Fetc%2Fhosts?projectId=anything'`。
- **建议修复**：所有由 `req.params/body/query` 进来的相对路径与 `projectId`，在 `path.join` 之后**必须**调用 `assertProjectPathSafe`。同时把 `phase4ReadSrt` 的 `filename` 限定为白名单正则（`^[\w\-. ]+\.srt$`）；`serveVideoFile` 对 `filename` 也走同样白名单。
- **是否纳入 plan**：❌ 未覆盖。**建议归属**：PR1 前的单独 hotfix 或紧随 Stage 1 的补丁 commit。

---

### C2. `chat-action-execute` socket 事件没有授权校验，客户端可绕过 Bridge/Confirm 直接执行任意 action

- **文件**：`server/index.ts:942-1021`
- **现象**：服务端在 `socket.on('chat-action-execute', ...)` 中，直接把 `actionName` / `actionArgs` / `historyMessages` 从客户端载荷转发给 `adapter.executeAction(actionName, actionArgs, projectRoot)`，**没有任何关联之前 `emitAndPersistActionConfirm` 发出的 `confirmId`**，也没有校验该 action 是否经过 Bridge 层 resolve。
- **风险**：
  1. 任何能连到 socket.io 的客户端（同 LAN 或能跨站连 ws）都可以不经过 LLM 直接发送：
     ```js
     socket.emit('chat-action-execute', {
       expertId: 'Director',
       projectId: 'CSET-Seedance2',
       actionName: 'update_option_fields',
       actionArgs: { chapterId: 'ch1', optionId: 'ch1-opt1', updates: { type: 'remotion', template: '../../../evil' } }
     });
     ```
     → 立即写入 `delivery_store.json`，绕过所有 Bridge 层约束（U3/U4 里的 ambiguous_alias 澄清、type conflict 检查等全部形同虚设）。
  2. 配合 C3 的 prototype pollution，可以污染所有 option 对象。
  3. 配合 C4 的 0.0.0.0 + 宽松 CORS，远程攻击成立。
- **建议修复**：
  - 服务端维护 pending confirm 表：`emitAndPersistActionConfirm` 生成 `confirmId` 时存 `{confirmId → {actionName, actionArgs, expertId, projectId, createdAt}}`，`chat-action-execute` 必须携带 `confirmId` 并从表里取 `actionArgs`，**永不信任客户端回传的 args**。
  - Pending 表加 TTL（30 分钟）和单次消费（执行后 delete）。
  - `projectId` 也从 pending 表里取，不从客户端读。
- **是否纳入 plan**：❌ 未覆盖。plan 的 Stage 2 只管状态 SSOT/原子写，未触及授权模型。**建议归属**：PR1 hotfix，或新建 Stage 1.5「授权与确认流修复」。

---

### C3. `update_option_fields` 存在原型污染与类型枚举缺失

- **文件**：`server/expert-actions/director.ts:186-213`
- **现象**：
  ```ts
  const IMMUTABLE_FIELDS = new Set(['id', 'isChecked']);
  for (const [key, value] of Object.entries(updates)) {
      if (IMMUTABLE_FIELDS.has(key)) continue;
      if (key === 'props' && typeof value === 'object' && value !== null) {
          opt.props = { ...(opt.props || {}), ...(value as Record<string, unknown>) };
      } else {
          (opt as any)[key] = value;  // ← 原型污染点
      }
  }
  ```
  - `JSON.parse` 会把 `"__proto__"` 作为**普通 own property** 解析到 `updates`，`Object.entries` 会遍历到它。然后 `(opt as any)["__proto__"] = value` 会触发 `Object.prototype` 的 `__proto__` setter，**真正修改了 opt 的原型**。
  - 工具 schema `additionalProperties: true` 且 `updates` 没有任何字段白名单，LLM 或直接走 C2 通道的攻击者可塞 `updates: { type: '<任意串>', previewUrl: 'http://evil', deleted: true, __proto__: { isMalicious: true } }`。
  - `updates.type` 也没有枚举校验（虽然 description 里写了）：写个 `type: 'x'` 就让整个 store 的类型分支逻辑崩溃。
- **风险**：
  - 原型污染：下一个遍历 `option` 对象的代码（例如 `director-bridge.ts:543` 的 `options[optionSeq - 1]`）会读到被污染的属性，可能触发意外分支。
  - 绕过 `type` 枚举破坏 delivery_store schema，使 phase2/phase3 逻辑在后续读取时报错或静默跳过。
- **建议修复**：
  - 用显式白名单替代黑名单：`ALLOWED_FIELDS = new Set(['type','name','prompt','imagePrompt','template','props','quote','rationale','svgPrompt','previewUrl','phase3'])`，任何不在白名单的键一律忽略。
  - 对 `updates.type` 强制走 `BRollType` 枚举校验，不合法直接 `return { success:false, error:'invalid type' }`。
  - 用 `Object.hasOwn(updates, key) && key !== '__proto__' && key !== 'constructor'` 双重防护，或用 `Object.create(null)` 做中转。
  - 在工具 schema 里把 `updates.additionalProperties` 限定为 enum / 固定 shape。
- **是否纳入 plan**：⚠️ 部分。plan R13 清理 any 会顺带触碰这段代码，但白名单 + 原型污染防护不在 R1-R17 范围内。**建议归属**：PR4 Unit 9 合并，或作为 C2 hotfix 的配套修复。

---

### C4. 服务绑定到 0.0.0.0 + 无 Origin 限制的 CORS

- **文件**：
  - `server/index.ts:1525` — `httpServer.listen(PORT, '0.0.0.0', ...)`
  - `server/index.ts:40` 与 `server/index.ts:161` — `app.use(cors())`（两次都是默认配置，允许任意 origin）
- **现象**：注释里写 "Docker Friendly"，但在开发机直接跑 `pnpm dev` 就会让同 LAN 所有设备能直连 3005 端口所有 API。CORS 没有 allowlist，所以任何网页打开也能 fetch 到本机 API。
- **风险**：
  - 与 C1/C2/C5 组合：一个在同 WiFi 的恶意页面即可读开发机任意文件 / 改 delivery_store / 刷 LLM 账单 / 偷 Google API key。
  - 即便不谈攻击，纯粹是邻居笔记本能触发本机昂贵的 Gemini 图像生成。
- **建议修复**：
  - 默认 `listen(PORT, '127.0.0.1')`，用 env `LISTEN_HOST` 显式 opt-in 到 0.0.0.0。
  - `cors({ origin: (origin, cb) => cb(null, origin === 'http://localhost:5173' || origin === process.env.FRONTEND_ORIGIN) })`。
  - 关键 socket 事件（`chat-action-execute` / `update-data` / `start-render`）额外检查 `socket.handshake.headers.origin`。
- **是否纳入 plan**：❌ 未覆盖。**建议归属**：PR1 hotfix。

---

### C5. Google Gemini Image 把 API Key 明文拼进 URL，且错误路径会把 URL 一起返回给调用方

- **文件**：`server/google-gemini-image.ts:48-73`
- **现象**：
  ```ts
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  ...
  console.log(`[Google Image] Response status: ${response.status}, body: ${responseText.slice(0, 300)}`);
  if (!response.ok) {
    return { error: `API Error: ${response.status} - ${responseText.slice(0, 300)}` };
  }
  ```
  - API key 在查询字符串里，这意味着：
    1. 任何 HTTP 访问日志都会记录 key（本地 `pino`/`morgan`、出站代理、Google 自己的访问日志）。
    2. `responseText` 若包含被 echo 的 URL（Google 部分错误返回会 echo 请求 URL），会**通过 `{ error }` 一路返给前端 chat**，key 最终出现在浏览器 devtools 和聊天记录里。
    3. 没有 timeout，配合 L-013 铁律。
- **风险**：凭证泄漏是最高危，且目前 plan R12 的「脱敏」只谈 prompt 日志，**没谈 query-string 里的 key**。
- **建议修复**：
  - Gemini v1beta 同时支持 `X-Goog-Api-Key` header（或 `Authorization: Bearer`），**把 key 移到 header**。
  - `redactKey(apiKey)` helper（plan Unit 9 提到）对 `responseText` 做二次扫除，仅返回截短的 safe 片段给客户端。
  - `fetch` 套上 `AbortController + DEFAULT_LLM_TIMEOUT_MS`（L-013 模式，已在 `server/llm.ts:20-37` 存在，直接复用）。
- **是否纳入 plan**：⚠️ 部分。R12 提到 key 脱敏但仅限日志文本，未覆盖「key 进 URL」与「错误响应回传到前端」。**建议归属**：PR4 Unit 9 扩展，或并入 C1 hotfix 批次。

---

### C6. `saveApiKey` 写入 .env 时未过滤换行，存在 .env 注入

- **文件**：`server/llm-config.ts:116-156`
- **现象**：`updateLine(envVars[0], apiKey)` 直接 `lines[existingIndex] = \`${envVar}=${apiKey}\``，然后 `fs.writeFileSync(envPath, lines.join('\n'))`。如果 `apiKey` 里含 `\n`，写入后下一行就变成新的 env 变量，随后 `getEnvValue` 的正则 `^${varName}=(.+)$` 就会拾起。
- **风险**：
  - 攻击者（走 C2 或直接 POST 到未授权的 `/api/llm-config/api-key`）可以注入任意 env：
    ```json
    { "provider": "volcengine", "apiKey": "legit\nPROJECTS_BASE=/tmp/attacker-owned\nSKILLS_BASE=/tmp/attacker-owned" }
    ```
  - 下次启动会以攻击者指定的 PROJECTS_BASE 启动，`ensureProjectsBaseExists` 也只检查目录是否存在，不检查内容。→ 后续所有 project 读写、LLM prompt、thumbnail 写入都走到攻击者目录。
- **建议修复**：
  - `apiKey = String(apiKey).trim()`，然后 `/[\r\n\0]/.test(apiKey)` → 400 拒绝。
  - 额外做长度上限（例如 4096）。
  - `/api/llm-config/api-key` POST 必须先做 origin / CSRF 校验（同 C4）。
- **是否纳入 plan**：❌ 未覆盖。**建议归属**：Stage 4 Unit 9 扩展，或 C4 hotfix 批次。

---

## High

### H1. 所有 Director API 都把 `req.body` / `req.query` / `req.params` 当类型安全的数据直接用

- **文件**：`server/director.ts` 多处（244, 299, 360, 595, 1193, 1245, 1325, 1489, 1548, 1891, 2098, 2176, 2218）
- **现象**：没有任何 `zod.parse` / 类型守卫。举例：`phase2Select` 从 `req.body.optionId` 解构后直接当 string 用，如果客户端传数组 Express 会原样给过。`phase3GenerateXml` 的 `alignments` 直接交给 `generateFCPXML`，内部若假设 shape 会崩。
- **风险**：多数是拒服务（DoS）+ 少量未定义行为。但 `alignments` 被 `generateFCPXML` 写入 XML 时，若包含未转义的 `<script>` 等内容，生成的 FCP XML 文件会被 Premiere/剪映解析成恶意内容（取决于目标软件的 XML 解析器宽松度）。
- **建议修复**：plan Unit 4 的 zod schema 应扩展为 API 入参 contract；为每个 route 引入 `zod` middleware。
- **是否纳入 plan**：⚠️ 部分（Unit 4 只做 state shape 的 zod，没谈 req 入参）。**建议归属**：扩展 Unit 4 或新增 Unit 4.5。

### H2. `taskStorage` / `thumbnailTasks` / `videoTasks` / `renderJobStorage` 四个内存 Map 都没有清理

- **文件**：`server/director.ts:52, 97, 663, 1593`
- **现象**：Grep `thumbnailTasks.delete|videoTasks.delete|gc|cleanup` 全仓无匹配。所有这些 Map 只增不减。
- **风险**：长时间运行的 dev server（一周内切项目几十次）内存持续增长。生产环境若走这份代码更严重。
- **建议修复**：每个 Map 加 `gcCompletedTasks(olderThanMs = 6*3600*1000)`，在 `setInterval` 里每小时跑一次。plan Unit 7 只打算把 thumbnailTasks 转成文件，但文件也要有 GC；其余三个 Map 应一并处理。
- **是否纳入 plan**：⚠️ 部分（Unit 7 谈了 thumbnailTasks 持久化，但未谈其他三个 Map 的 GC）。**建议归属**：扩展 Unit 7。

### H3. Volcengine / Google / 其他外部 fetch 都没有 timeout

- **文件**：`server/volcengine.ts:59, 111, 167, 222, 259`，`server/google-gemini-image.ts:52`
- **现象**：只有 `server/llm.ts` 的 `fetchWithTimeout`（L-013 模式）有 AbortController。图像/视频 adapter 全部裸 `fetch`。
- **风险**：若 Volcengine 或 Google 端挂住 TCP 连接，Director Phase2 批量渲染的队列 worker 会无限等待，占着 `runConcurrentQueue` 的 worker slot，直到整个服务重启。
- **建议修复**：把 `fetchWithTimeout` 从 `llm.ts` 提到独立 helper（和 plan Unit 8 的 `server/director/timeouts.ts` 同源），所有 adapter 统一走这个 helper。
- **是否纳入 plan**：⚠️ 部分（Unit 8 谈了超时集中，但只提到 retry policy，没明确 adapter 也要接入 fetchWithTimeout）。**建议归属**：扩展 Unit 8。

### H4. `downloadVideo` 与 `downloadImageToLocal` 存在 SSRF + 磁盘填充风险

- **文件**：`server/volcengine.ts:255-280`，`server/director.ts:1698-1720`（`downloadImageToLocal`）
- **现象**：
  - `downloadVideo(videoUrl, outputPath)` 对 `videoUrl` 不做 scheme / host 白名单，只要是个字符串就 fetch。
  - `downloadImageToLocal(remoteUrl, ...)` 同样。
  - 两者都没有 `Content-Length` 校验，没有流式写入，直接 `fs.writeFileSync(outputPath, buffer)` —— 10GB 响应就是 10GB 内存 + 10GB 磁盘。
- **风险**：
  - **SSRF**：虽然 `videoUrl` 理论上来自 Volcengine 响应，但 API 响应被 MITM 或被 volc 自己配错时，可诱导本服务器去 GET 内网地址（AWS metadata / k8s service / 本机 :3005 自身），请求结果再写到项目目录。
  - **磁盘 DoS**：配合 C1 能把文件写到 `../../../..` 任意位置。
- **建议修复**：
  - 允许的 scheme 白名单 `['https:']` + host 白名单（`ark.cn-beijing.volces.com` / `*.volccdn.com` / `generativelanguage.googleapis.com`）。
  - `response.headers.get('content-length')` 超过 50MB 直接中止。
  - 用 stream pipeline 落盘，避免全内存读。
- **是否纳入 plan**：❌ 未覆盖。**建议归属**：Stage 4 新增 Unit 9.5「外部 fetch 安全」。

### H5. `getChapterSeq` 把 0-based `chapterIndex` 和 LLM 给出的 seq 混用，且 fast path 直接信任

- **文件**：`server/director-bridge.ts:537, 597-600`，`server/director-bridge.ts:263-280`
- **现象**：
  ```ts
  function getChapterSeq(chapter, index): number {
    return (chapter.chapterIndex !== undefined ? chapter.chapterIndex : index) + 1;
  }
  ```
  当 `chapterIndex` 字段缺失时 fallback 到数组 index，但这**和 LLM 在 getContextSkeleton 里看到的 seq 不一定一致**（数组顺序可能被用户编辑打乱，`chapterIndex` 才是持久化 seq）。rules.md L-018 已经吃过这个亏。
  更严重的是 `tryResolveDirectorFastPath` 用正则直接从用户消息匹配 `(\d+)[-–](\d+)`，**不经 LLM** 直接生成 executionPlan。任何用户消息里写"把 5-3 改成 D"就会立即触发 update。
- **风险**：
  - 用户在讨论无关话题时偶然说出 "5-3"，fast path 可能误触发。
  - L-018 同类 bug 会再现在其他 fallback 路径。
- **建议修复**：
  - `getChapterSeq` 去掉 fallback 分支，`chapterIndex` 缺失直接 throw，让数据层异常显式化。
  - Fast path 前置更强的意图词过滤（至少两个 type verb + 一个 target verb）。
  - 或者 fast path 只输出 `confirmCard` 不直接落地 execution（已走 `emitAndPersistActionConfirm` 确认，但结合 C2 没确认接管就危险）。
- **是否纳入 plan**：❌ 未覆盖（plan 明确 director-bridge 质量良好不动）。**建议归属**：作为 L-018 的 follow-up lesson 写进 rules.md，并在 Stage 4 Unit 9 做 fast path 紧致化。

### H6. `generateThumbnail` / `phase2RenderChecked` 用用户 `chapterId` + `option.id` 拼 `taskKey` 再作为文件名

- **文件**：`server/director.ts:813, 823, 1344, 1376`，`server/director.ts:1704`
- **现象**：
  - `const taskKey = \`${chapterId}-${option.id}\`;` 然后 `const outputPath = path.join(outputDir, \`thumb_${taskKey}.png\`);`
  - `server/director.ts:1704` 的 `seedream_${taskKey.replace(/[^a-zA-Z0-9_-]/g, '_')}` 有 sanitize，但 `generateThumbnail` / `phase2RenderChecked` 那条路径没有。
  - `chapterId` 来自 `req.body`，没做校验。
- **风险**：`chapterId = "../../../../../../tmp/evil"` 可以把 Remotion 渲染结果写到 projectRoot 外任意位置。配合 C2 直接达成任意写。
- **建议修复**：把 `seedream_` 路径里的 `replace(/[^a-zA-Z0-9_-]/g, '_')` 统一提成 `safeSlug(taskKey)` helper，所有用 `taskKey` 当文件名的地方都走一遍。更好的做法是 `taskKey` 仅用作内存 Map 的 key，**不用作文件名**，文件名用 `crypto.randomUUID()`。
- **是否纳入 plan**：❌ 未覆盖。**建议归属**：Stage 1 Unit 1 修 `thumbnailTasks` 时顺手做。

### H7. `phase2ReviseOption` 调用 `loadConfig()` 的返回值结构错误 → 实际总是用默认 provider

- **文件**：`server/director.ts:2140-2141`
  ```ts
  const config = await loadConfig();
  const response = await callLLM(messages, config.provider, config.model);
  ```
- **现象**：`loadConfig()` 是同步函数（`server/llm-config.ts:52`），返回 `LLMConfig`，没有顶层 `provider`/`model` 字段，真正的是 `config.global.provider` / `config.global.model`。这里 `config.provider` 是 `undefined`，`callLLM(messages, undefined, undefined)` 会走到 `callLLM` 的默认分支（通常是 deepseek / 第一个 provider）。用户在 config page 选的 provider 被完全忽略。
- **风险**：用户以为自己在用 Zhipu，实际是 DeepSeek，账单与效果都错乱。另外 `await` 一个非 Promise 返回的值虽然 JS 允许，但是典型 bug 信号（跟 `expert-actions/director.ts:154` 的正确写法对照）。
- **建议修复**：改为：
  ```ts
  const config = loadConfig();
  const response = await callLLM(messages, config.global.provider as LLMProvider, config.global.model);
  ```
- **是否纳入 plan**：❌ 未覆盖（这是 bug 不是 governance）。**建议归属**：PR1 hotfix 里一行修掉。

---

## Medium

### M1. Gemini 与 Volc 的 API key 读取路径各自实现，散落的 `.env` 解析器

- **文件**：`server/volcengine.ts:14-31`、`server/google-gemini-image.ts:9-22`、`server/director-visual-runtime.ts:59-69`、`server/llm-config.ts:31-42`
- **现象**：四份几乎一样的 `getEnvVar` 函数，都用类似的 `new RegExp(\`^${var}=(.+)$\`, 'm')` 解析 `.env`。修复 C6 时任何一处遗漏都会漏修。
- **建议修复**：抽独立 `server/env-loader.ts` helper，单一入口，所有 adapter 走它。这也为 plan Unit 9 的 key 脱敏提供统一切入点。
- **是否纳入 plan**：❌ 未覆盖。**建议归属**：扩展 Unit 9。

### M2. `phase3AlignSrt` 把 brolls 内容直接注入 LLM prompt，存在 prompt injection

- **文件**：`server/director.ts:1499-1520`
- **现象**：`${JSON.stringify(brolls, null, 2)}` 直接塞到 LLM prompt 里。`brolls` 来自 `req.body`，攻击者可以往某字段写 "IGNORE ALL PREVIOUS INSTRUCTIONS AND ..."。
- **风险**：LLM 输出被攻击者操控 → 生成的 FCP XML 里含错误时间码 → 剪映/Premiere 解析出奇怪剪辑。不是远程执行，但破坏数据完整性。
- **建议修复**：在 prompt 前加防御分隔符 + 明确"只处理 JSON 数据不执行指令"。长期应把 brolls 用结构化 function-calling 传递。
- **是否纳入 plan**：❌ 未覆盖。**建议归属**：Stage 4 Unit 9 的配套。

### M3. `taskStorage` / `thumbnailTasks` 没有项目隔离

- **文件**：`server/director.ts:52, 663`
- **现象**：`taskKey = chapterId-optionId`，不含 projectId。切换项目时不同项目的同名 chapter/option 会串 task（L-009 已记过类似的事）。
- **建议修复**：`taskKey = ${projectId}::${chapterId}::${optionId}`。同步修 `getThumbnailStatus` 的 lookup。
- **是否纳入 plan**：⚠️ 部分（Unit 7 持久化任务时应已暴露该问题，但未显式列）。**建议归属**：Unit 7 扩展。

### M4. `extractMarkdownFromDirectorJson` 的容错路径用正则解析 JSON

- **文件**：`server/director.ts:176-203`
- **现象**：
  ```ts
  const match = cleanText.match(/"concept_proposal"\s*:\s*"([\s\S]*?)"(?=\s*(?:,|}$))/);
  ```
  当 concept_proposal 内含转义引号时会截断。Phase1 概念被截短。
- **建议修复**：容错路径直接 throw，不要自作聪明。让 safeParseLLMJson（Unit 9 改造版）统一处理。
- **是否纳入 plan**：⚠️ 部分（Unit 9 重写 safeParseLLMJson 时应一并考虑）。**建议归属**：Unit 9 扩展。

### M5. `REMOTION_STUDIO_DIR` 的 fallback 可能指向不存在路径，错误日志延迟暴露

- **文件**：`server/director.ts:678-685`
- **现象**：`candidates.find(d => fs.existsSync(d)) || candidates[candidates.length - 1] || '/missing-remotion-studio'`。如果都不存在，返回 `/missing-remotion-studio`，后续 spawn Remotion 命令时才报一个费解的 ENOENT。
- **建议修复**：启动时 `ensureRemotionStudioExists()`（类似 `ensureProjectsBaseExists`），不存在直接退出并给明确诊断。
- **是否纳入 plan**：❌ 未覆盖。**建议归属**：Stage 4 小改动。

### M6. `saveSelectionState` / `savePhase2ReviewState` / `savePhase3RenderState` 各自实现非原子写

- **文件**：`server/director.ts:169-173, 222-226, 237-240`
- **现象**：三处都是裸 `fs.writeFileSync`，与 plan Unit 5 的 atomic-fs 无关。plan 只谈 SSOT 切换到 delivery_store，但在切换完成前这些 file 依然被写。
- **建议修复**：Stage 2 双写期把这三处也接入 atomic-fs helper，至少消除半写风险。
- **是否纳入 plan**：⚠️ 部分。**建议归属**：Unit 5 范围扩展。

---

## Low / 改进建议

### L1. `generateThumbnail` 的 `projectId` fallback 到 `process.env.PROJECT_NAME`

- **文件**：`server/director.ts:817`
- **现象**：`const projectId = req.body.projectId || process.env.PROJECT_NAME || 'MindHikers Delivery Console';`。fallback 到 env 或硬编码名，违反 rules.md #121（多项目架构禁硬编码）。
- **建议**：缺 projectId 直接 400 拒绝，不要 fallback。

### L2. `parseMarkdownChapters` 把 fallback 章节命名为"全文"

- **文件**：`server/director.ts:153-157`
- **现象**：脚本无 heading 时 fallback 为 `{ title: '全文', text: content.trim() }`。但后续 `parsedChapters` 被传给 LLM 做全局 broll 规划时，`全文` 会被 LLM 当成真实章节名输出到用户 Markdown。
- **建议**：fallback 名加 prefix `[整篇脚本]` 或 `__fallback__`，并在 Phase1 UI 展示时替换。

### L3. 所有 `catch (error: any)` 把 raw error.message 回到 client

- **全仓**：`server/director.ts` 中 `res.status(500).json({ error: error.message })` 出现 10 余次
- **现象**：error.message 常含内部路径、sql、堆栈片段。
- **建议**：统一 `toUserFacingError(err)` helper，返回脱敏后的结构化错误码 + 内部 errorId，详情仅进日志。

### L4. `runConcurrentQueue` 捕获不到单个 worker 的异常

- **文件**：`server/director.ts:99-116`
- **现象**：`handler(item)` 如果 throw，整个 `worker()` 就停，后续 item 会在另外的 worker 被拾起但出现不平衡。L-011 相关。
- **建议**：handler 包 try/catch，每个 item 独立成功/失败状态。

### L5. `dev_logs/HANDOFF.md` / `rules.md` 未提及本报告发现

- 建议把 C1-C6 作为一条新的教训写入 `docs/04_progress/rules.md`（"任何 req.params/body/query 中的路径字段必须走 assertProjectPathSafe"），并在 HANDOFF.md 记录"存在 4 条 Critical 待 hotfix"。

---

## 与 plan 的对照表

| 发现 | plan 中是否覆盖 | 建议归属 Unit |
|---|---|---|
| C1 路径穿越 | ❌ 完全未覆盖 | **新建 PR1 hotfix** 或 Unit 1 前置 |
| C2 chat-action-execute 授权缺失 | ❌ 未覆盖 | **新建 PR1 hotfix** 或 Stage 1.5 |
| C3 update_option_fields 原型污染 + 无白名单 | ⚠️ 部分（R13 会触碰） | Unit 9 扩展 |
| C4 0.0.0.0 + 全通 CORS | ❌ 未覆盖 | **PR1 hotfix** |
| C5 Google key 进 URL | ⚠️ R12 提脱敏但不涉 URL | Unit 9 扩展 |
| C6 .env 注入 | ❌ 未覆盖 | Unit 9 扩展 |
| H1 req 入参无 zod | ⚠️ Unit 4 只做 state | **扩展 Unit 4** |
| H2 四个内存 Map 无 GC | ⚠️ Unit 7 只管 thumbnailTasks | 扩展 Unit 7 |
| H3 adapter fetch 无 timeout | ⚠️ Unit 8 谈 retry 未谈 timeout | 扩展 Unit 8 |
| H4 downloadVideo SSRF | ❌ 未覆盖 | 新增 Unit 9.5 |
| H5 chapterSeq fallback + fast path | ❌ plan 明确不动 bridge | rules.md + Unit 9 小修 |
| H6 taskKey 用作文件名 | ❌ 未覆盖 | Unit 1 顺手做 |
| H7 phase2ReviseOption loadConfig bug | ❌ 未覆盖（纯 bug） | **PR1 hotfix 1 行修** |
| M1 四份 getEnvVar 散落 | ❌ 未覆盖 | Unit 9 扩展 |
| M2 phase3AlignSrt prompt injection | ❌ 未覆盖 | Unit 9 扩展 |
| M3 taskKey 无 projectId | ⚠️ Unit 7 应暴露 | 扩展 Unit 7 |
| M4 extractMarkdownFromDirectorJson 正则 | ⚠️ Unit 9 相关 | Unit 9 扩展 |
| M5 REMOTION_STUDIO_DIR fallback | ❌ 未覆盖 | Stage 4 小改 |
| M6 三处非原子写 | ⚠️ Unit 5 不涉及 | 扩展 Unit 5 |

---

## 不算问题但值得注意的设计选择

- **`director-visual-runtime.ts:149` 的 `sourceProvider !== 'volcengine'` 硬判断**：不是 bug，因为 Google Gemini Image 是同步返回，没有 async polling API。但注释应该写明"Google 不需要 poll"而不是看起来像另一个 5 处硬编码。
- **`expert-actions/director.ts:194-200` 的 type 变更清除 previewUrl/template/props**：这是合理的级联清理。但 `opt.props = undefined` 与 `opt.template = null` 混用（一个 undefined 一个 null），可能导致后续 zod schema 校验时分支不一致。建议统一为 `null`。
- **`loadRemotionCatalog` 的三段候选路径**：符合 L-015 但仍然写死 `.gemini/antigravity/skills`。建议抽进 project-paths 的 getSkillsBase()。
- **`downloadImageToLocal` 的 http://localhost:3005 硬编码**：`server/director.ts:1713`。如果后续服务换端口，这里悄悄挂。建议引用 `process.env.PORT` 或从 request origin 反推。
- **`chat-action-execute` 里 `backupDeliveryStore(projectRoot)` 是好设计**：但是只备份一份（最后一次写前的 snapshot），没有环形 buffer。plan Stage 2 做 SSOT 时可以考虑把这个升级为"最近 N 次 snapshot"。

---

## 结束语

本次审计找到 **6 条 Critical / 7 条 High / 6 条 Medium / 5 条 Low**，覆盖 plan 之外的安全攻击面。最紧迫的是 **C1 + C2 + C4 + C5 + C6** 这条"路径穿越 + 无授权 socket + 对外开放网络 + key 泄漏 + env 注入"组合链 —— 任何同一 LAN 的设备或同 WiFi 的浏览器页面都可以通过这条链完成从读任意文件到污染 delivery_store 到偷 Gemini key 的全流程攻击。

**强烈建议**：把这 6 条 Critical 从 plan 的 Stage 4 / Stage 5 中摘出来，作为 **PR1 之前的 Security Hotfix PR（PR0）**，优先于 Stage 1 视觉路由收口。理由：Stage 1 的"接通视觉路由"本身不提高安全水位，但会让更多代码路径承载用户输入；在未修好这 6 条的情况下 merge Stage 1 只会放大攻击面。
