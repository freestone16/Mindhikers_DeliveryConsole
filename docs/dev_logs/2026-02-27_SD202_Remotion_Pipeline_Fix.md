# 开发日志: SD-202 Remotion 预览图渲染管线修通

**日期**: 2026-02-27
**模块**: SD-202 导演大师 Phase 2
**状态**: ✅ 管线打通，预览图可正常生成显示

---

## 本次修复的核心 Bug

### Bug #1: `--props-file` 参数名错误（终极根因）
- **文件**: `server/remotion-api-renderer.ts`
- **问题**: Remotion 4.0.429 只识别 `--props` 参数，**不识别 `--props-file`**
- **影响**: props 从未传入 SceneComposer，渲染出的图永远是 defaultProps 的空画面
- **修复**: `--props-file=${tmpPropsPath}` → `--props=${tmpPropsPath}`

### Bug #2: `--frame=0` 全透明
- **文件**: `server/remotion-api-renderer.ts`
- **问题**: SceneComposer 在 frame=0 时全局 fadeIn opacity=0，截出纯黑图
- **修复**: `--frame=0` → `--frame=75`

### Bug #3: `npx remotion` 需要联网
- **文件**: `server/remotion-api-renderer.ts`
- **问题**: 使用 `npx remotion` 每次需要连 npm registry 验证版本，网络不稳时失败
- **修复**: 改为直接调用本地 `node_modules/.bin/remotion`

### Bug #4: 异步轮询时序问题
- **文件**: `server/director.ts`
- **问题**: generateThumbnail 的 Remotion 分支使用 fire-and-forget IIFE 异步渲染，前端轮询容易踩空
- **修复**: 改为 `await` 同步等待渲染完成后直接返回 base64

### Bug #5: SceneComposer 文本溢出
- **文件**: `RemotionStudio/src/BrollTemplates/SceneComposer.tsx`
- **问题**: `whiteSpace: "nowrap"` 导致长文本溢出画布外
- **修复**: 改为 `pre-wrap` + `maxWidth: 1720` + `wordBreak: break-word`

---

## 修改的文件清单

| 文件                                      | 变更                                                      |
| ----------------------------------------- | --------------------------------------------------------- |
| `server/remotion-api-renderer.ts`         | --props-file→--props, frame=0→75, npx→本地bin             |
| `server/director.ts`                      | Remotion分支同步直出base64, MAX_TEXT_LEN 180→40, 排版优化 |
| `src/components/director/ChapterCard.tsx` | 优先处理imageUrl同步返回, 缩略图列放大150%, 添加诊断日志  |
| `RemotionStudio/.../SceneComposer.tsx`    | 文本换行修复                                              |

---

## 遗留问题与下一步

1. **预览图内容升级**: 当前预览图是文字卡片式的方案摘要，不是真实的视觉预览。需要根据 option.type 匹配到真实 Composition 渲染关键帧
2. **火山引擎 AI 图像**: seedance/generative 类型需要真正调用图像生成 API
3. **Remotion Composition 匹配**: 需要根据方案名称/类型自动选择 ConceptChain、DataChartQuadrant 等对应模板
