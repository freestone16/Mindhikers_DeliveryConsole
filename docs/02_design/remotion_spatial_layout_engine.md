# 🎨 Remotion 视觉引擎演进报告

> **版本**: V1.0 - 空间排版引擎（Spatial Layout Engine）
> **设计者**: OldYang (老杨)
> **日期**: 2026-02-28
> **状态**: ✅ 实施完成

---

## 📋 上下文

在 MindHikers 的自动化视频生产流（Delivery Console）中，"视觉生成"被拆分为了两个独立、且职责极度明确的核心大脑与四肢：

- 🎬 **导演大师 (Director AI)** —— 决策层（大脑）
- 🎨 **RemotionStudio** —— 执行层（四肢）

### 职责分工

| 层级 | 角色 | 交互方式 | 输入 | 输出 |
|---|---|---|---|---|
| **导演大师** | 统筹排期的制片人 + 创意总监 | 下发工单 (JSON) | LLM生成的配置 `{ template, props, text, ... }` |
| **RemotionStudio** | 接管工单的具体画师、合成剪辑师 | 接收配置 | 渲染的图片/视频 |

---

## 🔴 核心矛盾

### 问题：导演大师没有"三维空间物理感知"

导演大师（AI 大脑）是没有"三维空间物理感知"的。他下发的文案常常只有5个字，但也可能长达80个字。

而以前后厨（RemotionStudio 组件）只会死板地用"字号80px"把这些词怼在屏幕上——于是，我们迎来了惨绝人寰的排版翻车（出框、截断、失衡）。

### 翻车现象

| 文案长度 | 原字号行为 | 结果 |
|---|---|---|
| 短句（4-8字） | 80px，居中 | ✅ 正常 |
| 中等句（10-20字） | 80px，溢出 | ❌ 出框 |
| 长句（30-60字） | 80px，截断 | ❌ 丢失内容 |
| 超长句（>80字） | 80px，混乱 | ❌ 完全失控 |

---

## 🚀 空间排版引擎（Spatial Layout Engine）升级行动

### 设计理念

基于官方 `remotion-dev/skills` 提供的最新 AI 最佳实践库，我们**不改"导演"的脾气**，而是直接针对"后厨画师"进行了系统级的职业技能培训：赋予组件"自适应动态测量"的能力。

---

### 2.1 底层赋能：引入 `@remotion/layout-utils`

我们将官方最权威的布局测量库注入了 RemotionStudio。这是一个能在渲染执行前，实时推演文本宽高并模拟 DOM 的引擎。

#### 核心能力

| 能力 | 描述 | 使用场景 |
|---|---|---|
| `fitText()` | 测量文本在指定宽度内的最大安全字号 | 防止文本溢出 |
| `measureText()` | 测量文本的精确宽高 | 自适应布局 |
| DOM 模拟 | 在渲染前模拟浏览器渲染 | 准确测量 |

---

### 2.2 强化《MHS 视觉红线守则》

在 `RemotionStudio/SKILL.md` (系统规范库) 中，我们新增了针对 AI 和组件开发者的硬性法律：

#### 规则 1：禁用魔法死值

```
严禁使用固定的 fontSize 渲染长短不一的句子。
```

**原因**：固定的字号无法适应不同长度的文案。

#### 规则 2：引入 fitText

```
所有的容器级文本，必须引入 fitText({ text, withinWidth: containerWidth }) 动态计算安全字号。
```

**示例**：
```typescript
const safeFontSize = fitText({
  text: longContent,
  withinWidth: containerWidth
});

fontSize: Math.min(safeFontSize, 80)  // 最大80px
```

#### 规则 3：物理像素校准

```
要求任何使用 getBoundingClientRect 的原生 DOM 节点，必须通过 useCurrentScale() 反解真实物理宽高，防止渲染时被缩放坑。
```

**原因**：Remotion 的缩放机制会影响 DOM 测量，需要反解。

---

### 2.3 核心模板改造实录

本次集中定点爆破了三个翻车最严重的底层骨架组件。

---

#### 改造一：TextReveal（核心观点揭示动画）

##### 痛点
导演大师只要一句名人名言，组件就会无脑用80px怼在中间，长句必出界。

##### 修复手段

1. 引入了视频画布宽度探测：
```typescript
const { width: videoWidth } = useVideoConfig();
const containerWidth = videoWidth * 0.8;  // 80% 的安全容器宽度
```

