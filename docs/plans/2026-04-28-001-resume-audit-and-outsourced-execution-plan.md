# 2026-04-28 复工评估 · CE 方案 + 外包执行手册

> **作者**：老杨（CE / OldYang）
> **窗口**：2026-04-28
> **背景**：SSE 项目停工数日，老卢要求重新做一轮评估，由 CE 出方案，外包团队只负责执行。
> **核查方式**：本轮使用 `frontend-audit`（Vite, port 5185）+ `Backend Only (TSX Server)`（port 3009）+ Claude Preview devtools 现场核查。
> **状态**：已根据 2026-04-28 老杨二次评估修订；下一轮对话可直接按本计划从 SSE 实施开始。

---

## 〇、TL;DR（给老卢看）

1. **SSE 和 SaaS 现在不是小差距**：前端 Shell / 模块架构差距很大，后端主链差距相对可控，Git 历史和工作区卫生风险偏高。
2. **本轮 Go，但只 Go SSE 实施**：先在 SSE 修 P0 + 补 P1，完成浏览器级验收后再考虑 SaaS staging；**禁止直接整枝 merge 或静默 push SaaS**。
3. **现场有一个 P0 运行时 bug**（React Rules-of-Hooks 违例），不是 UI 收口问题，会持续刷错误并触发 `ShellErrorBoundary`。必须先修。
4. **SSE `.env.local` 把前端 API 写死到 `http://localhost:3009`**，绕开 Vite 代理。这个是本地环境问题，必须修正验证口径，但 `.env.local` 变更默认不进提交。
5. P1 视图职责归位上一轮已经落地，结构正确，**右栏在 `/m/crucible` 与 `/m/roundtable` 都能正确渲染 4 个 Artifact Tab**。
6. 之前 HANDOFF 列的 **`[ / ]` 快捷键、Drawer 首秒 auto-peek、Sessions 接真实接口** 三项中，本轮只做前两项；Sessions 接真实接口单开窗口。
7. SaaS staging 后续采用 **切片移植**：依赖/Router → Shell primitives/tokens → ShellLayout/registry → module stages/artifacts → 本轮 P0/P1 fixes。
8. 下一轮对话入口不是重新评估，而是直接执行 **Step A → Step B → Step C → Step D → SSE 验收 → 准备 SaaS 切片分支**。

---

## 一、SSE vs SaaS 差距评估（二次结论）

### 1.1 总判断

当前差距不能用“差几行代码”判断。真实情况是：

1. **SSE 是研发前线**：已经吃进 UI Architecture Phase 1、Router、Zustand、React Query、Shell primitives、模块 registry、Roundtable 入壳、Artifact 右栏等新架构。
2. **SaaS staging 是稳定验收阵地**：保留了生产验收过的 SaaS 基础能力，但前端壳层尚未追上 SSE 的新 Shell 架构。
3. **后端差距相对可控**：主要集中在 `server/index.ts` 路由抽离、`server/routes/*`、workspace middleware 等底座整理。
4. **前端差距最大**：`src/shell/*`、`src/modules/*`、`src/router.tsx`、`src/styles/tokens.css`、`src/components/primitives/*` 是 SaaS 侧后续要承接的主要切片。
5. **工作区卫生是高风险项**：SSE 与 SaaS 当前都不是干净树，SSE 还存在未提交的壳层代码、方案文档、浏览器/临时产物；实施前后都必须先清点，再提交。

### 1.2 二次核查数据

以 2026-04-28 二次核查为准：

| 项 | 结果 | 判断 |
|---|---:|---|
| 分支 commit 差异 | SaaS-only 28 / SSE-only 53 | 只能说明历史分叉，不等于真实功能差距 |
| `src/` 实际目录差异 | 约 118 文件，+7287 / -843 行 | 前端壳层差距大 |
| `server/` 实际目录差异 | 约 13 文件，+439 / -896 行 | 后端差距可切片处理 |
| `package.json` 差异 | SSE 多 `@tanstack/react-query` / `react-router-dom` / `zustand` | SaaS 承接 Shell 前必须先补依赖 |
| SSE 当前验证 | `npm run typecheck:saas` ✅；`npm run build` ✅ | 编译绿，不代表运行态无 bug |

