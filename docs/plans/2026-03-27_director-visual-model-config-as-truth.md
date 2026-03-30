# Director 视觉模型“配置即所得”实施方案

> 日期：2026-03-27  
> 状态：Draft / User Review Required  
> 适用分支：`MHSDC-DC-director`  
> 文档性质：Director 模块架构修订方案  
> 作者：Codex（按 OldYang 协议落盘）

## 1. 本稿要解决什么

当前 Delivery Console 在“视觉模型配置”与 Director 真实执行链路之间，存在明显的设计断层：

1. 配置页可以保存视觉服务凭证
2. 专家配置页可以选择 `Image Gen Model Override` / `Video Gen Model Override`
3. 但 Director Phase2 / Phase3 的真实图生、缩略图、Remotion 底图注入，仍大量直接写死到火山引擎调用

这导致一个直接后果：

**用户在配置页中完成的视觉模型配置，并不会天然成为 Director 的执行真相来源。**

老卢这次提出的要求非常明确：

> **配置即所得**
>  
> 只要用户在配置页面里把视觉模型配好，Director 模块所有需要用到视觉模型的地方，都必须按配置执行。

本稿要解决的不是“再补一个 Google 下拉框”，而是：

**把“视觉模型配置”从 UI 状态，升级为 Director 执行链路的单一事实来源（SSOT）。**

---

## 2. 当前问题的根因

### 2.1 配置层与执行层脱节

当前已经存在这些配置入口：

1. `.agent/config/llm_config.json`
2. `server/llm-config.ts`
3. `src/components/LLMConfigPage.tsx`
4. `experts.director.imageModel / videoModel`
5. `generation.imageModel / videoModel`

但 Director 真实执行时：

1. Phase2 文本规划读取的是 `config.global`
2. Phase3 图生/缩略图大多直接调用 `generateImageWithVolc()`
3. 视频生成直接调用 `generateVideoWithVolc()`
4. `experts.director.imageModel / videoModel` 并未成为统一的运行时决策入口

### 2.2 Provider 路由缺失

当前系统没有一个统一的“视觉模型运行时路由器”来回答这几个问题：

1. 当前 Director 要用哪个图片模型？
2. 这个模型属于哪个 provider？
3. 这个 provider 的凭证是否已配置？
4. 当前请求应走哪个 provider adapter？

没有这层路由器，就只能在业务代码里散落：

1. `如果是图生就调火山`
2. `如果是视频就调火山`
3. `如果以后接 Google 再另开分支判断`

这种模式天然无法支撑“配置即所得”。

### 2.3 模型目录与凭证目录未统一

当前“可选模型”主要来自静态数组，例如：

1. `IMAGE_MODELS`
2. `VIDEO_MODELS`

但真正“当前机器上可用的 provider”又来自：

1. `.env`
2. 凭证保存状态
3. provider 是否测通

结果就是：

1. UI 可能展示了模型，但运行时并不支持
2. UI 新增了凭证入口，但专家配置页未同步出现
3. 即使模型在专家配置中可见，执行层仍未真正读取

---

## 3. 目标原则

这次修订必须满足以下 5 条原则：

### 原则 A：配置即真相

Director 所有视觉模型选择，都必须来自统一配置解析结果，而不是业务代码内部硬编码。

### 原则 B：先解析，再执行

任何图生/视生请求，在真正调用 provider 前，先进入统一的运行时解析层：

1. 解析专家 override
2. 回退到全局 generation 配置
3. 计算 provider
4. 校验凭证
5. 执行对应 adapter

### 原则 C：Provider 无感扩展

未来新增新的视觉服务商时，不应再改 Director 各个业务入口，而只需要：

1. 扩充 provider registry
2. 增加对应 adapter
3. 更新模型目录

### 原则 D：UI 只能反映真实可执行能力

配置页与专家页只展示“系统当前真正支持且当前环境真正可配置”的视觉模型，不再展示只能看不能跑的模型。

### 原则 E：错误要在路由层被解释

如果某个模型配置了但当前 provider 没有凭证、没实现、或不支持当前任务类型，必须在统一路由层返回明确错误，而不是在业务末梢随机爆炸。

---

## 4. 目标架构

建议新增一层 **Director Visual Runtime Router**。

新的链路应为：

```text
LLMConfigPage / Experts Config
    ↓
.agent/config/llm_config.json + .env
    ↓
visual-model-registry.ts
    ↓
director-visual-runtime.ts
    ↓
provider adapters
    ├─ volcengine-image
    ├─ volcengine-video
    └─ google-gemini-image
    ↓
Director Phase2 / Phase3 / thumbnail / remotion-bg
```

