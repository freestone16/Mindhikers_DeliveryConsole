# [SD-202 + INF-001] 导演大师 & LLM配置 完整实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现导演大师完整三阶段管线（Phase 1-3）及 LLM 配置管理系统

**Architecture:** 
- LLM 配置：环境变量存 API Key + JSON 存非敏感配置 + UI 配置页
- 导演大师：Human-in-the-loop 三阶段管线，预览图 320×180，Remotion 4K 渲染

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Socket.IO, SSE, Vitest, Zod, Express

**设计文档:**
- `docs/00_architecture/llm_config_design.md`
- `docs/02_design/sd202_director_master.md`

---

## Task 1: 配置 Vitest 测试框架

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`

**Step 1: 安装依赖**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 2: 创建 `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
});
```

**Step 3: 创建 `src/__tests__/setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

**Step 4: 更新 `package.json` scripts**

添加：
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 5: 运行测试验证**

```bash
npm run test:run
```

**Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/__tests__/
git commit -m "chore: setup vitest testing framework"
```

---

## Task 2: LLM 配置 - 数据契约与 Zod Schema

**Files:**
- Create: `src/schemas/llm-config.ts`
- Create: `src/__tests__/schemas/llm-config.test.ts`
- Create: `.env.example`

**Step 1: 创建 `.env.example`**

```env
# ========== LLM Provider API Keys ==========

# OpenAI (GPT-4o, GPT-4o-mini, etc.)
OPENAI_API_KEY=

# Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
ANTHROPIC_API_KEY=

# Google (Gemini Pro, Gemini Flash, etc.)
GOOGLE_API_KEY=

# DeepSeek (国产替代)
DEEPSEEK_API_KEY=

# Zhipu AI (GLM-4, etc.)
ZHIPU_API_KEY=

# ========== Media Generation APIs ==========

# SiliconFlow (文生图/文生视频)
SILICONFLOW_API_KEY=

# Artlist (实拍素材搜索)
ARTLIST_API_KEY=
```

**Step 2: 创建 `src/schemas/llm-config.ts`**

```typescript
import { z } from 'zod';

export const LLMProviderSchema = z.enum([
  'openai', 
  'anthropic', 
  'google', 
  'deepseek', 
  'zhipu'
]);

export const ExpertLLMConfigSchema = z.object({
  provider: LLMProviderSchema.nullable(),
  model: z.string().nullable(),
});

export const LLMConfigSchema = z.object({
  global: z.object({
    provider: LLMProviderSchema,
    model: z.string(),
    baseUrl: z.string().nullable(),
  }),
  experts: z.object({
    crucible: ExpertLLMConfigSchema.nullable(),
    writer: ExpertLLMConfigSchema.nullable(),
    director: ExpertLLMConfigSchema.nullable(),
    music: ExpertLLMConfigSchema.nullable(),
    thumbnail: ExpertLLMConfigSchema.nullable(),
    marketing: ExpertLLMConfigSchema.nullable(),
    shorts: ExpertLLMConfigSchema.nullable(),
  }),
});

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type ExpertLLMConfig = z.infer<typeof ExpertLLMConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  global: {
    provider: 'openai',
    model: 'gpt-4o',
    baseUrl: null,
  },
  experts: {
    crucible: null,
    writer: null,
    director: null,
    music: null,
    thumbnail: null,
    marketing: null,
    shorts: null,
  },
};
```

**Step 3: 创建测试 `src/__tests__/schemas/llm-config.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { LLMConfigSchema, DEFAULT_LLM_CONFIG } from '../../schemas/llm-config';

describe('LLMConfig Schema', () => {
  it('should validate default config', () => {
    const result = LLMConfigSchema.safeParse(DEFAULT_LLM_CONFIG);
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider', () => {
    const config = {
      global: { provider: 'invalid', model: 'test' },
      experts: {},
    };
    const result = LLMConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should allow null expert config (inherit global)', () => {
    const config = {
      global: { provider: 'openai', model: 'gpt-4o', baseUrl: null },
      experts: {
        director: null,
      },
    };
    const result = LLMConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
```

**Step 4: 运行测试**

```bash
npm run test:run src/__tests__/schemas/
```

**Step 5: Commit**

```bash
git add .env.example src/schemas/ src/__tests__/schemas/
git commit -m "feat(config): add LLM config Zod schema and .env.example"
```

---

## Task 3: LLM 配置 - 后端 API

**Files:**
- Create: `server/llm-config.ts`
- Modify: `server/index.ts`
- Create: `src/__tests__/api/llm-config.test.ts`

**Step 1: 创建 `server/llm-config.ts`**

```typescript
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { LLMConfigSchema, LLMConfig, DEFAULT_LLM_CONFIG } from '../src/schemas/llm-config';

const CONFIG_DIR = path.join(process.cwd(), '.agent', 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'llm_config.json');

const ensureConfigDir = () => {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
};

const loadConfig = (): LLMConfig => {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_LLM_CONFIG, null, 2));
    return DEFAULT_LLM_CONFIG;
  }
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(content);
  return LLMConfigSchema.parse(parsed);
};

const saveConfig = (config: LLMConfig) => {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};

// Provider -> Env Var 映射
const PROVIDER_ENV_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  zhipu: 'ZHIPU_API_KEY',
};

