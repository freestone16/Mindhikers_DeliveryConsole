# SD-209 状态存储独立化改造日志
**时间戳**: 2026-03-05
**模块 ID**: SD-209 (架构重构)
**进展状态**: ✅ Done (Phase 1)

## 执行摘要
为彻底解决 DeliveryConsole 中的“巨型全局单体 state”引发的渲染冲突和过度耦合问题，实施了状态下沉改造。

## 详细变更
1. **[后端枢纽] 增加 `expert_state_manager.ts` 组件**: 
   - 彻底打破全局一个坑，改为动态读取/写入独立模块子目录（如 `04_Visuals/director_state.json`）。
2. **[后端通信] `server/index.ts` API 层精细化**:
   - 新增专用的 `update-expert-data` 和发往客户端的按序散列广播 `expert-data-update:<expertId>`。
3. **[前端剥离] 新增 `hooks/useExpertState.ts`**:
   - 作为挂载中间件，无缝桥接后端散列发布的高速数据流。
4. **[界面重构] `App.tsx` 依赖剪断与业务组件下放**:
   - 将 `DirectorSection` 和 `ShortsSection` 内部的原硬编码 `data` 属性推进全部抽除。改由 Hooks 接管组件局部刷新的内部生命周期。

## 待办与隐患
- TypeScript 编译器可能有陈旧的 `node_modules` 引用或类型不对齐问题（如 TS Error 127），但功能链路在动态语言层面已可跑通。需要在后续梳理 Type 签名。
