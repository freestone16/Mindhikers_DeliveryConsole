import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { LLMConfigSchema, LLMConfig, DEFAULT_LLM_CONFIG, PROVIDER_INFO, IMAGE_MODELS, VIDEO_MODELS } from '../src/schemas/llm-config';

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

const PROVIDER_ENV_MAP: Record<string, string[]> = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  google: ['GOOGLE_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  zhipu: ['ZHIPU_API_KEY'],
  siliconflow: ['SILICONFLOW_API_KEY'],
  volcengine: ['VOLCENGINE_ACCESS_KEY', 'VOLCENGINE_SECRET_KEY', 'VOLCENGINE_PROJECT_ID'],
};

const getDefaultModel = (provider: string): string => {
  const info = PROVIDER_INFO[provider];
  return info?.models[0] || 'unknown';
};

export const getConfigStatus = (req: Request, res: Response) => {
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
  
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Missing provider or apiKey' });
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
    const existingIndex = lines.findIndex(l => l.startsWith(`${envVar}=`));
    if (existingIndex >= 0) {
      lines[existingIndex] = `${envVar}=${value}`;
    } else {
      lines.push(`${envVar}=${value}`);
    }
    if (value) process.env[envVar] = value;
  };
  
  updateLine(envVars[0], apiKey);

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

  const envVars = info.envVars;
  const configured = envVars.every(v => process.env[v]);

  if (!configured) {
    return res.json({ success: false, error: `${info.name} API Key not configured` });
  }

  const start = Date.now();
  
  try {
    let url = info.baseUrl;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (provider === 'volcengine') {
      headers['Authorization'] = `Bearer ${process.env[envVars[0]]}`;
    } else {
      headers['Authorization'] = `Bearer ${process.env[envVars[0]]}`;
    }
    
    const body: Record<string, unknown> = {
      model: info.models[0],
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
    };
    
    if (provider === 'volcengine' && envVars[2]) {
      body['extra_body'] = { project_id: process.env[envVars[2]] };
    }

    const response = await fetch(`${url}/chat/completions`, {
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

export const getSavedKeys = (req: Request, res: Response) => {
  const envPath = path.join(process.cwd(), '.env');
  const savedKeys: Record<string, { last4: string; configured: boolean }> = {};
  
  for (const [provider, info] of Object.entries(PROVIDER_INFO)) {
    const envVars = info.envVars;
    const allConfigured = envVars.every(v => {
      if (!fs.existsSync(envPath)) return false;
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(new RegExp(`${v}=(.+)`));
      return match && match[1] && match[1].trim();
    });
    
    const firstEnvVar = envVars[0];
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(new RegExp(`${firstEnvVar}=(.+)`));
      if (match && match[1] && match[1].trim()) {
        savedKeys[provider] = {
          last4: match[1].trim().slice(-4),
          configured: allConfigured
        };
      } else {
        savedKeys[provider] = { last4: '', configured: false };
      }
    } else {
      savedKeys[provider] = { last4: '', configured: false };
    }
  }
  
  res.json(savedKeys);
};
