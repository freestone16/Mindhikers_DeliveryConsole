# 多项目隔离与项目中控台 (Multi-Project Isolation & Dashboard)

## 问题背景

当前系统的 `server/index.ts` 使用 **全局可变变量** (`currentProjectName`, `PROJECT_ROOT`, `DELIVERY_FILE`) 管理活跃项目。当一个浏览器窗口调用 `/api/projects/switch` 时，后端修改全局状态并通过 `io.emit()` 向 **所有** Socket.IO 客户端广播新数据，导致：

1. 所有浏览器窗口被迫切换到同一项目
2. 无法同时在两个窗口独立操作不同项目
3. 前端 `useDeliveryStore.ts` 也只维护单一 `DeliveryState`

**改造目标**：让每个浏览器 Tab 可以独立绑定一个项目，互不干扰，并提供一个项目中控台总览所有项目进度。

---

## User Review Required

> [!IMPORTANT]
> **架构决策 — 隔离粒度**：方案采用 **Socket.IO Room** 机制实现项目隔离。每个客户端连接时声明 `projectId`，加入对应的 Room，后续广播仅向该 Room 发送。这是对现有代码改动最小、风险最低的方案。
> 
> 备选方案是为每个项目启动独立的 WebSocket namespace (`/project-CSET-SP3`)，但当前项目规模下 Room 方案已完全足够。

> [!IMPORTANT]
> **账号系统预留策略**：所有新数据结构中预留 `ownerId?: string` 字段，当前不校验，仅写入 `'local'` 作为默认值。未来账号系统上线后，只需在读写时增加 owner 过滤即可。

---

## Proposed Changes

### 1. 后端：消灭全局可变状态，引入 Room 隔离

#### [MODIFY] [index.ts](file:///Users/luzhoua/DeliveryConsole/server/index.ts)

**核心改造**：

1. **移除全局可变状态**：`currentProjectName`, `PROJECT_ROOT`, `DELIVERY_FILE`, `SHORTS_AROLL_DIR` 等 `let` 变量全部改为按 `projectId` 动态计算的函数调用
2. **新增 `resolveProject(projectId)` 工具函数**：
   ```typescript
   function resolveProject(projectId: string) {
     const root = path.resolve(PROJECTS_BASE, projectId);
     return {
       root,
       deliveryFile: path.join(root, 'delivery_store.json'),
       shortsArollDir: path.join(root, '09_shorts_aroll'),
     };
   }
   ```
3. **Socket.IO Room 机制**：
   - 客户端连接时发送 `join-project` 事件 (携带 `projectId`)
   - 服务端将 socket 加入 `project:<projectId>` Room
   - 所有 `io.emit('delivery-data', ...)` 改为 `io.to(\`project:${projectId}\`).emit(...)`
   - 一个 socket 可以 `leave` 旧 Room 再 `join` 新 Room（切换项目时）
4. **`/api/projects/switch`** 改造为不再修改全局状态，而是：
   - 仅验证项目目录是否存在
   - 返回项目数据，由前端自行切换
5. **File Watcher 改用多项目 Map**：
   - `Map<string, chokidar.FSWatcher>` 按需 watch，避免资源浪费
   - 当 Room 中没有活跃 socket 时，关闭对应项目的 watcher

---

### 2. 后端：新增项目管理 API

#### [MODIFY] [index.ts](file:///Users/luzhoua/DeliveryConsole/server/index.ts)

新增/改造以下 REST 端点：

| 端点                            | 方法 | 功能                                             |
| ------------------------------- | ---- | ------------------------------------------------ |
| `GET /api/projects`             | GET  | 列出所有项目及各模块进度摘要                     |
| `POST /api/projects/create`     | POST | 创建新项目 (目录 + 初始化 `delivery_store.json`) |
| `GET /api/projects/:id/summary` | GET  | 获取单个项目的模块进度详情                       |

**`GET /api/projects` 返回增强**：

```typescript
interface ProjectSummary {
  name: string;
  ownerId: string;          // 预留账号字段, 默认 'local'
  createdAt: string;
  lastUpdated: string;
  moduleProgress: {
    director:  { phase: number; status: string };
    shorts:    { phase: number; scriptCount: number; status: string };
    music:     { phase: number; status: string };
    thumbnail: { variantCount: number; status: string };
    marketing: { isSubmitted: boolean; status: string };
  };
}
```

