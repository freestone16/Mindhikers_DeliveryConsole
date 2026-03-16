import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env.local'), override: true });

function parsePort(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getRuntimePorts() {
  const backendPort = parsePort(process.env.PORT || process.env.VITE_BACKEND_PORT, 3005);
  const frontendPort = parsePort(process.env.VITE_APP_PORT || process.env.VITE_PORT, 5178);
  const backendHost = process.env.VITE_BACKEND_HOST || '127.0.0.1';
  const backendTarget = process.env.VITE_BACKEND_TARGET || `http://${backendHost}:${backendPort}`;

  return {
    backendHost,
    backendPort,
    frontendPort,
    backendTarget,
    projectRoot,
  };
}
