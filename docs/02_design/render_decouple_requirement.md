# Delivery Console 架构升级需求：AI 与渲染引擎解耦方案

**项目：** MindHikers / Delivery Console
**创建时间：** 2026-02-22
**状态：** 亟待排期 (Urgent Architecture Update)
**背景动因：** CSET-Seedance2 项目中，由于 macOS Sandbox 限制，AI Agent 无法在沙盒环境中拉起 Chrome Headless 执行 `remotion render` 获取渲染视频。

---

## 1. 核心问题分析 (The Problem)

在目前的架构流转下，期望 AI (Agent) 不仅能生成前端代码，还能跨界调用系统级的二进制渲染引擎打出成片。然而，随着 Antigravity 底层安全策略的升级，遇到了严格的 **macOS `sandbox-exec` 物理隔离屏障**：

*   **文件系统隔离**：AI Agent 读取项目级 `node_modules` 软链和隐藏的 `.gitignore` 构建目录时，会被报 OS 级的权限错误 `EPERM (Operation not permitted)`。
*   **临时系统写权限隔离**：使用 `mkdtemp` 建立浏览器缓存时会被操作拦截。
*   **核心机制封堵：Socket 端口隔离**：调用 Puppeteer 启动无头游览器时，系统级安全策略坚决切断跨进程 `bind()` 及 WebSocket 本地握手通信，造成渲染环境致命挂起 (Timed out & CVReturn failed)。

**结论：** 指望运行在高度受限沙盒内的 AI Agent 去执行消耗系统物理设备、需要绑定端口通信的**多媒体重度渲染工作**，不仅不符合沙盒安全哲学，且在工程上已被底层封锁。

---

## 2. 解决方案：职责解耦与渲染托管 (The Solution)

我们需要明确划分 **“大脑（AI 策划与编程）”** 与 **“双手（物理机器的构建与渲染）”**。
既然 **Delivery Console (交付控制台)** 是由真实用户在宿主机 (Host OS) 启动的原生 Node.js 后台进程，它天然继承了机器的**最高系统权限**，且不受外围沙盒的约束。

### 新架构数据流向：
1.  **AI Agent (Director 角色)：**
    *   专注于文稿分析输入、修改 `MHS-demo/src` 内部的 React/Remotion 源码。
    *   最终导出纯文本指令集：`visual_plan.json` 或 `render_queue.json` 配置。
2.  **Delivery Console (渲染与部署控制台)：**
    *   后台轮询（或被动接收 API 触发）读取 json 配置。
    *   由 Console 后端直接在宿主机上下文（Host context）派生子进程 (Child Process)。
    *   以拥有全系统权限的状态，跨包执行：`npx remotion render ...` 等长耗时构建命令。
    *   将导出的 mp4 收纳到指定项目结构 (如 `06_Video_Broll`) 并推流至前端页面显示进度与成片。

---

## 3. 具体功能需求 (Actionable Reqs)

为了实现上述解耦，需要在 Delivery Console 增加以下功能：

### [Req 1] 跨项目任务派发接口 (API Layer)
*   **端点**：`POST /api/jobs/render`
*   **载荷 (Payload)**：接收需要渲染的 `Composition ID`、输出文件名、分辨率、存放路径（`absolutePath`）及并发数策略。
*   **功能**：接收从 AI Agent 生成的渲染任务。

### [Req 2] 本地进程调度器 (Child Process Manager)
*   **功能**：在 Node 后端利用 `child_process.spawn` 或 `exec` 安全唤起 `remotioncli`。
*   **执行上下文**：进入 `MHS-demo` (前端渲染库目录)，在此上下文中执行 `npx remotion render` 或者 `npm run build` 命令。
*   **流式日志**：拦截渲染工具的 `stdout` 和 `stderr`，处理并清洗渲染的进度百分比日志。

### [Req 3] 渲染看板 UI (Frontend Dashboard)
*   **功能**：在控制台中新增一个页签（或内嵌区块）：**“渲染中心 (Render Farm)”**。
*   **展示内容**：
    *   当前排队的任务队列。
    *   执行中任务的**实时进度条**（通过 WebSocket 从后端接收 Req 2 解析出的日志百分比）。
    *   成功与失败的报警状态。
    *   导出的成片提供快速“播放/定位本地文件”按钮。

---

## 4. 实施建议 (Implementation Notes)

这一步改造不仅仅是为了修复当前的 bug，它将确立整个 MindHikers 资产输出流的工业化标准。一旦在控制台上闭环，无论是图片生成、预编译、还是视频最后打包合成，都将有一个强健的系统级中场指挥部，使得 AI 永远只负责轻量级、高价值的纯智力劳动方案 (JSON)，真正实现“指控分离”。
