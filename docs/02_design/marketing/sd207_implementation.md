# [SD-207] MarketingMaster 实施方案（工程层）

> **文档版本**: v1 草案
> **成文日期**: 2026-04-19
> **配套 PRD**: [sd207_prd.md](./sd207_prd.md)
> **执行方**: codex / opencode 团队
> **设计方**: 老杨（OldYang）+ 老卢共识产出
> **分支**: `MHSDC-DC-MKT`

本实施方案承接 SD-207 PRD 的**收敛清单（C1–C9）**和**风险清单（T1–T13）**，将其拆解为可执行的工程任务，粒度到"文件 / 函数 / 测试命令"级。Future-Proofing 措施（FP1–FP6）的代码落地动作集中在本文档。

---

## 0. 前置须知

### 0.1 分支与提交纪律

- 工作分支：`MHSDC-DC-MKT`（当前分支，不切新分支）
- 每个 C 项目独立 commit，commit message 格式：`feat(mkt-sd207): C<N> <简述>` 或 `refactor/fix/docs(mkt-sd207): …`
- 不允许把治理文档（本 PRD / 实施方案）与代码改动放同一个 commit
- 提交前确保 `npx tsc --noEmit` 通过
- 严禁 `git add -A` 或 `git add .`（参见 CLAUDE.md Git Safety Protocol）

### 0.2 开发环境前置

- 端口：`PORT=3002` / `VITE_PORT=5174`（MKT 分支注册端口，红线不可改，参见 `docs/04_progress/rules.md` 端口章节）
- 项目数据：`PROJECTS_BASE=/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects`
- 启动：`npm run dev`（前后端同时拉起）
- 测试项目：`CSET-Seedance2`（已有历史 marketing 数据，适合做回归）

### 0.3 执行顺序建议

推荐顺序：**C5 → C4 → C2 → C3 → C1 → C6 → C7 → C8/C9**

理由：先清理死码（C5）和全局变量（C4）降低干扰 → 抽 Provider 接口（C2/C3）不改行为 → 做 Output Contract 升级（C1）+ MD 警示（C6）→ 最后补 T12 单 plan 重试（C7）与文档收尾（C8/C9）。

---

## 1. C5 — 旧组件移入 legacy/

**对应 DoD**: D10, D11
**对应风险**: T2
**预估工时**: 30 min

### 1.1 现状

以下三个文件是 SD-207 V3 重构前的旧 Phase 组件，已被 `MarketingSection.tsx` 弃用（只引用 `MarketPhase1New.tsx` / `MarketPhase2New.tsx`），属于死码：

- `src/components/market/MarketPhase1.tsx`
- `src/components/market/MarketPhase2.tsx`
- `src/components/market/MarketPhase3.tsx`

### 1.2 任务

1. 创建目录 `src/components/market/legacy/`
2. 用 `git mv` 把上述三个文件移入 `legacy/` 保留文件名
3. 在 `src/components/market/legacy/README.md` 写明：
   - 这三个文件属于 SD-207 V2 架构，已被 V3 取代
   - 保留用于历史追溯，不要被新代码引用
   - 未来清理时机：SD-207 V3 稳定运行三个月后可删除
4. 全仓扫描确认无任何地方 `import` 这三个文件
5. `npx tsc --noEmit` 通过

### 1.3 验收命令

```bash
ls src/components/market/legacy/
# 预期：MarketPhase1.tsx MarketPhase2.tsx MarketPhase3.tsx README.md

grep -rn "from.*market/MarketPhase[123]'" src/ server/
# 预期：无输出（不含 legacy/ 下的自引用）

npx tsc --noEmit
# 预期：无错误
```

---

## 2. C4 — 消除 `window.__srtTimeline`

**对应 DoD**: D9
**对应风险**: T1
**预估工时**: 1–2 h

### 2.1 现状

`src/components/market/MarketPhase2New.tsx:79` 使用全局变量传递 SRT timeline 字符串给 SSE 生成流程：

