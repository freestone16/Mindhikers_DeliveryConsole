import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import {
  SoulProfileSchema,
  SoulRegistrySchema,
  type SoulProfile,
  type SoulRegistry,
  type SoulRegistryEntry,
} from '../src/schemas/crucible-soul';

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_REGISTRY_PATH = path.join(REPO_ROOT, 'docs/02_design/crucible/soul_registry.yml');

function readYamlFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parse(raw);
}

export function loadCrucibleSoulRegistry(registryPath = DEFAULT_REGISTRY_PATH): SoulRegistry {
  const parsed = readYamlFile(registryPath);
  return SoulRegistrySchema.parse(parsed);
}

export function loadSoulProfile(profilePath: string): SoulProfile {
  const parsed = readYamlFile(profilePath);
  return SoulProfileSchema.parse(parsed);
}

export function resolveSoulProfilePath(entry: SoulRegistryEntry, repoRoot = REPO_ROOT): string {
  return path.isAbsolute(entry.file) ? entry.file : path.join(repoRoot, entry.file);
}

export function loadRegisteredSoulProfiles(registryPath = DEFAULT_REGISTRY_PATH): SoulProfile[] {
  const registry = loadCrucibleSoulRegistry(registryPath);
  return registry.souls
    .filter((entry) => entry.status !== 'disabled')
    .map((entry) => loadSoulProfile(resolveSoulProfilePath(entry)));
}

export function loadDefaultForegroundSouls(registryPath = DEFAULT_REGISTRY_PATH): SoulProfile[] {
  return loadRegisteredSoulProfiles(registryPath).filter((profile) => (
    profile.runtime.default_enabled && profile.runtime.visibility === 'foreground'
  ));
}

