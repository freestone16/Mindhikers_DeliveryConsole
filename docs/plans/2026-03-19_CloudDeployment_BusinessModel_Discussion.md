# 2026-03-19 云端部署与商业模式讨论纪要

**日期**：2026-03-19
**参与方**：老卢 + 老杨
**主题**：黄金坩埚云端部署方案、产品形态、商业模式

---

## 一、讨论背景

在完成本地版黄金坩埚（GoldenCrucible）的核心功能开发后，发起了关于"如果这套东西部署到云端，需要考虑哪些修改因素"的讨论。老卢提出的最初问题包括：

1. 账号系统（多用户认证）
2. Skill 同步方法在云端是否需要改变

讨论逐步深入到产品形态与商业模式的根本性问题。

---

## 二、核心判断：SaaS 是展示橱窗，不是收银台

**老卢的核心观点**：

> "短期计划肯定是 SaaS 部署，但这并不是业务模式的主线，这是个没落的模式。SaaS 部署后顶多应该是功能演示为主，承载业务赚钱比较难。"

**老杨认可**：Web SaaS 做出来最多是个**展厅**，不是**收银台**。SaaS 订阅衰退的本质原因：AI 正在消解"功能堆叠 = 价值"的逻辑，用户为"访问权"付费的意愿在下降。

---

## 三、黄金坩埚的真正护城河

经讨论确认，黄金坩埚的核心价值不是 UI，而是：

- **技能编排图谱**：Socrates 怎么提问、Writer 怎么接棒、FactChecker 怎么卡质量门
- 这套工作流是经过大量时间打磨的**领域知识资产**
- UI 是可替换的，编排逻辑是不可轻易复制的

---

## 四、产品聚焦决策

讨论中一度涉及 Director Phase 1→4 视频制作链路的云端化，以及"单次 API 调用"（POST /api/crucible/run）的可能性。但**老卢明确决策**：

> "做后续的视频剪辑等过程，沉淀出产品过程太长了，我们还是要聚焦到黄金坩埚这里，看看一次深度的讨论和论文甚至文案的沉淀，怎样让用户付费。"

**聚焦方向**：对谈链路（Socrates ↔ 用户 → Writer → FactChecker），而非 Director/Remotion 视频制作链路。

---

## 五、MindHikers 人治哲学 ⭐ 重要

老卢提出了本次讨论最核心的产品哲学：

> "MindHikers 的哲学理念是人治，而不是 AI 治理。我们或许可以通过一定次数的人治之后，训练出用户的 soul 和 taste，让用户可以减少干预点，但仍能取得相近的效果。而且这个干预点是可以随用户喜好增减的，交付过程也是可审计的。"

### 5.1 这套机制拆解成三个组件

**1. Soul Profile（用户品味画像）**

- 前 N 次人工干预时，系统沉淀的不只是"用户选了什么"，而是"用户为什么这样选"
- 例：Phase 1 生成 3 个视觉概念，用户选了第 2 个 → 系统提取：偏好纪实质感、冷色调、信息留白
- 逐次积累，逐次修正，形成 **taste vector**
- 对应现有 Linear 任务：MIN-46（Foreground Souls）的反向应用（不是给 AI 注入灵魂，而是从用户行为中提取灵魂）

**2. Confidence Gate（置信度门控）**

- 每个决策点有置信度评分：
  - `置信度高（> 80%）` → 自动决策，事后可审
  - `置信度中（50-80%）` → 推荐方案，等用户确认
  - `置信度低（< 50% 或全新领域）` → 完全人工
- 用户可随时调节任意阶段的干预意愿
- 对应现有 Linear 任务：MIN-45（Runtime Skeleton / TurnDirector）

**3. Audit Trail（可审计交付链）**

- 每个决策点，不管是人做的还是 AI 做的，全部留痕
- 格式示例：
  ```
  [Phase1] 概念选择 → AI自决（置信度92%）→ 选了方案B → 理由：匹配用户偏好"纪实+冷调"
  [Phase2] Ch3 B-roll → 人工干预 → 用户改选方案A → 理由：用户备注"需要更强情绪冲击"
  ```
