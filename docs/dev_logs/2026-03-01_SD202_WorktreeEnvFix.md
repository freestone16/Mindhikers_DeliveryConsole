# Dev Log: SD-202 Worktree 环境修复 + Phase2 进度计数修正

**日期**: 2026-03-01
**Branch**: claude/funny-euclid → merged to main
**状态**: ✅ 已合并

---

## 本次会话核心成果

### 根本问题：嵌套 Worktree 路径混乱

DeliveryConsole 在 Claude Code worktree 环境下出现严重路径问题：

```
/Users/luzhoua/DeliveryConsole/              ← main repo
└── .claude/worktrees/laughing-maxwell/      ← worktree 1 (claude/laughing-maxwell)
    └── .claude/worktrees/funny-euclid/      ← worktree 2 (claude/funny-euclid) ← 实际运行位置
```

后端从 `funny-euclid` 启动，但 `dotenv.config({ path: '../../.env' })` 指向错误位置，导致所有环境变量加载失败。

---

## ✅ 修复清单

### 1. `.env` 文件创建（funny-euclid worktree）
- **文件**: `funny-euclid/.env`（在 .gitignore 中，需每个 worktree 独立创建）
- **内容**: PROJECTS_BASE、SKILLS_BASE、API Keys（SILICONFLOW/DEEPSEEK/KIMI）
- **正确的 PROJECTS_BASE**: `/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects`

### 2. dotenv 路径修复
- **文件**: `server/index.ts`
- **问题**: `../../.env`（从嵌套 server/ 目录出发，跳两级）
- **修复**: `../.env`（跳一级到 worktree 根目录）

### 3. skill-sync 路径懒加载
- **文件**: `server/skill-sync.ts`
- **问题**: `SOURCE_ROOT` 在模块顶层求值，dotenv 尚未加载
- **修复**: 改为 `getSourceRoot()` 懒加载函数，`syncSkills()` 调用时才读取 env
- **新增**: source===target 短路逻辑（同目录时直接统计，避免 EINVAL 拷贝错误）
- **新增**: source 不存在时降级使用本地 skills 目录

### 4. Phase2 进度计数 `* 3` 残留修正
- **文件**: `server/director.ts`
- **问题**: `totalSteps = parsedChapters.length * 3` 是旧版每章3次LLM调用的残留
- **main 分支版本**: 用 `currentOptionsCount` 动态追踪实际生成的方案总数（更精确）
- **结果**: 进度从 `0/21` 改为准确的 `0/N`（N=实际方案总数，AI自决）

### 5. Claude Code Statusline 升级
- **文件**: `~/.claude/settings.json`
- **升级**: 加入颜色进度条 + 压缩预警（75%=⚡接近上限，90%=⚠️压缩即将触发）

---

## 📊 修复后系统状态

| 组件 | 状态 |
|------|------|
| 后端启动 | ✅ 端口 3002 |
| dotenv 加载 | ✅ PROJECTS_BASE 正确 |
| 项目列表 | ✅ 6个项目（Obsidian vault） |
| Skills Sync | ✅ 5/5 (Director/MusicDirector/ThumbnailMaster/ShortsMaster/MarketingMaster) |
| Phase 1 | ✅ 可正常调用 LLM |
| Phase 2 进度显示 | ✅ 修正为实际章节/方案数 |

---

## 🔍 关键诊断结论

**并发 Remotion 崩溃问题**（上次遗留）：
- 缩略图生成是**手动触发**（每个 OptionRow 的"生成预览"按钮）
- Phase2 B-roll 方案生成本身是**单次全局 LLM 调用**，不并发渲染
- 之前诊断的"21并发Remotion"可能是在旧版本（每章独立LLM+渲染）中发生
- 当前版本无此问题

---

## 📂 涉及文件

```
DeliveryConsole/
├── server/
│   ├── index.ts          ← dotenv 路径修复（../.env）
│   └── skill-sync.ts     ← 懒加载 + source=target 兼容
├── docs/dev_logs/
│   └── 2026-03-01_SD202_WorktreeEnvFix.md

~/.claude/
└── settings.json         ← Statusline 进度条升级
```

---

## 🎯 下一步

1. **Phase 2 实测验证**: 选一个真实项目跑完整 Phase2 流程，验证方案生成+进度显示
2. **Remotion 新组件验收**: TextReveal/NumberCounter/ComparisonSplit/TimelineFlow 缩略图生成测试
3. **SD-202 Phase 3**: 渲染管线与时间线编织
