# SD-209 ChatPanel 通用专家数据修改引擎

> **模块编号**: SD-209  
> **版本**: v1.0  
> **日期**: 2026-03-05  
> **作者**: 老杨 (OldYang)  
> **状态**: 待确认  
> **前置依赖**: SD-202 (ChatPanel 改造 & Director Phase 2/3 重构，已完成)

---

## 概述

为 DeliveryConsole 的所有专家模块（Director、ShortsMaster、MusicDirector、ThumbnailMaster、MarketingMaster）构建一套统一的 **ChatPanel 智能数据修改引擎**。用户在侧边栏对话框中用自然语言下达指令（如"把第三章的第二个方案删掉"），系统通过 **LLM Function Calling** 精准解析意图，经过**二次确认**后安全地执行数据修改。

### 核心设计哲学

```
用户自然语言 → LLM Function Calling (意图解析) → 二次确认 UI → Skill API 执行 → JSON 写回 + Socket 广播
```

1. **LLM 只做意图翻译**：大模型不直接接触底层数据，只负责把人话翻译成标准 API 调用参数
2. **Skill API 分布式注册**：每个专家在自己的域内声明可执行的操作（类似 MCP 的 Tool 注册），中心引擎按需加载
3. **强制二次确认**：任何数据修改操作都必须经过前端 UI 交互确认，杜绝误操作

---

## 架构总览

### 数据流架构

```
┌──────────────┐      ┌──────────────────────────────┐
│   ChatPanel   │─────▶│   server/index.ts             │
│   用户输入    │      │   chat-stream 事件处理         │
└──────────────┘      └──────────┬───────────────────┘
                                 │
                    ┌────────────▼────────────────┐
                    │  chat.ts: callLLMStream()    │
                    │  附带 tools[] (FC Schema)    │
                    │  附带 context skeleton       │
                    └────────────┬────────────────┘
                                 │
                    ┌────────────▼────────────────┐
                    │  LLM 返回 tool_calls JSON    │
                    │  e.g. {"name":"deleteOption", │
                    │   "args":{"ch":"ch1","opt":2}}│
                    └────────────┬────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │  前端 ChatPanel 渲染二次确认卡片      │
              │  "🤖 删除 第1章 · 选项2，确认吗？"    │
              │  [确认执行]  [取消]                    │
              └──────────────────┬──────────────────┘
                                 │ 用户点击 [确认]
              ┌──────────────────▼──────────────────┐
              │  server: executeExpertAction()       │
              │   1. 自动备份 delivery_store.json     │
              │   2. 加载对应 Skill API Adapter       │
              │   3. 执行操作                         │
              │   4. 写回 JSON + Socket 广播刷新      │
              └─────────────────────────────────────┘
```

### 各专家数据模型差异

| 专家                | 数据路径                       | 结构              | 核心可修改字段                         |
| ------------------- | ------------------------------ | ----------------- | -------------------------------------- |
| **Director**        | `modules.director.items[]`     | 嵌套树（章→选项） | `options[].imagePrompt`, 删除/添加选项 |
| **ShortsMaster**    | `shorts_state.json`            | 扁平数组          | `scriptText`, `hookType`, `cta`        |
| **MusicDirector**   | `modules.music.items[]`        | 扁平数组          | `content`, `checked`, `comment`        |
| **ThumbnailMaster** | `modules.thumbnail.variants[]` | 扁平数组          | `content`(prompt), `visualSpecs`       |
| **MarketingMaster** | `modules.marketing.strategy`   | 单一嵌套对象      | `seo.*`, `social.*`, `geo.*`           |

---

## 涉及文件清单

### 后端（核心引擎）

| #   | 文件                                | 操作    | 说明                                                             |
| --- | ----------------------------------- | ------- | ---------------------------------------------------------------- |
| 1   | `server/expert-actions.ts`          | **NEW** | 通用执行引擎：备份、加载 Adapter、执行、写回                     |
| 2   | `server/expert-actions/director.ts` | **NEW** | Director Skill API：deleteOption, regeneratePrompt, updatePrompt |
| 3   | `server/expert-actions/shorts.ts`   | **NEW** | ShortsMaster Skill API：迁移现有 chat-modifications.ts 逻辑      |
| 4   | `server/chat.ts`                    | MODIFY  | callLLMStream 增加 `tools` 参数传递支持                          |
| 5   | `server/index.ts`                   | MODIFY  | chat-stream 事件：检测 tool_calls → 推送确认 → 执行              |
| 6   | `server/chat-modifications.ts`      | DELETE  | 旧的硬编码修改逻辑，迁移到新架构后删除                           |