### 1.3 Go / No-Go

**Go：在 SSE 执行本轮 P0/P1 修复。**

**No-Go：完成后直接把 SSE 整体推到 SaaS。**

SaaS 只能在 SSE 验收完成后，通过独立 staging 集成分支做切片移植；每一片都要有 build、浏览器、主链 smoke 证据。

---

## 二、本轮现场核查证据

### 2.1 启动方式

```
backend  : Backend Only (TSX Server)        → http://127.0.0.1:3009  ✅ 已启动
frontend : frontend-audit (Vite)            → http://localhost:5185  ✅ 已启动
路由     : /m/crucible, /m/roundtable
视口     : 1440×900 与 1280×800 双尺寸抽样
```

> 备注：先前 HANDOFF 声明 5182/3009 在跑、禁止 kill —— 实际核查时两端口都已死。后端必须先用 `Backend Only` 拉起。

### 2.2 P0：React Rules-of-Hooks 违例（必修）

**触发位置**：`src/SaaSApp.tsx`

```
686  if (location.pathname === LLM_CONFIG_PATH) { return ( ... ); }
696  if (location.pathname === '/') { return <Navigate to={modulePath()} replace />; }
700  const resolvedModule = extractModuleId(...) ?? DEFAULT_MODULE;
701  const activeModuleLabel = ...;
702  const crucibleArtifactTabs = useMemo(...)            ← 早 return 之后的 hook
706  const roundtableArtifactTabs = useMemo(...)          ← 早 return 之后的 hook
```

**Console 实证**（节选）：

```
React has detected a change in the order of Hooks called by SaaSApp.
   Previous render            Next render
94. useCallback               useCallback
95. undefined                 useMemo                       ← 多出来的 hook
[ShellErrorBoundary] Unhandled error: Rendered more hooks than during the previous render.
```

**影响**：每次 `location.pathname` 在 `/`、`/llm-config`、`/m/...` 之间切换都会改变 hook 数量；
React 16+ 的 hooks 规则要求所有 hook 调用顺序在每次 render 完全一致。
当前会反复触发 `ShellErrorBoundary` 并强制重挂整棵子树，造成肉眼可感知的“先渲染→白屏→再渲染”。

**修复策略（CE 已确定）**：把所有 `useMemo` / 衍生计算搬到第一个 `if (...) return` **之前**。

### 2.3 P0：`.env.local` 把 API 强制指向 localhost:3009

**当前**：

```
.env.local
  VITE_API_BASE_URL=http://localhost:3009
  VITE_SOCKET_URL=http://127.0.0.1:3009
```

**链路**：`src/config/runtime.ts` → `buildApiUrl(...)` → 跨域绝对 URL。

**Network 实证（filter=failed）**：

```
GET http://localhost:3009/api/account/status                  [CORS preflight + 直连]
GET http://127.0.0.1:3009/socket.io/?EIO=4&transport=polling  [大量重连]
```

**影响**：

1. 任何非 5182 端口（5185 审计、未来真实域名）打开页面，都跨域走 `localhost:3009`。
2. 后端短暂下线时整页 `Connecting to SaaS console...` 卡死。
3. 与 `vite.config.ts` 已经写好的 `/api`、`/socket.io` 同源代理冲突，等于代理被绕过。

**修复策略**：开发态默认走 Vite 同源代理，把这两行从 `.env.local` 删掉或临时注释；此变更属于本地验证环境修正，默认不进 commit。

### 2.4 P1：壳层结构 — 已通过

| 视口 | rail | content | drawer | 总和 | 是否溢出 |
|---|---|---|---|---|---|
| 1440 | 288 | 816 | 336 | 1440 | ❌ 不溢出 |
| 1280 | 288 | 656 | 336 | 1280 | ❌ 不溢出 |

