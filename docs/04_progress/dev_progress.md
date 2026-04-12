# Development Progress - GoldenCrucible-Roundtable

> **Project**: GoldenCrucible-Roundtable  
> **Current Phase**: Unit 5 Complete - Spike → 深聊桥接  
> **Last Updated**: 2026-04-12

---

## 里程碑记录

### Unit 1: PersonaProfile 契约 + Loader + 7 哲人 ✅

**完成日期**: 2026-04-10  
**Commit**: `5e021fa`  
**分支**: `feat/unit1-persona-profile`

**交付物**:

| 组件 | 文件路径 | 状态 |
|------|----------|------|
| V2.1 方案文档 | `docs/plans/2026-04-10_unit1-persona-profile-v2.1.md` | ✅ |
| Zod Schema | `src/schemas/persona.ts` | ✅ |
| Persona Loader | `server/persona-loader.ts` | ✅ |
| 7 哲人配置 | `personas/*.json` | ✅ |
| Loader 测试 | `server/__tests__/persona-loader.test.ts` | ✅ (7 passing) |

**关键决策**:

- **Persona 目录**: `personas/`（仓根）— 便于运营编辑和摘樱桃
- **热插拔策略**: 按需重读（无缓存、无 watch）— 满足 Unit 1 需求，后续可升级
- **Schema 设计**: 身份 + 认知定位 + 立场向量 + 发言规则 + 对比锚点 + 诚实边界

**7 哲人名单**:

1. 苏格拉底（🏛️）— 诘问式追问，无知之知
2. 尼采（⚡）— 权力意志，重估价值
3. 王阳明（🌿）— 知行合一，致良知
4. 汉娜·阿伦特（🔦）— 平庸之恶，制度分析
5. 查理·芒格（🧠）— 多元思维，逆向思考
6. 理查德·费曼（🔬）— 构建即理解，反 cargo cult
7. 赫伯特·西蒙（🎯）— 有限理性，满意原则

---

### Unit 2: 命题锐化模块 (Proposition Sharpener) ✅

**完成日期**: 2026-04-10  
**Commit**: `983e86e`  
**分支**: `feat/unit1-persona-profile`

**交付物**:

| 组件 | 文件路径 | 状态 |
|------|----------|------|
| V2.1 方案文档 | `docs/plans/2026-04-10_unit2-proposition-sharpener-v2.1.md` | ✅ |
| LLM 分层路由 | `server/llm.ts` 扩展 | ✅ |
| 锐化逻辑 | `server/proposition-sharpener.ts` | ✅ |
| API 端点 | `server/index.ts` - POST /api/roundtable/sharpen | ✅ |
| 测试 | `server/__tests__/proposition-sharpener.test.ts` | ✅ (17 passing) |

**关键决策**:

- **模型选择**: kimi-k2.5（v2.1 锁定）— 速度快、成本低
- **Temperature**: 固定为 1（kimi-k2.5 限制）— 通过 prompt engineering 控制确定性
- **API 契约**: SharpenResult `{ isSharp, sharpened?, clarifyingQuestions?, reasoning? }`
- **降级策略**: LLM 失败或校验失败时返回 isSharp=true，不阻塞用户

