🕐 Last updated: 2026-04-28 12:26 CST
🌿 Branch: `MHSDC-GC-SSE`（SSE P0/P1 收口已执行：Hooks 修复、同源代理口径、快捷键、右栏 auto-peek；下一步准备 SaaS staging 切片移植）
👤 Conductor: 老杨（OldYang）｜ Owner: 老卢（Zhou Lu）

---

# GoldenCrucible-SSE · 接手文档

> **当前状态一句话**：SSE P1 壳层主链已经完成本轮收口，P0 Hooks 运行时问题已修，同源代理验证口径已恢复，`[` / `]` 快捷键与右栏 3 秒 auto-peek 已通过浏览器验收；下一步不要继续扩 SSE，而是准备把这套壳层按切片移植到 SaaS staging。

---

## 〇、2026-04-28 SSE 收口执行结果

### 0.1 本轮已完成

1. **P0 Hooks 修复**
   - `src/SaaSApp.tsx` 中 `resolvedModule`、`activeModuleLabel`、`crucibleArtifactTabs`、`roundtableArtifactTabs` 已全部上提到路径早 return 之前。
   - 自检：第一个 `if (location.pathname === ...)` 前已经覆盖全部 hook 调用，未再出现早 return 后新增 hook。

2. **P0 同源代理口径恢复**
   - `.env.local` 已移除本地直连：
     - `VITE_API_BASE_URL=http://localhost:3009`
     - `VITE_SOCKET_URL=http://127.0.0.1:3009`
   - 注意：`.env.local` 属本地验证文件，不应进入提交。

3. **P1 快捷键**
   - `[`：折叠 / 展开左栏。
   - `]`：折叠 / 展开右栏 Artifact drawer。
   - 输入框目标触发 `[` / `]` 时不会切换左右栏。

4. **P1 右栏 auto-peek**
   - 进入 `/m/crucible` 或 `/m/roundtable` 后，右栏先展开。
   - 约 3 秒后自动折叠。
   - 用户手动触碰右栏后不再被 auto-peek 覆盖。
   - 已处理 React dev StrictMode effect replay 导致 timer 被提前清理的问题。

### 0.2 已完成验证

1. `npm run typecheck:saas` ✅
2. `npm run build` ✅
   - 仍有既有 CSS minify `file` warning 与 chunk size warning；非本轮新增阻塞。
3. agent-browser `/m/crucible` ✅
   - 中栏对话可见。
   - 右栏 Artifact Tabs 可见。
   - auto-peek 3 秒后折叠通过。
4. agent-browser `/m/roundtable` ✅
   - 圆桌页面可见。
   - 展开右栏后 4 个 Artifact Tab 均存在：`Thesis` / `SpikePack` / `Snapshot` / `Reference`。
5. agent-browser `/llm-config` ✅
   - 页面可打开。
   - 路由切换后无白屏。
6. agent-browser Console / Errors ✅
   - 未见 `Rendered more hooks than during the previous render`。
   - 未见 `[ShellErrorBoundary] Unhandled error`。
7. agent-browser Network ✅
   - `/api/...` 与 `/socket.io/...` 均走 `http://localhost:5182` 同源代理。
   - 未见本地 `localhost:3009` 直连。
   - Google Fonts 外链仍存在既有请求噪音，非本轮范围。

### 0.3 本轮仍不处理

1. Sessions 接真实接口仍未做，当前仍是 mock source。
2. Google Fonts 404 / 字体外链噪音仍未处理。
3. PRD 一期主链完整验收仍未完成。
4. SaaS staging 尚未承接本轮 Shell 变更。

### 0.4 下一步建议

下一轮如果继续推进，建议不要再扩 SSE 功能，而是进入 **SaaS staging 切片移植**：

1. 从 `MHSDC-GC-SAAS-staging` 拉独立集成分支。
2. 按计划文档切片承接：依赖/Router → tokens/primitives → Shell 原语 → ShellLayout/registry → module stages/artifacts → 本轮 P0/P1 fixes。
3. 每片都跑 `npm run typecheck:saas`、`npm run build` 与 agent-browser smoke。
4. Roundtable 在 SaaS production 是否露出入口，需老卢最后拍板。

