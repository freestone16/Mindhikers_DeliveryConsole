# Seedance 2.0 & Seedream 5.0 深度提示词工程指南

> **核心用途**: 本文档为 Director (导演大师) 提供 Seedance 2.0 视频生成与 Seedream 5.0 图像生成的底层技术规范与的高级 Prompt 策略。

---

## 🎬 Part 1: Seedance 2.0 (多模态 AI 视频导演)

### 1.1 @Tag 多模态引用系统 (核心机制)

Seedance 2.0 不再仅仅依赖文本，而是通过 **@标签** 将上传的素材（图片/视频/音频）直接嵌入提示词逻辑中。

**资源上限**:
*   🖼️ **图片 (@Image)**: 最多 9 张 (支持 1080P/2K/4K)
*   🎥 **视频 (@Video)**: 最多 3 条 (总长 ≤ 15s)
*   🎵 **音频 (@Audio)**: 最多 3 条 (总长 ≤ 15s)
*   📦 **总文件数**: ≤ 12 个

**引用逻辑**:
| 标签语法    | 典型用途          | 提示词示例                                                     |
| :---------- | :---------------- | :------------------------------------------------------------- |
| **@ImageN** | **角色/风格定调** | "让 @Image1 中的宇航员，在 @Image2 的赛博朋克街道上行走。"     |
| **@VideoN** | **动作/运镜复刻** | "角色动作完全复刻 @Video1 的舞蹈，运镜模仿 @Video1 的环绕感。" |
| **@AudioN** | **节奏/口型驱动** | "画面剪辑节奏与 @Audio1 的鼓点同步，角色口型匹配语音。"        |

---

### 1.2 黄金五元素提示词公式

> **公式**: **Subject (主体) → Action (动作) → Camera (运镜) → Style (风格) → Constraints (约束)**

#### ✅ 标准示范
> **Prompt**: 一位身穿银色战甲的亚洲女性 (@Image1) **(主体)**，正在暴雨中的霓虹天台边缘奔跑，回头开枪 **(动作)**。低角度仰拍，随后快速推近至面部特写 (Dolly in to Close-up) **(运镜)**。Blade Runner 2049 电影质感，高对比度，青橙色调 **(风格)**。保持角色发型不变，画面无模糊 **(约束)**。

#### ❌ 反面教材
> **Prompt**: 一个女人在跑，很酷的科幻风格，镜头好看一点。
> *(问题: 主体模糊、动作无细节、运镜无术语、风格太笼统)*

---

### 1.3 运镜控制词汇库 (Camera Movement)

Seedance 2.0 能精准理解电影级运镜术语。

| 中文术语     | 英文术语 (推荐混用)       | 视觉效果描述                                |
| :----------- | :------------------------ | :------------------------------------------ |
| **推**       | **Push in / Dolly in**    | 镜头向主体物理推进，增强代入感或压迫感      |
| **拉**       | **Pull out / Dolly out**  | 镜头远离主体，揭示环境关系或孤独感          |
| **摇**       | **Pan Left / Right**      | 摄像机位置不动，镜头水平旋转 (适合全景扫视) |
| **移**       | **Truck / Tracking Shot** | 摄像机跟随主体平行移动 (适合行走/奔跑)      |
| **升/降**    | **Crane up / down**       | 摇臂升降，展现宏大场景或上帝视角            |
| **环绕**     | **Orbit / Arc Shot**      | 围绕主体 360° 旋转，通过背景位移体现空间感  |
| **甩**       | **Whip Pan**              | 极快速度的甩动镜头，常用于转场              |
| **变焦**     | **Zoom in / out**         | 仅仅焦距变化 (背景压缩感)，而非物理移动     |
| **希区柯克** | **Dolly Zoom**            | 推拉与变焦反向结合，产生眩晕/空间扭曲感     |

---

### 1.4 多镜头叙事 (Multi-shot Narrative)

Seedance 2.0 支持在**单次生成**中通过提示词控制分镜切换，保持角色高度一致。

**关键触发词**: `Cut to`, `Camera switch to`, `Lens switch`

**三镜头编排模板**:
```markdown
Shot 1: Close-up of @Image1 facing the window, sorrowful expression, rain falling on glass. (0s-3s)
Cut to Shot 2: Wide shot from behind, showing the vast dystopian city outside using @Image2 as background reference. (3s-7s)
Camera switch to Shot 3: Side profile, she turns her head slightly, lighting matches @Image3. (7s-10s)
```

---

## 🎨 Part 2: Seedream 5.0 (智能逻辑图像生成)

Seedream 5.0 (预览版) 的核心突破在于**逻辑理解**与**精准编辑**。

### 2.1 核心特性
1.  **逻辑推理 (Logical Reasoning)**: 能理解 "A在B左边"、"按类别分类排列" 等复杂指令。
2.  **材质/视角编辑**: 支持 "把玻璃瓶改成石头的" 或 "换个俯视角度" 而不改变物体结构。
3.  **实时检索**: 支持结合联网信息的生成 (如 "生成一张关于昨天SpaceX发射的新闻图")。

### 2.2 提示词策略

*   **逻辑优先**: 放弃堆砌形容词，改用**自然语言逻辑句**。
    *   *Bad*: `apple, banana, table, photorealistic`
    *   *Good*: "桌子上放着两个水果，左边是一个红苹果，右边是一根香蕉。苹果比香蕉大一点。"
*   **多图参照**: 利用 @Image 进行风格迁移或布局参考。

### 2.3 局限性与版本选择
*   **追求极致逻辑/布局/控制** → 选 **Seedream 5.0-Preview**
*   **追求极致唯美/艺术/自然感** → 选 **Seedream 4.5**
*   **追求极简/低成本** → 选 **Seedream 3.1**

---

## 🛠️ 调试与最佳实践 (Debug & Best Practices)

1.  **Drift (漂移) 控制**:
    *   如果视频后半段崩坏，尝试缩短 prompt 中的动作描述，或者将 `Motion` 参数调低。
    *   增加 `Constraint` (约束) 语句，如 "Keep background static", "Character appearance consistent".

2.  **分辨率原则**:
    *   输入素材 (@Image) 请务必使用 **2K (2048px)** 以上清晰度，否则生成的视频会自带模糊感。
    *   生成图片建议默认 **9:16 (1080x1920)** 以适配 Shorts。

3.  **音频驱动技巧**:
    *   使用 @Audio 时，Prompt 中即使不写 "singing"，AI 也会尝试对口型。如果不想对口型，请显式注明 "No lip sync, contextual mood only".
