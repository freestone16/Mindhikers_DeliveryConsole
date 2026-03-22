# 沙漏型架构（Hourglass Architecture）

> **Delivery Console 导演模块核心架构铁律**
> 任何开发工作必须严格遵守此文件定义的边界。

---

## 架构总览

```
┌─────────────────────────────────────────┐
│        Director Master（大脑）           │
│  - 对文稿进行逻辑降维与情绪剥离           │
│  - 提取结构化概念（象限/对比/知识树等）    │
│  - 只输出纯净的结构化数据字典             │
│  - 严禁：坐标计算、帧率演算、画面生成      │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│     Zod Schema 握手层（VibePayload）      │
│  - 严格强类型契约                         │
│  - 屏蔽运行时不可预测行为（临时API调用等） │
│  - 例：{ "title": "...",                 │
│          "metrics": [...],               │
│          "theme": "deep-space" }         │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│    Delivery Console（调度层 = 胶水代码）  │
│                                         │
│  唯一职责：触发一条 CLI 指令             │
│                                         │
│  npx remotion render src/index.tsx      │
│    <Template_ID> out.mp4                │
│    --props=/path/to/VibePayload.json    │
│                                         │
│  ❌ 禁止：校验模板合法性                  │
│  ❌ 禁止：改写/降级 props                 │
│  ❌ 禁止：白名单管理                      │
│  ❌ 禁止：任何模板知识                    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│     Remotion Studio（肌肉，渲染黑盒）     │
│  - 纯函数式 React 视频渲染引擎            │
│  - 预埋 15+ 硬编码宏模板                 │
│  - 所有视觉张力封装在组件内部沙盒         │
│  - Spring 弹簧物理、帧插值、多重阴影等    │
│    100% 在组件内部处理                   │
└─────────────────────────────────────────┘
```

---

## 核心原则

### Director Master 的边界
- **只做**：自然语言 → 结构化数据字典
- **严禁**：坐标（X/Y）、帧率演算、直接生成画面描述

### Delivery Console 的边界
- **只做**：拿到 JSON Payload + Template ID → 触发 CLI 渲染
- **严禁**：任何形式的模板知识、props 改写、降级逻辑

### Remotion Studio 的边界
- **只做**：消费 VibePayload → 确定性输出 MP4/GIF
- **自治**：所有视觉计算在组件沙盒内部处理

---

## 架构收益

- **大模型**只需专注于"传达什么"
- **组件引擎**只需专注于"如何漂亮地呈现它"
- **中间契约**永远保持稳定与清爽
- **扩容方向**：上游可无限增加剧本复杂度，下游可无限新增 React 组件特效，两端互不影响

---

## DC 代码对齐状态

| 文件 | 状态 | 说明 |
|---|---|---|
| `server/llm.ts` | ✅ 纯透传 | warn-only，不降级不改写 |
| `server/director.ts` `buildRemotionPreview` | ✅ 纯透传 | `{ compositionId: template, props }` 直传 |
| `server/remotion-api-renderer.ts` | ✅ 纯 CLI 调度 | 拼命令、执行、返回结果 |
| `server/skill-loader.ts` | ✅ 注入 catalog | 将 remotion_catalog.md 注入 Director prompt |

---

> **最后更新**：2026-03-22
> **原文来源**：《关于 Director Master 与 Remotion Studio 拉通验证的架构说明》
