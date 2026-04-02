# Delivery Console — 开发进展 & 遗留问题

> **更新日期**: 2026-03-22 CST

---

## 1. 版本迭代历史

| 版本   | 日期       | 里程碑                                                                                               |
| ------ | ---------- | ---------------------------------------------------------------------------------------------------- |
| v1.0   | 2026-02-10 | 初版：单项目（CSET-SP3 硬编码）五大模块 Dashboard                                                    |
| v2.0   | 2026-02-11 | Shorts Publisher 模块：状态机 + OAuth + YouTube Upload                                               |
| v2.1   | 2026-02-12 | Link Video（手动关联视频）+ Marketing 数据导入 + File Browser                                        |
| v2.2   | 2026-02-13 | **多项目热切换** + Docker 化开发环境                                                                 |
| v3.0   | 2026-02-14 | **专家导航系统** + 文稿选择 + 半自动 Antigravity 集成                                                |
| v3.1   | 2026-02-28 | **Remotion 新模板赋能** - 强制 template 字段 + 4 个新模板可用                                        |
| v3.2   | 2026-02-28 | **导演大师 Phase 2/3 重构** - 预审流程 + 渲染二审 + XML 生成                                         |
| v3.3   | 2026-03-01 | **Phase2/3 细节优化** - 进度显示、评论提交、列表头、章节名、预览图质量                               |
| v3.4   | 2026-03-01 | **Worktree 环境修复** - launch.json 注入正确 PROJECTS_BASE/SKILLS_BASE；抢救提交昨日 1799 行丢失进度 |
| v3.5   | 2026-03-03 | **火山引擎视频生成集成** - 文生视频 API + 文生图预览 + OldYang Skill 更新                            |
| v3.6   | 2026-03-03 | **火山引擎文生图预览修复** - 修复尺寸限制（2560x1440, 16:9）+ 响应数据路径解析                       |
| v3.8.0 | 2026-03-03 | 进程健壮性、状态持久化、UI 优化、布局升级                                                            |
| v3.9.0 | 2026-03-04 | **火山引擎配置修复** - 修复 API Key 格式（添加连字符）+ 使用模型名称而非 endpoint ID                 |
| v4.0.0 | 2026-03-06 | **SD-207 V3 营销大师全量重构** - 5 Sprint 完成；TubeBuddy Playwright、SSE 生成、Phase 2 审阅、双格式导出 |
| v4.1.0 | 2026-03-11 | **导演大师自动化测试 + Chatbox反馈修复 + 渲染压测** — 详见下方 |
| v4.1.1 | 2026-03-15 | **导演大师 LLM 网关统一** - Phase1/2/3、反馈改写、Chatbox 动作提示词重生统一跟随 `global` 模型配置，修复局部代码误读 `config.provider/model` 的漂移问题 |
| v4.1.2 | 2026-03-15 | **项目根目录动态解析修复** - 修复 `chat.ts` 在 dotenv 生效前缓存 `PROJECTS_BASE`，导致 `/api/scripts` 等链路误判 `02_Script` 不存在、右上角文稿下拉为空 |
| v4.1.3 | 2026-03-15 | **项目路径解析正式收口** - 新增 `server/project-paths.ts` 作为共享路径 SSOT，统一替换 `index/chat/director/shorts/market/assets/xml/distribution/upload/youtube-auth` 等模块内分散的 `PROJECTS_BASE/getProjectRoot` 实现，杜绝不同链路各自 fallback 导致的路径漂移 |
| v4.1.4 | 2026-03-15 | **导演主链路前置校验 + worktree 环境基线恢复** - 从旧主仓恢复当前 worktree 的 `.env`，为 Director Phase1/Phase2 和动作改写链路增加全局 provider key 前置校验，并把“交给用户测试前必须先自测主链路、保持服务在线”写入规约 |
| v4.1.5 | 2026-03-16 | **Director × OpenCode 测试协作试点** - 新增 `testing/director` 请求/认领/回报/状态目录协议、OpenCode worker 脚本与启动命令，建立“Codex/Claude 写 request、OpenCode 执行测试、规划端读取报告”的零中继工作流，并落地首个 Phase1 smoke request |
| v4.1.6 | 2026-03-16 | **Director 真实验收协议收紧** - 将 OpenCode 执行 prompt、操作手册与 Director 队列规则升级为“硬通过判据”，新增 `TREQ-2026-03-16-DIRECTOR-003-phase1-real-validation`，要求同时验证页面完成态、提案正文与 `phase1_视觉概念提案` 写盘时间戳，避免再用“无报错”冒充通过 |
| v4.1.7 | 2026-03-16 | **浏览器验收切换到 Agent Browser** - 根据用户纠正，将测试协议里所有真实页面交互默认收紧为 `agent browser` 优先，并新增 `TREQ-2026-03-16-DIRECTOR-004-phase1-real-validation-agent-browser` 作为当前 Director Phase1 权威 request |
| v4.1.8 | 2026-03-16 | **OpenCode 锁库恢复流程固化** - 排查并确认 `database is locked` 并非活进程占用，而是异常退出后的 SQLite WAL 残留；通过 `pragma wal_checkpoint(full)` 恢复数据库可读，并将恢复步骤写入 OpenCode 初始化手册、rules 与 lessons |
| v4.1.9 | 2026-03-16 | **OpenCode Agent Browser 真链路补齐** - 确认仅安装 skill 不足以启用浏览器执行，补装 `agent-browser` CLI 与 Chrome 二进制，并用本地 `5178` 页面完成最小烟雾验证与截图取证，正式打通 OpenCode 侧 Agent Browser 基础能力 |
| v4.2.0 | 2026-03-16 | **“协调opencode测试”统一口令落地** - 把 OpenCode 协作测试协议上收到项目级规则：以后在项目目录里只要说“协调opencode测试”，代理默认读取 `testing/README.md`、`testing/OPENCODE_INIT.md` 和模块级 `testing/<module>/README.md`，直接接管测试队列 |
| v4.2.1 | 2026-03-16 | **“协调opencode测试”语义纠偏** - 根据用户纠正，将该口令收紧为“只做环境 ready，不自动开跑”；代理完成 testing 文档读取与队列接管后，必须等待用户明确说明下一步计划 |
| v4.2.2 | 2026-03-16 | **Director 冷启动项目态恢复修复** - 修复页面刷新后新 socket 未自动恢复 active project，导致右上角文稿下拉空白、Phase2 测试未开始的问题；统一复用 socket 项目态 hydrate 逻辑，并以 Agent Browser 完成真实页面验证 |
| v4.2.3 | 2026-03-16 | **MIN-89 测试治理父任务补强** - 将 `Director 协调测试与验收治理` 从简短条目扩成真正的父 issue：补齐仓库文档索引、用途、当前状态、边界、验收目标，并挂载配套 Linear 文档与子 issue，便于后续 handoff 和跨模块复用 |
| v4.2.4 | 2026-03-22 | **Distribution MIN-101 收口** - 跑通真实 YouTube success-path；修复成功结果回写、OAuth token 热重载丢失、默认公开视频风险，并以 `TREQ-2026-03-22-DISTRIBUTION-005` 完成黄金验收 |
| v4.2.5 | 2026-03-22 | **Distribution MIN-102 + MIN-103A 收口** - Queue 接入 SSE 实时可观测性并完成统一验收；`Publish Composer` 的 `Magic Fill` 切换到真实 Marketing / Script 数据源，支持 `sourceFiles / platformOverrides` 入队，验收见 `TREQ-2026-03-22-DISTRIBUTION-006 / 009 / 010` |
| v4.2.6 | 2026-03-22 | **Distribution MIN-103B/C 收口** - 新增 `X` 与 `微信公众号` connector，一期以 `artifact_ready / draft_ready` 模式写入项目内 `06_Distribution/outbound/`；Queue 联调通过，验收见 `TREQ-2026-03-22-DISTRIBUTION-011` |
| v4.2.7 | 2026-03-22 | **Distribution 前端 IA 重排完成** - 参考 Mixpost 的信息架构，将 Distribution 宿主切到”左栏二级模块 / 中间主业务 / 右栏控制与解释”布局；`Publish Composer / Queue / Accounts Hub` 已完成第一版黄金坩埚同系 UI 收口，其中 Accounts Hub 进一步补齐账号健康总览与风险工作台 |
| v4.2.8 | 2026-04-02 | **全局 Theme System 重设计** - 9 套主题（霓虹赛博 / 极光深林 / 日出晨曦 / 深海耀斑 / 复古迈阿密 / 赤热熔岩 / 极简高反差 / 星云全息 / 坩埚暖白）；外层 app shell 随主题整体切换背景；ThemeConfigPage 全部去硬编码，浅/深色方案并存；useTheme 兜底与 localStorage 旧 ID 校验防黑屏；commit `5a51df1` |

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
- [x] YouTube OAuth 流程（现已支持本地 token 落盘保活）
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

## 2.6 v3.1 已完成功能

### ✅ Remotion 新模板赋能（SD202）
- [x] **Phase 1**: 增强 Schema 验证 - 强制 LLM 输出 `template` 字段
- [x] **Phase 2**: 优化 Prompt - 新模板（TextReveal、NumberCounter、ComparisonSplit、TimelineFlow）置于优先位置
- [x] **Phase 3**: 在 userMessage 中添加模板 JSON 输出示例
- [x] **Phase 4**: 修复 CinematicZoom 占位图 URL（localhost → Unsplash）
- [x] **Phase 5**: 添加智能模板推荐函数（基于内容关键词）

### ✅ 验证流程更新
- [x] 更新计划文档验证路径为通用方式（PROJECT_NAME 变量）
- [x] 服务重启验证

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

| ID      | 问题                                   | 影响                                        | 建议                                                               | 状态                  |
| ------- | -------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ | --------------------- |
| C-1     | Agent 无法调用 Docker socket           | macOS sandbox 拦截 `unix:///...docker.sock` | Agent 通过 HTTP 访问容器端口替代；Docker 操作由用户在 GUI/终端执行 | Open                  |
| ~~C-2~~ | ~~Phase2 火山引擎文生图预览失败~~      | ~~100% 失败，无法生成预览图~~               | ~~根本原因：VOLCENGINE_ACCESS_KEY 格式错误（缺少连字符）~~         | **✅ 已修复 (v3.9.0)** |
| ~~C-3~~ | ~~Phase2 视频方案策划 LLM 调用不稳定~~ | ~~生成方案时偶发失败~~                      | ~~需检查：超时机制、重试逻辑、错误处理~~                           | **⚠️ 待观察**          |

### 🟡 Medium

| ID  | 问题                                                     | 影响                                    | 建议                                        |
| --- | -------------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| M-1 | `server/index.ts` L41 有重复的 `app.use(cors())`         | 无功能影响，代码质量                    | 删除 L41 的重复调用                         |
| M-2 | `useDeliveryStore.ts` Socket URL 硬编码 `127.0.0.1:3002` | Docker 内无影响（端口映射），但不够灵活 | 改为 `window.location.hostname` + 环境变量  |
| M-3 | `Header.tsx` 的 fetch URL 也硬编码 `localhost:3002`      | 同 M-2                                  | 统一为相对路径或环境变量                    |
| M-4 | Remotion 渲染流程在 Docker 中不可用                      | 容器内未安装 Chromium / Remotion 依赖   | 渲染任务仍需在宿主机执行，或扩展 Dockerfile |

### 🟢 Low / Backlog

