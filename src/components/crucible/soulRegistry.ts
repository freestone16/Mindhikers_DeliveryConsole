import { parse } from 'yaml';
import type { ChatMessageMeta } from '../../types';
import { SoulProfileSchema, SoulRegistrySchema, type SoulProfile } from '../../schemas/crucible-soul';

import registryRaw from '../../../docs/02_design/crucible/soul_registry.yml?raw';
import oldzhangProfileRaw from '../../../docs/02_design/crucible/souls/oldzhang_soul.profile.yml?raw';
import oldluProfileRaw from '../../../docs/02_design/crucible/souls/oldlu_soul.profile.yml?raw';

export type CrucibleHeaderBadge = {
  id: string;
  name: string;
  role: string;
  avatarText?: string;
  avatarImage?: string;
};

const PROFILE_RAW_BY_FILE: Record<string, string> = {
  'docs/02_design/crucible/souls/oldzhang_soul.profile.yml': oldzhangProfileRaw,
  'docs/02_design/crucible/souls/oldlu_soul.profile.yml': oldluProfileRaw,
};

const UI_OVERRIDES: Record<string, Pick<CrucibleHeaderBadge, 'avatarText' | 'avatarImage'>> = {
  oldzhang: { avatarText: '张' },
  oldlu: { avatarImage: '/logo.png' },
};

const FALLBACK_SOULS = [
  {
    identity: {
      id: 'crucible_oldzhang',
      slug: 'oldzhang',
      display_name: '老张',
      archetype: 'silicon-soul',
      species: 'default-core',
      role_label: '拆概念',
      owner: 'MindHikers',
      version: '0.1.0',
    },
    runtime: {
      visibility: 'foreground',
      default_enabled: true,
    },
  },
  {
    identity: {
      id: 'crucible_oldlu',
      slug: 'oldlu',
      display_name: '老卢',
      archetype: 'carbon-soul',
      species: 'default-core',
      role_label: '立结构',
      owner: 'MindHikers',
      version: '0.1.0',
    },
    runtime: {
      visibility: 'foreground',
      default_enabled: true,
    },
  },
] as const;

function loadForegroundSouls(): SoulProfile[] {
  try {
    const registry = SoulRegistrySchema.parse(parse(registryRaw));
    return registry.souls
      .map((entry) => {
        const raw = PROFILE_RAW_BY_FILE[entry.file];
        if (!raw) {
          throw new Error(`Missing client raw profile for ${entry.file}`);
        }
        return SoulProfileSchema.parse(parse(raw));
      })
      .filter((profile) => profile.runtime.visibility === 'foreground' && profile.runtime.default_enabled);
  } catch (error) {
    console.error('[CrucibleSoulRegistry] Failed to load soul registry on client, using fallback pair.', error);
    return FALLBACK_SOULS.map((soul) => SoulProfileSchema.parse({
      ...soul,
      positioning: { mission: '', primary_functions: ['fallback'], non_goals: [] },
      values: { always_yes: [], absolute_no: [], tradeoff_order: [] },
      tactics: { intervention_rules: { when_to_enter: [], when_to_yield: [], when_to_stop: [] }, preferred_moves: [] },
      voice: { tone: [], sentence_style: { length: 'clear_first', rhythm: 'single_turn' }, rhetorical_rules: { do: [], dont: [] } },
      knowledge_binding: {
        source_documents: ['docs/02_design/crucible/_master.md'],
        external_references: [],
        memory_policy: {
          use_conversation_history: true,
          use_user_profile: true,
          use_global_crucible_rules: true,
        },
      },
      evaluation: { must_preserve: [], failure_signals: [], eval_tags: [] },
    }));
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const foregroundSouls = loadForegroundSouls();
const parsedRegistry = (() => {
  try {
    return SoulRegistrySchema.parse(parse(registryRaw));
  } catch {
    return {
      version: '0.1',
      default_pair: {
        challenger: 'oldzhang',
        synthesizer: 'oldlu',
      },
      souls: [],
    };
  }
})();

export const CRUCIBLE_FOREGROUND_SOULS = foregroundSouls;
export const CRUCIBLE_DEFAULT_PAIR = {
  challenger: parsedRegistry.default_pair.challenger || foregroundSouls[0]?.identity.slug || 'oldzhang',
  synthesizer: parsedRegistry.default_pair.synthesizer || foregroundSouls[1]?.identity.slug || 'oldlu',
};

const DEFAULT_USER_BADGE: CrucibleHeaderBadge = {
  id: 'user',
  name: '你',
  role: '当前用户',
  avatarText: '你',
};

export const buildCrucibleHeaderBadges = (userBadge?: Partial<CrucibleHeaderBadge>): CrucibleHeaderBadge[] => [
  {
    ...DEFAULT_USER_BADGE,
    ...userBadge,
    avatarText: userBadge?.avatarImage
      ? userBadge.avatarText
      : userBadge?.avatarText || userBadge?.name?.slice(0, 1) || DEFAULT_USER_BADGE.avatarText,
  },
  ...foregroundSouls.map((profile) => {
    const override = UI_OVERRIDES[profile.identity.slug] || {};
    return {
      id: profile.identity.slug,
      name: profile.identity.display_name,
      role: profile.identity.role_label,
      avatarText: override.avatarText || profile.identity.display_name.slice(0, 1),
      avatarImage: override.avatarImage,
    };
  }),
];

export const CRUCIBLE_HEADER_BADGES: CrucibleHeaderBadge[] = buildCrucibleHeaderBadges();

export function getCrucibleSpeakerMeta(speaker: string): ChatMessageMeta {
  const badge = CRUCIBLE_HEADER_BADGES.find((item) => item.id === speaker);
  if (!badge) {
    return {
      authorId: speaker,
      authorName: speaker,
      authorRole: '前台灵魂',
    };
  }

  return {
    authorId: badge.id,
    authorName: badge.name,
    authorRole: badge.role,
  };
}

export const CRUCIBLE_SPEAKER_PATTERNS = foregroundSouls.map((profile) => ({
  id: profile.identity.slug,
  displayName: profile.identity.display_name,
  meta: getCrucibleSpeakerMeta(profile.identity.slug),
  match: new RegExp(`^(?:\\*\\*)?\\s*${escapeRegExp(profile.identity.display_name)}\\s*[:：](?:\\*\\*)?\\s*`, 'u'),
}));
