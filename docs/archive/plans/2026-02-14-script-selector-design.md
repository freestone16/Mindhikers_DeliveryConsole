# Script Selector 设计文档

> **日期**: 2026-02-14
> **版本**: v1.0
> **状态**: Draft → Review

---

## 1. 目标

允许用户在项目中选择 `02_Script/` 目录下的文稿文件（.md），作为后续专家调用的输入源。

---

## 2. 用户流程

```
用户进入项目
    → 系统扫描 02_Script/*.md
    → 下拉框显示可选文稿列表
    → 用户选择一篇
    → 系统记录选中状态
    → 后续专家调用时读取此文稿
```

---

## 3. 技术设计

### 3.1 数据模型变更

**`delivery_store.json` 新增字段：**

```typescript
interface DeliveryState {
    projectId: string;
    selectedScript?: {
        filename: string;      // "CSET-SP3_深度文稿_v2.md"
        path: string;          // "02_Script/CSET-SP3_深度文稿_v2.md"
        selectedAt: string;    // "2026-02-14T15:00:00"
    };
    // ... existing fields
}
```

### 3.2 API 变更

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/scripts` | GET | 扫描当前项目 `02_Script/` 目录，返回 `.md` 文件列表 |
| `/api/scripts/select` | POST | 记录用户选中的文稿 |

**`GET /api/scripts` 响应：**
```json
{
    "scripts": [
        { "name": "文案_v1.md", "path": "02_Script/文案_v1.md", "size": 4500, "modifiedAt": "2026-02-13" },
        { "name": "文案_v2.md", "path": "02_Script/文案_v2.md", "size": 5200, "modifiedAt": "2026-02-14" }
    ],
    "selected": "02_Script/文案_v2.md"
}
```

**`POST /api/scripts/select` 请求：**
```json
{ "path": "02_Script/文案_v2.md" }
```

### 3.3 前端组件

**位置**: `Header.tsx` 项目选择器旁边

**UI**:
```
[项目: CSET-SP3 ▼]  [文稿: 文案_v2.md ▼]
```

**组件变更**:
- `Header.tsx`: 新增文稿下拉选择器
- `types.ts`: 扩展 `DeliveryState` 接口
- `useDeliveryStore.ts`: 新增 `selectScript()` 方法

### 3.4 后端变更

**`server/index.ts`**:
- 新增 `GET /api/scripts` 端点
- 新增 `POST /api/scripts/select` 端点
- 项目切换时重置 selectedScript

---

## 4. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types.ts` | 修改 | 扩展 DeliveryState |
| `src/components/Header.tsx` | 修改 | 新增文稿选择器 |
| `src/hooks/useDeliveryStore.ts` | 修改 | 新增 selectScript |
| `server/index.ts` | 修改 | 新增两个 API 端点 |

---

## 5. 验收标准

1. 进入项目后，文稿下拉框显示 `02_Script/` 下所有 `.md` 文件
2. 选择文稿后，状态保存到 `delivery_store.json`
3. 刷新页面后，选中状态保持
4. 切换项目后，文稿列表更新，选中状态重置
5. 无文稿时显示"暂无文稿"

---

## 6. 后续扩展（暂不实现）

- 方案3：上传外部文件到 `02_Script/`
- 文稿预览功能
- 文稿内容对比
