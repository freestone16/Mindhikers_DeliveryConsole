# L-015 - 端口配置必须由全局账本驱动，而不是在代码里写死

**日期**：2026-03-14
**分类**：环境配置 / 进程管理 / 多模块治理

---

## 问题

在 GoldenCrucible 迁移收口时，现场出现了 3 套端口口径并存：

- `.env.local` 里是一套
- `launch.json` / `scripts/check-port.js` 里是另一套
- 前端业务代码里还有残留的 `localhost:3002`

这类问题如果不收掉，后面一级模块、二级模块继续拆 worktree / 拆目录时，会反复出现：

1. 文档说一个端口
2. 脚本跑另一个端口
3. 业务代码偷偷连第三个端口

最终表现为：

- 看起来“服务起了”，实际前端连错后端
- 检查脚本误判端口冲突
- 模块迁移后只能靠人脑记端口

---

## 根本原因

### 错误的心智模型

把“端口配置”当成应用代码的一部分，直接在这些地方写死：

- React `fetch('http://localhost:3002/...')`
- Socket.IO `io('http://127.0.0.1:3002')`
- `launch.json`
- `start.sh`
- `scripts/check-port.js`

### 正确的心智模型

**端口不是业务代码事实，而是全局调度事实。**

对于 DeliveryConsole 体系，端口的单一事实来源应该分两层：

1. **全局账本层**：`~/.vibedir/global_ports_registry.yml`
   - 负责跨项目、跨 worktree、跨 Agent 的端口占位与分配
2. **运行时环境层**：`.env.local` / 进程环境变量
   - 负责把“本工作区实际被分配到的端口”注入给应用运行时

而前后端代码只应该读取：

- `process.env.PORT`
- `process.env.VITE_APP_PORT`
- `process.env.VITE_BACKEND_PORT`
- `src/config/runtime.ts`

**业务代码本身不应该直接解析全局账本 YAML。**

---

## 正确架构

### 推荐链路

```text
global_ports_registry.yml
    -> 启动前解析 / 分配端口
    -> 写入 .env.local 或 export 环境变量
    -> 前后端运行时读取 env
    -> 前端统一走 runtime config
```

### 角色分工

#### 1. 账本层

文件：

`~/.vibedir/global_ports_registry.yml`

职责：

- 记录哪个项目、哪个 worktree、哪个 Agent 占用了哪些端口
- 避免多个模块互相踩端口
- 为新模块迁移提供顺延分配依据

#### 2. 环境注入层

文件 / 脚本：

- `.env.local`
- `scripts/runtime-env.js`
- 后续可增加 `scripts/resolve-runtime-ports.js`

职责：

- 把账本结果转换成当前工作区可直接消费的环境变量

#### 3. 应用运行时层

文件：

- `src/config/runtime.ts`
- `server/index.ts`
- `server/youtube-auth.ts`

职责：

- 只消费环境变量
- 不关心全局账本细节

---

## 这次现场暴露出的具体坑

### 1. 业务代码写死旧端口

症状：

- 多个前端模块仍请求 `localhost:3002`

正确做法：

- 统一改走 `buildApiUrl()` 和 `runtimeConfig.socketUrl`

### 2. 脚本和 env 口径分裂

症状：

- `.env.local` 是一套
- `launch.json`、`check-port.js`、`preview.js` 是另一套

正确做法：

- 所有启动 / 检查脚本先读取 `.env.local` / `.env`

### 3. 误把端口检查写成“硬编码探测”

症状：

- 脚本只检查 `3002/5173`

正确做法：

- 脚本从环境变量取端口
- 并能区分：
  - 真正冲突：`EADDRINUSE`
  - 沙盒限制：`EPERM` / `EACCES`

---

## 面向其他模块的落地规则

以后音乐总监、短视频大师、营销大师等模块迁移时，统一按这个标准：

1. **先查账本，再定端口**
2. **账本结果写入 env，不要直接写进业务代码**
3. **前端所有 API / Socket / 下载 / 资源 URL 都走 runtime config**
4. **启动脚本、检查脚本、launch 配置必须共用同一套 env**
5. **如果 build 暴露 unrelated 模块红灯，不要混修**

---

## 推荐自查问题

迁移一个新模块前，先问这 5 个问题：

1. 这个模块的前后端端口是谁分配的？
2. 端口事实来源是在账本，还是散落在代码里？
3. `.env.local`、`launch.json`、`check-port.js` 是否一致？
4. 前端是否还残留 `localhost:xxxx` 硬编码？
5. 当前模块是否只是“能启动”，还是已经“能稳定交接”？

---

## 结论

**最佳实践不是“把端口写死到代码里”，也不是“让前端直接读账本”。**

最佳实践是：

**账本分配端口 -> 环境变量承接端口 -> runtime config 消费端口 -> 业务代码不再知道端口细节。**

这条规则应作为 DeliveryConsole 系列模块迁移的通用纪律。
