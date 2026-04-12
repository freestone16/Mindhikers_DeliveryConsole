# Rules - 精炼规则

> **每次会话开始时读取此文件**
> **控制在 50-80 条，只保留"下次一定有用"的规则**
> **详细案例见 `lessons/` 目录**

---

## 通用开发

1. **永远不要修改 .env 中的路径**，除非用户明确要求
2. 修改配置文件前问自己：「我是否 100% 确认原来的值是错的？」
3. 看到路径异常时，先 `ls` 验证目录是否存在，再判断谁对谁错
4. **并行 worktree 的物理目录必须和分支语义对齐**：如 `MHSDC-GC-SSE` 对应 `/GoldenCrucible-SSE`，不要让 SSE / 稳定线共用易混淆目录名
5. **汇报或登记目录前必须同时核对 `ls` 与 `git worktree list`**：不要凭口头记忆写 `GoldenCrucible/GC`、`GoldenCrucible-GC` 这类路径，统一以现场实际 worktree 为准
6. **系统设计、实时链路与排障都必须以 SkillSync 同步过来的能力为业务主题**：我们的系统只负责胶水代码与路由编排，来自用户的任何业务需求，默认都要直接交给同步过来的 skill 处理，禁止让宿主系统替 skill 擅自承接业务语义
7. **黄金坩埚场景下，用户业务需求默认直路由苏格拉底 skill**：由苏格拉底负责主导回应，并按需要调动 Researcher 与 FactChecker，宿主层只负责事件流、状态同步、工具接驳与结果回传
8. **orchestrator 不做任何业务判断**：不能替苏格拉底决定 phase、是否搜索、是否查证、是否调用哪个 skill；若发现 orchestrator / bridge / server 出现此类判断，直接删除并把决定权还给苏格拉底

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
14. **汇报“当前开发进度 / 剩余事项”前，必须同时核对 `docs/04_progress/dev_progress.md`、当天 `docs/dev_logs/YYYY-MM-DD.md` 与 `docs/dev_logs/HANDOFF.md`**；若口径不一致，以最新时间戳日志为准，并顺手回写进度文档，避免把“已接通 / 已验证”的事项继续报成“未完成”

---

## 前端开发

15. **TypeScript 类型导入必须使用 `import type`**
16. 分开写 `import { Component }` 和 `import type { Type }`
17. 遇到模块导出错误时检查：是 `export type` 还是普通 `export`
18. Vite 中类型导入错误只在运行时暴露，tsc 会通过
19. **新增 CSS 主题 token 时，必须同时 `rg "var\\(--"` 校对引用全集，确认每个 `var(--xxx)` 都有定义**；缺失变量会让页面静默回落到继承色，最容易出现“浅底白字/深底暗字”的整页配色异常
20. **Better Auth 的 `createAuthClient` 不能喂相对 `baseURL`**；`/api/auth` 在生产环境会触发 `Invalid base URL` 并导致 React 启动前白屏，必须先转成绝对地址

---

## 状态管理

20. **选择新文件 = 重置所有状态**
21. 切换项目时清除临时状态文件（如 `phase2_review_state.json`）
22. 状态重置清单：phase、proposals、feedback、approved、items、jobs

---

## SSE 事件处理

23. **每种后端发送的 type 都必须有对应的前端处理逻辑**
24. 特别处理 `error` 类型，必须抛出并显示给用户
25. 不要静默忽略解析错误，记录到 console

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
56. **改 `server/index.ts` 路由表后必须真实启动一次服务**；要同时核对 import 的模块文件存在、挂到 `app.get/app.post` 的 handler 不是 `undefined`，否则前端常表现为“页面打不开”，根因其实是后端入口启动即崩

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

## 进程管理

63. `npm run dev` 启动多个子进程（concurrently），要用 Ctrl+C 正确停止
64. 直接关闭终端会残留进程，下次启动会端口冲突
65. **端口判断先查** `~/.vibedir/global_ports_registry.yml`；再读取 `.env.local` / `.env` 中的 `PORT` 和 `VITE_APP_PORT`，最后才执行 `lsof`
66. 强制杀进程：`kill -9 <PID>`
67. **worktree 的 `.env` / `.env.local` 端口口径必须一致**；不要残留其他模块的端口号，避免误判当前服务归属
68. **并行分支若要与稳定线同时存在，必须先分配独立 worktree + 独立端口 + 账本登记后再启动验证**；不能只开新分支却继续共用同一组资源

---

## 前端组件开发

69. 组件重命名时同步更新所有 import 引用
70. 检查导入完整性：确保所有使用的组件/图标都已正确导入
71. React 组件白屏 → 检查浏览器控制台的 Uncaught Error
72. 热更新失败 → 刷新页面或重启 dev server

---

## 测试验证

73. **修改后必须验证**：运行测试 → 检查类型 → 重启服务 → 手动测试
74. 不要假设修改生效，用实际命令验证
75. 验证清单：`lsp_diagnostics` → build → test → 功能测试
76. 收口/迁移任务若被 build 暴露出 unrelated 模块报错，先按模块边界隔离；不要顺手改进到其他业务域（例如营销大师类型债不应混入坩埚/运行时收口）
77. **测试“用户请求搜索/联网”时，不能一上来就空口提搜索**；必须先至少铺垫 2 轮具体语境，再在后续轮次基于该语境提出搜索需求，否则结论不可信
78. **当前交付主线若要摆脱历史模块类型债，必须拆独立入口 / 独立 tsconfig / 独立 typecheck**；不要靠直接移除类型检查来“伪绿灯”，正确做法是让 `build` 只验证当前主线，同时保留 `typecheck:full` 挂账历史债
79. **当用户讨论“黄金坩埚主线 / 产品能力 / 开源项目可借鉴点”且未特别点名 Director/Delivery 子模块时，默认先对齐 Crucible 主链**：重点看 roundtable、苏格拉底对话、workspace/conversation、历史中心、论文/脚本导出，不要擅自把 Director 视觉执行链当成主产品范围
80. **涉及 GoldenCrucible SaaS 的模型接入时，必须先确认“Kimi 原厂”还是“代理 Kimi（如 SiliconFlow）”**：不要把 `kimi-k2.5` 与 `Pro/moonshotai/Kimi-K2.5` 混为一谈，更不要默认用代理口径替代原厂

