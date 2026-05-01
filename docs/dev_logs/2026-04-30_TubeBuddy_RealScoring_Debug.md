# 2026-04-30 — TubeBuddy 真实评分链路调试日志

## 一句话结论

本窗口主要修 MarketingMaster Phase 1 的两个问题：候选关键词生成闪退、TubeBuddy 评分“秒出假分”。候选关键词生成已修复；假评分已移除；当前真实评分链路会在 TubeBuddy Studio 扩展未授权时明确报错，不再伪造分数。剩余阻塞是 TubeBuddy 在 YouTube Studio 顶部仍显示 `Sign in to TubeBuddy`，需要完成 Studio content script 侧授权后才能继续读取真实 Keyword Explorer 分数。

## 用户反馈与问题现象

1. 用户点击 `分析脚本，生成候选关键词` 后，页面短暂出现“正在筛选中”，几秒后回到原画面。
2. 用户进入 `1.2 TubeBuddy 评分` 后，评分表“秒出”，用户判断这肯定是假数据。
3. 用户询问是否需要 TubeBuddy 登录，并配合在自动化窗口中登录/打开 YouTube 和 TubeBuddy Keyword Explorer。
4. 用户明确要求：修 bug 不需要继续请示。
5. 多次上下文压缩/中断后，用户要求继续，并提醒应保存开发进度。

## 关键判断

1. `候选关键词生成闪退` 是后端 LLM 返回解析问题，不是 UI 点击问题。
2. `TubeBuddy 评分秒出` 是历史 mock/fallback 评分造成的产品假象，必须移除。
3. TubeBuddy account 页可登录，不等于 YouTube Studio 里的 TubeBuddy content script 已授权。
4. YouTube Studio 页面顶部出现 `Sign in to TubeBuddy` 时，必须判定 TubeBuddy 未授权，即使 DOM 中已有菜单和工具项。
5. TubeBuddy 的核心函数运行在 Chrome extension isolated world，普通 `page.evaluate()` 看不到 `TubeBuddyKeywordExplorer.Show`。
6. 通过 CDP 可以找到扩展执行上下文，但当前调用 `TubeBuddyKeywordExplorer.Show(...)` 后弹窗仍未可见，推测被授权态/资料加载前置条件挡住。

## 修改范围

### `.gitignore`

- 新增忽略：
  - `.claude/skills`
  - `.agents/`

### `.agent/config/llm_config.json`

- 本地配置变化由用户明确允许，保留，不在本轮回滚。

### `package.json` / `package-lock.json`

- 新增依赖：
  - `playwright`
- 原因：TubeBuddy 真实评分需要本地浏览器自动化，不允许继续走 mock。

### `server/market.ts`

主要变化：

1. 修复 LLM 调用结果读取：
   - 使用 `llmResult.content`
   - 避免返回对象被当成字符串，导致候选关键词 JSON 解析失败
2. 保留/增加 TubeBuddy 调试接口：
   - `GET /api/market/v3/tubebuddy-debug`
   - `GET /api/market/v3/tubebuddy-screenshot`
   - `POST /api/market/v3/tubebuddy-start-auth`
   - `POST /api/market/v3/tubebuddy-open-keyword-explorer`
3. `score-candidates` / `score-single` 遇到 `session_expired` 时通过 SSE 明确返回，不继续伪造结果。

### `server/workers/tubebuddy-worker.ts`

这是本轮核心修改文件。

完成内容：

1. 新增 TubeBuddy 扩展路径探测：
   - 自动扫描 Chrome profile 的 Extensions 目录
   - 当前识别到：
     `/Users/luzhoua/Library/Application Support/Google/Chrome/Default/Extensions/mhkhmbddkmdggbhaaaodilponhnccicb/2002_0`
2. 使用 Playwright persistent profile：
   - `/Users/luzhoua/.tubebuddy-chrome-profile`
3. 启动 Chromium 时加载 TubeBuddy 扩展：
   - `--disable-extensions-except=<extensionPath>`
   - `--load-extension=<extensionPath>`
4. 增加初始化 mutex：
   - 避免并发请求重复初始化 Playwright/Chrome profile
5. 移除 fake/mock fallback：
   - Playwright 不可用抛 `tubebuddy_unavailable`
   - selector 不存在抛 `selector_not_found`
   - TubeBuddy 未授权抛 `session_expired`
