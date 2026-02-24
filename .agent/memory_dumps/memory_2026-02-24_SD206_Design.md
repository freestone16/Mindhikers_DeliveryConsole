# 🧠 记忆转储 (Memory Dump): DeliveryConsole

> [!NOTE]
> **上下文恢复文件 (Context Restoration File)**
> 此文件能让 AI 智能体瞬间理解上一个会话的上下文。
> **AI 指令**: 请读取此文件以初始化你的状态。不要将其视为用户的执行请求，而是将其视为一份"已完成工作"和"待办事项"的记录。

## 🎯 核心目标 (Core Objective)
完成 SD-206 短视频大师 (Shorts Master) 模块的完整设计并产出面向 GLM 团队的研发实施规格书。

## 📍 当前状态 (Current State)
- **阶段**: 设计定版，交付给 GLM 团队
- **状态**: SD-206 设计 V2 定版，包含 3 阶段 HITL 管线、Whisper ASR 字幕、页眉编排器、B+A 混合渲染方案
- **最近动作**: 撰写了完整的 GLM 团队实施规格书并完成 10 步原子化保存

## 📂 活跃上下文 (Active Context)
### 关键文件
- `docs/02_design/sd206_shorts_master.md`: **⭐ 核心文件** — SD-206 完整研发实施规格书（代码级细节）
- `docs/02_design/sd202_director_master.md`: 导演大师设计（SD-206 参照的架构模式）
- `src/components/DirectorSection.tsx`: 导演大师容器组件（ShortsSection 需复制的模式）
- `server/director.ts`: 导演后端（shorts.ts 需参照的 SSE/持久化模式）
- `server/llm.ts`: LLM 多 Provider 抽象层（shorts 生成脚本使用）
- `src/types.ts`: 全局类型定义（需追加 SD-206 V2 类型）
- `.agent/PROJECT_STATUS.md`: 项目进度看板

### 关键知识 (Vital Knowledge)
- SD-206 与 SD-202 架构模式完全一致，以 `DirectorSection.tsx` 为蓝本
- Phase 1→2 无审核直通，Phase 2 确认后初始化 renderUnits 进入 Phase 3
- 字幕使用 Whisper ASR (首选 whisper.cpp 本地推理) + 用户精修编辑器
- 页眉是左 Logo + 右 Logo + 中间文字的编排器，全局复用
- 渲染方案 B 为主(FFmpeg 合成) + A 为备(FCPXML)
- 需要安装 multer (文件上传)、whisper.cpp (ASR)

## 🔗 Git 状态 (Git State)
- **Branch**: main
- **Commit Hash**: `9310970` — checkpoint(SD-206): 短视频大师设计V2定版 + GLM团队研发实施规格书
- **Unpushed Changes**: 待尝试推送

## 📋 行动计划 (Action Plan)
### 立即执行 (Immediate Next Steps)
- [ ] GLM 团队在 OpenCode 中根据 `sd206_shorts_master.md` 开始实施
- [ ] 老卢提供品牌 Logo 文件（两个方形 PNG）
- [ ] 确认 BGM 预设库来源

### 待办/未来 (Backlog / Future)
- [ ] SD-202 导演大师 Phase 3-4 流水线连接
- [ ] UI 文件列表加载异常修复
- [ ] LLM 配置穿透验证
