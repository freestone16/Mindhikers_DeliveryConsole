# Lessons Index - 案例索引

> **快速定位详细案例**
> **精炼规则见 `rules.md`**

---

## 按分类索引

### 通用开发
| ID    | 问题                   | 文件                                     |
| ----- | ---------------------- | ---------------------------------------- |
| L-001 | 不要擅自修改 .env 路径 | [L-001-env-path.md](./L-001-env-path.md) |

### 环境配置
| ID    | 问题                      | 文件                                           |
| ----- | ------------------------- | ---------------------------------------------- |
| L-009 | .env 中文注释导致解析失败 | [L-009-env-chinese.md](./L-009-env-chinese.md) |

### 文件操作
| ID    | 问题                     | 文件                                               |
| ----- | ------------------------ | -------------------------------------------------- |
| L-006 | llm.ts 被 Write 工具覆盖 | [L-006-llm-overwrite.md](./L-006-llm-overwrite.md) |

### 版本恢复
| ID    | 问题                     | 文件                                                   |
| ----- | ------------------------ | ------------------------------------------------------ |
| L-007 | 恢复版本时不要添加新修改 | [L-007-version-restore.md](./L-007-version-restore.md) |

### 前端开发
| ID    | 问题                         | 文件                                           |
| ----- | ---------------------------- | ---------------------------------------------- |
| L-005 | 类型导入必须使用 import type | [L-005-import-type.md](./L-005-import-type.md) |

### 状态管理
| ID    | 问题                   | 文件                                           |
| ----- | ---------------------- | ---------------------------------------------- |
| L-008 | 选择文件后未重置 phase | [L-008-phase-reset.md](./L-008-phase-reset.md) |

### SSE 事件处理
| ID    | 问题                   | 文件                                       |
| ----- | ---------------------- | ------------------------------------------ |
| L-003 | SSE 错误消息被前端吞噬 | [L-003-sse-error.md](./L-003-sse-error.md) |

### 火山引擎集成
| ID    | 问题                                  | 文件                                                                                               |
| ----- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| L-002 | 文生图预览图生成失败                  | [L-002-volcengine-image.md](./L-002-volcengine-image.md)                                           |
| L-011 | Phase2 文生视频预览图轮询缺失         | [L-011-phase2-seedance-thumbnail-polling-fix.md](./L-011-phase2-seedance-thumbnail-polling-fix.md) |
| L-012 | Phase2 火山引擎预览图轮询机制再次缺失 | [L-012-volcengine-polling-fix.md](./L-012-volcengine-polling-fix.md)                               |

### LLM API 调用
| ID    | 问题                                         | 文件                                                       |
| ----- | -------------------------------------------- | ---------------------------------------------------------- |
| L-013 | Phase2 LLM 调用不稳定（缺少超时）            | [L-013-llm-timeout-fix.md](./L-013-llm-timeout-fix.md)     |
| L-014 | 业务代码硬编码 Provider，Global 配置形同虚设 | [L-014-config-driven-llm.md](./L-014-config-driven-llm.md) |
| L-015 | 项目路径解析分散实现，worktree 冷启动时漂移  | [L-015-project-path-centralization.md](./L-015-project-path-centralization.md) |
| L-016 | 未自测主链路就交给用户，现场暴露配置与服务问题 | [L-016-handoff-selftest-before-user.md](./L-016-handoff-selftest-before-user.md) |
| L-017 | 软冒烟不足以证明主链路通过，必须验证真实产物 | [L-017-real-validation-over-soft-smoke.md](./L-017-real-validation-over-soft-smoke.md) |
| L-018 | 浏览器验收优先使用 Agent Browser | [L-018-agent-browser-for-web-validation.md](./L-018-agent-browser-for-web-validation.md) |
| L-019 | OpenCode `database is locked` 的安全恢复 | [L-019-opencode-database-locked-recovery.md](./L-019-opencode-database-locked-recovery.md) |
| L-020 | OpenCode 的 Agent Browser 需要 skill + CLI + Chrome 三件套 | [L-020-opencode-agent-browser-needs-cli.md](./L-020-opencode-agent-browser-needs-cli.md) |

### 服务器启动
| ID    | 问题                    | 文件                                             |
| ----- | ----------------------- | ------------------------------------------------ |
| L-004 | node_modules 平台不匹配 | [L-004-node-modules.md](./L-004-node-modules.md) |

### OpenCode 配置
| ID    | 问题                           | 文件                                                       |
| ----- | ------------------------------ | ---------------------------------------------------------- |
| L-010 | 自定义 Provider API Key 未传递 | [L-010-opencode-provider.md](./L-010-opencode-provider.md) |

---

## 按日期索引

| 日期       | 案例                                                   |
| ---------- | ------------------------------------------------------ |
| 2026-03-03 | L-001, L-002, L-003, L-004, L-005, L-006, L-007, L-008 |
| 2026-03-04 | L-009, L-010, L-011, L-012, L-013                      |
| 2026-03-05 | L-014                                                  |
| 2026-03-15 | L-015, L-016                                           |
| 2026-03-16 | L-017                                                  |
| 2026-03-16 | L-018                                                  |
| 2026-03-16 | L-019                                                  |
| 2026-03-16 | L-020                                                  |

---

## 搜索方式

**按关键词搜索**：
```bash
# 搜索所有包含 "env" 的案例
grep -r "env" docs/04_progress/lessons/

# 搜索所有包含 "LLM" 的案例
grep -r "LLM" docs/04_progress/lessons/
```

**按分类搜索**：
```bash
# 搜索所有前端相关案例
grep -l "前端" docs/04_progress/lessons/*.md
```
