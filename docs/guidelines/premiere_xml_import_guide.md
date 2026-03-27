# Premiere Pro XML 导入简明手册

> MindHikers 导演大师 Phase4 输出 → Premiere Pro 导入

---

## 一、前置准备

1. **确认素材路径**：Phase4 生成的 XML 会引用 B-roll 视频/图片的**本机绝对路径**。确保这些文件在你的电脑上存在且路径正确。
2. **项目目录结构**：
   ```
   Projects/CSET-XXX/
   ├── 04_Visuals/
   │   ├── rendered/          ← Phase3 渲染的视频文件
   │   ├── premiere_timeline.xml   ← Phase4 生成的 Premiere XML
   │   └── jianying_draft.json     ← Phase4 生成的剪映草稿（可选）
   └── audio/
       └── *.srt              ← 字幕文件（Phase4 对齐用）
   ```

---

## 二、导入步骤（3 步）

### Step 1：打开 Premiere Pro

- 新建项目 或 打开已有项目
- 建议分辨率设置 **1920×1080**，帧率 **30fps**

### Step 2：导入 XML

- 菜单栏 → **文件 → 导入**（快捷键 `Cmd+I` / `Ctrl+I`）
- 选择 `premiere_timeline.xml` 文件
- Premiere 会自动创建**序列**和**导入所有引用的媒体文件**

> 如果弹出"媒体离线"对话框，说明某些视频文件路径不匹配。点击**定位**，手动指向正确的文件夹。

### Step 3：检查时间线

导入后你会看到：
- **V1 轨道**：B-roll 视频片段，按字幕时间戳自动对齐
- **A1 轨道**：如果有配音/音频，会在音频轨
- 每个片段的入点/出点已按 SRT 时间码设置

---

## 三、常见问题

### Q：导入后部分素材显示"离线"？

**A**：素材路径不对。右键离线素材 → **链接媒体** → 定位到 `04_Visuals/rendered/` 文件夹。Premiere 会自动匹配同名文件。

### Q：时间线上片段顺序不对？

**A**：检查 Phase4 的 SRT 对齐结果。在 DC 界面的 Phase4 页面可以看到每个 B-roll 对应的时间段。

### Q：想调整某个 B-roll 的时长？

**A**：直接在 Premiere 时间线上拖拽片段边缘即可。XML 导入后就是普通的 Premiere 序列，可以自由编辑。

### Q：分辨率不匹配？

**A**：如果 Premiere 提示"剪辑大小与序列不匹配"，右键序列 → **序列设置** → 确认是 1920×1080。

---

## 四、推荐工作流

```
Phase3 渲染完成
    ↓
Phase4 对齐 SRT + 生成 XML
    ↓
导入 Premiere（Cmd+I → 选 XML）
    ↓
在时间线上微调：
  - 调整 B-roll 入出点
  - 添加转场效果
  - 叠加配音/BGM 轨道
  - 添加字幕（导入 SRT）
    ↓
导出成片
```

---

## 五、快捷键速查

| 操作 | Mac | Windows |
|---|---|---|
| 导入文件 | `Cmd+I` | `Ctrl+I` |
| 剃刀工具（裁切） | `C` | `C` |
| 选择工具 | `V` | `V` |
| 播放/暂停 | `Space` | `Space` |
| 添加默认转场 | `Cmd+D` | `Ctrl+D` |
| 适配序列 | `Cmd+0` | `Ctrl+0` |

---

*最后更新：2026-03-26*
