# L-020 - OpenCode 的 Agent Browser 需要 skill + CLI + Chrome 三件套

## 现象

用户已经在 OpenCode 里安装了 `agent-browser` skill，但执行端仍然没有真正走到这条链路，而是退回到了别的浏览器方案。

## 根因

最初只有 skill 文件存在：

1. `~/.opencode/skills/agent-browser/SKILL.md`

但机器上并没有：

1. `agent-browser` CLI
2. `agent-browser install` 下载的 Chrome 二进制

所以执行端虽然“知道有这个 skill”，却无法真正调用其要求的命令。

## 本次修复

1. 安装 `agent-browser` CLI：

```bash
npm install -g agent-browser
```

2. 安装浏览器二进制：

```bash
agent-browser install
```

3. 用最小烟雾验证确认链路可用：

```bash
agent-browser open http://localhost:5178
agent-browser wait --load networkidle
agent-browser get title
agent-browser screenshot testing/director/artifacts/agent-browser-smoke.png
```

本次已成功打开本地应用、读取标题 `deliver`，并生成烟雾截图。

## 规则沉淀

见 `rules.md` 第 124 条。