---

## 性能优化

81. 长时间运行的请求必须有超时
82. 大文件读取要分块，不要一次性加载到内存
83. 频繁操作考虑加 debounce/throttle

---

## 安全考虑

84. API Key 不要硬编码在代码里，使用环境变量
85. `.env` 文件要在 `.gitignore` 中
86. **历史项目文档治理默认走“零损失”策略**：先编目、再映射、后接线，最后才考虑归档或整理；没有完成归宿判断和用户确认前，禁止因治理而删除、覆盖、搬空或重写历史正文
86. 敏感日志输出前脱敏处理

---

## 项目特定

85. **DeliveryConsole 项目**：数据在 Obsidian_Antigravity 目录，代码在 DeliveryConsole 目录
86. `PROJECTS_BASE` 环境变量指向数据目录，不是代码目录
87. worktree 环境需要复制 `.env` 到 worktree 目录
88. **修改 `.env` 后必须重启服务器** 才能生效
89. **Skill 文件同步是正常的，截断才是问题**：skill-sync 会正确复制完整文件；`skill-loader.ts` 中 `extractCoreContent(raw, maxChars)` 的 `maxChars` 才是控制 LLM 实际看到多少内容的关键参数。当 Skill 行为异常时，先查 `maxChars` 是否过小（当前：24000）
88. **Skill 的业务逻辑绝不在后端硬编码，但“工具是否真的执行过”必须由宿主留证**：宿主不能替苏格拉底决定 phase、结论、追问方向或工具编排；但只要回复里可能声称“已经搜索/已查到”，宿主就必须负责最小证据桥接与落盘，至少写明 `searchRequested / searchConnected / research.sources`，绝不能只让模型口头声称已搜索
90. **GoldenCrucible 以后只认 3 条发布线**：`MHSDC-GC-SSE` 是新功能开发线，`MHSDC-GC-SAAS-staging` 是 SaaS 集成/预发线，`main` 是正式发布线；不要再临时发明新的 staging Git 分支
91. **Railway 环境映射必须固定**：`staging` 只吃 `MHSDC-GC-SAAS-staging`，`production` 只吃 `main`；`gc.mindhikers.com` 只绑定 `production`，不能混看本地、Git 分支和线上部署
92. **SSE 新功能进入 SaaS 的唯一顺序**：先在 `MHSDC-GC-SSE` 开发，再摘樱桃/合并到 `MHSDC-GC-SAAS-staging`，先上 Railway `staging` 验收，通过后才允许进入 `main`
93. **`staging` 是云端预发环境，不是本地环境、也不是正式域名**：验收 staging 时默认使用 Railway 测试域名或独立 staging 域名；不要把 `gc.mindhikers.com` 当 staging 用
94. **讨论线上问题时先问“这是本地、staging、还是 production”**：凡是用户提到 `gc.mindhikers.com`，默认指 Railway `production` 已部署版本；没有确认环境前，不能把本地修复当成线上结果
95. **日常上线优先走 Git 分支驱动，不走本地直推 production**：本地 `railway up` 只用于调试或临时验证；正式发布默认通过 `MHSDC-GC-SAAS-staging -> main -> Railway production` 完成
96. **当前阶段 Google 登录可作为 staging / production 的验收基线，微信登录不是本轮上线阻塞项**：不要因为微信未完成而阻塞已经通过 Google 登录验收的 SaaS 发布
97. **GoldenCrucible-SaaS 主 worktree 默认必须停在 `MHSDC-GC-SAAS-staging`**：除非用户明确要求检查本地 `main` 历史，否则不要为了发布、比对或排障把主 SaaS worktree 临时切到本地 `main`；若必须查看其他分支，优先用 `git show`、独立 worktree 或临时目录完成
98. **任何一次发布/排障结束前，都必须执行“主 worktree 复位验收”**：至少核对 `git branch --show-current` 必须回到 `MHSDC-GC-SAAS-staging`，再核对 `git status --short` 必须干净；未完成这两步，不得把现场视为收尾完成
99. **黄金坩埚的业务判断必须交给 Socrates，不得由宿主硬编码替代**：是否需要 Researcher / FactChecker、何时联网、搜什么、校验什么，都应由 Socrates 先产出结构化决策；SaaS 宿主只负责传递上下文、执行工具、持久化证据链和回传错误
100. **黄金坩埚宿主允许保留的越界只能是“确定性执行职责”**：允许留在宿主的只有账号登录、workspace/conversation 权限边界、HTTP/SSE/stream 生命周期、持久化与恢复、工具执行器接驳、最小证据链落盘、技术层错误回传、配额/会员/BYOK/访问控制；不允许留在宿主的包括是否联网、搜索 query、toolRoutes、phase/engineMode 的业务判定、对话结构、fallback 业务内容、虚假的 skill 执行展示
101. **宿主边界治理必须先出“根治型 implementation plan”再开发，禁止边改边补**：像搜索正则、query fallback、host fallback 文案、静态 skill 展示这类补丁式修法，一律不算完成；必须先明确目标契约、迁移顺序、废弃字段和验收口径，再进入实现

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
