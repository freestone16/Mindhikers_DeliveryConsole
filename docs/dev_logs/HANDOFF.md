# 交接快照 | 2026-03-20

> **每次会话结束时覆盖写此文件（不累积）**
> 新会话启动时第一个读此文件，30 秒恢复上下文

---

## 📍 当前状态

| 项目 | 状态 |
|---|---|
| 分支 | `MHSDC-DC-director`（或 main worktree） |
| 服务 | 待启动（见启动命令） |
| 当前版本 | v4.3.0-wip |
| WIP 任务 | Director Chatbox联动 + 上传入口 + 项目列表修复 |
| 代码状态 | ⚠️ 4个文件已改动，**未 commit** |

---

## ⚠️ 未 commit 的改动（必须先了解）

| 文件 | 改动摘要 |
|---|---|
| `server/index.ts` | 新增 `request-expert-hydration` handler；项目过滤 `CSET-` 前缀；`PROJECTS_BASE` 已切换 |
| `src/hooks/useExpertState.ts` | listener 注册后主动 emit `request-expert-hydration` |
| `src/components/DirectorSection.tsx` | `isInitialSelection` 保护，空→实际项目不触发重置 |
| `src/components/director/ChapterCard.tsx` | 上传入口改为 `requiresUpload` 即显示；类型标签可点击 |

---

## ❌ 待解决问题（按优先级）

### 问题1：预览图生成导致服务器崩溃 🔴 高优
- **现象**：点击预览图 → `POST /api/director/phase2/thumbnail` → 500 → 服务器进程 crash
- **排查方向**：
  - `server/remotion-api-renderer.ts` 或 `server/director.ts` thumbnail 路由的 uncaught exception
  - 可能是 Remotion CLI 路径问题、props 解析失败
  - 需要捕获 crash stack trace（启动时用 `tee` 保存日志）

### 问题2：Chatbox 修改类型后前端不刷新 🟡 中优
- **现象**：chatbox 发送"2-2 请转换成互联网素材"→ 系统回复"成功"→ 但左侧类型标签不更新
- **已确认正常**：后端黑名单模型（IMMUTABLE_FIELDS）已允许 type 字段更新；双通道广播已实现
- **疑似根因**（三选一）：
  1. `DirectorSection` 的 `localChapters` state 覆盖了 server broadcast
  2. `chat-action-result` 未正确携带 expertState（检查 `server/index.ts` 的 `chat-action-execute` handler）
  3. 前端 `applyUpdate` 的数据解包逻辑不对
- **调试入口**：在 `chat-action-execute` handler 打日志确认 expertState 是否附加

### 问题3：上传入口验证 🟢 低优
- **已改代码**：`requiresUpload` 不再依赖 `isChecked`
- **待验证**：`UPLOAD_REQUIRED_TYPES` 是否包含 `artlist`；上传 POST 是否成功；previewUrl 是否更新

---

## 🌍 环境信息

```
PROJECTS_BASE=/Users/luzhoua/Mindhikers/Mindhikers_workspace/Projects
测试项目：CSET-Seedance2
后端端口：3005
前端端口：5178（Vite proxy）
```

---

## 🚀 启动命令

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/Director
# 杀残留进程
lsof -i :3005 -t | xargs kill -9 2>/dev/null; lsof -i :5178 -t | xargs kill -9 2>/dev/null
# 启动后端（捕获 crash 日志）
npx tsx server/index.ts 2>&1 | tee /tmp/director-server.log &
# 启动前端
npx vite --port 5178 &
```

---

## 📅 今日日志

→ `docs/dev_logs/2026-03-20.md`

---

## 🔗 参考文档

- 版本里程碑：`docs/04_progress/dev_progress.md`
- 精炼规则：`docs/04_progress/rules.md`（Rule 100 最新）
- 历史归档：`docs/dev_logs/archive/pre-2026-03-20_full_history.md`
