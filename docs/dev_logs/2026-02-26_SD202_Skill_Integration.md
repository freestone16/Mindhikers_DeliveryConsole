# 2026-02-26 SD-202 Director Skill 能力接入改造

## 背景
Director 模块的所有 LLM 调用都是"裸调"——没有注入任何 Antigravity 专家方法论。Phase 1 Generate 甚至是100%硬编码静态字符串。

## 变更清单

### 新增文件
| 文件                     | 说明                                                                            |
| ------------------------ | ------------------------------------------------------------------------------- |
| `server/skill-loader.ts` | Skill 加载中间件，从 `~/.gemini/antigravity/skills/` 读取 SKILL.md，带5分钟缓存 |

### 修改文件
| 文件                                      | 变更                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `server/director.ts`                      | Phase 1 generate 从硬编码改为真正读取脚本+LLM；revise 注入 Director 知识；thumbnail 增加 SiliconFlow 通道 |
| `server/llm.ts`                           | B-roll prompt 从静态改为 skill-loader 注入；去掉强制3均分，改为智能分配；增加 rationale 字段              |
| `server/skill-loader.ts`                  | 构建 concept/broll/revise 三种 system prompt，注入 Director 方法论                                        |
| `src/components/director/ChapterCard.tsx` | 支持 generative 类型颜色/标签；Artlist 隐藏预览按钮；显示 rationale                                       |
| `src/types.ts`                            | BRollType 增加 generative；SceneOption 增加 rationale 字段                                                |
| `package.json`                            | dev 脚本从 `tsx` 改为 `tsx watch`，支持后端热更新                                                         |

## 架构变化

```
Before:  director.ts → hardcoded string / generic LLM prompt
After:   director.ts → skill-loader.ts → SKILL.md files → enriched LLM prompt
```

## 验证结果
- Phase 2 成功生成 24 个场景，B-roll 类型分布不再均匀，而是根据内容智能分配
- Artlist 类型正确隐藏预览按钮
- SiliconFlow 缩略图生成通道正常工作
- tsx watch 自动热更新生效
