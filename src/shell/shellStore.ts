import { create } from 'zustand';

export type ShellModuleName = 'crucible' | 'roundtable' | 'rador' | 'writer' | 'distribution';

interface ShellState {
  /** Currently active module (which "shop" is open) */
  activeModule: ShellModuleName;
  /** Active session ID within the current module */
  activeSessionId: string | null;
  /** Whether the sidebar is open */
  sidebarOpen: boolean;
  /** Whether the artifact drawer is open */
  artifactDrawerOpen: boolean;
}

interface ShellActions {
  setActiveModule: (module: ShellModuleName) => void;
  setActiveSessionId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setArtifactDrawerOpen: (open: boolean) => void;
  toggleArtifactDrawer: () => void;
}

export const useShellStore = create<ShellState & ShellActions>((set) => ({
  activeModule: 'crucible',
  activeSessionId: null,
  sidebarOpen: true,
  artifactDrawerOpen: true,

  setActiveModule: (module) => set({ activeModule: module }),
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setArtifactDrawerOpen: (open) => set({ artifactDrawerOpen: open }),
  toggleArtifactDrawer: () => set((s) => ({ artifactDrawerOpen: !s.artifactDrawerOpen })),
}));
