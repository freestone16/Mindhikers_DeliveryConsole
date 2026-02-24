# Delivery Console — 系统架构文档

> **版本**: v2.2 | **更新日期**: 2026-02-13
> **定位**: MindHikers 视频制作交付管控台 — 连接 AI Skills 与 YouTube 发布的中间层

---

## 1. 设计哲学

**"两层皮"架构**: Web UI + Obsidian 共享同一套本地 `.md` / `.json` 文件作为数据骨架。
Delivery Console 不是一个独立应用，而是对 `Projects/` 目录下已有文件结构的**可视化操作层**。

```
MindHikers/
├── Projects/                    # 内容项目根目录
│   ├── CSET-SP3/                # 具体项目
│   │   ├── delivery_store.json  # ← 核心数据文件（Console 读写这个）
│   │   ├── 09_shorts_aroll/     # Shorts 视频文件
│   │   └── ...                  # 其他 Obsidian 管理的目录
│   ├── CSET-Seedance2/
│   └── CSET-EP4/
└── delivery_console/            # ← 本应用
```

---

## 2. 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| **前端** | React 19 + Vite 7 + TailwindCSS 4 | SPA，深色主题 |
| **后端** | Express 5 + Socket.IO 4 + tsx | 轻量 API + 实时推送 |
| **运行时** | Node.js 20 (Alpine Docker) | 统一开发容器 |
| **数据层** | `delivery_store.json` (per project) | 无数据库，文件即状态 |
| **认证** | Google OAuth 2.0 (内存 Token) | 零持久化，每次重新授权 |

---

## 3. 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Container                              │
│  ┌─────────────────────┐    ┌──────────────────────────────┐    │
│  │  Vite Dev Server    │    │  Express + Socket.IO         │    │
│  │  :5173              │    │  :3002                       │    │
│  │                     │    │                              │    │
│  │  App.tsx            │    │  REST API                    │    │
│  │  ├─ Header          │◄──►│  ├─ GET  /api/projects      │    │
│  │  ├─ StatusDashboard │    │  ├─ POST /api/projects/switch│    │
│  │  ├─ DirectorSection │    │  ├─ GET  /api/files          │    │
│  │  ├─ MusicSection    │    │  ├─ GET  /auth/url           │    │
│  │  ├─ ThumbnailSection│    │  ├─ GET  /auth/callback      │    │
│  │  ├─ MarketingSection│    │  ├─ GET  /auth/status        │    │
│  │  └─ ShortsSection   │    │  └─ POST /shorts/upload      │    │
│  │      ├─ ShortCard   │    │                              │    │
│  │      ├─ ReviewModal │    │  Socket.IO Events            │    │
│  │      ├─ ScheduleModal    │  ├─ delivery-data (bi-dir)   │    │
│  │      └─ FileBrowser │    │  ├─ active-project           │    │
│  │                     │    │  ├─ start-render             │    │
│  └─────────────────────┘    │  └─ render-progress          │    │
│           │                 │           │                   │    │
│           │  useDeliveryStore (Hook)    │  chokidar watch   │    │
│           │  Socket.IO Client ◄────────►  delivery_store.json   │
│           │                 │                              │    │
├───────────┼─────────────────┼──────────────────────────────┤    │
│  Volumes  │                 │                              │    │
│  /app ◄───── delivery_console/ (rw, 源码, HMR)            │    │
│  /data/projects ◄── Projects/ (rw, 项目数据)               │    │
│  /app/secrets ◄── secrets/ (ro, OAuth credentials)         │    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 模块详解

### 4.1 项目管理（多项目热切换）

**后端**（`server/index.ts`）:
- `PROJECTS_BASE` 从 `process.env.PROJECTS_BASE` 读取（Docker: `/data/projects`，本地: `../../Projects`）
- `currentProjectName` 是 运行时可变的 `let` 变量
- `POST /api/projects/switch` 更新内存变量 → 重绑 chokidar watcher → 推送新数据给所有客户端
- `GET /api/projects` 扫描 `PROJECTS_BASE` 下的子目录，标注 `isActive` 和 `hasDeliveryStore`

**前端**（`src/components/Header.tsx`）:
- 下拉菜单调 `/api/projects` 获取列表
- 点选后 POST `/api/projects/switch`
- 数据更新通过 Socket.IO `delivery-data` 事件自动推送，无需前端刷新

### 4.2 数据流（delivery_store.json）

```
Obsidian/AI Skills 写入 → delivery_store.json → chokidar 检测 → Socket.IO 推送 → React 更新
React 用户操作 → Socket.IO emit → 后端写入 → chokidar 检测 → 广播给其他客户端
```

**核心 Hook**: `src/hooks/useDeliveryStore.ts`
- 连接 `http://127.0.0.1:3002` Socket.IO
- `delivery-data` 事件接收完整 `DeliveryState` 对象
- `updateState()` 乐观更新 + emit 给后端

### 4.3 五大交付模块