---

## 一、本轮最重要结论

### 1.1 现在到底完成到了哪一层

这条线当前完成的是：

1. **P1 主骨架已经落地**
   - 左栏 `Sessions`
   - 中栏主对话 `ConversationStream`
   - 右栏 `Artifact 4 Tab`
   - 滚动链收口
   - 左栏可折叠
   - 右栏可拖拽宽度

2. **代码级验证已绿**
   - `npm run typecheck:saas` ✅
   - `npm run build` ✅

3. **人工视觉反馈已明显转正**
   - 老卢反馈：“好多了”
   - 老卢反馈：“基本可以了”

但还**没有**完成的是：

1. **浏览器级自动验收**
2. **PRD 一期主链逐项复核**
3. **Sessions 真实接口接线**
4. **若干壳层交互细节收口**

### 1.2 本轮新增的重要判断

本轮不是继续写代码，而是重新读了一遍 PRD 和当前实施计划，确认一个关键事实：

> 现在不能只把这件事当成“UI 微调”来接，而必须把它放回 **PRD 一期验收主链** 里看。

也就是说，下个窗口继续干活时，脑子里要同时有两层口径：

1. **局部任务口径**
   - P1 还剩壳层细修和浏览器验收

2. **产品验收口径**
   - 一期真正要交付的是：`登录 / workspace 隔离 / 单人对谈 / 历史与导出 / ThesisWriter / trial & BYOK / staging + production smoke`

结论：

> 当前真正完成的是“一期里的壳层主链收口”，**不是**“一期已经整体验收完”。

---

## 二、PRD 视角下的当前定位

### 2.1 PRD 的主目标是什么

根据 [PRD](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md)，一期的交付主体是：

1. 多账号轻量 SaaS
2. personal workspace 自动创建与隔离
3. 单人深度对谈主链
4. 历史与导出
5. ThesisWriter 论文生成
6. trial 与 BYOK 一期口径
7. staging 与 production 至少各一条 smoke

### 2.2 什么不是一期阻塞项

PRD 讲得很清楚：

1. `Roundtable` **不是一期验收阻塞项**
2. 轻协作不纳入一期验收
3. 其他工作台（Director / Shorts / Marketing / Distribution）不纳入一期验收
4. 正式付费计费系统不纳入一期验收

### 2.3 这对下一窗口意味着什么

下一窗口不要被这几个误区带偏：

1. **不要把 Roundtable 的完成度当成 SaaS 一期是否可验收的核心判断**
2. **不要把左栏出现了 Sessions，就误报成“历史能力已经完成”**
3. **不要把“老卢看着基本可以了”当成自动化验收已经完成**
4. **不要把 P1 主骨架落地，误判成 PRD 一期基本完成**

---

## 三、P1 当前代码现场

### 3.1 已完成的结构性结果

#### 中栏

1. `Crucible` 主对话已回到中栏
2. `Roundtable` 已接入统一 `ConversationStream`
3. `ChatPanel` 不再占用右栏主位置

#### 右栏

1. `ArtifactTabs` 已落地
2. Tab 结构为：
   - `Thesis`
   - `SpikePack`
   - `Snapshot`
   - `Reference`
3. `Crucible` 与 `Roundtable` 都能向右栏回传 artifact 状态
4. 右栏支持：
   - 拖拽宽度
   - 双击恢复默认宽度
   - localStorage 记忆

#### 左栏

1. `Sessions` 列表已接上
2. 当前仍是 **mock source**
3. 左栏已支持折叠/展开
4. 折叠后只保留模块图标，整体更接近 Codex

#### 壳层与滚动

1. 整页一起滚的问题已收口
2. 高度链已补齐到 `html / body / #root`
3. `body` 已改 `overflow: hidden`
4. shell 内部滚动职责已收紧
5. 中栏两侧大留白已明显压缩