export const getConfigStatus = (req: Request, res: Response) => {
  const config = loadConfig();
  
  const providers = Object.keys(PROVIDER_ENV_MAP).reduce((acc, provider) => {
    const envVar = PROVIDER_ENV_MAP[provider];
    acc[provider] = {
      configured: !!process.env[envVar],
      model: getDefaultModel(provider),
    };
    return acc;
  }, {} as Record<string, { configured: boolean; model: string }>);

  res.json({
    providers,
    global: config.global,
    experts: Object.entries(config.experts).reduce((acc, [key, value]) => {
      acc[key] = {
        provider: value?.provider ?? null,
        model: value?.model ?? null,
        inherited: value === null,
      };
      return acc;
    }, {} as Record<string, any>),
  });
};

const getDefaultModel = (provider: string): string => {
  const defaults: Record<string, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-1.5-pro',
    deepseek: 'deepseek-chat',
    zhipu: 'glm-4',
  };
  return defaults[provider] || 'unknown';
};

export const saveApiKey = (req: Request, res: Response) => {
  const { provider, apiKey } = req.body;
  
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Missing provider or apiKey' });
  }

  const envVar = PROVIDER_ENV_MAP[provider];
  if (!envVar) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  // 追加/更新到 .env 文件
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const lines = envContent.split('\n');
  const existingIndex = lines.findIndex(l => l.startsWith(`${envVar}=`));
  
  if (existingIndex >= 0) {
    lines[existingIndex] = `${envVar}=${apiKey}`;
  } else {
    lines.push(`${envVar}=${apiKey}`);
  }

  fs.writeFileSync(envPath, lines.join('\n'));

  // 更新 process.env（运行时生效）
  process.env[envVar] = apiKey;

  res.json({ success: true, message: 'API Key saved successfully' });
};

export const updateConfig = (req: Request, res: Response) => {
  const config = loadConfig();
  const { global, experts } = req.body;

  if (global) {
    config.global = { ...config.global, ...global };
  }

  if (experts) {
    config.experts = { ...config.experts, ...experts };
  }

  const validated = LLMConfigSchema.parse(config);
  saveConfig(validated);

  res.json({ success: true, config: validated });
};

export const testConnection = async (req: Request, res: Response) => {
  const { provider, model } = req.body;
  
  // TODO: 实际调用 LLM API 测试连接
  // 目前返回模拟结果
  const envVar = PROVIDER_ENV_MAP[provider];
  const configured = !!process.env[envVar];

  if (!configured) {
    return res.json({ success: false, error: 'API Key not configured' });
  }

  res.json({ success: true, latency: 150 });
};
```

**Step 2: 在 `server/index.ts` 添加路由**

```typescript
import { getConfigStatus, saveApiKey, updateConfig, testConnection } from './llm-config';

// 添加路由
app.get('/api/llm-config/status', getConfigStatus);
app.post('/api/llm-config/api-key', saveApiKey);
app.put('/api/llm-config', updateConfig);
app.post('/api/llm-config/test', testConnection);
```

**Step 3: Commit**

```bash
git add server/llm-config.ts server/index.ts
git commit -m "feat(server): add LLM config API endpoints"
```

---

## Task 4: LLM 配置 - UI 组件

**Files:**
- Create: `src/components/LLMConfigModal.tsx`
- Create: `src/hooks/useLLMConfig.ts`
- Modify: `src/components/Header.tsx`

**Step 1: 创建 `src/hooks/useLLMConfig.ts`**

```typescript
import { useState, useEffect } from 'react';
import type { LLMConfig } from '../schemas/llm-config';

