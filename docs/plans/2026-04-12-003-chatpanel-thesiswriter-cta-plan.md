# 2026-04-12-003 ChatPanel ThesisWriter CTA 实施计划

## 目标
在 `ChatPanel` 中新增 ThesisWriter CTA 卡片展示入口，仅在满足指定条件时出现在最后一条老卢消息之后。

## 需求范围
- 在 `ChatPanelProps` 中新增可选 props：`thesisReady`、`onEnterThesisWriter`
- 在 blackboardHint 同一区域之后追加 CTA 渲染
- CTA 仅在 `thesisReady && isCrucibleMode && msg.id === lastOldluMessageId && msg.meta?.authorId === 'oldlu'` 条件下展示
- 使用 `Sparkles` 图标与暖色圆角卡片样式

## 实施步骤
1. 更新 `src/components/ChatPanel.tsx`：
   - lucide-react import 增加 `Sparkles`
   - `ChatPanelProps` 新增 `thesisReady?: boolean;` 与 `onEnterThesisWriter?: () => void;`
   - 函数参数解构加入上述 props
2. 在 blackboardHint 渲染块结束后插入 ThesisWriter CTA JSX

## 影响文件
- `src/components/ChatPanel.tsx`

## 验证
- 对 `src/components/ChatPanel.tsx` 运行 `lsp_diagnostics`
- TypeScript 项目执行 `npm run build`（如失败按日志修复）

## 风险与回滚
- 仅新增可选 props 与 UI CTA，不影响现有逻辑
- 回滚方式：还原 `ChatPanel.tsx` 对应改动即可
