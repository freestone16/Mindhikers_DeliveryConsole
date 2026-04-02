# Codex AI - Delivery Console 项目工作流契约

> **项目级 AI 开发约定**
> **最后更新**：2026-03-03

---

## Workflow Orchestration - 工作流编排

### 1. Plan Node Default（计划优先）

**规则**：
- ✅ 对于任何**非平凡任务**（3+ 步骤或涉及架构决策），必须使用 `EnterPlanMode`
- ✅ 如果事情偏离预期，**立即停止并重新规划**，不要强行推进
- ✅ 计划模式不仅用于构建，也用于验证步骤
- ✅ 前置写出详细规格说明，减少模糊性

**Delivery Console 应用**：
- 新增 Director Phase 功能 → 计划模式
- 修复复杂 bug（涉及多个模块）→ 计划模式
- Remotion 模板升级 → 计划模式
- 简单的单文件修复 → 直接执行（跳过计划）

---

### 2. Subagent Strategy（子代理策略）

**规则**：
- ✅ **广泛使用子代理**，保持主上下文窗口清洁
- ✅ 将研究、探索和并行分析卸载给子代理
- ✅ 复杂问题通过子代理投入更多算力
- ✅ 每个子代理专注一个任务方向

**Delivery Console 应用**：
- 代码库探索 → 使用 `Explore` 子代理
- 跨模块搜索 → 使用 `general-purpose` 子代理
- 并行任务优化 → 同时启动多个子代理

---

### 3. Self-Improvement Loop（自我改进循环）⭐ 核心

**规则**：
- ✅ **任何用户纠正后**：立即更新 `docs/04_progress/rules.md` 或 `lessons/` 记录模式
- ✅ **写出防止重复错误的规则**：为未来的自己制定规则
- ✅ **无情的迭代**：不断优化这些规则，直到错误率下降
- ✅ **会话开始时审查**：每次会话开始时读取 `rules.md`

**Delivery Console 应用**：
```
用户纠正示例：
用户："这里的进度计算有问题，应该用实际生成的方案数而不是固定的章节数×3"
我的动作：
1. 立即修复 bug
2. 分析根本原因（为什么写死了21）
3. 写入 rules.md（精炼规则）
4. 如需详细案例，写入 lessons/L-XXX.md
```

**Lessons 文件结构**：
- `docs/04_progress/rules.md` - 精炼规则（80条，每次会话必读）
- `docs/04_progress/lessons/` - 详细案例（按需搜索）
- `docs/04_progress/lessons-index.md` - 案例索引

---

### 4. Verification Before Done（完成前验证）

**规则**：
- ✅ **证明工作有效后**才标记任务完成
- ✅ 对比行为差异（主分支 vs 你的修改）
- ✅ 问自己："高级工程师会批准这个吗？"
- ✅ 运行测试、检查日志、演示正确性

**Delivery Console 应用**：
- Phase API 修复 → 调用 API 验证返回结果
- 前端组件修改 → 手动测试 UI 交互
- Bug 修复 → 重现问题场景验证已修复
- **技能触发**：使用 `verification-before-completion` skill

---

### 5. Demand Elegance (Balanced)（追求优雅，适度）

**规则**：
- ✅ **非平凡改动**：暂停并问"有更优雅的方式吗？"
- ✅ **修复感觉很 hacky**："现在知道了所有信息，实现优雅方案"
- ✅ **跳过简单明显的修复**：不要过度设计
- ✅ **提交前挑战自己的工作**

**Delivery Console 应用**：
- 临时补丁 → 重新审视是否需要重构
- 代码重复 → 提取公共函数/组件
- 简单 typo 修复 → 直接改，不过度设计

---

### 6. Autonomous Bug Fixing（自主修复 Bug）

**规则**：
- ✅ **收到 bug 报告时：直接修复**，不要手把手求助
- ✅ 指向日志、错误、失败的测试 → 然后解决它们
- ✅ 零上下文切换需求
- ✅ 修复失败的 CI 测试，不需要被告知如何修复

**Delivery Console 应用**：
- "Phase2 进度显示固定为 21" → 分析代码、动态计算、验证
- "预览图质量差" → 调查 Remotion 参数、优化配置、测试
- **技能触发**：使用 `systematic-debugging` skill

---

## Task Management - 任务管理

### Delivery Console 适配版

1. **Plan First**：复杂任务 → 使用 `EnterPlanMode` + `TodoWrite` 创建待办
2. **Verify Plan**：向用户确认计划后再开始实施
3. **Track Progress**：执行过程中使用 `TodoWrite` 标记进度
4. **Explain Changes**：每步提供高层级总结
5. **Document Results**：完成后更新 `docs/04_progress/dev_progress.md`
6. **Capture Lessons**：任何纠正后更新 `docs/04_progress/rules.md`