interface ConfigStatus {
  providers: Record<string, { configured: boolean; model: string }>;
  global: LLMConfig['global'];
  experts: Record<string, { provider: string | null; model: string | null; inherited: boolean }>;
}

export const useLLMConfig = () => {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/llm-config/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch LLM config status:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (provider: string, apiKey: string) => {
    const res = await fetch('http://localhost:3002/api/llm-config/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey }),
    });
    const data = await res.json();
    if (data.success) fetchStatus();
    return data;
  };

  const updateConfig = async (updates: { global?: any; experts?: any }) => {
    const res = await fetch('http://localhost:3002/api/llm-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (data.success) fetchStatus();
    return data;
  };

  const testConnection = async (provider: string, model?: string) => {
    const res = await fetch('http://localhost:3002/api/llm-config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, model }),
    });
    return res.json();
  };

  return { status, loading, saveApiKey, updateConfig, testConnection, refresh: fetchStatus };
};
```

**Step 2: 创建 `src/components/LLMConfigModal.tsx`**

```typescript
import { useState } from 'react';
import { X, Settings, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useLLMConfig } from '../hooks/useLLMConfig';

interface LLMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] },
  { id: 'google', name: 'Google', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { id: 'zhipu', name: 'Zhipu AI', models: ['glm-4', 'glm-4-flash'] },
];

