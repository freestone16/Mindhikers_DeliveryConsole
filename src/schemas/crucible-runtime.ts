import { z } from 'zod';

export const CrucibleToolNameSchema = z.enum(['Researcher', 'FactChecker']);
export const CrucibleToolRouteModeSchema = z.enum(['primary', 'support']);
export const CrucibleToolStatusSchema = z.enum(['success', 'failed', 'skipped']);

export const SocratesToolRequestSchema = z.object({
  tool: CrucibleToolNameSchema,
  mode: CrucibleToolRouteModeSchema,
  reason: z.string().min(1),
  query: z.string().min(1).optional(),
  goal: z.string().min(1).optional(),
  scope: z.string().min(1).optional(),
});

export const SocratesDecisionSchema = z.object({
  version: z.literal('decision-v1'),
  speaker: z.string().min(1),
  reflectionIntent: z.string().min(1),
  focus: z.string().min(1),
  needsResearch: z.boolean(),
  needsFactCheck: z.boolean(),
  toolRequests: z.array(SocratesToolRequestSchema),
  stageLabel: z.string().min(1).max(24).optional(),
});

export const ToolExecutionTraceSchema = z.object({
  tool: CrucibleToolNameSchema,
  requestedBy: z.literal('Socrates'),
  mode: CrucibleToolRouteModeSchema,
  status: CrucibleToolStatusSchema,
  reason: z.string().min(1),
  input: z.object({
    query: z.string().min(1).optional(),
    goal: z.string().min(1).optional(),
    scope: z.string().min(1).optional(),
  }),
  output: z.unknown().optional(),
  error: z.string().min(1).optional(),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
});

export const PresentableDraftSchema = z.object({
  type: z.enum(['reference', 'quote', 'asset']).optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
});

export const SkillOutputPayloadSchema = z.object({
  speaker: z.string().min(1),
  reflection: z.string().min(1),
  focus: z.string().min(1),
  presentables: z.array(PresentableDraftSchema).min(1),
  topicSuggestion: z.string().min(1).max(32).optional(),
});

export type SocratesDecisionPayload = z.infer<typeof SocratesDecisionSchema>;
export type ToolExecutionTracePayload = z.infer<typeof ToolExecutionTraceSchema>;
export type SkillOutputPayloadShape = z.infer<typeof SkillOutputPayloadSchema>;
