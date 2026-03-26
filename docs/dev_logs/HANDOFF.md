# 交接快照 | 2026-03-26（最新）

> **每次会话结束时覆盖写此文件（不累积）**
> 新会话启动时第一个读此文件，30 秒恢复上下文

---

## 📍 当前状态

| 项目 | 状态 |
|---|---|
| 分支 | `MHSDC-DC-director` |
| 代码状态 | ✅ 已提交 `768d082`（ahead 7 commits） |
| 最新 commit | `768d082` fix(director): CORS修复(temp_images本地HTTP) + Phase3反馈区移除 |
| 版本 | v3.8.2 |
| SkillSync | 7/7（含 svg-architect） |
| 当前 Phase | Phase 3 渲染管线基本可用，用户正在验收 |

---

## ✅ 本轮已完成（2026-03-25~26 会话）

### 1. SVG-Architect 集成
- `server/svg-architect.ts` — 新建 Python pipeline 桥接模块
- `server/skill-sync.ts` — svg-architect 加入 SkillSync（7/7）
- `server/skill-loader.ts` — 加载 svg-architect 规格，注入 Director prompt `{{SVG_ARCHITECT_SPEC}}`
- `broll.md` — svgPrompt 字段暂标为"预留"（JSON 内嵌 SVG 代码会破坏 JSON 解析，见下方教训）

### 2. JSON 安全解析（safeParseLLMJson）
- `server/llm.ts` — 新增 `safeParseLLMJson`：如果 svgPrompt 中的 SVG 代码破坏 JSON，自动剥离 svgPrompt 保全其余数据
- **根因**：LLM 在 JSON 字符串中输出 `<svg fill="#ff0000"...>`，双引号冲突导致 `JSON.parse` 在 position 12007 失败 → 兜底方案
- **教训**：不要要求 LLM 在 JSON 字段中输出代码。svgPrompt 已降级为预留字段

### 3. imagePrompt 底图覆盖率优化
- `broll.md` — 硬约束从 svgPrompt 改为 imagePrompt 覆盖率（≥50% remotion 方案必须提供 imagePrompt）
- `server/llm.ts` — 用户消息规则 #6 改为 imagePrompt 底图规则
- **效果**：LLM 现在为 remotion 方案生成丰富多样的 imagePrompt 底图

### 4. CORS 修复（Seedream 图片）
- `server/director.ts` — `downloadImageToLocal` 返回 `http://localhost:3005/temp_images/xxx.jpg` 而非 `file://` 路径
- `server/index.ts` — 新增 `/temp_images` 静态文件服务
- **根因**：Remotion CLI 的 headless Chromium 拦截跨域图片（火山引擎 TOS CDN → localhost）

### 5. Phase 3 UI 改进
- **单条渲染按钮**：Phase3OptionRow "等待渲染" → 蓝色 Play 按钮，点击触发单条渲染
- **反馈区移除**："对视频不满意？提意见重新渲染" 区域已删除，修订通道统一走侧边栏 Chat

### 6. RS 模板底图适配
- `src/types.ts` — SceneOption 新增 `svgPrompt` 字段
- Phase 2/3 双通道路由逻辑（svgPrompt → SVG-Architect，imagePrompt → Seedream）

---

## 🔧 待解决问题（下个会话优先）

### P0 — 阻塞性
1. **Chat 侧边栏修订流不通**：用户在 Chat 中对 Phase 3 条目提出修改意见 → Director AI 生成修订方案 → "确认修改" → 但 Phase3View 本地状态（`localChapters`）**未监听** `expert-data-update:Director` 广播，导致修改不反映到 UI，也不触发重新渲染
   - 修复方向：Phase3View 监听 socket 广播 → 刷新 localChapters → 自动触发 handleRetryOption

### P1 — 体验优化
2. **RS 模板前景/背景混合问题**（如 4-5 case）：ComparisonSplit 等模板的遮罩层透明度过高（13%），导致照片级底图与前景数据面板视觉"打架"
   - 修复方向：提高遮罩不透明度，或在 RS 模板层面区分"照片底图"和"图案底图"的遮罩策略
3. **火山引擎并发控制**：建议 Seedream 最多 3 worker 并行，完成后再添加新进程
4. **Phase 3 文字方框半透明**：如 6-1 case，文字区域建议采用半透明/毛玻璃效果，让背景图若隐若现

### P2 — 架构演进
5. **svgPrompt 方案重新设计**：当前"在 JSON 中嵌入 SVG 代码"的方案不可行（破坏 JSON）。需要重新设计：
   - 方案 A：svgPrompt 改为结构化描述（type + data + style），svg-architect 用模板生成 SVG
   - 方案 B：分离 SVG 到独立输出通道（LLM 返回 JSON + SVG code blocks）
   - 方案 C：放弃 LLM 生成 SVG，改为 svg-architect 自主生成（输入数据描述 → 输出 SVG）

---

## 📁 本轮涉及的关键文件

| 文件 | 改动 |
|---|---|
| `server/svg-architect.ts` | 新建：Python pipeline 桥接 |
| `server/llm.ts` | safeParseLLMJson + BRollOption.svgPrompt + imagePrompt 规则 |
| `server/skill-sync.ts` | svg-architect 加入 ALL_SKILLS |
| `server/skill-loader.ts` | loadSvgArchitectSpec + {{SVG_ARCHITECT_SPEC}} |
| `server/director.ts` | downloadImageToLocal CORS 修复 + SVG/imagePrompt 双通道路由 |
| `server/index.ts` | /temp_images 静态文件服务 |
| `src/types.ts` | SceneOption.svgPrompt |
| `src/components/director/Phase3View.tsx` | 单条渲染按钮 + 反馈区移除 |
| `~/.gemini/.../Director/prompts/broll.md` | svgPrompt 预留 + imagePrompt 底图硬约束 |

---

## 📝 Commit 历史（本轮）

```
768d082 fix(director): CORS修复(temp_images本地HTTP) + Phase3反馈区移除
4dbc50c feat(director): Phase3 单条渲染按钮
28fb7c7 feat(director): SVG-Architect集成 + CORS修复 + RS模板底图优化
c51c863 fix(director): infographic Phase3 两步渲染管线 + 沙漏架构拉通
```
