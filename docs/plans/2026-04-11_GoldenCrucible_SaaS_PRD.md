---
date: 2026-04-11
topic: golden-crucible-saas-prd
status: draft
---

# GoldenCrucible-SaaS 产品需求文档 (PRD)

## 1. 文档定位与目标

本 PRD 用于 GoldenCrucible-SaaS 的研发收敛与一期验收。

目标：

1. 服务研发与验收，给出明确范围、边界与验收标准
2. 优先锁定一期的范围与验收口径，避免被历史模块与远期设想牵引
3. 聚焦 GoldenCrucible-SaaS 当前上线形态，保证可演示、可真实体验、可回滚、可排障
4. 说明与 Roundtable 的关系与依赖边界，但 Roundtable 不纳入一期验收主体

本 PRD 是产品需求与验收口径，不是实现计划，也不替代代码层设计文档。

## 2. 产品概述

### 2.1 一句话定位

一个面向早期小规模真实体验的多账号轻量 SaaS，让用户在 workspace 隔离下进行单人深度对谈，沉淀历史，并在话题收敛时生成结构化论文 (ThesisWriter)。

### 2.2 目标用户

1. 内部验证与演示人群
2. 少量朋友与早期真实用户
3. 小范围客户与合作方，作为可信 demo 与试用入口

非目标用户：面向海量陌生流量的大规模开放产品用户。

### 2.3 使用场景

1. 用户登录后进入个人 workspace，发起一个深度对谈，持续追问并稳定得到结果
2. 在同一 workspace 内查看历史对话列表，恢复 active conversation 继续聊
3. 将对谈产物导出为完整 bundle-json 或结构化 markdown
4. 当对谈话题收敛时，用户在对话页进入 ThesisWriter 环节，生成并保存一篇 Markdown 论文
5. 试用额度耗尽后，用户切换到 BYOK，继续对谈与论文生成

## 3. 与 Roundtable 的关系

Roundtable 是后续阶段的重要能力与上游需求来源，会影响 SaaS 的长期信息架构与交互一致性。

一期边界：

1. Roundtable 不纳入一期验收范围，不以 Roundtable 的可用性作为 SaaS 一期上线阻塞条件
2. SaaS 一期只需要在文档层面说明与 Roundtable 的关系，保证后续对接时不需要推翻一期的核心边界
3. 任何与 Roundtable 的共享能力，如果不在本 PRD 的一期验收范围内，不得作为一期交付承诺

参考：上游 Roundtable PRD 作为背景与术语来源，不作为一期验收主体。

## 4. 账号与访问策略

### 4.1 双主路径并列

账号入口采用双主路径并列，文档中不设主次：

1. 受控邀请
2. 开放注册

### 4.2 开放注册的产品行为

开放注册完成后，用户直接进入试用主链，不需要额外审批或跳转到非核心页面。

### 4.3 访问与体验原则

1. 登录后自动创建 personal workspace
2. 用户进入产品后，主入口以对谈为中心
3. 试用额度与 BYOK 切换不应破坏历史浏览与产物导出

## 5. 一期范围（验收范围）

### 5.1 功能需求

#### 5.1.1 登录与认证

一期登录验收口径：

1. Google 登录
2. 邮箱登录

不阻塞项：

1. 微信登录不作为一期阻塞与验收项，可以在后续阶段接入

验收标准：

1. 用户可通过 Google 成功登录并进入产品主链
2. 用户可通过邮箱登录成功登录并进入产品主链
3. 登录态在页面刷新后仍有效，直到用户主动退出或会话过期
4. 登录失败时给出可理解的提示，不暴露敏感信息

#### 5.1.2 多账号与 Workspace

需求：

1. 多账号隔离，不同账号之间的数据、配置与历史不得串联
2. personal workspace 自动创建
3. workspace-aware 的单人深度对谈，所有对谈、历史、导出、论文产物都必须归属到当前 workspace

验收标准：

1. A 账号创建的对话与产物，B 账号不可见
2. 同一账号在 personal workspace 中创建的对话与产物，能在刷新后恢复
3. 任意读取或写入对谈数据的能力，最终都受 workspace 边界约束

#### 5.1.3 对谈主链

需求：

