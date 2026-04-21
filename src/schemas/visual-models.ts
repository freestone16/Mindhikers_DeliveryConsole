import { z } from 'zod';

export const VisualTaskTypeSchema = z.enum(['image', 'video']);
export const GenProviderSchema = z.enum(['volcengine', 'google']);

export type VisualTaskType = z.infer<typeof VisualTaskTypeSchema>;
export type GenProvider = z.infer<typeof GenProviderSchema>;

export interface VisualModelOption {
  id: string;
  name: string;
}

export interface VisualModelDescriptor extends VisualModelOption {
  provider: GenProvider;
  taskType: VisualTaskType;
}

export const VISUAL_MODEL_REGISTRY: VisualModelDescriptor[] = [
  { id: 'doubao-seedream-5.0-litenew', name: '豆包 Seedream 5.0 Lite (推荐)', provider: 'volcengine', taskType: 'image' },
  { id: 'doubao-seedream-4-5-251128', name: '豆包 Seedream 4.5', provider: 'volcengine', taskType: 'image' },
  { id: 'doubao-seedream-4-0-250828', name: '豆包 Seedream 4.0', provider: 'volcengine', taskType: 'image' },
  { id: 'doubao-seedream-3-0-t2i-250415', name: '豆包 Seedream 3.0 T2I', provider: 'volcengine', taskType: 'image' },
  { id: 'gemini-3-pro-image-preview', name: 'Google NanoBanana Pro (gemini-3-pro-image-preview)', provider: 'google', taskType: 'image' },
  { id: 'gemini-2.5-flash-image', name: 'Google NanoBanana (gemini-2.5-flash-image)', provider: 'google', taskType: 'image' },
  { id: 'doubao-seedance-1-5-pro', name: '豆包 Seedance 1.5 Pro (推荐)', provider: 'volcengine', taskType: 'video' },
  { id: 'doubao-seedance-1-0-pro', name: '豆包 Seedance 1.0 Pro', provider: 'volcengine', taskType: 'video' },
  { id: 'doubao-seedance-1-0-lite', name: '豆包 Seedance 1.0 Lite', provider: 'volcengine', taskType: 'video' },
];

export const getVisualModelsByProvider = (
  taskType: VisualTaskType,
): Record<GenProvider, VisualModelOption[]> => {
  const grouped: Record<GenProvider, VisualModelOption[]> = {
    volcengine: [],
    google: [],
  };

  VISUAL_MODEL_REGISTRY
    .filter((item) => item.taskType === taskType)
    .forEach((item) => {
      grouped[item.provider].push({ id: item.id, name: item.name });
    });

  return grouped;
};

export const IMAGE_MODELS_BY_PROVIDER = getVisualModelsByProvider('image');
export const VIDEO_MODELS_BY_PROVIDER = getVisualModelsByProvider('video');

export const getVisualModelDescriptor = (
  taskType: VisualTaskType,
  modelId: string,
): VisualModelDescriptor | undefined => {
  return VISUAL_MODEL_REGISTRY.find((item) => item.taskType === taskType && item.id === modelId);
};

export const inferVisualProviderFromModel = (
  taskType: VisualTaskType,
  modelId?: string | null,
): GenProvider | null => {
  if (!modelId) {
    return null;
  }

  const descriptor = getVisualModelDescriptor(taskType, modelId);
  return descriptor?.provider || null;
};
