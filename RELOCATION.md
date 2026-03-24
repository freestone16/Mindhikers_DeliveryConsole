# Delivery Console 历史搬迁记录

> 说明：这是一份 **2025-02-20 的历史迁移记录**。
> 当前 MHSDC 系列 worktree 已迁移到 `/Users/luzhoua/MHSDC/*`；
> 若你要启动当前工作线，请优先参考当前 worktree 内的 `README.md`、`docs/dev_logs/HANDOFF.md` 和端口账本，而不是把本文当作现行启动说明。
>
> 当前 SSE 工作线默认目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 历史 `/Users/luzhoua/DeliveryConsole` 路径只用于回看 2025-02-20 搬迁过程，不应再作为现行启动口径。

**日期：** 2025-02-20  
**执行人：** AI Assistant  
**状态：** ✅ 已完成

---

## 📦 搬迁概述

### 为什么搬迁？

1. **Obsidian 性能问题：** delivery_console 包含大量 node_modules，被 Obsidian 索引导致性能下降
2. **路径过长：** 原路径嵌套太深，操作不便
3. **分离关注点：** 代码与数据分离，更清晰的架构

### 搬迁内容

- **搬走的：** delivery_console 代码目录（包含 node_modules、前端、后端、配置）
- **保留的：** Projects/ 数据目录（所有视频项目数据）

---

## 🗺️ 路径变更

### 变更前
```
/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/delivery_console/
```

### 变更后
```
/Users/luzhoua/DeliveryConsole/
```

### 项目数据位置（不变）
```
/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/
```

---

## 🔧 修改内容

### 1. `.env` 文件

**位置：** `/Users/luzhoua/DeliveryConsole/.env`

**修改前：**
```bash
# 项目基础路径（Docker 容器内）
# 本地开发时注释掉此行，会自动 fallback 到相对路径
PROJECTS_BASE=/data/projects
```

**修改后：**
```bash
# 项目基础路径（指向项目数据目录）
# delivery_console 已分离到独立目录，需要指定完整路径
PROJECTS_BASE=/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects
```

### 2. Bug 修复：`skills/connectors/registry.py`

**问题：** 第 56 行代码逻辑错误，把字符串字面量当作模型名

**修改前：**
```python
model_key = f"{prefix}LLM_MODEL" or os.environ.get('LLM_MODEL')
```

**修改后：**
```python
model = os.environ.get(f"{prefix}LLM_MODEL") or os.environ.get('LLM_MODEL')
```

**影响：** 修复后 DeepSeek API 调用正常，不再返回 "Model Not Exist" 错误。

---

## ✅ 验证清单

搬迁后已验证：

- [x] 备份创建成功（`delivery_console_backup_20260220_221808`）
- [x] 代码成功移动到新位置
- [x] `.env` 配置文件更新正确
- [x] `npm run dev` 启动成功
- [x] 前端服务正常（http://localhost:5173）
- [x] 后端服务正常（http://localhost:3002）
- [x] 项目数据读取正常（检测到 CSET-SP3 等项目）
- [x] Expert 模块加载正常

---

## 📋 当前口径与历史注意事项

### 1. 当前工作线启动（优先参考）
```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible-SSE
npm run dev
```

### 2. 切换项目
编辑 `.env` 中的 `PROJECT_NAME`，或在界面中使用项目切换功能。

### 3. 新增项目数据
在以下位置创建新项目文件夹：
```
/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/
```

### 4. 不要移动的内容
- ❌ Projects/ 数据目录
- ❌ 备份目录（`delivery_console_backup_*`）

### 5. 可以删除的内容
- ✅ 原位置的 `delivery_console` 目录（历史迁移完成后）

---

## 🆘 历史回退方案（仅回看 2025-02-20 现场时使用）

如需回退到 2025-02-20 搬迁前状态：

```bash
# 1. 停止当前服务
pkill -f "npm run dev"

# 2. 删除新位置
rm -rf /Users/luzhoua/DeliveryConsole

# 3. 从备份恢复
mv /Users/luzhoua/delivery_console_backup_20260220_221808 \
   /Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/delivery_console

# 4. 在旧位置启动
cd /Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/delivery_console
npm run dev
```

**注意：** 回退后会失去 `registry.py` 的 bug 修复，需要重新修复。

---

## 📚 相关文档

- **当前工作线 README：** `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/README.md`
- **当前交接说明：** `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/docs/dev_logs/HANDOFF.md`
- **项目数据：** `/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/`

---

**搬迁执行时间：** 2025-02-20 22:18  
**文档创建时间：** 2025-02-20 22:30  
**搬迁状态：** ✅ 成功，服务运行正常
