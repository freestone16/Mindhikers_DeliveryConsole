**时间**: 2026-04-27 14:50 CST
**分支**: `MHSDC-DC-director`

# HANDOFF — Director 模块

## 一句话接力

本窗口完成 SSOT 迁移：导演大师涉及的 5 个 skill 已从 `~/.gemini/antigravity/skills/` copy 到 `/Users/luzhoua/Mindhikers/.claude/skills/`，`.env` 与 `skill-loader.ts` 已切到新 SSOT 并经服务启动日志验证生效；旧 SSOT 一字未动，零删除。前面老卢提的 3 件 UI 优化（footer 右对齐 / 运行态显示真实 skill 列表 / chat 紧凑化）**本窗口未动手**，让位给 SSOT 迁移，留给下一窗口。

## 当前事实

- 当前 worktree: `/Users/luzhoua/MHSDC/DeliveryConsole/Director`
- 当前分支: `MHSDC-DC-director`
- 服务运行中：后端 `http://127.0.0.1:3005`、前端 `http://localhost:5178/`（启动 PID 见 `/tmp/director-dev.log`）
- 工作树：有未 commit 改动（含 v4.3.3 残留 + 本轮 SSOT 改动）
- 日志铁证（启动时打印）：
  - `✅ RemotionStudio reachable: /Users/luzhoua/Mindhikers/.claude/skills/RemotionStudio`
  - `✅ svg-architect reachable: /Users/luzhoua/Mindhikers/.claude/skills/svg-architect`
  - `✅ Skill Sync Complete. Synced: 6/7`

## 本窗口已完成（未 commit）

### 1. 物理迁移到 Mindhikers/.claude/skills/

| Skill | 来源 | 大小 | 备注 |
|---|---|---|---|
| `Director/` | `~/.gemini/antigravity/skills/Director/` | 88 KB | 完整版（SKILL.md + prompts/ + resources/ + workflows/） |
| `RemotionStudio/` | 同源（rsync 排除） | **610 MB** | 排除 `out/ renders/ payloads/ test_file.mp4 test_payload.json render_*.sh run_verification.js` |
| `svg-architect/` | 同源 | 96 KB | Python 工具技能 |
| `remotion-best-practices/` | 同源 | 188 KB | Remotion 红线手册 |
| `remotion-visual-qa/` | 同源 | 8 KB | 视觉 QA 协议 |

冲突处理：原 `Mindhikers/.claude/skills/Director/` 是 stub（SKILL.md 5.9KB + references/ + workflows/，无 prompts/ 无 resources/），已重命名为 `Director.stub-bk-20260427/` 备份保留，再把完整版 copy 进 `Director/`。

旧 SSOT (`~/.gemini/antigravity/skills/`) **零变动**。GoldenCrucibleLab 等其他消费方继续用旧路径，零中断。

### 2. .env 切换 SSOT

```diff
- SKILLS_BASE=/Users/luzhoua/.gemini/antigravity/skills
- REMOTION_STUDIO_DIR=/Users/luzhoua/.gemini/antigravity/skills/RemotionStudio
+ SKILLS_BASE=/Users/luzhoua/Mindhikers/.claude/skills
+ REMOTION_STUDIO_DIR=/Users/luzhoua/Mindhikers/.claude/skills/RemotionStudio
```

### 3. server/skill-loader.ts 移除硬编码 .gemini fallback

- 删除顶层常量 `SKILL_SEARCH_PATHS`（曾把 `~/.gemini/antigravity/skills` 写死为第一优先级）
- 改用 `getSkillSearchPaths()` 函数：每次调用时读 `process.env.SKILLS_BASE`，避免 ESM 顶层缓存早于 dotenv.config() 的陷阱（rules.md #7）
- 全文 7 处引用统一替换为 `getSkillSearchPaths()`

## 本窗口刻意没做（重要 — 下一窗口要做）

老卢之前点了头要做的 3 件 UI 优化，这一窗口为了让 SSOT 迁移结构清晰，**全部跳过**了。下一窗口必须接着做：

1. **底部 `DeliveryStatusBar` 改造**（确认方案：保留 footer，内容右对齐）
   - 移除：LLM provider/model、RemotionStudio、版本号
   - 保留：DIRECTOR ONLINE 圆点 + 生成中计时
   - 文件：`src/components/delivery-shell/DeliveryStatusBar.tsx`

2. **`RuntimePanel` 改造**（确认方案：只显示 skill 列表）
   - 删除写死的 `SkillInfoCard`（"Director Skill v2.1 / doubao-seedream / seedance-v4"）
   - 新增"已同步 Skills"区块：订阅 socket 事件 `skill-sync-status`，显示真实的 6/7 sync 状态
   - 把 LLM 模型、RemotionStudio、版本号 三项从底部状态栏迁过来
   - 文件：`src/components/delivery-shell/drawer/RuntimePanel.tsx` + `ContextDrawer.tsx`（订阅 socket 事件）

