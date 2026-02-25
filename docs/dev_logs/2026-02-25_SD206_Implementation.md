# 📋 Dev Log: SD-206 短视频大师实施

> **日期**: 2026-02-25
> **模块**: SD-206 (Shorts Master)
> **开发者**: GLM Team (老杨指导)

---

## 🎯 本次目标

完成 SD-206 短视频大师模块的完整实施，从 P0 到 P3 全部优先级任务。

---

## ✅ 完成内容

### P0: 基础配置
- [x] `src/config/experts.ts` - ShortsMaster 名称更新为「短视频大师」
- [x] `src/types.ts` - 新增 SD-206 V2 完整类型定义
  - `CTA`, `ShortScript`, `ShortBRoll`, `WhisperSegment`
  - `SubtitleConfig`, `HeaderOverlayConfig`, `ShortRenderUnit`, `ShortsModule_V2`

### P1: 顶层容器 + Phase 1/2
- [x] `src/components/ShortsSection.tsx` - 三阶段管线容器（复刻 DirectorSection 模式）
- [x] `src/components/shorts/ShortsPhase1.tsx` - 脚本工厂
  - **V2 工作流**: 选择文档 → 智能推荐 → 用户微调 → 生成
- [x] `src/components/shorts/ShortsPhase2.tsx` - 文案精修表格
  - Inline 编辑 + 单行保存 + 单行重生成
- [x] `server/shorts.ts` - Phase 1/2 后端 API
  - `generateScripts` (SSE), `saveScript`, `regenerateScript`, `confirmAll`
  - `recommend` (新增: 智能推荐 CTA+风格)
- [x] `server/index.ts` - 新增 `/api/scripts/content` 路由

### P2: Phase 3 核心组件
- [x] `src/components/shorts/ShortsPhase3.tsx` - 渲染交付台容器
- [x] `src/components/shorts/ShortCard.tsx` - 单条 Short 完整卡片
  - A-Roll 上传/裁切、B-Roll 生成、字幕识别、渲染提交
- [x] `server/whisper.ts` - ASR 模块
  - 本地 whisper.cpp 优先 + OpenAI Whisper API 兜底
  - `segmentsToSRT` 字幕格式转换

### P3: 辅助组件 + 路由
- [x] `src/components/shorts/SubtitleEditor.tsx` - 字幕精修编辑器
- [x] `src/components/shorts/HeaderComposer.tsx` - 页眉编排器
- [x] `src/components/shorts/BGMSelector.tsx` - BGM 选择器
- [x] `src/App.tsx` - 添加 ShortsMaster 路由条件渲染
- [x] `server/index.ts` - 注册全部 shorts 路由

### 依赖安装
- [x] `multer @types/multer` - 文件上传支持

---

## 📝 设计变更记录

### Phase 1 工作流变更 (2026-02-25)

**原设计 (V1)**:
- 用户手动输入主题/粘贴内容
- 单个风格选择
- 6 个 CTA 下拉菜单

**新设计 (V2)**:
- 下拉选择 `02_Script/` 目录下的文档
- 选择文档后自动触发 LLM 智能推荐 CTA + 风格组合
- 每条 Short 单独配置 CTA 和风格（两个下拉菜单）
- 新增「补充说明」文本框
- 修改数量时自动重新推荐

**新增 API**:
- `POST /api/shorts/phase1/recommend` - 智能推荐
- `POST /api/scripts/content` - 获取文档内容

---

## 📂 新增文件清单

```
src/components/shorts/
├── ShortsPhase1.tsx      # 脚本工厂 (V2 工作流)
├── ShortsPhase2.tsx      # 文案精修表格
├── ShortsPhase3.tsx      # 渲染交付台容器
├── ShortCard.tsx         # 单条 Short 卡片
├── SubtitleEditor.tsx    # 字幕精修编辑器
├── HeaderComposer.tsx    # 页眉编排器
└── BGMSelector.tsx       # BGM 选择器

server/
├── shorts.ts             # SD-206 全部 API
└── whisper.ts            # ASR 模块
```

---

## 🔜 待办事项

- [ ] 老卢提供品牌 Logo 文件（两个方形 PNG）
- [ ] 确认 BGM 预设库来源
- [ ] 确认 Whisper 模型选型 (medium vs large)
- [ ] Phase 3 实际渲染测试
- [ ] UI 文件列表加载异常修复 (M-3/C-2)

---

## 🔗 Git 状态

- **Branch**: main
- **Commits**: 待提交
