export const ensurePersonalWorkspace = async (
  _pool: unknown,
  user: { id: string; name?: string | null; email?: string | null },
) => ({
  activeWorkspace: {
    id: user.id,
  },
});
