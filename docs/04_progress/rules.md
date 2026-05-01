# Rules - 精炼规则

> **每次会话开始时读取此文件**
> **控制在 50-80 条，只保留"下次一定有用"的规则**
> **详细案例见 `lessons/` 目录**

---

## 通用开发

1. **永远不要修改 .env 中的路径**，除非用户明确要求
2. 修改配置文件前问自己：「我是否 100% 确认原来的值是错的？」
3. 看到路径异常时，先 `ls` 验证目录是否存在，再判断谁对谁错

---

## 环境配置

4. **.env 文件只使用英文注释**，中文会导致 dotenv 解析失败
5. 使用 `path.join()` 而不是 `path.resolve()` 处理 `..` 相对路径
6. 服务器启动后验证关键环境变量是否正确加载

---

## 文件操作

7. **永远不要对大文件（>50行）使用 Write 工具进行部分修复**，必须用 Edit
8. 修复前验证：读取完整文件 → 确认修改位置 → old_string 包含 5-10 行上下文
9. 核心文件修改前创建备份：`cp file.ts file.ts.backup`
10. 发现文件被覆盖后：检查行数 → grep 关键函数 → 立即恢复

---

## 版本恢复

11. 恢复版本时不要同时添加新修改，先验证恢复是否成功
12. 版本回滚步骤：git checkout → 重启 → 验证 → 再添加新功能
13. 在 dev_progress.md 记录已知正常工作的 commit hash

---

## 前端开发

14. **TypeScript 类型导入必须使用 `import type`**
15. 分开写 `import { Component }` 和 `import type { Type }`
16. 遇到模块导出错误时检查：是 `export type` 还是普通 `export`
17. Vite 中类型导入错误只在运行时暴露，tsc 会通过

---

## 状态管理

18. **选择新文件 = 重置所有状态**
19. 切换项目时清除临时状态文件（如 `phase2_review_state.json`）
20. 状态重置清单：phase、proposals、feedback、approved、items、jobs

---

## SSE 事件处理

21. **每种后端发送的 type 都必须有对应的前端处理逻辑**
22. 特别处理 `error` 类型，必须抛出并显示给用户
23. 不要静默忽略解析错误，记录到 console

---

## 火山引擎集成

24. **图片生成最小像素数：3,686,400**
25. 影视导演（Director）用 2560x1440（16:9 横向）
26. 短视频大师（Shorts）用 1440x2560（9:16 竖向）
27. API 响应解析先验证实际返回结构，不要假设
28. **API Key 格式必须带连字符**：`354e79c0-4219-4af4-8f78-44460ba54973`（不是 `354e79c042194af48f784460ba54973`）
29. **图片生成使用模型名称**：`doubao-seedream-4-0-250828`（不是 endpoint ID）

---

## LLM API 调用

28. **必须有超时机制**（建议 30 秒）
29. 使用 AbortController 取消请求
30. 错误信息要详细：HTTP status + response text

---

## 服务器启动

31. 看到 `Cannot find module '@xxx/darwin-arm64'` → 删除 node_modules 重新安装
32. 看到 `esbuild for another platform` → 同上
33. 启动失败时检查：错误日志 → 端口占用 → 残留进程
34. 清理残留进程：`pkill -f "tsx watch" && pkill -f "vite"`

---

## OpenCode 配置

35. 自定义 OpenAI 兼容 provider 需要：
    - `npm: "@ai-sdk/openai-compatible"`
    - `models` 中声明模型
    - `options.baseURL` 包含 `/v1`
    - `options.apiKey` 直接写在 options 里
36. 同时配置 `~/.config/opencode/opencode.json` 和 `~/.local/share/opencode/auth.json`
37. 模型名格式：`{provider}/{model}`，如 `yinli/claude-sonnet-4-6`

---

## 诊断流程

38. Phase 2 显示兜底方案 → 检查 llm.ts 是否被损坏
39. 白屏 → 检查浏览器控制台的运行时错误
40. API 调用失败 → 验证环境变量 → 检查网络 → 查看错误详情
41. `dotenv.config()` 返回空 → 检查文件编码和中文注释
42. 测试 dotenv：`node -e "console.log(require('dotenv').config({path:'xxx'}).parsed)"`

---

## 错误处理

43. **SSE 错误消息要分层**：用户看到简短可操作的，开发者看到详细堆栈
44. 网络错误 → "无法连接到 LLM 服务"
45. JSON 解析错误 → "LLM 返回的不是有效的 JSON 格式"
46. 验证错误 → "LLM 生成的数据格式不正确"
47. 超时错误 → "请求超时，请检查网络连接"

---

## Remotion 开发

48. Remotion 组件预览失败时检查：帧率、分辨率、编码参数
49. 文字排版遵循红线守则
50. 预览图生成失败时增强日志输出，记录完整错误

---

## 后端 API 开发

51. **LLM connector 模型名不要硬编码**，使用环境变量
52. 错误的写法：`model_key = f"{prefix}LLM_MODEL" or os.environ.get('LLM_MODEL')`
53. 正确的写法：`model = os.environ.get(f"{prefix}LLM_MODEL") or os.environ.get('LLM_MODEL')`
54. API connector 注册表修改后重启服务
55. **外部 API 返回 task_id 时必须启动轮询**，检查清单：
    - 是否有 pollVolcXXX() 调用？
    - 是否更新共享状态（如 thumbnailTasks）？
    - 是否有超时机制防止无限轮询？
    - 前端轮询端点能否读到更新后的状态？

