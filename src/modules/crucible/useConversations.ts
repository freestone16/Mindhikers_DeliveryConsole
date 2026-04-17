import { useQuery } from '@tanstack/react-query';
import { buildApiUrl } from '../../config/runtime';
import type { CrucibleConversationSummary } from '../../components/crucible/types';

/**
 * Fetch the conversation list for a given workspace.
 *
 * This hook serves as the Phase 2 data-layer pattern reference.
 * All module-specific query hooks should follow this structure:
 *   1. Co-located in src/modules/<module>/
 *   2. Use @tanstack/react-query for caching + refetch
 *   3. Use buildApiUrl() for endpoint construction
 *   4. Import types from existing type files (no duplication)
 */
export function useConversations(workspaceId: string | null) {
  return useQuery<CrucibleConversationSummary[]>({
    queryKey: ['crucible', 'conversations', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];

      const url = buildApiUrl(`/api/crucible/conversations?workspaceId=${encodeURIComponent(workspaceId)}`);
      const res = await fetch(url, { credentials: 'include' });

      if (!res.ok) {
        throw new Error(`Failed to fetch conversations: ${res.status}`);
      }

      return res.json();
    },
    enabled: !!workspaceId,
    staleTime: 15_000,
  });
}
