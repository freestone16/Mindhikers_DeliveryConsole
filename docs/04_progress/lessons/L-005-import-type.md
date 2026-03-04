# L-005 - 类型导入必须使用 import type

**日期**：2026-03-03
**分类**：前端开发

---

## 问题

- 页面白屏，浏览器控制台报错：`The requested module does not provide an export named 'RightPanelMode'`

---

## 根本原因

- `RightPanelMode` 是用 `export type` 导出的类型
- 但使用了普通导入 `import { RightPanelMode }`
- Vite 处理时类型导出需要 `import type` 语法
- TypeScript 编译器不会捕获这种运行时错误

---

## 修复

```typescript
// 错误
import { RightPanel, RightPanelMode } from './components/RightPanel';

// 正确
import { RightPanel } from './components/RightPanel';
import type { RightPanelMode } from './components/RightPanel';
```

---

## 相关规则

- TypeScript 类型导入必须使用 `import type`
- 分开写值导入和类型导入
- 遇到模块导出错误时检查是 `export type` 还是普通 `export`
- Vite 中类型导入错误只在运行时暴露