6. 修正登录判断：
   - 不能因为 `.tb-main-portal-container` 或菜单 DOM 存在就判定已登录
   - 只要 `#tb-pop-out-token-error-id` 可见，就判定 Studio 侧未授权
7. 修正授权入口：
   - 精确点击 `#tb-pop-out-token-error-id`
   - 不再误点隐藏菜单的大块外层容器
8. 尝试打开 Keyword Explorer 的多条路径：
   - TubeBuddy account 页 `appToExt`
   - TubeBuddy account 页 `lifeCycleDeepLink`
   - Studio 顶部菜单可见点击
   - DOM 入口 `a.tb-menu-extension-open[data-action="QuickLinksMenu_TagExplorer"]`
   - CDP extension isolated world 调用 `TubeBuddyKeywordExplorer.Show(...)`
9. 真实 DOM selector 更新：
   - 输入框：`#tb-keyword-explorer-input`
   - 探索按钮：`#tb-keyword-explorer-explore`
   - 总分：`#tb-keyword-explorer-total-score`
   - 搜索量：`#tb-keyword-explorer-search-volume`
   - 竞争度：`#tb-tag-weighted-competition` / `#tb-keyword-explorer-unweighted-competition`
   - 优化度：`.tb-keyword-explorer-keyword-count`
10. 增加 chart fallback 读取：
    - 从 TubeBuddy bar chart CSS 变量中估算 0-100 分值
11. 增加 debug snapshot：
    - inputs
    - buttons
    - tubeBuddyElements
    - bodyText

重要观察：

- `TubeBuddyAppToExt.js` 中 `lifeCycleDeepLink` 会检查 source origin。
- 从普通页面发 `lifeCycleDeepLink` 时，会因为不是可信来源而不生效。
- `appToExt` 的 tool 名必须是 `Keyword Explorer`，不是小写 `keywordexplorer`。
- `tubebuddymastervue.js` 中存在 AppToExtension 模块，会从 `LifeCycleDeepLinkData` 打开工具。
- 源码中真实打开入口为：
  - `TubeBuddyMenu.ShowBackgroundSticky()`
  - `TubeBuddyKeywordExplorer.Show(...)`
- 但这些函数位于 Chrome 扩展 isolated world，主页面 JS context 不可直接访问。

### `src/components/market/KeywordScoreTable.tsx`

完成内容：

1. 评分字段从旧结构读取改成 flat 结构：
   - `score.overall`
   - `score.searchVolume`
   - `score.competition`
   - `score.optimization`
   - `score.relevance`
2. 修复之前 UI 上只有综合分，其他字段显示 `—` 的问题。

### `src/components/market/MarketPhase1New.tsx`

完成内容：

1. 新增 `session_expired` SSE 处理。
2. TubeBuddy 未授权时：
   - 正在评分/待评分的 variant 标成 `error`
   - 显示后端返回的授权提示
   - 不再进入 `handleAnalyzeKeywords`
3. `score-single` 重试和手动新增关键词评分也处理 `session_expired` / `error`。
4. 修复用户看到“正在评分闪一下，然后像完成了”的误导体验。

### `src/types.ts`

完成内容：

1. `TubeBuddyScore.relevance` 改为可选字段。
2. 原因：TubeBuddy Keyword Explorer 当前页面没有独立“相关度”字段，继续强行填数会制造假数据。

## 已执行验证

### 类型检查

命令：

```bash
npx tsc --noEmit
```

结果：通过。

### 前后端启动

命令：

```bash
npm run dev
```

结果：

- Vite: `http://localhost:5174/`
- Express: `http://0.0.0.0:3002`

### TubeBuddy debug

调用过：

```bash
curl -s http://localhost:3002/api/market/v3/tubebuddy-debug
curl -s http://localhost:3002/api/market/v3/tubebuddy-screenshot --output /private/tmp/tubebuddy-debug.jpg
```

观察：

- YouTube Studio 已登录 MindHikers 频道
- TubeBuddy 菜单 DOM 已注入
- 顶部仍显示 `Sign in to TubeBuddy`
- `#tb-pop-out-token-error-id` 可见时必须判定未授权

### TubeBuddy start auth

调用过：

```bash
curl -s -X POST http://localhost:3002/api/market/v3/tubebuddy-start-auth
```

有效结果：

- 精确点击顶部 Studio TubeBuddy sign-in prompt 后，可跳转：
  - before: `https://studio.youtube.com/channel/UCksvtTC-xQ-Mg6oMbEnZOiA`
  - after: `https://www.tubebuddy.com/account?from-ext=true`