---

## Core Principles - 核心原则

### 1. Simplicity First（简单优先）
- **规则**：让每个改动尽可能简单，影响最小代码
- **Delivery Console 应用**：
  - 优先使用现有的组件和工具
  - 避免引入新的依赖库
  - 代码改动范围控制在最小

### 2. No Laziness（不懒惰）
- **规则**：找到根本原因，不做临时修复，高级工程师标准
- **Delivery Console 应用**：
  - 不要只修表面现象，要挖根因
  - 不要用 `// TODO: fix later`，现在就修好
  - 参考项目已有的高质量代码模式

### 3. Minimal Impact（最小影响）
- **规则**：改动只触达必要部分，避免引入 bug
- **Delivery Console 应用**：
  - 修改 API 时不破坏现有调用者
  - 前端改动不影响其他页面
  - 重构时保持对外接口不变

---

## Delivery Console 特定约定

### Remotion 工作流
- 生成预览图必须使用正确的帧率、分辨率参数
- 文字排版遵循红线守则
- 预览图生成失败时必须增强日志输出

### Director Phase 开发
- Phase API 变更必须更新对应的前端组件
- 进度条必须反映真实进度，不要写死
- LLM prompt 优化后要测试边界情况

### 多项目架构
- API 必须支持运行时热切换项目
- 环境变量 `PROJECTS_BASE` 不能硬编码
- 前端项目选择器必须实时响应切换

### 文档协议
- **自动触发**：提及"修复"/"完成"/"记录"/"设计方案"时自动保存文档
- **显式强制**：用户说"老杨，保存"时立即执行文档保存
- **文档位置**：
  - 开发进度 → `docs/04_progress/dev_progress.md`
  - 精炼规则 → `docs/04_progress/rules.md`（每次会话必读）
  - 详细案例 → `docs/04_progress/lessons/`（按需搜索）
  - 设计方案 → `docs/02_design/[模块名].md`

---

## 技能（Skills）触发规则

| 场景 | 触发技能 |
|---|---|
| 修复 bug/测试失败 | `systematic-debugging` |
| 完成工作前的验证 | `verification-before-completion` |
| 代码审查 | `requesting-code-review` |
| 创意工作前 | `brainstorming` |
| 实施多步骤任务 | `subagent-driven-development` |
| 简化优化代码 | `simplify` |
| Remotion 开发 | `remotion-best-practices` |
| Remotion 视觉质量检查 | `remotion-visual-qa` |

---

## 快速参考

### 何时使用 EnterPlanMode？
- ✅ 新功能开发（3+ 文件）
- ✅ 架构性改动
- ✅ 跨模块重构
- ✅ 复杂 bug 修复
- ❌ 单行修复
- ❌ 简单文本修改

### 何时写入 rules.md？
- ✅ 用户明确纠正错误
- ✅ 发现系统性问题模式
- ✅ 代码审查中指出问题
- ✅ 重复出现的错误类型
- 详细案例写入 `lessons/L-XXX.md`

### 何时使用 TodoWrite？
- ✅ 3+ 步骤的任务
- ✅ 需要追踪进度的复杂任务
- ❌ 单行修复
- ❌ 简单查询

---

## 📚 文档体系

```
DeliveryConsole/
├── AGENTS.md                     # 本文件 - AI 工作流契约
├── README.md                     # 项目说明
├── RELOCATION.md                 # 迁移记录
└── docs/
    ├── 00_architecture/          # 架构文档
    ├── 01_philosophy/            # 理念文档
    ├── 02_design/                # 设计文档
    ├── 03_ui/                    # UI 设计稿
    ├── 04_progress/
    │   ├── dev_progress.md       # 开发进度
    │   ├── rules.md              # 精炼规则 ⭐（每次会话必读）
    │   ├── lessons/              # 详细案例（按需搜索）
    │   └── lessons-index.md      # 案例索引
    ├── dev_logs/                 # 开发日志
    └── plans/                    # 计划文档
```

---

## 🚀 会话启动检查清单

每次新会话开始时，检查：

- [ ] 阅读 `docs/04_progress/rules.md`（80条精炼规则）
- [ ] 如需详细案例，搜索 `docs/04_progress/lessons/`
- [ ] 检查 `docs/04_progress/dev_progress.md` 最新状态
- [ ] 回顾当前任务相关的核心原则
- [ ] 确认是否需要使用技能（Skills）

---

**记住**：Rules 是防止重复犯错的最重要机制，务必重视！
