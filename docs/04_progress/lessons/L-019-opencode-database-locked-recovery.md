# L-019 - OpenCode `database is locked` 的安全恢复

## 现象

OpenCode 启动时报：

```text
database is locked
```

用户侧表现为：

```bash
opencode
Error: Unexpected error
database is locked
```

## 根因

这次排查时没有发现存活的 `opencode` 进程，但 `~/.local/share/opencode/` 下仍然保留了：

1. `opencode.db`
2. `opencode.db-shm`
3. `opencode.db-wal`

说明更像是上一次异常退出后，SQLite WAL 状态未正确收束，而不是当前仍有活进程占锁。

## 安全恢复步骤

1. 先确认没有遗留进程：

```bash
ps aux | rg opencode
```

2. 再检查是否有进程仍占着 db 文件：

```bash
lsof ~/.local/share/opencode/opencode.db*
```

3. 如果无人占用，执行安全 checkpoint：

```bash
sqlite3 ~/.local/share/opencode/opencode.db 'pragma wal_checkpoint(full);'
```

本次返回值是：

```text
0|0|0
```

4. 用非交互命令确认数据库已恢复可读：

```bash
opencode stats
```

本次 `opencode stats` 已成功输出 overview/cost/tool usage，证明数据库锁已解除。

## 不要做什么

1. 不要上来就删 `opencode.db`
2. 不要在未确认进程状态时强删 `-wal` / `-shm`
3. 不要把“数据库锁”误判成 provider 或模型配置问题

## 规则沉淀

见 `rules.md` 第 122 条。
