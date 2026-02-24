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

const PROVIDER_ENV_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  zhipu: 'ZHIPU_API_KEY',
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
    }, {} as Record<string, { provider: string | null; model: string | null; inherited: boolean }>),
  });
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
  const { provider } = req.body;
  
  const envVar = PROVIDER_ENV_MAP[provider];
  const configured = !!process.env[envVar];

  if (!configured) {
    return res.json({ success: false, error: 'API Key not configured' });
  }

  const start = Date.now();
  
  try {
    // TODO: 实际调用 LLM API 测试连接
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    const latency = Date.now() - start;
    
    res.json({ success: true, latency });
  } catch {
    res.json({ success: false, error: 'Connection test failed' });
  }
};
