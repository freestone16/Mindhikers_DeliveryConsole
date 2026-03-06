# 方案：Director Phase 2 批量勾选 Excel 三态逻辑重构

## 🐛 Bug 根因分析

现有架构下，点击"勾选当前显示的全部方案"时，`forEach` 循环会对每个符合条件的 option 调用 `onToggleCheck`。
由于每次调用都会读取同一份 stale `displayedChapters` 状态快照进行更新，导致 **React State 竞态条件**。在同一批次的 setState 队列中，只有循环的最后一次 toggle 存活，表现为"每点一次只增加 1 个勾选"。

## 🎯 遵循 UX 设计原则

根据 `docs/guidelines/ux_design_principles.md`：
- **原则 1：沿用知名软件逻辑**。以自媒体创作者的心智，表格批量操作的首选是 Excel。表头应该提供一个唯一的 Checkbox，而不是分散的两个按钮（"全选"/"取消"）。
- **原则 3：操作原子性**。批量操作必须一次 setState 完成，杜绝循环单个更新。

## 🛠️ 改造方案

### 1. `DirectorSection.tsx` (状态层)

**新增单次批量更新接口**：避免多次触发 `updateState`。

```tsx
// 在 src/components/DirectorSection.tsx 内补充
const handleBatchSetCheck = (filterFn: (opt: SceneOption) => boolean, checked: boolean) => {
  const updated = displayedChapters.map(ch => ({
    ...ch,
    options: ch.options.map(opt =>
      filterFn(opt) ? { ...opt, isChecked: checked } : opt
    )
  }));
  setLocalChapters(null);
  onUpdate({ ...data, items: updated });
};
```
将 `handleBatchSetCheck` 作为 props 传给 `Phase2View`。

### 2. `Phase2View.tsx` (表示层 & 交互层)

**替换两颗批量按钮为独立的 Excel 式表头**：
计算勾选逻辑，实现三态（空/满/半选）。

```tsx
// 移除原有的 "勾选当前显示的全部方案" 和 "取消勾选当前显示的方案" 按钮
// 替换成以下 Checkbox 结构 (放置在适当的 Header / Toolbar 区域)
<label className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors group">
  <input
    type="checkbox"
    className="w-4 h-4 cursor-pointer accent-blue-500 rounded border-slate-600 bg-slate-800"
    // 设置半选状态
    ref={el => {
      if (el) el.indeterminate = visibleCheckedCount > 0 && visibleCheckedCount < visibleOptionsCount;
    }}
    // 如果全部被选中，则显示选中
    checked={visibleCheckedCount === visibleOptionsCount && visibleOptionsCount > 0}
    onChange={(e) => {
      const isChecked = e.target.checked;
      onBatchSetCheck(
        (opt) => matchesFilter(opt.type),
        isChecked
      );
    }}
  />
  <span className="text-sm text-slate-400 group-hover:text-slate-300 select-none">
    全选当前视图方案 ({visibleCheckedCount}/{visibleOptionsCount})
  </span>
</label>
```

## ✅ Verification Plan (验证方法)

1. 打开 Director Phase 2，确保有多个素材可见。
2. **测试全选**：点击该 Checkbox，所有当前视图卡片被一次性全部勾选（36/36），且计数器同步。
3. **测试取消全选**：再次点击，所有勾选被一次性取消。
4. **测试半选联动（Indeterminate）**：手动在单个卡片上点击勾选，Checkbox 应显示 `-` (或者半选中态)，再点一次 Checkbox，则变为全选。
