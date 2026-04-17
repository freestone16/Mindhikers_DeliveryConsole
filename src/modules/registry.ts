import type { ModuleManifest, ModuleRegistryState } from './types';

const state: ModuleRegistryState = {
  modules: new Map(),
  listeners: new Set(),
};

function notify(): void {
  for (const listener of state.listeners) {
    listener();
  }
}

export function registerModule(manifest: ModuleManifest): void {
  state.modules.set(manifest.id, manifest);
  notify();
}

export function unregisterModule(id: string): void {
  state.modules.delete(id);
  notify();
}

export function getModule(id: string): ModuleManifest | undefined {
  return state.modules.get(id);
}

export function getRegisteredModules(): ModuleManifest[] {
  return Array.from(state.modules.values()).sort((a, b) => a.order - b.order);
}

export function subscribe(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

// Crucible placeholder — Phase 1 default registration
registerModule({
  id: 'crucible',
  label: '炼制',
  icon: null!,
  path: '/m/crucible',
  order: 10,
  description: '黄金坩埚',
});
