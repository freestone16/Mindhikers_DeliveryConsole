import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import {
  LLMConfigSchema,
  DEFAULT_LLM_CONFIG,
  PROVIDER_INFO,
  IMAGE_MODELS_BY_PROVIDER,
  VIDEO_MODELS_BY_PROVIDER,
  normalizeProviderConfig,
  normalizeGenerationConfig,
  normalizeGenerationTarget,
  normalizeExpertsConfig,
} from '../src/schemas/llm-config';
import type { LLMConfig } from '../src/schemas/llm-config';

const CONFIG_DIR = path.join(process.cwd(), '.agent', 'config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'llm_config.json');

const ensureConfigDir = () => {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
};

const getEnvFileContent = (): string => {
  const envPath = path.join(process.cwd(), '.env');
  return fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
};

const getEnvValue = (varName: string): string | undefined => {
  if (process.env[varName]) return process.env[varName];

  const match = getEnvFileContent().match(new RegExp(`^${varName}=(.+)$`, 'm'));
  if (match?.[1]?.trim()) {
    const value = match[1].trim();
    process.env[varName] = value;
    return value;
  }

  return undefined;
};

const getConfiguredProviders = () => {
  return Object.keys(PROVIDER_INFO).reduce((acc, provider) => {
    const info = PROVIDER_INFO[provider];
    acc[provider] = info.envVars.every((envVar) => Boolean(getEnvValue(envVar)));
    return acc;
  }, {} as Record<string, boolean>);
};

export const loadConfig = (): LLMConfig => {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_LLM_CONFIG, null, 2));
    return DEFAULT_LLM_CONFIG;
  }
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(content);

  const merged: LLMConfig = {
    ...DEFAULT_LLM_CONFIG,
    ...parsed,
    global: parsed.global || DEFAULT_LLM_CONFIG.global,
    experts: normalizeExpertsConfig(parsed.experts),
    generation: normalizeGenerationConfig(parsed.generation),
  };

  // 归一化 global provider/model/baseUrl 三字段联动
  if (merged.global) {
    const normalized = normalizeProviderConfig(merged.global.provider, merged.global.model, merged.global.baseUrl);
    merged.global = normalized;
  }

  const validated = LLMConfigSchema.parse(merged);
  const normalized = JSON.stringify(validated, null, 2);
  if (content.trim() !== normalized.trim()) {
    fs.writeFileSync(CONFIG_PATH, normalized);
  }

  return validated;
};

const saveConfig = (config: LLMConfig) => {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};

export const getConfigStatus = (_req: Request, res: Response) => {
  const config = loadConfig();
  const configuredProviders = getConfiguredProviders();

  const providers = Object.keys(PROVIDER_INFO).reduce((acc, provider) => {
    const info = PROVIDER_INFO[provider];
    acc[provider] = {
      configured: configuredProviders[provider],
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
      image: IMAGE_MODELS_BY_PROVIDER,
      video: VIDEO_MODELS_BY_PROVIDER,
    },
  });
};

export const saveApiKey = (req: Request, res: Response) => {
  const { provider, apiKey } = req.body;

  if (!provider) {
    return res.status(400).json({ error: 'Missing provider' });
  }

  if (!apiKey) {
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

  updateLine(envVars[0], apiKey);

  fs.writeFileSync(envPath, lines.join('\n'));

  res.json({ success: true, message: 'API Key saved successfully' });
};

export const updateConfig = (req: Request, res: Response) => {
  const config = loadConfig();
  const { global, generation, experts } = req.body;

  if (global) {
    const merged = { ...config.global, ...global };
    // 归一化：切 provider 时自动修正 model/baseUrl
    const normalized = normalizeProviderConfig(merged.provider, merged.model, merged.baseUrl);
    config.global = normalized;
  }

  if (generation) {
    const next = generation as Partial<LLMConfig['generation']> & {
      image?: Partial<LLMConfig['generation']['image']>;
      video?: Partial<LLMConfig['generation']['video']>;
    };
    config.generation = {
      image: normalizeGenerationTarget('image', next.image ? { ...config.generation.image, ...next.image } : config.generation.image),
      video: normalizeGenerationTarget('video', next.video ? { ...config.generation.video, ...next.video } : config.generation.video),
    };
  }

  if (experts) {
    for (const [expertName, expertConfig] of Object.entries(experts)) {
      if (expertConfig && config.experts[expertName as keyof typeof config.experts] !== undefined) {
        const current = config.experts[expertName as keyof typeof config.experts];
        config.experts[expertName as keyof typeof config.experts] =
          expertConfig === null
            ? null
            : {
                ...(current || { enabled: false, llm: null }),
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

  const apiKey = getEnvValue(info.envVars[0]);

  if (!apiKey) {
    return res.json({ success: false, error: `${info.name} API Key not configured` });
  }

  const start = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // Google Gemini Image：用 models.list 轻量探测 key 是否可用
    if (provider === 'google') {
      const response = await fetch(`${info.baseUrl}/models?key=${encodeURIComponent(apiKey)}`, {
        method: 'GET',
      });

      const latency = Date.now() - start;

      if (response.ok) {
        res.json({ success: true, latency });
      } else {
        const error = await response.text();
        res.json({ success: false, error: `API Error ${response.status}: ${error.slice(0, 200)}` });
      }
      return;
    }

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
  const envContent = getEnvFileContent();

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
      if (provider === 'google') {
        response = await fetch(`${info.baseUrl}/models?key=${encodeURIComponent(apiKey)}`, {
          method: 'GET',
          signal: controller.signal
        });
      } else if (info.type === 'generation') {
        response = await fetch(`${info.baseUrl}/images/generations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: info.models[0],
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
      savedKeys[provider] = {
        last4: primaryValue ? primaryValue.slice(-4) : '',
        configured: !!primaryValue,
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
