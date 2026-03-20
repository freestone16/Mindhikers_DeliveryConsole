import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECRETS_DIR = path.resolve(__dirname, '../secrets');
const CLIENT_SECRET_FILE = path.join(SECRETS_DIR, 'client_id.json');
const YOUTUBE_UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

let activeAccessToken: string | null = null;
let tokenExpiry = 0;

interface GoogleClientConfig {
  client_id: string;
  client_secret: string;
}

export function getYoutubeAuthPort() {
  return process.env.PORT || process.env.VITE_BACKEND_PORT || '3005';
}

export function getGoogleConfig(): GoogleClientConfig {
  if (!fs.existsSync(CLIENT_SECRET_FILE)) {
    throw new Error('client_id.json not found in secrets directory');
  }

  const content = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, 'utf-8'));
  const config = content.web || content.installed;
  if (!config) {
    throw new Error('Invalid client_id.json format');
  }

  return config;
}

export function getYoutubeRedirectUri(authPort = getYoutubeAuthPort()) {
  return `http://localhost:${authPort}/auth/callback`;
}

export function buildYoutubeAuthUrl(authPort = getYoutubeAuthPort()) {
  const config = getGoogleConfig();

  return (
    'https://accounts.google.com/o/oauth2/v2/auth?' +
    `client_id=${config.client_id}&` +
    `redirect_uri=${encodeURIComponent(getYoutubeRedirectUri(authPort))}&` +
    'response_type=code&' +
    `scope=${encodeURIComponent(YOUTUBE_UPLOAD_SCOPE)}&` +
    'access_type=online&' +
    'prompt=consent'
  );
}

export async function exchangeYoutubeCode(code: string, authPort = getYoutubeAuthPort()) {
  const config = getGoogleConfig();
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', config.client_id);
  params.append('client_secret', config.client_secret);
  params.append('redirect_uri', getYoutubeRedirectUri(authPort));
  params.append('grant_type', 'authorization_code');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const data: any = await response.json();
  activeAccessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  return data;
}

export function getYoutubeTokenStatus() {
  const authenticated = Boolean(activeAccessToken) && Date.now() < tokenExpiry;

  return {
    authenticated,
    expiresIn: authenticated ? Math.floor((tokenExpiry - Date.now()) / 1000) : 0,
  };
}

export function requireYoutubeAccessToken() {
  const { authenticated } = getYoutubeTokenStatus();
  if (!authenticated || !activeAccessToken) {
    throw new Error('No active access token. Please authorize again.');
  }

  return activeAccessToken;
}

export function clearYoutubeAccessToken() {
  activeAccessToken = null;
  tokenExpiry = 0;
}