```typescript
(window as any).__srtTimeline = timeline;
```

下游读取点需要全文搜索确认（可能在 Phase 2 生成 Plan 的 fetch body 里用 `window.__srtTimeline` 取）。

### 2.2 任务

1. 全仓搜索 `window.__srtTimeline` 和 `__srtTimeline` 定位所有读写点
2. 方案 A（优选）：把 timeline 存到 `MarketModule_V3.srtTimeline: string`，走既有 `onUpdate` 持久化链路
3. 方案 B（备选）：若不希望污染状态契约，用 React context 或 ref 在 Phase 2 组件树内部传递
4. 删除所有 `(window as any).__srtTimeline` 读写
5. 类型安全：`npx tsc --noEmit` 通过

### 2.3 验收命令

```bash
grep -rn "__srtTimeline" src/ server/
# 预期：无输出

npx tsc --noEmit
# 预期：无错误
```

---

## 3. C2 — `ScoringProvider` 接口抽取

**对应 DoD**: D7
**对应风险**: T6
**对应 Future-Proofing**: FP2
**预估工时**: 2–3 h

### 3.1 目标

把 TubeBuddy Playwright 调用从业务逻辑中解耦，未来可替换为 TubeBuddy API 或其他 SEO 打分服务，无需改业务代码。

**本期不做**替代实现，唯一实现仍是 `PlaywrightTubeBuddyProvider`，行为与当前完全一致。

### 3.2 任务

1. 新建 `server/providers/scoring-provider.ts`：
   ```typescript
   export interface ScoringResult {
     score: number;
     rawMetrics?: {
       searchVolume?: number;
       competition?: number;
       optimization?: number;
       relevance?: number;
       monthlySearches?: number;
       competitionLevel?: 'low' | 'medium' | 'high';
     };
   }

   export interface ScoringError {
     type: 'selector_not_found' | 'timeout' | 'network_error' | 'auth_required' | 'unknown';
     message: string;
     retryable: boolean;
   }

   export interface ScoringProvider {
     name: string; // e.g. 'playwright-tubebuddy'
     scoreKeyword(keyword: string, ctx: ScoringContext): Promise<ScoringResult>;
     dispose?(): Promise<void>;
   }

   export interface ScoringContext {
     projectId: string;
     locale?: 'zh' | 'en';
   }
   ```
2. 新建 `server/providers/playwright-tubebuddy-provider.ts`：把现有 `server/market.ts` 中直接写 Playwright 的函数搬到这里，实现 `ScoringProvider`
3. 修改 `server/market.ts`：通过一个单例工厂 `getScoringProvider(): ScoringProvider` 获取实例，业务代码只调接口，不关心底层
4. 工厂函数读 `.env` 的 `SCORING_PROVIDER` 环境变量（默认 `playwright-tubebuddy`），为未来切换保留入口
5. 保持现有错误类型（`selector_not_found` / `timeout` / `network_error`）与重试语义不变（参见 `server/market.ts:165` 注释）
6. 所有 SSE 事件语义不变（前端不需要改）

### 3.3 验收

- `npx tsc --noEmit` 通过
- 手动走一遍 Phase 1 打分全流程（含单 keyword 失败重试），行为与重构前一致
- `server/market.ts` 中不再 `import 'playwright'` 或直接引用 Chrome/扩展路径

---

## 4. C3 — `LLMProvider` 接口抽取

**对应 DoD**: D8
**对应风险**: T7
**对应 Future-Proofing**: FP3
**预估工时**: 2–3 h

### 4.1 目标

把 LLM 调用从业务逻辑中解耦，未来可接入多 LLM / API Key 管理 / rate limit，无需改业务代码。

**本期不做**多 LLM 支持或 Key 管理，唯一实现是现有 LLM 客户端的薄包装。

### 4.2 任务

