# 2026-03-18 | GoldenCrucible | 开发日志

> `[2026-03-18]` | `[SD-210 黄金坩埚]` | `[✅ 阶段性完成]`

---

## 核心变动

### 1. ChatPanel S/L/D 按钮重构
- **修改文件**：`src/components/ChatPanel.tsx`
- **变更**：移除 JSON 导出/导入文件对话框流程，改为：
  - S → `localStorage.setItem('golden-crucible-workspace-v8', snapshot)`
  - L → `localStorage.getItem(...)` 直接恢复
  - D → 下载 Markdown 对话记录
- **Commit**：`1c89848`

### 2. App.tsx 分割线范围放宽
- **修改文件**：`src/App.tsx`
- **变更**：拖动分隔线 min-width 约束调整，黑板面板可向左延伸更多
- **Commit**：`1c89848`（与上同）

### 3. Linear MCP 安装 & OAuth 认证
- **命令**：`claude mcp add --transport http linear-server https://mcp.linear.app/mcp`
- **官方文档**：`https://linear.app/docs/mcp`
- **认证**：OAuth 2.1 流程完成，用户已授权
- **已知问题**：在聊天界面输入 `/mcp` 会被 `mcp-builder` Skill 拦截，需在终端 Claude CLI 中操作

### 4. AGENTS.md 浏览器优先级规则
- **修改文件**：`AGENTS.md`
- **新增章节**：§浏览器工具优先级规则
- **核心规则**：
  1. `agent-browser` Skill（最高，无头独立）
  2. 专用 MCP（Linear/GitHub 等，直接 API）
  3. `mcp__Claude_in_Chrome__*`（最低，控制用户真实屏幕，默认禁用）

---

## 存疑 / 待办

- [ ] Linear MIN-38 父 Issue 及子 Issues 中文同步（下一窗口完成）
- [ ] 未提交文件待 commit：新增 Skills（Socrates/Writer/FactChecker/Researcher/ThesisWriter）、`server/skill-sync.ts`、`skills/Director/SKILL.md`、`.agent/config/llm_config.json`
- [ ] `package-lock.json` 是否纳入版本管理需确认

---

## 经验记录

- **教训**：有专用 MCP 时不要开浏览器，`linear-server` MCP 可直接操作 Linear API，无需任何 browser 工具
- **教训**：`mcp__Claude_in_Chrome__*` 是控制用户屏幕的插件，不是无头浏览器，默认应该是最后手段
