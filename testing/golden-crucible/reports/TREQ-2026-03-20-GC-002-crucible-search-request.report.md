# TREQ-2026-03-20-GC-002-crucible-search-request 测试报告

## 测试元数据

- **测试请求**: TREQ-2026-03-20-GC-002-crucible-search-request
- **测试模块**: GoldenCrucible
- **测试执行时间**: 2026-03-20T02:17:44.932Z
- **actual_model**: zhipuai-coding-plan/glm-5
- **browser_execution**: agent-browser
- **status**: **passed**

---

## 测试目标

验证当用户在黄金坩埚中明确提出"先联网搜索/看最新研究现状"时，系统是否仍能正常推进对话，并把搜索意图正确写入 runtime 证据链。

---

## 测试步骤执行情况

### 1. 使用 agent-browser 打开页面 ✅

**操作**: 打开 `http://127.0.0.1:5176/`  
**结果**: 成功加载页面  
**Evidence**: 
- `testing/golden-crucible/artifacts/TREQ-002-01-before-input.png`

### 2. 进入黄金坩埚模块 ✅

**操作**: 点击"黄金坩埚"按钮  
**结果**: 成功进入模块，显示苏格拉底工作流界面  
**Evidence**:
- `testing/golden-crucible/artifacts/TREQ-002-02-message-entered.png`

### 3. 输入测试文本并发送 ✅

**测试文本**: `我想先联网搜索一下这个议题的最新研究现状，再继续讨论。`  
**操作**: 在对话框输入文本并点击发送按钮  
**结果**: 消息成功发送，系统开始响应  
**Evidence**:
- `testing/golden-crucible/artifacts/TREQ-002-02-message-entered.png`

### 4. 等待页面完成第一轮响应 ✅

**操作**: 等待系统响应  
**结果**: 系统成功返回第一轮响应，未出现卡死、白屏或静默失败  
**Evidence**:
- `testing/golden-crucible/artifacts/TREQ-002-03-response-received.png`
- `testing/golden-crucible/artifacts/TREQ-002-04-final-state.png`

### 5. 读取 turn_log.json 验证搜索标记 ✅

**操作**: 读取 `runtime/crucible/golden-crucible-sandbox/turn_log.json`  
**结果**: 成功找到最新 turn 记录  
**Turn ID**: `turn_1773973064932`  
**Created At**: `2026-03-20T02:17:44.932Z`

---

## 关键验证点

### 1. 页面响应文本

**实际响应内容**:
```
好，我理解你想先看研究现状。但'这个议题'具体指什么？我们还没锁定要讨论的议题。
你刚才说'标题待定'，现在又说'这个议题'。在联网搜索之前，我们必须先明确：
我们到底要讨论什么？否则搜索会漫无边际，讨论也无法聚焦。请先定义一下你心中的
核心议题是什么。
```

**分析**:
- ✅ 系统成功承接了用户的"联网搜索"诉求
- ✅ 系统将流程拉回议题锁定阶段（Phase 0）
- ✅ 响应内容逻辑清晰，引导用户明确议题
- ✅ 未出现卡死、白屏或静默失败

### 2. Runtime 搜索标记验证

**Turn ID**: `turn_1773973064932`

| 验证项 | 期望值 | 实际值 | 结果 |
|--------|--------|--------|------|
| `meta.searchRequested` | `true` | `true` | ✅ 通过 |
| `meta.searchConnected` | `false` | `false` | ✅ 通过 |
| `orchestrator.toolRoutes[Researcher].mode` | `support` | `support` | ✅ 通过 |

**完整 orchestrator.toolRoutes 配置**:
```json
[
  {
    "tool": "Socrates",
    "mode": "primary",
    "reason": "第一轮先由 Socrates 做高压扫描，把命题里最值得继续追打的刺挑出来。"
  },
  {
    "tool": "Researcher",
    "mode": "support",
    "reason": "用户明确提到想看现状，Researcher 进入支援位，为后续补外部材料预留口子。"
  },
  {
    "tool": "FactChecker",
    "mode": "hold",
    "reason": "第一轮目标是找刺，不是先做事实校验。"
  },
  {
    "tool": "ThesisWriter",
    "mode": "hold",
    "reason": "当前还在定题阶段，尚未进入结晶写作。"
  }
]
```

### 3. 外部联网搜索状态

**是否真实发生外部联网搜索**: **否**

**证据**:
1. `meta.searchConnected: false` - 明确标记未接通外部搜索
2. Researcher 的 reason 说明："为后续补外部材料预留口子" - 表明只是预备位，尚未真实执行
3. 页面响应内容未包含任何外部搜索结果或引用