1. 新建 `server/providers/llm-provider.ts`：
   ```typescript
   export interface LLMMessage {
     role: 'system' | 'user' | 'assistant';
     content: string;
   }

   export interface LLMCompletionOptions {
     temperature?: number;
     maxTokens?: number;
     stream?: boolean;
     responseFormat?: 'text' | 'json';
   }

   export interface LLMProvider {
     name: string;
     complete(messages: LLMMessage[], opts?: LLMCompletionOptions): Promise<string>;
     completeStream(messages: LLMMessage[], opts?: LLMCompletionOptions): AsyncIterable<string>;
   }
   ```
2. 新建 `server/providers/<current-llm>-provider.ts`（按现有 LLM 客户端名命名），包装现有调用
3. 修改 `server/market.ts` 中所有 LLM 直调（候选词生成 / 策略点评 / Plan 生成）走 `getLLMProvider()`
4. 工厂读 `.env` 的 `LLM_PROVIDER` 环境变量
5. 保持所有 SSE 流式行为与错误消息不变

### 4.3 验收

- `npx tsc --noEmit` 通过
- 手动走一遍 Phase 1 策略点评 + Phase 2 Plan 生成，行为与重构前一致
- `server/market.ts` 中不再直接 import LLM SDK

---

## 5. C1 — Output Contract 落盘升级

**对应 DoD**: D3, D4, D14
**对应风险**: T3
**对应 Future-Proofing**: FP1
**预估工时**: 3–4 h
**⚠️ 高风险项**：这是对外契约的第一次冻结，改坏了 Distribution Console 会拿到错数据

### 5.1 目标

- 替换现有 `05_Marketing/<basename>.md + .plain.txt` 双写
- 新的对外产物落在 `06_Distribution/marketing_package.json` + `marketing_package.md`
- JSON 为唯一事实源，MD 由 JSON 经模板渲染（方案 a）
- 原子性：双写在同一个 try/catch 内，任一失败则整体失败并报错给前端
- 向老数据兼容：`05_Marketing/` 下的旧产物**保留不删**（作为人类可读的历史留档）；新增落盘不再往 `05_Marketing/` 写 `.md/.plain.txt`（待验收通过后再决定是否清理旧路径）

### 5.2 JSON Schema（冻结版）

参见 PRD §4.2.1。实施时在 `server/providers/publish-package.ts` 中定义 TypeScript 接口：

```typescript
export interface PublishPackage {
  schemaVersion: '1.0';
  generatedAt: string; // ISO-8601 with TZ
  projectId: string;
  scriptPath: string;
  goldenKeyword: {
    id: string;
    text: string;
    variants?: Array<{ script: 'zh-Hans' | 'zh-Hant' | 'en'; text: string }>;
    tubeBuddyScore?: { overallScore?: number; /* ... */ };
  };
  platforms: {
    youtube?: YouTubePublishFields;
    // 预留：bilibili?: BilibiliPublishFields; x?: XPublishFields; ...
  };
}

export interface YouTubePublishFields {
  title: string;
  description: {
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
    links: Array<{ label: string; url: string }>;
  };
  tags: string[];
  thumbnail: string; // 项目根相对路径
  playlist: string;
  category: string;
  license: string;
}
```

### 5.3 MD 模板规范

**位置**：`server/providers/publish-package-md-template.ts`
**签名**：`function renderMarketingPackageMD(pkg: PublishPackage): string`

**模板骨架**：

```markdown
---
schemaVersion: 1.0
generatedAt: <pkg.generatedAt>
projectId: <pkg.projectId>
scriptPath: <pkg.scriptPath>
source: marketing_package.json
warning: "⚠️ 此文件由系统生成，手动修改将在下次'确认'时被覆盖。编辑请回 MarketingMaster UI。"
# source_sha256: <可选，见 C6>
---

# YouTube 发布包

- **黄金关键词**：<goldenKeyword.text>

## 标题
<platforms.youtube.title>

## 描述

**Hook**
<description.hook>

**Body**
<description.body>

**CTA**
<description.cta>

**Hashtags**
<hashtags joined by space>

**Links**
- <link.label>: <link.url>
- ...

## 标签
<tags joined by comma>

## 缩略图
<thumbnail path>

## 播放列表
<playlist>

## 其他
- 视频类别：<category>
- 许可证：<license>
```

