import { z } from 'zod';

const StageSchema = z.enum([
  'topic_lock',
  'deep_dialogue',
  'crystallization',
  'thesis_finalization',
]);

const VisibilitySchema = z.enum(['foreground', 'background', 'hidden']);
const OutputModeSchema = z.enum(['spoken_turn', 'worksheet_card', 'hidden']);
const SoulStatusSchema = z.enum(['active', 'experimental', 'disabled']);
const SoulTierSchema = z.enum(['core', 'extension', 'experimental']);

export const SoulIdentitySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  display_name: z.string().min(1),
  archetype: z.string().min(1),
  species: z.string().min(1),
  role_label: z.string().min(1),
  owner: z.string().min(1),
  version: z.string().min(1),
});

export const SoulPositioningSchema = z.object({
  mission: z.string().min(1),
  primary_functions: z.array(z.string().min(1)).min(1),
  non_goals: z.array(z.string().min(1)).default([]),
});

export const SoulValuesSchema = z.object({
  always_yes: z.array(z.string().min(1)).default([]),
  absolute_no: z.array(z.string().min(1)).default([]),
  tradeoff_order: z.array(z.string().min(1)).default([]),
});

export const SoulTacticsSchema = z.object({
  intervention_rules: z.object({
    when_to_enter: z.array(z.string().min(1)).default([]),
    when_to_yield: z.array(z.string().min(1)).default([]),
    when_to_stop: z.array(z.string().min(1)).default([]),
  }),
  preferred_moves: z.array(z.string().min(1)).default([]),
});

export const SoulVoiceSchema = z.object({
  tone: z.array(z.string().min(1)).default([]),
  sentence_style: z.object({
    length: z.string().min(1),
    rhythm: z.string().min(1),
  }),
  rhetorical_rules: z.object({
    do: z.array(z.string().min(1)).default([]),
    dont: z.array(z.string().min(1)).default([]),
  }),
});

export const SoulKnowledgeBindingSchema = z.object({
  source_documents: z.array(z.string().min(1)).min(1),
  external_references: z.array(z.string().min(1)).default([]),
  memory_policy: z.object({
    use_conversation_history: z.boolean(),
    use_user_profile: z.boolean(),
    use_global_crucible_rules: z.boolean(),
  }),
});

export const SoulRuntimeSchema = z.object({
  visibility: VisibilitySchema,
  default_enabled: z.boolean(),
  allowed_stages: z.array(StageSchema).default([]),
  disallowed_stages: z.array(StageSchema).default([]),
  output_mode: OutputModeSchema,
  handoff_targets: z.array(z.string().min(1)).default([]),
});

export const SoulEvaluationSchema = z.object({
  must_preserve: z.array(z.string().min(1)).default([]),
  failure_signals: z.array(z.string().min(1)).default([]),
  eval_tags: z.array(z.string().min(1)).default([]),
});

export const SoulProfileSchema = z.object({
  identity: SoulIdentitySchema,
  positioning: SoulPositioningSchema,
  values: SoulValuesSchema,
  tactics: SoulTacticsSchema,
  voice: SoulVoiceSchema,
  knowledge_binding: SoulKnowledgeBindingSchema,
  runtime: SoulRuntimeSchema,
  evaluation: SoulEvaluationSchema,
});

export const SoulRegistryEntrySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  display_name: z.string().min(1),
  file: z.string().min(1),
  source_document: z.string().min(1),
  status: SoulStatusSchema,
  tier: SoulTierSchema,
  default_enabled: z.boolean(),
});

export const SoulRegistrySchema = z.object({
  version: z.string().min(1),
  default_pair: z.object({
    challenger: z.string().min(1),
    synthesizer: z.string().min(1),
  }),
  souls: z.array(SoulRegistryEntrySchema).min(1),
});

export type CrucibleStage = z.infer<typeof StageSchema>;
export type SoulProfile = z.infer<typeof SoulProfileSchema>;
export type SoulRegistry = z.infer<typeof SoulRegistrySchema>;
export type SoulRegistryEntry = z.infer<typeof SoulRegistryEntrySchema>;