### 前端（确认 UI）

| #   | 文件                           | 操作   | 说明                                 |
| --- | ------------------------------ | ------ | ------------------------------------ |
| 7   | `src/components/ChatPanel.tsx` | MODIFY | 新增二次确认卡片渲染 + 确认/取消交互 |
| 8   | `src/types.ts`                 | MODIFY | 新增 ToolCallConfirmation 等类型定义 |

---

## 变更详述

### 变更一：LLM Function Calling 基础设施

#### [MODIFY] server/chat.ts

升级 `callLLMStream` 函数，支持向大模型传递 `tools` 参数：

```typescript
export async function* callLLMStream(
    messages: LLMMessage[],
    provider: string,
    model: string,
    baseUrl?: string | null,
    tools?: ToolDefinition[]  // ← 新增参数
): AsyncGenerator<string | ToolCallResult> {
    
    // 构建请求体
    const body: Record<string, unknown> = {
        model, messages, stream: true, max_tokens: 4096,
    };
    
    // 仅对兼容 OpenAI tools 协议的厂商附带工具箱
    const FC_PROVIDERS = ['openai', 'deepseek', 'siliconflow', 'kimi'];
    if (tools?.length && FC_PROVIDERS.includes(provider)) {
        body.tools = tools;
        body.tool_choice = 'auto';  // 让模型自行决定是否调用工具
    }
    
    // 流式解析时，额外检测 tool_calls 字段
    // 如果模型返回了 tool_calls，yield 一个特殊的 ToolCallResult 对象
    // 而非普通的文字 chunk
}
```

**兼容性降级策略**：
- `deepseek`、`siliconflow`、`kimi`、`openai`：直接走原生 `tools` 协议
- 其余不支持的模型：不附带 `tools`，纯聊天模式，不具备数据修改能力

---

### 变更二：Skill API 分布式注册

#### [NEW] server/expert-actions.ts (通用引擎)

```typescript
import type { ToolDefinition, ToolCallResult, ExpertActionResult } from '../src/types';

// 专家 Action Adapter 接口
export interface ExpertActionAdapter {
    expertId: string;
    
    // 该专家支持的 Function Calling 工具定义
    getToolDefinitions(): ToolDefinition[];
    
    // 生成当前数据的压缩骨架（极小化 Token 消耗）
    getContextSkeleton(projectRoot: string): string;
    
    // 执行某个工具调用
    executeAction(
        actionName: string,
        args: Record<string, any>,
        projectRoot: string
    ): Promise<ExpertActionResult>;
}

// Adapter 注册表
const ADAPTERS: Record<string, ExpertActionAdapter> = {};

export function registerAdapter(adapter: ExpertActionAdapter) {
    ADAPTERS[adapter.expertId] = adapter;
}

export function getAdapter(expertId: string): ExpertActionAdapter | null {
    return ADAPTERS[expertId] || null;
}

// 自动备份
export function backupDeliveryStore(projectRoot: string): string {
    const src = path.join(projectRoot, 'delivery_store.json');
    const backupDir = path.join(projectRoot, '.tasks', 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const dest = path.join(backupDir, `delivery_store_${Date.now()}.json`);
    fs.copyFileSync(src, dest);
    
    // 保留最近 10 份，自动轮转
    const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('delivery_store_'))
        .sort().reverse();
    for (const old of backups.slice(10)) {
        fs.unlinkSync(path.join(backupDir, old));
    }
    return dest;
}
```

#### [NEW] server/expert-actions/director.ts (Director Skill API)

