# 2026-04-09 GoldenCrucible SSE Railway 线上入口切分正式实施方案

> 工作目录：`/Users/luzhoua/MHSDC/GoldenCrucible-SSE`
> 当前分支：`MHSDC-GC-SSE`
> 目标：只解决一个最大问题，把 `SSE` 研发线与 `SAAS` 正式线的线上入口切开

---

## 0. 执行摘要

当前 `SSE` 不是纯本地开发现场，而是已经挂到了 Railway；问题不在“有没有线上”，而在“`SSE` 与 `SAAS` 还在共用正式发布口径”。  
这会让后续所有研发、联调、smoke、OAuth 回调都继续混线。

本方案只做一刀，不扩治理：

- 保留当前 Railway 项目
- 新建 `sse` 独立环境
- 给 `sse` 环境生成独立 Railway 域名
- 让 `SSE` worktree 以后固定连 `sse`
- `SAAS` 继续独占 `gc.mindhikers.com`

下一轮输出不是“讨论结果”，而是一个真实可访问的 `SSE` 独立线上入口。

---

## 1. Current State

### 1.1 已确认事实

- 当前 `SSE` worktree 已连接 Railway，不是纯本地预览现场。
- 现场核到的 Railway 口径是：
  - 当前项目名：`GoldenCrucible-SaaS-Staging`
  - 当前应用服务名：`golden-crucible-saas`
  - 当前应用变量口径已指向：`gc.mindhikers.com`
- 这说明当前最大问题不是“没有 `SSE` 线上”，而是：
  - `SSE` 研发线仍寄生在 `SAAS` 发布口径上
  - 研发 smoke 与正式发布口径没有切开
  - 当前任何“线上验证成功”的表达，都很容易实际落在正式域名语境里

### 1.2 为什么这是当前唯一必须优先处理的问题

如果不先切开线上入口，后面所有功能开发都会继续出现三类混乱：

1. **验收口径混乱**
   - 团队无法明确说清当前验证是在 `SSE` 还是 `SAAS`
2. **发布边界混乱**
   - 原本应该 cherry-pick 到 `SAAS` 才发布的东西，可能提前污染正式口径
3. **认证与会话混乱**
   - `APP_BASE_URL`、`BETTER_AUTH_URL`、`CORS_ORIGIN`、OAuth callback 会天然耦合
   - 只要线上入口不切开，后面微信、Google、Authing、session facade 都会持续缠在一起

### 1.3 本轮明确不处理的问题

- 不重命名当前 Railway 项目
- 不拆新的 Railway 项目
- 不顺手整理所有历史环境变量
- 不讨论“将来要不要更复杂的 staging / preview / demo / production 四层环境”
- 不讨论 `SAAS` 那边项目名里少一个 `staging` 关键字的问题

这份方案只解决“`SSE` 独立线上入口”这一件事。

### 1.2 本轮不再讨论的问题

本轮只处理一件事：给 `SSE` 切出独立线上入口，并让它成为默认研发入口。

---

## 2. Target Structure

### 2.1 最终口径

- `SSE`：
  - 主研发线
  - 主联调线
  - 主 smoke 线
  - 默认在线验证入口
- `SAAS`：
  - 正式发布线
  - 继续承接 `gc.mindhikers.com`
  - 只接收从 `SSE` 验证完成后摘樱桃过来的能力

### 2.2 目标结构图

```text
当前：
SSE worktree -> Railway 应用服务 -> gc.mindhikers.com
SAAS worktree -> Railway 应用服务 -> gc.mindhikers.com

目标：
SSE worktree -> Railway:sse 环境 -> SSE 专属 Railway 域名
SAAS worktree -> Railway:production 环境 -> gc.mindhikers.com
```

### 2.3 最小实施结构

- 继续沿用当前 Railway 项目。
- 在当前项目内新增独立环境：`sse`
- `sse` 环境复用当前应用服务 `golden-crucible-saas`
- 为 `sse` 环境生成独立 Railway 域名
- `SSE` worktree 今后固定连：
  - 项目：当前 Railway 项目
  - 服务：`golden-crucible-saas`
  - 环境：`sse`
- `SAAS` 继续固定连：
  - 正式环境
  - 正式域名 `gc.mindhikers.com`

### 2.4 环境职责切分

| 线别 | 环境 | 域名职责 | 是否允许新功能开发 |
|---|---|---|---|
| `SSE` | `sse` | 日常开发、联调、smoke、收口前演示 | 允许 |
| `SAAS` | `production` | 正式发布、对外可用、真实生产会话 | 不允许直接做研发试验 |

### 2.5 明确禁止

- 禁止继续让 `SSE` 直接复用 `gc.mindhikers.com`
- 禁止下一轮只切半套变量后就宣称 `SSE` 已独立
- 禁止在 `SSE` 线上入口尚未切出前继续把“以后主力开发在 `SSE` 线上”当成既成事实

