# 2026-04-10 GoldenCrucible-Roundtable Bootstrap Plan

## Register

1. 项目名：`GoldenCrucible-Roundtable`
2. 绝对路径：`/Users/luzhoua/MHSDC/GoldenCrucible-Roundtable`
3. 作用域层级：`S1`
4. 上层入口：`/Users/luzhoua/MHSDC/AGENTS.md`
5. 触发方式：`script`

## Bootstrap Scope

本次只创建最小治理骨架，不直接推进业务实现。

当前已覆盖：

1. 仓级入口
2. 交接入口
3. 第一份 bootstrap plan
4. 规则文件
5. 测试协议入口

## 项目定位

- 当前主线目标：构建圆桌讨论（Roundtable）模块，支持多角色多视角的对话沙盘能力
- 当前非目标：不在此仓做 SaaS 业务逻辑，不处理 DeliveryConsole 视频生产管线
- 生命周期阶段：`Initiation`
- 是否纳入当前治理 rollout：是
- 后续注意：本项目后续可能和 GoldenCrucible-SaaS 合并，架构设计需预留合并接口

## CE / gstack 路由

| 场景 | 路由 |
|---|---|
| 需求模糊、边界未定 | `ce-brainstorm` |
| 需要完整方案 | `ce-plan` |
| 方案已确认、进入实施 | `ce-work` |
| 日常审查 / PR review | `ce-review` |
| 经验沉淀 | `ce-compound` |
| 架构挑战、pre-landing 审查、真实 QA | `gstack` |

## 待补齐

1. ~当前主线目标~ ✅
2. ~当前非目标~ ✅
3. ~生命周期阶段确认~ ✅ Initiation
4. ~是否纳入当前治理 rollout~ ✅ 是
5. 是否需要模块级 testing README — 待后续确认具体模块后补

## Validate Checklist

- [x] `AGENTS.md` 可读
- [x] `HANDOFF.md` 可读
- [x] bootstrap plan 可读
- [x] 规则文件已存在
- [x] 测试协议入口已存在
- [x] 已写出下一窗口直接怎么做
