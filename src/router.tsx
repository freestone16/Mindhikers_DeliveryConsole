/**
 * URL Scheme & Route Constants
 *
 * PRD §7.1 URL scheme:
 *   /                                         → redirect to /m/crucible
 *   /m/:moduleId                              → module home
 *   /m/:moduleId/s/:sessionId                 → specific session
 *   /m/:moduleId/s/:sessionId?artifact=:id    → artifact drawer open
 *   /m/:moduleId/s/:sessionId?highlight=...   → origin jump (§4.4)
 *   /llm-config                               → LLM/BYOK configuration
 *
 * Phase 1: SaaSApp uses useLocation() to resolve views.
 * Phase 2+: Shell + feature slices use nested <Outlet />.
 */

/** Registered module IDs (lowercase code names per PRD §2) */
export const MODULE_IDS = ['crucible', 'roundtable', 'rador', 'writer'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

/** Default module when visiting `/` */
export const DEFAULT_MODULE: ModuleId = 'crucible';

/** Build a module home path */
export function modulePath(moduleId: ModuleId = DEFAULT_MODULE): string {
  return `/m/${moduleId}`;
}

/** Build a session path */
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
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

/** LLM config route (standalone, not under /m/) */
export const LLM_CONFIG_PATH = '/llm-config';

/** Check if a pathname points to a valid module route */
export function isModulePath(pathname: string): boolean {
  return /^\/m\/([a-z]+)(\/.*)?$/.test(pathname);
}

/** Extract moduleId from a /m/:moduleId path. Returns null if not a module route. */
export function extractModuleId(pathname: string): ModuleId | null {
  const match = pathname.match(/^\/m\/([a-z]+)/);
  if (!match) return null;
  const id = match[1];
  if ((MODULE_IDS as readonly string[]).includes(id)) return id as ModuleId;
  return null;
}

/** Extract sessionId from a /m/:moduleId/s/:sessionId path */
export function extractSessionId(pathname: string): string | null {
  const match = pathname.match(/^\/m\/[a-z]+\/s\/([^/?]+)/);
  return match ? match[1] : null;
}
