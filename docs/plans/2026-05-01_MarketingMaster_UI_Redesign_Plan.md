# MarketingMaster UI 改版规划

> 日期：2026-05-01  
> 状态：Demo 阶段，暂不替换生产 UI  
> Demo 入口：`http://localhost:5174/#/marketing-redesign-demo`

## 一句话方向

MarketingMaster 不再做成纵向堆叠表单，而改成 Delivery 统一工作台里的“发布包控制塔”：左侧只放跨模块功能区，中间处理当前 Phase，右侧持续显示运行态、队列、日志与下游交接状态。

视觉基调从冷色 Director 控制台调整为 GoldenCrucible 式米色工作台：暖白纸面、浅米侧栏、深棕文字、陶土橙主动作、低饱和绿表示完成态。

## 参考对象

### Director 可借鉴

1. 左中右工作台格局：共用模块入口、主操作区、运行态/调试区分离。
2. 左栏功能区必须和 Director 收口一致，便于最终把 影视导演 / 短视频 / 缩略图 / 音乐 / 营销 / 视觉审计 合并成同一侧栏。
3. 运行态可见：生成中、耗时、日志、模型信息不要藏在 console。
4. Phase 不放左栏，而放进中栏 header，用 P1-P4 作为当前任务上下文。

### DT 分发终端可借鉴

1. 发布包下游意识：MarketingMaster 输出要能直接对齐 DT 的 Publish Composer。
2. 平台状态表达：YouTube 完整实现，多平台保留字段和缺口要显式呈现。
3. 队列与账号健康度：授权、草稿、定时、待发布是发布链路的一部分。
4. “确认后交接”的动作语言：从“导出文件”升级为“交给分发终端”。

### GoldenCrucible 可借鉴

1. 米色/暖白底色，减少冷蓝黑后台感。
2. 左中右三栏像“工作间”，不是重型 SaaS dashboard。
3. 文本以深棕/炭黑为主，状态色保持低饱和。
4. 侧栏可以收起；右侧 Artifacts/运行态栏也可以收起。
5. 左右栏宽度需要支持手动拖拽调节，适配不同审阅任务。

## 关键页面 Demo

1. 关键词打分页
   - 左侧：Delivery 共用模块入口与当前营销文稿列表
   - 中间 header：P1 关键词
   - 中间内容：候选词、TubeBuddy 评分、黄金词选择
   - 右侧：TubeBuddy 状态、事件日志、队列状态

2. 方案审阅页
   - 中间 header：P2 方案
   - 中间内容：三套黄金词方案、标题、描述、缩略图、播放列表、标签、其他设置逐项确认
   - 右侧：LLM 生成状态、保存状态、异常提示

3. 分发交接页
   - 中间 header：P3 交接
   - 中间内容：`marketing_package.json/md` 输出契约预览
   - 平台行：YouTube 就绪、Shorts/Bilibili/公众号显示缺口
   - 右侧：对齐 DT 的账号、平台、队列语义

4. 确认导出页
   - 中间 header：P4 导出
   - 中间内容：确认项、导出格式、DT 接口、质量闸门
   - 右侧：继续承担运行态监控，不在中栏重复运行日志

## 设计约束

1. 不引入新组件库，继续使用 Tailwind + lucide。
2. 不改当前业务状态契约，先换视图组织方式。
3. 正式改版必须保留当前可用链路：
   - 脚本重选即重置
   - 关闭窗口保存进度
   - TubeBuddy Studio-first 真实评分
   - Phase 2 可逐项展开编辑
   - 导出前逐项确认
4. 页面尽量少用大圆角卡片，采用 Director/DT 的直角工具栏、表格行和紧凑面板。
5. 正式改版的左右栏必须支持：
   - 一键收起/展开
   - 鼠标拖拽调整宽度
   - 收起后保留窄条入口，不能让用户迷路
6. 颜色以 GoldenCrucible 米色系为主，不再使用 MarketingMaster 旧橙黑大面积背景。
7. 左栏不承载 MarketingMaster 内部 Phase；Phase 统一放到中栏 header，运行态统一放到右栏 Artifacts。

## 正式实施拆分

### Step 1：壳层改造

新增 MarketingMaster 工作台壳：

- `MarketingWorkbenchShell`
- `MarketingLeftRail`
- `MarketingRuntimeInspector`

先把现有 Phase 1 / Phase 2 包进去，不改业务逻辑。

### Step 2：Phase 1 重排

把候选词生成、TubeBuddy 打分、黄金词选择重排为一屏：

- 左侧候选词列表
- 中间评分表
- 右侧运行态和策略点评

### Step 3：Phase 2 重排

把方案审阅改为：

- 左侧黄金词方案 tab/list
- 中间当前发布包字段
- 右侧字段健康度、LLM 修订、导出状态

### Step 4：DT 交接

把“导出当前方案”改为更清楚的“生成发布包 / 交给分发终端”：

- 保留本地双格式输出
- 同步显示 DT 可消费字段
- 多平台字段先只展示预留状态，不扩大功能范围

### Step 5：真实 QA

每步完成后用 agent-browser 做：

- 桌面宽屏截图
- 1366 宽度截图
- Phase 1 评分流程
- Phase 2 方案生成与展开编辑
- 导出成功/失败态
