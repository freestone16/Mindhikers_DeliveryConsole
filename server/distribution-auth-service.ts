import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AuthData, PlatformAccount, PlatformAuthStatus } from './distribution-types';
import { getYoutubeTokenStatus } from './youtube-oauth-service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_FILE = path.join(__dirname, '../../.mindhikers/auth.json');

const PLATFORM_GROUPS = {
  A: ['twitter', 'weibo', 'wechat_mp'],
  B: ['youtube', 'bilibili'],
  C: ['youtube_shorts', 'douyin', 'wechat_video'],
} as const;

function createInitialAuthData(): AuthData {
  return {
    accounts: [
      { platform: 'twitter', status: 'expired', authType: 'oauth' },
      { platform: 'youtube', status: 'connected', target: 'MindHikers Main', authType: 'oauth' },
      { platform: 'bilibili', status: 'connected', target: '老卢的B站号', authType: 'cookie' },
      { platform: 'douyin', status: 'needs_refresh', authType: 'cookie' },
      { platform: 'wechat_video', status: 'offline', authType: 'cookie' },
      { platform: 'weibo', status: 'expired', authType: 'cookie' },
      { platform: 'wechat_mp', status: 'draft_ready', target: '黄金坩埚研究所', authType: 'appkey' },
      { platform: 'youtube_shorts', status: 'connected', target: 'MindHikers Main', authType: 'oauth' },
    ],
    lastChecked: new Date().toISOString(),
  };
}

export function ensureAuthFile(): AuthData {
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  if (!fs.existsSync(AUTH_FILE)) {
    const initialData = createInitialAuthData();
    fs.writeFileSync(AUTH_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }

  return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
}

function saveAuthData(authData: AuthData) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));
}

export function markPlatformsConnected(platforms: string[]) {
  const authData = ensureAuthFile();
  const now = new Date().toISOString();

  for (const platform of platforms) {
    const match = findAccount(authData, platform);
    if (!match) {
      continue;
    }

    authData.accounts[match.index].status = 'connected';
    authData.accounts[match.index].lastAuth = now;
  }

  authData.lastChecked = now;
  saveAuthData(authData);
}

function findAccount(authData: AuthData, platform: string): { account: PlatformAccount; index: number } | null {
  const index = authData.accounts.findIndex((account) => account.platform === platform);
  if (index === -1) {
    return null;
  }

  return {
    account: authData.accounts[index],
    index,
  };
}

export function getGroupedAuthStatus() {
  const authData = ensureAuthFile();
  const youtubeState = getYoutubeTokenStatus();
  const accounts = authData.accounts.map((account) => {
    if (account.platform === 'youtube' || account.platform === 'youtube_shorts') {
      return {
        ...account,
        status: youtubeState.authenticated ? 'connected' : 'expired',
      };
    }

    return account;
  });

  return {
    data: {
      A: {
        name: '图文阵地',
        platforms: PLATFORM_GROUPS.A.map((platform) => accounts.find((account) => account.platform === platform)).filter(Boolean),
      },
      B: {
        name: '长轴纵深',
        platforms: PLATFORM_GROUPS.B.map((platform) => accounts.find((account) => account.platform === platform)).filter(Boolean),
      },
      C: {
        name: '竖屏池',
        platforms: PLATFORM_GROUPS.C.map((platform) => accounts.find((account) => account.platform === platform)).filter(Boolean),
      },
    },
    lastChecked: authData.lastChecked,
  };
}

export function refreshPlatformAuth(platform: string) {
  const authData = ensureAuthFile();
  const match = findAccount(authData, platform);
  if (!match) {
    throw new Error('Platform not found');
  }

  authData.accounts[match.index].status = 'connected';
  authData.accounts[match.index].lastAuth = new Date().toISOString();
  authData.lastChecked = new Date().toISOString();
  saveAuthData(authData);

  return authData.accounts[match.index];
}

export function getPlatformAccount(platform: string): PlatformAccount | null {
  const authData = ensureAuthFile();
  const match = findAccount(authData, platform);
  if (!match) {
    return null;
  }

  if (platform === 'youtube' || platform === 'youtube_shorts') {
    const youtubeState = getYoutubeTokenStatus();
    return {
      ...match.account,
      status: youtubeState.authenticated ? 'connected' : 'expired',
    };
  }

  return match.account;
}

export function requirePlatformAuth(platform: string, allowedStatuses: PlatformAuthStatus[]) {
  const account = getPlatformAccount(platform);
  if (!account) {
    throw new Error(`Platform not found: ${platform}`);
  }

  if (!allowedStatuses.includes(account.status)) {
    throw new Error(`Platform auth not ready for ${platform}: ${account.status}`);
  }

  return account;
}

export function revokePlatformAuth(platform: string) {
  const authData = ensureAuthFile();
  const match = findAccount(authData, platform);
  if (!match) {
    throw new Error('Platform not found');
  }

  authData.accounts[match.index].status = 'offline';
  authData.accounts[match.index].target = undefined;
  authData.accounts[match.index].lastAuth = new Date().toISOString();
  authData.lastChecked = new Date().toISOString();
  saveAuthData(authData);

  return authData.accounts[match.index];
}
