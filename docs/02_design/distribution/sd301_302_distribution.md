# 🚀 [SD-301 & SD-302] Distribution Console (分发控制台) 系统设计与实施方案

> **设计方**: Antigravity (Opus 4.6)
> **实施方**: OpenCode (GLM-5)
> **前置依赖**: [architecture_v3_master.md](./architecture_v3_master.md)
> **文档状态**: Draft 2 (包含国内平台开源分发选型)

---

## 🔪 0. 核心开发哲学：奥卡姆剃刀 (Occam's Razor)

**老卢的开发哲学天条：在满足业务逻辑的基础上，系统必须尽可能安全、简单、健壮、容易维护。**
- **不做大而全的聚合怪**：只做针对 MindHikers 创作者流转必须的 API 接驳。
- **拥抱现有轮子**：基础的多平台发布逻辑，坚决不从零发明轮子。国际平台参考 **Mixpost / Postiz** 的队列架构；国内平台全面参考并魔改 **social-auto-upload** 和 **Wechatsync** 等成熟的自动化开源项目。
- **文件系统即数据库**：所有核心输入/输出，必须在统一的项目存储目录中落盘存根，不依赖黑盒数据库集群。

---

## 1. 业务全景：三级火箭的最后一公里

分发控制台 (Distribution Console) 承接二级火箭 (Delivery Console) 产出的独立资产，将其包装并推送到全网。

### 1.1 总体架构

```mermaid
graph TD
    subgraph "全局存储体系 Project Store"
        P_MD[📄 02_Script/*.md (微短图文源)]
        P_MP4_169[📼 05_Shorts_Output/*_16-9.mp4]
        P_MP4_916[📱 05_Shorts_Output/*_9-16.mp4]
    end

    subgraph "SD-301: 灵活组装层 (Assembly Line)"
        A1[模式 1: 短平快裁剪]
        A2[模式 2: 深度包装叠加]
        A3[模式 3: 直发成品]
    end

    subgraph "SD-302: 全域分发矩阵 (Nexus Engine)"
        D_Auth[🔑 多平台 Auth 中心]
        D_Queue[⏳ 任务调度队列]
        
        PlatformA[📌 A类: X/微博/公众号]
        PlatformB[📺 B类: YouTube/B站]
        PlatformC[📱 C类: Shorts/视频号/抖音]
    end

    P_MP4_169 --> A1
    P_MP4_169 --> A2
    P_MP4_916 --> A3
    
    A1 -->|9:16 成片| D_Queue
    A2 -->|9:16 成片| D_Queue
    A3 -->|9:16 成片| D_Queue
    P_MD --> D_Queue
    
    D_Queue <--> D_Auth
    D_Queue --> PlatformA
    D_Queue --> PlatformB
    D_Queue --> PlatformC
```

---

## 2. [SD-301] 长短视频灵活组装层设计

这部分核心是解决**视频资产形态的转化**，其底层技术依赖主要为 `ffmpeg` 或轻量级云原生视频处理（如 Remotion Server）。

### 2.1 三大组装模式流转图

对于用户传入的资产，在弹窗中给予三个选项：

| 模式                  | 输入要求      | 处理流水线 (后台静默执行)                                                                                                     | 输出件                     |
| --------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **模式 1 (短平快)**   | 16:9 横屏 MP4 | 1) `ffmpeg -crop` 居中截取 9:16<br>2) 抽取音频调 Whisper API 生成字幕<br>3) 烧录字幕 (硬字幕)<br>4) 叠加预设 BGM              | 纯净 9:16 MP4 (含字幕/BGM) |
| **模式 2 (深度包装)** | 16:9 横屏 MP4 | 1) `ffmpeg -crop` 居中截取 9:16<br>2) 唤醒二级火箭的 Remotion 子进程<br>3) 在截取的视频上层叠加金句卡/粒子特效<br>4) 混音出片 | 复合特效 9:16 MP4          |
| **模式 3 (直发成品)** | 9:16 竖屏 MP4 | 绕过视频处理，仅作 Metadata 解析验证。                                                                                        | 原始 9:16 MP4              |

### 2.2 接口契约：组装 API

```typescript
// POST /api/distribution/assemble
interface AssembleRequest {
    projectId: string;
    sourceFile: string; // 例如: "05_Shorts_Output/raw_169.mp4"
    mode: 1 | 2 | 3;
    options: {
        bgmPath?: string; // 选填音乐大师的 BGM
        remotionTemplateUrl?: string; // 模式 2 必填
    }
}

// 异步处理，前端通过 WebSocket 监听进度
```

---

## 3. [SD-302] 全域三圈层分发矩阵设计

该模块的核心借鉴开源项目 **Mixpost** (Vue/Laravel 思路) 或 **Postiz** 的调度逻辑：**统一入口，异步队列，重试机制，账号池解耦**。

### 3.1 凭据与账号池中心 (Auth Nexus)

- **坚决摒弃**："每个项目配一遍 Token"。
- **设计主张**：系统存在一个全局的 `~/.mindhikers/auth.json` 或加密的 SQLite，存储全平台 Token。分发时只需关联 ID。