注意：

- 旧 fallback 曾误点隐藏菜单大容器，已收紧。

### TubeBuddy open Keyword Explorer

调用过：

```bash
curl -s -X POST http://localhost:3002/api/market/v3/tubebuddy-open-keyword-explorer
```

观察：

- 普通 deep link 未确认：
  - `Keyword Explorer deep link did not confirm: undefined`
- CDP 已找到扩展 world：
  - `Opened Keyword Explorer from extension world`
  - origin: `chrome-extension://mhkhmbddkmdggbhaaaodilponhnccicb`
- 但弹窗仍未可见。

当前判断：

- 不是找不到函数。
- 更像是 Studio 扩展态仍未完成 TubeBuddy 授权，导致 `Show(...)` 内部直接不展示或被挡住。

### 真实评分请求

命令：

```bash
curl -s -N -X POST http://localhost:3002/api/market/v3/score-candidates \
  -H 'Content-Type: application/json' \
  --data '{"candidates":[{"id":"debug-1","keyword":"黄金精神","variants":[{"text":"黄金精神","script":"simplified","status":"pending"}],"source":"user","isGolden":false}]}'
```

结果：

```text
data: {"type":"scoring","keywordId":"debug-1","variantScript":"simplified"}
data: {"type":"session_expired","message":"TubeBuddy 扩展需要授权：请在自动化窗口完成 TubeBuddy 登录/授权后重试评分"}
```

这个结果是正确的：未授权时必须失败，不能返回假分。

## 当前未解决问题

## 18:40 补充：授权链路第一性原理定位

新的 debug 证据把卡点从“页面没点对”收敛到了“扩展授权 token 没写入”。

TubeBuddy 真实评分链路拆成四层：

1. YouTube 登录：自动化 Chrome 已登录 MindHikers 频道。
2. TubeBuddy account cookie：`www.tubebuddy.com/account?from-ext=true` 可进入账号页，并能看到 license。
3. TubeBuddy 扩展 storage token：当前缺少 `tubebuddyToken-UCksvtTC-xQ-Mg6oMbEnZOiA`。
4. Studio 扩展运行态：`TBGlobal.Profile()` 需要 token 后才能加载。

当前 `GET /api/market/v3/tubebuddy-debug` 里已经能看到 Studio 扩展上下文：

```text
TBGlobal.CurrentChannelId() = UCksvtTC-xQ-Mg6oMbEnZOiA
TBGlobal.GetToken()        = absent
TBGlobal.Profile()         = null
TBGlobal.IsAuthenticated() = false
```

这说明：

- `TubeBuddyMenu` / `TubeBuddyKeywordExplorer` 函数存在，不是函数找不到。
- 当前频道识别成功，不是 YouTube channel id 问题。
- 真正缺的是 TubeBuddy 写入扩展 storage 的 token/profile。
- `TubeBuddyTokenWriter.js` 的官方路径是 `/redirect?t=...&c=...&r=...`，它会写入 `tubebuddyToken-${channelId}`。

本轮新增/修正：

1. `tubebuddy-debug` 现在输出 `extensionState`：
   - `syncKeys`
   - `localKeys`
   - sanitized `sync/local`
   - Studio `TBGlobal` 摘要
   - CDP 候选上下文摘要
2. CDP context 读取改为容错：
   - iframe context 销毁时跳过
   - 优先选择 Studio 顶层扩展上下文
3. `openKeywordExplorerForDebug` 不再在弹窗未打开时返回假成功。
4. 登录判断不再把 YouTube avatar 或普通账号页 cookie 当成 Studio 授权。
5. `startAuthorization()` 现在能返回 `needsUserAction: true`。
6. `score-candidates` 在停留于 TubeBuddy signin/Google 授权页时会快速返回 `session_expired`，不再等 Keyword Explorer 打开链路超时。

当前授权入口状态：

```text
POST /api/market/v3/tubebuddy-start-auth
afterUrl: https://www.tubebuddy.com/signin?ReturnUrl=%2Faccount%3Ffrom-ext%3Dtrue
needsUserAction: true
unchecked: privacyCheckbox, termsCheckbox
```

这一步需要用户在可见自动化 Chrome 里亲自勾选 Privacy Policy / Terms of Use，并完成 TubeBuddy/Google 授权。这里不要由代码代替用户同意条款。

### P0：TubeBuddy Studio 扩展授权未完成

现象：

