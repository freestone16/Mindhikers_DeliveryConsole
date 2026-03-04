# L-008 - 选择文件后未重置 phase

**日期**：2026-03-03
**分类**：状态管理

---

## 问题

- 选择文件后，直接跳转到之前失败的 Phase 2 页面
- 没有从 Phase 1 重新开始，显示旧的"兜底方案"内容

---

## 根本原因

- `/api/scripts/select` 端点只重置了 `conceptProposal` 和 `isConceptApproved`
- 没有重置 `phase`、`items`、`renderJobs` 等数据

---

## 修复

```typescript
if (deliveryData.modules?.director) {
    // 重置 Director 到 Phase 1，清空所有缓存数据
    deliveryData.modules.director.phase = 1;
    deliveryData.modules.director.conceptProposal = "";
    deliveryData.modules.director.conceptFeedback = "";
    deliveryData.modules.director.isConceptApproved = false;
    deliveryData.modules.director.items = [];
    deliveryData.modules.director.renderJobs = [];
}
```

---

## 相关规则

- 选择新文件 = 重置所有状态
- 切换项目时清除临时状态文件
- 状态重置清单：phase、proposals、feedback、approved、items、jobs

---

## 相关文件

- `server/index.ts:1018-1040` - `/api/scripts/select` 端点
