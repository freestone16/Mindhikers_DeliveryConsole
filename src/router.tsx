/**
 * URL Scheme & Route Constants
 *
 *   /                         -> redirect to /m/crucible
 *   /m/:moduleId              -> module home
 *   /m/:moduleId/s/:sessionId -> specific session
 *   /llm-config               -> LLM/BYOK configuration
 */

export const MODULE_IDS = ['crucible', 'roundtable', 'rador', 'writer'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export const DEFAULT_MODULE: ModuleId = 'crucible';

export function modulePath(moduleId: ModuleId = DEFAULT_MODULE): string {
  return `/m/${moduleId}`;
}

export function sessionPath(
  moduleId: ModuleId = DEFAULT_MODULE,
  sessionId: string,
  params?: { artifact?: string; highlight?: string },
): string {
  const base = `/m/${moduleId}/s/${sessionId}`;
  if (!params) return base;

  const search = new URLSearchParams();
  if (params.artifact) search.set('artifact', params.artifact);
  if (params.highlight) search.set('highlight', params.highlight);

  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export const LLM_CONFIG_PATH = '/llm-config';

export function isModulePath(pathname: string): boolean {
  return /^\/m\/([a-z]+)(\/.*)?$/.test(pathname);
}

export function extractModuleId(pathname: string): ModuleId | null {
  const match = pathname.match(/^\/m\/([a-z]+)/);
  if (!match) return null;

  const id = match[1];
  if ((MODULE_IDS as readonly string[]).includes(id)) return id as ModuleId;
  return null;
}

export function extractSessionId(pathname: string): string | null {
  const match = pathname.match(/^\/m\/[a-z]+\/s\/([^/?]+)/);
  return match ? match[1] : null;
}
