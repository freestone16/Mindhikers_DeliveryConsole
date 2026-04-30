Last updated: 2026-04-30 17:30 CST
Branch: `MHSDC-GC-SAAS-staging`
Scope: `/Users/luzhoua/MHSDC/GoldenCrucible-SaaS`

---

# GoldenCrucible-SaaS Handoff

## 当前一句话

SaaS staging 已接收并部署 SSE 壳层迁移，Roundtable 入口已按老卢确认露出；当前 SaaS 线等待 SSE 完成治理收口后，再接收后续 shell/status polish 小切片。

## 已完成事实

### 1. Shell migration 已接入 staging

- 未整枝 merge SSE。
- 从 `MHSDC-GC-SAAS-staging` 创建接收分支 `codex/saas-shell-staging-apply`。
- 已 cherry-pick 并合入：
  - `e17f5d2 refs MIN-136 feat: checkpoint SaaS shell slice integration`
  - `e610631 refs MIN-136 fix: allow placeholder database URL during shell validation`
- 已 fast-forward 回 `MHSDC-GC-SAAS-staging` 并 push 到 origin。

### 2. Railway snapshot 修复已完成

- 初始失败点：`Initialization > Snapshot code`。
- 根因方向：Railway code snapshot 可能吃到本地 agent/worktree metadata。
- 修复 commit：
  - `14a7a3e refs MIN-136 fix: exclude local agent metadata from Railway snapshot`
- 修复后 Railway staging build 和 healthcheck 通过。

### 3. Staging smoke 已完成

线上 staging agent-browser 验证结果：

- 未登录 `/`：认证页正常。
- 登录后 `/` / `/m/crucible`：新 Shell 可见。
- 左侧模块：`炼制` 与 `圆桌` 均可见。
- `/m/roundtable`：可进入，显示输入命题与开始圆桌按钮。
- `/llm-config`：BYOK 配置页正常。
- Errors：无 page error。
- Console：无 Hooks error / ShellErrorBoundary。
- Network：请求走 `golden-crucible-saas-staging.up.railway.app` 同源，无非预期 localhost 直连。

## 当前边界

1. SaaS staging 当前不是下一步功能开发起点。
2. 后续 shell/status polish 必须先在 SSE 实现和验证。
3. SaaS staging 只接收经过 SSE 验证的小切片 cherry-pick。
4. Roundtable backend API 尚未完整接入；当前完成的是壳层入口、页面可见性与 staging 部署。
5. Roundtable 当前是模块 / runtime capability，不是 synced standalone skill。
6. 当前 synced skill 集合是 `Writer`、`ThesisWriter`、`Researcher`、`FactChecker`、`Socrates`。

## 当前 stash

共享 stash 中仍有历史现场，禁止混入治理或 shell/status polish：

```text
stash@{1}: On MHSDC-GC-SAAS-staging: codex pre shell staging apply cleanup 2026-04-29
```

本轮不查看、不应用、不删除。

## 下一步

等待 SSE 完成治理 Phase 0-3 后，下一实施窗口可在 SSE 创建：

```text
codex/gc-shell-status-polish
```

SSE 验证通过后，SaaS staging 再创建接收分支并 cherry-pick 单个 polish commit。

SaaS 侧接收时必须验证：

1. `npm run typecheck:saas`
2. `npm run build`
3. agent-browser staging:
   - `/`
   - `/m/crucible`
   - `/m/roundtable`
   - `/llm-config`
4. Network 无非预期 localhost 直连。

## 接管提示

新窗口接管先执行：

```bash
git branch --show-current
git status --short --branch
git log --oneline -5
```

期望：

- 分支：`MHSDC-GC-SAAS-staging`
- 状态：干净或仅有明确治理文档改动
- 下一功能切片来自 SSE，不从 SaaS staging 直接开发