### 4.1 三层职责划分

#### 第一层：配置层

职责：

1. 保存 provider 凭证
2. 保存全局 generation 默认值
3. 保存 expert override

真相来源：

1. `.agent/config/llm_config.json`
2. `.env`

#### 第二层：模型目录层

职责：

1. 描述某个 model 属于哪个 provider
2. 描述它支持 image / video / text-and-image
3. 描述它是否对 Director 当前链路可用

这里必须是显式目录，而不是运行时靠字符串猜。

#### 第三层：执行路由层

职责：

1. 根据 `expertId + taskType` 解析本次该用哪个模型
2. 根据 model registry 找到 provider
3. 检查凭证与能力
4. 调用 provider adapter

---

## 5. 建议新增的核心文件

### 5.1 `server/visual-model-registry.ts`

这是视觉模型的显式目录。

建议导出：

```ts
type VisualTaskType = 'image' | 'video';

interface VisualModelDescriptor {
  id: string;
  label: string;
  provider: 'volcengine' | 'google';
  taskType: VisualTaskType;
  enabledWhenConfigured: boolean;
}
```

建议至少包含：

#### 图片模型

1. `doubao-seedream-5.0-litenew`
2. `doubao-seedream-4-5-251128`
3. `doubao-seedream-4-0-250828`
4. `doubao-seedream-3-0-t2i-250415`
5. `gemini-3-pro-image-preview`
6. `gemini-2.5-flash-image`

#### 视频模型

1. `doubao-seedance-1-5-pro`
2. `doubao-seedance-1-0-pro`
3. `doubao-seedance-1-0-lite`

### 5.2 `server/director-visual-runtime.ts`

这是 Director 的统一运行时路由器。

建议导出：

```ts
resolveDirectorVisualConfig(taskType: 'image' | 'video'): ResolvedVisualConfig
generateDirectorImage(prompt: string, options?: ...): Promise<ImageResult>
generateDirectorVideo(prompt: string, options?: ...): Promise<VideoResult>
```

职责：

1. 读取 `loadConfig()`
2. 先取 `experts.director.imageModel / videoModel`
3. 若为空则回退到 `generation.imageModel / videoModel`
4. 从 registry 中找到对应 provider
5. 校验 provider 是否已配置
6. 调对应 adapter

### 5.3 `server/google-gemini-image.ts`

Google 图生独立 adapter。

职责：

1. 使用 `GOOGLE_API_KEY`
2. 调用 Gemini API image generation
3. 输出统一结果格式

不建议把 Google 逻辑揉进 `volcengine.ts`，否则会继续扩大“火山文件”职责污染。

---

## 6. 配置解析规则

### 6.1 图片任务

优先级：

1. `config.experts.director.imageModel`
2. `config.generation.imageModel`
3. 系统默认回退

### 6.2 视频任务

优先级：

1. `config.experts.director.videoModel`
2. `config.generation.videoModel`
3. 系统默认回退

### 6.3 回退原则

若配置的 model 在 registry 中不存在：

1. 不静默替换
2. 直接报错
3. 错误文案写明“配置项存在，但运行时不支持该模型”

这里必须严厉，因为“静默回退”会破坏配置即所得。

---

## 7. Director 侧需要统一接入的入口

这次不能只修一个按钮，必须盘清 Director 里所有视觉模型入口。

建议统一改造以下入口：

### 7.1 Phase2 缩略图预览

当前位置：

1. `generateThumbnail`
2. `thumbnailTasks`
3. 各类 `generateImageWithVolc()`

改造目标：

1. 图生类缩略图一律走 `generateDirectorImage()`
2. 信息图底图也走统一图片生成接口

### 7.2 Phase2 批量渲染前的图片生成

当前位置：

1. `phase2RenderChecked`
2. 预渲染底图生成

改造目标：

1. 所有 `imagePrompt -> imageUrl` 注入统一走 runtime router

### 7.3 Phase3 重渲染 / 视频渲染前底图生成

当前位置：

1. `generateImageFromPrompt`
2. `generateVideoWithVolc`
3. `pollVolcImageResult`
4. `pollVolcVideoResult`

改造目标：

1. 图片走 `generateDirectorImage()`
2. 视频走 `generateDirectorVideo()`

### 7.4 Remotion 底图注入链

当前位置：

1. `option.imagePrompt`
2. `props.imageUrl` 自动生成注入

改造目标：

1. 这部分不能再默认叫 Seedream，而应该变为“按 Director 图生配置生成底图”

---

## 8. UI 层需要同步收口

### 8.1 视觉模型配置页

必须保留并收紧为：

