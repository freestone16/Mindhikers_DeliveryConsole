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
7. **ESM 模块不要在顶层缓存依赖 dotenv 的环境变量**；像 `PROJECTS_BASE` 这类值必须在函数调用时读取，否则 import 先于 `dotenv.config()` 会拿到错误 fallback
8. **项目路径解析必须统一走共享 helper**（如 `server/project-paths.ts`）；禁止在 `server/*` 里各自实现 `getProjectRoot()` 或各自写 `PROJECTS_BASE` fallback

---

## 文件操作

9. **永远不要对大文件（>50行）使用 Write 工具进行部分修复**，必须用 Edit
10. 修复前验证：读取完整文件 → 确认修改位置 → old_string 包含 5-10 行上下文
11. 核心文件修改前创建备份：`cp file.ts file.ts.backup`
12. 发现文件被覆盖后：检查行数 → grep 关键函数 → 立即恢复

---

## 版本恢复

13. 恢复版本时不要同时添加新修改，先验证恢复是否成功
14. 版本回滚步骤：git checkout → 重启 → 验证 → 再添加新功能
15. 在 dev_progress.md 记录已知正常工作的 commit hash

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
84. **React key 不要用内容 hash**：`key={contentKey}` 会在 props 变化时导致组件重挂载，丢失所有 ref 和内部状态。用稳定 ID：`key={option.id}`
85. **ConceptChain 模板 props 待修**：压测中 TypeError，需对照 RemotionStudio 中实际组件检查 nodes 格式

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
86. **火山视频查询成功态要认 `succeeded` + `content.video_url`**：不要只判断 `completed` 或只从 `output/data` 取视频地址。
87. **Seedance Phase3 超时阈值不能写死 120s**：2026-03-11 单任务实测约 153 秒，批量默认串行，轮询上限至少放宽到 300s。

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
65. 检查端口占用：`lsof -i :3002 -i :5173`
66. 强制杀进程：`kill -9 <PID>`

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
74. **交给用户测试前，必须先自测主链路**：至少跑通用户当前要点的主按钮/主入口，不能只验证局部 API 或日志就让用户接盘
75. **自测完成后再交接**：确认 dev 服务仍在运行、端口可访问、页面可打开；不要在验证后把服务关掉再让用户测试

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