- 用户随时可回溯完整决策链路
- 对应现有 Linear 任务：MIN-50（Trace / Evidence / Eval）

### 5.2 难度评估

老卢自评："操！这个难度有点大！"

老杨分析：难度不在单个机制（每块都有雏形），**难在三个机制的闭环**：

```
用户干预 → 沉淀到 Soul Profile → 提升 Confidence Gate 准确度
    → 减少下次干预 → 干预时又修正 Profile → 在线学习循环
```

**降低难度的策略**：第一版 Soul Profile 用基于规则的偏好标签（JSON 权重 + 衰减算法），不需要机器学习模型。数据量上来了再考虑升级。

```json
{
  "visual_style": { "documentary": 0.8, "animation": 0.2 },
  "color_tone": { "cold": 0.7, "warm": 0.3 },
  "information_density": { "minimal": 0.6, "dense": 0.4 },
  "confidence_threshold": 0.75
}
```

---

## 六、商业模式讨论

### 6.1 用户付费意愿分析

深度自媒体创作者愿意付费的不是"一个月的访问权"，而是：

> **"帮我把这个选题变成一个有深度的讨论、论文或文案"** — 这是一个**结果**

### 6.2 三种收费模型

**模型 A：按锻造次数（推荐入口模式）**

- 一次完整的坩埚锻造（Socrates 深度对谈 → Writer 成文 → FactChecker 核查）作为计价单位
- 价值感知具象：用户知道"我花 X 元得到了一篇有据可查的深度论文"
- 免费层：单技能调用（单独用 Socrates 聊天）
- 付费层：完整编排链

**模型 B：按对谈深度（按 Token 阶梯）**

- 简单对话免费，深度研究型对谈（多轮 Socrates + FactChecker 核查）付费
- 问题：用户难以预判费用，体验不佳

**模型 C：Soul 积累 + 置信度提升（终态模式）**

- 初期完全人工干预
- 随着 Soul Profile 成熟，AI 自动完成更多决策
- 用户为"减少自己工作量的 AI 配合度"付费
- 这是上述"人治哲学"的商业化表达

**老卢认可**：B 做入口、C 做终态。

---

## 七、云端基础设施方案

### 7.1 聚焦范围（重要约束）

云端要部署的**只有坩埚对谈链路**，Director/Shorts/Music/Thumbnail/Remotion 渲染**全部不上云**。这砍掉了 80% 的部署复杂度。

需要上云的组件：
- Socrates、Writer、FactChecker 三个 Skill
- LLM 调用转发层
- Soul Profile 持久化
- 对谈记录 + 审计链

不上云的组件：
- Director Phase 1-4
- Remotion 渲染
- GoldenCrucible 本地全功能版本（继续作为开发工具）

### 7.2 数据库最小集（三张表）

```sql
-- 用户表
users (id, email, name, auth_provider, subscription_tier, created_at)

-- 品味画像
soul_profiles (id, user_id, taste_vector JSONB, interaction_count, updated_at)

-- 会话记录
sessions (id, user_id, type, messages JSONB, artifacts JSONB, audit_trail JSONB, created_at, completed_at)
```

PostgreSQL 单库，不需要 MongoDB 或 Redis（除非 Socket.IO 多实例）。

### 7.3 Skill 部署方式

对谈链路只涉及 3 个 Skill：Socrates、Writer、FactChecker（Researcher 按需）。**直接打包进 Docker 镜像**，删掉 skill-sync 机制。Skill 更新 = 发新镜像版本。

### 7.4 平台选型讨论

**Vercel 的局限**：
- 不原生支持 WebSocket（Socket.IO 无法直接用）
- Serverless 函数超时：Free 10 秒 / Pro 60 秒，LLM 流式回复经常超
- 需要将 Socket.IO 改为 SSE（Server-Sent Events）

