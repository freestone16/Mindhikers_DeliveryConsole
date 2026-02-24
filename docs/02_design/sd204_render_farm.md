# 🚀 [SD-204] 渲染农场与进程调度中心 (Render Farm) 系统设计

> **设计方**: Antigravity (Opus 4.6)
> **实施方**: OpenCode (GLM-5)
> **前置依赖**: [architecture_v3_master.md](./architecture_v3_master.md), [Delivery_Console_渲染引擎解耦需求文档.md](./Delivery_Console_渲染引擎解耦需求文档.md)
> **文档状态**: Draft 1 (融合重构版)

---

## 🔪 0. 核心开发哲学：大脑与双手物理隔离 (Brain vs. Hands)

在应对 CSET-Seedance2 中遇到的 `sandbox-exec` 隔离问题时，本模块确立了 MindHikers **最底层的安全与职责边界：指控分离**。

- **🧠 大脑（AI Agent / 导演大师等）**：运行在受限沙盒内。只负责纯文本、智力密集的劳动。输出物永远是纯文本的配置文件 JSON 到隐藏的 `.tasks` 目录。**坚决不允许 AI Agent 去跨进程 `spawn` 或调用真实浏览器的端口**。
- **🦾 双手（ Delivery Console 后端）**：由老卢真实授权启动的 Node.js 宿主进程 (Host Process)。享有系统级文件写入权限和跨端口通信权限。它负责读取大脑下发的 JSON，在宿主机真枪实弹地打出 MP4 成片。

---

## 1. 业务全景：渲染任务流转

```mermaid
graph TD
    subgraph "沙盒极境 (Sandbox)"
        AI[🧠 AI Agent (导演大师)]
    end

    subgraph "Project Store (宿主机文件系统)"
        T[(📄 .tasks/render_queue.json)]
        O[(🎬 06_Video_Broll/或05_Shorts_Output/)]
    end

    subgraph "宿主全权境 (Host OS)"
        DC[🏭 Delivery Console (Node.js)]
        CP((⚙️ Child_Process))
        REM[📦 npx remotion render]
    end

    CUI[💻 前端看板 Render Farm UI]

    AI -- "生成渲染指令 (无执行权)" --> T
    DC -- "轮询或接收 API 触发" --> T
    DC -- "1. 解析指令并 Spawn" --> CP
    CP -- "2. 在项目上下文中执行" --> REM
    REM -- "3. 物理级榨干算力输出 MP4" --> O
    REM -. "4. stdout/stderr 日志流" .-> DC
    DC -- "5. 解析百分比 WebSocket 推送" --> CUI
```

---

## 2. 核心架构设计

### 2.1 任务派发与数据状态契约 (Task Payload)

AI 落在 `.tasks/render_queue.json` 中的单条任务指令如下。这也是前端或直接调用 API 的标准 Payload：

```typescript
// 文件位置: Projects/项目名/.tasks/render_queue.json 数组中的对象
// POST /api/jobs/render 的 Request Body
interface RenderJobPayload {
    jobId: string;            // UUID
    projectId: string;        // 当前项目名
    engine: "remotion" | "ffmpeg" | "seedance"; // 引擎类型
    compositionId: string;    // 例如 "MainVideo" 或 "ShortsReel"
    entryPoint: string;       // 渲染入口，如 "src/index.ts"
    outName: string;          // 期望输出的文件名，如 "final_1080p.mp4"
    outDir: string;           // 相对存盘目录，通常是 "06_Video_Broll" 或 "05_Shorts_Output"
    options: {
        props?: any;          // Remotion 注入的动态参数 (Input Props)
        concurrency?: number; // CPU 并发数
        codec?: string;       // 默认 h264
    }
}
```

### 2.2 本地进程调度库 (Child Process Manager)

后端的 `RenderManager.ts` 是整个农场的心脏。

- **防挂死策略**：对 Spawn 的子进程加上超时（Timeout）机制，超长渲染时间强制 Kill。
- **并发锁**：宿主机同一时间最高允许 `MAX_CONCURRENT_RENDERS = 2` 的大算力进程，超过则进入等待队列 (Pending)。
- **日志清洗器**：拦截 `npx remotion render` 的命令行输出字符串，正则匹配出 `[34%]` 或 `Frame 100/300` 等进度，并转换为纯净的百分比数字，通过 Socket 推给前端。

---

## 3. UI 交互：渲染看板 (Render Farm Dashboard)

在现有的 Delivery Console 中，为老卢专门开辟一个全局视角的监控区块：

1. **队列列表 (Queue List)**：显示等待中、执行中、已完成、失败的任务列表卡片。
2. **上帝进度条**：执行中的卡片带有动态进度条（0-100%）。
3. **熔断按钮 (Abort)**：老卢发现进度卡死或风扇狂转时，一键发送 `SIGTERM` 给后端的子进程停止渲染。
4. **快速审片按钮**：渲染完成后，提供**“打开文件所在目录”**或直接用系统默认播放器播放 MP4 的按钮。

---

## 4. 给 GLM-5 的分阶段开发实施方案 (Ticket 拆包)

鉴于渲染模块直接接触底层进程，存在较高风险，GLM-5 必须严格按照以下阶段开发，并在每一步留存日志。

### 🎟️ Ticket 1: API 与伪渲染队列搭建 (Mock Layer)
**目标**：不碰真实的 Remotion，把从 API 到前端 WebScoket 的全链路跑通。
- [ ] 后端：编写 `RenderManager.ts`，能接收 `POST /api/jobs/render` 请求，并将其放入内存队列中串行处理。
- [ ] 编写一个假的 `MockSpawn` 进程，每秒前进 10%，并在 10 秒后返回成功。向前端广播 `render-progress: { jobId, progress }` 事件。
- [ ] 前端：新增 `RenderFarm.tsx` 看板组件，完成 UI 展示。

### 🎟️ Ticket 2: 真实的 Child Process Spawn 接驳
**目标**：在 Host 环境下安全唤起真实命令行命令。
- [ ] 后端使用 `child_process.spawn` 真正替换掉 `MockSpawn`。
- [ ] 编写简单的测试命令（如 `ping 127.0.0.1 -c 5`），测试获取 stdout 并推送到前端。
- [ ] *安全防线*：所有传入 `spawn` 的命令参数必须严格转义，防止命令注入（Command Injection）。

### 🎟️ Ticket 3: 适配 Remotion 渲染引擎指令集
**目标**：针对 Remotion CLI 的特殊参数和输出进行适配。
- [ ] 将 payload 转换为规范的命令：`npx remotion render <entryPoint> <compositionId> <outDir/outName> --props='xxx'`。
- [ ] **日志清洗**：编写正则表达式，从 Remotion 复杂的命令行终端输出中提取单纯的进度百分比数字。
- [ ] 结合统一状态存储，将渲染失败的错误堆栈写回项目目录下的 `delivery_store.json` 的 `error` 节点。

### 🎟️ Ticket 4: 渲染中止与物理级清理 (Cleanup & Abort)
**目标**：确保系统的健壮性，绝不留下僵尸进程。
- [ ] 提供 `POST /api/jobs/abort/:jobId` 接口。
- [ ] 后端接到终止信号后，准确获得 `childProcess.pid` 并发送 `kill('SIGINT')`。
- [ ] *清理机制*：如果渲染半途中止，后端必须主动删除生成的残缺 `.mp4` 文件及可能的临时缓存目录。

---
*设计定稿记录：为 OpenCode 交付使用准备就绪。*
