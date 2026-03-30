import fs from 'fs';
import path from 'path';
import { loadConfig } from './llm-config';
import { generateImageWithGoogleGemini } from './google-gemini-image';
import {
  generateImageWithVolc,
  generateVideoWithVolc,
  pollVolcImageResult,
  pollVolcVideoResult,
} from './volcengine';
import { PROVIDER_INFO, type GenerationTarget, type GenProvider } from '../src/schemas/llm-config';
import {
  getVisualModelDescriptor,
  type VisualTaskType,
} from '../src/schemas/visual-models';

export interface ResolvedDirectorVisualConfig {
  taskType: VisualTaskType;
  provider: GenProvider;
  model: string;
  providerLabel: string;
  modelLabel: string;
}

export interface StartedDirectorImageJob {
  success: boolean;
  imageUrl?: string;
  taskId?: string;
  error?: string;
  sourceProvider: GenProvider;
  sourceModel: string;
}

export interface StartedDirectorVideoJob {
  success: boolean;
  videoUrl?: string;
  taskId?: string;
  error?: string;
  sourceProvider: GenProvider;
  sourceModel: string;
}

export interface DirectorImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  sourceProvider: GenProvider;
  sourceModel: string;
}

export interface DirectorVideoResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
  sourceProvider: GenProvider;
  sourceModel: string;
}

const getProviderCredential = (provider: GenProvider): string | undefined => {
  const envVar = PROVIDER_INFO[provider].envVars[0];
  if (process.env[envVar]) return process.env[envVar];

  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const match = fs.readFileSync(envPath, 'utf-8').match(new RegExp(`^${envVar}=(.+)$`, 'm'));
  if (!match?.[1]?.trim()) return undefined;
  process.env[envVar] = match[1].trim();
  return process.env[envVar];
};

const assertProviderConfigured = (provider: GenProvider) => {
  const credential = getProviderCredential(provider);
  if (!credential) {
    throw new Error(`${PROVIDER_INFO[provider].name} 未配置凭证，请先在视觉模型配置页保存 API Key。`);
  }
};

const resolveTaskTarget = (taskType: VisualTaskType): GenerationTarget => {
  const config = loadConfig();
  return config.generation[taskType];
};

export const resolveDirectorVisualConfig = (taskType: VisualTaskType): ResolvedDirectorVisualConfig => {
  const target = resolveTaskTarget(taskType);
  const descriptor = getVisualModelDescriptor(taskType, target.model);

  if (!descriptor || descriptor.provider !== target.provider) {
    throw new Error(`当前 ${taskType} 视觉配置无效：${target.provider}/${target.model}`);
  }

  assertProviderConfigured(target.provider);

  return {
    taskType,
    provider: target.provider,
    model: target.model,
    providerLabel: PROVIDER_INFO[target.provider].name,
    modelLabel: descriptor.name,
  };
};

export const requestDirectorImage = async (
  prompt: string,
  options: {
    size?: string;
    taskKey?: string;
    outputDir?: string;
  } = {},
): Promise<StartedDirectorImageJob> => {
  const resolved = resolveDirectorVisualConfig('image');
  console.log(`[Director Visual Runtime] image -> ${resolved.provider}/${resolved.model}`);

  if (resolved.provider === 'google') {
    const result = await generateImageWithGoogleGemini(prompt, {
      model: resolved.model,
      taskKey: options.taskKey,
      outputDir: options.outputDir,
    });

    return {
      success: Boolean(result.image_url),
      imageUrl: result.image_url,
      error: result.error,
      sourceProvider: resolved.provider,
      sourceModel: resolved.model,
    };
  }

  const result = await generateImageWithVolc(prompt, {
    model: resolved.model,
    size: options.size,
  });

  return {
    success: Boolean(result.image_url || result.task_id),
    imageUrl: result.image_url,
    taskId: result.task_id,
    error: result.error,
    sourceProvider: resolved.provider,
    sourceModel: resolved.model,
  };
};

export const pollDirectorImage = async (
  taskId: string,
  sourceProvider: GenProvider,
  sourceModel: string,
): Promise<DirectorImageResult> => {
  if (sourceProvider !== 'volcengine') {
    return {
      success: false,
      error: `${sourceProvider}/${sourceModel} 不支持异步轮询图片任务`,
      sourceProvider,
      sourceModel,
    };
  }

  const result = await pollVolcImageResult(taskId);
  return {
    success: result.status === 'completed' && Boolean(result.image_url),
    imageUrl: result.image_url,
    error: result.error || (result.status === 'failed' ? 'Image generation failed' : undefined),
    sourceProvider,
    sourceModel,
  };
};

export const generateDirectorImage = async (
  prompt: string,
  options: {
    taskKey?: string;
    outputDir?: string;
    timeoutMs?: number;
    size?: string;
  } = {},
): Promise<DirectorImageResult> => {
  const started = await requestDirectorImage(prompt, options);
  if (!started.success) {
    return started;
  }

  if (started.imageUrl) {
    return started;
  }

  if (!started.taskId) {
    return {
      success: false,
      error: 'No task id returned from image provider',
      sourceProvider: started.sourceProvider,
      sourceModel: started.sourceModel,
    };
  }

  const pollInterval = 2000;
  const timeoutMs = options.timeoutMs || 80000;
  const maxPolls = Math.ceil(timeoutMs / pollInterval);

  for (let index = 0; index < maxPolls; index++) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    const result = await pollDirectorImage(started.taskId, started.sourceProvider, started.sourceModel);
    if (result.success && result.imageUrl) {
      return result;
    }
    if (result.error) {
      return result;
    }
  }

  return {
    success: false,
    error: `Image generation timeout after ${timeoutMs / 1000}s`,
    sourceProvider: started.sourceProvider,
    sourceModel: started.sourceModel,
  };
};

export const requestDirectorVideo = async (
  prompt: string,
  options: { duration?: number } = {},
): Promise<StartedDirectorVideoJob> => {
  const resolved = resolveDirectorVisualConfig('video');
  console.log(`[Director Visual Runtime] video -> ${resolved.provider}/${resolved.model}`);

  if (resolved.provider !== 'volcengine') {
    return {
      success: false,
      error: `${resolved.provider}/${resolved.model} 暂不支持视频生成`,
      sourceProvider: resolved.provider,
      sourceModel: resolved.model,
    };
  }

  const result = await generateVideoWithVolc(prompt, {
    model: resolved.model,
    duration: options.duration,
  });

  return {
    success: Boolean(result.video_url || result.task_id),
    videoUrl: result.video_url,
    taskId: result.task_id,
    error: result.error,
    sourceProvider: resolved.provider,
    sourceModel: resolved.model,
  };
};

export const pollDirectorVideo = async (
  taskId: string,
  sourceProvider: GenProvider,
  sourceModel: string,
): Promise<DirectorVideoResult> => {
  if (sourceProvider !== 'volcengine') {
    return {
      success: false,
      error: `${sourceProvider}/${sourceModel} 不支持异步轮询视频任务`,
      sourceProvider,
      sourceModel,
    };
  }

  const result = await pollVolcVideoResult(taskId);
  return {
    success: result.status === 'completed' && Boolean(result.video_url),
    videoUrl: result.video_url,
    error: result.error || (result.status === 'failed' ? 'Video generation failed' : undefined),
    sourceProvider,
    sourceModel,
  };
};