- TubeBuddy account 页面看起来可用，但 Studio `TBGlobal.GetToken()` 为空
- YouTube Studio 页面仍会显示 `Sign in to TubeBuddy`
- 调用 Keyword Explorer show 函数后弹窗不出现或无法进入真实 scoring UI

下一步：

1. 用户在自动化 Chrome 中勾选 TubeBuddy Privacy Policy / Terms of Use。
2. 用户继续完成 TubeBuddy/Google 授权。
3. 授权后刷新/重新进入 Studio。
4. 再跑 `tubebuddy-debug`，确认：
   - `syncKeys` 出现 `tubebuddyToken-UCksvtTC-xQ-Mg6oMbEnZOiA`
   - `TBGlobal.Profile()` 不再为 `null`
   - `TBGlobal.IsAuthenticated()` 为 `true`
5. 再跑 `tubebuddy-open-keyword-explorer`。

### P1：真实分数字段读取待最终验证

代码已按源码和 HTML 模板补 selector，但还没在真实弹窗出现后完成端到端读取。

待验证字段：

- overall: `#tb-keyword-explorer-total-score`
- searchVolume: `#tb-keyword-explorer-search-volume` 或 chart fallback
- competition: `#tb-tag-weighted-competition` / chart fallback
- optimization: `.tb-keyword-explorer-keyword-count` / chart fallback
- relevance: 当前应缺省，不造假

## 19:10 补充：按真实使用路径改为 Studio-first

用户明确纠正：日常不是先登录 TubeBuddy 网站再打开工具，而是已登录 YouTube Studio 后，从 Studio 内的 TubeBuddy 侧边/快捷入口进入 `Keyword Explorer`。

新的第一性原理判断：

1. YouTube Studio 是工作入口。
2. TubeBuddy account 页只能证明账号 cookie/license，不是关键词检索入口。
3. 关键词检索应优先复刻真实使用路径：Studio 页面 → TubeBuddy 扩展菜单/快捷入口 → `Keyword Explorer`。
4. 只有当 Studio 内入口提示未授权、或 `TBGlobal.IsAuthenticated()` 为 `false` 时，才进入授权流程。

本轮补丁：

1. `openKeywordExplorer()` 不再第一步跳转 `https://www.tubebuddy.com/account?from-ext=true`。
2. 新增 Studio-first 打开顺序：
   - 定位/打开 `studio.youtube.com`
   - 等待 TubeBuddy Studio 外壳注入
   - 先尝试 extension isolated world 的 `TubeBuddyKeywordExplorer.Show(...)`
   - 再尝试点击 Studio 内可见的 `Keyword Explorer` 快捷入口
   - 入口仍不可用时才返回授权错误
3. 收紧 `isTubeBuddySignedOutPromptVisible()`：
   - 不再只靠 `bodyText` 判断
   - 只把可见的 `Sign in to TubeBuddy` / `Sign in with YouTube` / token error 当作未授权
   - 避免隐藏模板误判
4. `TBGlobalOpenToolBox` 触发路径现在会等待真实弹窗是否出现，不再直接当失败忽略。

复测结果：

```bash
npx tsc --noEmit
```

通过。

```bash
curl --max-time 45 -s -X POST http://localhost:3002/api/market/v3/tubebuddy-open-keyword-explorer \
  -H 'Content-Type: application/json' \
  --data '{"keyword":"黄金精神"}'
```

返回：

```json
{"error":"TubeBuddy 扩展需要授权：请在自动化窗口完成 TubeBuddy 登录/授权后重试评分","type":"session_expired"}
```

这个失败是预期失败：当前自动化 profile 仍缺少 `tubebuddyToken-UCksvtTC-xQ-Mg6oMbEnZOiA`，但页面已经保持在 `https://studio.youtube.com/channel/UCksvtTC-xQ-Mg6oMbEnZOiA`，没有再把主流程拉回 TubeBuddy account 页。

## 19:22 补充：3 个正式评分样本耗时

用户要求不等运营账号，先跑 3 个正式评分样本看耗时。

批量接口：

```bash
curl --max-time 90 -s -N -w '\nTOTAL_TIME:%{time_total}\n' \
  -X POST http://localhost:3002/api/market/v3/score-candidates \
  -H 'Content-Type: application/json' \
  --data '{"candidates":[...3 items...]}'
```

结果：