| 模块 | 组件 | Phase 机制 | 说明 |
|------|------|-----------|------|
| **Director (Visual)** | `DirectorSection.tsx` | Phase 1→2 | AI 导演视觉概念提案 → 用户审批 → 执行清单 |
| **Music** | `MusicSection.tsx` | Phase 1→2 | AI 音乐定调提案 → 审批 → 执行清单 |
| **Thumbnail** | `ThumbnailSection.tsx` | — | 多方案 variants 管理，可选中/删除 |
| **Marketing** | `MarketingSection.tsx` | — | SEO/Social/GEO 策略，可导入到 Shorts |
| **Shorts** | `ShortsSection.tsx` | 状态机 | 完整发布流水线（详见 4.4） |

### 4.4 Shorts 发布状态机

```
draft → linked → script_review → rendering → render_review → approved → scheduled → uploading → published
  │                                                                │
  └── (Link Video) ── linked ─────────────────────────────────────┘
```

**关键操作**:
- **Link Video**: `FileBrowserModal` 浏览本地文件系统，选 `.mp4`
- **Schedule**: `ScheduleModal` 设置日期/时间 + 可从 Marketing 模块导入元数据
- **Upload**: 调 `POST /shorts/upload`，使用内存中的 OAuth Token → YouTube API

### 4.5 YouTube OAuth（零持久化）

**文件**: `server/youtube-auth.ts`

```
用户点 "Link Account" → GET /auth/url → 打开 Google 授权页
→ 用户授权 → GET /auth/callback → 换取 access_token → 存内存
→ GET /auth/status → 检查 token 是否有效
→ POST /shorts/upload → 使用 token 调 YouTube Data API v3 上传
```

- **安全设计**: access_token 只存内存，进程重启即失效
- **secrets/client_id.json**: Google Cloud Console 下载的 OAuth 客户端凭据（不入 git）

---

## 5. 文件路径索引

### 后端
| 文件 | 行数 | 职责 |
|------|------|------|
| `server/index.ts` | ~400 | 主服务：Express + Socket.IO + 项目管理 + Remotion 渲染 |
| `server/youtube-auth.ts` | ~260 | OAuth 流程 + YouTube upload API |

### 前端
| 文件 | 行数 | 职责 |
|------|------|------|
| `src/App.tsx` | ~83 | 根组件，组装五大模块 |
| `src/types.ts` | ~134 | 14 个 TypeScript 接口定义 |
| `src/hooks/useDeliveryStore.ts` | ~84 | Socket.IO 状态管理 Hook |
| `src/components/Header.tsx` | ~141 | 顶部栏 + 项目切换下拉框 |
| `src/components/StatusDashboard.tsx` | ~180 | 总进度 + 各模块状态卡片 |
| `src/components/DirectorSection.tsx` | ~210 | 导演模块 UI |
| `src/components/MusicSection.tsx` | ~210 | 音乐模块 UI |
| `src/components/ThumbnailSection.tsx` | ~180 | 缩略图模块 UI |
| `src/components/MarketingSection.tsx` | ~220 | 营销模块 UI |
| `src/components/ShortsSection.tsx` | ~360 | Shorts 发布流水线 |
| `src/components/ShortCard.tsx` | ~200 | 单个 Short 卡片 |
| `src/components/ReviewModal.tsx` | ~270 | 审核弹窗 |
| `src/components/ScheduleModal.tsx` | ~650 | 排期弹窗（含 Marketing 导入） |
| `src/components/FileBrowserModal.tsx` | ~180 | 本地文件浏览器 |

### 配置 & Docker
| 文件 | 职责 |
|------|------|
| `.env` | 项目名 + 端口 + PROJECTS_BASE |
| `Dockerfile.dev` | 统一开发容器（Node 20 Alpine + tini） |
| `docker-compose.yml` | 单容器 + 精确卷挂载 |
| `Makefile` | Docker 操作快捷命令 |
| `vite.config.ts` | Vite + React + TailwindCSS PostCSS |
| `secrets/client_id.json` | Google OAuth 凭据（不入 git） |

---

## 6. 外部依赖

| 依赖 | 用途 | 版本 |
|------|------|------|
| `express` | REST API | v5 |
| `socket.io` / `socket.io-client` | 实时双向通信 | v4.8 |
| `chokidar` | 文件系统监听 | v5 |
| `googleapis` | YouTube Data API v3 | v168 |
| `google-auth-library` | OAuth 客户端 | v10 |
| `dotenv` | 环境变量 | v16 |
| `react` / `react-dom` | UI 框架 | v19 |
| `vite` | 构建工具 | v7 |
| `tailwindcss` | CSS 框架 | v4 |
| `lucide-react` | 图标库 | v0.563 |
| `tsx` | TypeScript 直接运行 | v4 |
| `concurrently` | 前后端并行启动 | v9 |

---

## 7. 启动指南

### Docker 模式（推荐）
```bash
cd delivery_console

# 首次构建
make init

# 启动开发环境
make dev          # 前台运行（看日志）
make dev-d        # 后台运行

# 其他命令
make logs         # 查看日志
make shell        # 进入容器 shell
make stop         # 停止
make rebuild      # 重建（package.json 或 Dockerfile 改动后）
make clean        # 清理所有容器和镜像
```

### 本地模式
```bash
cd delivery_console
# 注释掉 .env 中的 PROJECTS_BASE 行
npm install
npm run dev
```

访问: `http://localhost:5173` (前端) / `http://localhost:3002` (后端 API)