DOM 抽样：`/m/crucible` 与 `/m/roundtable` 的右抽屉都包含完整 4 个 Tab：

```
Thesis (收敛命题) · SpikePack (冻结试验包) · Snapshot (会话快照) · Reference (外部资料)
```

**结论**：上一轮 P1 “视图职责归位”整体成立，不需要返工。

### 2.5 P1：仍未做的硬约束（HANDOFF 已点名）

| 项 | 现状 | 证据 |
|---|---|---|
| `[` / `]` 折叠左/右 | **未实现** | 全仓 `grep` 仅找到 `Dialog`/`Toast`/`ArtifactTabs` 自身的 keydown，无 bracket key 监听 |
| Drawer 首秒 auto-peek 3s 后折叠 | **未实现** | 全仓 `grep` `setTimeout.*3000` 无相关结果 |
| Sessions 接真实数据 | **仍是 mock** | `src/modules/{crucible,roundtable}/manifest.tsx` 仍走静态 mock |

### 2.6 P2：环境噪音

- `gstatic.com` 字体（Fraunces / Instrument Sans / JetBrains Mono）批量 404 — 不阻塞，但浪费请求。
- `buildAbsoluteApiUrl` 兜底到 `localhost:${backendPort}` —— 与 1.3 的根因相同，1.3 修了之后这里也干净。

---

## 三、CE 给出的执行总策略

外包按以下 **4 个 Step** 顺序执行，**不能跳序**。每个 Step 完成必须满足验收门槛才能进入下一 Step。

```
Step A  P0 — Rules-of-Hooks 修复
Step B  P0 — .env.local 同源代理回归
Step C  P1 — [ / ] 快捷键
Step D  P1 — Drawer 首秒 auto-peek（3s）
```

> Sessions 真实接口接入、字体 404、SaaS staging 切片移植都不混入 Step A-D。SaaS 迁移只在 SSE 验收完成后进入。

---

## 四、外包执行手册（每一步可逐字照抄）

### Step A · 修复 React Rules-of-Hooks（P0）

**目标**：`SaaSApp.tsx` 不再触发 `ShellErrorBoundary`，console 中不再出现 `Rendered more hooks than during the previous render`。

**A.1 打开文件**：`src/SaaSApp.tsx`

**A.2 找到这块代码**（约 686–710 行）：

```tsx
if (location.pathname === LLM_CONFIG_PATH) {
    return (
        <SaaSLLMConfigPage ... />
    );
}

if (location.pathname === '/') {
    return <Navigate to={modulePath()} replace />;
}

const resolvedModule = extractModuleId(location.pathname) ?? DEFAULT_MODULE;
const activeModuleLabel = registeredModules.find((module) => module.id === activeModule)?.label;
const crucibleArtifactTabs = useMemo(
    () => buildCrucibleArtifactTabsData(crucibleArtifactState),
    [crucibleArtifactState],
);
const roundtableArtifactTabs = useMemo(
    () => buildRoundtableArtifactTabsData(roundtableArtifactState),
    [roundtableArtifactState],
);
```

**A.3 改成**：把两个 `useMemo`（以及它们之后所有不依赖 location 分支的派生计算）**整体搬到**两个 `if return` **之前**。重排后顺序应为：

```tsx
// 1) 先把 hook 都跑完
const resolvedModule = extractModuleId(location.pathname) ?? DEFAULT_MODULE;
const activeModuleLabel = registeredModules.find((module) => module.id === activeModule)?.label;

const crucibleArtifactTabs = useMemo(
    () => buildCrucibleArtifactTabsData(crucibleArtifactState),
    [crucibleArtifactState],
);
const roundtableArtifactTabs = useMemo(
    () => buildRoundtableArtifactTabsData(roundtableArtifactState),
    [roundtableArtifactState],
);

// 2) 再做路径分支
if (location.pathname === LLM_CONFIG_PATH) {
    return (
        <SaaSLLMConfigPage
            trialStatus={crucibleTrialStatus}
            onSaved={refreshCrucibleTrialStatus}
            onClose={() => { navigate(modulePath()); }}
        />
    );
}

if (location.pathname === '/') {
    return <Navigate to={modulePath()} replace />;
}
```

