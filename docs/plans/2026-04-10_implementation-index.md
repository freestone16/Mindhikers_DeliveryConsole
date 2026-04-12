---
title: "圆桌引擎实施计划索引"
type: index
status: active
date: 2026-04-10
owner: OldYang
---

# 圆桌引擎实施计划索引

> **总纲文档**：不重复各 Unit 细节，仅作入口导航。
> **架构蓝图**：`docs/plans/2026-04-10_roundtable-engine-implementation-plan-v2.md`

---

## Unit 计划列表

| Unit | 主题 | 文档 | 状态 | Commit |
|------|------|------|------|--------|
| Unit 1 | PersonaProfile 契约 + Loader + 7 哲人 | [2026-04-10_unit1-persona-profile.md](2026-04-10_unit1-persona-profile.md) | ✅ 完成 | `5e021fa` |
| Unit 2 | 命题锐化模块 (kimi-k2.5) | [2026-04-10_unit2-proposition-sharpener.md](2026-04-10_unit2-proposition-sharpener.md) | ✅ 完成 | `983e86e` |
| Unit 3 | 圆桌引擎核心 | [2026-04-11_unit3-roundtable-engine.md](2026-04-11_unit3-roundtable-engine.md) | ✅ 完成 | `e891067` |
| Unit 4 | Spike 提取 + 持久化 | [2026-04-11_unit4-spike-extractor-persistence.md](2026-04-11_unit4-spike-extractor-persistence.md) | ✅ 完成 | `958b077` |
| Unit 5 | Spike → 深聊桥接 | [2026-04-12_unit5-spike-deepdive-bridge.md](2026-04-12_unit5-spike-deepdive-bridge.md) | 📝 方案落盘 | - |
| Unit 6 | 前端侧边栏 + 导演 UI | TBD | ⏳ 待开发 | - |
| Unit 7 | GUI 风格对齐 | TBD | ⏳ 待开发 | - |

---

## 关键决策速查

### LLM 模型
- **统一使用**：`kimi-k2.5`
- **Temperature**：固定 1（模型限制）
- **分层**：fast/standard/premium（当前统一，后续可拆）

### 文件路径约定
- Schema：`src/schemas/*.ts`
- 服务端逻辑：`server/*.ts`
- 测试：`server/__tests__/*.test.ts`
- 配置数据：`personas/*.json`（仓根）

### API 前缀
- `/api/roundtable/*`

---

## 文档命名规范

```
YYYY-MM-DD_unit{N}-{主题}.md
```

示例：
- `2026-04-10_unit1-persona-profile.md`
- `2026-04-10_unit2-proposition-sharpener.md`

---

*各 Unit 详细设计参见对应文档，本文件仅作索引。*
