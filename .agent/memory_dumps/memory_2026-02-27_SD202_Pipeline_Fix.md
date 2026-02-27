# Memory Dump: DeliveryConsole (SD-202 Remotion 预览图管线修通)

**Date**: 2026-02-27
**Session Focus**: 彻底修通 Remotion 预览图从后端渲染到前端显示的完整管线

---

## 🧠 核心成果

### 修复了困扰三天的 "预览图空白" 问题

**终极根因**: 两个一行代码的 Bug 叠加导致

1. **`--props-file` 参数不被 Remotion 4.x 识别** → 改为 `--props`
   - Remotion 4.0.429 的 `get-input-props.js` 只解析 `--props` 参数
   - `--props-file` 被完全忽略，组件永远使用 defaultProps（空 layers）
   
2. **`--frame=0` 全局 fadeIn opacity=0** → 改为 `--frame=75`
   - SceneComposer 的 `interpolate(frame, [0, 15], [0, 1])` 在 frame=0 时返回 0
   - 整个画面完全透明，截出 43KB 的纯黑 PNG

### 附加修复
3. `npx remotion` → 本地 `node_modules/.bin/remotion`（避免联网需求）
4. 异步 fire-and-forget → `await` 同步直出 base64（消除轮询时序问题）
5. SceneComposer `whiteSpace: nowrap` → `pre-wrap`（文本换行）
6. 前端缩略图列 col-span-2 → col-span-3（放大 150%）
7. 前端优先处理 `imageUrl`（同步返回），降级到 `taskId`（异步轮询）

---

## 📂 关键文件路径

```
DeliveryConsole/
├── server/
│   ├── director.ts              # generateThumbnail 同步直出, buildRemotionPreview 排版
│   └── remotion-api-renderer.ts # --props, --frame=75, 本地bin
├── src/components/director/
│   └── ChapterCard.tsx          # 优先imageUrl, 缩略图150%, 诊断日志
└── docs/dev_logs/
    └── 2026-02-27_SD202_Remotion_Pipeline_Fix.md

~/.gemini/antigravity/skills/RemotionStudio/
└── src/BrollTemplates/
    └── SceneComposer.tsx        # 文本换行修复
```

---

## 🔗 Git 状态

- **Branch**: `main`
- **Latest Commit**: `2a5f92e` - fix(SD-202): 修通 Remotion 预览图渲染管线
- **Working Tree**: Clean

---

## 🎯 下一步计划 (Next Steps)

### 最高优先级: 预览图内容升级
当前预览图是"文字卡片"（把方案描述贴在深色背景上），老卢要求的是**与最终 MP4 成品高度一致的关键帧**。

需要做的工作：
1. **Remotion 类型方案** → 根据 option 的方案名称/内容，自动匹配到真实的 Composition（ConceptChain、DataChartQuadrant、CinematicZoom 等），传入真实数据渲染关键帧
2. **Seedance/Generative 类型** → 调用火山引擎图像生成 API，用 imagePrompt 生成真实 AI 图片（API 代码结构就绪，需网络环境）
3. **Artlist 类型** → 展示搜索关键词或参考图

### 其他待办
- [ ] **SD-207.1**: 修复 projectId 路径问题
- [ ] **SD-202 Phase 3-4**: 渲染管线与时间线编织
- [ ] 火山引擎 DNS 解析问题（网络环境依赖）