```typescript
import { ExpertActionAdapter } from '../expert-actions';

export const DirectorAdapter: ExpertActionAdapter = {
    expertId: 'Director',
    
    getToolDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'delete_option',
                    description: '从指定章节中删除一个视觉方案选项',
                    parameters: {
                        type: 'object',
                        properties: {
                            chapterId: { type: 'string', description: '章节ID，如 ch1' },
                            optionId: { type: 'string', description: '选项ID' }
                        },
                        required: ['chapterId', 'optionId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'regenerate_prompt',
                    description: '为指定章节的某个选项重新生成 imagePrompt 提示词',
                    parameters: {
                        type: 'object',
                        properties: {
                            chapterId: { type: 'string', description: '章节ID' },
                            optionId: { type: 'string', description: '选项ID' },
                            style_hint: { type: 'string', description: '可选的风格提示，如"赛博朋克"' }
                        },
                        required: ['chapterId', 'optionId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'update_prompt',
                    description: '直接替换指定选项的 imagePrompt 为用户提供的新内容',
                    parameters: {
                        type: 'object',
                        properties: {
                            chapterId: { type: 'string', description: '章节ID' },
                            optionId: { type: 'string', description: '选项ID' },
                            new_prompt: { type: 'string', description: '新的提示词内容' }
                        },
                        required: ['chapterId', 'optionId', 'new_prompt']
                    }
                }
            }
        ];
    },
    
    getContextSkeleton(projectRoot: string): string {
        // 只传极简骨架给 LLM，节省 Token
        const data = JSON.parse(fs.readFileSync(
            path.join(projectRoot, 'delivery_store.json'), 'utf-8'
        ));
        const chapters = data.modules?.director?.items || [];
        const skeleton = chapters.map((ch: any) => ({
            id: ch.chapterId,
            name: ch.chapterName,
            options: ch.options.map((o: any) => ({
                id: o.id,
                type: o.type,
                checked: !!o.isChecked
            }))
        }));
        return JSON.stringify(skeleton, null, 2);
    },
    
    async executeAction(actionName, args, projectRoot) {
        // 读取现有数据
        const storePath = path.join(projectRoot, 'delivery_store.json');
        const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
        const chapters = data.modules?.director?.items || [];
        
        switch (actionName) {
            case 'delete_option': {
                const ch = chapters.find((c: any) => c.chapterId === args.chapterId);
                if (!ch) return { success: false, error: `章节 ${args.chapterId} 不存在` };
                ch.options = ch.options.filter((o: any) => o.id !== args.optionId);
                break;
            }
            case 'regenerate_prompt': {
                // 调用 LLM 按照 broll prompt 模板生成新提示词
                // ...（调用现有的 director.ts generateImagePrompt 逻辑）
                break;
            }
            case 'update_prompt': {
                const ch = chapters.find((c: any) => c.chapterId === args.chapterId);
                if (!ch) return { success: false, error: `章节 ${args.chapterId} 不存在` };
                const opt = ch.options.find((o: any) => o.id === args.optionId);
                if (!opt) return { success: false, error: `选项 ${args.optionId} 不存在` };
                opt.imagePrompt = args.new_prompt;
                break;
            }
            default:
                return { success: false, error: `未知操作: ${actionName}` };
        }
        
        // 写回
        fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
        return { success: true, data: { action: actionName, ...args } };
    }
};
```

---

### 变更三：chat-stream 事件流改造

#### [MODIFY] server/index.ts

```typescript
socket.on('chat-stream', async ({ messages, expertId, projectId }) => {
    const projectRoot = getProjectRoot(projectId);
    
    // 1. 加载当前专家的 Skill API Adapter
    const adapter = getAdapter(expertId);
    
    // 2. 如果专家有注册工具，注入骨架上下文 + 工具定义
    let tools: ToolDefinition[] | undefined;
    let enrichedMessages = [...messages];
    
    if (adapter) {
        tools = adapter.getToolDefinitions();
        const skeleton = adapter.getContextSkeleton(projectRoot);
        
        // 在 system prompt 末尾追加极简骨架
        enrichedMessages[0] = {
            ...enrichedMessages[0],
            content: enrichedMessages[0].content + 
                `\n\n## 当前数据骨架（只读参考）\n${skeleton}`
        };
    }
    
    // 3. 调用大模型（可能返回文字，也可能返回 tool_calls）
    for await (const chunk of callLLMStream(enrichedMessages, provider, model, null, tools)) {
        if (typeof chunk === 'string') {
            // 普通文字流，直接推给前端
            socket.emit('chat-token', { expertId, token: chunk });
        } else if (chunk.type === 'tool_call') {
            // LLM 触发了工具调用！
            // 不能直接执行！推送二次确认给前端
            socket.emit('chat-action-confirm', {
                expertId,
                confirmId: `confirm_${Date.now()}`,
                actionName: chunk.functionName,
                actionArgs: chunk.arguments,
                // 生成人类可读的描述
                description: generateActionDescription(chunk.functionName, chunk.arguments)
            });
            break; // 中断文字流，等用户确认
        }
    }
});

