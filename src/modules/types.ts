import type { ReactNode } from 'react';

export interface ModuleSessionItem {
  id: string;
  label: string;
  meta?: string;
  description?: string;
  status?: 'active' | 'draft' | 'archived';
}

export interface ModuleSessionSource {
  items: ModuleSessionItem[];
  activeSessionId?: string;
}

export interface ModuleManifest {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  order: number;
  description?: string;
  sessionLabel?: string;
  sessionSource?: ModuleSessionSource;
}

export interface ModuleRegistryState {
  modules: Map<string, ModuleManifest>;
  listeners: Set<() => void>;
  snapshot: ModuleManifest[];
}
