# 🧠 Memory Dump: Director 欢迎屏 & 缓存修复 & 全局错误保护

> 日期: 2026-02-28  
> 分支: `main`  
> Commit: `d3dffd9`  
> 前一个 Commit: `699108f` (SD-202 Remotion管线修通)

---

## 🔧 本次完成的工作

### 1. 修复项目切换缓存残留 (根本 Bug)
- **根因**: `DirectorSection.tsx` 第 308 行将 `data.conceptProposal`（概念提案全文）错误传给了 `Phase1View` 的 `scriptPath` prop
- **表现**: 切换到 SP3 时长文本被渲染为剧本名；切换到 Seedance2 时因 conceptProposal 为空导致 Phase1View 误判为"未选择剧本"
- **修复**: `scriptPath={scriptPath}`（来自 DirectorSection 的 props）

### 2. 前端状态清空
- `App.tsx`: `handleSelectProject` 中先 `setState({...INITIAL_STATE, projectId})` 清空旧数据，再 emit socket
- `useDeliveryStore.ts`: 导出 `INITIAL_STATE` 和 `setState`
- `Phase1View.tsx`: `isConceptEmpty` 判定优化（长文本不误判）+ scriptPath 异常截断保护

### 3. 后端去硬编码
- `server/index.ts`: 移除全局 `PROJECT_ROOT`/`DELIVERY_FILE` 变量，改为动态 `getProjectRoot(projectId)`
- `currentProjectName` 初始化为 `null`（而非 `'CSET-SP3'`）
- 服务启动时不再自动加载任何项目

### 4. 后端全局错误保护
- `server/index.ts` 末尾添加 `process.on('uncaughtException')` + `process.on('unhandledRejection')`
- 防止 Express 4 async 路由的 Promise reject 导致整个后端进程崩溃

---

## 📂 关键文件路径

| 文件                                     | 改动要点                                   |
| ---------------------------------------- | ------------------------------------------ |
| `src/components/DirectorSection.tsx`     | ⚡ **核心修复**: L308 scriptPath prop       |
| `src/App.tsx`                            | 项目切换时清空 state                       |
| `src/hooks/useDeliveryStore.ts`          | export INITIAL_STATE + setState            |
| `src/components/director/Phase1View.tsx` | isConceptEmpty 优化 + displayPath 截断     |
| `src/components/Header.tsx`              | onSelectProject prop 接入                  |
| `server/index.ts`                        | 去硬编码 + 全局错误处理                    |
| `server/director.ts`                     | Phase2 B-Roll 全局生成 + thumbnail API     |
| `server/skill-loader.ts`                 | Director 提示词 (Remotion 模板菜单)        |
| `server/llm.ts`                          | generateGlobalBRollPlan + retry + fallback |

---

## ❗ 未完成 & 已知问题

1. **Phase 2 预览生成 "Load failed"**: 用户点击 B-Roll 确认后后端进程崩溃（已加全局保护，但根因尚未定位——可能是 LLM API 超时或 Remotion CLI 渲染报错）。重启后需观察 🔴/🟡 日志。
2. **Remotion 真实渲染验证**: ConceptChain/DataChartQuadrant 的动态 props 渲染尚未在浏览器中端到端验证。
3. **DirectorSection 的 useState 同步问题**: `concept` 使用 `useState(data.conceptProposal)` 初始化后不随 props 变化更新（经典 React 模式缺陷）。切换项目时会残留旧 concept。暂不影响功能（因为切换项目会清空 conceptProposal 为空字符串），但如果从一个有 concept 的项目切到另一个有 concept 的项目，可能会显示前一个的。

---

## ▶️ 下一步计划

1. 重启 `npm run dev` → 再次触发 Phase 2 B-Roll 生成 → 观察后端日志中的 🔴/🟡 错误信息
2. 根据具体错误修复 LLM 调用 / Remotion 渲染的问题
3. 端到端验证：选择项目 → Phase 1 概念提案 → Phase 2 分段视觉方案 → 预览图渲染
4. 修复 `DirectorSection` 中 `concept` 的 useState 同步问题（用 `useEffect` 监听 `data.conceptProposal` 变化）
