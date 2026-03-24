# 2026-03-24 GoldenCrucible SaaS 分支 / 环境 / 验证执行方案

> 日期：2026-03-24
> 当前参考仓库：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 目标目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
> 状态：执行方案 / 供新工作目录起步

---

## 1. 这份方案解决什么问题

这份方案要解决 4 个容易混淆的问题：

1. 后续 SaaS 开发是不是还在本地做
2. 云端 staging 和对外 demo/prod 分别是什么
3. 本地文件夹、Git 分支、云端服务名怎么一一对应
4. 现在是否要立刻从 SaaS 目录切新分支

结论先写在前面：

1. **后续开发仍然以本地开发为主**
2. **云端主要负责 staging 验证和 demo/prod 演示，不负责日常主开发**
3. **建议保留 Stable / Integration / Feature 三层**
4. **建议在 `/GoldenCrucible-SaaS` 中新起一条短命 Feature 分支，专做 `MIN-105`**

---

## 2. 三层并行，用通俗的话怎么理解

可以把当前体系理解为 3 个场地：

### 2.1 Stable

这是“老家”和“对照线”。

作用：

1. 保留一个相对稳定、可回看的基线
2. 用来对照“改之前是什么样”
3. 必要时做回退参考

### 2.2 Integration

这是“主战场”和“集成区”。

作用：

1. 承接已经验证通过的 SSE / SaaS 成果
2. 形成下一版准备上线的版本
3. 作为后续 demo/prod 的主要上游

### 2.3 Feature

这是“实验车间”和“当前开发区”。

作用：

1. 专门做 `MIN-105`
2. 让 SaaS 抽壳、环境收口、session 最小持久化等改动有独立空间
3. 避免继续污染当前 `MHSDC-GC-SSE` 工作区

一句话：

1. **Stable 用来稳**
2. **Integration 用来收成熟成果**
3. **Feature 用来狠狠干当前任务**

---

## 3. 本地 / 分支 / 云端 对照表

| 层级 | 用途 | 本地文件夹 | Git 分支 | 云端环境 | 云端服务名 | 域名 | 备注 |
|---|---|---|---|---|---|---|---|
| Stable | 稳定基线，对照和回看 | `/Users/luzhoua/MHSDC/GoldenCrucible-GC` | `MHSDC-GC` | 暂不部署 | 暂无 | 暂无 | 不建议继续做新开发 |
| Integration | SSE/SaaS 集成主线，收成熟成果 | `/Users/luzhoua/MHSDC/GoldenCrucible-SSE` | `MHSDC-GC-SSE` | demo/prod 候选来源 | `golden-crucible-demo` | 后续正式挂 `app.mindhikers.com` 或正式 demo 域名 | 只收已经在 staging 验过的改动 |
| Feature | 当前 SaaS 开发线 | `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS` | `codex/min-105-saas-shell` | staging | `golden-crucible-staging` | 先用平台临时域名 | 主要做代码开发和云端验证 |

---

## 4. “服务名”到底是什么

“服务名”不是 Git 概念，而是**云平台里正在运行的应用实例名称**。

最通俗的区分方式：

1. **文件夹名**：你电脑上的工作目录
2. **分支名**：Git 里的开发线
3. **服务名**：云平台控制台里这段应用运行时的名字
4. **域名**：别人访问时看到的网址

以 `golden-crucible-staging` 为例，它的意义是：

1. 你在 Railway / Lighthouse / CloudBase 控制台里，一眼就知道这是 staging
2. 环境变量会配在这个 service 上
3. 日志、重启、重部署都针对这个 service
4. 不会和正式 demo/prod 搞混

建议当前统一命名：

1. staging service：`golden-crucible-staging`
2. demo/prod service：`golden-crucible-demo`

---

## 5. 本地开发、staging 验证、prod 演示分别做什么

### 5.1 本地开发

本地是“做东西”的地方。

主要做：

1. 改代码
2. 调 SSE
3. 看日志
4. 跑单测
5. 调整宿主壳和 UI

不适合拿本地直接证明：

1. HTTPS 是否正常
2. 云端环境变量是否注入正确
3. 真实网络下 SSE 是否稳定
4. 跨域、代理、反代、长连接是否成立

### 5.2 云端 staging

staging 是“验东西”的地方。

主要做：

1. 验环境变量
2. 验 SSE 在真实云环境下是否正常
3. 验 `/health` 与 readiness
4. 验刷新恢复、重置、错误提示
5. 验部署脚本、构建命令、启动命令是否正确

