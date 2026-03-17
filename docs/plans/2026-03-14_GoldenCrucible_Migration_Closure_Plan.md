# GoldenCrucible 迁移收口计划

> 日期：2026-03-14
> 目标：将当前工作树从“可阅读但不可稳定开工”收口到“运行口径统一、依赖可恢复、文档可交接”的状态。

## 收口范围

1. 统一运行时端口与 API / Socket 入口
2. 清理前端残留硬编码主机与端口
3. 修复启动/检查脚本与当前运行时配置不一致问题
4. 恢复依赖并完成最小 build / test / health 验证
5. 更新开发进度与收口记录
6. 产出跨模块复用的收口自查建议书

## 实施顺序

### Phase A. 运行时统一
- 以 `src/config/runtime.ts` 作为前端唯一运行时事实来源
- 前端 fetch / socket / window.open / video src 全部改走统一构建函数
- `scripts/check-port.js` 与 `scripts/preview.js` 改为读取 `.env.local` / `.env`
- `.claude/launch.json` 对齐当前工作区端口

### Phase B. 依赖恢复与验证
- 恢复本地依赖目录
- 运行 `npm run build`
- 运行最小测试集
- 运行端口检查与必要的本地健康验证

### Phase C. 文档与治理落盘
- 更新 `docs/04_progress/dev_progress.md`
- 新增本次收口 dev log
- 输出《模块迁移收口自查建议书》供其他一级/二级模块复用

## 验收标准

- 代码中不再残留功能路径上的 `localhost:3002` / `127.0.0.1:3002` 硬编码
- 端口检查脚本与当前 `.env.local` 口径一致
- build 能成功完成
- 至少 1 组关键测试通过
- 文档能明确说明当前工作树的真实状态、遗留项与复用建议
