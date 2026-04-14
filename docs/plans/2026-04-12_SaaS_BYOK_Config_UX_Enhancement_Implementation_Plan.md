---
title: feat: SaaS BYOK 配置页 UX 增强
type: feat
status: active
date: 2026-04-12
origin: src/components/SaaSLLMConfigPage.tsx
---

# feat: SaaS BYOK 配置页 UX 增强

## Overview

在不改变现有业务逻辑与接口的前提下，增强 BYOK 配置页的引导与可读性：补齐引导文案、增加推荐 provider 快速填入卡片、按 `errorCategory` 分类渲染错误信息，保持既有暖色圆角视觉风格。

## Requirements

- R1. 信息卡增加 `<details>` 折叠引导：说明何时需要 BYOK，并补充 Base URL / API Key / Model 含义。
- R2. 右侧栏提供 2-3 个推荐 provider 快速填入卡片，点击后填入 `providerLabel / baseUrl / model`，当前选中状态高亮。
- R3. 测试错误区域根据 `errorCategory` 显示不同图标、颜色与修复建议；`api_error` 维持默认红色并显示原始错误信息。

## Scope Boundaries

- 不修改 `SaaSLLMConfigPageProps`。
- 不改动 fetch 请求逻辑与服务端交互。
- 不引入新依赖、不使用 `@ts-ignore` 或 `as any`。
- 维持暖色圆角设计语言与 CSS 变量体系。

## Implementation Steps

1. 在 `SaaSLLMConfigPage.tsx` 中补充推荐 provider 常量与选中判定方法。
2. 用 `<details>` 扩展信息卡文案，保留一行摘要，展开后展示 BYOK 条件与字段含义。
3. 在右侧栏渲染推荐卡片列表，点击后填充字段并高亮。
4. 新增 `errorCategory` 映射，渲染不同图标/颜色与修复建议。

## Validation

- `lsp_diagnostics`：`src/components/SaaSLLMConfigPage.tsx`
- `npm run build`
