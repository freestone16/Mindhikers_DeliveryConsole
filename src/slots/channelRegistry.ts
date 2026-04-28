import type { ChannelManifest } from './types';

const channels = new Map<string, ChannelManifest>();

export function registerChannel(manifest: ChannelManifest): void {
  channels.set(manifest.id, manifest);
}

export function unregisterChannel(id: string): void {
  channels.delete(id);
}

export function getChannel(id: string): ChannelManifest | undefined {
  return channels.get(id);
}

export function getAllChannels(): ChannelManifest[] {
  return Array.from(channels.values());
}