**Vercel 的优势**：
- 前端/Next.js 部署极佳
- 品牌 homepage 天然适合
- Pro $20/月含 Postgres + 300 秒超时

**Railway 的优势**：
- 原生支持持久 Node.js 进程 + WebSocket
- 现有 Express 代码可直接复用，改造量小
- PostgreSQL 内置
- $5-20/月

**MindHikers 站点全局规划**：

| 产品 | 性质 |
|---|---|
| Homepage (mindhikers.com) | 品牌落地页，静态为主 |
| Crucible SaaS (app.mindhikers.com) | 对谈 + 锻造，核心产品 |
| GoldenCrucible 本地版 | 开发工具，不上云 |

**方案 A（全 Vercel）**：
```
Vercel
├── mindhikers.com        ← Homepage（Free）
└── app.mindhikers.com    ← Crucible SaaS（Pro $20/月，改 SSE）
    └── Vercel Postgres   ← 含在 Pro 内
```

**方案 B（Vercel + Railway）**：
```
Vercel
└── mindhikers.com        ← Homepage（Free）

Railway
└── app.mindhikers.com    ← Crucible SaaS（Express 直接复用，$5-20/月）
    └── PostgreSQL        ← 含在内
```

**当前阶段决策**：Crucible SaaS 是功能展示橱窗，可先不加数据库和登录，访客直接体验对谈，验证用户兴趣后再加 auth + PG + 付费。

### 7.5 展示橱窗阶段的 Vercel Free 可行性

- Free 限制 10 秒超时，LLM 回复通常 15-40 秒 → **会断流**
- 取巧方案：限制 Socrates 每轮回复长度，控制在 10 秒内完成 → Free 能跑，体验略打折
- 等正式收费再升级 Pro $20/月

---

## 八、产品路线建议（老杨综合建议）

**分三阶段**：

### 第一阶段（现在 → 3 个月）：MCP Server + 展示橱窗

- 把 Orchestrator 暴露为 MCP tools（Socrates/Writer/FactChecker）
- 任何支持 MCP 的客户端（Claude Code、Cursor）直接可用
- Web 版作为功能演示，不收费，积累种子用户
- 技术改动最小，不需要完整账号系统

### 第二阶段（3-6 个月）：Web UI + 编排信用计费

- Web UI 服务非技术创作者
- 按锻造次数计费（模型 A）上线
- 账号系统、Soul Profile 持久化
- 云端部署正式化（Vercel Pro 或 Railway）

### 第三阶段（长期）：Soul 积累 + 技能包市场

- Soul Profile 成熟，Confidence Gate 上线
- 允许创作者上传和售卖自己的 Skill
- 黄金坩埚变成**创作方法论的交易平台**

---

## 九、待确认事项

- [ ] 平台最终选型：全 Vercel（需改 SSE）还是 Vercel + Railway（Express 复用）
- [ ] 展示橱窗阶段是否做 MCP Server 并行推进
- [ ] crucible-core 独立仓库的时间点
- [ ] Soul Profile 第一版规格（规则权重 or 简单 ML）
- [ ] MindHikers Homepage 现有状态与重建计划

---

## 十、关键决策记录

| 决策 | 结论 | 理由 |
|---|---|---|
| SaaS 定位 | 功能展示橱窗，非主要收入来源 | SaaS 是没落模式，赚钱难 |
| 产品聚焦 | 对谈 + 论文/文案沉淀，不做视频制作链路 | 视频制作上云路径太长 |
| 人治哲学 | 保留人工干预点，AI 辅助但不替代判断 | MindHikers 核心价值观 |
| 收费模型 | B 做入口（按锻造次数）+ C 做终态（Soul 积累） | 和用户价值感知对齐 |
| 护城河 | 技能编排图谱，不是 UI | UI 可替换，方法论不可复制 |

---

*记录人：老杨*
*文档状态：会议纪要（待进一步细化为设计文档）*
*下一步：根据确认的平台选型，推进 crucible-core 设计文档*
