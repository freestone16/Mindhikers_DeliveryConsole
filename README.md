# Golden Crucible SSE Workspace

MindHikers Delivery Console 体系中的黄金坩埚 SSE / SaaS 集成工作线。仓库历史文案里仍可能出现 “Delivery Console”，但当前启动、排障与协作都以本 worktree 为准。

---

## 📁 项目结构

**⚠️ 重要变更（2026-03-24 更新）：当前代码已迁入 `MHSDC` worktree 体系，旧 `DeliveryConsole` 路径仅保留为历史记录，不再是默认启动位置。**

```
/Users/luzhoua/MHSDC/
├── GoldenCrucible-GC/                  ← 黄金坩埚稳定线
├── GoldenCrucible-SSE/                 ← 黄金坩埚 SSE / SaaS 集成线
├── GoldenCrucible-SaaS/                ← 黄金坩埚 SaaS 抽壳线
├── DeliveryConsole/Director/           ← 导演大师独立线
└── ...

/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/
└── ...                                 ← 项目数据目录（保留在原处）
```

当前仓库是多 worktree 体系的一部分，因此：

1. **代码目录以当前 worktree 为准**
2. **项目数据目录仍由 `PROJECTS_BASE` 指向**
3. **端口以 `~/.vibedir/global_ports_registry.yml` + 当前 worktree 的 `.env.local` 为准**
4. **凡是提到旧 `DeliveryConsole` 路径的说明，默认视为历史背景，而不是当前启动入口**

---

## 🚀 快速开始

### 方式 1：本地开发（推荐）

```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible-SSE
npm run dev
```

服务启动后：
- 若存在 `.env.local`，以前端 `VITE_APP_PORT` / 后端 `PORT` 为准
- 当前 `MHSDC-GC-SSE` worktree 默认口径：
  - 前端：`http://localhost:5182`
  - 后端：`http://localhost:3009`

### 方式 2：Docker（网络稳定时使用）

```bash
cd /Users/luzhoua/MHSDC/GoldenCrucible-SSE
make dev
```

**注意：** 如果遇到 Docker Hub 连接问题，请使用方式 1。

当前 worktree 的本地开发端口以 `~/.vibedir/global_ports_registry.yml` 为准；如存在 `.env.local`，其端口配置会覆盖 `.env`。

---

## ⚙️ 环境配置

### 关键配置文件：`.env`

```bash
# 当前激活的项目名称
PROJECT_NAME=CSET-SP3

# 服务端口
PORT=3009
VITE_APP_PORT=5182

# 项目数据基础路径（⚠️ 关键配置）
# 代码 worktree 可迁移，但数据目录保持在外部 Projects 根目录
PROJECTS_BASE=/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects

# LLM 配置
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=<your-deepseek-api-key>
```

**安全提醒：**
1. 不要把真实 API key 写进 README、设计文档或提交记录
2. 需要按 worktree 覆盖端口时，优先放到 `.env.local`
3. 修改 `.env` / `.env.local` 后必须重启服务

**修改项目：**
1. 编辑 `.env` 中的 `PROJECT_NAME`
2. 重启服务
3. 或使用界面上的项目切换功能

---

## 📂 数据目录说明

项目数据保留在原处，不影响 Obsidian：

```
Projects/
├── CSET-SP3/
│   ├── 01_Reference/           # 参考资料
│   ├── 02_Script/              # 脚本文件
│   ├── 03_Thumbnail_Plan/      # 缩略图方案
│   ├── 04_Visuals/             # 视觉方案（Director 输出）
│   ├── 04_Music_Plan/          # 音乐方案
│   ├── 05_Marketing/           # 营销方案
│   ├── 05_Shorts_Output/       # Shorts 方案
│   ├── delivery_store.json     # 项目状态数据
│   └── .tasks/                 # 任务文件
```

---

## 🛠️ 开发说明

### 技术栈

- **前端：** React + TypeScript + Vite + Tailwind CSS
- **后端：** Node.js + Express + Socket.io
- **Skill 执行：** Python 3
- **容器化：** Docker + Docker Compose

### 常用命令

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 代码检查
npm run lint

# Docker 构建
make init

# Docker 启动
make dev

# Docker 停止
make stop

# Docker 日志
make logs
```

### 重要文件

| 文件 | 说明 |
|------|------|
| `.env` | 环境变量配置（项目路径、API Key 等） |
| `server/index.ts` | 后端主入口 |
| `src/App.tsx` | 前端主组件 |
| `skills/executor.py` | Skill 执行器 |
| `skills/connectors/registry.py` | LLM 连接器注册表 |

---

## 🐛 已知问题与修复

### 1. DeepSeek Model Not Exist 错误

**问题：** 调用 LLM 时返回 `Model Not Exist` 错误。

**原因：** `skills/connectors/registry.py` 第 56 行代码逻辑错误，把字符串 `"DIRECTOR_LLM_MODEL"` 当作模型名传给 API。

**修复：**
```python
# 错误
model_key = f"{prefix}LLM_MODEL" or os.environ.get('LLM_MODEL')

# 正确
model = os.environ.get(f"{prefix}LLM_MODEL") or os.environ.get('LLM_MODEL')
```

**状态：** 已修复（2025-02-20）。

### 2. Docker Hub 连接问题

**问题：** `make dev` 时 Docker Hub 连接失败。

**解决：** 使用本地开发模式 `npm run dev`。

---

## 🔄 版本历史

### v2.0.1 (2025-02-20)

- **变更：** 当时项目代码从 Obsidian 目录分离到 `/Users/luzhoua/DeliveryConsole/`（后续已进一步迁入 `MHSDC` worktree 体系）
- **修复：** `registry.py` 模型名称读取逻辑错误
- **说明：** 数据目录（Projects/）保留在原处，不受影响

### v2.1.0 (2026-03-24)

- **变更：** 当前启动说明切换到 `MHSDC` worktree 体系
- **修复：** 清理旧 `DeliveryConsole` 启动路径误导
- **安全：** 移除 README 中的敏感 key 示例

### v2.0.0 (2025-02-13)

- 初始版本

---

## 📝 Antigravity 交接说明

**如需在 Antigravity 中继续开发：**

1. **项目位置：** 以当前 worktree 为准，例如 `/Users/luzhoua/MHSDC/GoldenCrucible-SSE/`
2. **数据位置：** `/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/`
3. **启动方式：** `cd <当前 worktree> && npm run dev`
4. **关键配置：** 检查 `.env` / `.env.local` 中的 `PROJECTS_BASE` 与端口是否正确
5. **注意事项：** 不要移动 Projects/ 数据目录；多 worktree 并行时优先使用 `.env.local` 区分端口

---

## 📞 联系方式

如有问题，请优先参考 `docs/dev_logs/HANDOFF.md`、`docs/04_progress/dev_progress.md` 与 `docs/` 目录，再查看 Makefile 中的帮助信息。

```bash
make help
```

---

**最后更新：** 2026-03-24
**文档维护：** AI Assistant
