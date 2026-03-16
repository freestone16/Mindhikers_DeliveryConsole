# Delivery Console

MindHikers 项目的内容交付管理控制台。用于管理视频项目的制作流程，包括导演、音乐、缩略图、营销等模块。

> 当前 Director 新家工作区：`/Users/luzhoua/MHSDC/DeliveryConsole/Director`
> 端口 SSOT：`~/.vibedir/global_ports_registry.yml` -> `.env.local` -> runtime
> 当前账本口径：前端 `5178`，后端 `3005`

---

## 📁 项目结构

**⚠️ 历史搬迁（2025-02-20）+ 当前开发新家（2026-03-14）**

```
/Users/luzhoua/
├── DeliveryConsole/                    ← 本项目代码
│   ├── src/                            ← React 前端代码
│   ├── server/                         ← Node.js 后端
│   ├── skills/                         ← Python Skill 执行器
│   ├── .env                            ← 配置文件（关键）
│   └── README.md                       ← 本文档
│
└── Mylife_lawrence/
    └── Obsidian_Antigravity/
        └── Projects/
            └── MindHikers/
                └── Projects/           ← 项目数据（保留在原处）
                    ├── CSET-SP3/       ← 当前激活项目
                    ├── CSET-EP4/
                    ├── CSET-EP5/
                    └── ...
```

**数据分离原因：** 摆脱 Obsidian 索引负担，node_modules 不再影响笔记库性能。

---

## 🚀 快速开始

### 方式 1：本地开发（推荐）

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/Director
npm run dev
```

服务启动后：
- 前端：`http://localhost:5178`
- 后端：`http://localhost:3005`

### 方式 2：Docker（网络稳定时使用）

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/Director
make dev
```

**注意：** 如果遇到 Docker Hub 连接问题，请使用方式 1。

---

## ⚙️ 环境配置

### 关键配置文件：`.env.local`

```bash
# 当前工作区名称
PROJECT_NAME=MindHikers Delivery Console

# 端口以账本为准
PORT=3005
VITE_BACKEND_PORT=3005
VITE_APP_PORT=5178

# 项目数据基础路径（⚠️ 关键配置）
# DeliveryConsole 代码与项目数据已分离，必须指定完整路径
PROJECTS_BASE=/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects

# 开发时留空走 Vite proxy
VITE_API_BASE=
```

**修改项目：**
1. 编辑 `.env.local` 中的运行时配置
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
| `.env.local` | 当前工作区运行时配置（端口、项目数据路径） |
| `server/index.ts` | 后端主入口 |
| `scripts/runtime-env.js` | 脚本共享的运行时端口解析 |
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

- **变更：** 项目代码从 Obsidian 目录分离到 `/Users/luzhoua/DeliveryConsole/`
- **修复：** `registry.py` 模型名称读取逻辑错误
- **说明：** 数据目录（Projects/）保留在原处，不受影响

### v2.0.0 (2025-02-13)

- 初始版本

---

## 📝 Antigravity 交接说明

**如需在 Antigravity 中继续开发：**

1. **项目位置：** `/Users/luzhoua/DeliveryConsole/`
2. **数据位置：** `/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects/`
3. **启动方式：** `cd /Users/luzhoua/DeliveryConsole && npm run dev`
4. **关键配置：** 检查 `.env` 中的 `PROJECTS_BASE` 路径是否正确
5. **注意事项：** 不要移动 Projects/ 数据目录，只需修改 `.env.local` 即可

## 运行时纪律

- 端口以全局账本 `~/.vibedir/global_ports_registry.yml` 为单一事实来源
- `.env.local` 承接当前工作区被分配的端口
- `vite.config.ts`、`scripts/check-port.js`、`scripts/preview.js`、`start.sh`、PM2/launch 配置都必须跟随 `.env.local`
- 业务代码不应再写死 `localhost:3002` / `5173`

---

## 📞 联系方式

如有问题，请参考 `docs/` 目录或查看 Makefile 中的帮助信息。

```bash
make help
```

---

**最后更新：** 2025-02-20
**文档维护：** AI Assistant