### 3.2 关键实现文件

#### 主链

- `src/SaaSApp.tsx`
- `src/modules/crucible/CrucibleStage.tsx`
- `src/modules/roundtable/RoundtableStage.tsx`
- `src/components/crucible/CrucibleWorkspaceView.tsx`

#### 壳层

- `src/shell/ShellLayout.tsx`
- `src/shell/ShellLayout.module.css`
- `src/shell/primitives/ConversationStream.tsx`
- `src/shell/primitives/Stage.module.css`
- `src/shell/primitives/ArtifactDrawer.tsx`
- `src/shell/primitives/ArtifactDrawer.module.css`
- `src/shell/primitives/ModuleTab.tsx`
- `src/shell/primitives/ModuleTab.module.css`

#### 新增视图

- `src/shell/artifacts/ArtifactTabs.tsx`
- `src/shell/artifacts/types.ts`
- `src/shell/sessions/SessionList.tsx`
- `src/modules/crucible/manifest.tsx`
- `src/modules/roundtable/manifest.tsx`
- `src/modules/types.ts`

#### 留白与交互收口

- `src/index.css`
- `src/components/ChatPanel.tsx`
- `src/styles/tokens.css`

### 3.3 当前默认宽度口径

在 `src/styles/tokens.css` 中，当前口径是：

1. 左栏：`288px`
2. 左栏折叠：`64px`
3. 右栏：`336px`
4. 右栏折叠：`48px`

---

## 四、这轮补强交接时重新确认过的文档

本轮为了防止下个窗口走偏，重新核对过以下文档：

1. [PRD](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-11_GoldenCrucible_SaaS_PRD.md)
2. [P1 实施计划](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/plans/2026-04-21-001-P1-view-responsibility-alignment-plan.md)
3. [开发进展](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/04_progress/dev_progress.md)
4. [2026-04-22 开发日志](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/dev_logs/2026-04-22.md)
5. [工程规则](/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/04_progress/rules.md)

当前判断是：

> 下个窗口最稳的路线不是继续扩读，而是 **带着 PRD 边界，直接在现有壳层上做小步收口**。

---

## 五、当前验证状态

### 5.1 已通过的验证

1. `npm run typecheck:saas` ✅
2. `npm run build` ✅

说明：

1. 目前看到的 CSS minify `file` 属性 warning 属于既有噪音
2. chunk size warning 也不是本轮新增阻塞

### 5.2 明确还没打通的验证

#### 浏览器级自动验收未完成

当前必须诚实口径，不要写成“已完成”。

已知情况：

1. `agent-browser` 前一轮多次卡住，不稳定
2. 转尝试 `playwright` 时：
   - 先遇到旧 Chrome lock
   - 清 lock 后又遇到 `ENOENT: no such file or directory, mkdir '/.playwright-mcp'`
   - 再尝试补目录时，根目录写权限受限

当前结论：

1. **代码级验证已绿**
2. **浏览器自动验收未绿**
3. **UI 当前更多依赖老卢人工视觉反馈**

### 5.3 按 PRD 反推，仍需补齐的验收视角

下个窗口不能只看页面顺不顺眼，还要问自己这些问题有没有真实证据：

1. 登录链是否仍稳定进入主对话页
2. personal workspace 是否自动创建且隔离未破
3. 新建对话后能否至少连续完成 3 轮有效问答
4. 刷新后 active conversation 是否能恢复并继续 1 轮
5. 历史列表是否只是 mock 展示，还是已和真实 conversation/source 对齐
6. `bundle-json` 与 `markdown` 导出是否仍可用
7. ThesisWriter 收敛提示、生成、保存 artifacts、导出链路是否仍通
8. trial 2 次限制与 BYOK 切换是否仍通
9. staging 与 production 是否至少各有一条 smoke 证据

---

## 六、当前未完成项

### 6.1 P1 壳层收口未完成项

