# L-006 - llm.ts 文件被错误覆盖

**日期**：2026-03-03
**分类**：文件操作

---

## 问题

- Phase 2 总是显示"兜底方案（LLM 生成失败）"
- SiliconFlow API 验证成功，但 Phase 2 仍然无法正常生成

---

## 根本原因

- `llm.ts` 文件被错误覆盖，从 510 行缩减到 50 行
- 缺少核心函数：`generateGlobalBRollPlan`、`generateFallbackOptions` 等
- **关键问题**：使用了 Write 工具而不是 Edit，导致整个文件内容丢失

---

## 诊断过程

```bash
# Phase 1: 根因调查
wc -l server/llm.ts          # 只有 50 行
wc -l server/llm_backup.ts  # 510 行（完整文件）

# Phase 2: 模式分析
grep -n "generateGlobalBRollPlan" server/llm.ts      # 未找到
grep -n "generateGlobalBRollPlan" server/llm_backup.ts  # 找到
```

---

## 修复

从 `llm_backup.ts` 恢复完整的 `llm.ts` 文件

---

## 相关规则

- 永远不要对大文件（>50行）使用 Write 工具进行部分修复
- 修复前验证：读取完整文件 → 确认修改位置 → old_string 包含 5-10 行上下文
- 核心文件修改前创建备份
- 发现文件被覆盖后：检查行数 → grep 关键函数 → 立即恢复

---

## 相关文件

- `/Users/luzhoua/DeliveryConsole/server/llm.ts`
- `/Users/luzhoua/DeliveryConsole/server/llm_backup.ts`