staging 不承担日常主开发。

### 5.3 云端 demo/prod

demo/prod 是“给人看”的地方。

主要做：

1. 给朋友演示
2. 给合作方演示
3. 给投资人演示

这里不应该边演示边调试。

---

## 6. 从 Codex 执行角度，我的更稳建议

你原话是：

“稍后我会在那个文件夹按你现在写的方案劈一个分支出来。”

这个做法是对的，但我会补一条更稳的建议：

### 6.1 不要直接从当前脏工作区继续切并复用未提交改动

原因：

1. 当前 `/Users/luzhoua/MHSDC/GoldenCrucible-SSE` 已经存在较多未提交修改
2. 里面既有 SSE 主链改动，也有文档和测试改动
3. 如果直接把这些未提交现场带进 SaaS 新工作区，之后很难判断：
   - 哪些是 `MIN-104` 遗留
   - 哪些是 `MIN-105` 新增

### 6.2 更稳的做法

建议顺序：

1. 以当前 `MHSDC-GC-SSE` 的 **HEAD 提交** 为基线
2. 在 `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS` 建立独立 worktree
3. 切出新分支：`codex/min-105-saas-shell`
4. 让这个目录只承接 `MIN-105` 的新改动
5. 当前 `GoldenCrucible-SSE` 保留为集成线，不继续把 SaaS 抽壳工作直接堆进去

### 6.3 最通俗的判断

如果你问“要不要在 SaaS 目录继续做”：

答案是：**要。**

如果你问“要不要直接继承当前未提交现场”：

答案是：**不建议。**

---

## 7. 建议的实际执行顺序

### 阶段 A：准备好 Feature 工作区

1. 在 `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS` 建独立 worktree
2. 分支名使用：`codex/min-105-saas-shell`
3. 这条线专门负责：
   - SaaS 外壳抽离
   - 去 Delivery 宿主语义
   - 环境变量收口
   - session 最小持久化
   - staging 部署适配

### 阶段 B：本地开发验证

在 `GoldenCrucible-SaaS` 中完成：

1. 应用默认直接进入 Crucible
2. 移除 Delivery / Director / Distribution 等无关入口
3. 先跑通本地 HTTP + SSE 主链
4. 补最小 onboarding、错误提示、重置

### 阶段 C：云端 staging 验证

从 `codex/min-105-saas-shell` 部署到 staging service：

1. service 名：`golden-crucible-staging`
2. 域名：先用平台临时域名
3. 验证项：
   - `/health`
   - SSE 对话
   - session 恢复
   - 重置
   - 错误提示
   - 环境变量

### 阶段 D：合回 Integration

当 staging 稳定后：

1. 合回 `MHSDC-GC-SSE`
2. 让 `MHSDC-GC-SSE` 成为 demo/prod 的上游
3. 再部署正式演示 service：`golden-crucible-demo`

---

## 8. 建议的环境职责边界

### 8.1 本地 `.env.local`

只负责本地开发便利性，例如：

1. `PORT`
2. `VITE_APP_PORT`
3. `VITE_API_BASE_URL`
4. 本地调试用的 provider key

### 8.2 云端 staging / demo

不要依赖本地 `.env.local`。

云端环境变量直接配在 service 上，建议后续收口为最小集：

1. `PORT`
2. `APP_BASE_URL`
3. `VITE_API_BASE_URL`
4. `CORS_ORIGIN`
5. `SESSION_SECRET`
6. LLM provider key

后续应尽量把 `PROJECTS_BASE` 降级为：

1. 本地兼容模式可用
2. SaaS 主链默认不依赖

---

## 9. 当前推荐的最终口径

当前最推荐的实际口径是：

1. **Stable**
   - 文件夹：`/Users/luzhoua/MHSDC/GoldenCrucible-GC`
   - 分支：`MHSDC-GC`
2. **Integration**
   - 文件夹：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
   - 分支：`MHSDC-GC-SSE`
3. **Feature**
   - 文件夹：`/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`
   - 分支：`codex/min-105-saas-shell`
4. **staging service**
   - 名称：`golden-crucible-staging`
5. **demo/prod service**
   - 名称：`golden-crucible-demo`

一句话总结：

**GoldenCrucible-SaaS 负责开发，golden-crucible-staging 负责云端验收，MHSDC-GC-SSE 负责收口并通向正式演示。**

