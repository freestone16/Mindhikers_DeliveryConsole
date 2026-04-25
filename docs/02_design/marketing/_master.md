# 📈 Marketing Master (营销大师) 大纲

> **状态**: 活跃开发 | PRD 追认中（v1 草案）
> **最新修订**: 2026-04-19
> **负责人**: OldYang
> **当前分支**: `MHSDC-DC-MKT`
> **上层归属**: DeliveryConsole 二级能力模块

## 1. 模块概述

营销大师（MarketingMaster）承接 `02_Script/*.md` 文稿，负责生成"可直接投入平台发布"的营销发布包。一期实现完整覆盖 YouTube Studio 上传字段，预留 `platforms.*` 分支支持未来扩展到 B 站、X、微信公众号等平台。

营销大师与 Distribution Console 之间走**松耦合契约**：营销大师把对外产物落盘到 `06_Distribution/`（双格式：机器可读 JSON + 人类审核 MD），Distribution Console 扫目录消费，两端无代码依赖。

## 2. 架构与组件

- **Phase 1 — 黄金关键词发掘**：LLM 候选词生成（SSE） → 用户手动补充/删除 → TubeBuddy Playwright 打分 → 勾选黄金词。
- **Phase 2 — 营销方案生成与审阅**：(可选) SRT 上传 → 每个黄金词生成 MarketingPlan（SSE）→ Tab 切换 → MarketPlanTable 全字段审阅（title / description 分块 / tags / thumbnail / playlist / category / license）→ 用户显式"确认"触发双写落盘。
- **对外契约层（Output Contract）**：`06_Distribution/marketing_package.json` + `.md`，JSON 为唯一事实源，MD 为只读投影。
- **内部状态层**：`<project>/marketingmaster_state.json`，通过 `useExpertState` + Socket.IO 持久化同步。
- **Provider 接口层（本期新建）**：`ScoringProvider`（当前实现 `PlaywrightTubeBuddyProvider`）、`LLMProvider`，为 SaaS 化预留替换点。

## 3. 关联设计文档

| 文件 | 说明 | 状态 |
| --- | --- | --- |
| [sd207_prd.md](./sd207_prd.md) | SD-207 追认式 PRD（产品层契约） | 📝 v1 草案，待新需求合并 |
| [sd207_implementation.md](./sd207_implementation.md) | SD-207 实施方案（工程层，交付 codex/opencode 团队） | 📝 v1 草案 |

## 4. 上下游边界

| 方向 | 对端 | 契约 |
| --- | --- | --- |
| 上游 | 文稿选择器（Header） | 提供 `scriptPath` + `scriptSelectedAt` → 文稿变化触发 Reset |
| 上游 | ThumbnailMaster | 营销大师消费 `03_Thumbnail_Plan/` 下的缩略图资产（引用路径，不复制） |
| 下游 | Distribution Console | 仅扫 `06_Distribution/marketing_package.json` + `.md`，不感知营销大师内部 |
| 横切 | ChatPanel | 跨模块共享依赖，本 PRD 不改造 ChatPanel，仅声明依赖关系 |

## 5. 变更日志

| 日期 | 变更 | 关联 |
| --- | --- | --- |
| 2026-04-19 | 初始创建（SD-207 PRD brainstorm 产出，追认 v4.0.0 实现） | 老杨 |