**A.4 自检 grep**：在该文件里执行：
```bash
grep -n "useMemo\|useCallback\|useState\|useEffect\|useRef\|useContext\|useLayoutEffect\|useSyncExternalStore" src/SaaSApp.tsx | sort -t: -k2 -n
```
确认 **所有 hook 调用全部出现在第一个 `if (location.pathname ===` 之前**。如果还有 hook 在 `if return` 之后，就继续往上提，直到清空。

**A.5 验收门槛**：

```bash
npm run typecheck:saas         # 必须绿
npm run build                  # 必须绿
```

启动 `Backend Only (TSX Server)` 与 `frontend-audit`，浏览器打开 `http://localhost:5185/m/crucible`，在 DevTools Console 中：

- ✅ 不再出现 `Rendered more hooks` 或 `[ShellErrorBoundary] Unhandled error`
- ✅ 路径在 `/m/crucible` ↔ `/m/roundtable` ↔ `/llm-config` 之间切换均无白屏

不通过 = 不进入 Step B。

---

### Step B · 关掉 `.env.local` 的绝对 API URL（P0）

**目标**：开发态走 Vite 同源代理（`/api/...`、`/socket.io/...`），不再产生跨域请求。

> 注意：`.env.local` 是本地环境文件。本步骤用于修正 SSE 本地验证口径；默认不把 `.env.local` 变更提交进 Git。若必须提交环境模板，只能改 `.env.example`，且需单独请老卢确认。

**B.1 打开文件**：`.env.local`

**B.2 找到并删除（或注释）这两行**：

```
VITE_API_BASE_URL=http://localhost:3009
VITE_SOCKET_URL=http://127.0.0.1:3009
```

**B.3 不要改 `vite.config.ts`**。代理已经写好：
```ts
proxy: {
  '/api':       { target: backendTarget, changeOrigin: true },
  '/socket.io': { target: backendTarget, ws: true, changeOrigin: true },
}
```

**B.4 重启 Vite**（环境变量在启动期读取，必须重启）：
- 在 Claude Preview 中先停 `frontend-audit`、`Frontend Only (Vite)`，再重启。
- 或在终端 `Ctrl+C` 后重跑 `npm run dev`。

**B.5 验收门槛**：

```bash
npm run typecheck:saas
npm run build
```

浏览器打开 `http://localhost:5185/m/crucible`，DevTools → Network 过滤：

- ✅ 全部 `/api/...` 请求 URL 形如 `http://localhost:5185/api/...`（**同源**），无 `localhost:3009` 直连
- ✅ `/socket.io/...` 也走同源
- ✅ Network filter "failed" 列表里不再出现 `localhost:3009` 直连或 `OPTIONS preflight`
- ✅ `git status --short .env.local` 不应成为本轮提交内容

不通过 = 不进入 Step C。

---

### Step C · 实现 `[` / `]` 快捷键（P1）

**目标**：

- `[` → 折叠 / 展开 **左** 栏（等价点击左栏顶部 chevron）
- `]` → 折叠 / 展开 **右** 抽屉（等价点击右抽屉 chevron）
- 当焦点位于 `<input>`、`<textarea>` 或 `contenteditable` 时**不触发**

**C.1 实现位置**：`src/SaaSApp.tsx`，**与现有 `useEffect` 同段**插入。
> ⚠️ Step A 之后所有 hook 都已经在早 return 之前，注意继续保持这个顺序。

**C.2 复制以下代码到 SaaSApp 内（在其它 `useEffect` 后面）**：

