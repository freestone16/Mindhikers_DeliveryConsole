# Delivery Console — 版本里程碑

> **说明**：本文件只记录重大版本节点。日常进度见 `docs/dev_logs/YYYY-MM-DD.md`，会话交接见 `docs/dev_logs/HANDOFF.md`。
> **历史归档**：`docs/dev_logs/archive/pre-2026-03-20_full_history.md`（含 v1.0~v4.2.3 详细记录）

---

## 版本迭代历史

| 版本 | 日期 | 里程碑 |
|---|---|---|
| v1.0 | 2026-02-10 | 初版：单项目（CSET-SP3 硬编码）五大模块 Dashboard |
| v2.0 | 2026-02-11 | Shorts Publisher 模块：状态机 + OAuth + YouTube Upload |
| v2.1 | 2026-02-12 | Link Video（手动关联视频）+ Marketing 数据导入 + File Browser |
| v2.2 | 2026-02-13 | **多项目热切换** + Docker 化开发环境 |
| v3.0 | 2026-02-14 | **专家导航系统** + 文稿选择 + 半自动 Antigravity 集成 |
| v3.1 | 2026-02-28 | **Remotion 新模板赋能** - 强制 template 字段 + 4 个新模板可用 |
| v3.2 | 2026-02-28 | **导演大师 Phase 2/3 重构** - 预审流程 + 渲染二审 + XML 生成 |
| v3.3 | 2026-03-01 | **Phase2/3 细节优化** - 进度显示、评论提交、列表头、章节名、预览图质量 |
| v3.4 | 2026-03-01 | **Worktree 环境修复** - launch.json 注入正确 PROJECTS_BASE/SKILLS_BASE；抢救提交昨日 1799 行丢失进度 |
| v3.5 | 2026-03-03 | **火山引擎视频生成集成** - 文生视频 API + 文生图预览 + OldYang Skill 更新 |
| v3.6 | 2026-03-03 | **火山引擎文生图预览修复** - 修复尺寸限制（2560x1440, 16:9）+ 响应数据路径解析 |
| v3.8.0 | 2026-03-03 | 进程健壮性、状态持久化、UI 优化、布局升级 |
| v3.9.0 | 2026-03-04 | **火山引擎配置修复** - 修复 API Key 格式（添加连字符）+ 使用模型名称而非 endpoint ID |
| v4.0.0 | 2026-03-06 | **SD-207 V3 营销大师全量重构** - 5 Sprint 完成；TubeBuddy Playwright、SSE 生成、Phase 2 审阅、双格式导出 |
| v4.1.0 | 2026-03-11 | **导演大师自动化测试 + Chatbox反馈修复 + 渲染压测** |
| v4.1.1 | 2026-03-15 | **导演大师 LLM 网关统一** - Phase1/2/3、反馈改写、Chatbox 动作提示词重生统一跟随 `global` 模型配置 |
| v4.1.2 | 2026-03-15 | **项目根目录动态解析修复** - 修复 `chat.ts` 在 dotenv 生效前缓存 `PROJECTS_BASE` |
| v4.1.3 | 2026-03-15 | **项目路径解析正式收口** - 新增 `server/project-paths.ts` 作为共享路径 SSOT |
| v4.1.4 | 2026-03-15 | **导演主链路前置校验 + worktree 环境基线恢复** |
| v4.1.5 | 2026-03-16 | **Director × OpenCode 测试协作试点** - testing/ 目录协议 + OpenCode worker 脚本 |
| v4.1.6 | 2026-03-16 | **Director 真实验收协议收紧** - 硬通过判据 + Agent Browser 优先 |
| v4.1.7 | 2026-03-16 | **浏览器验收切换到 Agent Browser** |
| v4.1.8 | 2026-03-16 | **OpenCode 锁库恢复流程固化** - SQLite WAL 残留修复 + 恢复步骤写入手册 |
| v4.1.9 | 2026-03-16 | **OpenCode Agent Browser 真链路补齐** - 补装 agent-browser CLI + Chrome |
| v4.2.0 | 2026-03-16 | **"协调opencode测试"统一口令落地** |
| v4.2.1 | 2026-03-16 | **"协调opencode测试"语义纠偏** - 收紧为"只做环境ready，不自动开跑" |
| v4.2.2 | 2026-03-16 | **Director 冷启动项目态恢复修复** |
| v4.2.3 | 2026-03-16 | **MIN-89 测试治理父任务补强** |
| v4.2.4 | 2026-03-19 | **LLM Provider 归一化** - Kimi Provider 正式接入；切换 provider 时三元组联动归一化 |
| v4.3.0 | 2026-03-20 | **日志系统三层重组** - dev_progress 精简为里程碑表；HANDOFF.md 交接机制；dev_logs 按日分文件 |
| v4.3.1 | 2026-03-28 | **Director 视觉模型配置收口** - 默认视觉路由成为唯一真相源；Google 图生接入；Director 视觉运行时路由器落地 |
| v4.3.2 | 2026-04-24 | **Director 第二阶段系统性清理** - 修复 TypeScript 契约漂移、adapter props 深合并/preview 失效、中文化测试口径与 runtime/UI smoke |
| v4.3.3 | 2026-04-26 | **Director 第三轮 bug 修复与布局/状态栏恢复** - Phase2 内存溢出修复（懒加载+定时器清理+Lightbox 单例化）、Phase1 批注清空、Phase2 loading 提示恢复、ChapterRail 收窄、底部状态栏（LLM/Remotion/计时）回归 |
| v4.4.0 | 2026-04-27 | **SSOT 迁移到 Mindhikers** - 导演大师 5 个 skill（Director / RemotionStudio / svg-architect / remotion-best-practices / remotion-visual-qa）从 `~/.gemini/antigravity/skills/` copy 到 `/Users/luzhoua/Mindhikers/.claude/skills/`；`.env` 与 `skill-loader.ts` 切到新 SSOT；旧 SSOT 完整保留不动；RemotionStudio 精简至 610M（排除 out/renders/payloads/test_*） |
| v4.4.1 | 2026-05-01 | **Director Design System Target** - 根目录新增 `design.md` / `design.zh.md` 作为 Google Stitch 风格设计事实源；补齐设计目标 PRD、UI 续作实施计划、设计验收 request；更新 AGENTS/README/rules/testing/HANDOFF；落地首段 UI 实施（左栏 ProjectContextDock 接入、CSS token 清债、Runtime 动作追踪占位、版本号显示修正），并经 `npm run build` 与 agent-browser 页面验证通过 |
| v4.4.2 | 2026-05-01 | **Drawer Product Surface First Pass** - 清理非主线 WIP 后推进 Unit 3：Runtime 增加当前状态、最近事件、动作类型标签和工具反馈；Artifacts 增加刷新、loading/error/empty 状态、路径与打开/下载 affordance；Handoff 增加当前可继续状态、下一步建议和刷新/重试；经 `npm run build` 与 agent-browser 1440/980 验证通过 |

---

> 📌 追加规则：每次完成重大功能/修复后，在此表末尾追加一行。格式：`| vX.Y.Z | YYYY-MM-DD | 简短描述 |`
