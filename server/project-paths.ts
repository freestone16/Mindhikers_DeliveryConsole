import path from 'path';

export function getProjectsBase(): string {
  return process.env.PROJECTS_BASE || path.resolve(process.cwd(), 'Projects');
}

export function getProjectRoot(projectId: string): string {
  return path.resolve(getProjectsBase(), projectId);
}

export function resolveProjectPath(projectId: string, ...segments: string[]): string {
  return path.join(getProjectRoot(projectId), ...segments);
}