（未来新增平台时，在此模板后追加 `## B 站发布包` 等章节。）

### 5.4 任务

1. 新建 `server/providers/publish-package.ts`（接口 + 从 `MarketModule_V3` 构造 `PublishPackage` 的函数 `buildPublishPackage()`）
2. 新建 `server/providers/publish-package-md-template.ts`（渲染函数）
3. 修改 `server/market.ts:795-815` 的确认落盘端点：
   - 构造 `PublishPackage`
   - 确保 `06_Distribution/` 目录存在（`mkdirSync({ recursive: true })`）
   - 同一 try 内先写 JSON 再写 MD（或并发 Promise.all）
   - 返回给前端的 `savedPaths` 改为 `['06_Distribution/marketing_package.json', '06_Distribution/marketing_package.md']`
4. **保留**原有 `05_Marketing/<basename>.md + .plain.txt` 双写路径暂不移除，避免回归风险（清理放到 SD-207 稳定运行一周后单独 commit）
5. `MarketConfirmBar.tsx` 的提示文案更新为指向新路径

### 5.5 验收命令

```bash
# 手动走 Phase 2 → 点确认
ls <project>/06_Distribution/
# 预期：marketing_package.json marketing_package.md

# 检查 JSON schema
jq '.schemaVersion, .platforms.youtube.title' <project>/06_Distribution/marketing_package.json

# 检查 MD 与 JSON 一致（目测）
head -20 <project>/06_Distribution/marketing_package.md

# 无 schema 报错
npx tsc --noEmit
```

---

## 6. C6 — MD 警示 front matter + 可选 checksum

**对应 DoD**: D14
**对应风险**: T10
**对应 Future-Proofing**: FP6
**预估工时**: 1 h

### 6.1 任务

1. 在 C1 的 MD 模板里确保已包含 `warning: "⚠️ 此文件由系统生成..."`（默认包含，无需单独做）
2. 在 `buildPublishPackage` 后计算 JSON 内容的 SHA-256 → 写入 `pkg.__meta.sha256`（或在 MD front matter 单独字段，JSON 主 schema 不变）
3. checksum 字段标注为**可选**，未来 Distribution Console 读 JSON 时可校验 MD 是否被手改过

### 6.2 实现位置

在 `publish-package-md-template.ts` 的 `renderMarketingPackageMD()` 里：

```typescript
import { createHash } from 'node:crypto';

export function renderMarketingPackageMD(pkg: PublishPackage, jsonContent: string): string {
  const sha256 = createHash('sha256').update(jsonContent).digest('hex');
  // 把 sha256 注入 front matter 的 source_sha256 字段
  // ...
}
```

### 6.3 验收

```bash
head -10 <project>/06_Distribution/marketing_package.md | grep source_sha256
# 预期：有一行 sha256 值

# 对比
sha256sum <project>/06_Distribution/marketing_package.json
# 预期：值与 MD front matter 里的一致
```

---

## 7. C7 — T12 单 plan 重试按钮（实施阶段先核实）

**对应 DoD**: D15
**对应风险**: T12
**预估工时**: 核实 30 min；若缺补齐 1–2 h

### 7.1 前置核实

实施前先做一次现状核实：
1. 在 Phase 2 生成 Plans 时，故意断网触发单个黄金词生成失败
2. 观察 UI 是否有"重试该 Plan"按钮
3. 若有 → 本项直接标 ✅ 关闭，无需代码改动
4. 若无 → 按下文补齐

### 7.2 补齐任务（若需）

1. 后端新增 `POST /api/market/v3/regenerate-plan`（接收 `projectId` + `keywordId`，单黄金词重跑生成）
2. 前端 `MarketPhase2New.tsx` 在 `plan.generationStatus === 'error'` 的 Tab 内显示"重试"按钮
3. 错误文案："当前黄金词的营销方案生成失败，可点击重试（已保留其他词的进度）"

