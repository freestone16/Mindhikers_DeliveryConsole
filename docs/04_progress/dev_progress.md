# Delivery Console — 开发进展 & 遗留问题

> **更新日期**: 2026-03-01 22:30 CST

---

## 1. 版本迭代历史

| 版本 | 日期       | 里程碑                                                        |
| ---- | ---------- | ------------------------------------------------------------- |
| v1.0 | 2026-02-10 | 初版：单项目（CSET-SP3 硬编码）五大模块 Dashboard             |
| v2.0 | 2026-02-11 | Shorts Publisher 模块：状态机 + OAuth + YouTube Upload        |
| v2.1 | 2026-02-12 | Link Video（手动关联视频）+ Marketing 数据导入 + File Browser |
| v2.2 | 2026-02-13 | **多项目热切换** + Docker 化开发环境                          |
| v3.0 | 2026-02-14 | **专家导航系统** + 文稿选择 + 半自动 Antigravity 集成           |
| v3.1 | 2026-02-28 | **Remotion 新模板赋能** - 强制 template 字段 + 4 个新模板可用 |
| v3.2 | 2026-02-28 | **导演大师 Phase 2/3 重构** - 预审流程 + 渲染二审 + XML 生成 |
| v3.3 | 2026-03-01 | **Phase2/3 细节优化** - 进度显示、评论提交、列表头、章节名、预览图质量 |

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
| L-8 | 火山引擎文生视频集成                             | `renderVolcVideo` 函数需要实现实际的 API 调用         |
| L-9 | 前端文件上传实现                                 | Phase3View 中的文件选择对话框需要完整实现              |
| L-10 | 可视化时间线编辑器                               | Phase 3 可以考虑添加时间线编辑器，让用户手动调整 B-roll 时间码 |
| L-11 | 批量操作优化                                     | 可以考虑添加批量 Pass/Skip、批量重新渲染等操作        |

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

## 8. 文件变更日志（v3.1）

| 文件                                      | 变更类型 | 说明                                                      |
| ----------------------------------------- | -------- | --------------------------------------------------------- |
| `server/llm.ts`                           | **修改** | 强制 template 字段验证、添加示例、智能模板推荐函数         |
| `server/skill-loader.ts`                   | **修改** | 优化 Prompt，新模板优先级提升，添加适用场景关键词          |
| `server/director.ts`                      | **修改** | CinematicZoom 占位图从 localhost URL 改为 Unsplash        |
| `.claude/plans/hidden-dancing-melody.md`  | **修改** | 验证路径改为通用 PROJECT_NAME 变量                        |

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

| 文件 | 变更类型 | 说明 |
| --- | --- | --- |
| `docs/02_design/remotion_spatial_layout_engine.md` | **新建** | Remotion空间排版引擎完整设计文档 |
| `server/director.ts` | **修改** | 初始进度不发送数字，等方案生成后更新 |
| `server/llm.ts` | **修改** | Prompt强化：每章最少3个方案，添加 ⚠️ 警告 |
| `server/remotion-api-renderer.ts` | **修改** | 预览图优化：frame=50, scale=1.5, quality=90，增强错误日志 |
| `src/components/director/ChapterCard.tsx` | **修改** | 列表头"缩略图预览"→"预览图"，章节名去重，添加Ctrl+Enter提交 |

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

## 12. 文件变更日志（v3.2）

| 文件                                      | 变更类型 | 说明                                                      |
| ----------------------------------------- | -------- | --------------------------------------------------------- |
| `src/types.ts`                            | **修改** | 新增 Phase 2/3 重构类型定义                             |
| `server/srt-parser.ts`                     | **新建** | SRT 字幕解析器                                          |
| `server/assets.ts`                         | **新建** | 外部素材加载 API                                        |
| `server/xml-generator.ts`                   | **新建** | Final Cut Pro XML 生成器                                  |
| `server/director.ts`                       | **修改** | 新增 Phase 2/3 API 端点，集成渲染逻辑                      |
| `server/index.ts`                          | **修改** | 注册新增的 API 端点，配置文件上传中间件                    |
| `src/components/director/Phase2View.tsx`   | **重写** | 重构为预审流程                                          |
| `src/components/director/Phase3View.tsx`   | **重写** | 重构为渲染及二审流程                                      |
| `src/components/DirectorSection.tsx`       | **修改** | 适配新的 Phase 2/3 组件接口                             |

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

| 文件 | 变更类型 | 说明 |
| --- | --- | --- |
| `docs/02_design/remotion_spatial_layout_engine.md` | **新建** | Remotion空间排版引擎完整设计文档 |
| `server/director.ts` | **修改** | 初始进度不发送数字，等方案生成后更新 |
| `server/llm.ts` | **修改** | Prompt强化：每章最少3个方案，添加 ⚠️ 警告 |
| `server/remotion-api-renderer.ts` | **修改** | 预览图优化（frame=50, scale=1.5, quality=90），增强错误日志 |
| `src/components/DirectorSection.tsx` | **修改** | loadingProgress 初始值从 '0/0' 改为 '' |
| `src/components/director/ChapterCard.tsx` | **修改** | 列表头"缩略图预览"→"预览图"，章节名去重，添加Ctrl+Enter提交 |

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
