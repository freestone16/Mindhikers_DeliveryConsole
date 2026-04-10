# OpenCode Init

## 默认初始化顺序

1. 读取 `testing/README.md`
2. 确认当前模块是否有 `testing/<module>/README.md`
3. 只接管 request / claim / report / status / artifacts 队列
4. 环境 ready 后，等待用户明确说明下一步测试目标
