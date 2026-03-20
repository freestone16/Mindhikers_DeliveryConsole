export type PlatformAuthStatus =
  | 'connected'
  | 'expired'
  | 'needs_refresh'
  | 'offline'
  | 'draft_ready';

export type PlatformAuthType = 'oauth' | 'cookie' | 'appkey';
export type DistributionTaskStatus = 'pending' | 'scheduled' | 'running' | 'completed' | 'failed';
export type DistributionResultStatus = 'success' | 'failed';

export interface PlatformAccount {
  platform: string;
  status: PlatformAuthStatus;
  target?: string;
  lastAuth?: string;
  authType: PlatformAuthType;
}

export interface AuthData {
  accounts: PlatformAccount[];
  lastChecked: string;
}

export interface DistributionTaskAssets {
  mediaUrl: string;
  textDraft: string;
  title: string;
  tags: string[];
}

export interface DistributionPlatformResult {
  platform: string;
  status: DistributionResultStatus;
  remoteId?: string;
  url?: string;
  publishedAt?: string;
  message?: string;
}

export interface DistributionTask {
  taskId: string;
  projectId: string;
  platforms: string[];
  assets: DistributionTaskAssets;
  scheduleTime?: string;
  timezone?: string;
  systemDelayMs?: number;
  status: DistributionTaskStatus;
  createdAt: string;
  updatedAt?: string;
  scheduledAt?: string;
  completedAt?: string;
  error?: string;
  results?: Record<string, DistributionPlatformResult>;
}

export interface DistributionHistoryEntry {
  historyId: string;
  taskId: string;
  projectId: string;
  platform: string;
  title: string;
  mediaUrl: string;
  status: DistributionResultStatus;
  createdAt: string;
  completedAt: string;
  remoteId?: string;
  url?: string;
  error?: string;
}

export interface DistributionVideoAsset {
  name: string;
  path: string;
  type: string;
}

export interface DistributionTextAsset {
  name: string;
  path: string;
}
