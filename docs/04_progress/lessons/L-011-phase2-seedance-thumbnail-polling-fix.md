# L-010: Phase2 文生视频预览图轮询缺失

**日期**: 2026-03-04
**模块**: Director / Phase2 / 预览图生成
**严重程度**: 高（功能完全不可用）

---

## 问题描述

用户点击 Phase2 中 seedance 类型（文生视频）的选项生成预览图时：
- 前端显示「失败 重试生成」
- 再次点击瞬间闪一下再次失败
- 火山引擎 API 调用成功，但状态永不更新

---

## 根因分析

### 错误流程

```
1. 用户点击 seedance 类型选项
2. 前端调用 POST /api/director/phase2/thumbnail
3. 后端 generateThumbnail() 函数：
   a. 调用 generateImageWithVolc()
   b. 火山引擎返回 task_id（异步任务）
   c. 设置 task.status = 'pending'
   d. ❌ 返回响应，但没有启动轮询！
4. 前端收到 taskId，开始轮询 GET /api/director/phase2/thumbnail/{taskKey}
5. 后端 getThumbnailStatus() 返回 status: 'pending'
6. 前端继续轮询...永远得不到结果
```

### 核心问题

**缺少火山引擎任务轮询机制**

代码位置：`server/director.ts:815-840`

```typescript
(async () => {
  try {
    const result = await generateImageWithVolc(option.imagePrompt || option.prompt || '');
    const task = thumbnailTasks.get(taskKey);
    if (task) {
      if (result.image_url) {
        task.status = 'completed';
        task.imageUrl = result.image_url;
      } else if (result.task_id) {
        task.taskId = result.task_id;
        task.status = 'pending';
        // ❌ 缺少：启动 pollVolcImageResult() 轮询
      }
    }
  }
})();
```

---

## 修复方案

### 修改文件

`server/director.ts:815-868`

### 修复逻辑

当火山引擎返回 `task_id` 时，启动后台轮询任务：

```typescript
} else if (result.task_id) {
  task.taskId = result.task_id;
  task.status = 'pending';
  console.log(`[Volcengine Thumbnail] Pending: ${taskKey}, taskId=${result.task_id}`);

  // ✅ 启动轮询检查火山引擎任务状态
  const pollVolc = async () => {
    let pollCount = 0;
    const maxPolls = 30; // 最多轮询 30 次（60秒）

    while (pollCount < maxPolls) {
      pollCount++;
      const pollResult = await pollVolcImageResult(result.task_id);
      const currentTask = thumbnailTasks.get(taskKey);

      if (!currentTask) break; // 任务已被清理

      if (pollResult.status === 'completed' && pollResult.image_url) {
        currentTask.status = 'completed';
        currentTask.imageUrl = pollResult.image_url;
        console.log(`[Volcengine Thumbnail] Poll Success: ${taskKey} (${pollCount} polls)`);
        break;
      } else if (pollResult.status === 'failed') {
        currentTask.status = 'failed';
        currentTask.error = pollResult.error || 'Volcengine task failed';
        console.error(`[Volcengine Thumbnail] Poll Failed: ${taskKey}`, pollResult.error);
        break;
      } else if (pollResult.status === 'processing') {
        // 继续轮询
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (pollCount >= maxPolls) {
      const timeoutTask = thumbnailTasks.get(taskKey);
      if (timeoutTask) {
        timeoutTask.status = 'failed';
        timeoutTask.error = 'Timeout: Volcengine task did not complete within 60 seconds';
        console.error(`[Volcengine Thumbnail] Timeout: ${taskKey}`);
      }
    }
  };

  pollVolc().catch(err => {
    const errorTask = thumbnailTasks.get(taskKey);
    if (errorTask) {
      errorTask.status = 'failed';
      errorTask.error = `Poll error: ${err.message}`;
    }
    console.error(`[Volcengine Thumbnail] Poll Error: ${taskKey}`, err);
  });
}
```

### 轮询特性

- **轮询间隔**: 2 秒
- **最大轮询次数**: 30 次（60 秒）
- **超时处理**: 60 秒后标记为失败
- **状态处理**:
  - `completed` + `image_url`: 标记完成，保存图片 URL
  - `failed`: 标记失败，保存错误信息
  - `processing`: 继续轮询
  - 其他状态: 标记失败，记录未知状态

---

## 预防规则

### 1. 异步任务必须启动轮询

当调用外部 API 返回 `task_id` 时，**必须立即启动后台轮询任务**来跟踪状态。

**检查清单**：
- [ ] API 返回 task_id 后是否有轮询代码？
- [ ] 轮询是否会更新共享状态（如 `thumbnailTasks`）？
- [ ] 是否有超时机制防止无限轮询？
- [ ] 前端轮询端点是否能读到更新后的状态？

### 2. 前后端状态同步

**前端轮询 + 后端轮询** 模式必须保证数据流完整：

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   前端     │────────▶│  后端 API  │────────▶│  外部服务  │
│  (轮询)    │◀────────│  (轮询)    │◀────────│  (任务)    │
└─────────────┘         └─────────────┘         └─────────────┘
    ↑                                               │
    │                                               │
    └──── 前端读取到后端更新后的状态 ◀──────────────┘
```

**关键点**：
- 后端必须定期更新共享状态（`thumbnailTasks`）
- 前端轮询端点必须返回共享状态
- 两边的轮询都应该是独立的，不互相阻塞

### 3. 日志记录

异步任务必须有详细日志，便于排查问题：

```typescript
console.log(`[Module] Pending: ${taskKey}, taskId=${taskId}`);
console.log(`[Module] Poll Success: ${taskKey} (${count} polls)`);
console.error(`[Module] Poll Failed: ${taskKey}`, error);
console.error(`[Module] Timeout: ${taskKey}`);
```

---

## 相关文件

- `server/director.ts:815-868` - generateThumbnail 函数
- `server/volcengine.ts:101-135` - pollVolcImageResult 函数
- `src/components/director/ChapterCard.tsx:113-135` - 前端轮询逻辑
