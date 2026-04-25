# 2026-04-02 | MarketingMaster MHSDC 新家初验 & 修复日志

> **分支**: `MHSDC-DC-MKT`
> **Worktree**: `/Users/luzhoua/MHSDC/DeliveryConsole/MarketingMaster`
> **状态**: 初验完成，服务已拉起，2 个 bug 已修复

---

## 1. 环境修复

### 1.1 node_modules 缺失 — 根因分析

**根因**：worktree 落后远端 1 个 commit（`8d0de6c chore: add package-lock.json`），
没有 `package-lock.json` 时之前安装过一次，结果异常被手动改名为 `node_modules_bad`。

**修复步骤**：
1. `git pull` 拉取 `package-lock.json`
2. `npm install` 成功安装 458 个依赖，0 漏洞

**相关文件**：`package-lock.json`（远端已有，本地补齐）

---

### 1.2 端口冲突 — 红线建立

**根因**：`.env.local` 中 `PORT=3010 / VITE_PORT=5183` 与 GoldenCrucible SaaS（session `codex-min-105-saas-shell`）的端口冲突。

**修复**：
- `.env.local` → `PORT=3002 / VITE_PORT=5174`（MarketingMaster 注册端口）
- `~/.vibedir/global_ports_registry.yml` → 新增 `claude-mhsdc-dc-mkt` session，旧 `jovial-elion` 标记 archived
- `docs/04_progress/rules.md` → 新增"端口管理 ⛔ 红线"章节（规则 63-67）

**已提交**：`7407ac7 chore(mkt): 新增端口管理红线规则 + AGENTS.md`

---

### 1.3 PROJECTS_BASE 路径迁移

**根因**：`.env.local` 中路径仍指向旧 Obsidian 路径：
```
/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects
```

**修复**：统一改为新路径：
```
/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects
```

**验证**：服务启动日志显示 `📂 Projects Base: /Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects` ✅

**说明**：架构设计正确，所有 server 模块均优先读 `process.env.PROJECTS_BASE`。
各文件 fallback 路径不一致（minor issue，不影响运行）。

**相关文件**：`.env.local`（gitignore，本地修改）

---

## 2. 功能 Bug 修复

### 2.1 营销大师 — 换文稿不 Reset 状态

**问题**：切换文稿后，旧的 TubeBuddy 评分数据仍显示，系统无法区分"延续会话"和"新文稿"。

**根因**：`marketingmaster_state.json` 中 `selectedScript` 字段未被记录（`undefined`），无法做文稿变化检测。

**修复**（`src/components/MarketingSection.tsx`）：
1. 引入 `useEffect` + `useRef` 监听 `scriptPath` 变化
2. **Legacy state**（`selectedScript` 为 undefined）→ 只回填，不清数据（保护现有测试数据）
3. **文稿变化**（storedPath ≠ scriptPath）→ Reset 为 `defaultMarketV3State` + 写入新 scriptPath
4. **所有 onUpdate** → 自动附带当前 `scriptPath`

**行为验证**：
| 场景 | 行为 |
|---|---|
| 当前 CSET-Seedance2 10 个候选词 | 保留（legacy backfill） |
| 切换到其他文稿 | 自动 Reset |
| 后续所有保存 | 自动记录 scriptPath |

---

## 3. 当前服务状态

| 服务 | 端口 | 状态 |
|---|---|---|
| 后端 (tsx) | 3002 | ✅ ONLINE |
| 前端 (vite) | 5174 | ✅ ONLINE |
| 项目数据路径 | `/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects` | ✅ 正确 |

---

## 4. 存疑 / 待办

- [ ] `scriptPath change detection` 修复尚未提交（初验进行中，暂缓 commit）
- [ ] server 各模块 fallback 路径不一致（`__dirname` vs `process.cwd()`），无实际影响，可技术债处理
- [ ] `test-director.ts:11` 仍有老路径硬编码（测试文件，低优先级）
- [ ] Director/ThumbnailMaster 的 skill 修改仍 unstaged，需在对应 worktree 提交