```tsx
useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) return false;
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (target.isContentEditable) return true;
        return false;
    };

    const handler = (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (isEditableTarget(event.target)) return;

        if (event.key === '[') {
            event.preventDefault();
            toggleSidebar();      // 左栏 collapse/expand
            return;
        }
        if (event.key === ']') {
            event.preventDefault();
            toggleArtifactDrawer();   // 右栏 collapse/expand
            return;
        }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
}, [toggleSidebar, toggleArtifactDrawer]);
```

**C.3 如果项目中没有 `toggleSidebar` 与 `toggleArtifactDrawer`**：保持原有命名，去 SaaSApp 同文件里找 `setSidebarOpen`、`setArtifactDrawerOpen` 的现有 setter，**不能新增 state**，只复用。两个回调本身要包成 `useCallback` 并放在文件上半部分（以便挂在依赖数组里）。

**C.4 验收门槛**：

- ✅ 在 `/m/crucible` 页面、点空白区让焦点不在 input：按 `[` 左栏切换、按 `]` 右栏切换
- ✅ 在中栏输入框里输入 `[abc]` —— 仅作为字符输入，不触发抽屉切换
- ✅ console 无新增 warning / error

不通过 = 不进入 Step D。

---

### Step D · Drawer 首秒 auto-peek（P1）

**目标**：

- 进入 `/m/crucible` 或 `/m/roundtable` 时，右抽屉**首次**展开 3 秒，然后**自动折叠**（仅本次会话首次进入触发，刷新页面才再触发一次；切换路由不应反复触发）
- 用户 3 秒内任何手动展开/折叠操作，都视为接管，autopeek 不再回收

**D.1 实现位置**：`src/SaaSApp.tsx` 内，与现有 `useEffect` 同段。

**D.2 实现思路**（推荐写法）：优先用 `useRef` 记录 auto-peek 是否触发和用户是否接管，避免全局 window event。`toggleArtifactDrawer` 包一层本地 callback；左栏 toggle 不影响右栏 auto-peek。

```tsx
const autoPeekFiredRef = useRef(false);
const artifactDrawerUserTouchedRef = useRef(false);

const handleArtifactDrawerToggle = useCallback(() => {
    artifactDrawerUserTouchedRef.current = true;
    toggleArtifactDrawer();
}, [toggleArtifactDrawer]);

useEffect(() => {
    if (autoPeekFiredRef.current) return;
    autoPeekFiredRef.current = true;

    // 进入页面时，先确保抽屉处于展开
    setArtifactDrawerOpen(true);

    const t = window.setTimeout(() => {
        if (!artifactDrawerUserTouchedRef.current) {
            setArtifactDrawerOpen(false);
        }
    }, 3000);

    return () => window.clearTimeout(t);
}, [setArtifactDrawerOpen]);
```

**D.3 替换调用点**：

1. 传给 `ChatPanel` 的 `onToggle` 使用 `handleArtifactDrawerToggle`
2. 传给 `ShellLayout` / 右栏 chevron 的 `onDrawerToggle` 使用 `handleArtifactDrawerToggle`
3. `[` 左栏快捷键继续调用 `toggleSidebar`
4. `]` 右栏快捷键调用 `handleArtifactDrawerToggle`
5. 左栏 chevron 不要标记右栏 touched

**D.4 验收门槛**：

- ✅ 强制刷新 `/m/crucible`：右抽屉先展开，约 3 秒后自动折叠
- ✅ 强制刷新 `/m/crucible`，**1 秒内** 手动点击右抽屉 chevron 折叠：抽屉保持折叠，3 秒后**不会**再被自动状态覆盖
- ✅ 在同一个 SPA 会话内 `/m/crucible` ↔ `/m/roundtable` 路由切换，**不会**反复触发 auto-peek

---

## 五、统一交付物 & 验收清单（外包必须勾完）

完成 Step A–D 后，**一次性**提交：