3. **右栏 ChatPanel 紧凑化**
   - `.shell-drawer__content { padding: 16px }` 在 chat tab 下收成 0
   - 文件：`src/styles/delivery-shell.css`

## 已知 Caveat

### Skill Sync 显示 6/7（缺 ThumbnailMaster）

`server/skill-sync.ts` 的 `EXPERTS` 数组期望 5 个专家全在 SSOT：
```ts
['Director', 'MusicDirector', 'ThumbnailMaster', 'ShortsMaster', 'MarketingMaster']
```

Mindhikers/.claude/skills/ 下：
- ✅ Director（本轮新 copy 的完整版）
- ✅ MusicDirector（旧有 stub）
- ✅ ShortsMaster（旧有 stub）
- ✅ MarketingMaster（旧有 stub）
- ❌ **ThumbnailMaster**（不存在）

→ Sync 实际为 6/7（缺 1 个专家 + RemotionStudio + svg-architect）

**当前影响**：切换到"缩略图大师"专家时，ChatPanel 会读不到 SKILL.md，退化到通用助手兜底。导演大师工作流不受影响。

**修复方案**（如需）：从 `~/.gemini/antigravity/skills/ThumbnailMaster/` cp 一份过去（用户 Q1=C 范围里没勾这个，所以本轮不动）。

### 3 个 server 文件仍残留 .gemini 硬编码 fallback（功能不受影响）

未清理：
- `server/svg-architect.ts:19` — `path.join(os.homedir(), '.gemini/antigravity/skills')`
- `server/director.ts:687` — RemotionStudio 第三优先级 fallback
- `server/skill-sync.ts:91, 106` — RemotionStudio / svg-architect 第三优先级 fallback

**为什么不影响功能**：这三处都是候选数组的最后一项，且 `SKILLS_BASE` 在第一优先级且 Mindhikers 新路径文件齐全，永远会先命中新 SSOT，旧路径不会被走到。日志已证实。

**遗留它的代价**：违反 rules.md #8（路径解析必须统一走 helper，禁止各自硬编码）。下一窗口顺手清理。

### 旧 SSOT 完整保留

`~/.gemini/antigravity/skills/` 一字未动。GoldenCrucibleLab 仍消费旧路径，零中断。

## 验证清单（老卢自验时参考）

- [ ] 浏览器打开 `http://localhost:5178/`，进入 Director Phase2
- [ ] 后端日志中确认 `RemotionStudio reachable: /Users/luzhoua/Mindhikers/.claude/skills/RemotionStudio`
- [ ] Phase2 生成视觉方案：能正常拉起 LLM、能渲染预览图（说明 Director Skill 加载链路从新 SSOT 正常）
- [ ] Chatbox 修改某条方案：能跑通 `update_option_fields` 工具调用（说明 prompts/chat_edit.md 从新 SSOT 加载）
- [ ] 浏览器右栏切到"运行态"tab：注意当前还是写死的 SkillInfoCard，**不是真实 sync 状态** — 这部分待下一窗口改

## 下一窗口启动必读

```bash
cd /Users/luzhoua/MHSDC/DeliveryConsole/Director
git branch --show-current        # 应返回 MHSDC-DC-director
lsof -i :3005 -i :5178           # 应都在线
tail -50 /tmp/director-dev.log   # 看最近一次启动日志
```

必读：
- `docs/dev_logs/HANDOFF.md`（本文件）
- `docs/04_progress/rules.md`
- `docs/04_progress/dev_progress.md`

## 本轮文件清单

| 文件 | 改动 |
|---|---|
| `.env` | `SKILLS_BASE` + `REMOTION_STUDIO_DIR` 切换到 Mindhikers |
| `server/skill-loader.ts` | 删 SKILL_SEARCH_PATHS 常量 + 改 getSkillSearchPaths() lazy 函数 + 7 处引用替换 |
| `/Users/luzhoua/Mindhikers/.claude/skills/Director/` | 新增（替换原 stub，stub 备份至 `Director.stub-bk-20260427/`） |
| `/Users/luzhoua/Mindhikers/.claude/skills/RemotionStudio/` | 新增（610M，rsync 排除测试产物） |
| `/Users/luzhoua/Mindhikers/.claude/skills/svg-architect/` | 新增 |
| `/Users/luzhoua/Mindhikers/.claude/skills/remotion-best-practices/` | 新增 |
| `/Users/luzhoua/Mindhikers/.claude/skills/remotion-visual-qa/` | 新增 |
| `docs/04_progress/dev_progress.md` | 追加 v4.4.0 |
| `docs/04_progress/rules.md` | 追加 SSOT 切换条目（rule #134-135） |
| `docs/dev_logs/HANDOFF.md` | 覆盖写本文件 |