// 用户在前端点击了 [确认执行]
socket.on('chat-action-execute', async ({ expertId, projectId, actionName, actionArgs }) => {
    const projectRoot = getProjectRoot(projectId);
    const adapter = getAdapter(expertId);
    if (!adapter) return;
    
    // 1. 自动备份
    backupDeliveryStore(projectRoot);
    
    // 2. 执行
    const result = await adapter.executeAction(actionName, actionArgs, projectRoot);
    
    // 3. 广播刷新
    if (result.success) {
        const data = JSON.parse(fs.readFileSync(
            path.join(projectRoot, 'delivery_store.json'), 'utf-8'
        ));
        io.to(projectId).emit('delivery-data', data);
        socket.emit('chat-action-result', { expertId, success: true, message: '✅ 操作已执行' });
    } else {
        socket.emit('chat-action-result', { expertId, success: false, message: `❌ ${result.error}` });
    }
});
```

---

### 变更四：前端二次确认卡片

#### [MODIFY] src/components/ChatPanel.tsx

在消息列表中新增一种特殊消息类型 `action_confirm`：

```tsx
// 监听后端推送的确认请求
socket.on('chat-action-confirm', (data) => {
    setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        actionConfirm: {
            confirmId: data.confirmId,
            actionName: data.actionName,
            actionArgs: data.actionArgs,
            description: data.description,
            status: 'pending'  // pending | confirmed | cancelled
        }
    }]);
});

// 渲染确认卡片
{msg.actionConfirm && msg.actionConfirm.status === 'pending' && (
    <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3 my-2">
        <p className="text-amber-200 text-sm mb-2">
            🤖 {msg.actionConfirm.description}
        </p>
        <div className="flex gap-2">
            <button
                onClick={() => handleConfirmAction(msg.actionConfirm)}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 
                           text-white text-sm rounded"
            >
                ✓ 确认执行
            </button>
            <button
                onClick={() => handleCancelAction(msg.actionConfirm)}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 
                           text-white text-sm rounded"
            >
                ✕ 取消
            </button>
        </div>
    </div>
)}
```

---

## 开发顺序

严格按以下顺序执行，每一步均可独立验证：

| Phase | 工作内容                                                                      | 估时 | 验证点                       |
| ----- | ----------------------------------------------------------------------------- | ---- | ---------------------------- |
| **1** | 类型定义：`ToolDefinition`, `ToolCallResult`, `ExpertActionResult` (types.ts) | 0.5h | TypeScript 编译通过          |
| **2** | 通用引擎：`expert-actions.ts` (注册表 + 备份机制)                             | 1h   | 备份文件自动生成 + 轮转      |
| **3** | Director Adapter：`expert-actions/director.ts`                                | 1.5h | 单元测试覆盖 delete/update   |
| **4** | ShortsMaster Adapter：`expert-actions/shorts.ts` (迁移旧逻辑)                 | 1h   | 现有 Shorts 修改能力不回退   |
| **5** | chat.ts 升级：`callLLMStream` 支持 `tools` 传参 + tool_call 解析              | 2h   | DeepSeek 准确返回 tool_calls |
| **6** | index.ts 改造：chat-stream 事件流分叉 + 二次确认推送                          | 1.5h | Socket 事件正确流转          |
| **7** | ChatPanel.tsx：二次确认卡片渲染 + 确认/取消交互                               | 1.5h | UI 渲染正确，点击后数据变更  |
| **8** | 端到端联调 + 删除旧 chat-modifications.ts                                     | 1h   | 全链路跑通                   |

**总计：~10h**

---

## 天条约束

1. **LLM 绝对不能无确认直接修改数据**：tool_calls 必须经过前端二次确认后才能执行
2. **每次修改前必须自动备份**：`delivery_store.json` 在 `.tasks/backups/` 下保留最近 10 份
3. **不支持 Function Calling 的模型不能触发修改**：平缓降级为纯聊天模式
4. **Skill API 定义归属各专家**：中心引擎只做调度，不包含专家业务逻辑
5. **骨架上下文极简化**：传给 LLM 的上下文只含 ID + 名称，禁止传递完整内容

---

## Verification Plan

### 自动化验证

```bash
# 1. TypeScript 编译
npx tsc --noEmit

# 2. 单元测试（Director Adapter）
# 在 /tmp/ 下创建测试脚本验证 delete_option / update_prompt

# 3. Function Calling 端到端测试
# 启动 dev server → 打开 Director → 在 ChatPanel 输入 "删除第一章的第二个方案"
# 验证：a) 确认卡片出现 b) 点确认后数据正确更新 c) UI 自动刷新
```

### 手动验证

1. 在 Director 页，通过 ChatPanel 发送"把第一章第三个选项删掉"
2. 确认卡片应出现，展示正确的目标描述
3. 点击确认后：delivery_store.json 对应选项消失 + 界面实时刷新
4. 检查 `.tasks/backups/` 下有备份文件
5. 切换到不支持 FC 的模型，验证对话不崩溃（降级为纯聊天）
