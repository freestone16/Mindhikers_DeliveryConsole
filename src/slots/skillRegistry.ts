import type { SkillManifest } from './types';

const skills = new Map<string, SkillManifest>();

export function registerSkill(manifest: SkillManifest): void {
  skills.set(manifest.id, manifest);
}

export function unregisterSkill(id: string): void {
  skills.delete(id);
}

export function getSkill(id: string): SkillManifest | undefined {
  return skills.get(id);
}

export function getAllSkills(): SkillManifest[] {
  return Array.from(skills.values());
}