**当前版本行为**:
- ✅ 系统正确**识别**了用户的搜索诉求
- ✅ 系统正确**记录**了搜索意图到 runtime
- ✅ 系统正确**预留**了 Researcher 支援位
- ✅ 系统正确**未执行**真实的外部联网搜索
- ✅ 系统合理地将流程引导至议题锁定阶段

---

## 期望验证

### Expected 1: 页面可正常发送消息并返回第一轮回复 ✅

**结果**: 通过  
**证据**: 页面成功发送消息，系统返回响应，未出现卡死、白屏或静默失败

### Expected 2: 回复内容应能承接"先联网搜索"的诉求 ✅

**结果**: 通过  
**分析**: 系统回应了用户的搜索诉求，但将流程拉回议题锁定阶段，这是合理的设计

### Expected 3: turn_log.json 最新 turn 中必须出现指定标记 ✅

**结果**: 通过  
**验证**:
- `searchRequested: true` ✅
- `searchConnected: false` ✅
- `Researcher` 路由为 `support` ✅

### Expected 4: report 必须明确说明当前版本状态 ✅

**结果**: 通过  
**说明**:
- ✅ 当前版本"识别到了搜索诉求"
- ✅ 当前版本"尚未真实接通外部搜索"

### Expected 5: 判定为 passed ✅

**判定依据**:
- ✅ 页面响应成功
- ✅ runtime 标记正确
- ✅ report 没有混淆"识别搜索诉求"和"真实联网搜索"

---

## Evidence 清单

1. **截图证据**:
   - `testing/golden-crucible/artifacts/TREQ-002-01-before-input.png` - 输入前页面状态
   - `testing/golden-crucible/artifacts/TREQ-002-02-message-entered.png` - 消息输入后
   - `testing/golden-crucible/artifacts/TREQ-002-03-response-received.png` - 响应接收后
   - `testing/golden-crucible/artifacts/TREQ-002-04-final-state.png` - 最终页面状态

2. **Runtime 日志**:
   - `runtime/crucible/golden-crucible-sandbox/turn_log.json` - Turn ID: `turn_1773973064932`

---

## 测试结论

### 状态: **PASSED** ✅

**核心验证点**:
1. ✅ 页面可正常发送消息并返回第一轮回复，未出现卡死、白屏或静默失败
2. ✅ 回复内容承接了"先联网搜索"的诉求，并将流程拉回议题锁定阶段
3. ✅ `turn_log.json` 最新 turn 中正确记录了搜索标记：
   - `searchRequested: true`
   - `searchConnected: false`
   - `Researcher` 路由为 `support`
4. ✅ report 明确说明了：
   - 当前版本"识别到了搜索诉求"
   - 当前版本"尚未真实接通外部搜索"
5. ✅ 没有混淆"识别搜索诉求"和"真实联网搜索"

**关键发现**:
- 系统正确识别并记录了用户的搜索意图
- 系统采用了合理的流程控制：先完成议题锁定，再进行外部搜索
- Researcher 处于支援位，为后续真实搜索预留了接口
- 当前版本**未接通**外部搜索，但**已识别**搜索诉求，符合设计预期

---

## 附录

### 测试输入
```
我想先联网搜索一下这个议题的最新研究现状，再继续讨论。
```

### 系统响应
```
好，我理解你想先看研究现状。但'这个议题'具体指什么？我们还没锁定要讨论的议题。
你刚才说'标题待定'，现在又说'这个议题'。在联网搜索之前，我们必须先明确：
我们到底要讨论什么？否则搜索会漫无边际，讨论也无法聚焦。请先定义一下你心中的
核心议题是什么。
```

### Turn Log 关键片段
```json
{
  "turnId": "turn_1773973064932",
  "createdAt": "2026-03-20T02:17:44.932Z",
  "userInput": {
    "openingPrompt": "我想先联网搜索一下这个议题的最新研究现状，再继续讨论。",
    "latestUserReply": "我想先联网搜索一下这个议题的最新研究现状，再继续讨论。"
  },
  "meta": {
    "searchRequested": true,
    "searchConnected": false
  },
  "orchestrator": {
    "toolRoutes": [
      {
        "tool": "Researcher",
        "mode": "support",
        "reason": "用户明确提到想看现状，Researcher 进入支援位，为后续补外部材料预留口子。"
      }
    ]
  }
}
```

---

**报告生成时间**: 2026-03-20T02:18:00Z  
**测试执行者**: zhipuai-coding-plan/glm-5  
**浏览器工具**: agent-browser