---

## Git 操作

55. 查找文件被谁修改：`git log -p -- file.ts`
56. 查找引入某代码的 commit：`git log -S "function_name" --source --all`
57. 恢复单个文件：`git checkout <commit> -- <file>`
58. 查看文件历史版本：`git show <commit>:path/to/file`

---

## 调试技巧

59. 服务器日志不显示错误 → 检查 console.error 是否被 try-catch 吞噬
60. 前端看不到后端错误 → 检查 SSE 是否处理了 error 类型
61. 环境变量加载失败 → 用 `console.log(process.env.XXX)` 验证
62. 模块导入失败 → 检查 export type vs export，import type vs import

---

## 端口管理 ⛔ 红线

63. **所有端口操作必须先查阅全局端口账本** `~/.vibedir/global_ports_registry.yml`，绝不允许凭记忆或猜测分配端口
64. **绝不允许强占其他模块的端口**，每个 worktree/模块有且仅有账本中注册的端口
65. **MarketingMaster 注册端口：后端 3002 / 前端 5174**，写 `.env.local` 或启动脚本前必须核对
66. 新 worktree 建立后必须在端口账本中登记 session，并将旧 session 标记为 archived
67. 端口冲突时**先查账本确认归属**，再决定是杀进程还是换端口——不得盲目 kill

---

## 进程管理

68. `npm run dev` 启动多个子进程（concurrently），要用 Ctrl+C 正确停止
69. 直接关闭终端会残留进程，下次启动会端口冲突
70. 检查端口占用：`lsof -i :3002 -i :5174`
71. 强制杀进程：`kill -9 <PID>`

---

## 前端组件开发

67. 组件重命名时同步更新所有 import 引用
68. 检查导入完整性：确保所有使用的组件/图标都已正确导入
69. React 组件白屏 → 检查浏览器控制台的 Uncaught Error
70. 热更新失败 → 刷新页面或重启 dev server

---

## 测试验证

71. **修改后必须验证**：运行测试 → 检查类型 → 重启服务 → 手动测试
72. 不要假设修改生效，用实际命令验证
73. 验证清单：`lsp_diagnostics` → build → test → 功能测试

---

## 性能优化

74. 长时间运行的请求必须有超时
75. 大文件读取要分块，不要一次性加载到内存
76. 频繁操作考虑加 debounce/throttle

---

## 安全考虑

77. API Key 不要硬编码在代码里，使用环境变量
78. `.env` 文件要在 `.gitignore` 中
79. 敏感日志输出前脱敏处理

---

## 项目特定

80. TubeBuddy 关键词评分必须走 YouTube Studio 内的扩展入口：Studio 页面 → TubeBuddy 快捷入口/菜单 → `Keyword Explorer`。不要把 `www.tubebuddy.com/account` 登录态当成 Studio 扩展授权完成。
81. TubeBuddy 授权验收看扩展 storage 和 `TBGlobal`：必须确认 `tubebuddyToken-<channelId>` 存在、`TBGlobal.Profile()` 非空、`TBGlobal.IsAuthenticated()` 为 `true`，不能只看 YouTube 已登录或 TubeBuddy account 页可打开。
82. TubeBuddy 分数字段形如 `46/100` 时必须优先解析斜杠前的数值；不要简单删除非数字字符，否则会把 `46/100` 误读成 `46100`。
83. TubeBuddy Keyword Explorer 副指标优先读图表 CSS 变量里的真实百分比；`Excellent/Poor/Good` 等等级只能作为 label 展示，不能硬映射成精确分。图表读不到时返回缺省并让 UI 显示“待校准”，不要伪装成 0。
84. TubeBuddy 入口找不到时必须明确告知用户；不要擅自改走 `www.tubebuddy.com/account` 或其他非日常入口。
85. MarketingMaster 借用 Director 设计语言时，左栏只能承载 Delivery 共用工作站入口；Marketing 内部 P1-P4 必须放中栏 header，运行态/Artifacts/Handoff 必须放右栏。
86. 完整视频描述属于 P2 发布文案审阅，不属于 P3；P2 必须提供大文本编辑/全局预览，并保证预览顺序与导出描述一致。
87. P3 的主语义是平台适配与 DT 交接准备度，不是人工审核 JSON；JSON/MD 只能作为 Artifact 或技术折叠视图出现。

80. **DeliveryConsole 项目**：数据在 Obsidian_Antigravity 目录，代码在 DeliveryConsole 目录
81. `PROJECTS_BASE` 环境变量指向数据目录，不是代码目录
82. worktree 环境需要复制 `.env` 到 worktree 目录
83. **修改 `.env` 后必须重启服务器** 才能生效

---

## 代码风格

41. LLM API 调用返回 `fetch failed` 时，添加超时和详细日志
42. 不要用 `// TODO: fix later`，现在就修好
43. 修复 bug 时最小化改动，不要顺便重构

---

## 文档协议

44. **记录 Lessons 的时机**：
    - 用户明确纠正错误
    - 修复 bug 后发现模式化的根因
    - 代码审查中发现系统性问题
    - 同类错误出现 2 次以上
    - 调试过程中发现值得记录的坑
45. 提及"修复"/"完成"时自动保存到 dev_progress.md
46. 新规则添加到对应分类，保持文件精简
47. 详细案例按需写入 `lessons/L-XXX.md`

---

## 更新日志

| 日期 | 变更 |
|------|------|
| 2026-03-04 | 初始创建，从 lessons.md 提取 82 条规则 |
