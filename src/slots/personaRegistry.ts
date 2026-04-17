import type { PersonaManifest } from './types';

const personas = new Map<string, PersonaManifest>();

export function registerPersona(manifest: PersonaManifest): void {
  personas.set(manifest.id, manifest);
}

export function unregisterPersona(id: string): void {
  personas.delete(id);
}

export function getPersona(id: string): PersonaManifest | undefined {
  return personas.get(id);
}

export function getAllPersonas(): PersonaManifest[] {
  return Array.from(personas.values());
}
