import type { ModuleManifest, ModuleRegistryState } from './types';
import { crucibleManifest } from './crucible/manifest';
import { roundtableManifest } from './roundtable/manifest';

const state: ModuleRegistryState = {
  modules: new Map(),
  listeners: new Set(),
  snapshot: [],
};

function rebuildSnapshot(): void {
  state.snapshot = Array.from(state.modules.values()).sort((a, b) => a.order - b.order);
}

function notify(): void {
  rebuildSnapshot();
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
  return state.snapshot;
}

export function subscribe(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

registerModule(crucibleManifest);
registerModule(roundtableManifest);