1. 用户能发起对谈
2. 用户在对谈中发起回合请求，系统能稳定返回结果
3. 支持 trial 与 BYOK 模式切换，并且切换后主链可继续使用

约束：

1. 本期核心是单人深度对谈，不纳入 Roundtable、多角色讨论、多人协作
2. 对谈主链必须可在 staging 与 production 环境验收

验收标准：

1. 新建对话后，用户可连续完成多轮问答，且响应稳定
2. 网络异常、模型异常、超时等失败场景有明确提示，用户可重试或切换模式
3. trial 转 BYOK 后，用户可继续在同一对话或新对话中完成问答

#### 5.1.4 历史与导出

需求：

1. 历史对话列表
2. active conversation 恢复
3. 基础产物导出
   - `bundle-json`（完整产物包，默认）
   - `markdown`（结构化 markdown 文档）

导出口径：

1. `bundle-json` 包含该 conversation 的必要正文与产物引用，作为默认交付格式
2. `markdown` 为结构化文档，便于直接阅读与二次编辑

验收标准：

1. 用户能看到历史对话列表，且条目与 workspace 绑定
2. 页面刷新后可恢复 active conversation，继续对谈
3. 任意一个对话可成功导出 `bundle-json`
4. 任意一个对话可成功导出 `markdown`
5. 导出行为不应破坏原对话数据

#### 5.1.5 ThesisWriter 论文生成（核心功能）

定位：

ThesisWriter 是一期核心新增功能，必须完成并纳入一期验收。

触发机制：

1. 系统检测到话题收敛条件满足时，主动提示用户进入论文生成
2. 用户可选择：
   - 进入论文编写环节
   - 继续深度讨论

入口位置：

1. 仅在对话页出现入口，位置可在黑板区域或对话结束提示区
2. 不提供全局入口，不在历史列表页或其他页面提供入口

输出与保存：

1. 输出格式为 Markdown
2. 生成后保存到当前 conversation 的 artifacts 中

试用限制：

1. trial 用户限 2 次论文生成
2. 超限后：
   - BYOK 模式可用
   - 或等待后续订阅方案

验收标准：

1. 系统在满足收敛条件时，能稳定提示论文生成
2. 用户选择进入论文编写后，系统能生成一份 Markdown 论文并返回
3. 生成的论文可在该 conversation 的 artifacts 中找到，并可被导出
4. trial 用户在累计 2 次论文生成后被正确限制，并获得清晰的下一步提示
5. 在 BYOK 模式下，论文生成能力可用

#### 5.1.6 BYOK 配置

一期 BYOK 口径为轻量 BYOK。

基础可用能力：

1. 用户填写 `Base URL / API Key / Model`
2. 保存配置
3. 清除配置
4. 连通性测试

轻引导增强：

1. 配置引导文案
   - 平台默认推荐：Kimi 原厂 k2.5
   - 说明何时需要切换 BYOK
   - 字段说明与示例
2. 轻量错误诊断
   - 配置不完整
   - 连接超时
   - API 错误
   - 模型不可用
   - Key 无效
3. 少量 provider 推荐
   - Kimi 原厂作为默认
   - 另提供 2 到 3 个候选方向，作为早期商务试探

明确不做：

1. provider 全量目录
2. 高级诊断向导
3. 真 BYOK（key 永不进云端）
4. 图生与视生统一配置

验收标准：

1. 用户可保存 BYOK 配置并在刷新后仍有效
2. 用户可清除 BYOK 配置并回到平台模式或受限状态
3. 连通性测试能给出成功或失败结果，失败原因在轻量诊断范围内可读
4. 配置完成后，对谈主链与 ThesisWriter 论文生成可在 BYOK 模式下正常使用

### 5.2 非功能需求

1. 隔离性
   - 账号隔离与 workspace 隔离必须强约束，不能依赖前端传参自觉
2. 健壮性
   - 模型调用失败、网络抖动、导出失败等场景要有明确错误提示与重试路径
3. 可观测性与排障
   - staging 与 production 可用，具备最小健康检查与错误定位线索
4. 安全基线
   - 平台 key 不下发前端
   - BYOK key 的处理符合一期轻量 BYOK 口径，不在前端明文回传与无必要的日志输出
5. 可回滚
   - 一期交付应保持部署与回滚路径清晰，不引入难以回滚的多服务复杂性