| 圈层           | 平台           | 授权方式与开源基座参考                      |
| -------------- | -------------- | ------------------------------------------- |
| **A类 (图文)** | X (Twitter)    | OAuth 1.0a / 2.0 API (基于 Postiz)          |
|                | 新浪微博       | **Wechatsync** (开源同步) 或 官方 API       |
|                | 微信公众号     | **Wechatsync** / Markdown转Draft            |
| **B类 (长轴)** | YouTube        | OAuth 2.0 (已有雏形)                        |
|                | Bilibili (B站) | **social-auto-upload** (Playwright模拟)     |
| **C类 (竖屏)** | YouTube Shorts | 同 YouTube (加标签区分)                     |
|                | 微信视频号     | **social-auto-upload** (持续Cookie)         |
|                | 抖音           | **social-auto-upload** / DouYin-Auto-Upload |

### 3.2 任务队列调度器 (Task Queue)

引入 `BullMQ` (Node.js) 或同等轻量级基于内存/Redis的队列系统。
- **🛡️ 安全保险丝二 (拟人化随机延时)**：在多平台群发请求入队时，严禁并发齐射。系统自动为每个子任务错峰压入 `delay: Math.random() * (10 - 3) + 3` (3到10分钟) 的随机延迟。这就要求前端必须提供一个**极简但明确的倒计时或漏斗等待动画**。

```typescript
// 投递任务结构字典
interface PublishTask {
    taskId: string;
    projectId: string;
    platforms: string[]; // ['youtube', 'bilibili', 'twitter']
    assets: {
        mediaUrl: string; // file:// 前缀的本地组装好的 MP4
        textDraft: string; // 标题与文案
        tags: string[];
    };
    scheduleTime?: string; // 用户指定的定时发送时间 (ISO 8601 格式，含时区)
    timezone?: string;     // 显式指定的目标时区 (如: "Asia/Shanghai" 或 "America/New_York")
    systemDelayMs?: number;// ⚠️ 系统分配的风控错峰随机延时
}
```

---

## 4. 给 GLM-5 的分阶段开发实施方案 (Ticket 拆包)

鉴于 OpenCode（GLM-5 开发团队）的工作模式，实施全过程被切分为 **5 个必须线性执行的原子 Sprint**。

> ⚠️ **GLM-5 禁忌事项**: 不要在开始阶段就去搞国内平台的高强度逆向（如视频号），先用标准的海外平台打通整个主脑的数据流转。

### 🎟️ Ticket 1: 基础设施建设 (Week 1)
**目标**：拉起 Distribution 模块的骨架，建立全局 Auth 中心。
- [ ] 初始化基于 React + Vite 的新前端页面（或挂载在 Console 统一框架内）。
- [ ] 撰写 Auth Service：集成 YouTube OAuth + Twitter OAuth 核心通路。
- [ ] **日志契约测试**：模拟一次无效的 YouTube 上传，证明系统的报错不仅打印在 terminal，且会写入 `delivery_store.json` 的 `error` 块。
- [ ] *前端呈现*：一个全局设置页面的 Mock，显示各社交平台的绑定状态（绿灯/红灯）。

### 🎟️ Ticket 2: [SD-301] 长短视频组装流水线 (Week 2)
**目标**：通过 `fluent-ffmpeg` 在后端跑通三大模式。
- [ ] 实现基础视频工具类 `VideoProcessor.ts`。
- [ ] 跑通传入横屏视频，自动裁剪 9:16 并覆盖传入音频的流程。
- [ ] *接口验收*：调用 `/api/distribution/assemble`，能在服务器的 `05_Shorts_Output/` 目录下生成处理后的成片。
- [ ] 前端：开发一个简单的三个模式的 Radio 选择框，点击后显示处理进度条。

### 🎟️ Ticket 3: 调度引擎引入 (Week 3)
**目标**：用 `BullMQ` 接管直连发布的高风险动作。
- [ ] 搭建 Worker 节点监听发布指令。
- [ ] 写死一个假的发布服务。测试定时发布功能：设定当前时间 + 5分钟，队列能在 5 分钟后打印执行日志。
- [ ] 将 Ticket 1 的真实 YouTube 发布方法挂载到 Worker 中。

### 🎟️ Ticket 4: 图文阵地扩散 (A 类平台) (Week 4)
**目标**：打通 `02_Script` 中的 Markdown 长文与社交媒体的桥梁。
- [ ] 读取指定的 Markdown 文件，提取标题与正文。
- [ ] 接入 X (Twitter) API，实现包含图文的 Tweet 发布。
- [ ] *安全卡点*：任何跨平台发布前，必须在页面渲染完整的确认弹窗。

### 🎟️ Ticket 5: 国内分发平台攻坚 (Week 5 - 拔高项)
**目标**：突破没有标准 OAuth 的中国国内平台（抖音、视频号、B站、微信公众号）。
- [ ] 研读并提取 GitHub 开源项目 **social-auto-upload** 的 Playwright 自动化核⼼代码。
- [ ] 编写国内视频类上传引擎：通过 Playwright 实现 B站、抖音、视频号的扫码登录态持久化（保存 Context Cookies），并在后台无头浏览器中完成表单填充和 MP4 上传。
- [ ] 研读开源项目 **Wechatsync**，编写国内图文类（微信公众号、新浪微博）的 Markdown 到草稿箱的自动化写入。
- [ ] *奥卡姆剃刀卡点*：如果自动化脚本过于脆弱，宁可先提供“生成高度标准化的发布物料包+一键复制标题按钮”，让人工兜底，也不要引入极其复杂的 OCR 或逆向工程。

---
*设计定稿记录：为 OpenCode 交付使用准备就绪。*