80. **DeliveryConsole 项目**：数据在 Obsidian_Antigravity 目录，代码在 DeliveryConsole 目录
81. `PROJECTS_BASE` 环境变量指向数据目录，不是代码目录
82. worktree 环境需要复制 `.env` 到 worktree 目录
83. **修改 `.env` 后必须重启服务器** 才能生效
84. Director Chatbox 的 `update_option_fields` 不能只支持文案字段；`type/template/infographic*` 这类结构字段也必须真正写盘，否则会出现“工具执行成功但左侧完全没变”
85. Phase2 缩略图刷新不能只依赖 `previewUrl` 字段变化；很多预览图只存在卡片本地状态，chat action 修改 `props/prompt/type` 时必须按渲染输入失效旧图并重生
86. **Director 切项目/切文稿的重置只能发生在“已有非空上下文 -> 另一个非空上下文”之间**：初始刷新时 `scriptPath` 常会从空值 hydrate 成真实路径，不能把这种初始化误判成切文稿并清空 Phase2
87. **TextReveal 的“不要换行”不能只写 `props.whiteSpace = "nowrap"`**：模板实际依赖的是 `singleLine/noWrap/textStyle.whiteSpace`，必要时还要补 `containerWidth/paddingX` 才能稳定压成单行
86. Director 不能同时让 `expert_state` 和 `delivery_store.modules.director` 各自漂移；Phase2 新生成、Chatbox 修改、项目切换后都必须把两边同步到同一份状态
87. Remotion 模板字段必须和模板实现一一对应；像 `TextReveal` 这类模板如果要支持“不换行/缩边距”，模板代码本身必须显式读取 `singleLine/noWrap/textStyle/containerWidth/paddingX`
88. **Director Chatbox 不能维护第二套手写系统提示词**：Phase2 生成和 Chatbox 编辑都必须走同一套 Director Skill 注入链路，否则模型会在生成链路“懂模板”、在聊天链路“忘模板”
89. **Skill prompt 的占位符名必须与 `skill-loader.ts` 一致**：像 `AESTHETICS_GUIDELINE` / `ARTLIST_DICTIONARY` 这类资源占位符只要一处拼错，运行时就会静默退化成“看似加载了 Skill，实际没吃到关键资源”
90. **Director、MusicDirector、ThumbnailMaster、MarketingMaster、ShortsMaster 等专家的生成与修改能力都必须来源于对应 Skill，本体不应硬编码在 DeliveryConsole 系统层**
91. **DeliveryConsole 只负责桥梁与宿主职责**：承接 Skill 输出、翻译项目状态、驱动 UI 呈现，不替专家本体做内容判断与专业决策
92. **Director Skill 不负责项目语义映射**：`1-4 -> chapterId/optionId`、`A-F -> 内部 type`、类型别名与冲突判定都属于 DeliveryConsole 桥梁层；导演 Skill 只负责导演意图理解与专业判断
93. **Skill 与 Adapter 必须隔着 Bridge 契约**：像 `update_option_fields/chapterId/optionId/updates.type` 这类执行层参数不能直接作为 Director Skill 的一线输出；Skill 只产出高层意图，Bridge 再翻译成底层 patch
94. **Director ChatPanel 的会话原文就是用户与导演 Skill 的原话**：一个字不能差；但这段会话是嵌在 Phase2 宿主审阅工作流里的，不能把工作流控制权错塞给 Skill
95. **Phase2 的流程控制语义必须由宿主 UI 接管**：像“这条 pass”“全部确认”“全部打勾”“进入 Phase3 渲染落盘”都属于 DeliveryConsole 工作流动作，不应当下沉给导演 Skill 解释或裁决
96. **ChatPanel 的文本消息必须是用户与导演 Skill 的原话**：系统确认卡、执行结果、冲突澄清、工作流提示都必须作为独立系统卡片呈现，不能伪装成 Skill 聊天气泡
97. **送回 LLM 的历史必须只包含会话原文**：`system_action/system_status` 这类系统卡片只给 UI 和工作流使用，不能污染用户与 Skill 的原始会话上下文
98. **Phase2 宿主状态不要默认做成固定头部 banner**：`当前条目 1-2`、`已通过 3/7` 这类信息属于 workflow 数据，但用户已经否定 ChatPanel 头部卡片和左侧顶部提示条；未经再次确认，不要重新加回这些静态头部提示
99. **Chatbox LLM 必须统一跟随全局系统配置**：DeliveryConsole 的聊天入口只读取 `global.provider/model/baseUrl`；不要保留专家级 LLM override，避免出现“界面显示一套、实际调用另一套”
100. **切换全局 Provider 时，Provider / Model / BaseURL 必须联动更新**：不能只改单个字段；像 `deepseek + kimi-k2.5` 这种错配必须在 UI 保存时和服务端加载时双重归一化
101. **`internet-clip` / `user-capture` 必须始终暴露上传入口**：这类非 AI 素材卡片不能等勾选后才显示上传按钮，用户要能先上传再决定是否确认
102. **“互联网素材”是类型，“我自己上传/已有视频待上传”是交付方式，不是互斥类型**：当用户说“改成互联网素材，我自己上传”时，应落到 `D. 互联网素材` 并保留上传入口；不要把它和 `E. 用户截图/录屏` 判成冲突
103. **所有 Chatbox 共用同一条 Fast Path 编排协议**：任何专家都允许实现 adapter 级 `tryFastPath`，但只能在“可直接确认”时短路返回确认卡；一旦不够确定，必须回退给对应专家 Skill，再由 Skill 支持 Bridge/Tool，不允许每个专家各写一套例外逻辑
104. **`~/.vibedir/global_ports_registry.yml` 是端口唯一事实来源**：迁移到新目录/新 worktree 时，先读取账本里该模块现有端口并原样执行；没有用户明确批准，绝不能自创一组新端口再反写回账本。
104. **Director 的显式改卡命令是这条通用协议的首个落地实例**：像 `1-2 改成互联网素材`、`1-2 我自己有视频待上传，请改成互联网素材` 这类清晰编辑请求，可以由 DeliveryConsole 直接解析并返回确认卡；一旦 Fast Path 只得到模糊/冲突/待澄清结果，必须回退给 Director Skill 再理解一轮，不能直接用系统澄清抢答
105. **待确认卡必须在发出时就持久化到 chat history**：不能等用户点击确认或执行成功后才落盘；否则刷新、切专家或重开面板会丢失待确认动作
106. **所有专家的 Chatbox 都必须先加载自己的 Skill，再谈统一交互**：不能只有 Director 走专属 Skill 注入，其他专家却退回“通用助手”兜底；Music/Shorts/Thumbnail/Marketing 至少应加载各自 `SKILL.md`
107. **ChatPanel 文案与身份提示必须专家无关**：不允许再写死“影视导演 Skill”这类单专家文案；任何固定提示都要根据当前 expertId 动态生成，或直接删除
108. **DeliveryConsole 的共享 `node_modules` 必须与默认 `node` 架构一致**：worktree 会向上复用 `/Users/luzhoua/DeliveryConsole/node_modules`；如果机器是 arm64，却让 shell 默认命中 x64 Node，就会把 Vite/Rollup/esbuild 这类原生依赖带进错架构状态
109. **定位前端 dev server 原始报错时，先查 Node 架构再查业务代码**：像 `Cannot find module @rollup/rollup-darwin-x64` 这类错误，优先检查 `uname -m`、`node -p process.arch`、`which node` 与共享 `node_modules/@rollup`，不要先误判成分支代码坏了
110. **用 nvm 修环境时，不能只调 npm，要确认 npm 背后的 node 也一致**：`npm` 脚本可能被当前 PATH 里的别的 `node` 启动；彻底重装依赖时，应直接用目标架构的 `node npm-cli.js install`，避免出现“npm 是 arm64，实际执行 node 仍是 x64”的假修复
111. **RemotionStudio 这类外部技能渲染要显式走当前服务进程的 Node**：不要再依赖 `.bin` shebang；应直接调用 CLI 入口脚本并记录 `process.execPath`，这样才能看见并规避错架构进程导致的原生绑定失败
112. **Chatbox 的持久化待确认卡必须可恢复、可继续执行**：`system_action` 从历史恢复后仍然要保持“确认/取消”可用，不能只把卡渲染出来却丢失最新 `messagesRef/historyMessages`
113. **ChatPanel 不要再堆固定说明条**：用户已明确否定这类顶部引导 banner；后续若需说明边界，应优先用更轻的空态、占位符或按需提示，而不是长期占位的静态说明条
114. **附件 blob URL 必须在发送、切专家和卸载时释放**：Chatbox 长时间贴图会频繁创建 `ObjectURL`；若不在这些节点显式 `revokeObjectURL`，前端会持续泄漏内存
115. **宿主必须理解“不要 X，改成 Y”这类替换语义**：像 `1-2 不需要文生视频，请改成互联网素材，我自己上传` 里，`文生视频` 是被替换掉的旧类型，`互联网素材` 才是目标类型；旧类型不能再参与冲突判定
116. **类型冲突判定前先扣除否定语义和上传意图**：`我自己上传 / 我有现成视频 / 待上传` 属于交付方式，不是目标类型；`不要/不需要/去掉` 后面的旧类型是被移除项，不应继续和目标类型打冲突
117. **Director Phase2 的全局 LLM 生成链路必须有硬超时**：`generateGlobalBRollPlan -> callLLM` 这条链路如果没有 `AbortController`，一旦上游模型悬住，前端就会无限停在“正在为你的剧本生成视觉方案...”
118. **Phase2 从“卡死”变成“兜底方案”是进展，不是完结**：如果界面最终出现 `兜底方案（LLM 生成失败）`，说明后端已经从无限等待推进到了可恢复失败，但真正问题已从“无超时”转成“上游模型质量/结构化输出不稳定”
119. **自动化测试的 `passed` 不能等于“页面没报错”**：像 Director Phase1 这类主链路，必须至少证明页面完成态或目标文件写盘成功；只验证按钮可点、页面可开、等待数秒无异常，不足以帮助排错，也不能交给用户当真实回归结果
120. **测试协议里凡是需要真实页面交互的环节，执行端优先使用 `agent browser`**：不要把页面验收退化成随意脚本或弱浏览器代理；尤其是 Director Phase1 这类需要观察 loading、完成态、截图和 network 证据的主链路，必须尽量贴近真实用户操作
121. **request 明确要求 `agent browser` 时，不能用自写 Playwright 脚本冒充完成**：做不到就如实写 `blocked/failed`；否则报告会把“浏览器自动化”误包装成“Agent Browser 已验证”，破坏协议可信度
122. **OpenCode 出现 `database is locked` 时，先查遗留进程，再做 SQLite WAL checkpoint**：确认没有存活 `opencode` 进程后，优先执行 `sqlite3 ~/.local/share/opencode/opencode.db 'pragma wal_checkpoint(full);'`；不要一上来删库或删状态目录
123. **测试 worker 不能和用户的交互式 `opencode` 会话并发抢库**：检测到已有 `opencode` 活进程时，worker 必须自动避让并把 request 标成 `blocked`，而不是继续启动 `opencode run` 把用户环境再锁死
124. **OpenCode 侧“装了 agent-browser skill”不等于浏览器链已可用**：还必须同时具备 `agent-browser` CLI 和已安装的 Chrome 二进制；只有 skill 没有命令本体时，执行端会退回别的浏览器路径，破坏协议口径
125. **用户在项目目录里说“协调opencode测试”时，代理必须自动接管测试协议**：默认先读取 `testing/README.md`、`testing/OPENCODE_INIT.md`，再读取当前模块的 `testing/<module>/README.md`；不要再要求用户重复解释 OpenCode 协作流程
126. **“协调opencode测试”只表示环境 ready，不表示自动开跑**：代理完成 request / claim / report / status 的协议接管后，必须停下来等待用户明确说明下一步测试计划，不能擅自挑模块或直接发起 request
127. **本项目凡是网页验收/页面交互验证，默认优先 Agent Browser，不要先手用 Playwright MCP**：只有在 Agent Browser 明确不可用且已向用户说明是 fallback 时，才允许改用 Playwright；否则会偏离当前测试协议

---

## 代码风格

41. LLM API 调用返回 `fetch failed` 时，添加超时和详细日志
42. 不要用 `// TODO: fix later`，现在就修好
43. 修复 bug 时最小化改动，不要顺便重构
48. **⭐ 第一性原理修 Bug**：任何 bug 修复前必须先问"设计本身是否正确？"，再动手
    - ❌ 禁止：加 `if` 判断堵漏洞（补丁思维）
    - ✅ 正确：找到让"这类 bug 结构性不可能出现"的模型
    - 判断标准：修完后代码更简单 = 根本修复；修完后代码更复杂 = 打补丁
    - 案例：`update_option_fields` 白名单枚举 → 黑名单保护，新字段自动放行

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