### 5.3 验收标准

一期验收以可复现的 smoke 路径为主，覆盖以下必测链路：

1. 登录与进入主链
   - Google 登录成功并进入对话页
   - 邮箱登录成功并进入对话页
2. workspace 与隔离
   - 登录后自动拥有 personal workspace
   - 不同账号之间历史与产物不可见
3. 对谈主链
   - 新建对话后完成至少 3 轮有效问答
   - 刷新页面后恢复 active conversation 并继续 1 轮问答
4. 历史与导出
   - 能看到历史对话列表
   - 任意对话可导出 `bundle-json`
   - 任意对话可导出 `markdown`
5. ThesisWriter 论文生成
   - 出现收敛提示后进入论文生成
   - 成功生成 Markdown 论文并保存为 artifacts
   - trial 用户触发 2 次后被正确限制
6. BYOK
   - 填写 Base URL, API Key, Model
   - 通过连通性测试
   - 切换到 BYOK 后，对谈与论文生成可用

## 6. 本期不纳入验收的内容

以下内容需要在 PRD 中明确记录，但不纳入一期验收。

1. 轻协作（写入但不验收）
   - 邀请他人进入 workspace
   - 共享 workspace
   - 成员管理
2. Roundtable（后续阶段）
3. Director, Shorts, Marketing, Distribution 主工作台
4. 正式付费计费系统

## 7. 环境与发布边界

环境与发布原则：

1. local, staging, production 三类环境必须分离
2. staging 与 production 可验收
3. SaaS 是发布收口线，不把研发试验线、发布线、线上环境混成一层

验收要求：

1. 一期验收至少在 staging 与 production 各完成一条主链 smoke
2. 环境差异若导致行为不同，必须以文档与可观测性证据给出解释

## 8. Roadmap

1. 一期
   - 多账号轻量 SaaS
   - workspace 隔离
   - 单人深度对谈主链
   - 历史与导出
   - ThesisWriter 论文生成上线与验收
   - trial 与 BYOK 一期口径可用
2. 二期
   - 轻协作
   - Roundtable 对接
3. 后续
   - 完整商业化
   - 更完整的协同与权限能力

## 9. 风险与待决问题

风险：

1. 试用额度与论文生成次数限制需要一致且可审计，否则容易产生体验争议与成本失控
2. BYOK 失败场景多样，一期轻量诊断若覆盖不足，会带来高频支持成本
3. 邮箱登录可能受邮件投递与风控影响，需要准备失败提示与替代路径
4. staging 与 production 的环境变量与依赖差异，可能造成主链验收不一致

待决问题（不作为一期阻塞功能承诺）：

1. 微信登录的接入时间点与验收标准
2. 超限后的订阅方案与计费系统的产品与工程路径
3. provider 推荐列表的最终选择与商务验证路径
4. 话题收敛条件的可解释性口径，是否需要在 UI 中给出更明确说明

## 附录

### A. 参考文档

1. 上游 Roundtable PRD
   - `/Users/luzhoua/MHSDC/GoldenCrucible-Roundtable/docs/plans/2026-04-09-002-roundtable-implementation-handbook 1.md`
2. 当前仓设计文档
   - `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/02_design/crucible/`
3. 试用与 BYOK 方案
   - `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/02_design/crucible/2026-03-30_GoldenCrucible_SaaS_Trial_Quota_And_BYOK.md`
4. 当前 HANDOFF
   - `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS/docs/dev_logs/HANDOFF.md`

### B. 术语表

1. SaaS
   - 本文语境下指 GoldenCrucible 的轻量线上交付形态，强调账号、workspace、对谈、历史与导出
2. Workspace
   - 数据隔离边界。对话、产物、导出均归属到 workspace
3. Conversation
   - 一段连续对谈。包含对话回合与产物
4. Artifacts
   - 对话产物集合，包含黑板产物、导出材料、以及 ThesisWriter 生成的论文
5. Trial
   - 平台提供的有限试用额度模式，额度耗尽后引导 BYOK
6. BYOK
   - Bring Your Own Key。一期为轻量 BYOK，允许用户填写 Base URL, API Key, Model 并由服务端代发请求
7. ThesisWriter
   - 在对谈话题收敛后生成结构化论文的能力，一期输出 Markdown 并保存到 artifacts
