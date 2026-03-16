import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { getProjectRoot, getProjectsBase, resolveProjectPath } from '../../../server/project-paths';

const originalProjectsBase = process.env.PROJECTS_BASE;

afterEach(() => {
  if (originalProjectsBase === undefined) {
    delete process.env.PROJECTS_BASE;
    return;
  }

  process.env.PROJECTS_BASE = originalProjectsBase;
});

describe('project-paths', () => {
  it('uses the default Projects fallback when PROJECTS_BASE is unset', () => {
    delete process.env.PROJECTS_BASE;

    expect(getProjectsBase()).toBe(path.resolve(process.cwd(), 'Projects'));
  });

  it('reads PROJECTS_BASE dynamically on each call', () => {
    process.env.PROJECTS_BASE = '/tmp/projects-a';
    expect(getProjectRoot('alpha')).toBe(path.resolve('/tmp/projects-a', 'alpha'));

    process.env.PROJECTS_BASE = '/tmp/projects-b';
    expect(getProjectRoot('alpha')).toBe(path.resolve('/tmp/projects-b', 'alpha'));
  });

  it('resolves nested project files from the current PROJECTS_BASE', () => {
    process.env.PROJECTS_BASE = '/tmp/projects-c';

    expect(resolveProjectPath('beta', '02_Script', 'script.md')).toBe(
      path.join('/tmp/projects-c', 'beta', '02_Script', 'script.md')
    );
  });
});
