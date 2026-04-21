import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { LLMConfigSchema, DEFAULT_LLM_CONFIG, PROVIDER_INFO, IMAGE_MODELS, VIDEO_MODELS } from '../src/schemas/llm-config';
import type { LLMConfig } from '../src/schemas/llm-config';

const CONFIG_DIR = path.join(process.cwd(), '.agent', 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'llm_config.json');

const ensureConfigDir = () => {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
};

export const loadConfig = (): LLMConfig => {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_LLM_CONFIG, null, 2));
    return DEFAULT_LLM_CONFIG;
  }
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(content);

  const merged = {
    ...DEFAULT_LLM_CONFIG,
    ...parsed,
    generation: parsed.generation || DEFAULT_LLM_CONFIG.generation,
    global: parsed.global || DEFAULT_LLM_CONFIG.global,
    experts: parsed.experts || DEFAULT_LLM_CONFIG.experts,
  };

  return LLMConfigSchema.parse(merged);
};

const saveConfig = (config: LLMConfig) => {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};

export const getConfigStatus = (_req: Request, res: Response) => {
  const config = loadConfig();

  const providers = Object.keys(PROVIDER_INFO).reduce((acc, provider) => {
    const info = PROVIDER_INFO[provider];
    const allConfigured = info.envVars.every(v => process.env[v]);
    acc[provider] = {
      configured: allConfigured,
      type: info.type,
      name: info.name,
      models: info.models,
    };
    return acc;
  }, {} as Record<string, { configured: boolean; type: string; name: string; models: string[] }>);

  res.json({
    providers,
    global: config.global,
    generation: config.generation,
    experts: config.experts,
    availableModels: {
      image: IMAGE_MODELS,
      video: VIDEO_MODELS,
    },
  });
};

export const saveApiKey = (req: Request, res: Response) => {
  const { provider, apiKey, apiKey2, projectId } = req.body;

  if (!provider) {
    return res.status(400).json({ error: 'Missing provider' });
  }

  // volcengine 允许只更新接入点，不强制要求同时更新 apiKey
  if (!apiKey && provider !== 'volcengine') {
    return res.status(400).json({ error: 'Missing apiKey' });
  }

  const envVars = PROVIDER_INFO[provider]?.envVars;
  if (!envVars) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const lines = envContent.split('\n');

  const updateLine = (envVar: string, value: string) => {
    if (!value) return; // 不要用空字符串覆盖现有配置
    const existingIndex = lines.findIndex(l => l.startsWith(`${envVar}=`));
    if (existingIndex >= 0) {
      lines[existingIndex] = `${envVar}=${value}`;
    } else {
      lines.push(`${envVar}=${value}`);
    }
    process.env[envVar] = value;
  };

  if (apiKey) updateLine(envVars[0], apiKey);

  if (provider === 'volcengine') {
    if (apiKey2) updateLine(envVars[1], apiKey2);
    if (projectId) updateLine(envVars[2], projectId);
  }

  fs.writeFileSync(envPath, lines.join('\n'));

  res.json({ success: true, message: 'API Key saved successfully' });
};

export const updateConfig = (req: Request, res: Response) => {
  const config = loadConfig();
  const { global, generation, experts } = req.body;

  if (global) {
    config.global = { ...config.global, ...global };
  }

  if (generation) {
    config.generation = { ...config.generation, ...generation };
  }

  if (experts) {
    for (const [expertName, expertConfig] of Object.entries(experts)) {
      if (expertConfig && config.experts[expertName as keyof typeof config.experts] !== undefined) {
        const current = config.experts[expertName as keyof typeof config.experts];
        config.experts[expertName as keyof typeof config.experts] = {
          ...(current || { enabled: false, llm: null, imageModel: null, videoModel: null }),
          ...expertConfig,
        };
      }
    }
  }

  const validated = LLMConfigSchema.parse(config);
  saveConfig(validated);

  res.json({ success: true, config: validated });
};