1. 顶部“核心凭证区”
2. 下方“已配置视觉服务”
3. 只展示当前系统支持的视觉服务商

### 8.2 专家模块配置页

Director 的：

1. `Image Gen Model Override`
2. `Video Gen Model Override`

都必须来自运行时可执行模型目录，而不是静态硬编码数组。

换句话说：

1. 如果 Google 已配置，则 Director Image Override 中出现 NanoBanana 系列
2. 如果 Google 未配置，则不出现
3. 视频下拉只展示当前运行时真正支持的视频模型

---

## 9. Provider 适配策略

### 9.1 Volcengine

职责：

1. 继续负责当前视频生成
2. 继续负责现有 Seedream 图生
3. 保留 endpoint 机制

注意：

1. 火山的“模型选择”与“接入点”不是一回事
2. 因此它的 adapter 必须显式说明：
   - 当前使用哪个 endpoint
   - 当前逻辑是否只支持 endpoint 驱动

### 9.2 Google Gemini Image

职责：

1. 负责 `gemini-3-pro-image-preview`
2. 负责 `gemini-2.5-flash-image`

建议使用 Gemini API 原生 `generateContent` 接口。

注意：

1. 返回值不是图片 URL，而是 inline data / base64
2. 因此 adapter 要负责落地到本地文件，并生成可供前端使用的 HTTP URL
3. 输出格式必须与 Director 当前图生链路兼容

---

## 10. 统一结果格式

无论 provider 是谁，返回格式都应统一。

建议图片结果：

```ts
type DirectorImageResult =
  | { success: true; imageUrl: string; sourceProvider: string; sourceModel: string }
  | { success: false; error: string; sourceProvider?: string; sourceModel?: string };
```

建议视频结果：

```ts
type DirectorVideoResult =
  | { success: true; videoUrl: string; sourceProvider: string; sourceModel: string }
  | { success: false; error: string; sourceProvider?: string; sourceModel?: string };
```

这样 Phase2 / Phase3 调用方就无需再关心 provider 差异。

---

## 11. 分阶段实施建议

### 阶段 A：配置与目录收口

1. 新增 `visual-model-registry.ts`
2. 让 `getConfigStatus()` 返回“当前真正可执行的 image/video model 列表”
3. 专家配置页改成读取这份列表

### 阶段 B：图片运行时路由

1. 新增 `director-visual-runtime.ts`
2. 新增 `google-gemini-image.ts`
3. 先接通 Director 所有图片生成入口

### 阶段 C：视频运行时路由

1. 把 Director 视频入口改成统一走 runtime router
2. 当前先只落 Volcengine adapter
3. 为未来新增 video provider 留接口

### 阶段 D：验收与回归

至少验证：

1. 仅火山配置时，Director 图生走火山
2. 配置 Google NanoBanana Pro 后，Director 图片入口走 Google
3. 切回火山后，Director 图片入口恢复火山
4. 视频链路不受图片 provider 变更影响
5. 专家 override 与全局 generation 的优先级正确

---

## 12. 验收标准

这次功能完成的“铁证”必须满足以下 6 条：

1. 在配置页配置 Google Gemini Image key 并测试通过
2. Director 专家配置页中可见并可选择 `gemini-3-pro-image-preview`
3. Director Phase2 任一图生缩略图请求实际走 Google
4. Director Phase3 任一底图生成实际走 Google
5. 切换回火山后，同一条入口实际改走火山
6. 日志中能明确看到本次请求使用的 provider + model

只要这 6 条里有任意一条做不到，就不能算“配置即所得”闭环。

---

## 13. 这次明确不做

为了避免再次把问题做散，这次明确不做：

1. 不在本轮同时重构所有非 Director 模块的视觉链路
2. 不扩展 Google 视频生成
3. 不把所有历史静态模型列表一次性重写到所有模块
4. 不在本轮引入新的数据库或远程配置中心

本轮只收：

**Director 视觉模型配置即所得**

---

## 14. 推荐结论

建议按下面的顺序推进，而不是继续局部打补丁：

1. 先建立显式视觉模型目录
2. 再建立 Director 统一 runtime router
3. 再接 Google image adapter
4. 最后替换 Director 所有图片入口

一句话总结：

**问题的根不在“Google 选项没出现在下拉框”，而在“系统缺少一层把配置翻译成执行行为的视觉运行时路由器”。**

---

## 15. 用户确认点

建议你确认以下两点后，再进入实施：

1. 是否接受“先只对 Director 完成配置即所得，不同时扩散到其他模块”
2. 是否接受“本轮先完成图片配置即所得，视频继续保留火山但也统一纳入 runtime router 框架”