### 7.3 验收

- 故意断网 → 生成失败 → UI 显示重试按钮 → 恢复网络 → 点击重试 → 成功

---

## 8. C8 — `_master.md` 挂回 `_index.md`

**对应 DoD**: D12
**预估工时**: 5 min

### 8.1 任务

修改 `docs/02_design/_index.md`，在"DeliveryConsole 二级能力模块"清单下为 `MarketingMaster` 添加链接，指向 `./marketing/_master.md`。

### 8.2 验收

- `docs/02_design/_index.md` 中 `MarketingMaster` 条目是可点击的链接
- 目标文件存在

---

## 9. C9 — 文档落盘（已完成）

本 PRD 与实施方案在 2026-04-19 已落盘于 `docs/02_design/marketing/` 目录。后续版本更新以 git commit 驱动。

---

## 10. Future-Proofing 汇总（随本期一起实现）

| # | 措施 | 实施位置 | 本期成本 |
| --- | --- | --- | --- |
| FP1 | Output Contract 外层 `platforms.youtube` 结构 | C1 | ≈10 行 schema |
| FP2 | `ScoringProvider` 接口抽取 | C2 | 2–3 h |
| FP3 | `LLMProvider` 接口抽取 | C3 | 2–3 h |
| FP4 | 消除 `window.__srtTimeline` | C4 | 1–2 h |
| FP5 | 组件逻辑与呈现分离（保持现状） | 零改动 | 0 |
| FP6 | MD 警示 + 可选 checksum | C6 | 1 h |

**FP5 的特别说明**：当前 `MarketingSection.tsx` 通过 `useExpertState` hook 管理状态，下游组件以 props 接收数据并渲染。这种"逻辑 hook + 纯展示组件"的模式要在本期**保持**，不做额外解耦，但也**不允许回退到把业务逻辑塞进 UI 组件**。下期 UI 纵向化改版时，只需重写展示层、保留 hook 层即可。

---

## 11. 回归测试 checklist（所有 C 项完成后执行）

```
[ ] 选文稿 → Phase 1.1 候选词 SSE 流式生成，数量正常（10 个左右）
[ ] 手动添加关键词（Enter 键）
[ ] 手动删除关键词
[ ] Phase 1.2 TubeBuddy 打分，SSE 流式返回
[ ] 故意断网 → 单个关键词 status=error → "重试"按钮可用
[ ] Phase 1.3 勾选黄金词 → LLM 策略点评生成
[ ] Phase 2 (可选) 上传 SRT → 章节解析正常
[ ] Phase 2 生成每个黄金词的 MarketingPlan
[ ] （若补了 C7）故意断网 → 单个 plan 重试按钮可用
[ ] MarketPlanTable 所有字段可编辑（title / description 5 块 / tags / thumbnail / playlist / category / license）
[ ] 点击"确认" → 06_Distribution/marketing_package.json + .md 落盘
[ ] 打开 .md 看内容，与 .json 字段一致
[ ] .md 顶部 front matter 含 warning 字段
[ ] （若做了 checksum）source_sha256 字段可校验
[ ] 切换文稿 → 状态自动 Reset 回 Phase 1
[ ] Phase 1 ↔ Phase 2 来回切换，数据保留
[ ] grep 确认 window.__srtTimeline 已消除
[ ] grep 确认 src/components/market/legacy/ 下文件无被引用
```

---

## 12. 提交策略

- 每个 C 项独立 commit（C2/C3 可能需要拆多个）
- 合并顺序建议：C5 → C4 → C2 → C3 → C1 → C6 → C7
- 每次 commit 前 `npx tsc --noEmit` 必须通过
- 合并完成后在 `docs/04_progress/dev_progress.md` 追加 `v4.2.0 — SD-207 PRD 追认 + 工程收敛` 条目
- 本 PRD 与实施方案的文档 commit 与代码 commit 分开