```text
data: {"type":"scoring","keywordId":"formal-1","variantScript":"simplified"}
data: {"type":"session_expired","message":"TubeBuddy 扩展需要授权：请在自动化窗口完成 TubeBuddy 登录/授权后重试评分"}
TOTAL_TIME:0.043095
```

说明：`score-candidates` 遇到第一个 `session_expired` 会按设计中断整批，避免后续关键词继续空跑。

单项接口逐个跑 3 个：

| keyword | result | total time |
|---|---|---:|
| 黄金精神 | `session_expired` | 0.009024s |
| AI教育 | `session_expired` | 0.012328s |
| 扩展心灵论 | `session_expired` | 0.008468s |

结论：当前耗时瓶颈不是关键词数量，而是扩展授权门槛；真实 TubeBuddy Keyword Explorer 评分页面尚未进入，因此没有真实分数产生，也没有假分数产生。

## 19:36 补充：正式评分链路跑通

用户在自动化 Chrome 中完成 Studio 内 TubeBuddy 授权，并指出真实入口是右上角青色 TubeBuddy 按钮展开后的 `Keyword Explorer`。

修正与验证：

1. `openKeywordExplorer()` 改为优先按真实人类路径点击：
   - 点击 Studio 顶栏青色 TubeBuddy 按钮
   - 点击可见菜单项 `Keyword Explorer`
   - 只有入口打不开时才检查授权
2. `checkIsLoggedIn()` 优先认可：
   - Keyword Explorer 弹窗已打开
   - `TBGlobal.IsAuthenticated() === true`
   - `tubebuddyToken-<channelId>` 存在
3. 修复 `46/100` 解析 bug：
   - 旧逻辑把 `46/100` 合并成 `46100`，导致 overall 被误判为空
   - 新逻辑优先按 `(\d+)/100` 读取分数

单词验证：

```text
黄金精神 -> scored
score: {"overall":58,"searchVolume":33,"competition":0,"optimization":0}
TOTAL_TIME:29.007515s
```

3 个正式样本批量验证：

```text
黄金精神   overall=58 searchVolume=33 competition=0 optimization=0 duration=5.764s
AI教育     overall=29 searchVolume=46 competition=0 optimization=0 duration=4.383s
扩展心灵论 overall=46 searchVolume=1  competition=0 optimization=0 duration=4.829s
TOTAL_TIME:14.978046s
```

当前结论：

- 真实 TubeBuddy Keyword Explorer 主评分链路已经打通。
- 不再返回 mock/fake score。
- 后端能批量跑 3 个正式样本。
- 副指标 `competition/optimization` 当前读成 0，原因是 TubeBuddy UI 主要展示 `Excellent/Poor/Good` 等等级和图表，后续需要单独校准图表/等级转数值策略，避免把等级硬映射成假精度。

## 下个窗口接手建议

1. 先读：
   - `AGENTS.md`
   - `docs/dev_logs/HANDOFF.md`
   - 本文件
   - `docs/04_progress/rules.md`
2. 确认服务：

```bash
lsof -nP -i :3002 -i :5174
```

3. 如果服务不在：

```bash
npm run dev
```

4. 确认类型：

```bash
npx tsc --noEmit
```

5. 检查 TubeBuddy 状态：

```bash
curl -s http://localhost:3002/api/market/v3/tubebuddy-debug
```

6. 如果仍看到 `Sign in to TubeBuddy`，或 debug 里 `TBGlobal.IsAuthenticated()` 为 `false`：

```bash
curl -s -X POST http://localhost:3002/api/market/v3/tubebuddy-start-auth
```

然后让用户在自动化窗口完成授权。当前已知可能停在：

```text
https://www.tubebuddy.com/signin?ReturnUrl=%2Faccount%3Ffrom-ext%3Dtrue
```

如果返回 `needsUserAction: true`，不要自动勾选条款，让用户确认。

7. 授权完成后：

```bash
curl -s -X POST http://localhost:3002/api/market/v3/tubebuddy-open-keyword-explorer
```

8. 最后跑真实评分：

```bash
curl -s -N -X POST http://localhost:3002/api/market/v3/score-candidates \
  -H 'Content-Type: application/json' \
  --data '{"candidates":[{"id":"debug-1","keyword":"黄金精神","variants":[{"text":"黄金精神","script":"simplified","status":"pending"}],"source":"user","isGolden":false}]}'
```

## 分支与提交建议

当前分支：`MHSDC-DC-MKT`

不建议现在提交，原因：

- TubeBuddy 真实评分链路还没端到端完成
- 但已经达到一个安全中间态：不再假评分

