# 📊 DeliveryConsole 项目状态板

> 最后更新: 2026-03-14 18:02 CST
> 当前工作树: `/Users/luzhoua/DeliveryConsole`
> 分支: `codex/sd208-golden-crucible`
> 最新里程碑: `SD223` (项目全生命周期治理 Skill 落盘 / 治理口径升级)
> 建议 Commit: `docs(governance): save SD223 lifecycle governance skill progress`

---

## 模块完成度

| 模块                                 | 状态         | 完成度 | 备注                                                                                                  |
| ------------------------------------ | ------------ | ------ | ----------------------------------------------------------------------------------------------------- |
| **黄金坩埚工作台 (SD-210 / SD-216)** | 🚧 进行中     | 98%    | 已完成双阶段回合骨架、模块保活、黑板减法、自动扩缩分栏、拖拽中缝与 Remotion still preview，主链继续朝 `Socrates -> Bridge -> UI` 推进 |
| Runtime Port Governance              | ✅ 完成       | 100%   | 前后端端口已迁入运行时配置层，黄金坩埚模块现以独立端口运行并登记                                      |
| 多项目隔离 / 上下文隔离 (SD-208)     | 🚧 推进中     | 65%    | chat 已升级为 `expertId + projectId + scriptPath` scope，当前 delivery expert 已具备首版 reset 机制    |
| Director Phase 2                     | ✅ 完成       | 100%   | Excel 三态 Checkbox UI 重构已完成                                                                     |
| Director Phase 3/4                   | ⏸️ 待验证     | 85%    | 渲染闭环仍待后续回归                                                                                  |
| Shorts Master                        | ⏸️ 待联调     | 85%    | 当前不在本轮主战场                                                                                    |
| Music Director                       | ⏸️ 基础       | 40%    | 当前不在本轮主战场                                                                                    |
| Thumbnail Master                     | ⏸️ 基础       | 30%    | 当前不在本轮主战场                                                                                    |
| Marketing Master                     | ⏸️ 基础       | 30%    | 当前不在本轮主战场                                                                                    |
| 全局视觉语言升级（奶白 / 米色极简） | 🚧 黄金坩埚先行 | 55%    | Header / Footer / Crucible / Chat 已统一到奶白体系，后续再向其他模块扩散                              |

---

## 活跃问题

1. 中屏已经接入 Remotion still preview，但当前仍是 `SceneComposer` 静态预览链，不是完整 Remotion Studio 时间线驱动。
2. `server/crucible.ts` 已开始升级为 `skillOutput + bridgeOutput + turn_log` 首版，但前后端类型与旧字段兼容仍在过渡态。
3. 黄金冶炼师已被定性为后台导演 skill，但当前尚未实际实现该 skill，也未完成与 `Socrates / Researcher / FactChecker / ThesisWriter` 的真实执行链编排。
4. 主动 / 被动互联网搜索仍未真实接入；当前只做了 `searchRequested` 透明提示，没有真正补 Researcher 搜索执行链。
5. 当前工作区是重度脏状态，本轮仅继续收黄金坩埚链路并保存进度，不对其他模块改动做清理或归并。

## 最新变更

