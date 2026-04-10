import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadAllPersonas, loadPersonaBySlug } from '../persona-loader';

const TEST_PERSONAS_DIR = path.join(process.cwd(), 'test-personas');

describe('Persona Loader', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_PERSONAS_DIR)) {
      fs.rmSync(TEST_PERSONAS_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_PERSONAS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_PERSONAS_DIR)) {
      fs.rmSync(TEST_PERSONAS_DIR, { recursive: true });
    }
  });

  describe('loadAllPersonas', () => {
    it('should load all valid persona files', () => {
      const validPersona = {
        slug: 'test-philosopher',
        displayName: '测试哲学家',
        avatarEmoji: '🧪',
        era: '测试时代',
        corePhilosophy: '测试哲学',
        thinkingStyle: '测试风格',
        signatureQuestion: '测试问题？',
        anchors: {
          carePriority: 0.5,
          libertyPriority: 0.5,
          authorityPriority: 0.5,
          fairnessPriority: 0.5
        },
        preferredActions: ['陈述'],
        voiceRules: {
          tone: ['中性'],
          habits: [],
          avoid: []
        },
        contrastPoints: [{ dimension: '测试', stance: '测试立场' }],
        honestBoundary: '测试边界'
      };

      fs.writeFileSync(
        path.join(TEST_PERSONAS_DIR, 'test-philosopher.json'),
        JSON.stringify(validPersona, null, 2)
      );

      const personas = loadAllPersonas(TEST_PERSONAS_DIR);
      expect(personas).toHaveLength(1);
      expect(personas[0].slug).toBe('test-philosopher');
    });

    it('should return empty array for non-existent directory', () => {
      const personas = loadAllPersonas('/non-existent/path');
      expect(personas).toEqual([]);
    });

    it('should skip invalid files and load valid ones', () => {
      const validPersona = {
        slug: 'valid-philosopher',
        displayName: '有效哲学家',
        avatarEmoji: '✅',
        era: '测试时代',
        corePhilosophy: '测试哲学',
        thinkingStyle: '测试风格',
        signatureQuestion: '测试问题？',
        anchors: {
          carePriority: 0.5,
          libertyPriority: 0.5,
          authorityPriority: 0.5,
          fairnessPriority: 0.5
        },
        preferredActions: ['陈述'],
        voiceRules: {
          tone: ['中性'],
          habits: [],
          avoid: []
        },
        contrastPoints: [{ dimension: '测试', stance: '测试立场' }],
        honestBoundary: '测试边界'
      };

      fs.writeFileSync(
        path.join(TEST_PERSONAS_DIR, 'valid-philosopher.json'),
        JSON.stringify(validPersona, null, 2)
      );

      fs.writeFileSync(
        path.join(TEST_PERSONAS_DIR, 'invalid.json'),
        JSON.stringify({ invalid: true })
      );

      const personas = loadAllPersonas(TEST_PERSONAS_DIR);
      expect(personas).toHaveLength(1);
      expect(personas[0].slug).toBe('valid-philosopher');
    });

    it('should sort personas alphabetically by filename', () => {
      const createPersona = (slug: string, name: string) => ({
        slug,
        displayName: name,
        avatarEmoji: '🧪',
        era: '测试时代',
        corePhilosophy: '测试哲学',
        thinkingStyle: '测试风格',
        signatureQuestion: '测试问题？',
        anchors: {
          carePriority: 0.5,
          libertyPriority: 0.5,
          authorityPriority: 0.5,
          fairnessPriority: 0.5
        },
        preferredActions: ['陈述'],
        voiceRules: {
          tone: ['中性'],
          habits: [],
          avoid: []
        },
        contrastPoints: [{ dimension: '测试', stance: '测试立场' }],
        honestBoundary: '测试边界'
      });

      fs.writeFileSync(
        path.join(TEST_PERSONAS_DIR, 'z-persona.json'),
        JSON.stringify(createPersona('z-persona', 'Z'))
      );
      fs.writeFileSync(
        path.join(TEST_PERSONAS_DIR, 'a-persona.json'),
        JSON.stringify(createPersona('a-persona', 'A'))
      );
      fs.writeFileSync(
        path.join(TEST_PERSONAS_DIR, 'm-persona.json'),
        JSON.stringify(createPersona('m-persona', 'M'))
      );

      const personas = loadAllPersonas(TEST_PERSONAS_DIR);
      expect(personas.map(p => p.slug)).toEqual(['a-persona', 'm-persona', 'z-persona']);
    });
  });

  describe('loadPersonaBySlug', () => {
    it('should find persona by slug', () => {
      const validPersona = {
        slug: 'find-me',
        displayName: '找到我',
        avatarEmoji: '🔍',
        era: '测试时代',
        corePhilosophy: '测试哲学',
        thinkingStyle: '测试风格',
        signatureQuestion: '测试问题？',
        anchors: {
          carePriority: 0.5,
          libertyPriority: 0.5,
          authorityPriority: 0.5,
          fairnessPriority: 0.5
        },
        preferredActions: ['陈述'],
        voiceRules: {
          tone: ['中性'],
          habits: [],
          avoid: []
        },
        contrastPoints: [{ dimension: '测试', stance: '测试立场' }],
        honestBoundary: '测试边界'
      };

      fs.writeFileSync(
        path.join(TEST_PERSONAS_DIR, 'find-me.json'),
        JSON.stringify(validPersona, null, 2)
      );

      const persona = loadPersonaBySlug('find-me', TEST_PERSONAS_DIR);
      expect(persona).not.toBeNull();
      expect(persona?.displayName).toBe('找到我');
    });

    it('should return null for non-existent slug', () => {
      const persona = loadPersonaBySlug('not-exist', TEST_PERSONAS_DIR);
      expect(persona).toBeNull();
    });

    it('should return null for non-existent directory', () => {
      const persona = loadPersonaBySlug('any', '/non-existent/path');
      expect(persona).toBeNull();
    });
  });
});