```
[ ] npm run typecheck:saas        通过
[ ] npm run build                 通过
[ ] agent-browser Console         不再出现 Rendered more hooks / ShellErrorBoundary
[ ] agent-browser Network         所有 /api、/socket.io 请求同源
[ ] agent-browser /m/crucible     中栏对话 + 右抽屉 4 Tab 可见
[ ] agent-browser /m/roundtable   中栏命题输入 + 右抽屉 4 Tab 可见
[ ] agent-browser /llm-config     路由切换无白屏
[ ] 操作录像（30s 内）             [ / ] 快捷键 + auto-peek 行为完整
[ ] git status                    无 .DS_Store / .playwright-mcp / tmp / __pycache__ 噪音进入提交
```

> 截图与录像统一放在 `docs/dev_logs/2026-04-28-outsourced-evidence/` 下，并在 `docs/dev_logs/2026-04-28.md` 引用。

---

## 六、不在本轮范围（外包**禁止**做）

1. 不动 `vite.config.ts`
2. 不动 `.claude/launch.json`
3. 不替换或新增任何 npm 依赖
4. 不动 `docs/04_progress/dev_progress.md` 与 `docs/dev_logs/HANDOFF.md`（由老杨在外包验收后统一覆盖）
5. 不接 Sessions 真实接口
6. 不动 Google Fonts 加载链路
7. 不把 `.env.local` 变更提交进 Git
8. 不直接 merge / push 到 `MHSDC-GC-SAAS-staging`
9. 不把 Roundtable 是否进入 SaaS production 当成本轮默认结论

---

## 七、风险预案

| 风险 | 触发场景 | 处置 |
|---|---|---|
| Step A 后仍有 hook 警告 | 仍有 hook 出现在 `if return` 之后 | 重新执行 A.4 grep，逐一上提 |
| Step B 后 `Connecting to SaaS console...` | Vite 没重启或后端没拉起 | 重启 Vite + 启 `Backend Only (TSX Server)`，确认 `curl localhost:3009/api/account/status` 200 |
| Step C 在中栏输入触发抽屉 | 焦点判定漏 contenteditable | 把 `isEditableTarget` 中的 `target.isContentEditable` 加回去 |
| Step D 路由切换反复闪烁 | `autoPeekFiredRef` 写错或没用 ref | 必须用 `useRef`，不能用 state，否则会随 render 重置 |
| `.env.local` 被误提交 | Step B 后直接 `git add .` | 提交前 `git status --short`，确认 `.env.local` 不在 staged |
| SaaS 侧冲突过大 | 试图整枝 merge SSE | 放弃整枝 merge，按第九节切片移植 |
| Roundtable 影响一期验收 | SaaS 用户看到未验收功能 | staging 可见；production 前由老卢决定 feature flag / 隐藏入口 |

---

## 八、给外包的最简执行入口

```bash
# 1. 拉起后端
#    在 Claude Preview 中启动 "Backend Only (TSX Server)"，或：
#    npx tsx watch server/index.ts

# 2. 拉起前端（审计端口避开 5182 主开发口）
#    在 Claude Preview 中启动 "frontend-audit"，或：
#    npx vite --host --port 5185

# 3. 按本手册顺序执行 Step A → Step B → Step C → Step D

# 4. 每步执行完都跑：
npm run typecheck:saas && npm run build

# 5. 最终把交付物按第五节贴齐，并提交 PR：标题
#    feat(shell): P0 hooks fix + same-origin proxy, P1 shortcuts & auto-peek
```

---

## 九、SaaS staging 后续切片移植方案

> 这一节不是 Step A-D 的一部分。只有 SSE 验收完成、工作区清洁、老卢确认后，才进入 SaaS staging 承接。

### 9.1 总原则

1. **禁止整枝 merge SSE → SaaS**：当前前端差距大、历史资产噪音多，整枝 merge 会把风险打包进 staging。
2. **从 `MHSDC-GC-SAAS-staging` 拉独立集成分支**：建议命名 `codex/saas-shell-slice-integration` 或按老卢指定命名。
3. **每片只承接一个结构层**：每片 build 绿、浏览器主链可打开后再进下一片。
4. **功能可见性单独决策**：Roundtable 可先进入 staging 验证；production 是否露出入口，由老卢最后拍板。

