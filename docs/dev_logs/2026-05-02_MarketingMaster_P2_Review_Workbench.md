# 2026-05-02 MarketingMaster P2/P3 发布文案与交接检查台

## 背景

用户要求按上一轮工作计划继续推进 MarketingMaster。当前基线是 `a7efb61 feat(marketing): restore build and add delivery shell`，正式 Delivery Shell 第一版已经落地，本轮继续推进 P2 原生三段式布局。

## 完成内容

1. P2 从横向 Tab 改为左侧方案选择栏。
   - 一套黄金关键词对应一套发布包。
   - 每个方案显示生成状态、确认进度和 TubeBuddy 分数进度条。
   - 当前方案内容在右侧主工作区审阅。

2. 完整视频描述审阅台升级为三段式。
   - 左侧：结构化区块编辑。
   - 中间：最终 YouTube 描述全局预览。
   - 右侧：SEO/GEO 检查与推荐顺序。
   - 在 1366 宽度下，P2 默认收起右侧 Artifacts，优先保证长文本审阅空间；用户仍可手动展开右栏。

3. 修复描述事实源一致性。
   - `descriptionBlocks` 编辑后同步生成 `content`。
   - 描述或其他字段一旦编辑，自动取消对应字段确认态。
   - 描述行 AI 重写时，前端会解析返回的 `description_blocks` JSON，避免把 JSON 字符串塞进最终描述。
   - 后端 `revise-row` 对描述重写提示改为明确 JSON 结构。

4. 继续推进 P2 一致性细节。
   - P2 全局预览不再混入置顶评论；置顶评论保留为独立运营交接内容。
   - `MarketingPlanRow.content` 回写改为和最终 YouTube 描述预览一致，不再带 `[区块名]` 内部标签。
   - 后端 `parsePlanFromLLM` 和 `confirm` 导出都复用同一套 YouTube 描述顺序：hook → series → geo_qa → timeline → references → action_plan → hashtags。
   - 黄金词数量变化导致 `activeTabIndex` 越界时自动回到第一套方案，避免方案切换落到空状态。

5. Unit 4：P3 平台适配与 DT 交接检查落地。
   - P3 从旧的标题/标签确认页重写为平台适配检查台。
   - 主界面展示 YouTube 主包检查、平台适配矩阵、DT Contract、技术产物与交接摘要。
   - 多平台项（Shorts / Bilibili / 微信公众号）明确标记为预留，不误报 ready。
   - P3 作为 UI-only phase 接入正式 Shell；不扩展持久化 `MarketModule_V3.phase`，避免旧状态迁移风险。
   - 补充 `data.phase` 到 UI-only phase 的同步，保证刷新或 socket 恢复到 Phase 2 时页面不会卡在 P1。

## 验证

- `npx tsc --noEmit` 通过。
- `npm run build` 通过；仅剩 Vite chunk size warning。
- `git diff --check` 通过。
- agent-browser 打开 `http://localhost:5174`，1366x900 视口切到正式 `营销大师`。
- 使用浏览器内本地 mock state 验证 P2，不写入项目数据。
- agent-browser 验证 P3 可进入，页面出现 `YouTube 主包检查`、`平台适配矩阵`、`DT Contract`、`marketing_package.json`。
- agent-browser `errors` 无页面错误。
- P3 截图：`/Users/luzhoua/.agent-browser/tmp/screenshots/screenshot-1777702738589.png`。
- 本轮第一次 P3 mock 注入曾误写 `qa-marketing/05_Marketing/marketingmaster_state.json`；已删除并复查无残留文件。最终验证改为浏览器 socket listener 注入，不再写项目文件。

## 注意

- 本轮没有扩展 `MarketModule_V3.phase`，仍保持 `1 | 2`。
- P3 已是正式 UI-only 阶段；P4 仍是禁用语义位，后续再决定是否进入正式状态迁移。
- P3 已明确 `marketing_package.json` 仍是后续 DT 正式合约，不显示为完成。
- QA 过程中发现：若外部创建缺少 `modules` 的空项目，服务端旧 `ensureDeliveryFile` 兼容逻辑会访问 `data.modules.shorts` 报错。本轮已清理造成该问题的临时 QA 数据，是否正式修这条服务端健壮性问题可作为后续小修复单独处理。
