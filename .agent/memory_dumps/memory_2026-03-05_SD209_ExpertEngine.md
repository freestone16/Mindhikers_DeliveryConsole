# 🧠 AI Context Memory Dump - 2026-03-05
## 项目名: DeliveryConsole (专家数据修改引擎 SD-209)

### 1. 核心目标
构建一个通用的、可扩展的专家数据修改框架，替代旧有的硬编码正则表达式识别，通过大模型 Function Calling 意图转换结合前端确认卡片，实现稳健的数据篡改防护。

### 2. 当前进度
- **完成度**: 100% (实施完成)
- **Git Commit**: `e2d78b3` (checkpoint(SD-209): 实现了专家数据修改引擎全链路重构)
- **拦截器**: 后端已具备 Tool Calling 拦截与存储快照备份机制。
- **UI**: 前端已具备 `chat-action-confirm` 渲染及 `chat-action-execute` 触发逻辑。

### 3. 关键文件索引
- `server/expert-actions.ts`: 适配器管理器。
- `server/expert-actions/director.ts`: Director 技能代码。
- `server/index.ts`: Socket 事件核心分发器。
- `src/components/ChatPanel.tsx`: 侧边栏交互组件。

### 4. 下一步动作计划 (Next Steps)
1. **环境恢复**: 老卢在本地手动清理并重新安装 `node_modules`。
2. **端到端测试**: 运行 `npm run dev`，在 Director 侧边栏发送“删除第一章第一个选项”测试 FC 拦截与确认框。
3. **扩展支持**: 按需接入 `MusicDirector` 的音量/BGM 调整适配器。

### 5. AI 上下文恢复指令
如果在下个 Session 启动，请先读取 `.agent/PROJECT_STATUS.md` 了解全局，然后读取 `docs/plans/2026-03-05_SD209_ChatPanel_Expert_Modification_Engine.md` 了解架构设计。