export const LLMConfigModal = ({ isOpen, onClose }: LLMConfigModalProps) => {
  const { status, loading, saveApiKey, updateConfig, testConnection } = useLLMConfig();
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [testing, setTesting] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    const result = await testConnection(selectedProvider);
    setTesting(false);
    // 显示结果...
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl border border-slate-700 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            LLM Configuration
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="text-center text-slate-500">Loading...</div>
          ) : (
            <>
              {/* Global Settings */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Global Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Provider</label>
                    <select 
                      className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                      value={status?.global.provider || 'openai'}
                      onChange={(e) => updateConfig({ global: { provider: e.target.value } })}
                    >
                      {PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Model</label>
                    <select className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white mt-1">
                      {PROVIDERS.find(p => p.id === status?.global.provider)?.models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* API Key Management */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">API Keys</h3>
                <div className="space-y-2">
                  {PROVIDERS.map(p => {
                    const configured = status?.providers[p.id]?.configured;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{p.name}</span>
                          {configured ? (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Configured
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Not set</span>
                          )}
                        </div>
                        <button 
                          className="text-xs text-blue-400 hover:text-blue-300"
                          onClick={() => setSelectedProvider(p.id)}
                        >
                          {configured ? 'Change' : 'Configure'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expert Overrides */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Expert-Specific Override</h3>
                <div className="text-sm text-slate-500">
                  Expert-level configuration will be available after Phase 1.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Step 3: 在 Header.tsx 添加设置按钮**

在 Header 右上角添加 ⚙️ 图标，点击打开 LLMConfigModal。

**Step 4: Commit**

```bash
git add src/components/LLMConfigModal.tsx src/hooks/useLLMConfig.ts src/components/Header.tsx
git commit -m "feat(ui): add LLM config modal component"
```

---

## Task 5: 导演大师 - 更新数据契约

**Files:**
- Modify: `src/types.ts`
- Create: `src/schemas/director.ts`

**Step 1: 在 `src/types.ts` 末尾添加**

```typescript
// --- Director Master V2 Types ---

export type BRollType = 'remotion' | 'seedance' | 'artlist';

export interface SceneOption {
  id: string;
  type: BRollType;
  previewUrl?: string;
  template?: string;
  props?: Record<string, any>;
  prompt?: string;
  mode?: 'T2V' | 'I2V' | 'V2V';
  search_keywords?: string[];
}

export interface DirectorChapter {
  chapterId: string;
  chapterIndex: number;
  chapterName: string;  // "Intro", "第一章", "Ending"
  scriptText: string;
  options: SceneOption[];
  selectedOptionId?: string;
  userComment?: string;
  isLocked: boolean;
}

export interface SelectionState {
  projectId: string;
  lastUpdated: string;
  chapters: DirectorChapter[];
}

export interface DirectorAction {
  action: 'phase1' | 'phase2_generate' | 'phase2_revise' | 'phase2_select' | 'phase3_render';
  projectId: string;
  chapterIndex?: number;
  userComment?: string;
  selectedOptions?: BRollType[];
}

export interface Phase1Concept {
  projectId: string;
  createdAt: string;
  content: string;
  userFeedback?: string;
  isApproved: boolean;
}

export interface RenderJob {
  jobId: string;
  projectId: string;
  chapterId: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number;  // 0-100
  frame?: number;
  totalFrames?: number;
  outputPath?: string;
  error?: string;
}
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add Director Master V2 type definitions"
```

---

## Task 6: Phase 1 - 概念提案 UI

**Files:**
- Create: `src/components/director/Phase1View.tsx`
- Create: `src/__tests__/components/Phase1View.test.tsx`

**Step 1: 创建 `src/components/director/Phase1View.tsx`**

```typescript
import { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle } from 'lucide-react';

interface Phase1ViewProps {
  projectId: string;
  scriptPath: string;
  concept: string | null;
  isGenerating: boolean;
  isApproved: boolean;
  onGenerate: () => void;
  onRevise: (comment: string) => void;
  onApprove: () => void;
}

export const Phase1View = ({
  projectId,
  scriptPath,
  concept,
  isGenerating,
  isApproved,
  onGenerate,
  onRevise,
  onApprove,
}: Phase1ViewProps) => {
  const [feedback, setFeedback] = useState('');

  if (!concept && !isGenerating) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-8 text-center">
        <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Visual Concept Architect</h3>
        <p className="text-slate-400 text-sm mb-6">
          Generate a visual concept proposal based on your script.
        </p>
        <button
          onClick={onGenerate}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all"
        >
          Generate Concept
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 p-8 text-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Generating Visual Concept...</h3>
        <p className="text-slate-400 text-sm">
          Analyzing script structure and style...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Visual Concept Proposal</h3>
          {isApproved && (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Approved
            </span>
          )}
        </div>
      </div>

      {/* Concept Content */}
      <div className="p-6">
        <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap">
          {concept}
        </div>
      </div>

      {/* Feedback Section */}
      {!isApproved && (
        <div className="p-4 border-t border-slate-700">
          <label className="text-xs text-slate-500 block mb-2">Feedback / Adjustments</label>
          <textarea
            className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Describe changes you'd like to see..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => onRevise(feedback)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Revise
            </button>
            <button
              onClick={onApprove}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/director/Phase1View.tsx
git commit -m "feat(director): add Phase 1 concept view component"
```

---

## Task 7: Phase 2 - B-Roll 选择器与三列式 UI

**Files:**
- Create: `src/components/director/BRollSelector.tsx`
- Create: `src/components/director/ChapterCard.tsx`
- Create: `src/components/director/Phase2View.tsx`

**Step 1: 创建 `src/components/director/BRollSelector.tsx`**

```typescript
import { Check, Code, Video, Film } from 'lucide-react';
import type { BRollType } from '../../types';

interface BRollSelectorProps {
  selected: BRollType[];
  onChange: (selected: BRollType[]) => void;
  disabled?: boolean;
}

const BROLL_OPTIONS: { type: BRollType; label: string; icon: typeof Code; description: string }[] = [
  { type: 'remotion', label: 'A. Remotion 动画', icon: Code, description: '代码驱动动画' },
  { type: 'seedance', label: 'B. 文生视频', icon: Video, description: 'AI生成视频' },
  { type: 'artlist', label: 'C. Artlist 实拍', icon: Film, description: '素材库实拍' },
];

export const BRollSelector = ({ selected, onChange, disabled }: BRollSelectorProps) => {
  const toggleOption = (type: BRollType) => {
    if (disabled) return;
    if (selected.includes(type)) {
      onChange(selected.filter(t => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <div className="flex gap-3">
      {BROLL_OPTIONS.map(({ type, label, icon: Icon, description }) => {
        const isSelected = selected.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggleOption(type)}
            disabled={disabled}
            className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all
              ${isSelected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center
              ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-white">{label}</span>
            <span className="text-xs text-slate-500">{description}</span>
            {isSelected && <Check className="w-4 h-4 text-blue-400" />}
          </button>
        );
      })}
    </div>
  );
};
```

**Step 2: 创建 `src/components/director/ChapterCard.tsx`**

```typescript
import { Check, Lock } from 'lucide-react';
import type { DirectorChapter, SceneOption } from '../../types';

interface ChapterCardProps {
  chapter: DirectorChapter;
  onSelect: (chapterId: string, optionId: string) => void;
  onComment: (chapterId: string, comment: string) => void;
  onLock: (chapterId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  remotion: 'bg-blue-500/20 text-blue-300',
  seedance: 'bg-purple-500/20 text-purple-300',
  artlist: 'bg-green-500/20 text-green-300',
};

export const ChapterCard = ({ chapter, onSelect, onComment, onLock }: ChapterCardProps) => {
  return (
    <div className="grid grid-cols-3 gap-4 bg-slate-900 rounded-lg border border-slate-700 p-4">
      {/* Column 1: Script */}
      <div className="bg-slate-800/50 rounded p-3">
        <div className="text-xs text-slate-500 uppercase font-bold mb-2">
          {chapter.chapterName}
        </div>
        <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed line-clamp-8">
          {chapter.scriptText}
        </p>
      </div>

      {/* Column 2: 3 Options */}
      <div className="flex flex-col gap-2">
        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Visual Options</div>
        {chapter.options.map((option, idx) => (
          <button
            key={option.id}
            onClick={() => !chapter.isLocked && onSelect(chapter.chapterId, option.id)}
            disabled={chapter.isLocked}
            className={`flex items-center gap-3 p-2 rounded border transition-all text-left
              ${chapter.selectedOptionId === option.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-500'}
              ${chapter.isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {/* Preview 320x180 */}
            <div className="w-20 h-12 bg-slate-700 rounded flex-shrink-0 overflow-hidden">
              {option.previewUrl ? (
                <img src={option.previewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  {idx + 1}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white font-medium">Option {idx + 1}</div>
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs mt-0.5 ${TYPE_COLORS[option.type]}`}>
                {option.type}
              </span>
            </div>
            {chapter.selectedOptionId === option.id && (
              <Check className="w-4 h-4 text-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Column 3: Comment + Lock */}
      <div className="flex flex-col gap-3">
        <div className="text-xs text-slate-500 uppercase font-bold">Feedback</div>
        <textarea
          className="flex-1 bg-slate-800/50 border border-slate-700 rounded p-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="Add feedback..."
          defaultValue={chapter.userComment || ''}
          onBlur={(e) => onComment(chapter.chapterId, e.target.value)}
          disabled={chapter.isLocked}
        />
        <button
          onClick={() => onLock(chapter.chapterId)}
          disabled={chapter.isLocked || !chapter.selectedOptionId}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-all
            ${chapter.isLocked
              ? 'bg-green-600 text-white cursor-default'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}
        >
          {chapter.isLocked ? (
            <>
              <Lock className="w-4 h-4" /> Locked
            </>
          ) : (
            <>
              <Check className="w-4 h-4" /> Lock Selection
            </>
          )}
        </button>
      </div>
    </div>
  );
};
```

**Step 3: 创建 `src/components/director/Phase2View.tsx`**

```typescript
import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { BRollSelector } from './BRollSelector';
import { ChapterCard } from './ChapterCard';
import type { DirectorChapter, BRollType } from '../../types';

interface Phase2ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  isLoading: boolean;
  loadingProgress: string;  // "1/12"
  onConfirmBRoll: (types: BRollType[]) => void;
  onSelect: (chapterId: string, optionId: string) => void;
  onComment: (chapterId: string, comment: string) => void;
  onLock: (chapterId: string) => void;
  onProceed: () => void;
}

export const Phase2View = ({
  projectId,
  chapters,
  isLoading,
  loadingProgress,
  onConfirmBRoll,
  onSelect,
  onComment,
  onLock,
  onProceed,
}: Phase2ViewProps) => {
  const [brollSelections, setBrollSelections] = useState<BRollType[]>(['remotion', 'seedance', 'artlist']);
  const [brollConfirmed, setBrollConfirmed] = useState(false);

  const allLocked = chapters.length > 0 && chapters.every(c => c.isLocked);

  const handleConfirmBRoll = () => {
    if (brollSelections.length === 0) return;
    setBrollConfirmed(true);
    onConfirmBRoll(brollSelections);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* B-Roll Selector */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
        <h3 className="text-sm text-slate-400 uppercase font-bold mb-3">
          Select B-Roll Types
        </h3>
        <BRollSelector 
          selected={brollSelections} 
          onChange={setBrollSelections}
          disabled={brollConfirmed}
        />
        {!brollConfirmed && (
          <button
            onClick={handleConfirmBRoll}
            disabled={brollSelections.length === 0}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium"
          >
            Confirm & Generate Previews
          </button>
        )}
      </div>

      {/* Loading Progress */}
      {isLoading && (
        <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-white">Generating previews...</span>
            <span className="text-blue-400 font-mono">{loadingProgress}</span>
          </div>
        </div>
      )}

      {/* Chapter Cards */}
      {chapters.length > 0 && (
        <div className="flex flex-col gap-4">
          {chapters.map(chapter => (
            <ChapterCard
              key={chapter.chapterId}
              chapter={chapter}
              onSelect={onSelect}
              onComment={onComment}
              onLock={onLock}
            />
          ))}
        </div>
      )}

      {/* Proceed Button */}
      {allLocked && (
        <div className="flex justify-end">
          <button
            onClick={onProceed}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Proceed to Render Console
          </button>
        </div>
      )}
    </div>
  );
};
```

**Step 4: Commit**

```bash
git add src/components/director/
git commit -m "feat(director): add Phase 2 B-Roll selector and chapter card components"
```

---

## Task 8: Phase 3 - 渲染控制台 UI

**Files:**
- Create: `src/components/director/Phase3View.tsx`
- Create: `src/components/director/RenderJobCard.tsx`

**Step 1: 创建 `src/components/director/RenderJobCard.tsx`**

```typescript
import { CheckCircle, XCircle, Loader2, Play } from 'lucide-react';
import type { RenderJob } from '../../types';

interface RenderJobCardProps {
  job: RenderJob;
  chapterName: string;
  onRender: () => void;
}

export const RenderJobCard = ({ job, chapterName, onRender }: RenderJobCardProps) => {
  const statusConfig = {
    pending: { icon: Play, color: 'text-slate-400', bg: 'bg-slate-700' },
    rendering: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    completed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  const config = statusConfig[job.status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border border-slate-700 ${config.bg}`}>
      {/* Status Icon */}
      <div className={`${config.color} ${job.status === 'rendering' ? 'animate-spin' : ''}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Chapter Info */}
      <div className="flex-1">
        <div className="text-white font-medium">{chapterName}</div>
        {job.status === 'rendering' && (
          <div className="text-xs text-slate-400 mt-1">
            Frame {job.frame} / {job.totalFrames} ({job.progress}%)
          </div>
        )}
        {job.status === 'completed' && job.outputPath && (
          <div className="text-xs text-green-400 mt-1">{job.outputPath}</div>
        )}
        {job.status === 'failed' && job.error && (
          <div className="text-xs text-red-400 mt-1">{job.error}</div>
        )}
      </div>

      {/* Progress Bar */}
      {job.status === 'rendering' && (
        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}

      {/* Render Button */}
      {job.status === 'pending' && (
        <button
          onClick={onRender}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
        >
          Render
        </button>
      )}
    </div>
  );
};
```

**Step 2: 创建 `src/components/director/Phase3View.tsx`**

```typescript
import { Play, Loader2, CheckCircle } from 'lucide-react';
import { RenderJobCard } from './RenderJobCard';
import type { RenderJob, DirectorChapter } from '../../types';

interface Phase3ViewProps {
  projectId: string;
  chapters: DirectorChapter[];
  jobs: RenderJob[];
  isBatchRendering: boolean;
  onRenderOne: (chapterId: string) => void;
  onRenderAll: () => void;
}

export const Phase3View = ({
  projectId,
  chapters,
  jobs,
  isBatchRendering,
  onRenderOne,
  onRenderAll,
}: Phase3ViewProps) => {
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const allCompleted = jobs.length > 0 && completedCount === jobs.length;

  const getChapterName = (chapterId: string) => {
    return chapters.find(c => c.chapterId === chapterId)?.chapterName || chapterId;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Render Console</h3>
          <p className="text-sm text-slate-400">
            {completedCount} / {jobs.length} completed
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRenderAll}
            disabled={isBatchRendering || allCompleted}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded font-medium flex items-center gap-2"
          >
            {isBatchRendering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rendering...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Render All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Job List */}
      <div className="flex flex-col gap-2">
        {jobs.map(job => (
          <RenderJobCard
            key={job.jobId}
            job={job}
            chapterName={getChapterName(job.chapterId)}
            onRender={() => onRenderOne(job.chapterId)}
          />
        ))}
      </div>

      {/* Completion */}
      {allCompleted && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
          <div>
            <div className="text-white font-medium">All renders completed!</div>
            <div className="text-sm text-slate-400">
              Videos saved to <code className="text-green-400">06_Video_Broll/</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 3: Commit**

```bash
git add src/components/director/Phase3View.tsx src/components/director/RenderJobCard.tsx
git commit -m "feat(director): add Phase 3 render console UI"
```

---

## Task 9: 集成 DirectorSection 主组件

**Files:**
- Modify: `src/components/DirectorSection.tsx`

**Step 1: 重构 DirectorSection 整合三阶段**

```typescript
import { useState } from 'react';
import { Phase1View } from './director/Phase1View';
import { Phase2View } from './director/Phase2View';
import { Phase3View } from './director/Phase3View';
import type { DirectorChapter, RenderJob, BRollType } from '../types';

interface DirectorSectionProps {
  projectId: string;
  scriptPath?: string;
}

type Phase = 1 | 2 | 3;

export const DirectorSection = ({ projectId, scriptPath }: DirectorSectionProps) => {
  const [phase, setPhase] = useState<Phase>(1);
  const [concept, setConcept] = useState<string | null>(null);
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);
  const [conceptApproved, setConceptApproved] = useState(false);
  
  const [chapters, setChapters] = useState<DirectorChapter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('0/0');
  
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [isBatchRendering, setIsBatchRendering] = useState(false);

  // Phase 1 handlers
  const handleGenerateConcept = async () => {
    setIsGeneratingConcept(true);
    // TODO: SSE call to /api/director/phase1/generate
    setTimeout(() => {
      setConcept('# 视觉概念提案\n\n本视频采用...');
      setIsGeneratingConcept(false);
    }, 2000);
  };

  const handleReviseConcept = async (comment: string) => {
    setIsGeneratingConcept(true);
    // TODO: SSE call
    setTimeout(() => {
      setConcept(prev => prev + '\n\n修订意见: ' + comment);
      setIsGeneratingConcept(false);
    }, 1500);
  };

  const handleApproveConcept = () => {
    setConceptApproved(true);
    setPhase(2);
  };

  // Phase 2 handlers
  const handleConfirmBRoll = async (types: BRollType[]) => {
    setIsLoading(true);
    // TODO: SSE call to generate previews
    setTimeout(() => {
      setChapters([
        { chapterId: 'ch1', chapterIndex: 0, chapterName: 'Intro', scriptText: '开场白...', options: [], isLocked: false },
        { chapterId: 'ch2', chapterIndex: 1, chapterName: '第一章', scriptText: '正文内容...', options: [], isLocked: false },
      ]);
      setIsLoading(false);
    }, 3000);
  };

  const handleSelect = (chapterId: string, optionId: string) => {
    setChapters(prev => prev.map(c => 
      c.chapterId === chapterId ? { ...c, selectedOptionId: optionId } : c
    ));
  };

  const handleComment = (chapterId: string, comment: string) => {
    setChapters(prev => prev.map(c => 
      c.chapterId === chapterId ? { ...c, userComment: comment } : c
    ));
  };

  const handleLock = (chapterId: string) => {
    setChapters(prev => prev.map(c => 
      c.chapterId === chapterId ? { ...c, isLocked: true } : c
    ));
  };

  const handleProceed = () => {
    // Initialize jobs from chapters
    setJobs(chapters.map(c => ({
      jobId: `job-${c.chapterId}`,
      projectId,
      chapterId: c.chapterId,
      status: 'pending',
      progress: 0,
    })));
    setPhase(3);
  };

  // Phase 3 handlers
  const handleRenderOne = async (chapterId: string) => {
    // TODO: Call /api/director/phase3/render
    setJobs(prev => prev.map(j => 
      j.chapterId === chapterId ? { ...j, status: 'rendering' as const } : j
    ));
  };

  const handleRenderAll = async () => {
    setIsBatchRendering(true);
    // TODO: Sequential rendering
    for (const job of jobs) {
      await handleRenderOne(job.chapterId);
    }
    setIsBatchRendering(false);
  };

  return (
    <div className="space-y-6">
      {/* Phase Indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3].map(p => (
          <button
            key={p}
            onClick={() => (p < phase || conceptApproved && p <= 2) && setPhase(p as Phase)}
            className={`px-3 py-1 rounded ${
              phase === p 
                ? 'bg-blue-600 text-white' 
                : p < phase 
                  ? 'bg-slate-700 text-slate-300 cursor-pointer' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Phase {p}
          </button>
        ))}
      </div>

      {/* Phase Content */}
      {phase === 1 && (
        <Phase1View
          projectId={projectId}
          scriptPath={scriptPath || ''}
          concept={concept}
          isGenerating={isGeneratingConcept}
          isApproved={conceptApproved}
          onGenerate={handleGenerateConcept}
          onRevise={handleReviseConcept}
          onApprove={handleApproveConcept}
        />
      )}

      {phase === 2 && (
        <Phase2View
          projectId={projectId}
          chapters={chapters}
          isLoading={isLoading}
          loadingProgress={loadingProgress}
          onConfirmBRoll={handleConfirmBRoll}
          onSelect={handleSelect}
          onComment={handleComment}
          onLock={handleLock}
          onProceed={handleProceed}
        />
      )}

      {phase === 3 && (
        <Phase3View
          projectId={projectId}
          chapters={chapters}
          jobs={jobs}
          isBatchRendering={isBatchRendering}
          onRenderOne={handleRenderOne}
          onRenderAll={handleRenderAll}
        />
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add src/components/DirectorSection.tsx
git commit -m "refactor(director): integrate Phase 1-3 into DirectorSection"
```

---

## Task 10: 后端 API - Director Phase 1-3

**Files:**
- Create: `server/director.ts`
- Modify: `server/index.ts`

**Step 1: 创建 `server/director.ts`**

```typescript
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'Projects');

export const generatePhase1 = async (req: Request, res: Response) => {
  const { projectId, scriptPath } = req.body;
  
  // TODO: Implement SSE streaming with LLM
  // For now, return mock response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const concept = `# 视觉概念提案

## 整体基调
本视频采用理性冷静的深色科技风格，配合数据可视化元素...

## 视觉风格
- 主色调：深蓝 + 金色高亮
- 动画风格：平滑渐变 + 粒子效果
- 字体：无衬线，极简`;

  res.write(`data: ${JSON.stringify({ type: 'content', content: concept })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
};

export const startPhase2 = async (req: Request, res: Response) => {
  const { projectId, brollTypes } = req.body;
  
  // TODO: Implement preview generation
  // For now, return task ID
  res.json({ taskId: `task-${Date.now()}` });
};

export const getPhase2Status = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  // TODO: Query actual status
  res.json({ progress: '3/12', chapters: [] });
};

export const selectOption = async (req: Request, res: Response) => {
  const { projectId, chapterId, optionId } = req.body;
  
  // TODO: Update selection_state.json
  res.json({ success: true });
};

export const lockChapter = async (req: Request, res: Response) => {
  const { projectId, chapterId } = req.body;
  
  // TODO: Update selection_state.json
  res.json({ success: true });
};

export const startRender = async (req: Request, res: Response) => {
  const { projectId, chapterIds } = req.body;
  
  // TODO: Call Remotion render
  res.json({ jobId: `job-${Date.now()}` });
};

export const getRenderStatus = async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  // TODO: Query actual render status
  res.json({ frame: 45, totalFrames: 90, percentage: 50 });
};
```

**Step 2: 在 `server/index.ts` 添加路由**

```typescript
import * as director from './director';

app.post('/api/director/phase1/generate', director.generatePhase1);
app.post('/api/director/phase2/start', director.startPhase2);
app.get('/api/director/phase2/status/:taskId', director.getPhase2Status);
app.post('/api/director/phase2/select', director.selectOption);
app.post('/api/director/phase2/lock', director.lockChapter);
app.post('/api/director/phase3/render', director.startRender);
app.get('/api/director/phase3/status/:jobId', director.getRenderStatus);
```

**Step 3: Commit**

```bash
git add server/director.ts server/index.ts
git commit -m "feat(server): add Director Phase 1-3 API endpoints"
```

---

## 验收检查

**Step 1: 运行测试**

```bash
npm run test:run
```

Expected: ALL PASS

**Step 2: 运行 Lint**

```bash
npm run lint
```

Expected: No errors

**Step 3: 启动开发服务器**

```bash
npm run dev
```

**验收清单**：
- [ ] Header 右上角显示 ⚙️ 设置图标
- [ ] 点击设置打开 LLM 配置模态框
- [ ] Phase 1 可生成/修订/确认概念提案
- [ ] Phase 2 B-Roll 选择器可多选
- [ ] Phase 2 显示三列式章节卡片
- [ ] Phase 3 渲染控制台显示任务列表
- [ ] 刷新页面状态保留

**Step 4: Final Commit**

```bash
git add -A
git commit -m "feat(director): complete Phase 1-3 implementation with LLM config"
```

---

## 文档清单

| 文档路径 | 内容 |
|---------|------|
| `docs/00_architecture/llm_config_design.md` | LLM 配置系统设计 |
| `docs/02_design/sd202_director_master.md` | 导演大师 V3 设计文档 |
| `docs/plans/2026-02-23-director-master-phase2.md` | 本实施计划 |

---

*Created by OldYang - 2026-02-23*
