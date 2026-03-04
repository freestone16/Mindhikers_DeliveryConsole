# L-001 - 不要擅自修改 .env 中的路径配置

**日期**：2026-03-03
**分类**：通用开发

---

## 问题

- 后端日志显示 `Projects Base` 指向 worktree 内的错误路径
- 我误判 `.env` 中的 `PROJECTS_BASE` 是错的，想把它改成 `DeliveryConsole/.claude/Projects`
- 用户制止了我：原来的路径（Obsidian_Antigravity/...）才是正确的生产数据目录

---

## 根本原因

- .env 文件没有被复制到 worktree，导致后端 fallback 到了默认路径
- 我看到「路径不对」但没有先验证实际的目录结构，就直接修改配置

---

## 诊断过程

```bash
# 检查 .env 是否存在
ls -la .claude/worktrees/*/focused-darwin/.env

# 验证目录是否存在
ls -la /Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects
```

---

## 修复

复制 .env 到 worktree，而不是修改路径配置：

```bash
cp .env .claude/worktrees/laughing-maxwell/.env
```

---

## 相关规则

- 永远不要修改 .env 中的路径，除非用户明确要求
- 看到路径异常时，先 `ls` 验证目录是否存在
- 修改配置文件前问自己：「我是否 100% 确认原来的值是错的？」

---

## 相关文件

- `/Users/luzhoua/DeliveryConsole/.env` — PROJECTS_BASE 正确值
- `/Users/luzhoua/DeliveryConsole/server/index.ts:44` — fallback 逻辑
