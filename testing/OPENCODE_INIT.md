# OpenCode 初始化与正式开测

## 一次性初始化

在 OpenCode 所在终端进入项目根目录：

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/Director
```

确认 `opencode` 可用：

```bash
opencode --help
```

如果要跑需要 `agent browser` 的 request，还要确认浏览器执行链完整：

```bash
which agent-browser
agent-browser --help
```

如果命令不存在，先安装：

```bash
npm install -g agent-browser
agent-browser install
```

## 正式开始测试

在启动 worker 之前，先确认你自己没有开着一个交互式 `opencode` 会话。

原因：

1. `opencode run`
2. `opencode` TUI

两者会共用同一套本地 sqlite 数据库。并发时容易出现：

```text
database is locked
```

### 方式 A：常驻 worker

```bash
npm run test:worker:director
```

如果此时你自己正在用 `opencode`，worker 会自动避让并把 request 标成 `blocked`，不会继续抢库。

默认行为：

1. 每 60 秒轮询 `testing/director/requests`
2. 发现新 request 就写 claim
3. 调用 `opencode run` 执行测试
4. 写 report 到 `testing/director/reports`
5. 更新 `testing/director/status`

### 方式 B：只跑一轮

```bash
npm run test:worker:director:once
```

适合手动试点。

### 方式 C：正式跑最新严格 request

当 `testing/director/requests/` 里已经有新的 request 时，直接执行：

```bash
npm run test:worker:director:once
npm run test:status:director
```

如果状态变成 `passed`，还要打开最新 report 确认是否真的满足 request 的硬性预期，而不是只有页面冒烟成功。

如果 request 明确要求 `agent browser`，还要在 report 里确认：

1. 实际使用的是 `agent-browser` CLI
2. 不是自写 Playwright fallback

## 如何看状态

```bash
npm run test:status:director
```

输出里除了最新执行结果，还会显示：

1. `next_request`：下一条待跑 request
2. `pending_request_count`：当前排队中的 request 数量
3. `pending_requests`：待跑 request 列表

或者直接打开：

- [testing/director/status/BOARD.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/status/BOARD.md)
- [testing/director/status/latest.json](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/status/latest.json)

## 执行纪律

1. 不修改 `requests/` 原文件
2. 默认不改代码
3. 必须写 `report`
4. 失败或阻塞也要留下 artifacts
5. 只有在 request 要求的关键结果被证据证明时，才能写 `passed`
6. 需要真实页面交互时，优先使用 `agent browser`

## Director Phase1 的通过定义

如果 request 是验证 Director Phase1，优先按下面标准判断：

1. 点击后出现生成中状态，或等价完成前信号
2. 最终页面出现 `Visual Concept Proposal`
3. 提案正文不是占位文案
4. 目标写盘文件修改时间晚于测试开始时间

如果只满足其中一部分，应写 `failed`，不要写 `passed`。

## 首次冒烟已发现的环境问题

当前这台机器上，worker 已经能成功：

1. 认领 request
2. 写 claim
3. 生成 report
4. 更新 status

但首次实际调用 `opencode run` 时遇到了两个环境阻塞：

1. `Failed to fetch models.dev`
2. `attempt to write a readonly database`

对应现象已经落在：

- [testing/director/reports/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.report.md](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/reports/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.report.md)
- [testing/director/artifacts/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.stderr.log](/Users/luzhoua/MHSDC/DeliveryConsole/Director/testing/director/artifacts/TREQ-2026-03-16-DIRECTOR-001-phase1-smoke.stderr.log)

## 初始化前先检查

### 1. OpenCode provider / 模型可用

先在 OpenCode 环境确认：

```bash
opencode providers
opencode models
```

如果这里就报网络或认证错误，worker 也会失败。

### 2. OpenCode 本地数据库可写

如果出现：

```text
attempt to write a readonly database
```

优先检查 OpenCode 本地数据目录权限，尤其是：

```bash
ls -ld ~/.local/share/opencode
ls -l ~/.local/share/opencode
```

如果目录或 sqlite 文件不可写，需要先修权限，再启动 worker。

### 3. 如果出现 `database is locked`

这通常表示 OpenCode 上一次异常退出后，SQLite 的 WAL 状态没有收干净。

先确认没有遗留 OpenCode 进程：

```bash
ps aux | rg opencode
```

如果确认没有存活进程，再做一次安全 checkpoint：

```bash
sqlite3 ~/.local/share/opencode/opencode.db 'pragma wal_checkpoint(full);'
```

成功时通常会返回类似：

```text
0|0|0
```

然后可以用一个非交互命令确认数据库已恢复可读：

```bash
opencode stats
```

如果 `opencode stats` 能正常输出，再重新执行：

```bash
opencode
```

不要优先删库；先做 checkpoint，只有确认数据库损坏时才考虑更激进恢复。

## 并发纪律

1. 你在手动使用 `opencode` 时，不要同时启动测试 worker
2. 测试 worker 发现已有 `opencode` 活进程时，应自动避让，而不是强行继续
3. 业务测试尽量采用串行执行：先退出个人会话，再让 worker 跑