| ID   | 问题                                             | 说明                                                           |
| ---- | ------------------------------------------------ | -------------------------------------------------------------- |
| L-1  | `delivery_store.json` → Markdown 骨架迁移        | 核心理念：让 Obsidian 也能原生编辑                             |
| L-2  | 多项目间共享 YouTube Auth Token                  | 目前切换项目后 token 仍有效（内存级），但逻辑上应隔离          |
| L-3  | Docker 生产部署优化                              | 当前 Dockerfile.dev 仅适合开发，生产版需多阶段构建             |
| L-4  | 旧 Dockerfile.backend / Dockerfile.frontend 清理 | 已被 Dockerfile.dev 取代，可删除                               |
| L-5  | A-Roll 扫描逻辑（已注释）                        | v2.0 切换到 Script-First 后禁用，待决定是否复用                |
| L-6  | 后台服务常驻方案                                 | LaunchAgent 开机自启 + Web 状态栏显示，搁置待定                |
| L-7  | Antigravity ↔ Web 通信桥梁                       | 文件触发方案（.tasks/*.json），需新建任务监听器                |
| L-8  | ~~火山引擎文生视频集成~~                         | ✅ v3.5 已完成：`renderVolcVideo` 函数已实现完整的 API 调用     |
| L-9  | 前端文件上传实现                                 | Phase3View 中的文件选择对话框需要完整实现                      |
| L-10 | 可视化时间线编辑器                               | Phase 3 可以考虑添加时间线编辑器，让用户手动调整 B-roll 时间码 |
| L-11 | 批量操作优化                                     | 可以考虑添加批量 Pass/Skip、批量重新渲染等操作                 |

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
| 组件         | 职责                        | 状态   |
| ------------ | --------------------------- | ------ |
| 项目创建向导 | 选择目录 → 以目录名为项目名 | 待开发 |
| 文稿识别     | 读取 02_Script/*.md         | 待开发 |
| 任务触发器   | Web 写 .tasks/*.json        | 待开发 |
| 任务监听器   | Antigravity 监听 → 调 skill | 待开发 |
| 方案展示     | Web 读取并展示专家输出      | 待开发 |

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

| 文件                                        | 变更类型 | 说明                          |
| ------------------------------------------- | -------- | ----------------------------- |
| `src/config/experts.ts`                     | **新建** | 专家配置（5 位专家）          |
| `src/components/ExpertNav.tsx`              | **新建** | 顶部专家导航栏                |
| `src/components/ExpertPage.tsx`             | **新建** | 专家页面容器                  |
| `src/components/experts/IdleState.tsx`      | **新建** | 未开始状态 UI                 |
| `src/components/experts/PendingState.tsx`   | **新建** | 等待执行状态 UI               |
| `src/components/experts/CompletedState.tsx` | **新建** | 已完成状态 UI                 |
| `src/components/experts/FailedState.tsx`    | **新建** | 失败状态 UI                   |
| `src/types.ts`                              | **修改** | 新增 ExpertStatus, ExpertWork |
| `src/App.tsx`                               | **重写** | 集成专家导航系统              |
| `server/index.ts`                           | **修改** | Experts API + 输出目录监听    |

---

## 8. 文件变更日志（v3.1）

| 文件                                     | 变更类型 | 说明                                               |
| ---------------------------------------- | -------- | -------------------------------------------------- |
| `server/llm.ts`                          | **修改** | 强制 template 字段验证、添加示例、智能模板推荐函数 |
| `server/skill-loader.ts`                 | **修改** | 优化 Prompt，新模板优先级提升，添加适用场景关键词  |
| `server/director.ts`                     | **修改** | CinematicZoom 占位图从 localhost URL 改为 Unsplash |
| `.claude/plans/hidden-dancing-melody.md` | **修改** | 验证路径改为通用 PROJECT_NAME 变量                 |

---

## 9. v3.2 已完成功能

### ✅ 导演大师 Phase 2/3 重构（SD-202）
- [x] **类型扩展** - 新增 `BRollReviewStatus`, `BRollRenderStatus`, `RenderJob_V2`, `ExternalAsset` 等类型
- [x] **SRT 解析器** - `server/srt-parser.ts`，支持时间码转换、片段提取
- [x] **外部素材加载 API** - `server/assets.ts`，支持文件上传、文件复制、Finder 集成
- [x] **XML 生成 API** - `server/xml-generator.ts`，Final Cut Pro XML 标准格式
- [x] **Phase 2 预审 API** - 新增 3 个端点（review, select, ready）
- [x] **Phase 3 渲染 API** - 新增 7 个端点（start-render, render-status, rerender, approve, load-asset, assets, generate-xml）
- [x] **Phase2View 重构** - 预审流程，支持 5 类 B-roll 审阅
- [x] **Phase3View 重构** - 渲染及二审流程，支持外部素材加载、XML 生成
- [x] **Remotion 渲染集成** - `renderRemotionVideo` 函数，串行渲染
- [x] **文件上传支持** - `handleUploadedFile` 函数，支持视频文件上传

### ✅ 核心流程
- **Phase 2 预审**：
  - B-roll 类型选择（5 类：remotion, seedance, artlist, internet-clip, user-capture）
  - 章节级预审，支持 Pass/Skip 操作
  - Remotion/Seedance：预览图生成
  - Artlist/互联网/用户素材：文案编辑器

- **Phase 3 渲染及二审**：
  - 渲染时即二审状态，视频出来一个审一个
  - Remotion 和文生视频串行渲染
  - 支持重新渲染（删除旧文件）
  - 外部素材加载（支持文件上传和本地路径）
  - Final Cut Pro XML 生成

---

## 11. 文件变更日志（v3.3）

| 文件                                               | 变更类型 | 说明                                                        |
| -------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `docs/02_design/remotion_spatial_layout_engine.md` | **新建** | Remotion空间排版引擎完整设计文档                            |
| `server/director.ts`                               | **修改** | 初始进度不发送数字，等方案生成后更新                        |
| `server/llm.ts`                                    | **修改** | Prompt强化：每章最少3个方案，添加 ⚠️ 警告                    |
| `server/remotion-api-renderer.ts`                  | **修改** | 预览图优化：frame=50, scale=1.5, quality=90，增强错误日志   |
| `src/components/director/ChapterCard.tsx`          | **修改** | 列表头"缩略图预览"→"预览图"，章节名去重，添加Ctrl+Enter提交 |

### ✅ v3.3 已完成功能

#### Phase2/3 细节优化
- [x] **初始进度优化** - 不显示无意义的"0/0"，等方案生成后再显示真实数量
- [x] **评论提交优化** - 添加 Ctrl+Enter 快捷键，placeholder提示用户
- [x] **列表头优化** - "缩略图预览"改为"预览图"
- [x] **章节名优化** - 去掉"第X章"前缀，避免重复显示
- [x] **预览图质量优化** - frame=50, scale=1.5, jpeg-quality=90
- [x] **错误日志增强** - 详细的命令、props、stdout、stderr输出

#### 文档补全
- [x] **Remotion空间排版引擎设计文档** - 完整记录架构、矛盾分析、升级方案、下一步价值

---

## 13. 文件变更日志（v3.5 - v3.6）

| 文件                          | 变更类型 | 说明                                                            |
| ----------------------------- | -------- | --------------------------------------------------------------- |
| `server/volcengine.ts`        | **修改** | 修复文生图尺寸限制（1024x1024→2048x2048），修复响应数据路径解析 |
| `server/director.ts`          | **修改** | 文生视频 API 集成，预览图生成端点调用火山引擎                   |
| `docs/04_progress/lessons.md` | **修改** | 新增 L-002：火山引擎文生图预览生成失败的教训                    |

### ✅ v3.5-v3.6 已完成功能

#### 火山引擎视频生成集成
- [x] **文生视频 API** - `generateVideoWithVolc`、`pollVolcVideoResult`、`downloadVideo`
- [x] **文生图预览** - `generateImageWithVolc`、`pollVolcImageResult`
- [x] **Director Phase 2/3 集成** - 文生视频渲染流程、预览图生成端点
- [x] **OldYang Skill 更新** - 更新 Skill 知识库

#### v3.6 火山引擎文生图预览修复
- [x] **修复尺寸限制** - 默认尺寸从 1024x1024 改为 2560x1440（16:9，满足 ≥ 3686400 像素要求）
- [x] **修复响应解析** - 适配火山引擎实际返回结构 `{ data: [ { url: "..." } ] }`
- [x] **兼容性写法** - 支持多种数据路径，提高鲁棒性
- [x] **分辨率比例修正** - 从 1:1 正方形（2048x2048）改为 16:9 横向（2560x1440），符合影视导演需求
- [x] **验证成功** - 测试生成成功，状态正确显示 `completed`

---

## 14. 文件变更日志（v3.8）

| 文件                                                          | 变更类型 | 说明                                                                                        |
| ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `skills/RemotionStudio/src/BrollTemplates/ConceptChain.tsx`   | **修改** | 溢出防爆修复：nodes 硬上限截断、标签折行、描述截断、Zod 约束                                |
| `skills/RemotionStudio/src/BrollTemplates/SegmentCounter.tsx` | **新建** | 赛博朋克/LCD 质感数字翻页器（前后缀、光晕特效）                                             |
| `skills/RemotionStudio/src/BrollTemplates/TerminalTyping.tsx` | **新建** | MacOS 风格黑客终端框，真实代码逐字敲打效果                                                  |
| `skills/RemotionStudio/src/shared/theme.ts`                   | **新建** | 多主题皮肤系统（5 大渐变主题：deep-space/warm-gold/sci-fi-purple/forest-green/crimson-red） |
| `skills/RemotionStudio/src/index.tsx`                         | **修改** | 新组件渲染端挂载                                                                            |
| `skills/RemotionStudio/src/schemas/index.ts`                  | **修改** | 新增 segmentCounterSchema 和 terminalTypingSchema                                           |
| `server/skill-loader.ts`                                      | **修改** | Director Prompt 注入新组件契约指南和 Theme 控制器                                           |
| `server/director.ts`                                          | **修改** | SegmentCounter 和 TerminalTyping 加入 supportedCoreTemplates 白名单                         |
| `docs/dev_logs/2026-03-03_SD202_Remotion_Extension_v3.7.md`   | **新建** | Remotion 扩展 v3.7 完整开发日志                                                             |

### ✅ v3.7 已完成功能

#### Remotion 组件扩展 v3.7
- [x] **ConceptChain 溢出防爆修复** (Module 0)：
  - 强制设置 `nodes.slice(0, 5)` 硬上限截断
  - 标签启用折行 (`whiteSpace: normal`) 并增加 `maxWidth` 约束
  - 超过 18 字的 `desc` 强制执行截断补省略号
  - Zod Schema 添加 `.min(2).max(5)` 强校验
- [x] **多主题皮肤系统基建** (Module 1A)：
  - 新建 `src/shared/theme.ts`，支持 5 大精选渐变主题
  - 10 个核心 B-roll 组件全面引入 `theme` 参数
  - 自动适配 `currentTheme.bg`、`currentTheme.text`、`currentTheme.accent` 等属性
- [x] **SegmentCounter 新组件** (Module 2A)：
  - 赛博朋克 / LCD 质感的数字翻页器
  - 支持前后缀 (`prefix`, `suffix`)
  - 带有 `textShadow` 的光晕特效
- [x] **TerminalTyping 新组件** (Module 2B)：
  - MacOS 风格的黑客终端框
  - 实现真实的代码逐字敲打效果
  - 可调节参数与光标闪烁逻辑
- [x] **Director 后端全链路集成** (Module D)：
  - 组件暴露：在 `src/index.tsx` 和 `BrollTemplates/index.ts` 完成渲染端挂载
  - Zod Schema：新增 `segmentCounterSchema` 与 `terminalTypingSchema`
  - Director Prompt：在 `server/skill-loader.ts` 中详细注入新组件的契约指南和 Theme 控制器
  - 白名单联通：成功将 `SegmentCounter` 与 `TerminalTyping` 追加至 `supportedCoreTemplates` 白名单

---

## 12. 文件变更日志（v3.2）

| 文件                                     | 变更类型 | 说明                                    |
| ---------------------------------------- | -------- | --------------------------------------- |
| `src/types.ts`                           | **修改** | 新增 Phase 2/3 重构类型定义             |
| `server/srt-parser.ts`                   | **新建** | SRT 字幕解析器                          |
| `server/assets.ts`                       | **新建** | 外部素材加载 API                        |
| `server/xml-generator.ts`                | **新建** | Final Cut Pro XML 生成器                |
| `server/director.ts`                     | **修改** | 新增 Phase 2/3 API 端点，集成渲染逻辑   |
| `server/index.ts`                        | **修改** | 注册新增的 API 端点，配置文件上传中间件 |
| `src/components/director/Phase2View.tsx` | **重写** | 重构为预审流程                          |
| `src/components/director/Phase3View.tsx` | **重写** | 重构为渲染及二审流程                    |
| `src/components/DirectorSection.tsx`     | **修改** | 适配新的 Phase 2/3 组件接口             |

### ✅ 依赖包安装
- [x] `subtitle` - SRT 字幕解析库
- [x] `@types/subtitle` - TypeScript 类型定义
- [x] `uuid` - 唯一 ID 生成
- [x] `@types/uuid` - TypeScript 类型定义

---

## 12. 下一步建议优先级

### v3.3 待办事项（2026-03-01）

1. **验证 Remotion 预览图** - 确认空间排版引擎已生效，预览图不再单调
2. **修复 Remotion 预览图生成失败** - 根据增强的错误日志诊断问题
3. **改造剩余4个Remotion模板** - NumberCounter, TimelineFlow, DataChartQuadrant, CinematicZoom 应用 fitText
4. **增强导演大师 Prompt** - 添加动画时长、视觉增强参数说明
5. **质量压测** - 用极端文案长度测试所有模板

---

## 13. 文件变更日志（v3.2）

1. **验证 Phase 2 预审流程** — 测试完整的 B-roll 类型选择 → 方案生成 → 预览图生成 → 审阅流程
2. **验证 Phase 3 渲染流程** — 测试 Remotion 和文生视频渲染 → 渲染进度查询 → 二审落盘
3. **验证 XML 生成** — 测试 SRT 字幕读取 → B-roll 时间线编排 → Final Cut Pro XML 生成
4. **验证文件上传功能** — 测试前端文件选择对话框 → 后端文件接收 → 项目目录复制
5. **集成火山引擎文生视频** - 完成 `renderVolcVideo` 函数的 API 集成
6. **统一 API 地址配置** — 解决 M-2/M-3，使用 Vite 环境变量或相对路径
7. **清理旧 Docker 文件** — 删除 `Dockerfile.backend` + `Dockerfile.frontend`

---

## 11. 文件变更日志（v3.3）

| 文件                                               | 变更类型 | 说明                                                        |
| -------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `docs/02_design/remotion_spatial_layout_engine.md` | **新建** | Remotion空间排版引擎完整设计文档                            |
| `server/director.ts`                               | **修改** | 初始进度不发送数字，等方案生成后更新                        |
| `server/llm.ts`                                    | **修改** | Prompt强化：每章最少3个方案，添加 ⚠️ 警告                    |
| `server/remotion-api-renderer.ts`                  | **修改** | 预览图优化（frame=50, scale=1.5, quality=90），增强错误日志 |
| `src/components/DirectorSection.tsx`               | **修改** | loadingProgress 初始值从 '0/0' 改为 ''                      |
| `src/components/director/ChapterCard.tsx`          | **修改** | 列表头"缩略图预览"→"预览图"，章节名去重，添加Ctrl+Enter提交 |

---

### ✅ v3.3 已完成功能

#### Phase2/3 细节优化
- [x] **初始进度优化** - 不显示无意义的"0/0"，等方案生成后再显示真实数量
- [x] **评论提交优化** - 添加 Ctrl+Enter 快捷键，placeholder提示用户
- [x] **列表头优化** - "缩略图预览"改为"预览图"
- [x] **章节名优化** - 去掉"第X章"前缀，避免重复显示
- [x] **预览图质量优化** - frame=50, scale=1.5, jpeg-quality=90
- [x] **错误日志增强** - 详细的命令、props、stdout、stderr输出

#### 文档补全
- [x] **Remotion空间排版引擎设计文档** - 完整记录架构、矛盾分析、升级方案、下一步价值

#### 待办
- 验证 Remotion 预览图生成
- 修复 Remotion 预览图生成失败
- 改造剩余4个Remotion模板
- 增强导演大师 Prompt

---

## 12. 文件变更日志（v3.3）

---

### ✅ v3.4 已完成功能（2026-03-01）

#### Worktree 环境修复
- [x] **launch.json 路径修复** - 在 worktree 环境下通过 `env` 字段注入正确的 `PROJECTS_BASE` 和 `SKILLS_BASE`，解决 Projects 路径指向 worktree 内部错误位置的问题
- [x] **Sync Failed 修复** - Skills Synced (6) 正常，项目列表正常加载
- [x] **昨日进度抢救提交** - 1799行未提交修改（21个文件）全部 commit 保存，包含 Phase2/3 重构、管线引擎、新设计文档

#### 开发者体验
- [x] **Claude Code 用量监控** - 为 Pro 订阅用户配置 statusline，终端底部实时显示 `Context: XX% used`

#### 待办（v3.5 下一步）
- [ ] 验证 Remotion 预览图生成（四个新模板：TextReveal、NumberCounter、ComparisonSplit、TimelineFlow）
- [ ] 修复 Remotion 预览图生成失败问题
- [ ] 预览图内容升级：从文字卡片升级为真实 Composition 渲染帧
- [x] ~~火山引擎 AI 图像接入（seedance/generative 类型）~~ ✅ v3.5 已完成
- [ ] 改造剩余4个Remotion模板应用 fitText

## 13. 文件变更日志（v3.4）

| 文件                      | 变更类型 | 说明                                                                |
| ------------------------- | -------- | ------------------------------------------------------------------- |
| `.claude/launch.json`     | **修改** | 注入 `PROJECTS_BASE`/`SKILLS_BASE` env 变量，修复 worktree 路径问题 |
| `~/.claude/settings.json` | **修改** | 配置 statusline 显示 Context 用量百分比                             |

---

## 14. 文件变更日志（v3.5）

| 文件                                         | 变更类型 | 说明                                                                          |
| -------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `server/volcengine.ts`                       | **修改** | 新增视频生成 API（generateVideoWithVolc, pollVolcVideoResult, downloadVideo） |
| `server/director.ts`                         | **修改** | renderVolcVideo 实现真正的火山引擎视频生成调用                                |
| `~/.config/opencode/skills/OldYang/SKILL.md` | **修改** | 新增 §7 项目协议遵循，引用 CLAUDE.md 工作流约定                               |

### ✅ v3.5 已完成功能（2026-03-03）

#### 火山引擎视频生成集成
- [x] **generateVideoWithVolc** - 提交视频生成任务到火山引擎 API
- [x] **pollVolcVideoResult** - 轮询视频生成任务状态
- [x] **downloadVideo** - 下载生成的视频到本地
- [x] **renderVolcVideo** - 完整的视频生成流程（提交→轮询→下载）
- [x] **预览图策略** - seedance 类型使用文生图作为预览（非视频抽帧）

#### API 端点
- 视频生成: `POST /api/v3/contents/generations/tasks`
- 状态查询: `GET /api/v3/contents/generations/tasks/{taskId}`

#### 待办（v3.6 下一步）
- [ ] 验证 Remotion 预览图生成（四个新模板）
- [ ] 修复 Remotion 预览图生成失败问题
- [ ] 预览图内容升级：从文字卡片升级为真实 Composition 渲染帧
- [ ] 改造剩余4个Remotion模板应用 fitText
- [x] ~~修复 node_modules 平台不匹配问题~~ ✅ 已完成（`rm -rf node_modules && npm install`）

#### OldYang Skill 更新
- [x] 新增 §7 项目协议遵循 - 检测并遵循项目根目录 `CLAUDE.md`
- [x] 强调 Lessons 机制的重要性
- [x] 优先级：CLAUDE.md 项目约定 > OldYang 通用规则

---

## 15. 文件变更日志（v3.7.1）

| 文件                              | 变更类型 | 说明                                                                             |
| --------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `server/index.ts`                 | **修改** | 新增 `getAppVersion()` 函数，自动从 git log 提取版本号；新增 `/api/version` 接口 |
| `src/components/StatusFooter.tsx` | **修改** | 版本号改为动态获取，启动时调用 `/api/version`                                    |
| `src/config/version.ts`           | **删除** | 不再需要手动配置版本号                                                           |

### ✅ v3.8.0 已完成功能（2026-03-03）

#### 进程健壮性升级
- [x] **优雅关闭模块** - 实现 GracefulShutdown 类，处理信号和清理资源
- [x] **健康检查端点** - GET /health 返回状态、运行时间、内存信息
- [x] **端口检查工具** - 启动前验证 3002/5173 端口占用
- [x] **预览启动脚本** - 支持优雅关闭的前后端启动脚本
- [x] **PM2 配置** - 生产环境进程管理配置
- [x] **package.json 脚本** - dev:clean, dev:check, dev:force, preview, pm2:*

#### 状态持久化
- [x] **types.ts** - 添加 activeModule 字段到 DeliveryState
- [x] **ShortsSection** - phase 变更同步到全局 store
- [x] **MarketingSection** - phase 变更同步到全局 store
- [x] **App.tsx** - activeExpertId 和 activeModule 持久化
- [x] **server/index.ts** - 初始状态包含 activeModule

#### UI 优化
- [x] **Phase 2 进度显示** - 已实现，显示 `正在为你的剧本生成视觉方案... ⏱ 已用时 MM:SS`
- [x] **写作大师前移** - CrucibleHome 组件已存在，集成到 App.tsx

#### 布局升级
- [x] **RightPanel 组件** - Tab 切换、360px 宽度、动画过渡
- [x] **ChatPanel 重构** - 移除固定定位，可被 RightPanel 包裹
- [x] **App.tsx 集成** - 右侧面板状态管理
- [x] **Socket.IO Room 隔离** - socket-to-project 映射，io.to() 广播

---

## 17. 文件变更日志（v3.8 - Batch 1）

| 文件                          | 变更类型 | 说明                                                                   |
| ----------------------------- | -------- | ---------------------------------------------------------------------- |
| `server/graceful-shutdown.ts` | **新建** | 优雅关闭管理器类，支持 SIGTERM/SIGINT 处理、Socket.IO 关闭、子进程清理 |
| `server/health.ts`            | **新建** | 健康检查端点（/health, /health/ready, /health/live）                   |
| `scripts/check-port.js`       | **新建** | 端口占用检查工具，支持 3002 和 5173 端口                               |
| `scripts/preview.js`          | **新建** | 预览启动脚本（后端+前端+优雅关闭）                                     |
| `ecosystem.config.cjs`        | **新建** | PM2 进程管理配置（生产环境）                                           |
| `logs/.gitkeep`               | **新建** | 日志目录占位文件                                                       |
| `server/index.ts`             | **修改** | 集成 GracefulShutdown 和 setupHealthCheck                              |
| `package.json`                | **修改** | 更新 scripts（dev:clean, dev:check, dev:force, preview, pm2:*）        |

### ✅ v3.8 Batch 1 已完成功能（2026-03-03）

#### 进程健壮性升级
- [x] **优雅关闭模块** - 实现 GracefulShutdown 类，处理信号和清理资源
- [x] **健康检查端点** - GET /health 返回状态、运行时间、内存信息
- [x] **端口检查工具** - 启动前验证 3002/5173 端口占用
- [x] **预览启动脚本** - 支持优雅关闭的前后端启动脚本
- [x] **PM2 配置** - 生产环境进程管理配置
- [x] **package.json 脚本** - dev:clean, dev:check, dev:force, preview, pm2:*

#### 验证结果
- ✅ TypeScript 编译成功
- ✅ 端口检查脚本正常工作
- ✅ 健康检查端点返回正确数据

---

## 17. 文件变更日志（v3.8 - Batch 1）

| 文件                          | 变更类型 | 说明                                                                   |
| ----------------------------- | -------- | ---------------------------------------------------------------------- |
| `server/graceful-shutdown.ts` | **新建** | 优雅关闭管理器类，支持 SIGTERM/SIGINT 处理、Socket.IO 关闭、子进程清理 |
| `server/health.ts`            | **新建** | 健康检查端点（/health, /health/ready, /health/live）                   |
| `scripts/check-port.js`       | **新建** | 端口占用检查工具（3002, 5173）                                         |
| `scripts/preview.js`          | **新建** | 预览启动脚本（后端+前端+优雅关闭）                                     |
| `ecosystem.config.cjs`        | **新建** | PM2 进程管理配置（生产环境）                                           |
| `logs/.gitkeep`               | **新建** | 日志目录占位文件                                                       |
| `server/index.ts`             | **修改** | 集成 GracefulShutdown 和 setupHealthCheck                              |
| `package.json`                | **修改** | 新增 scripts（dev:clean, dev:check, dev:force, preview, pm2:*）        |

### ✅ v3.8 Batch 1 已完成功能（2026-03-03）

#### 进程健壮性升级
- [x] **优雅关闭模块** - 实现 GracefulShutdown 类，处理信号和清理资源
- [x] **健康检查端点** - GET /health 返回状态、运行时间、内存信息
- [x] **端口检查工具** - 启动前验证 3002/5173 端口占用
- [x] **预览启动脚本** - 支持优雅关闭的前后端启动脚本
- [x] **PM2 配置** - 生产环境进程管理配置
- [x] **package.json 脚本** - dev:clean, dev:check, dev:force, preview, pm2:*

#### 验证结果
- ✅ TypeScript 编译成功
- ✅ 健康检查端点正常返回数据
- ✅ 端口检查脚本正常工作

---

## 18. 最新状态（2026-03-03）

### 当前版本
- **主分支版本**: v3.7.1 (待更新为 v3.8)

## 19. 文件变更日志（v3.8 - Batch 2）

| 文件                                  | 变更类型 | 说明                                                        |
| ------------------------------------- | -------- | ----------------------------------------------------------- |
| `src/types.ts`                        | **修改** | DeliveryState 添加 activeModule 字段                        |
| `src/components/ShortsSection.tsx`    | **修改** | phase 变更通过 handlePhaseChange 同步到全局 store           |
| `src/components/MarketingSection.tsx` | **修改** | phase 变更通过 handlePhaseChange 同步到全局 store           |
| `src/App.tsx`                         | **修改** | 添加 activeModule 同步逻辑，handleModuleChange 更新全局状态 |
| `server/index.ts`                     | **修改** | ensureDeliveryFile 初始状态添加 activeModule: 'delivery'    |

### ✅ v3.8 Batch 2 已完成功能（2026-03-03）

#### 状态持久化
- [x] **types.ts** - 添加 activeModule 字段到 DeliveryState
- [x] **ShortsSection** - phase 变更同步到全局 store
- [x] **MarketingSection** - phase 变更同步到全局 store
- [x] **App.tsx** - activeExpertId 和 activeModule 持久化
- [x] **server/index.ts** - 初始状态包含 activeModule

#### 验证结果
- ✅ TypeScript 编译成功
- **最新提交**:
  - `44596a6` - feat(v3.8): 进程健壮性升级、状态持久化、UI 优化、布局升级
  - `db270f6` - refactor: 版本号改为从git log自动获取，无需手动配置 (保持不变)

### 已验证功能
- ✅ Phase 2 B-roll 方案生成（错误处理已修复）
- ✅ 版本号自动显示（无需手动配置）
- ✅ SSE 错误消息正确传递到前端

## 20. 文件变更日志（v3.8 - Batch 3）

| 文件                              | 变更类型   | 说明                                             |
| --------------------------------- | ---------- | ------------------------------------------------ |
| `src/components/CrucibleHome.tsx` | **已存在** | 黄金坩埚首页组件，包含写作大师和苏格拉底对话入口 |
| `src/App.tsx`                     | **修改**   | 导入 CrucibleHome，替换黄金坩埚占位 UI           |

### ✅ v3.8 Batch 3 已完成功能（2026-03-03）

#### UI 优化
- [x] **Phase 2 进度显示** - 已实现，显示 `正在为你的剧本生成视觉方案... ⏱ 已用时 MM:SS`
- [x] **写作大师前移** - CrucibleHome 组件已存在，集成到 App.tsx

#### 验证结果
- ✅ TypeScript 编译成功

---

## 21. 文件变更日志（v3.8 - Batch 4）

| 文件                                  | 变更类型 | 说明                                                            |
| ------------------------------------- | -------- | --------------------------------------------------------------- |
| `src/components/RightPanel.tsx`       | **新建** | 右侧面板组件，Tab 切换、收起/展开动画                           |
| `src/components/ChatPanel.tsx`        | **修改** | 移除固定定位外层，可被 RightPanel 包裹                          |
| `src/components/ChatToggleButton.tsx` | **保留** | 作为独立触发按钮使用                                            |
| `src/App.tsx`                         | **修改** | 导入 RightPanel，集成右侧面板逻辑                               |
| `server/index.ts`                     | **修改** | 添加 socket-to-project 映射，io.emit 改为 io.to(projectId).emit |

### ✅ v3.8 Batch 4 已完成功能（2026-03-03）

#### 右侧可收起面板
- [x] **RightPanel 组件** - Tab 切换、360px 宽度、动画过渡
- [x] **ChatPanel 重构** - 移除固定定位，可被 RightPanel 包裹
- [x] **App.tsx 集成** - rightPanelMode 状态管理

#### 多项目 Room 隔离
- [x] **Socket.IO Room 映射** - socket-to-projectMap 跟踪
- [x] **select-project Room 管理** - join/leave Room
- [x] **disconnect 事件处理** - 清理映射
- [x] **io.emit 改为 Room 广播** - 所有事件发送到特定项目 Room

#### 验证结果
- ✅ TypeScript 编译成功

---

## 22. 完整实施总结（v3.8）

| Batch   | Feature                 | 状态     |
| ------- | ----------------------- | -------- |
| Batch 1 | Feature 0: 进程健壮性   | ✅ 已完成 |
| Batch 2 | Feature 4: 状态持久化   | ✅ 已完成 |
| Batch 3 | Feature 2 + 5: UI 优化  | ✅ 已完成 |
| Batch 4 | Feature 1 + 3: 布局升级 | ✅ 已完成 |

### 下一步建议
1. **完整测试** - 验证所有功能的端到端行为
2. **版本更新** - 将版本号更新为 v3.8
3. **文档完善** - 补充缺失的设计文档

# Delivery Console 开发进度

> **最后更新**：2026-03-03

---

## 2026-03-03 - 白屏 + Phase 2 卡死问题

### 问题 1：App.tsx 白屏 - JS 语法错误
**症状**：页面纯白屏
**原因**：App.tsx 第 227 行使用了 `MessageCircle` 图标但未导入
```tsx
import { Loader2, Users, Send, Clock } from 'lucide-react'; // ← 缺少 MessageCircle
```
**修复内容**：添加 `MessageCircle` 到导入列表
```tsx
import { Loader2, Users, Send, Clock, MessageCircle } from 'lucide-react';
```
**受影响文件**：`src/App.tsx`（或当前正在使用的 App 文件）

**验证**：刷新浏览器，页面正常显示

---

### 问题 2：App.final.tsx 类型导入错误
**症状**：编译时提示 \`RightPanelMode\` 类型未导出
```tsx
import { RightPanel, RightPanelMode } from './components/RightPanel';
// 错误：RightPanelMode 是 type，需要用 import type
```
**修复内容**：使用 \`import type { RightPanelMode } from './components/RightPanel'\`;
**受影响文件**：`src/App.final.tsx`

**验证**：刷新浏览器，无编译错误

---

### 问题 3：项目切换时业务逻辑不完整，导致卡死在旧状态
**症状**：切换项目后，前端卡死无法操作，提示 "LLM 生成失败"
**根本原因**：后端 \`select-project\` 事件处理不完整
1. 设置了 \`projectId\` 和 \`lastUpdated\`
2. 发送了 socket 事件 \`delivery-data\`
3. **关键缺陷**：没有清除旧项目的临时状态文件（\`phase2_review_state.json\`）
4. 导致系统认为 Phase 2 还在进行中，前端卡在旧状态

**修复内容**：在 \`server/index.ts\` 的 \`select-project\` 事件处理中添加清除旧项目临时状态的逻辑：
```typescript
// 清除旧项目的临时状态文件（防止卡在旧状态）
const oldProjectId = socketToProjectMap.get(socket);
if (oldProjectId && oldProjectId !== projectId) {
    const oldProjectRoot = getProjectRoot(oldProjectId);
    try {
        // 清除 Director Phase 2 审阅状态
        const phase2ReviewPath = path.join(oldProjectRoot, '04_Visuals', 'phase2_review_state.json');
        if (fs.existsSync(phase2ReviewPath)) {
            fs.unlinkSync(phase2ReviewPath);
            console.log(\`[select-project] Cleared old phase2_review_state.json for \${oldProjectId}\`);
        }
    } catch (e) {
        console.error('Failed to clear old project state:', e);
    }
}
```
**受影响文件**：`server/index.ts`

**验证**：
1. 切换项目到新项目，检查是否成功清除旧项目状态
2. 切换回旧项目，确认 Phase 2 能重新开始

---

### 问题 4：Phase 2 LLM 生成持续失败 (fetch failed)
**症状**：Phase 2 启动后，提示 "LLM 生成失败"，重试2次后使用兜底方案，13 分钟后无响应
**根本原因**：SiliconFlow API 调用失败
1. API 返回 \`fetch failed\` 错误（通用错误信息）
2. 错误处理不完善，缺少详细错误信息
3. 缺少超时设置，请求可能卡住

**修复内容**：
1. **添加 30 秒超时设置**：在 \`server/llm.ts\` 的 \`callSiliconFlowLLM\` 函数中添加 AbortController 和超时逻辑
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => {
    controller.abort();
    console.error(\`[llm.ts] SiliconFlow API timeout after 30s\`);
}, 30000); // 30 秒超时

try {
    const response = await fetch(\`\${baseUrl}/chat/completions\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'Pro/moonshotai/Kimi-K2.5',
        messages,
        temperature: 0.7,
        signal: controller.signal,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(\`[llm.ts] SiliconFlow API error (\${response.status}):\`, error);
      throw new Error(\`SiliconFlow API error: \${error}\`);
    }
    
    const data = await response.json();
    clearTimeout(timeoutId);
    console.log(\`[llm.ts] SiliconFlow API response:\`, data.usage);
    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(\`[llm.ts] SiliconFlow API failed:\`, error.message);
    throw new Error(\`SiliconFlow API failed: \${error.message}\`);
  }
```
2. **增强错误日志**：记录 HTTP status 和详细错误信息
3. **添加调试日志**：记录 baseUrl 和 model

**受影响文件**：`server/llm.ts`

**验证**：
1. 运行 Phase 2 生成，观察日志输出
2. 检查是否在 30 秒内返回结果

---

### 问题 5：SiliconFlow 模型名称配置错误
**症状**：配置文件中模型名称为 \`Pro/moonshotai/Kimi-K2.5\`，但实际 API 调用失败
**根本原因**：配置的默认值与 API 不一致

**修复内容**：
1. 验证配置文件 \`llm_config.json\` 中的模型名称
2. 查询 SiliconFlow API 支持的模型列表（\`https://api.siliconflow.cn/v1/models\`）
3. 使用官方文档推荐的默认模型

**验证结果**：
```bash
curl -s "https://api.siliconflow.cn/v1/models" \
  -H "Authorization: Bearer $SILICONFLOW_API_KEY" \
  2>&1 | grep -E '"Pro/moonshotai/Kimi-K2.5"'
```
- 正确的模型 ID：\`Pro/moonshotai/Kimi-K2.5\`
```

**受影响文件**：
- \`.agent/config/llm_config.json\` - SiliconFlow 全局配置
- \`server/llm.ts\` - API 调用函数

---

### 问题 6：编辑工具多次失败，代码更新未生效
**症状**：直接编辑 \`server/llm.ts\` 文件时，Edit 工具因缩进或特殊字符导致匹配失败，代码未更新

**根本原因**：文件内容与预期不匹配，Edit 工具无法准确定修改位置

**修复内容**：
1. 使用 Bash 命本进行精确替换，避免特殊字符问题
2. 验证文件修改是否成功

**经验教训**：
- **编辑关键代码时使用脚本**：避免手动编辑可能引入的缩进或特殊字符问题
- **验证文件修改**：修改后使用 \`grep\` 确认内容已正确更新
- **备份重要文件**：编辑前先备份

---

## 待优化问题

### 1. 项目切换逻辑的原子性
**问题**：项目切换涉及多个文件更新（socket 房间、delivery_store.json、临时状态、监听器等），如果某个步骤失败可能导致状态不一致

**建议**：
- 考虑使用事务或队列确保项目切换的原子性
- 统一状态管理接口

### 2. LLM API 调用错误处理增强
**问题**：通用的 "fetch failed" 错误信息太泛，难以排查具体原因

**建议**：
- 区分不同类型的错误（网络超时、API 错误、解析错误）
- 添加更详细的错误分类和错误码

### 3. 前端白屏调试困难
**问题**：JS 语法错误可能导致整个应用无法启动

**建议**：
- 添加更严格的编译前检查
- 使用 TypeScript ESLint 等工具进行静态分析

### 4. 状态持久化机制验证
**问题**：依赖临时文件的状态可能导致状态残留

**建议**：
- 切换项目时强制清除所有临时状态
- 定期清理过期的临时文件

---

## 总结

本次修复涵盖了以下关键领域：

1. **前端语法错误修复** - 导入语句补全
2. **业务逻辑完善** - 项目切换时的状态清理机制
3. **LLM API 调用增强** - 超时保护、详细日志
4. **编辑工具使用** - 脚本修复方法

所有修复已经应用到代码中，服务器已重启。

**验证步骤**：
1. 刷新浏览器，确认前端正常显示
2. 切换到不同项目，验证状态正确重置
3. 运行 Director Phase 2 生成，验证 LLM API 调用是否正常工作

**文件变更记录**：
- 修改：\`src/App.final.tsx\` - 删除
- 修改：\`src/components/ChatPanel.tsx\` - 删除
- 修改：\`src/App.tsx\` - 添加
- 修改：\`server/llm.ts\` - 添加超时和详细日志
- 修改：\`server/index.ts\` - 添加清除旧项目状态逻辑
- 创建：\`docs/04_progress/lessons.md\` - 更新

---

## 2026-03-03 (后续修复)

### 问题 1: main.tsx 导入错误的 App.final.tsx
**症状**：重启后 Vite 报错 `Failed to resolve import "./App.final.tsx"`
**修复**：将 `main.tsx` 中的导入从 `./App.final.tsx` 改回 `./App.tsx`
**相关文件**：`src/main.tsx`

---

### 问题 2: Vite 缓存导致模块导入错误
**症状**：清除缓存后，`RightPanelMode` 仍然无法导入
**修复**：清除 Vite 缓存并重启开发服务器
```bash
rm -rf node_modules/.vite
npm run dev
```

---

### 问题 3: 类型导入错误 (最终修复)
**症状**：浏览器控制台报错 `does not provide an export named 'RightPanelMode'`
**根本原因**：`RightPanelMode` 是类型导出（`export type`），需要使用 `import type`
**修复**：
```typescript
// App.tsx
import { RightPanel } from './components/RightPanel';
import type { RightPanelMode } from './components/RightPanel';
```
**相关文件**：`src/App.tsx:19`

---

### 问题 4: SiliconFlow API 验证成功
**验证结果**：
```json
{
  "model": "Pro/moonshotai/Kimi-K2.5",
  "choices": [
    {
      "message": {
        "content": "Test received! 👋 I'm here and working."
      }
    }
  ]
}
```
- ✅ API Key 有效
- ✅ 模型正常响应
- ✅ 可以正常调用

---

### 待解决问题
1. **Phase 2 依旧显示 LLM 兜底方案** - 用户报告
2. **从 Phase 1 选择项目和文件，并不能从头开始项目进程** - 用户报告

---

**v3.9.0 修复记录（2026-03-04）**

### 问题1： Phase2 火山引擎文生图预览 100% 失败

**根本原因：**
1. API Key 格式错误：缺少连字符
   - 错误格式：`354e79c042194af48f784460ba54973`（31字符）
   - 正确格式：`354e79c0-4219-4af4-8f78-44460ba54973`（36字符，带连字符）
2. 使用了 endpoint ID 而非模型名称

**修复步骤：**
1. ✅ 修正 API Key 格式（添加连字符）
2. ✅ 更新模型配置：使用 `doubao-seedream-4-0-250828` 替代 endpoint ID
3. ✅ 验证 API 调用成功（返回图片 URL)

**验证命令：**
```bash
curl -X POST https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Authorization: Bearer 354e79c0-4219-4af4-8f78-44460ba54973" \
  -d '{"model":"doubao-seedream-4-0-250828","prompt":"测试图片","size":"2560x1440"}'
# 成功返回：{"data":[{"url":"https://..."}]}
```

**涉及文件：**
- `.env` - 修正 VOLCENGINE_ACCESS_KEY 格式
- `.env` - 更新 VOLCENGINE_ENDPOINT_ID_IMAGE 为模型名称
- `docs/04_progress/rules.md` - 添加规则 28-29
- `docs/04_progress/dev_progress.md` - 记录修复过程

**分支：** `fix/phase2-stability-issues`

---

### 问题2： Phase1 "转了转但界面没变"

**根本原因：**
- `server/llm.ts` 添加了 30 秒超时
- Phase1 生成概念提案需要 40-60 秒（读取 18KB 剧本 + 构建概念）
- 超时后 `type: 'done' 未发送，前端 `onUpdate` 未被调用

**历史对比：**
- main 分支/c9237d6 版本：无超时机制 → Phase1 正常工作
- 当前分支：添加 30 秒超时 → Phase1 失败

**修复方案：**
```bash
git checkout origin/main -- server/llm.ts  # 回退到无超时版本
```

**涉及文件：**
- `server/llm.ts` - 移除 30 秒超时限制

---

### 问题3： LLM_PROVIDER 被错误配置为 deepseek

**根本原因:**
- `.env` 文件中 `LLM_PROVIDER=deepseek`
- 用户一直使用的是 `siliconflow` 的 `Kimi-K2.5`

**修复方案：**
```bash
# .env
LLM_PROVIDER=siliconflow  # 修改前：deepseek
```

---

### 问题4： CSET-SP3 硬编码

**发现位置：**
- `src/components/PublishComposer.tsx:129` - `projectId: 'CSET-SP3'`
- `server/distribution.ts:293` - `const projectId = req.query.project as string || 'CSET-SP3'`

**修复方案：**
1. `PublishComposer.tsx` - 添加 `projectId` prop，移除硬编码
2. `distribution.ts` - 移除默认值，要求必须传递 `project` 参数

**涉及文件：**
- `src/components/PublishComposer.tsx`
- `server/distribution.ts`

---

### 新增功能： Phase1/Phase2 耗时统计

**实现位置：**
- `src/components/DirectorSection.tsx`
  - Phase1: 添加 `phase1StartTime` 计时
  - Phase1 done: 打印耗时日志
  - Phase2 done: 打印耗时日志

**日志格式：**
```
[Phase1] 🚀 开始生成概念提案...
[Phase1] ✅ 概念提案生成完成，耗时 45.3 秒
[Phase2] ✅ 视频方案生成完成，耗时 32.1 秒
```

**用途：** 开发阶段性能监控，后续可移除

---

### 🚨 未解决问题： Phase2 生成超过 10 分钟未完成

**现象：**
- Phase2 视频方案生成超过 10 分钟仍未完成
- LLM 配置已修正为 `siliconflow`
- 需要进一步调查

**可能原因：**
1. SiliconFlow API 响应慢
2. `generateGlobalBRollPlan` 函数处理逻辑问题
3. 网络连接问题

**下一步行动：**
- 检查 SiliconFlow API 响应时间
- 添加更详细的日志输出
- 考虑添加超时警告

---

## 待提交内容
- `.env` - 修正 LLM_PROVIDER 和火山引擎配置
- `server/llm.ts` - 回退到 main 分支版本（无超时）
- `src/components/DirectorSection.tsx` - 添加耗时统计
- `src/components/PublishComposer.tsx` - 移除 CSET-SP3 硬编码
- `server/distribution.ts` - 移除 CSET-SP3 硬编码
- `docs/04_progress/rules.md` - 新增规则 28-29
- `docs/04_progress/dev_progress.md` - 记录修复过程

---

**分支：** `fix/phase2-stability-issues`

**状态：** 🟡 Phase2 生成超时问题未解决，需要继续调查

---

## 2026-03-04 - Kimi k2.5 适配与缓存重置优化

### ✅ 已完成功能
1. **适配 Kimi k2.5 `max_tokens` 限制**
   - **现象**：全局模型切换至 `api.moonshot.cn/v1` 的 `kimi-k2.5` 后，Phase 1 生成稳定报错 (400 Bad Request)
   - **原因**：Kimi K2.5 对 `max_tokens` 入参不兼容过大值
   - **修复**：在 `server/llm.ts` `callKimiLLM` 中移除写死的 `max_tokens: 16384` 参数，顺利通行。

2. **全局重新选择脚本时物理清空缓存**
   - **需求**：只要项目和文件重新选择，所有后续 Phase 进度应该切断，从 Phase 1 重新来过
   - **实现**：在 `server/index.ts` `select-project` 及 `api/scripts/select` 中，除了清空 `delivery_store.json`，增加对其项目下 `04_Visuals` 内历史状态文件（`selection_state.json` / `phase2_review_state.json` / `phase3_render_state.json`）的物理删除 `fs.unlinkSync` 逻辑。

3. **Phase 1 概念提案本地落盘**
   - **需求**：Phase 1 Web 界面端生成的”视觉概念提案”必须以物理文件留存以做记录
   - **实现**：在 `server/director.ts` 的 `generatePhase1` 和 `reviseConcept` 方法中，自动将 Markdown 内容写入 `04_Visuals/phase1_视觉概念提案_${projectId}.md`

---

## v4.0.0 营销大师全量重构（SD-207 V3）— 2026-03-06

**5 Sprint 全部完成，commit: addb99a → f35df39 → b31934c**

### Sprint 1 — 基础设施
- `types.ts`：MarketModule_V3 全套类型（CandidateKeyword、KeywordVariant、DescriptionBlock、MarketingPlan 等）
- `MarketingSection.tsx`：重写为 2-Phase 编排器
- `App.tsx`：接入 MarketingMaster 专属路由
- Mock 数据 + 状态持久化验证

### Sprint 2 — Phase 1 前后端
- `MarketPhase1New.tsx`：三子步视图（候选词生成 → 评分 → 选择）
- `CandidateKeywordList.tsx`：含简繁体标识、增删、手动添加
- `KeywordScoreTable.tsx`：TubeBuddy 评分对比表 + 重试 + 时间显示 + 追加关键词
- `KeywordAnalysis.tsx`：LLM 策略点评卡片
- V3 API: `generate-candidates` / `score-candidates` / `score-single` / `analyze-keywords`（SSE + LLM）

### Sprint 3 — TubeBuddy Worker 升级
- `server/workers/tubebuddy-worker.ts`：完整 Playwright Web Dashboard 交互
- `CredentialManager`：30 分钟无活动自动清除 cookies/session
- `RateLimiter`：3s + 0-1.5s jitter，30次/session 上限
- `TB_SELECTORS`：配置化 CSS 选择器数组（易于适配 TubeBuddy DOM 变更）
- `TUBEBUDDY_DEV_MOCK=1` 开关 + `/api/market/dev/tubebuddy-test` 调试页面

### Sprint 4 — Phase 2 前后端
- `SRTUploader.tsx`：拖拽上传 .srt，SSE 解析章节时间轴
- `DescriptionEditor.tsx`：8 子区块独立可编辑（Markdown 警告 + Emoji 计数）
- `MarketPlanTable.tsx`：6 行审阅表格（inline 编辑 + 绿色对勾 + AI 重新生成）
- `MarketPhase2New.tsx`：完整 Phase 2 编排（dataRef 模式防 SSE 闭包泄漏）
- V3 API: `upload-srt` / `generate-plan` / `revise-row`

### Sprint 5 — 确认导出 + DefaultSettings + ConfirmBar
- `MarketConfirmBar.tsx`：底部确认栏，显示方案确认状态，一键绿色导出
- `POST /v3/confirm`：生成 `.md`（Obsidian 用，含 Markdown）+ `.plain.txt`（YouTube Studio 用，零 Markdown）保存至 `05_Marketing/`
- `GET/POST /v3/load-defaults` & `/save-defaults`：双写持久化（localStorage + JSON 文件）
- `MarketDefaultSettings.tsx`：完全受控表单，挂载时从 API 加载，保存时双写
- `MarketPhase2New.tsx`：接入 MarketConfirmBar，导出成功写入 savedOutputs

### 架构亮点
- **dataRef 模式**：SSE 流式更新中通过 `useRef(data)` 避免 stale closure
- **双格式输出**：.md（结构化存档）/ .plain.txt（分发终端直读）
- **session_expired 短路**：TubeBuddy 评分时遇 session 过期立即中止整批评分
- **slugify + stripMarkdown**：confirm 路由中对关键词生成安全文件名，对内容二次清洗

---

## v4.1.0 — 导演大师自动化测试 + Chatbox反馈修复 + 渲染压测 (2026-03-11)

### 🔧 Bug 修复

**1. Phase 2 Chatbox 反馈后缩略图自动刷新**
- **问题**：右侧 chatbox 提交反馈后，左侧缩略图没有变化
- **根因**：expert action 清除 `previewUrl = undefined` 后，前端没有自动触发重新生成
- **修复文件**：`src/components/director/ChapterCard.tsx`
  - 新增 `prevPreviewUrlRef` 追踪 previewUrl 变化
  - useEffect 检测 previewUrl 从有值变为 undefined 时，自动调用 `handleGenerateThumbnailWithPrompt()`
  - 移除 OptionRow 的 content-based key（`contentKey`），改用稳定的 `key={option.id}` 防止 React 重挂载导致 ref 丢失

**2. handleImportChapters 未设置 isConceptApproved**
- **问题**：通过"导入离线分镜 JSON"导入章节后，P2 按钮仍禁用
- **根因**：`handleImportChapters` 设置了 `phase: 2` 但没设置 `isConceptApproved: true`
- **修复文件**：`src/components/DirectorSection.tsx:376`
- **改动**：`onUpdate({ ...data, items: normalized, phase: 2, isConceptApproved: true })`

### 🤖 Playwright 自动化测试框架

**框架搭建**
- 工具：Playwright (Python) + headless Chromium
- 测试脚本：`docs/tests/director_auto_test.py`
- 测试数据：`docs/tests/test_chapters_fixture.json`（含 2 章 3 个选项 + previewUrl）
- 验收用例文档：`docs/tests/director_acceptance_tests.md`（20 个用例）

**最终成绩：28/29 PASS, 0 FAIL, 1 SKIP（预期）**

测试覆盖范围：
| 测试 | 内容 | 结果 |
|---|---|---|
| TC-G.4 | 底部状态栏 SYSTEM ONLINE + 版本号 | ✅ |
| TC-2.8 | P1/P2/P3/P4 导航按钮全部可点击且高亮 | ✅ |
| TC-1.1 | Phase 1 概念显示 | ✅ |
| TC-2.1 | 章节卡片布局（2章、表头、编号）| ✅ |
| TC-2.2 | 选项行（类型标签、模板建议、预览图）| ✅ |
| TC-2.4 | 缩略图 Lightbox 弹出 + ESC 关闭 | ✅ |
| TC-2.6 | 勾选框（点击/取消）| ✅ |
| TC-3.1 | Phase 3 布局（章节分组、通过计数、素材过滤）| ✅ |
| TC-4.1 | Phase 4 初始状态 | ✅ |
| TC-G.1 | Phase 导航一致性（数据不丢失）| ✅ |
| TC-G.2 | Chatbox 基本功能 | ✅ |

**关键技术解决**：
- `button:text-is('P2')` 精确匹配替代 `has-text` 子串匹配（防止匹配 "CSET-SP2"）
- `dismiss_dropdowns()` 选择下拉后按 Escape 关闭残留菜单
- `input[type='file']:not([accept])` 精确定位 Phase1 的导入输入框
- `force=True` + `scroll_into_view_if_needed` 处理视口外的缩略图点击

### 🔥 渲染管线压测

**压测脚本**：`docs/tests/stress_test_rendering.py`

**Remotion 30 个动画渲染**：
| 指标 | 结果 |
|---|---|
| 成功率 | 26/30 (87%) |
| 总耗时 | 12.5s |
| 吞吐量 | 124 任务/分钟 |
| 并发 Workers | 3 |
| 失败原因 | ConceptChain 模板 props 格式不兼容 (TypeError) |

**火山引擎 5 个视频生成**：
| 指标 | 结果 |
|---|---|
| 成功率 | 0/5 (全部超时) |
| 错误 | `timeout after 120s`，重试 2 次后仍超时 |
| 根因待查 | 120s 超时太短 / 轮询状态字段不匹配 / 并发限制 |

### ❗ 遗留问题（下次会话优先处理）

1. **ConceptChain 模板 props 修复**：压测中 4/30 失败，需查 Remotion ConceptChain 组件期望的 props 结构
2. **火山引擎视频生成跑通**：
   - 先单个任务跑通，确认 API 响应格式正确
   - 查官方文档确认并发/QPS 限制
   - 调大 `maxPolls` 超时（120s → 300s+）
   - 根据跑通数据设计合理队列策略（可能只允许 1-2 个并发）
3. **Phase 2 Chatbox → 缩略图自动刷新**：代码已修复但用户未验证效果

### 文件变更清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `src/components/director/ChapterCard.tsx` | **修改** | prevPreviewUrlRef + 自动重新生成 + 移除 contentKey |
| `src/components/DirectorSection.tsx` | **修改** | handleImportChapters 增加 isConceptApproved: true |
| `docs/tests/director_auto_test.py` | **新建** | Playwright 自动化测试脚本 (28/29 PASS) |
| `docs/tests/test_chapters_fixture.json` | **新建** | 测试 fixture 数据（2 章 3 选项 + previewUrl）|
| `docs/tests/director_acceptance_tests.md` | **新建** | 20 个验收测试用例文档 |
| `docs/tests/stress_test_rendering.py` | **新建** | 渲染管线压测脚本（30 Remotion + 5 火山引擎）|

### 2026-03-11 晚间补充：Phase3 火山视频已跑通

- **真实 smoke test 成功**：`CSET-Seedance2` 的单个 seedance 任务已完成闭环
- **根因确认**：
  - 火山查询成功态实际为 `status: succeeded`
  - 视频地址实际位于 `content.video_url`
  - 旧代码只识别 `completed` + `output/data.video_url`，导致成功任务被误判超时
- **后端修复**：
  - `server/volcengine.ts` 补充 `succeeded` 与 `content.video_url` 解析
  - `server/director.ts` 将 Phase3 火山轮询上限从 120 秒放宽到 300 秒
  - Phase3 成功后自动下载 MP4 到项目目录，统一走本地 `video-file` endpoint 播放
  - Volcengine 批量默认串行（`VOLCENGINE_VIDEO_CONCURRENCY=1`）
- **实测数据**：
  - taskKey: `volc-smoke-002-volc-smoke-002-opt1`
  - startedAt: `2026-03-11T03:08:17.033Z`
  - completedAt: `2026-03-11T03:10:49.850Z`
  - 总耗时：约 153 秒
  - 输出文件：`video_volc-smoke-002-volc-smoke-002-opt1.mp4`
  - 文件大小：15,855,612 bytes
  - 视频时长：5.05 秒
- **并发结论**：
  - 代码先从“全并发”收敛到“默认串行”
  - 官方文档已确认异步任务状态包含 `queued/running/succeeded/failed/expired`
  - 暂未找到官方公开的“最多可同时提交几个视频任务”的明确数值上限，后续如需提速，建议从 2 并发开始压测而不是直接恢复 `Promise.all`

### 2026-03-11 夜间补充：Phase2 Chatbox 更新与缩略图刷新闭环修复

- **用户现场问题**：
  - 右侧 Chatbox 执行 `update_option_fields` 后，左侧 `1-1` 缩略图仍显示旧图
  - `2-1 / 2-2` 要切成互联网素材时，Chatbox 显示成功，但左侧类型不变
- **根因拆分**：
  - 后端 `server/expert-actions/director.ts` 的 `update_option_fields` 之前没有处理 `updates.type`，导致工具执行成功但结构字段被静默丢弃
  - 前端 `src/components/director/ChapterCard.tsx` 之前只监听 `option.previewUrl`，但很多预览图只存在卡片本地 state；当 Chatbox 只改 `props/prompt/type` 时，`previewUrl` 常常仍是 `undefined -> undefined`，因此不会自动失效旧图
- **代码修复**：
  - `server/expert-actions/director.ts`
    - `update_option_fields` 现已支持 `type/template/infographic*` 等结构字段更新
    - 只要渲染输入变化，就统一清除旧 `previewUrl`
  - `src/components/director/ChapterCard.tsx`
    - 新增渲染输入签名比较，不再只靠 `previewUrl` 变化判断
    - 当本地已有旧预览，而 `props/prompt/imagePrompt/type/template` 发生变化时，自动清空旧图并重新生成；若改成 `internet-clip/user-capture`，则直接切到上传素材态
- **验证结果**：
  - `src/components/director/ChapterCard.test.tsx`：2/2 通过
    - 覆盖 `previewUrl` 被清空后自动重生
    - 覆盖 `previewUrl` 未持久化但渲染输入变化后自动重生
  - `src/__tests__/director-adapter.test.ts`：1/1 通过
    - 覆盖 `update_option_fields` 修改 `type` 并失效旧预览
  - 无头浏览器 UI smoke：通过
    - 将 Phase2 中第 2 章两条卡片切为 `internet-clip` 后，页面成功出现 `6` 个 `🌐 互联网素材建议` 占位，证明类型切换链路已恢复

### 2026-03-11 深夜补充：Director 状态分叉与模板字段未接线修复

- **新增根因确认**：
  - Director 当前存在两份状态源：`04_Visuals/director_state.json` 与 `delivery_store.json.modules.director`
  - Phase2 新生成方案通过 `update-expert-data` 写进 `director_state`，但之前不会同步回 `delivery_store`
  - Chatbox 的骨架索引与 expert action 却依赖 `delivery_store`，因此出现“左侧看到的是新方案，Chatbox 理解的是旧方案”的分叉
- **用户现场表现**：
  - `1-2` 左侧仍显示文生视频，但 Chatbox 却认为它已经是 `internet-clip`
  - `1-1` 要求“金句一行显示”时，模型在改 `TextReveal` 相关字段，但页面/文件可能还停在旧模板或旧状态
- **修复内容**：
  - `server/index.ts`
    - 新增 Director expert state -> `delivery_store.modules.director` 的同步
    - 在 `select-project` 时做一次修复性对齐，避免骨架索引继续读旧数据
  - `src/components/DirectorSection.tsx`
    - 当服务端 authoritative `items` 更新且当前不在 Phase2 流式生成中时，自动清掉 `localChapters`，避免左侧继续显示旧列表
  - `server/chat.ts`
    - 强化 Director Chat 系统提示：用户明确说“改成互联网素材/文生视频/Remotion/和 1-3 一样的互联网素材”时，必须直接调用 `update_option_fields`，不要继续追问
  - `server/expert-actions/director.ts`
    - 明确把 `type` 等结构字段写入 tool description，减少模型误判
  - `RemotionStudio/src/BrollTemplates/TextReveal.tsx`
    - 补上 `singleLine/noWrap/textStyle/containerWidth/paddingX/paddingY` 支持，让“一行显示 + 缩边距”真正落到模板渲染
- **当前项目状态已对齐**：
  - `ch1-opt1` 已改成 `TextReveal` + 单行参数
  - `ch1-opt2` 已改成 `internet-clip`
  - `director_state.json` 与 `delivery_store.json` 已一致

### 2026-03-11 深夜补充：刷新误重置到 Phase1 的入口修复与 Phase2 恢复

- **用户现场问题**：
  - 页面刷新后无法直接回到 Director Phase2，只能从 Phase1 重新开始
- **根因确认**：
  - `src/components/DirectorSection.tsx` 之前把 `scriptPath: "" -> "02_Script/..."` 的初始化 hydrate 误判成“切文稿”
  - 因此在项目和脚本刚加载完成时，前端会立即发一份 `phase: 1, items: []` 的重置状态，把已存在的 Phase2 方案覆盖掉
- **代码修复**：
  - Director 的自动重置逻辑已改成只在“已有非空上下文 -> 另一个非空上下文”之间触发
  - 初始刷新时的空值 hydrate 不再清空 Phase2
- **状态恢复**：
  - 使用 `04_Visuals/selection_state.json` 作为恢复源，将 `CSET-Seedance2` 的 Director 状态重新对齐为 `phase: 2 + 7章`
  - 同时把用户明确要求的两处现场修改一并落回：
    - `ch1-opt1` 维持 `TextReveal` 单行显示参数
    - `ch1-opt2` 改成 `internet-clip`
- **验证结果**：
  - `director_state.json`：`phase = 2`，`items = 7`
  - `delivery_store.json.modules.director`：`phase = 2`，`items = 7`
  - 无头浏览器页面文本已可见 `Phase 2: 初审`、章节列表以及 `1-2` 的 `🌐 互联网素材`

### 2026-03-11 夜间补充：Phase2 统计数字统一 + 一键批量渲染已选预览

- **UI 细节修正**：
  - `src/components/director/Phase2View.tsx` 中 `筛选结果` 与 `全局总计` 两块数字现统一为同一套 `tabular-nums + 粗体大号` 样式
  - 避免出现 `22 / 33` 两组数字字号和视觉节奏不一致的问题
- **新功能**：
  - 在 Phase2 顶部工具栏右侧新增 `渲染所有已选预览` 按钮
  - 直接复用既有 `handleRenderChecked()` / `/api/director/phase2/render_checked` 流程
  - 按钮只统计并触发可渲染类型（`remotion / seedance / generative / infographic`），不会把 `internet-clip / user-capture` 计入渲染数
  - 批量任务启动后按钮会自动进入 disabled，避免重复触发
- **验证结果**：
  - `src/components/director/Phase2View.test.tsx`：1/1 通过
  - `src/components/director/ChapterCard.test.tsx`：2/2 通过

### 2026-03-11 夜间补充：只修 1-2 TextReveal 不换行 bug

- **现场问题**：
  - 用户通过 Chatbox 对 `1-2` 提“文字不要换行”，工具显示成功，但预览仍然换行
- **根因确认**：
  - 旧提示和工具调用容易把“不换行”写成 `props.whiteSpace = "nowrap"`
  - 但外部 `TextReveal` 模板真正识别的是 `singleLine / noWrap / textStyle.whiteSpace`，单写 `whiteSpace` 不会稳定生效
- **修复内容**：
  - `server/expert-actions/director.ts`
    - 新增 TextReveal no-wrap 标准化逻辑
    - 当 update_option_fields 收到 `whiteSpace/noWrap/singleLine` 相关意图时，统一收敛成可渲染的单行 props 组合
  - `server/chat.ts`
    - 修正 Director Chat 提示，不再建议写模糊字段，明确要求生成 `singleLine/noWrap/containerWidth/paddingX/textStyle.whiteSpace`
  - `server/director.ts`
    - 在 Remotion 预览构建时补一层兼容标准化，自动兜住历史遗留的 `whiteSpace = nowrap` 旧数据
  - 项目状态修正：
    - 将 `CSET-Seedance2` 的 `ch1-opt2` 直接改回 `TextReveal` 单行版
    - 清除旧 previewUrl，并通过 socket 推送给当前在线客户端
- **验证结果**：
  - `src/__tests__/director-adapter.test.ts`：2/2 通过

### 2026-03-12 上午补充：Director 问题边界重定义（以 Skill 为主，不在系统层硬编码）

- **用户原则确认**：
  - Phase2 的 6 类 B-roll 后续会持续出现大量具体修改需求
  - 这类模板/排版/提示词细节不应由 DeliveryConsole 系统层逐条硬编码兜底
  - 正确责任层应回到 Skill，系统只负责把 Skill 的结果可靠呈现到中部 UI
- **本轮 review 结论**：
  - `RemotionStudio` 渲染层本身具备 `TextReveal` 的单行/不换行能力
  - 但 `Director` Skill 的 `resources/remotion_catalog.md` 目前没有把这类 props 契约正式暴露给模型
  - Chatbox 链路也没有完整走 `skill-loader.ts` 这套 Director Skill 资源注入，因此模型执行 `update_option_fields` 时缺少模板契约上下文
  - 所以当前问题的根因优先级是：
    1. Director Skill 能力定义不完整
    2. Chat -> Tool 链路没有完整吃到 Skill 资源
    3. 中部 UI 只是忠实呈现了前面写入的不标准状态
- **下一轮正确动作**：
  - 回退我这轮新增的系统层模板硬编码兜底思路
  - 改 Director Skill（尤其 `resources/remotion_catalog.md`，必要时补 `prompts/`）
  - 检查并修正 Chatbox 链路，让它真正使用 Director Skill 的资源知识
  - 然后重新验证“Skill 正确产出后，中部 UI 是否自然呈现”

### 2026-03-12 中午补充：Director Skill 注入链路整改落地

- **整改目标**：
  - 不再让 DeliveryConsole 系统层手写 `TextReveal/no-wrap` 纠偏知识
  - 让 Director Chatbox 真正加载 Antigravity Director Skill 的 `prompts/resources`
  - 保留系统层通用职责：工具调用、状态写盘、预览失效、前端同步
- **Skill 侧变更**：
  - 已备份 Antigravity 原 skill 到当前 worktree：
    - `.vibedir/skill_drafts/director_20260312_snapshot/`
  - 为 Director Skill 新增 `prompts/chat_edit.md`
    - 明确 Chatbox 编辑既有 B-roll 时必须走工具调用
    - 明确 `chapterId/optionId` 必须从骨架索引提取
    - 明确 `template/props` 修改必须遵循 `resources/remotion_catalog.md`
  - 扩充 `resources/remotion_catalog.md`
    - 为 `TextReveal` 增补单行/不换行的合法 props 示例与字段纪律
  - 更新 `SKILL.md`
    - 明确 DeliveryConsole Chatbox 编辑态应走 Skill prompt，而不是依赖系统层兜底
- **DeliveryConsole 侧变更**：
  - `server/chat.ts`
    - Director Chat 的 system prompt 改为 `buildDirectorSystemPrompt('chat_edit')`
    - 删除原来手写在系统层的 Director 模板提示词
  - `server/skill-loader.ts`
    - 支持加载 `chat_edit` prompt
    - 修复并补齐资源占位符替换：`AESTHETICS_GUIDELINE` / `ARTLIST_DICTIONARY`
  - `server/expert-actions/director.ts`
    - 删除 TextReveal/no-wrap 自动标准化
    - `update_option_fields` 保留为通用写盘工具，新增通用深度合并 props
  - `server/director.ts`
    - 删除 Remotion 预览构建时对 TextReveal props 的系统层纠偏
  - 删除未再使用的 `server/director-option-normalizer.ts`
- **验证结果**：
  - `src/__tests__/director-adapter.test.ts`：2/2 通过
  - `src/components/director/ChapterCard.test.tsx`：2/2 通过
  - `buildDirectorSystemPrompt('chat_edit')` 运行时验证通过：
    - 已确认从 `~/.gemini/antigravity/skills/Director/prompts/chat_edit.md` 组装成功
    - 已确认 `remotion_catalog` 与 `artlist_dictionary` 资源已注入
- **结论**：
  - Director Chatbox 现在已经不再依赖手写 system prompt 去解释模板字段
  - 后续若再出现模板字段错误，优先修 Director Skill 契约，而不是继续往 DeliveryConsole 系统层堆特判

### 2026-03-12 下午补充：基于“Skill + 桥梁层 + UI”边界的 Director 排错方案

- **本轮用户原则进一步澄清**：
  - DeliveryConsole 不是专家本体，不能把导演大师的修改能力硬编码在系统层
  - 但 DeliveryConsole 也不是纯透传；它必须理解项目 UI 语义，承担 Skill 与中部 UI 之间的桥梁职责
  - 因此 Director 问题不能再简单二分为“Skill”或“系统层”，而应拆成三段：
    1. `Skill` 负责导演语义理解与专业判断
    2. `DeliveryConsole 桥梁层` 负责把专家意图翻译成项目内部状态和 UI 行为
    3. `UI` 负责忠实反馈、确认、取消、继续输入与历史展示

- **本轮验收暴露的问题归类**：
  - `Skill` 侧：
    - 对 `1-4` 的类型修改语义理解不稳定
    - 对“互联网素材 / 我自己上传 / D”这类混合表达缺少稳定决策规则
  - `桥梁层` 侧：
    - 当前让模型直接生成 `update_option_fields` 的底层参数，桥梁过薄
    - `A/B/C/D/E/F` 与内部 `type` 没有被系统显式接管
    - 确认卡片只显示 `update_option_fields`，没有把真实将执行的 UI 修改翻译给用户
  - `UI` 侧：
    - ChatPanel 在 streaming 时直接禁用输入框，用户无法边想边改
    - assistant 回复存在重复追加风险
    - tool confirm / history 的保存链路会混入 `[System Log: Executed tool ...]` 这类噪音

- **下一轮排错方案（只处理 Director）**：
  - **第一步：补 Director 桥梁层，而不是继续堆系统层特判**
    - 为 Director 建立显式语义桥接动作，避免直接让 Skill 产出底层 raw patch
    - 桥梁层需内建并维护：
      - `1-4 -> chapterId / optionId`
      - `A=remotion / B=seedance / C=artlist / D=internet-clip / E=user-capture / F=infographic`
      - “互联网素材”“用户截图/录屏/自己上传”等别名到内部 `type` 的统一映射
    - 当用户表达冲突（如“互联网素材，我自己上传”）时，由桥梁层判定为需澄清，而不是盲猜
  - **第二步：收紧 Director Skill 的职责边界**
    - Skill 只负责导演语义理解、专业建议、冲突时是否追问
    - Skill 不再承担猜项目内部枚举、猜 UI 标签、猜 raw patch 结构的责任
    - `chat_edit` prompt 需要改成面向“桥接动作”的调用，而不是默认直接写 `update_option_fields`
  - **第三步：修 UI 忠实反馈链路**
    - 输入框保持可编辑，只禁重复发送，不禁改草稿
    - assistant 流式消息只落一次，避免重复回复
    - confirm 卡片必须显示“将把 1-4 改为 D. 互联网素材”这类人类可审阅描述
    - 历史保存时剔除或压缩内部 system log，避免污染后续对话上下文

- **本轮结论**：
  - 折行修复成功、预览图自动刷新正常，说明 Director 的“状态落盘 -> 中部 UI 刷新”主干已通
  - 当前最关键的不是继续补模板字段，而是补厚 Director 桥梁层
  - 下一轮若继续排错，应优先做“桥梁层动作抽象 + 确认文案 + 输入状态机”，再看 Skill 精调

### 2026-03-12 晚间补充：Director Bridge 第一阶段实现落地

- **本轮实现目标**：
  - 不再让 Director Chat 直接把 `update_option_fields/chapterId/optionId/updates.*` 暴露给模型
  - 先把 Director 最痛的 `1-4 / A-F / 类型别名 / 冲突判定 / confirm 文案 / ChatPanel 输入状态机` 接回系统桥梁层

- **代码实现**：
  - `server/director-bridge.ts`
    - 新增 `director_bridge_action` 高层工具入口
    - 新增 `resolveDirectorBridgeAction()`
    - 当前已支持：
      - `change_type`
      - `change_text`
      - `regenerate_prompt`
      - `delete_option`
    - 已接入：
      - `1-4 -> chapterId/optionId` 解析
      - `A-F` 到内部 `type` 映射
      - “互联网素材 / 我自己上传 / 文生视频 / Remotion / 信息图 / Artlist” 等别名映射
      - 冲突表达判定，例如“互联网素材，我自己上传”
  - `server/index.ts`
    - Director Chat 现在只对 LLM 暴露 `director_bridge_action`
    - tool_call 到来后，先走 Bridge 解析
    - `ready_to_confirm` 才生成底层 `executionPlan`
    - `needs_clarification/invalid_target` 直接回 assistant 澄清文本
    - 正常纯文本回复现在会把 assistant 内容一并落入 chat history
  - `server/chat.ts`
    - 历史消息转发给 LLM 时，不再把空 assistant/tool 消息转成 `[System Log: Executed tool ...]`
    - 旧历史中的 system log 噪音会被过滤
  - `src/components/ChatPanel.tsx`
    - streaming 时 textarea 不再整体禁用，用户可继续编辑草稿
    - assistant 流式文本统一单次落消息，避免重复追加
    - `chat-action-confirm` 现在显示结构化确认信息：
      - 标题
      - 主摘要
      - 目标卡片标签
      - diff 摘要
    - 修正事件过滤，确认与执行结果现在按当前 `expertId` 落点，不再依赖旧 `prevExpertIdRef`

- **Skill 侧同步**：
  - 外部 Antigravity Director `prompts/chat_edit.md` 已改为 Bridge 契约
  - 新 prompt 明确：
    - Director 是导演，不负责项目语义映射
    - 只能调用 `director_bridge_action`
    - 不再指导模型直接产出 `update_option_fields/chapterId/optionId/updates.*`
  - 已按老杨协议落盘 skill 快照与账本：
    - `.vibedir/skill_drafts/codex_Director_chat_edit_20260312.md`
    - `.vibedir/skill_registry.yml`

- **测试验证**：
  - `src/__tests__/director-bridge.test.ts`：4/4 通过
    - `D -> internet-clip`
    - “我自己上传” -> `user-capture`
    - “互联网素材，我自己上传” -> `needs_clarification`
    - `1-4` 越界 -> `invalid_target`
  - `src/__tests__/director-adapter.test.ts`：2/2 通过
  - `src/components/ChatPanel.test.tsx`：2/2 通过
    - streaming 时输入框仍可编辑
    - confirm 卡片显示结构化 Bridge 描述
  - `src/components/director/ChapterCard.test.tsx`：2/2 通过

- **本轮仍未完成**：
  - `adjust_layout` / `change_template` 还未接入新 Bridge 执行面，当前会返回高层不支持
  - 还没做真实 Socket 聊天流手测，只完成了单测级和组件级验证
  - 还没重新覆盖 Director Phase 3/4 渲染回归

- **当前结论**：
  - Director Chat 已经不再是“模型直连底层 patch”
  - `Bridge -> confirm -> executionPlan -> adapter` 的主链路已建立
  - 下一轮应继续补：
    1. `adjust_layout/change_template` 两类高层意图
    2. 真实聊天流手测
    3. Director Phase 3/4 回归验证

### 2026-03-12 深夜补充：Director Bridge 扩到排版与安全模板切换

- **本轮扩展目标**：
  - 不把 Bridge 停留在“只能改类型/文案/重生/删除”
  - 先补上最常见、最安全的两类高层意图：
    - `adjust_layout`
    - `change_template`

- **本轮实现范围（保守版）**：
  - `adjust_layout`
    - 当前只先支持 `TextReveal` 的高频排版诉求：
      - 一行显示
      - 不换行
      - 缩边距
      - 更紧凑
    - Bridge 会把高层意图翻译成可执行 props patch：
      - `singleLine`
      - `noWrap`
      - `containerWidth`
      - `paddingX/paddingY`
      - `textStyle.whiteSpace/fontSize/letterSpacing`
  - `change_template`
    - 当前只先支持“安全模板切换”
    - 已支持：
      - `TextReveal`
      - `CinematicZoom`
    - 对 `ComparisonSplit / TimelineFlow / ConceptChain / NumberCounter` 这类需要更完整结构化 props 的模板：
      - Bridge 不再盲写盘
      - 会明确返回“还需要更多结构信息”或建议先切到安全模板

- **实现细节**：
  - `server/director-bridge.ts`
    - `DirectorTarget` 现已带上：
      - `currentType`
      - `currentTemplate`
      - `currentProps`
      - `quote/prompt/imagePrompt`
    - `change_template`
      - 新增模板别名字典
      - `TextReveal` 切换时会自动补最小安全 `props.text`
      - 文案优先取：
        - 现有 `props.text`
        - `quote`
        - `optionName`
        - `imagePrompt`
        - `prompt`
    - `adjust_layout`
      - 新增 TextReveal 排版意图翻译器
      - 只对 TextReveal 生效；若当前不是 TextReveal，会返回澄清

- **测试补充**：
  - `src/__tests__/director-bridge.test.ts`
    - 新增 2 个测试，现共 6/6 通过：
      - 支持安全切到 `TextReveal`，并自动补基础文案 props
      - 支持把“一行显示 / 不换行 / 缩边距”翻译成 TextReveal props patch
  - Director 相关定向测试现已全绿：
    - `director-bridge` 6/6
    - `director-adapter` 2/2
    - `ChatPanel` 2/2
    - `ChapterCard` 2/2
    - 合计 12/12 通过

- **仍然刻意没做的事**：
  - 没让 Bridge 自动生成 `ComparisonSplit/TimelineFlow/ConceptChain/NumberCounter` 的完整结构化 props
  - 没让 Skill 重新承担模板结构猜测职责
  - 没把复杂模板切换伪装成“已支持”

- **当前结论**：
  - Director Bridge 已经从“第一层壳子”进入“可覆盖高频编辑动作”的阶段
  - 对最常见的类型切换、文案修改、提示词重生、删除、TextReveal 排版、TextReveal/CinematicZoom 安全切换，主链路已具备可执行性
  - 下一步优先级仍是：
    1. 真实聊天流手测
    2. 如有需要，再设计复杂模板结构化切换的二阶段 Bridge

### 2026-03-12 深夜补充：Director 真实 socket smoke 验证

- **验证前提**：
  - 本地 worktree 后端运行在 `127.0.0.1:3005`
  - 由于前一轮沙箱会拦本地 socket，这一轮改用提权方式执行本地 smoke，不停后台

- **真实验证结果**：
  1. 用户消息：`把 1-2 改成 D`
     - 收到真实 `chat-action-confirm`
     - 返回内容：
       - `description = 将把 1-2 改为 D. 互联网素材`
       - `targetLabel = 第 1 章 · 方案 2`
       - `diffLabel = type -> internet-clip`
       - `actionArgs.updates.type = internet-clip`
  2. 用户消息：`把 1-2 改成互联网素材，我自己上传`
     - 收到真实 `chat-confirmation`
     - 返回冲突澄清：
       - `你同时表达了 “D. 互联网素材” 和 “E. 我自己上传”，这些类型互相冲突。请明确保留哪一种。`
  3. 用户消息：`把 1-1 改成 TextReveal`
     - 收到真实 `chat-action-confirm`
     - 返回内容：
       - `description = 将把 1-1 改为 TextReveal 模板`
       - `diffLabel = template -> TextReveal`
       - `actionArgs.updates.type = remotion`
       - `actionArgs.updates.template = TextReveal`
       - 自动补上最小安全 `props.text`
  4. 用户消息：`把 1-1 调成一行显示，不要换行，缩边距`
     - 当前项目现场数据里 `1-1` 不是 `TextReveal`
     - 收到真实 `chat-confirmation`
     - 返回澄清：
       - `当前 Bridge 只先支持 TextReveal 的高频排版调整。1-1 现在不是 TextReveal，请先切到 TextReveal 或明确要修改的模板结构。`

- **结论**：
  - Director Bridge 不只是单测通过，已经在真实 socket 聊天链路上返回了正确的：
    - confirm 卡片
    - 冲突澄清
    - 安全模板切换计划
  - 当前唯一还没在活体里补完的，是“确认执行后实际写盘 -> 左侧中部 UI 再次回看”的更长链路

### 2026-03-12 深夜补充：用户纠正 Director 沟通逻辑边界

- **用户明确纠正**：
  - 当前系统把用户理解成“直接和影视导演 Skill 对话”是错的
  - 正确逻辑应当是：
    1. 用户在 Phase2 中通过 UI 审阅每个条目
    2. 用户对某个条目提出修改意见
    3. Director Skill 只辅助这一个条目的专业修改
    4. 用户逐条 Pass / 打勾
    5. 全部确认后进入 Phase3 渲染落盘

- **这条纠正带来的产品边界变化**：
  - ChatPanel 不是“专家自由对话窗”，而是 `Phase2 条目审阅助手`
  - 宿主 UI 负责流程推进：
    - 当前正在审哪一条
    - 哪些条目已 Pass
    - 是否允许“全部确认”
    - 何时进入 Phase3
  - Director Skill 负责：
    - 对当前条目给出导演专业修改
    - 回答“这条怎么改更好”
    - 生成当前条目的修改动作
  - Director Skill 不负责：
    - 决定 Phase2/Phase3 流程
    - 裁决“全部确认/全部打勾/进入渲染”
    - 代替宿主维护全局审阅状态

- **对现有 Bridge 设计的影响**：
  - 现有 Bridge 虽然已经接回了项目语义映射，但仍偏“把一句自然语言翻译成动作”
  - 下一轮必须把它进一步放进 `Phase2 审阅状态机` 里，而不是继续把 ChatPanel 当作自由聊天入口
  - 特别是下面这类语义需要重新分层：
    - “这条 pass”
    - “先按这个改”
    - “这一条不要文生视频，改成互联网素材”
    - “全部确认，进入 Phase3”

- **下一轮必须先澄清的沟通逻辑**：
  - `条目修改语义`
    - 面向当前卡片或显式目标卡片
    - 交给 Director Skill + Bridge
  - `工作流控制语义`
    - 面向 Phase2 全局状态
    - 交给 DeliveryConsole UI/宿主层

- **结论**：
  - 下一轮不要再只谈“Skill / Bridge / UI”三段式，还要补一层更上位的 `Phase2 Review Workflow`
  - 否则即使单条修改动作正确，整体产品沟通逻辑仍会继续跑偏

### 2026-03-12 深夜补充：ChatPanel 开始拆分“会话原文”与“系统卡片”

- **本轮实现目标**：
  - 先不改 Director Skill
  - 先把宿主侧最容易跑偏的地方拉正：
    - 用户与导演 Skill 的原话消息
    - 系统确认卡/执行结果/冲突澄清
    - 这两类内容必须从数据结构上分开

- **代码实现**：
  - `src/types.ts`
    - 为 `ChatMessage` 新增 `kind`
      - `chat`
      - `system_action`
      - `system_status`
  - `src/components/ChatPanel.tsx`
    - 用户消息与 assistant 原话消息统一标记为 `kind = chat`
    - `chat-action-confirm` 进入 `system_action`
    - `chat-confirmation/chat-action-result/chat-error` 进入 `system_status`
    - 渲染层开始分开：
      - `chat` 走聊天气泡
      - `system_action/system_status` 走系统卡片
    - 兼容旧历史：没有 `kind` 的旧 `user/assistant` 消息仍按聊天原文渲染
  - `server/chat.ts`
    - 发给 LLM 的历史会过滤掉所有非 `chat` 消息
    - 系统卡片不再污染用户与导演 Skill 的原始会话上下文
  - `server/index.ts`
    - Director Bridge 的冲突澄清、执行结果、保存到历史的系统提示，统一改成 `role = system`
    - 不再伪装成导演 Skill 的 assistant 回复

- **验证结果**：
  - `src/components/ChatPanel.test.tsx`：2/2 通过
  - `src/__tests__/director-bridge.test.ts`：6/6 通过

- **这一步的价值**：
  - 现在至少已经能保证：
    - 聊天气泡更接近“用户与导演 Skill 原话”
    - 系统确认和工作流提示不再继续冒充 Skill 会话
    - 后续做 `Phase2 Review Workflow` 时，消息层不会继续混乱

### 2026-03-12 深夜补充：宿主 UI 语义开始对齐 Phase2 审阅模型

- **本轮目标**：
  - 在不改 Director Skill 的前提下，先把宿主 UI 的产品语义往正确方向收
  - 避免界面仍然暗示“自由聊天”或“直接提交”

- **实现内容**：
  - `src/components/ChatPanel.tsx`
    - 在 ChatPanel 顶部新增说明：
      - 聊天气泡只展示用户与影视导演 Skill 原话
      - 系统确认、冲突澄清、执行结果以下方系统卡片呈现
  - `src/components/director/Phase2View.tsx`
    - 在 Phase2 顶部新增流程提示：
      - 当前是逐条审阅流程
      - 可针对条目通过 ChatPanel 与导演 Skill 沟通修改
      - 逐条通过后再统一确认进入 Phase3
    - 把按钮文案从 `提交 → Phase 3` 改为 `全部确认 → Phase 3`

- **验证结果**：
  - `src/components/ChatPanel.test.tsx`：3/3 通过
  - `src/components/director/Phase2View.test.tsx`：1/1 通过

- **当前状态**：
  - 宿主侧已经开始从“实现层正确”转向“产品语义正确”
  - 下一步仍然不是先改 Skill，而是补 `Phase2 Review Workflow` 状态机本体

### 2026-03-12 深夜补充 2：Phase2 宿主审阅状态已接到 `App -> DirectorSection -> ChatPanel`

- **本轮目标**：
  - 不改 Director Skill，先把 Phase2 的“当前审阅条目 / 通过进度 / 全部确认条件”接回宿主状态
  - 保持 ChatPanel 聊天气泡仍然只展示用户与导演 Skill 的原话

- **实现内容**：
  - `src/types.ts`
    - 新增：
      - `DirectorReviewTarget`
      - `DirectorReviewWorkflowState`
  - `src/components/DirectorSection.tsx`
    - 新增 `currentReviewTarget` 本地状态
    - 当前点击条目时，宿主会记录当前审阅目标
    - Phase2 下会自动推导：
      - 当前审阅条目
      - 已通过章节数
      - 剩余待通过章节数
      - 是否已满足“全部确认 → Phase3”
    - 通过 `onReviewWorkflowChange` 把这份宿主状态抬给 `App`
  - `src/App.tsx`
    - 新增 `directorReviewWorkflow` 宿主状态
    - 只在 `Director + delivery` 场景下把审阅状态传给 ChatPanel
  - `src/components/ChatPanel.tsx`
    - 新增独立的 `Phase 2 宿主审阅状态` 卡片
    - 展示：
      - 当前条目（例如 `1-2`）
      - 通过进度（例如 `1/3`）
      - 是否已满足全部确认条件
    - 这部分不进入聊天历史，不伪装成 Skill 原话
  - `src/components/director/Phase2View.tsx`
    - 在中部审阅区同步展示当前审阅条目与阶段进度
    - 明确“已通过 / 待通过”是宿主流程态，不是导演聊天文本

- **验证结果**：
  - `src/components/ChatPanel.test.tsx`：4/4 通过
  - `src/components/director/Phase2View.test.tsx`：1/1 通过
  - `src/__tests__/director-bridge.test.ts`：6/6 通过
  - `src/components/director/ChapterCard.test.tsx`：2/2 通过

- **这一步的价值**：
  - Director Chat 现在已经不只是“消息分层正确”，而是开始具备宿主级 Phase2 审阅语义
  - 用户回来手测时，可以直接看见：
    - 当前正在审哪一条
    - 已经通过了几条
    - 是否达到全部确认进入 Phase3 的条件

### 2026-03-13 上午补充：整体 DC Node 架构治理完成，前后端已恢复可测

- **问题现象**：
  - `npm run dev` 起前端时直接报错：
    - `Cannot find module @rollup/rollup-darwin-x64`
  - 这不是 Director 代码错误，而是整套 DeliveryConsole 本机运行时发生了架构错配

- **根因定位**：
  - 机器本身：`arm64`
  - 当前 shell：`arm64`
  - 但 Codex / 当前环境默认命中的 `node` 是：
    - `/usr/local/bin/node`
    - `x64`
  - 同时 DC 共享依赖位于：
    - `/Users/luzhoua/DeliveryConsole/node_modules`
  - worktree 会向上复用这套共享依赖
  - 导致前端工具链出现：
    - shell 默认 `node` 架构
    - 共享 `node_modules` 原生依赖架构
    - 二者不一致

- **修复动作**：
  - 修正 `~/.zshrc`
    - 去掉把 `/usr/local/opt/node@20/bin` 强插到 PATH 最前面的配置
    - 让 `~/.nvm` 的默认 Node 成为优先命中的 `node`
  - 验证 `nvm` 默认 Node
    - `~/.nvm/versions/node/v20.19.5/bin/node`
    - `arm64 v20.19.5`
  - 备份旧共享依赖
    - `node_modules -> node_modules_pre_arm64_rebuild_20260313`
  - 用 arm64 Node **直接执行** npm CLI 重建共享依赖
    - 避免出现“调用的是 nvm npm，但实际还是被 x64 node 启动”的假修复

- **修复后验证**：
  - `zsh -lic 'which node'`
    - 命中 `~/.nvm/versions/node/v20.19.5/bin/node`
  - `zsh -lic 'node -p process.arch'`
    - 返回 `arm64`
  - `node_modules/@rollup`
    - 已存在 `rollup-darwin-arm64`
    - 也补齐了 `rollup-darwin-x64`
  - 前端启动成功
    - `http://localhost:5178`
  - 后端启动成功
    - `http://0.0.0.0:3005`
  - HTTP 健康验证通过
    - `GET http://127.0.0.1:5178 -> 200`
    - `GET http://127.0.0.1:3005/api/version -> {"version":"v3.8.0"}`
  - Director 真实 socket smoke 通过
    - 输入：`把 1-2 改成 D`
    - 返回正确确认卡：`将把 1-2 改为 D. 互联网素材`

- **这一步的价值**：
  - 这次治理修复的是**整体 DeliveryConsole 本机环境**，不只是 `director0309` 分支
  - 后续其他 worktree 也会直接受益
  - 同时已经把这类坑写进规则，后面的人遇到同类报错会先查运行时架构，而不是先怀疑业务代码

### 2026-03-13 上午补充 2：根据用户手测反馈，纠正 Phase2 头部文案与模型配置边界

- **用户现场反馈**：
  1. Director Chatbox 在切换全局模型后报 `Model Not Exist`
  2. ChatPanel 里的 `Phase 2 宿主审阅状态` 头部没有意义，要求删除
  3. 左侧 `Phase 2 是逐条审阅流程... / 当前审阅条目...` 顶部提示没有意义，要求删除
  4. `internet-clip` 需要明确的用户上传入口
  5. 模型配置不能再出现隐藏硬编码，聊天链路应统一跟随系统全局配置

- **根因确认**：
  - Chatbox 报错并不是 Director Skill 失效，而是全局 LLM 配置出现了 `provider/model` 错配：
    - `provider = deepseek`
    - `model = kimi-k2.5`
  - 配置页此前只改单个 provider 字段，model/baseUrl 没有一起切换，导致请求被远端网关拒绝
  - 同时 `.agent/config/llm_config.json` 中仍残留 `experts.director.llm`，虽然当前聊天入口并不读取它，但这会误导操作者，以为 Director 还绑着单独模型

- **本轮修正**：
  - `src/components/LLMConfigPage.tsx`
    - 切换全局 Provider 时，强制同步写入对应默认 `model + baseUrl`
    - 专家配置页取消 LLM override 控件，直接显示“Chatbox 跟随全局系统配置”
  - `server/llm-config.ts`
    - 服务端加载与保存配置时，对 `provider/model/baseUrl` 做归一化
    - 同时把残留的 `expert.llm` 统一清空，避免再次出现“界面一套、聊天实际另一套”的误导
  - `server/index.ts`
    - 聊天入口新增显式规则：`chat-stream` 统一读取全局网关，不走专家级 LLM 配置
  - `.agent/config/llm_config.json`
    - 当前已归一到：
      - `global.provider = deepseek`
      - `global.model = deepseek-chat`
      - `experts.director.llm = null`
  - `src/components/ChatPanel.tsx`
    - 已删除 `Phase 2 宿主审阅状态` 卡片
  - `src/components/director/Phase2View.tsx`
    - 已删除顶部 `Phase 2 是逐条审阅流程...`
    - 已删除 `当前审阅条目...` 顶部提示
  - `src/components/director/ChapterCard.tsx`
    - `internet-clip / user-capture` 改为始终显示上传入口，不再依赖勾选状态

- **运行时复测**：
  - Director chat socket smoke：
    - 输入：`1-2请换成互联网素材`
    - 返回：`将把 1-2 改为 D. 互联网素材`
  - Remotion 预览：
    - 后端日志已确认重新走 arm64 Node
    - `thumb_ch1-ch1-opt1.png` 现场重新生成成功

- **结论**：
  - 这轮不是“Skill 坏了”，而是：
    1. 全局模型切换联动没做完整
    2. UI 错加了用户明确不认可的宿主提示头
    3. 外部 Remotion 渲染一度命中旧 x64 进程
  - 目前三条都已收口，并已写入 rules，避免后续再回退

### 2026-03-13 上午补充 3：Fast Path 只负责直接确认，模糊情况必须回退 Director Skill

- **用户再次明确边界**：
  - `director-bridge.ts` 应理解 Director Skill 吐出的高层意图，而不是直接替代导演大师理解用户
  - `Fast Path` 可以存在，但只能在“100%明确”的命令上提前命中
  - 如果 `Fast Path` 不能稳定确认，就必须回退给 Director Skill 再判断一轮

- **本轮修正**：
  - `server/index.ts`
    - 保留 Director `Fast Path`
    - 但只在 `ready_to_confirm` 时才直接短路返回确认卡
    - 如果 `Fast Path` 只得到模糊/冲突/待澄清结果，则继续走正常 `Director Skill -> Bridge` 链路

- **最终链路约束**：
  - 明确操作命令：
    - `Fast Path -> Bridge -> Confirm`
  - 非明确或边界不稳命令：
    - `Director Skill -> Bridge -> Confirm / Clarify`

- **价值**：
  - 保留了明确改卡命令的速度
  - 同时避免 `Fast Path` 直接抢答，破坏“导演大师先理解，再交给 Bridge 落盘”的产品感觉

### 2026-03-13 上午补充 4：Fast Path 编排协议上抬为所有 Chatbox 的统一规则

- **用户新增要求**：
  - 这套 `Fast Path -> Skill fallback -> Bridge` 的逻辑不能只在 Director 生效
  - 后续 `短视频大师 / 音乐总监 / 其他 Chatbox` 都应自动遵循同一套规则，不能每个场景再重申一遍

- **本轮实现**：
  - `server/expert-actions.ts`
    - 为所有专家 adapter 新增可选钩子：
      - `tryFastPath(latestUserMessage, projectRoot)`
    - 语义约束：
      - 只有能直接确认时才返回
      - 不能确认就返回 `null`，交还给专家 Skill
  - `server/index.ts`
    - `chat-stream` 改为统一先尝试：
      - `adapter?.tryFastPath(...)`
    - 命中后统一发确认卡
    - 未命中则继续正常 `Skill -> Tool/Bridge` 流程
  - `server/expert-actions/director.ts`
    - Director 的 `Fast Path` 改为 adapter 级实现，不再把特例写死在 chat-stream 里

- **意义**：
  - 这条规则现在已经从“Director 的特殊修补”升级为“Chatbox 基础编排协议”
  - 后续给 Shorts/Music/Thumbnail 接 `Fast Path` 时，只需要在各自 adapter 里实现，不必再改一遍总线逻辑

### 2026-03-13 上午补充 5：Chatbox 基础设施第一轮落地

- **本轮目标**：
  - 不再只修 Director 单点体验，而是把 Chatbox 往“全专家共用底座”推进一轮
  - 优先收口三件基础设施：
    1. 待确认卡持久化/恢复
    2. 所有专家先加载自己的 Skill
    3. ChatPanel 通用文案与状态机去专家硬编码

- **实现内容**：
  - `server/index.ts`
    - 新增 `emitAndPersistActionConfirm(...)`
    - 无论是 `Fast Path`、Director Bridge 还是普通工具调用，只要发出确认卡，就同步写入 chat history
    - `chat-action-execute` 改为接收前端传回的 `historyMessages`，执行成功后基于最新历史追加系统执行结果
  - `src/components/ChatPanel.tsx`
    - 确认执行时：
      - 先把卡片状态改成 `confirmed`
      - 立即 `chat-save`
      - 再发 `chat-action-execute`
    - 取消执行时：
      - 同步把卡片状态改成 `cancelled`
      - 立即 `chat-save`
    - 头部说明文案改为动态专家名，不再写死“影视导演 Skill”
    - 修复流式报错时 `streamingContentRef` 未清空的问题，避免旧半截回答被误刷回聊天历史
    - 发送带图消息时，将消息内渲染 URL 转为可直接显示的数据 URL，同时释放未发送附件的 blob URL
    - 历史恢复后若附件只剩占位符，不再渲染坏图，而是显示文件名块
  - `server/chat.ts`
    - `saveChatHistory()` 对附件同时清理 `base64` 和 `previewUrl`，避免历史文件里残留大块图片数据或失效 blob URL
    - `loadExpertContext()` 改为统一走 `buildExpertChatSystemPrompt(expertId)`
  - `server/skill-loader.ts`
    - 新增 `buildExpertChatSystemPrompt(expertId)`
    - Director 继续使用专属 `chat_edit` prompt + resources
    - Music/Shorts/Thumbnail/Marketing/Writer 至少先加载各自 `SKILL.md`，外加通用 Chatbox 协作包装

- **验证结果**：
  - 定向测试：
    - `src/components/ChatPanel.test.tsx`
    - `src/__tests__/director-bridge.test.ts`
    - `src/components/director/ChapterCard.test.tsx`
    - `src/__tests__/schemas/llm-config.test.ts`
    - 合计 `22/22` 全通过
  - Director 运行时 smoke：
    - 输入：`1-2我自己有视频待上传，请改成互联网素材`
    - 返回：`将把 1-2 改为 D. 互联网素材，并保留用户上传入口`

- **结论**：
  - 这轮已经不只是 Director 修补，而是 Chatbox 基础设施第一次真正抽成“全专家共用底座”
  - 即便后续还有瑕疵，这一轮也值得先 checkpoint 保存，方便后续在 Music/Shorts/Marketing 上继续横向扩

### 2026-03-13 上午补充 6：Chatbox 基础设施第二轮收口

- **本轮目标**：
  - 不再扩新功能，先把上一轮通用底座里最容易留下尾巴的状态机问题收紧
  - 重点是：
    1. 去掉固定说明条，避免 ChatPanel 再次变成“头部堆提示”的产品形态
    2. 让从 chat history 恢复出来的待确认卡可以继续确认执行
    3. 把附件 `ObjectURL` 的释放时机补完整，避免长时间使用 chatbox 时内存继续涨

- **代码实现**：
  - `src/components/ChatPanel.tsx`
    - 去掉顶部固定说明条，恢复更轻的面板结构
    - 把 `setMessagesWithRef` 进一步扩成 `appendMessage`，让 socket 回调、历史恢复、发送消息都同步刷新 `messagesRef`
    - `chat-history` 改为走 `setMessagesWithRef(history)`，避免“历史卡片渲染了，但 ref 里还是旧消息”的窗口期
    - `handleClearHistory` 也同步清空 `messagesRef`
    - 新增 `attachmentsRef` 与统一 `releaseAttachments()`，在以下三处显式释放 blob URL：
      - 发送后
      - 切换专家时
      - 组件卸载时
  - `src/components/ChatPanel.test.tsx`
    - 新增回归测试：从 `chat-history` 恢复的 `system_action` 待确认卡仍可点击“确认执行”
    - 断言 `chat-action-execute.historyMessages` 中会带着最新的 `confirmed` 状态一起发回服务端

- **验证结果**：
  - `src/components/ChatPanel.test.tsx`：6/6 通过

- **结论**：
  - 这轮补的是 Chatbox 的“历史恢复可操作性”和“长时间使用稳定性”
  - 做完后，Chatbox 这块可以先作为第二个基础 checkpoint 存下来，再把注意力切回导演主线

### 2026-03-13 中午补充：Director 类型替换语义修正

- **触发背景**：
  - 用户真实手测句式：`1-2 不需要文生视频，请改成互联网素材，我自己上传`
  - 现场错误表现：
    - 系统把 `文生视频` 和 `互联网素材` 同时记成候选类型
    - 直接报 `B / D` 类型冲突
  - 用户当场纠正的边界是对的：
    - Director Skill 不应该负责理解 DeliveryConsole 的项目语义
    - 宿主/Bridge 必须自己理解“不要 X，改成 Y”这类编辑命令

- **代码修正**：
  - `server/director-bridge.ts`
    - 新增 `TYPE_TARGET_VERBS` 与 `TYPE_NEGATION_PREFIXES`
    - 新增：
      - `extractPreferredTypeMatches()`
      - `extractNegatedTypeMatches()`
      - `filterNegatedTypeMatches()`
    - `resolveTypeChange()` 现在改成三步：
      1. 先提取被明确指定的目标类型（如 `改成互联网素材`）
      2. 再提取被否定/被替换掉的旧类型（如 `不需要文生视频`）
      3. 冲突判定前先扣除旧类型和上传意图
    - 如果用户只说“不要文生视频”，但没说换成什么，则改为追问“替换成哪一种”，不再误报冲突
  - `src/__tests__/director-bridge.test.ts`
    - 补了 3 条回归：
      - `不需要文生视频，请改成互联网素材，我自己上传` -> 直接 ready_to_confirm
      - `不要文生视频了` -> needs_clarification，追问新类型
      - fast path 也要支持这类替换句式

- **验证结果**：
  - `src/__tests__/director-bridge.test.ts`：12/12 通过
  - 本地 `3005` 真实 socket smoke：
    - 输入：`1-2 不需要文生视频，请改成互联网素材，我自己上传`
    - 返回：`将把 1-2 改为 D. 互联网素材，并保留用户上传入口`

- **结论**：
  - 这次修复不是“再让导演大师兜底”
  - 而是把宿主层对项目编辑语义的理解补正确了
  - 后续这套“否定旧值 + 指定新值”的替换解析应继续抽成所有 chatbox 的通用宿主能力

### 2026-03-13 下午补充：Director Phase2 从“无限卡死”推进到“超时兜底”

- **现场症状**：
  - 用户在 `5178` 上重新触发 Director Phase2 视觉方案生成时，界面长时间停在：
    - `正在为你的剧本生成视觉方案...`
    - 仅有一条起始日志
  - 项目真实磁盘状态显示：
    - `.claude/Projects/CSET-Seedance2/04_Visuals/` 下没有 `phase2_review_state.json`
    - [delivery_store.json](/Users/luzhoua/DeliveryConsole/.claude/Projects/CSET-Seedance2/delivery_store.json) 仍是 `director.phase = 1 / items = []`
  - 说明这不是“已经生成了但没显示”，而是后端根本没走到 `chapter_ready/done`

- **根因定位**：
  - `server/director.ts -> startPhase2()` 在发出第一条日志后，卡在：
    - `generateGlobalBRollPlan()`
    - `callLLM()`
  - 当前全局配置确认为：
    - `provider = deepseek`
    - `model = deepseek-chat`
  - `deepseek` 连通性测试通过，但旧版 `server/llm.ts` 的 `callLLM()` 全链路没有超时控制
  - 所以上游模型只要这次响应悬住，前端就会无限转圈，没有明确错误

- **本轮修正**：
  - `server/llm.ts`
    - 新增 `fetchWithTimeout()`
    - 所有老式非 streaming 的 LLM 请求统一接入 `AbortController`
    - 默认超时：`90s`
    - 超时错误标准化为：
      - `LLM request timeout after 90s`
  - 这样 `startPhase2()` 原有的 `catch` 就能真正捕获超时，并把错误回前端，而不是无限挂着

- **最新现场结果**：
  - 用户再次触发后，Phase2 不再一直卡死
  - 当前界面已进入 `兜底方案（LLM 生成失败）`
  - 说明系统行为已从：
    - `无限等待`
    - 推进为
    - `可超时、可失败、可回退`

- **现阶段判断**：
  - “卡死”问题已被压下去
  - 但真正的上游问题还在：
    - 要么模型这次生成质量不稳定
    - 要么返回结构不稳定，被 schema/retry/fallback 吃掉
  - 下一轮再查时，应优先盯：
    1. `generateGlobalBRollPlanWithRetry()` 的真实失败原因
    2. 是否需要把 DeepSeek 从 Phase2 全局规划链路切到更稳定的 provider
    3. 是否要把 fallback 原因直接展示到前端 debug 面板，而不是只写 `兜底方案（LLM 生成失败）`

### 2026-03-14 夜间补充：Director 新家运行时端口收口第一轮

- **触发背景**：
  - `MHSDC/DeliveryConsole/Director` 已作为 Director 新家开始承接后续开发
  - 现场仍存在多套历史端口口径并存：
    - `.env.local` 是 `3009 / 5182`
    - `.claude/launch.json` 仍是 `3003 / 5175`
    - `scripts/check-port.js` / `scripts/preview.js` 仍写死 `3002 / 5173`
    - `server/index.ts` / `server/youtube-auth.ts` 仍保留 `3002` fallback
- **本轮收口原则**：
  - 端口按全局账本纪律治理
  - 运行时链路统一为：
    - `global_ports_registry.yml`
    - `-> .env.local`
    - `-> vite/server/scripts/runtime`
  - 不再让脚本和业务代码各自维护一套旧端口
- **代码改动**：
  - 新增 `scripts/runtime-env.js`
    - 集中读取 `.env` + `.env.local`
    - 统一导出 `backendPort / frontendPort / backendTarget`
  - `scripts/check-port.js`
    - 改为按 runtime env 检查当前工作区端口
    - 区分 `EADDRINUSE` 与 `EPERM/EACCES`，不再把沙盒限制误报为端口占用
  - `scripts/preview.js`
    - 改为从 runtime env 读取预览端口
  - `start.sh`
    - 改为动态读取当前端口并清理对应占用
    - 不再写死 `5173`
  - `ecosystem.config.cjs`
    - 去掉旧目录 `cwd=/Users/luzhoua/DeliveryConsole`
    - 改为随当前工作区与 `.env.local` 走
  - `.claude/launch.json`
    - 去掉 `PORT=3003 npm run dev`
    - 当前口径改为前端 `5182` / 后端 `3009`
  - `.env.example`
    - 改成 Director 新家模板，明确“账本 -> .env.local -> runtime”纪律
  - `README.md` / `RELOCATION.md` / `.agent/PROJECT_STATUS.md`
    - 补齐当前新家路径与当前端口口径
- **当前结论**：
  - Director 新家已完成第一轮 runtime 收口
  - 全局端口账本已新增：
    - 这轮随后被用户纠正：账本已有 Director 端口 `3005 / 5178`，不应自行新增 `3009 / 5182`
  - 依赖层已恢复：
    - `npm install` 完成
    - `package-lock.json` 已落盘
  - 本轮验证结果：
    - `npm run dev:check`：通过
      - 当前沙盒环境返回 `EPERM`
      - 但脚本已能正确区分“环境限制”与“真实端口占用”
    - `npm run test:run -- src/__tests__/director-bridge.test.ts`：12/12 通过
    - 硬编码扫描：
      - `src/server/scripts/start.sh/ecosystem/.claude` 范围内已清空 `3002/5173/3003/5175` 旧运行时端口残留
    - `npm run build`：未通过，但判定为存量 TypeScript 红灯，不属于本轮端口迁移回归
      - 主要集中在：
        - `server/llm-config.ts`
        - `src/components/ChatPanel.tsx`
        - `src/components/market/*`
        - `src/components/ScheduleModal.tsx`
        - `src/components/StatusDashboard.tsx`
  - **收口判断**：
    - Director 新家 runtime 端口治理在用户纠正后，必须以账本现有 Director 端口 `3005 / 5178` 为唯一事实来源
  - 但若要宣称“整仓 build 已恢复健康”，还需另开一轮 TypeScript 存量清红任务

### 2026-03-16 晚间补充：Director 右上角文稿下拉恢复，Phase2 前置阻塞解除

- **现场问题**：
  - OpenCode 的 `TREQ-2026-03-16-DIRECTOR-006-phase2-business-acceptance` 报告把 Phase2 标成 `blocked`
  - 页面进入 `5178` 后，顶部项目列表里虽然能看到 `CSET-Seedance2` 被标记为 `ACTIVE`
  - 但右上角项目标题实际为空，文稿区显示 `Script: 未选择`
  - 点开文稿下拉后出现 `暂无文稿`
  - 结果不是“Phase2 生成失败”，而是测试根本没跨过“选择项目/文稿”这道前置门槛

- **根因定位**：
  - `/api/scripts?projectId=CSET-Seedance2` 实际能正常返回两份 `.md` 文稿，说明磁盘与接口都没坏
  - 真正断的是页面冷启动时的 socket 恢复链路：
    - 用户刷新页面后，会新建一个 socket
    - 旧代码只在 `select-project` 时才把 socket 加入项目 room、补发 `delivery-data`
    - 若服务端内存里已经有 `currentProjectName`，新 socket 连接时只会收到一条 `active-project`
    - 前端并没有单独消费这条事件来设置 `projectId`
  - 于是前端本地 `state.projectId` 继续为空，`Header.tsx` 的 `fetchScripts()` 因 `!projectId` 直接返回，最终把“已有 active project”渲染成“暂无文稿”

- **修复方案**：
  - 在 [`server/index.ts`](/Users/luzhoua/MHSDC/DeliveryConsole/Director/server/index.ts) 新增统一 helper：
    - `hydrateSocketProjectContext(socket, projectId)`
  - 该 helper 负责一次性完成：
    - socket 加入项目 room
    - `ensureDeliveryFile`
    - `ensureExpertState`
    - 重挂 `delivery/expert/visual-plan` watchers
    - 补发 `delivery-data`
    - 补发各专家 `expert-data-update`
    - 再确认发送 `active-project`
  - 首次连接时，只要服务端已有 `currentProjectName`，立即自动 hydrate
  - `select-project` 路径也改成复用同一 helper，避免以后再次出现“连接时一套、切项目时一套”的漂移

- **验证结果**：
  - 已优雅重启本地 dev 服务，并保持在线：
    - 前端：`5178`
    - 后端：`3005`
  - 使用 `agent-browser` 对真实页面完成验收：
    - 顶部项目按钮显示 `CSET-Seedance2`
    - 顶部文稿按钮显示 `Script: CSET-seedance2_深度文稿_v2.1.md`
    - 页面 DOM 中可见另一份文稿 `CSET-seedance2_深度文稿_v2.1 1.md`
    - 页面不再出现 `暂无文稿`
  - 同时验证接口：
    - `/api/scripts?projectId=CSET-Seedance2` 返回两份文稿
  - 结论：
    - 这次解除的是 Phase2 测试的前置阻塞，不是 Phase2 业务逻辑本身的最终验收
    - 下一步可以回到真实的 Phase2 业务验收 request，继续测“生成 -> 勾选 -> 提交 Phase3”

- **协议纠偏**：
  - 根据用户当场纠正，已把“网页验收默认优先 Agent Browser，不要先手用 Playwright MCP”写入 `rules.md`
  - 后续 Director 页面验证统一按这条协议执行

### 2026-03-16 深夜补充：MIN-89 补强为可复用的测试治理父任务

- **触发背景**：
  - 用户指出 `MIN-89 Director 协调测试与验收治理` 不能只停留在一句摘要
  - 作为后续给其他模块项目组复用的母任务，它必须显式包含：
    - 当前测试协调工作的完整总结
    - 仓库内关键文档清单
    - 每份文档的用途与当前状态
    - 与业务 issue / handoff issue 的边界
  - 同时，Linear 中所谓“父 issue”本质上仍是一条普通 issue，需要靠描述结构和子 issue 组织，而不是靠额外类型

- **本轮补强动作**：
  - 更新 `MIN-89` 描述，补齐：
    - 父任务定位
    - 边界定义
    - 协调口令与执行纪律
    - 文档索引清单（路径 / 用途 / 当前状态 / 使用时机）
    - 验收目标
    - 与 `MIN-90`、`MIN-63` 等业务线的边界
  - 在 `MIN-89` 下挂载配套 Linear 文档：
    - `Director 测试协调总览与文档索引`
  - 新建并挂上 3 个子 issue：
    - `MIN-91`：Director 测试协议与文档固化
    - `MIN-92`：Director Agent Browser 验收标准化
    - `MIN-93`：Director OpenCode worker 与环境恢复治理

- **纳入索引的关键文档**：
  - 项目级：
    - `testing/README.md`
    - `testing/OPENCODE_INIT.md`
    - `testing/CROSS_ENDPOINTS.md`
    - `testing/prompts/OPENCODE_TEST_RUNNER.md`
  - Director 模块级：
    - `testing/director/README.md`
    - `testing/director/requests/REQUEST_TEMPLATE.md`
    - `testing/director/claims/CLAIM_TEMPLATE.md`
    - `testing/director/reports/REPORT_TEMPLATE.md`
  - 状态与脚本：
    - `testing/director/status/BOARD.md`
    - `testing/director/status/latest.json`
    - `testing/scripts/opencode-test-worker.mjs`
    - `testing/scripts/print-status.mjs`
  - 研发规约：
    - `docs/04_progress/rules.md`
    - `docs/04_progress/dev_progress.md`

- **额外发现**：
  - 在整理索引时发现：
    - `testing/director/status/latest.json` 当前把 `TREQ-2026-03-16-DIRECTOR-006-phase2-business-acceptance` 标成 `passed`
    - 但对应 report 实际是 `blocked`
  - 这说明状态汇总链路仍存在一致性风险，应后续作为 `MIN-89` 下的治理项继续处理

- **当前判断**：
  - `MIN-89` 现在已经不只是一个标题，而是：
    - 可交接的测试治理母任务
    - 可供 Director 后续接力参考的索引中心
    - 可被其他模块照抄的测试协作样板

### 2026-03-18 LLM 配置链路整体修复

- **触发背景**：
  - Phase1 和 Phase2 都出现兜底方案，日志显示 LLM 调用失败
  - 深度排查发现配置链路存在系统性混乱：三字段错配、类型不对齐、`as any` 遮蔽类型检查

- **根因定位**：
  - `llm_config.json` 存储了错配状态：`provider=kimi` 但 `model=deepseek-chat`、`baseUrl=deepseek`
  - Phase2 JSON 解析失败根因：`deepseek-chat` 模型在大体积结构化 JSON 输出时不稳定（12KB 处断裂）
  - `generateBRollOptions()` 只接受 3 种 provider，其余函数接受 5-7 种，不一致
  - 所有 `callLLM` 调用处用 `as any` 绕过类型检查，runtime 才报错
  - `expert-actions/director.ts` 用 `as Record<string,any>` + 硬编码 `openai/gpt-4o` 兜底

- **修复内容**（commit `de1ea6d`）：
  - `src/schemas/llm-config.ts`：新增 Kimi 官方 provider（`api.moonshot.cn/v1`，`kimi-k2.5`）；新增 `normalizeProviderConfig()` 归一化函数
  - `server/llm-config.ts`：`loadConfig()` 和 `updateConfig()` 均加归一化，切 provider 时自动修正 model/baseUrl
  - `server/llm.ts`：所有函数 provider 类型统一为 `LLMProvider`，移除 `as any`
  - `server/director.ts`：4 处 `provider as any` → `provider as LLMProvider`
  - `server/expert-actions/director.ts`：移除 `as Record<string,any>` 和错误 fallback，直接用 `loadConfig()` 返回类型
  - `.agent/config/llm_config.json`：修正为 `kimi + kimi-k2.5 + api.moonshot.cn/v1`

- **验证结果**：
  - Phase1 概念提案通过 Kimi `kimi-k2.5` 成功生成，文件落盘 ✅
  - 服务端零报错 ✅
  - 前端控制台无错误 ✅

- **新增规则**（已写入 rules.md Rule 100）：
  - 切换 Provider 时 provider/model/baseUrl 必须联动归一化，不能只改单字段
