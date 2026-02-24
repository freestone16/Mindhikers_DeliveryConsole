# Delivery Console — 开发进展 & 遗留问题

> **更新日期**: 2026-02-14 03:00 CST

---

## 1. 版本迭代历史

| 版本 | 日期       | 里程碑                                                        |
| ---- | ---------- | ------------------------------------------------------------- |
| v1.0 | 2026-02-10 | 初版：单项目（CSET-SP3 硬编码）五大模块 Dashboard             |
| v2.0 | 2026-02-11 | Shorts Publisher 模块：状态机 + OAuth + YouTube Upload        |
| v2.1 | 2026-02-12 | Link Video（手动关联视频）+ Marketing 数据导入 + File Browser |
| v2.2 | 2026-02-13 | **多项目热切换** + Docker 化开发环境                          |
| v3.0 | 2026-02-14 | **专家导航系统** + 文稿选择 + 半自动 Antigravity 集成           |

---

## 2. v2.2 已完成功能

### ✅ 多项目架构
- [x] 后端 `PROJECTS_BASE` 环境变量化（支持 Docker / 本地双模式）
- [x] `GET /api/projects` — 列出所有可用项目
- [x] `POST /api/projects/switch` — 运行时热切换（更新内存 + 重绑 watcher + 推送数据）
- [x] 前端 `Header.tsx` 项目选择器下拉框
- [x] Socket.IO `active-project` 事件通知
- [x] chokidar watcher 可重绑（切换项目时关闭旧 watcher，绑定新项目的 delivery_store.json）

### ✅ Docker 化开发环境
- [x] `Dockerfile.dev` — 统一开发容器（前后端合一，tini 信号处理）
- [x] `docker-compose.yml` — 单容器 + 精确卷挂载
  - 源码 `/app` (rw + HMR)
  - 项目数据 `/data/projects` (rw)
  - OAuth secrets `/app/secrets` (ro)
- [x] `Makefile` — Docker 快捷命令（init / dev / stop / rebuild / shell / clean）
- [x] `.env` + `.env.example` — 增加 `PROJECTS_BASE` 配置

### ✅ 之前版本已完成
- [x] 五大交付模块 UI（Director / Music / Thumbnail / Marketing / Shorts）
- [x] Socket.IO 实时数据同步
- [x] Shorts 完整状态机（draft → published）
- [x] Link Video: 本地文件浏览器选择 .mp4
- [x] Schedule: 日期/时间设定 + Marketing 数据一键导入
- [x] YouTube OAuth 流程（零持久化 Token）
- [x] YouTube Upload API 对接
- [x] 端口动态化（.env PORT 配置，OAuth redirect 跟随）

---

## 2.5 v3.0 已完成功能

### ✅ 专家导航系统
- [x] `src/config/experts.ts` — 专家配置（5 位专家）
- [x] `src/components/ExpertNav.tsx` — 顶部专家导航栏
- [x] `src/components/ExpertPage.tsx` — 专家页面容器
- [x] `src/components/experts/IdleState.tsx` — 未开始状态
- [x] `src/components/experts/PendingState.tsx` — 等待执行状态
- [x] `src/components/experts/CompletedState.tsx` — 已完成状态
- [x] `src/components/experts/FailedState.tsx` — 失败状态

