import { z } from 'zod';

export const VisibilitySchema = z.enum(['workspace']).default('workspace');
export type Visibility = z.infer<typeof VisibilitySchema>;

export interface SlotManifestBase {
  id: string;
  label: string;
  description?: string;
  visibility: Visibility;
}

export interface ChannelManifest extends SlotManifestBase {
  spirit: string;
}

export interface PersonaManifest extends SlotManifestBase {
  systemPrompt: string;
  avatar?: string;
}

export interface SkillManifest extends SlotManifestBase {
  moduleId: string;
  handler: string;
}
