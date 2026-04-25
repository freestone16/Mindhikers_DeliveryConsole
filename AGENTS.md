# MarketingMaster Agent Rules

## 1. Scope

当前目录是 `S2` 治理入口：DeliveryConsole 下的 MarketingMaster 模块入口。

- 路径：`/Users/luzhoua/MHSDC/DeliveryConsole/MarketingMaster`
- 个人全局入口：`/Users/luzhoua/.codex/AGENTS.md`
- 上层入口：`/Users/luzhoua/MHSDC/DeliveryConsole/AGENTS.md`

这里使用薄入口，不复制全局治理总纲，也不写任何单一平台的工具映射。

## 2. OldYang First

凡是工程、架构、实现、分支、测试、交接或项目治理任务，默认先经 `OldYang`。

`OldYang` 的唯一事实来源是：`/Users/luzhoua/.codex/skills/OldYang/SKILL.md`。

## 3. Read Order

1. 当前文件 `AGENTS.md`
2. 当前目录的 `docs/dev_logs/HANDOFF.md`（如果存在）
3. 当前目录的 `docs/plans/`（如果存在）
4. 当前目录的规则文件（如 `docs/04_progress/rules.md` 或 `docs/rules.md`）
5. 当前目录的 `testing/README.md` 与 `testing/OPENCODE_INIT.md`（仅在涉及测试时）
6. 上层入口 `/Users/luzhoua/MHSDC/DeliveryConsole/AGENTS.md`（仅当当前层信息不足时）

当前层信息足够时停止下钻，不为“更完整”而盲目扩读。

## 4. Local Red Lines

1. 不要再沿用重型旧模板或单一平台工具映射。
2. 先读取模块自身 handoff；模块信息不足时，再回看 DeliveryConsole 工作面入口。
3. 涉及内容、营销或分发链路时，先确认它和 Director / Shorts / Thumbnail 的边界。

## 5. References

1. 个人全局入口：`/Users/luzhoua/.codex/AGENTS.md`
2. 上层入口：`/Users/luzhoua/MHSDC/DeliveryConsole/AGENTS.md`
3. 通用项目初始化协议：`/Users/luzhoua/.codex/project-governance/project-initialization-protocol.md`
4. 通用项目登记模板：`/Users/luzhoua/.codex/project-governance/project-registration-template.md`
5. 通用项目初始化脚本：`/Users/luzhoua/.codex/project-governance/project-init.sh`