---

### 3. 前端：项目上下文隔离

#### [MODIFY] [useDeliveryStore.ts](file:///Users/luzhoua/DeliveryConsole/src/hooks/useDeliveryStore.ts)

1. 新增 `activeProjectId` state，从 URL hash (`#project=CSET-SP3`) 或 localStorage 初始化
2. Socket 连接后发送 `join-project` 事件
3. 切换项目时发送 `leave-project` + `join-project`
4. 导出 `switchProject(projectId)` 方法

#### [MODIFY] [App.tsx](file:///Users/luzhoua/DeliveryConsole/src/App.tsx)

1. 从 `useDeliveryStore` 获取 `activeProjectId` 和 `switchProject`
2. 将 `activeProjectId` 传入 `Header` 组件，Header 中显示项目选择器

---

### 4. 前端：项目中控台 (Dashboard)

#### [NEW] [ProjectDashboard.tsx](file:///Users/luzhoua/DeliveryConsole/src/components/ProjectDashboard.tsx)

新页面，作为 `activeModule` 的一个新选项 (`'projects'`) 接入 `App.tsx`。

**UI 概览**：
```
┌─────────────────────────────────────────────────────────────┐
│  📂 项目中控台                               [+ 新建项目]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  CSET-SP3                        2026-02-28 更新      │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │  │
│  │  │导演 ✅ │ │短视频⏳│ │音乐 ✅│ │封面 ⏳│ │营销 ❌│       │  │
│  │  │P3完成 │ │P1/3  │ │P2完成│ │2变体 │ │未开始│       │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │  │
│  │                                        [▶ 进入项目]  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  NEW-PROJECT-01                   2026-02-27 更新      │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │  │
│  │  │导演 ❌ │ │短视频❌│ │音乐 ❌│ │封面 ❌│ │营销 ❌│       │  │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │  │
│  │                                        [▶ 进入项目]  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**功能**：
- 加载所有项目及其模块进度
- 每个模块用 badge 显示阶段 + 状态
- 「进入项目」按钮调用 `switchProject()`，自动跳转到交付台
- 「新建项目」弹窗：输入项目名称 → 调用 `POST /api/projects/create`

#### [MODIFY] [App.tsx](file:///Users/luzhoua/DeliveryConsole/src/App.tsx)

- `ModuleType` 增加 `'projects'` 选项
- Header 导航栏增加「项目中控台」入口

#### [MODIFY] [Header.tsx](file:///Users/luzhoua/DeliveryConsole/src/components/Header.tsx)

- 显示当前活跃项目名称 (可点击切换)
- 新增「项目中控台」导航按钮

---

### 5. 类型定义

#### [MODIFY] [types.ts](file:///Users/luzhoua/DeliveryConsole/src/types.ts)

新增 `ProjectSummary` 和 `ProjectMeta` 类型：

```typescript
export interface ProjectMeta {
  name: string;
  ownerId: string;
  createdAt: string;
  lastUpdated: string;
}

export interface ModuleProgressSummary {
  director:  { phase: number; status: string };
  shorts:    { phase: number; scriptCount: number; status: string };
  music:     { phase: number; status: string };
  thumbnail: { variantCount: number; status: string };
  marketing: { isSubmitted: boolean; status: string };
}

export interface ProjectSummary extends ProjectMeta {
  moduleProgress: ModuleProgressSummary;
}
```

---

## Verification Plan

### Manual Verification

老卢你来帮忙验证以下场景：

1. **多窗口隔离验证**：
   - 打开两个浏览器 Tab
   - Tab A 选择项目 `CSET-SP3`
   - Tab B 选择另一个项目
   - 验证两个 Tab 各自显示独立的项目数据，互不干扰
   - 在 Tab A 中修改数据（如执行导演大师），Tab B 不受影响

2. **项目中控台验证**：
   - 进入「项目中控台」页面
   - 验证所有项目的模块进度 badge 是否正确反映实际状态
   - 点击「新建项目」，输入名称，验证项目创建成功并出现在列表中
   - 点击「进入项目」，验证跳转到对应项目的交付台

3. **刷新保持**：
   - 在某个项目的交付台中刷新浏览器
   - 验证刷新后仍停留在同一项目（通过 URL hash 或 localStorage 恢复）