---

## 3. Execution Plan

### 3.1 下一轮只做这些动作

1. 在当前 Railway 项目中创建 `sse` 环境
2. 将 `production` 当前应用配置复制到 `sse`
3. 为 `sse` 环境的 `golden-crucible-saas` 服务生成独立 Railway 域名
4. 将 `SSE` worktree 链接到：
   - 服务：`golden-crucible-saas`
   - 环境：`sse`
5. 一次性改完 `sse` 环境中的线上变量：
   - `APP_BASE_URL`
   - `BETTER_AUTH_URL`
   - `CORS_ORIGIN`
   - 所有第三方登录 callback / allowlist / redirect 白名单

### 3.2 具体实施顺序

#### Step A：切出 `sse` 环境

- 目标：先把“环境层”切开，而不是先碰代码
- 要求：
  - `sse` 必须从 `production` 复制
  - 不允许从空环境重新手填，避免漏变量

#### Step B：生成 `SSE` 独立域名

- 目标：先拿到一个可访问的 Railway 域名
- 结果要求：
  - 新域名必须稳定返回到 `sse` 环境的应用服务
  - 不允许仍然回到 `gc.mindhikers.com`

#### Step C：修正 `sse` 环境变量

- 本步骤必须一次性完成以下口径切换：
  - `APP_BASE_URL` -> `SSE` 新域名
  - `BETTER_AUTH_URL` -> `SSE` 新域名
  - `CORS_ORIGIN` -> `SSE` 新域名
  - Google / 微信 / Authing 的 callback / allowlist / redirect -> `SSE` 新域名

#### Step D：修正本地研发默认连接

- 目标：让这份 `SSE` worktree 以后默认就指向 `sse`
- 结果要求：
  - 当前 worktree 的 Railway link 不再悬空或误指数据库
  - 以后提到“`SSE` 线上验证”，默认就是 `sse` 环境而不是 `production`

#### Step E：做最小 smoke

- 只验证最核心四件事：
  1. `/health`
  2. 首页可达
  3. 基础 session
  4. 第三方登录回调不会跳回 `gc.mindhikers.com`

### 3.3 变量调整原则

- `SAAS` 正式环境继续保持 `gc.mindhikers.com`
- `SSE` 新环境全部切到新的 `SSE` Railway 域名
- 不允许出现下面这种假完成：
  - `APP_BASE_URL` 已切
  - 但 OAuth 回调仍指向 `gc.mindhikers.com`

如果只做前半截，结果不是“先部分完成”，而是“继续混线”。

### 3.4 验收清单

下一轮实施完成后，当场验证：

1. `SSE` 新域名 `/health` 返回正常
2. `SSE` 新域名首页可达
3. 会话与基础 auth 不会跳回 `gc.mindhikers.com`
4. 第三方登录 callback 已切到 `SSE` 新域名
5. `SAAS` 正式域名保持不变，不被本轮改动污染

### 3.5 完成标准

满足以下全部条件，才算本事项收口：

- `SSE` 有独立 Railway 域名
- `SSE` worktree 默认连 `sse` 环境
- `SAAS` 继续保留 `gc.mindhikers.com`
- `SSE` 与 `SAAS` 的线上入口不再混用
- 至少完成一轮 `SSE` 新域名 smoke

### 3.6 回滚口径

如果实施中间发现 `sse` 域名可生成，但 callback 平台无法在同一轮补齐：

- 不上线半套 `SSE` 域名
- 不改动 `SAAS` 正式环境
- 回滚 `sse` 环境变量到未启用状态
- 明确记录阻塞点后停止

也就是说，允许“当轮失败后回退”，但不允许“半成功半失败地挂在线上”。

---

## 4. Open Questions

### 4.1 当前决策

- 无新增开放决策问题。
- 本轮方案已经拍板，不再继续讨论：
  - 是否新开项目
  - 是否继续只用本地
  - 是否让 `SSE` 继续借用 `SAAS` 域名
  - 是否等以后再顺手切线上入口

### 4.2 唯一允许的实施期阻塞

- 若下一轮实施时 Railway 或第三方平台权限不足，无法在同一轮补齐 callback 白名单：
  - 必须立即停下并汇报
  - 不允许先把半套域名切换上线

换句话说，下一轮要么一次切干净，要么明确阻塞，不做半成品。

---

## 一句话结论

下轮不做大治理，只做一刀：

把 `SSE` 从当前混用的 `SAAS` 发布口径里切出来，建立 `sse` 独立环境和独立 Railway 域名；从此以后，主力开发、联调、smoke 默认全部走 `SSE` 新域名，`SAAS` 只负责正式发布与 `gc.mindhikers.com`。