后续提交建议拆分：

1. `fix market candidate generation and scoring error handling`
   - `server/market.ts`
   - `src/components/market/MarketPhase1New.tsx`
   - `src/components/market/KeywordScoreTable.tsx`
   - `src/types.ts`
2. `integrate real tubebuddy playwright worker`
   - `server/workers/tubebuddy-worker.ts`
   - `package.json`
   - `package-lock.json`
3. 文档/治理提交：
   - `docs/dev_logs/HANDOFF.md`
   - `docs/dev_logs/2026-04-30_TubeBuddy_RealScoring_Debug.md`
   - `.gitignore`

注意：`.agent/config/llm_config.json` 是用户允许的本地配置变化，提交前需要单独确认是否纳入。

## 2026-04-30 19:52 保存点

用户确认：

- `黄金精神` 的真实分数已经在 TubeBuddy Keyword Explorer 中看到
- Studio 顶栏右上角青色 TubeBuddy 按钮 → `Keyword Explorer` 是日常使用入口
- 当前 3 个样本约 15 秒，约 5 秒/关键词，可以接受继续跑 10 个

当前保存状态：

- 已经不是授权问题；不要再重复把用户带去 `www.tubebuddy.com/account`
- 最小授权链路应保持为 YouTube Studio 内 TubeBuddy 扩展登录态
- 主分 `overall` 已跑通
- `competition/optimization` 暂时不能当作可信数值，下一步先校准图表/等级 DOM
- 下个窗口优先从 `docs/dev_logs/HANDOFF.md` 的 `19:52 保存点` 接手

## 20:43 补充：副指标图表读取修复

用户提醒：如果找不到 `Keyword Explorer` 入口必须明确告诉用户。再次确认本轮入口不是卡点，正确入口仍是：

```text
YouTube Studio 右上角青色 TubeBuddy 按钮 → Keyword Explorer
```

本轮发现副指标读成 `0` 的根因：

1. TubeBuddy 的 `competition/optimization` 页面主显示是等级文字：
   - `Poor`
   - `Fair`
   - `Good`
   - `Very Good`
   - `Excellent`
2. 真实数值不是直接写在文字里，而是写入条形图 DOM 的 CSS 变量：
   - `--kweBarBackground: linear-gradient(... 90% ...)`
3. worker 里的图表解析正则在 `page.evaluate()` 函数字面量里过度转义，导致匹配不到 `%` 数字。
4. 旧逻辑在没有匹配任何 segment 时仍把 total=0 当成真值返回，于是 UI 显示 `0`。

修复内容：

1. `extractScoreFromChart()` 改为正确匹配 `(-?\d+(?:\.\d+)?)%`。
2. 若没有任何 segment 匹配，返回 `null`，不再把缺省伪装成 0。
3. `competition/optimization` 改为优先读图表，不从等级文字硬映射数值。
4. 新增等级读取：
   - `searchVolumeLabel`
   - `competitionLabel`
   - `optimizationLabel`
5. 类型调整：
   - `TubeBuddyScore.competition?`
   - `TubeBuddyScore.optimization?`
   - `TubeBuddyScore.relevance?`
6. 前端表格调整：
   - `竞争度` → `竞争机会`
   - `优化度` → `优化机会`
   - 有图表值显示 `数值 + 等级`
   - 缺省显示 `待校准`
7. debug snapshot 新增 `keywordExplorerMetrics`，后续 DOM 变更时可直接看 label 和 chart CSS。

复测结果：

```text
黄金精神
overall=58
searchVolume=33 (Fair)
competition=57 (Good)
optimization=100 (Excellent)
```

3 个正式样本：

```text
黄金精神   overall=58 searchVolume=33 competition=57  optimization=100 duration=4.725s
AI教育     overall=29 searchVolume=46 competition=23  optimization=100 duration=7.247s
扩展心灵论 overall=46 searchVolume=1  competition=100 optimization=100 duration=5.786s
TOTAL_TIME=17.760629s
```

UI 验证：

- 使用 agent-browser 打开 `http://localhost:5174/`
- 进入 `营销大师`
- 用浏览器内存态回放评分数据，不写项目文件
- 表格验证通过：
  - 表头显示 `竞争机会/优化机会`
  - 有数值时显示 `57 Good` / `100 Excellent`
  - 缺省副指标显示 `待校准`

验证命令：

```bash
npx tsc --noEmit
git diff --check
```

结果：均通过。
