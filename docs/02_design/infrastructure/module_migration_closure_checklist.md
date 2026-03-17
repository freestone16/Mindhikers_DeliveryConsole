# 模块迁移收口自查建议书

> 适用范围：MindHikers 体系内一级模块、二级模块，以及从主仓切出 worktree / 新目录 / 新端口后的收口阶段。
> 目标：避免出现“代码搬过去了，但运行时、文档、脚本、端口、依赖、状态板都没跟上”的半迁移态。

## 1. 先判定是不是“真的迁完了”

满足以下 6 条，才算进入收口阶段：

1. 代码目录已切到新工作区
2. 当前分支不是 `main`
3. 数据目录路径已明确
4. `.env.local` / `.env` 已存在有效配置
5. README / 进度文档 / 状态板能指向当前真实工作区
6. 至少知道当前前后端各自应该跑哪个端口

如果这 6 条里有 2 条以上答不上来，不要急着开工，先补现场认知。

## 2. 收口必查八件套

### A. 路径 SSOT

检查项：
- 当前工作树路径
- git worktree 真实来源
- `PROJECTS_BASE`
- skills 路径
- PM2 / launch / shell 脚本里是否仍引用旧目录

常见坑：
- README 还写旧目录
- `.agent/PROJECT_STATUS.md` 还写旧 worktree
- PM2 `cwd` 还指向旧仓库

### B. 端口 SSOT

检查项：
- `.env.local` 的 `PORT` / `VITE_APP_PORT`
- `vite.config.ts` 默认端口
- 运行时配置文件
- `launch.json`
- `dev:check` / `preview` / `start.sh` / PM2 配置

原则：
- 端口只能有一个事实来源
- 脚本必须读取环境变量，不能再写死 `3002/5173`
- 如果环境禁止绑定端口，要能区分 `EPERM` 和真实 `EADDRINUSE`

### C. API / Socket / 资源 URL

检查项：
- `fetch('http://localhost:xxxx')`
- `io('http://127.0.0.1:xxxx')`
- `window.open('http://localhost:xxxx/...')`
- `<video src="http://...">`

原则：
- 统一走 runtime config
- 功能路径不允许散落 host/port 字面量
- 资源下载和视频预览也算运行时入口，不能漏

### D. Docker 假设残留

检查项：
- `/data/projects/...`
- 容器内相对路径假设
- 只在 Docker 成立的 secrets / mounts 路径

原则：
- 任何业务代码不得偷偷假设自己运行在容器内
- 如确需 Docker 专属逻辑，必须显式分支并写清条件

### E. 依赖层

检查项：
- `node_modules` 是否存在
- 构建依赖是否齐全
- `package-lock.json` / lockfile 是否落盘
- worktree 是否误带旧平台依赖目录

原则：
- 没有依赖层，就不要宣称现场可开工
- 若存在 `node_modules_bad` / 旧平台残留，必须明确说明用途和状态

### F. 文档与状态板

检查项：
- `docs/04_progress/dev_progress.md`
- `.agent/PROJECT_STATUS.md`
- `README.md`
- `RELOCATION.md`
- 最新 `docs/dev_logs/`

原则：
- 至少要有一份文档能准确回答“当前在哪、做到哪、卡在哪”
- 状态板与真实分支、真实 worktree、真实里程碑不能错位

### G. 验证脚本

至少做 4 类验证：
1. 端口检查
2. 构建或类型检查
3. 最小测试集
4. 硬编码扫描

推荐命令：
- `npm run dev:check`
- `npm run build`
- `npm run test:run -- <关键测试>`
- `rg "localhost:3002|127\.0\.0\.1:3002|/data/projects/" src scripts server`

### H. 边界纪律

如果收口时 `build` 暴露 unrelated 模块红灯：

1. 先分类
2. 标注是否属于本轮迁移范围
3. 只修本轮相关问题
4. unrelated 模块留给专项任务，不要混修

这条最重要。

## 3. 收口完成的最低验收标准

以下 7 条全部满足，才算可以说“这里能开工”：

1. 关键 host/port 硬编码清零
2. 启动脚本与 `.env.local` 口径一致
3. 端口检查脚本不会误报
4. 依赖层已恢复
5. 至少 1 条关键测试通过
6. 文档已说明当前工作区真实状态
7. 未通过项已明确按模块归因，不是混沌状态

## 4. 汇报模板

建议所有模块收口汇报统一成以下结构：

1. 迁移完成度
2. 已收口项
3. 未收口项
4. 验证结果
5. 是否可以作为主战场继续开发
6. 若不能，差哪几刀

## 5. 反模式清单

以下情况一出现，就说明收口还没做好：

- README 说一个目录，状态板写另一个目录，实际 cwd 又是第三个目录
- `.env.local` 是一套端口，脚本是另一套，前端硬编码是第三套
- 端口脚本把 `EPERM` 误判成“端口被占用”
- 只恢复了代码，没有恢复依赖
- 看见 unrelated build 报错就顺手改进到其他模块
- 没有 dev log，也没有进度落盘

## 6. 建议动作顺序

以后其他模块迁移时，统一按这个顺序：

1. 读 rules / 状态板 / dev_progress
2. 判定 worktree / 目录 / 分支 / 数据路径
3. 统一端口 SSOT
4. 清硬编码 host / port / Docker 路径
5. 恢复依赖
6. 跑端口检查 / 测试 / build
7. 区分本轮问题 vs unrelated 存量问题
8. 落 dev log / 进度文档 / 自查记录

