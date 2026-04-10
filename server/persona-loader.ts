import fs from 'fs';
import path from 'path';
import { PersonaProfileSchema, type PersonaProfile } from '../src/schemas/persona';

const DEFAULT_PERSONAS_DIR = path.resolve(process.cwd(), 'personas');

function resolvePersonasDir(customDir?: string): string {
  return customDir ? path.resolve(customDir) : DEFAULT_PERSONAS_DIR;
}

export function loadAllPersonas(personasDir?: string): PersonaProfile[] {
  const dir = resolvePersonasDir(personasDir);
  
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .sort();

  const personas: PersonaProfile[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      const result = PersonaProfileSchema.safeParse(parsed);
      
      if (result.success) {
        personas.push(result.data);
      } else {
        errors.push(`Failed to validate ${file}: ${result.error.message}`);
      }
    } catch (err) {
      errors.push(`Failed to load ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    console.warn('[PersonaLoader] Warnings:', errors);
  }

  return personas;
}

export function loadPersonaBySlug(slug: string, personasDir?: string): PersonaProfile | null {
  const dir = resolvePersonasDir(personasDir);
  
  if (!fs.existsSync(dir)) {
    return null;
  }

  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      
      if (parsed.slug === slug) {
        const result = PersonaProfileSchema.safeParse(parsed);
        if (result.success) {
          return result.data;
        }
        console.warn(`[PersonaLoader] Persona with slug "${slug}" failed validation: ${result.error.message}`);
        return null;
      }
    } catch (err) {
      console.warn(`[PersonaLoader] Failed to read ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return null;
}