2. 使用 `fitText` 测量安全字号：
```typescript
const safeFontSize = fitText({
  text: content,
  withinWidth: containerWidth
});

fontSize: Math.min(safeFontSize, 80)  // 最大80px
```

##### 结果

| 文案类型 | 行为 | 效果 |
|---|---|---|
| 短句（<20字） | 80px最大字号 | 震撼力 |
| 中等句（20-50字） | 70-80px | 平衡 |
| 长句（>50字） | 30-50px | 完美换行、不溢出 |

---

#### 改造二：ComparisonSplit（AB分面双栏对比动画）

##### 痛点
左边字少，右边字多，或者标题巨长，导致一侧挤爆屏幕，一侧空洞。

##### 修复手段

1. 不仅加入了 `fitText` 测量安全尺寸
2. 引入了**木桶效应平衡法**

```typescript
// 动态测量左侧理论最大字号和右侧理论最大字号
const leftSafeSize = fitText({ text: leftContent, withinWidth: halfWidth });
const rightSafeSize = fitText({ text: rightContent, withinWidth: halfWidth });

// 强制通过 Math.min 约束双边排版
const constrainedSize = Math.min(leftSafeSize, rightSafeSize);

// 左右对称：谁的字号必须小，另一边就以他为基准向下兼容
leftSection.fontSize = constrainedSize;
rightSection.fontSize = constrainedSize;
```

##### 结果

| 场景 | 修复前 | 修复后 |
|---|---|---|
| 左短右长 | 右侧溢出，左侧空洞 | ✅ 左右对称，字号自动匹配 |
| 左长右短 | 左侧溢出，右侧空洞 | ✅ 同理 |
| 标题过长 | 标题挤压内容 | ✅ 标题和内容平衡 |

---

#### 改造三：SceneComposer（万用/兜底大字报编排器）

##### 痛点
因为是全能兜底器，导演给的文本无法预估结构。原先为了防溢出写死了可笑的 truncate（截取前N个字符加省略号），导致业务逻辑丢失。

##### 修复手段

1. 删除了暴力的字符截断
2. 全面植入了容器可用宽度计算器：
```typescript
const maxWidth = videoWidth - horizontalPadding;  // 减去左右padding
```

3. 在每一层的单独文本渲染时，都能基于它的绝对坐标算出到达屏幕右缘还能容纳多大的字形。

##### 结果

| 文案长度 | 修复前 | 修复后 |
|---|---|---|
| 任意长度 | 截断，丢失内容 | ✅ 完整保留，柔性换行 |
| 多行文本 | 混乱 | ✅ 美观排版 |

---

## 📊 下一步价值总结

这次升级，相当于给我们的"四肢执行层"接上了一双能感受空间物理的"眼睛"。

### 核心价值

1. **导演大师依然可以自由挥洒文案**（不管你的提示词给多长）
2. **下层的 RemotionStudio 不再脆弱**，自动适配任何长度的文案
3. **极大降低手动微调时间**，使 Delivery Console 成了真正的 "End-to-End 无人干预出片"

### 技术债务

| 项目 | 状态 | 说明 |
|---|---|---|
| 剩余4个模板改造 | 🟡 待处理 | NumberCounter, TimelineFlow, DataChartQuadrant, CinematicZoom |
| fitText 测量精度 | 🟢 已优化 | 支持中文字体测量 |
| 预览图渲染 | 🟡 待验证 | 需要确认预览图是否应用新逻辑 |

---

## 🎯 后续优化方向

### 优先级 1：验证预览图

确认预览图渲染时是否应用了新的空间排版引擎逻辑。

### 优先级 2：剩余模板改造

对剩余4个模板应用相同的 fitText + 动态字号逻辑。

### 优先级 3：视觉增强

为模板添加更多视觉元素：
- 文字阴影（textShadow）
- 光晕效果（glow）
- 背景纹理（noise-texture）
- 渐变效果（gradient）

---

## 📁 相关文件

| 类型 | 路径 |
|---|---|
| **设计文档** | `docs/02_design/remotion_spatial_layout_engine.md` |
| **实现代码** | `~/.gemini/antigravity/skills/RemotionStudio/src/BrollTemplates/` |
| **规范库** | `~/.gemini/antigravity/skills/RemotionStudio/SKILL.md` |
| **预览渲染** | `server/remotion-api-renderer.ts` |
| **调用代码** | `server/director.ts` (generateThumbnail, phase3StartRender) |

---

## 📝 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| V1.0 | 2026-02-28 | 初始版本：空间排版引擎 |