### 9.2 推荐切片顺序

| 顺序 | 切片 | 关键文件 | 验收 |
|---|---|---|---|
| 1 | 依赖与入口基座 | `package.json`、`package-lock.json`、`src/main.tsx`、`src/router.tsx` | install/build 通过，`/` 能正常重定向 |
| 2 | tokens / primitives | `src/styles/*`、`src/components/primitives/*` | build 通过，旧 SaaS 主链不白屏 |
| 3 | Shell 原语 | `src/shell/primitives/*`、`src/shell/error-boundaries/*`、`src/shell/shellStore.ts` | Shell 组件可编译，ErrorBoundary 不触发 |
| 4 | ShellLayout / registry | `src/shell/ShellLayout*`、`src/modules/*`、`src/slots/*` | `/m/crucible` 可打开 |
| 5 | Crucible / Roundtable stage | `src/modules/crucible/*`、`src/modules/roundtable/*`、`src/shell/artifacts/*`、`src/shell/sessions/*` | `/m/crucible` 与 `/m/roundtable` 右栏 4 Tab 可见 |
| 6 | 本轮 P0/P1 fixes | `src/SaaSApp.tsx` 相关修复 | 路由切换无 Hooks error；快捷键和 auto-peek 通过 |
| 7 | 后端路由整理（如需要） | `server/routes/*`、`server/auth/workspace-middleware.ts`、`server/index.ts` | account/status、crucible 主链、thesiswriter smoke 通过 |

### 9.3 SaaS staging 验收门槛

SaaS 侧完成切片后，至少要完成：

```bash
npm run typecheck:saas
npm run build
```

agent-browser 验收：

1. `/` → 默认工作台重定向正常
2. `/m/crucible` 打开无白屏、无 `ShellErrorBoundary`
3. `/m/roundtable` staging 可打开；若准备隐藏入口，确认入口隐藏但路由不破坏 build
4. `/llm-config` 打开、关闭、返回主路径无 Hooks error
5. Network 中 `/api/...` 与 `/socket.io/...` 走当前 staging 同源/正确域名，不出现本地 `localhost` 直连
6. 登录 / account status / workspace 自动创建正常
7. GoldenCrucible 单轮对话 smoke 正常
8. ThesisWriter smoke 正常
9. BYOK 页面与诊断 smoke 正常

### 9.4 SaaS Go / No-Go

**SaaS staging Go**：

1. 所有切片各自 build 绿
2. staging 浏览器验收绿
3. 关键 smoke 至少覆盖登录、Crucible 对谈、ThesisWriter、BYOK
4. 老卢明确确认 Roundtable 在 SaaS 的可见性策略

**SaaS production No-Go 条件**：

1. 仍有 Hooks error / ShellErrorBoundary
2. Network 出现 `localhost:*` 直连
3. 登录或 workspace 隔离不稳
4. ThesisWriter / trial / BYOK 任一主链回归
5. Roundtable 可见性未决

---

## 十、下一轮对话实施入口

下一轮对话直接按下面顺序开工：

1. 核对当前分支必须是 `MHSDC-GC-SSE`
2. 核对 `git status --short`，先识别本轮允许触碰的文件
3. 实施 Step A：Hooks 顺序修复
4. 实施 Step B：本地同源代理验证口径修正，`.env.local` 不进提交
5. 实施 Step C：`[` / `]` 快捷键
6. 实施 Step D：右抽屉 auto-peek
7. 跑 `npm run typecheck:saas` 与 `npm run build`
8. 用 agent-browser 验收 `/m/crucible`、`/m/roundtable`、`/llm-config`
9. 清理提交范围，排除本地缓存、截图临时目录、`.env.local`
10. 由老杨回写 `docs/dev_logs/HANDOFF.md`，再等老卢确认是否进入 SaaS staging 切片移植

**老卢的 Go/No-Go 在最后一道**：SSE 通过后才进入 SaaS staging；SaaS staging 通过后才讨论 production。
