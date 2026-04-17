import type { ReactNode } from 'react';

export interface ModuleManifest {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  order: number;
  description?: string;
}

export interface ModuleRegistryState {
  modules: Map<string, ModuleManifest>;
  listeners: Set<() => void>;
}