**API 端点**:

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/roundtable/sharpen` | POST | 检测并锐化命题 |
| `/api/roundtable/sharpen/apply` | POST | 应用锐化结果 |

---

### Unit 3: 圆桌引擎核心 (Roundtable Engine) ✅

**完成日期**: 2026-04-12  
**Commit**: `e891067`  
**分支**: `MHSDC-GC-RT`  
**Linear Issue**: MIN-114

**交付物**:

| 组件 | 文件路径 | 状态 |
|------|----------|------|
| 方案文档 | `docs/plans/2026-04-11_unit3-roundtable-engine.md` | ✅ |
| 类型定义 | `server/roundtable-types.ts` | ✅ |
| 压缩配置 | `server/compression-config.ts` | ✅ |
| 引擎核心 | `server/roundtable-engine.ts` | ✅ |
| Skill Loader | `server/skill-loader.ts` | ✅ |
| SSE 端点 | `server/index.ts` - turn/stream / director / session | ✅ |
| 测试 | `server/__tests__/roundtable-engine.test.ts` | ✅ |

**关键决策**:

- **Speaker Selection**: 角色按顺序轮转 + 导演可干预
- **Moderator**: 可选角色（proposition 阶段才激活）
- **Context 压缩**: L0/L1/L2 三档（Kimi/GPT/Opus 分别适配）
- **SSE 流式输出**: 两阶段 chunk + meta
- **导演指令**: 继续/暂停/止/加人/踢人/改顺序

---

### Unit 4: Spike 提取 + 持久化 ✅

**完成日期**: 2026-04-12  
**Commit**: 待提交（refs MIN-115）  
**分支**: `MHSDC-GC-RT`  
**Linear Issue**: MIN-115

**交付物**:

| 组件 | 文件路径 | 状态 |
|------|----------|------|
| 方案文档 | `docs/plans/2026-04-11_unit4-spike-extractor-persistence.md` | ✅ |
| Spike 提取器 | `server/spike-extractor.ts` (298 行) | ✅ |
| Spike 富类型 | `server/roundtable-types.ts` 扩展 | ✅ |
| 持久化扩展 | `server/crucible-persistence.ts` | ✅ |
| 导演"止"链路 | `server/roundtable-engine.ts` + `server/index.ts` | ✅ |
| 提取器单测 | `server/__tests__/spike-extractor.test.ts` (5 用例) | ✅ |
| 持久化单测 | `server/__tests__/crucible-persistence.test.ts` | ✅ |
| 导演指令测试 | `server/__tests__/roundtable-engine.test.ts` 扩展 | ✅ |
| Auth stubs | `server/auth/index.ts` + `server/auth/workspace-store.ts` | ✅ |

**关键决策**:

- **Spike 富类型**: 在原 5 字段基础上新增 title/summary/bridgeHint/sourceTurnIds/tensionLevel/isFallback
- **提取策略**: 三段式 — 规则初筛 → LLM 精炼 → 规则兜底
- **持久化方式**: 并入现有 artifact 主干（不新建存储体系），CrucibleConversationArtifact.type 联合类型添加 `'spike'`
- **导演"止"链路**: 混合方案 — index.ts 注入 persistence context → engine 内执行提取+持久化+返回 DirectorStopResult

**变更统计**: 10 files, +794/-31 lines, 41 tests passed (净增 11)

---

## 下一阶段

### Unit 6: 前端侧边栏 + 导演 UI ⏳

**目标**: 前端侧边栏 UI + 导演控制面板

**Linear Issue**: MIN-117

---

## 项目健康度

| 指标 | 状态 | 备注 |
|------|------|------|
| TypeScript | ✅ 零错误 | `typecheck:full` 通过 |
| 测试 | ✅ 49 passing, 2 skipped | Unit 1-5 累计 |
| 构建 | ✅ 干净 | 无警告 |
| Git | ✅ `MHSDC-GC-RT` | Unit 5 已推送 `7ac605f` |

---

## 技术债务

- [ ] `server/auth/` — 目前仅 stub，需在 Unit 6/7 补充真实实现
- [ ] Spike LLM 精炼的 prompt 可后续迭代优化

## 风险登记

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 7 哲人差异不足 | 低 | 后续通过实际 prompt dump 验证 |
| kimi-k2.5 temperature=1 | 中 | 通过 prompt engineering 补偿确定性 |
| Spike 提取质量 | 中 | 规则兜底保证基础质量，LLM 精炼为增量提升 |

---

*按 OldYang 三层日志协议维护*  
*上层入口: `/Users/luzhoua/MHSDC/AGENTS.md`*