### ✅ 文稿选择
- [x] `GET /api/scripts` — 扫描 02_Script/*.md
- [x] `POST /api/scripts/select` — 记录选中文稿
- [x] Header 文稿下拉选择器

### ✅ 半自动集成（方案 A）
- [x] `POST /api/experts/start` — 创建任务文件
- [x] 任务文件格式 `.tasks/expert_xxx.json`
- [x] 专家输出目录监听（chokidar）
- [x] 检测到新文件自动更新为已完成

### ✅ 后端变更
- [x] `delivery_store.json` 新增 `experts` 字段
- [x] 新增 `activeExpertId` 字段
- [x] Expert watchers 可重绑（切换项目时）

---

## 3. 验证状态

### 2026-02-13 本次验证结果

| 验证项          | 状态 | 详情                                                                 |
| --------------- | ---- | -------------------------------------------------------------------- |
| Docker 容器启动 | ✅    | `delivery-console-dev` 稳定运行                                      |
| 前端加载 (5173) | ✅    | 完整 Dashboard 渲染，深色主题正常                                    |
| 后端 API (3002) | ✅    | `/api/projects` 返回 6 个项目                                        |
| Socket.IO 连接  | ✅    | 底部状态栏 "Online"                                                  |
| 项目列表显示    | ✅    | 6 个项目均正确列出，ACTIVE 标记正常                                  |
| 项目热切换      | ✅    | CSET-SP3 → CSET-Seedance2 成功，数据正确更新                         |
| 数据加载正确性  | ✅    | CSET-SP3 (12%, Visual Concept 有内容) vs CSET-Seedance2 (0%, 空模板) |
| VirtioFS 卷挂载 | ✅    | 容器内正确读取宿主机 Projects/ 目录                                  |

### 未验证项

| 验证项            | 原因                           | 影响                 |
| ----------------- | ------------------------------ | -------------------- |
| OAuth 认证流程    | 需要用户手动操作 Google 授权页 | Upload 功能依赖此项  |
| YouTube Upload    | 依赖 OAuth                     | 核心发布功能待测     |
| Remotion 渲染触发 | 容器内未安装 Remotion 运行时   | 渲染路径暂不可用     |
| HMR 热更新        | 未做代码修改测试               | 理论上 VirtioFS 支持 |

---

## 4. 已知问题 & 遗留事项

### 🔴 Critical

| ID  | 问题                         | 影响                                        | 建议                                                               |
| --- | ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| C-1 | Agent 无法调用 Docker socket | macOS sandbox 拦截 `unix:///...docker.sock` | Agent 通过 HTTP 访问容器端口替代；Docker 操作由用户在 GUI/终端执行 |

### 🟡 Medium

| ID  | 问题                                                     | 影响                                    | 建议                                        |
| --- | -------------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| M-1 | `server/index.ts` L41 有重复的 `app.use(cors())`         | 无功能影响，代码质量                    | 删除 L41 的重复调用                         |
| M-2 | `useDeliveryStore.ts` Socket URL 硬编码 `127.0.0.1:3002` | Docker 内无影响（端口映射），但不够灵活 | 改为 `window.location.hostname` + 环境变量  |
| M-3 | `Header.tsx` 的 fetch URL 也硬编码 `localhost:3002`      | 同 M-2                                  | 统一为相对路径或环境变量                    |
| M-4 | Remotion 渲染流程在 Docker 中不可用                      | 容器内未安装 Chromium / Remotion 依赖   | 渲染任务仍需在宿主机执行，或扩展 Dockerfile |

### 🟢 Low / Backlog

| ID  | 问题                                             | 说明                                                  |
| --- | ------------------------------------------------ | ----------------------------------------------------- |
| L-1 | `delivery_store.json` → Markdown 骨架迁移        | 核心理念：让 Obsidian 也能原生编辑                    |
| L-2 | 多项目间共享 YouTube Auth Token                  | 目前切换项目后 token 仍有效（内存级），但逻辑上应隔离 |
| L-3 | Docker 生产部署优化                              | 当前 Dockerfile.dev 仅适合开发，生产版需多阶段构建    |
| L-4 | 旧 Dockerfile.backend / Dockerfile.frontend 清理 | 已被 Dockerfile.dev 取代，可删除                      |
| L-5 | A-Roll 扫描逻辑（已注释）                        | v2.0 切换到 Script-First 后禁用，待决定是否复用       |
| L-6 | 后台服务常驻方案                                 | LaunchAgent 开机自启 + Web 状态栏显示，搁置待定       |
| L-7 | Antigravity ↔ Web 通信桥梁                       | 文件触发方案（.tasks/*.json），需新建任务监听器       |

---

## 7. 架构级待设计事项 (v3.0+)

### 7.1 文稿驱动的专家调用架构

**问题**: 当前设计以 delivery_store.json 为中心，用户无法从文稿出发触发专家服务。

**目标流程**:
```
用户选择项目目录 → 系统读取 02_Script/*.md 文稿
    → 用户点选"导演大师/音乐大师/缩略图大师"
    → 触发 Antigravity Skill 生成方案
    → 方案存入项目目录
    → Web 展示方案供用户确认/修改
```

**核心组件**:
| 组件 | 职责 | 状态 |
|------|------|------|
| 项目创建向导 | 选择目录 → 以目录名为项目名 | 待开发 |
| 文稿识别 | 读取 02_Script/*.md | 待开发 |
| 任务触发器 | Web 写 .tasks/*.json | 待开发 |
| 任务监听器 | Antigravity 监听 → 调 skill | 待开发 |
| 方案展示 | Web 读取并展示专家输出 | 待开发 |

**设计文档**: 待编写

---

## 5. 文件变更日志（v2.2）

| 文件                        | 变更类型 | 说明                                      |
| --------------------------- | -------- | ----------------------------------------- |
| `Dockerfile.dev`            | **新建** | 统一开发容器                              |
| `docker-compose.yml`        | **重写** | 单容器 + 精确挂载                         |
| `Makefile`                  | **重写** | 新 Docker 命令集                          |
| `.env`                      | **修改** | 增加 `PROJECTS_BASE`                      |
| `.env.example`              | **修改** | 同上                                      |
| `server/index.ts`           | **修改** | `PROJECTS_BASE` 环境变量化 + 项目管理 API |
| `server/youtube-auth.ts`    | **修改** | `PROJECTS_BASE` 环境变量化                |
| `src/components/Header.tsx` | **重写** | 项目切换下拉框                            |

---

## 8. 文件变更日志（v3.0）

| 文件                        | 变更类型 | 说明                           |
| --------------------------- | -------- | ------------------------------ |
| `src/config/experts.ts`     | **新建** | 专家配置（5 位专家）           |
| `src/components/ExpertNav.tsx` | **新建** | 顶部专家导航栏                 |
| `src/components/ExpertPage.tsx` | **新建** | 专家页面容器                   |
| `src/components/experts/IdleState.tsx` | **新建** | 未开始状态 UI                  |
| `src/components/experts/PendingState.tsx` | **新建** | 等待执行状态 UI                |
| `src/components/experts/CompletedState.tsx` | **新建** | 已完成状态 UI                  |
| `src/components/experts/FailedState.tsx` | **新建** | 失败状态 UI                    |
| `src/types.ts`             | **修改** | 新增 ExpertStatus, ExpertWork  |
| `src/App.tsx`              | **重写** | 集成专家导航系统               |
| `server/index.ts`           | **修改** | Experts API + 输出目录监听     |

---

## 6. 下一步建议优先级

1. **验证专家导航系统** — 点击开始 → Antigravity 执行 → 检测结果
2. **验证 OAuth + Upload 流程** — 确认端口修复后 token 交换正常
3. **统一 API 地址配置** — 解决 M-2/M-3，使用 Vite 环境变量或相对路径
4. **清理旧 Docker 文件** — 删除 `Dockerfile.backend` + `Dockerfile.frontend`
5. **方案 B: Antigravity 扩展** — 开发自动执行 skill 的扩展
