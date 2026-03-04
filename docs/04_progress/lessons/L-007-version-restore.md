# L-007 - 恢复版本时不要添加新修改

**日期**：2026-03-03
**分类**：版本恢复

---

## 问题

- 从 `llm_backup.ts` 恢复 `llm.ts` 后，添加了超时逻辑
- 结果 Phase 2 仍然显示兜底方案
- 服务器日志：`TypeError: (0 , import_llm.callLLM) is not a function`

---

## 根本原因

- 在恢复的文件中添加超时逻辑时，修改了文件结构
- 新代码与 TypeScript 编译系统不兼容
- `tsx watch` 检测到变化后重新编译失败

---

## 修复

```bash
# 使用 git 恢复到已知正常工作的版本
git checkout c9237d6 -- server/llm.ts

# 不添加任何新修改，只恢复原始代码
```

---

## 相关规则

- 恢复版本时不要同时添加新修改，先验证恢复是否成功
- 版本回滚步骤：git checkout → 重启 → 验证 → 再添加新功能
- 在 dev_progress.md 记录已知正常工作的 commit hash
- 避免"修复过度"：一次只做一个改变
