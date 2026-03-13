import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { SoulProfileSchema, SoulRegistrySchema } from '../../schemas/crucible-soul';

import registryRaw from '../../../docs/02_design/crucible/soul_registry.yml?raw';
import oldzhangProfileRaw from '../../../docs/02_design/crucible/souls/oldzhang_soul.profile.yml?raw';
import oldluProfileRaw from '../../../docs/02_design/crucible/souls/oldlu_soul.profile.yml?raw';

describe('Crucible soul schema', () => {
  it('should load and validate the crucible soul registry', () => {
    const registry = SoulRegistrySchema.parse(parse(registryRaw));

    expect(registry.default_pair.challenger).toBe('oldzhang');
    expect(registry.default_pair.synthesizer).toBe('oldlu');
    expect(registry.souls).toHaveLength(2);
  });

  it('should load default foreground soul profiles from the registry', () => {
    const profiles = [
      SoulProfileSchema.parse(parse(oldzhangProfileRaw)),
      SoulProfileSchema.parse(parse(oldluProfileRaw)),
    ].filter((profile) => profile.runtime.default_enabled && profile.runtime.visibility === 'foreground');
    const slugs = profiles.map((profile) => profile.identity.slug);

    expect(slugs).toEqual(['oldzhang', 'oldlu']);
    expect(profiles.every((profile) => profile.runtime.default_enabled)).toBe(true);
  });
});
