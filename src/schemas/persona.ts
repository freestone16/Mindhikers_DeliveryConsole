import { z } from 'zod';

export const ActionSchema = z.enum([
  '陈述', '质疑', '补充', '反驳', '修正', '综合'
]);

export const PersonaProfileSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1),
  avatarEmoji: z.string().min(1),
  era: z.string().min(1),

  corePhilosophy: z.string().min(1),
  thinkingStyle: z.string().min(1),
  signatureQuestion: z.string().min(1),

  anchors: z.object({
    carePriority: z.number().min(0).max(1),
    libertyPriority: z.number().min(0).max(1),
    authorityPriority: z.number().min(0).max(1),
    fairnessPriority: z.number().min(0).max(1),
  }),

  preferredActions: z.array(ActionSchema).min(1),
  voiceRules: z.object({
    tone: z.array(z.string().min(1)).min(1),
    habits: z.array(z.string()).default([]),
    avoid: z.array(z.string()).default([]),
  }),

  contrastPoints: z.array(z.object({
    dimension: z.string().min(1),
    stance: z.string().min(1),
  })).min(1),

  honestBoundary: z.string().min(1),
});

export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;
