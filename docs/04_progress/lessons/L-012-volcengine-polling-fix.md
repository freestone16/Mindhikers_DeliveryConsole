# L-012: Phase2 火山引擎预览图轮询机制再次缺失

**日期**: 2026-03-04
**模块**: Director / Phase2 / 预览图生成
**严重程度**: 高（功能完全不可用）

---

## 问题描述

用户报告 Phase2 中 seedance 类型（文生视频）的预览图生成 100% 失败：
- 点击生成后一直显示 loading
- 前端轮询但永远得不到结果
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

### 历史重复

- **L-011**: 2026-03-04 之前已经记录过同样的问题
- 本次发现修复代码不存在，可能是：
  1. 修复没有正确提交
  2. 代码被意外回退
  3. 修复记录与实际代码不同步

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

---

## 预防规则

### 1. 异步任务必须启动轮询

当调用外部 API 返回 `task_id` 时，**必须立即启动后台轮询任务**来跟踪状态。

**检查清单**：
- [ ] API 返回 task_id 后是否有轮询代码？
- [ ] 轮询是否会更新共享状态（如 `thumbnailTasks`）？
- [ ] 是否有超时机制防止无限轮询？
- [ ] 前端轮询端点能否读到更新后的状态？

### 2. Lessons 同步验证

修复代码后，必须验证 lessons 记录与实际代码一致：
- [ ] lessons 中记录的修复是否确实存在于代码中
- [ ] 代码中是否有 lessons 中提到的关键检查点
- [ ] 如不一致，更新 lessons 或修复代码

### 3. 自动化测试

为关键功能添加自动化测试，防止代码回退：

```javascript
// test_volc_polling.js
const checks = {
  '轮询循环': directorCode.includes('while (pollCount < maxPolls)'),
  '轮询调用': directorCode.includes('const pollResult = await pollVolcImageResult'),
  '完成状态更新': directorCode.includes('currentTask.status = \'completed\''),
  // ...
};
```

---

## 相关文件

- `server/director.ts:815-868` - generateThumbnail 函数
- `server/volcengine.ts:101-135` - pollVolcImageResult 函数
- `src/components/director/ChapterCard.tsx:113-135` - 前端轮询逻辑
- `test_volc_polling.js` - 自动化测试脚本