export const testConnection = async (req: Request, res: Response) => {
  const { provider } = req.body;

  const info = PROVIDER_INFO[provider];
  if (!info) {
    return res.json({ success: false, error: 'Unknown provider' });
  }

  // 优先从 .env 文件读取最新值（进程启动后新保存的 key 也能实时生效）
  const getLatestKey = (varName: string): string | undefined => {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(new RegExp(`^${varName}=(.+)$`, 'm'));
      if (match && match[1]?.trim()) return match[1].trim();
    }
    return process.env[varName];
  };

  const apiKey = getLatestKey(info.envVars[0]);

  if (!apiKey) {
    return res.json({ success: false, error: `${info.name} API Key not configured` });
  }

  const start = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // 火山引擎：使用 /models 接口轻量探测鉴权，不触发真实图生任务，不消耗配额
    if (info.type === 'generation') {
      const response = await fetch(`${info.baseUrl}/models`, {
        method: 'GET',
        headers,
      });

      const latency = Date.now() - start;

      // 200 或 404 均代表鉴权通过（方舟的 /models 枚举可能返回 404，但连通性正常）
      if (response.ok || response.status === 404) {
        res.json({ success: true, latency });
      } else {
        const error = await response.text();
        res.json({ success: false, error: `API Error ${response.status}: ${error.slice(0, 200)}` });
      }
      return;
    }

    // LLM providers: use /chat/completions
    const body: Record<string, unknown> = {
      model: info.models[0],
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
    };

    const response = await fetch(`${info.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const latency = Date.now() - start;

    if (response.ok) {
      res.json({ success: true, latency });
    } else {
      const error = await response.text();
      res.json({ success: false, error: `API Error: ${error.slice(0, 100)}` });
    }
  } catch (error: any) {
    res.json({ success: false, error: error.message });
  }
};

export const testAllConnections = async (_req: Request, res: Response) => {
  const results: Record<string, any> = {};
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  const promises = Object.keys(PROVIDER_INFO).map(async (provider) => {
    const info = PROVIDER_INFO[provider];
    const envVars = info.envVars;

    let configured = false;
    let apiKey = process.env[envVars[0]];

    const match = envContent.match(new RegExp(`${envVars[0]}=(.+)`));
    if (match && match[1] && match[1].trim()) {
      configured = true;
      apiKey = match[1].trim();
    } else if (apiKey && apiKey.trim()) {
      configured = true;
    }

    if (!configured || !apiKey) {
      results[provider] = { success: false, configured: false };
      return;
    }

    const start = Date.now();
    try {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      let response;
      if (info.type === 'generation') {
        const endpointId = process.env['VOLCENGINE_ENDPOINT_ID_IMAGE'] || process.env['VOLCENGINE_ENDPOINT_ID'] || info.models[0];
        response = await fetch(`${info.baseUrl}/images/generations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: endpointId,
            prompt: 'a simple blue circle on white background',
            size: '256x256',
            num_images: 1,
          }),
          signal: controller.signal
        });
      } else {
        response = await fetch(`${info.baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: info.models[0],
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 5,
          }),
          signal: controller.signal
        });
      }
      clearTimeout(timeoutId);

      const latency = Date.now() - start;
      if (response.ok) {
        results[provider] = { success: true, configured: true, latency };
      } else {
        const error = await response.text();
        results[provider] = { success: false, configured: true, error: `API Error: ${error.slice(0, 100)}` };
      }
    } catch (error: any) {
      results[provider] = { success: false, configured: true, error: error.message };
    }
  });

  await Promise.all(promises);
  res.json(results);
};

export const getSavedKeys = (_req: Request, res: Response) => {
  const envPath = path.join(process.cwd(), '.env');
  const savedKeys: Record<string, any> = {};

  const readEnvFile = () => {
    if (!fs.existsSync(envPath)) return '';
    return fs.readFileSync(envPath, 'utf-8');
  };

  for (const [provider, info] of Object.entries(PROVIDER_INFO)) {
    const envVars = info.envVars;
    const envContent = readEnvFile();

    const getFieldValue = (varName: string) => {
      const match = envContent.match(new RegExp(`${varName}=(.+)`));
      return match && match[1] && match[1].trim() ? match[1].trim() : null;
    };

    const primaryValue = getFieldValue(envVars[0]);

    if (provider === 'volcengine') {
      const imageEp = getFieldValue(envVars[1]);
      const videoEp = getFieldValue(envVars[2]);
      savedKeys[provider] = {
        last4: primaryValue ? primaryValue.slice(-4) : '',
        configured: !!(primaryValue && imageEp && videoEp),
        endpointImageLast8: imageEp ? imageEp.slice(-8) : '',
        endpointVideoLast8: videoEp ? videoEp.slice(-8) : '',
      };
    } else {
      savedKeys[provider] = {
        last4: primaryValue ? primaryValue.slice(-4) : '',
        configured: !!primaryValue,
      };
    }
  }

  res.json(savedKeys);
};

export const resolveChatLlm = (expertId?: string | null) => {
  const config = loadConfig();

  const expertMap: Record<string, keyof LLMConfig['experts']> = {
    GoldenMetallurgist: 'crucible',
    Writer: 'writer',
    Director: 'director',
    MusicDirector: 'music',
    ThumbnailMaster: 'thumbnail',
    MarketingMaster: 'marketing',
    ShortsMaster: 'shorts',
  };

  const expertKey = expertId ? expertMap[expertId] : undefined;
  const expertConfig = expertKey ? config.experts[expertKey] : null;
  const provider = expertConfig?.llm?.provider || config.global.provider;
  const model = expertConfig?.llm?.model || config.global.model;
  const providerInfo = PROVIDER_INFO[provider];
  const mismatch = Boolean(
    providerInfo
    && providerInfo.type === 'llm'
    && model
    && !providerInfo.models.includes(model)
  );

  return {
    provider,
    model,
    label: `${PROVIDER_INFO[provider]?.name || provider} / ${model}`,
    source: expertConfig?.llm?.provider ? 'expert' : 'global',
    mismatch,
  };
};
