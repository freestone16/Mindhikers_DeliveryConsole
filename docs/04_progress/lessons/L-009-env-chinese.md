# L-009 - .env 中文注释导致解析失败

**日期**：2026-03-04
**分类**：环境配置

---

## 问题

- Phase 2 显示"兜底方案（LLM 生成失败）"
- SiliconFlow API Key 验证成功，但服务器调用失败
- 服务器日志：`Generation failed, retrying. Reason: fetch failed`

---

## 根本原因

1. **路径解析错误**：`path.resolve(__dirname, '../../.env')` 解析到错误路径
2. **中文注释导致解析失败**：dotenv 无法解析包含中文的 .env 文件

---

## 诊断过程

```bash
# 测试 dotenv 解析
node -e "
const dotenv = require('dotenv');
const result = dotenv.config({ path: '/Users/luzhoua/DeliveryConsole/.env' });
console.log('All keys:', Object.keys(result.parsed || {}));
"
# 输出：All keys: []  ← 空数组，解析失败！
```

---

## 修复

1. 修改路径：`path.resolve(__dirname, '../.env')`
2. 移除 .env 中的中文注释

---

## 相关规则

- .env 文件只使用英文注释
- 使用 `path.join()` 而不是 `path.resolve()` 处理 `..` 相对路径
- 服务器启动后验证关键环境变量是否正确加载
- 测试 dotenv：`node -e "console.log(require('dotenv').config({path:'xxx'}).parsed)"`

---

## 相关文件

- `server/index.ts:32` - dotenv.config() 路径