- **2026-03-10**: ✅ 黄金坩埚右侧已接入真实 chat，前台“黄金冶炼师”已挂载 `Socrates + ThesisWriter + Researcher + FactChecker + Writer` 知识上下文。
- **2026-03-10**: ✅ 已确认并同步 `ThesisWriter / Writer / Researcher / FactChecker` 到当前项目的 `skills/` 目录。
- **2026-03-10**: ✅ 已修复当前工作区缺少 `.env` 导致的全局 LLM setting 不生效问题，黄金坩埚 chat 现跟随全局 provider/model/key。
- **2026-03-10**: ✅ 完成黄金坩埚两轮精修：压缩 header 与三栏框架、缩窄左栏、统一 chat 奶白体系、补足头像归属与 Footer skill 展开。
- **2026-03-10**: ✅ 落下宿主层内容分流首版：纯对话留 chat，大段参考 / 金句 / 结构资产分送至中区。
- **2026-03-10**: ✅ 完成 Round 3 Part 1：右侧 chat 降级为状态窗，中区生成 3 个议题澄清问题卡，支持逐题保存与全部提交确认。
- **2026-03-10**: ✅ 修复问题卡保存后中区滚动失效问题；将 `textarea` 调整为固定高度内部滚动，避免挤坏中区主滚动。
- **2026-03-11**: ✅ 完成 Round 3 Part 3：中区默认留白、首问后才触发第一轮问题、reset 联动清空宿主资产与 chat 历史。
- **2026-03-11**: ✅ `Socrates` 问题接口升级为 `speaker + reflection + cards`，第二轮及之后会在右侧注入老张 / 老卢读完回答后的继续追问。
- **2026-03-11**: ✅ 收紧资产分流与 chat 发送逻辑：增加重复发送防抖、外部消息去重，减少“一问双回”和短状态句误送中区。
- **2026-03-12**: ✅ 新增黄金坩埚专用设计准则 `docs/02_design/crucible/interaction_contract.md`，明确“右侧只负责角色对话 / 中屏只负责呈现 / 对话先由 Socrates 主导 / 中屏不得直接复用右侧整段原话 / 老师与黑板”。
- **2026-03-12**: ✅ `server/crucible.ts` 已开始切向 `Socrates -> Delivery Console Bridge -> UI`，并新增 `runtime/crucible/<projectId>/turn_log.json` 首版落盘。
- **2026-03-12**: ✅ `hostRouting` 已补最小回归测试，防止长苏格拉底追问再次被误分流成中屏金句或参考。
- **2026-03-13**: ✅ 黄金坩埚切换已改为首次进入后保活，来回切模块不再反复 cold mount。
- **2026-03-13**: ✅ 中屏继续收回“黑板”边界：默认只保留 1 条板书、过滤与右侧近似复述、删除中屏自我说明与多余 header。
- **2026-03-13**: ✅ 继续按奥卡姆剃刀做视觉减法：压缩顶部 header、删 chat header 说明小字、统一左中右为更克制的“标签 + 标题”层级。
- **2026-03-13**: ✅ 坩埚右侧输入框发送后不再锁死；新增 `.md` 导出；badge 角色小字与消息分类小字已移除。
- **2026-03-13**: ✅ 中右分栏新增自动扩缩与手动拖拽，中屏无内容时右侧自动放大，双击中缝可恢复自动布局。
- **2026-03-13**: ✅ 中屏已接入真实 Remotion still preview：新增 `POST /api/crucible/remotion-preview`，当前 `activePresentable` 可生成并展示 PNG 预览。
- **2026-03-14**: ✅ 已建立 `docs/plans/crucible_v1/` 方案目录，统一收口黄金坩埚当前主线的 Runtime / 商业化 / 三轨治理 / Linear 交接方案。
- **2026-03-14**: ✅ `Phase 1` 已正式吸收 `Artifact-Lite` 中屏方向：中屏将从摘要针脚升级为单份结构化公屏，等待提示与 chatbox 引导语也已进入主方案。
- **2026-03-14**: ✅ 三轨关系与 Linear 治理口径已定稿：`Golden Crucible` 为上级总线，`Code Nemesis / Crucible-0 Phase 2 / Crucible-Plus Phase 3` 为并列项目，`Shared Kernel / Eval` 按横向 workstream 管理。
- **2026-03-14**: ✅ 已将治理能力从 `linear-governance` 升级为 `project-lifecycle-governance`，形成立项到复盘的全生命周期治理口径（Linear 作为 `Sync` 阶段落地面）。
- **2026-03-14**: ✅ 已新增 `SD223` 开发记录，完成治理类进度落盘并固定产物清单。
- **2026-03-14**: ✅ 已完成 `ProjectLifecycleGovernance` 的快照与账本登记，支持后续多端协同下的技能比对与回流。
- **2026-03-10**: ✅ 第三轮协议已落盘：明确“议题锁定 -> 沉浸对话 -> 结晶呈现”三阶段，并记入主动 / 被动互联网搜索能力要求。
- **2026-03-10**: ✅ 明确定稿：前台只保留用户 / 老张 / 老卢，黄金冶炼师默认隐身，仅作为后台导演 skill 存在。
- **2026-03-10**: ✅ 明确 `Socrates / Researcher / FactChecker / ThesisWriter` 都是后台工具而不是人，当前阶段终点收窄为 `ThesisWriter` 论文产出。

最新 Dev Log: `docs/dev_logs/2026-03-14_SD223_ProjectLifecycle_Governance_Skill.md`

最新 Plan: `docs/plans/crucible_v1/INDEX.md`

最新 Memory Dump: `.agent/memory_dumps/memory_2026-03-10_GoldenCrucible_Worktree.md`
