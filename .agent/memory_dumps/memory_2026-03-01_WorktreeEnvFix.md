# Memory Dump: DeliveryConsole (Worktree环境修复 2026-03-01)

**Date**: 2026-03-01
**Session**: 嵌套 Worktree 路径修复 + Phase2 进度计数修正

---

## 🧠 核心知识：嵌套 Worktree 结构

DeliveryConsole 使用 Claude Code 的双层嵌套 worktree：

```
/Users/luzhoua/DeliveryConsole/              ← main repo (main branch)
└── .claude/worktrees/laughing-maxwell/      ← worktree 1
    └── .claude/worktrees/funny-euclid/      ← worktree 2 ← 实际运行目录
```

**关键规则**：
- 临时工作时编辑 funny-euclid（当前 session 工作目录）
- 完成后合并到 main (`/Users/luzhoua/DeliveryConsole`)
- `.env` 在 `.gitignore` 中，每个 worktree 需独立创建

---

## 🔑 环境变量关键路径

```bash
# /Users/luzhoua/DeliveryConsole/.env（主 repo）
# 也需要在运行的 worktree 根目录创建同名 .env

PROJECTS_BASE=/Users/luzhoua/Mylife_lawrence/Obsidian_Antigravity/Projects/MindHikers/Projects
SKILLS_BASE=./skills
SILICONFLOW_API_KEY=...
DEEPSEEK_API_KEY=...
KIMI_API_KEY=...
```

**dotenv 加载路径**（server/index.ts）：
```typescript
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// __dirname = .../funny-euclid/server/
// ../ = .../funny-euclid/  ✅
```

---

## 🛠 skill-sync 修复要点

`skill-sync.ts` 的 SOURCE_ROOT 必须用懒加载函数（模块顶层 env 读取太早）：

```typescript
const getSourceRoot = () => {
    if (process.env.SKILLS_BASE) {
        return path.isAbsolute(process.env.SKILLS_BASE)
            ? process.env.SKILLS_BASE
            : path.resolve(__dirname, '..', process.env.SKILLS_BASE);
    }
    return path.resolve(__dirname, '..', 'skills');
};
```

当 source === target 时直接返回（SKILLS_BASE=./skills，路径解析后与 TARGET_ROOT 相同）。

---

## 📊 Phase2 进度计数（正确版本）

**main 分支当前实现**（正确）：
- `totalSteps` 在全局计划生成后动态计算（所有章节 options 总数之和）
- `currentOptionsCount` 累加追踪实际进度
- 显示格式：`已完成 N/7 章 (M/K 个方案)`

**踩过的坑**：
- 旧版有 `* 3` 残留（每章3次LLM调用时代的遗产）
- `totalSteps = parsedChapters.length * 3` → 7*3=21（错误）
- main 分支已修正为动态计数

---

## 🎯 当前待办（下次 session 继续）

1. **Phase 2 全流程测试**：选真实项目跑 Phase2，验证进度显示+方案生成
2. **Remotion 新组件验收**：TextReveal/NumberCounter/ComparisonSplit/TimelineFlow 缩略图
3. **SD-202 Phase 3**：渲染管线与时间线编织

---

## 📂 关键文件速查

| 文件 | 作用 |
|------|------|
| `server/index.ts` | dotenv路径: `../'.env'` |
| `server/skill-sync.ts` | 懒加载 getSourceRoot() |
| `server/director.ts` | Phase2 startPhase2(), generateThumbnail() |
| `server/remotion-api-renderer.ts` | `--props` 参数, `--frame=75`, 本地bin |
| `server/llm.ts` | generateGlobalBRollPlan() + schema validator |
| `src/components/director/ChapterCard.tsx` | 缩略图手动触发（非自动） |
