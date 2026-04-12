# Unit 3 ThesisWriter 服务端实现方案

## 目标
实现 Unit 3 服务端闭环：论文生成 API、对话 artifact 追加持久化、路由注册，确保 `npm run build` 通过。

## 范围与约束
- 仅覆盖 Unit 3（生成 + 保存），不接入 Unit 4 论文额度逻辑。
- 不改动 `crucible.ts` 里的 `callConfiguredLlm` 导出状态。
- 不修改 `appendTurnToCrucibleConversation` 与 `CrucibleConversationArtifact` 类型。
- 非流式输出。

## 变更清单
1. 新增 `server/crucible-thesiswriter.ts`
   - 请求解析与校验（conversationId 必填）
   - BYOK 配置读取（若存在则覆盖 LLM 调用配置）
   - 读取 conversation detail
   - 判断 thesisReady（snapshot 或 turns）
   - 构建辩证地图（按轮次组织：用户发言、老卢反思、老张聚焦、Socrates 决策）
   - 加载 `ThesisWriter` skill，拼接 prompt
   - 内联 LLM 调用
   - 保存 artifact 并返回
2. `server/crucible-persistence.ts`
   - 新增 `appendCrucibleThesisArtifact`（复用 workspace/legacy context）
3. `server/index.ts`
   - 注册 `POST /api/crucible/thesis/generate`

## 关键实现细节
- thesisReady 判断优先使用 `snapshot.thesisReady === true`；否则遍历 turns 判断 `roundIndex >= 5 && decision.stageLabel === 'crystallization'`。
- artifact 标题/摘要基于对话主题与生成结果摘要化生成。
- LLM 调用使用 `loadConfig` + `PROVIDER_INFO`，支持 BYOK 覆盖。

## 验证
1. 对新增/修改文件执行 `lsp_diagnostics`。
2. `npm run build` 通过。

## 影响面与回滚
- 新增 API 路由与持久化方法，局部可控。
- 回滚：删除新增文件与路由，移除持久化新增函数。
