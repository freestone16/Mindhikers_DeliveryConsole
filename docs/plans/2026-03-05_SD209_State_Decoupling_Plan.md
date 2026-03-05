# 状态管理独立化解耦改造方案 (State Decoupling Architecture)

## 1. 现状痛点分析 (Current Architecture & Pain Points)

在深浅度调研了当前 `DeliveryConsole` 的前后端代码后，我们发现现存的状态管理存在严重的 **"巨石单体耦合 (Monolithic State Coupling)"** 现象：

1. **交付终端 (Delivery) 寡头式统管**：
   - 前端 `useDeliveryStore.ts` 维护了一个极其庞大的 `DeliveryState`（包含全局 projectId、所有专家状态、所有专家的业务数据模块 array/objects）。
   - 后端 `server/index.ts` 监听 `update-data` 事件，并将这颗巨大的状态树**全量**序列化保存到项目的根目录级文件 `<ProjectRoot>/delivery_store.json`。
   - **痛点**：任何一个专家的微小修改（哪怕是 Director 改了一个字，或者 ShortsMaster 上传了一个文件），都会导致整个 `delivery_store.json` 的全量读写和全网 Socket 广播。极易引起状态冲突和性能瓶颈。

2. **专家 (Experts) 层面无独立性**：
   - `Director`, `Music`, `Thumbnail`, `Shorts`, `Marketing` 没有将自己的状态内敛于各自的业务边界内，而是全部挂载在 `DeliveryState.modules.xxx` 下。
   - 违背了高内聚低耦合的原则，这使得这些专家变成了 "假独立工具"，实则为 Delivery 模块内部的强耦合子组件。

3. **模块切换状态耦合**：
   - `activeModule` (在三大核心模块中切换：Crucible, Delivery, Distribution) 居然也被塞进了 `delivery_store.json`。这属于本地 UI 会话状态，被当成项目级状态存储，这会导致多端协同打开同一个项目时，界面互相跳转拉扯。

4. **分发终端 (Distribution) 的游离**：
   - 分发终端拥有独立的 `/api/distribution/queue` 和 `_distribution_queue.json`，独立性稍好，但其 Queue 储存在全局 `PROJECTS_BASE` 下，而非随项目走，容易导致全局锁瓶颈。

---

## 2. 状态独立化改造设计 (Decoupled Architecture Plan)

基于 Superpowers 最佳实践与"奥卡姆剃刀"原则：每个工具、每个专家必须只关心自己的状态文件，就像 UNIX 哲学中的独立小工具。后续如需业务串联，由上层 Pipeline Orchestrator 负责在运行时协调，而不能在静止的 JSON 存储中揉成一团。

### 2.1 存储拆分布局 (Storage Topology)

废弃巨石文件 `delivery_store.json`，将数据下放到各自专家的领地目录下：

- **🟢 纯前端会话状态 (无持久化或仅 LocalStorage)**：
  - `activeModule`: Crucible / Delivery / Distribution 的 UI 级切换。
  - `activeExpertId`: 当前激活的左侧专家 Tab。
  
- **🔥 黄金坩埚 (Crucible)**
  - `<ProjectRoot>/01_Crucible/crucible_state.json` (未来实施时启用)
  
- **🏭 交付终端 (Delivery) - 总体管线层**
  - `<ProjectRoot>/pipeline_manifest.json` （负责记录总体的 Pipeline 进度：哪一步到了哪个阶段，但不存业务富文本数据）。

- **🧑‍🏫 交付终端 - 各专业大师 (Experts Independent State)**
  - **Director**: `<ProjectRoot>/04_Visuals/director_state.json`
  - **MusicDirector**: `<ProjectRoot>/04_Music_Plan/music_state.json`
  - **ThumbnailMaster**: `<ProjectRoot>/03_Thumbnail_Plan/thumbnail_state.json`
  - **ShortsMaster**: `<ProjectRoot>/05_Shorts_Output/shorts_state.json`
  - **MarketingMaster**: `<ProjectRoot>/05_Marketing/marketing_state.json`

- **📡 分发终端 (Distribution)**
  - `<ProjectRoot>/06_Distribution/distribution_queue.json` （队列按项目存储，避免全局锁）
  - 全局配置 `auth.json` 保持不变（位于 `~/.mindhikers/auth.json`）。

### 2.2 前后端通信协议改造 (Protocol Refactoring)

1. **废弃全量的 `update-data` 和 `delivery-data` Socket 事件**。
2. **新增细粒度的增量同步 API / Socket 事件**：
   - `socket.emit('update-expert-data', { expertId: 'Director', data: {...} })`
   - 服务器接收后，通过映射表查找到 `04_Visuals/director_state.json`，仅对该文件进行读写。
3. **前端 Store 拆解**：
   - 将原有的 `useDeliveryStore` 降级为 `usePipelineStore`（仅关注宏观打勾进度）。
   - 将原本深耦合的数据拆解为独立 Store：`useDirectorStore`, `useShortsStore` 等等，独立监听后端的 `expert-data-update:${expertId}` 事件。

---

## 3. 开发实施路径 (Phase 1 to Phase N)

### Phase 1: 基础设施解耦与 Socket 管道改造 (Backend & Comms)
1. 在 `server/index.ts` 中废弃 `ensureDeliveryFile` 和庞大的初始 State 生成。
2. 新增通用的 `expert_state_manager.ts`：负责给不同的 `expertId` 提供原子的文件读写 API (`loadExpertState`, `saveExpertState`)。
3. 改造 Socket 通信，新增对特定 expert 的数据更新/响应通道。

### Phase 2: 前端状态隔离式拆分 (Frontend Hooks Reconstruction)
1. 废弃 `useDeliveryStore.ts` 内部的 `modules: { director, music... }` 巨石结构。
2. 创建 `hooks/useExpertState.ts` 泛型 Hook：`const [directorState, setDirectorState] = useExpertState('Director', INITIAL_DIRECTOR_STATE);`
3. 修正所有 React 组件引用：`DirectorSection.tsx`, `ShortsSection.tsx` 及其子组件，让它们只跟独立的特制 Hook 通信。

### Phase 3: 脏状态清理与业务流切换 (UI View Clean Up)
1. 从各类服务端和 Store 中移除 UI 会话专属属性（如 `activeModule`, `activeExpertId`），改用 `useState` 在组件顶层或轻量级 Local Context 中维系。
2. 更新 App.tsx 让三大模块不再受 `DeliveryState` 控制，恢复为原生受控视图。

### Phase 4: 分发与黄金坩埚的独立对接 (Distribution & Crucible)
1. 将 `DistributionQueue` 读取的持久化文件路径，由 `PROJECTS_BASE/_distribution_queue.json` 切分为依附于当前 projectId 的本地路径。
2. 为 `CrucibleHome` 提供独立的占位存储结构，确保后续接入不干扰其他两大系统。

## 4. 验证方式 (Verification Plan)
- **前后端连通性**：在 `Director` 模块打字输入数据，观察 Backend `console.log`，只看到 `04_Visuals/director_state.json` 发生磁盘 I/O，无其它文件动静。
- **状态不串台**：在 Shorts 模块新增素材，刷新浏览器，Shorts 状态成功恢复，而对于 `Director` 和 `Marketing` 的渲染与保存逻辑无任何副作用扰乱。
- **热切兼容**：切换不同 Project，状态能迅速清空并加载对应项目路径下的专属 `xxx_state.json`。
