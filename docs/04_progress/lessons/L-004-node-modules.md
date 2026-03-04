# L-004 - node_modules 平台不匹配导致启动失败

**日期**：2026-03-03
**分类**：服务器启动

---

## 问题

- 运行 `npm run dev` 时服务器无法启动
- 错误：`Cannot find module '@rollup/rollup-darwin-arm64'`
- 错误：`You installed esbuild for another platform`

---

## 根本原因

- node_modules 是在其他平台/架构上安装的（x86_64 vs ARM64）
- 导致原生二进制包无法找到正确的版本
- 多个残留的 `tsx watch` 和 `vite` 进程占用端口

---

## 修复命令

```bash
# 1. 清理残留进程
pkill -f "tsx watch server/index.ts"
pkill -f "vite.*host"

# 2. 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 3. 启动服务器
npm run dev
```

---

## 相关规则

- 看到 `Cannot find module '@xxx/darwin-arm64'` → 删除 node_modules 重新安装
- 看到 `esbuild for another platform` → 同上
- 启动失败时检查：错误日志 → 端口占用 → 残留进程

---

## 验证结果

- ✅ 前端：http://localhost:5173 正常响应
- ✅ 后端：http://localhost:3002/api/version 返回正确版本