1. **左栏继续向 Codex 靠拢**
   - 折叠按钮图标与位置是否还需再调
   - 展开态标题、间距、分组密度是否还能更紧
   - 折叠态 hover / active 手感是否还需继续修

2. **右栏继续向 Codex 靠拢**
   - 默认宽度是否还应再收一点
   - 拖拽手柄视觉是否还可更轻
   - 折叠/展开图标是否还要更统一

3. **中栏体验继续收口**
   - 还需再看消息列边距是否已经足够贴边
   - 需再次确认三栏之间是否还有不自然留白

### 6.2 功能与验收未完成项

1. `Sessions` 当前仍是 mock，尚未接真实接口
2. `[` / `]` 快捷键未确认已实现
3. Drawer 首秒 auto-peek 3 秒后折叠，本轮未做
4. 浏览器级自动验收未完成
5. PRD 一期主链仍缺少逐项复核证据

---

## 七、下一窗口推荐执行顺序

### 7.1 正确顺序

建议下个窗口按下面顺序推进，不要乱序：

1. **先读本文件**
2. `git branch --show-current`
3. `git status --short`
4. 打开 `http://localhost:5182/m/crucible`
5. 先做一轮真实页面复看，列出还剩哪些视觉差异
6. 只做壳层 spacing / icon / 折叠态 / 手柄视觉小步微调
7. 补一次可信浏览器验收
8. 再决定是否推进真实 `Sessions` 接口
9. 最后把结果回写 `HANDOFF` 与当日日志

### 7.2 不推荐的顺序

下个窗口不要这样做：

1. 一上来重构 `CrucibleWorkspace`
2. 一上来扩做 Roundtable 深层功能
3. 一上来把 mock sessions 改成真接口，同时顺手重修 UI
4. 在未补浏览器验收前，就直接把视觉问题报成已收口

---

## 八、工作树与边界提醒

### 8.1 当前工作树状态

当前工作树是脏的，而且不是只有本轮 P1 改动。

从 `git status --short` 看，至少包括：

1. P1 相关代码改动
2. 若干文档变更
3. 既有历史残留
4. `.playwright-mcp/`、`tmp/` 等噪音目录

### 8.2 明确不要误碰的范围

1. `.claude/launch.json` 当前有改动，但不是本轮允许触碰范围
2. `.playwright-mcp/` 与 `tmp/` 继续视为提交噪音
3. `5182 / 3009` 为现有开发端口，**禁止 kill**
4. 这轮没有 commit / push

### 8.3 文档边界提醒

1. `docs/04_progress/dev_progress.md` 当前工作树中也有改动
2. 本轮交接只强化 `HANDOFF` 与今日日志，不替其他未确认文档代做收口
3. 下个窗口如果要更新 `dev_progress.md`，必须基于真实里程碑，而不是把“交接理解”写成“功能完成”

---

## 九、下个窗口第一拍检查清单

- [ ] 读 `docs/dev_logs/HANDOFF.md`
- [ ] `git branch --show-current` 确认仍在 `MHSDC-GC-SSE`
- [ ] `git status --short` 确认工作树边界
- [ ] 打开 `http://localhost:5182/m/crucible`
- [ ] 先判断 left rail / right drawer 还差哪些 Codex 感细节
- [ ] 优先尝试 `agent-browser` 做页面验收
- [ ] 若 `agent-browser` 仍不稳定，再处理 `playwright` 的 `/.playwright-mcp` 环境问题
- [ ] 不把浏览器未打通的页面，误写成“已自动化验收”
- [ ] 若要推进功能，不要同时把 `Sessions` 真接口与壳层细修绑在同一拍里

---

## 十、最简短的接手结论

如果下个窗口只记一句话，就记这句：

> **P1 主骨架已完成，下一步不是重构，而是带着 PRD 一期边界，先把 Codex 风格细修和浏览器级验收补齐，再决定是否推进真实 Sessions 接口。**

---

*本文件由老杨（OldYang）于 2026-04-23 09:08 CST 覆盖更新。*
