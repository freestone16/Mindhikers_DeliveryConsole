# GoldenCrucible-GC

> MindHikers 黄金坩埚 — **稳定线**> 保留历史模块的归档线，非当前研发主前线。

---

## 定位

`GoldenCrucible-GC` 是黄金坩埚的**稳定线（GC = Golden Crucible）**。

它保留了更多历史模块（如语音识别、YouTube 认证、XML 生成器等），是研发演进过程中的**归档参考线**。当前新功能不在此线开发，主要作为历史基线保留。

---

## 当前状态

- **版本**：v4.0.0
- **分支**：`MHSDC-GC`
- **状态**：维护中，非当前研发主前线
- **最后更新**：2026-04-08

---

## 技术栈

- **前端**：React 19 + TypeScript + Vite 7 + Tailwind CSS 4
- **后端**：Node.js + Express 5 + Socket.io
- **注意**：无 better-auth / PostgreSQL 等认证体系（保留旧架构）

---

## 快速开始

```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible-GC
npm run dev
```

- 前端：`http://localhost:5176`
- 后端：`http://localhost:3004`

---

## 读取顺序

1. `AGENTS.md`
2. `docs/dev_logs/HANDOFF.md`
3. `docs/04_progress/rules.md`
4. `testing/README.md`（如涉及测试）

---

## 安全提醒

- 不要把真实 API Key 写进 README、设计文档或提交记录
- 修改 `.env` 后必须重启服务

---

**最后更新**：2026-04-24
