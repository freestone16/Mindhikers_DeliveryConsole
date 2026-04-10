import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { setupHealthCheck } from './health';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const app = express();
const PORT = parseInt(process.env.PORT || '3005', 10);

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const allowedOrigins = new Set(
  [
    process.env.APP_BASE_URL?.trim(),
    process.env.CORS_ORIGIN?.trim(),
    process.env.VITE_API_BASE_URL?.trim(),
    process.env.VITE_APP_PORT ? `http://localhost:${process.env.VITE_APP_PORT}` : '',
    process.env.VITE_APP_PORT ? `http://127.0.0.1:${process.env.VITE_APP_PORT}` : '',
  ].filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || localOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json());

// Health check
setupHealthCheck(app);

// Roundtable API placeholder
app.post('/api/roundtable/start', (_req, res) => {
  res.json({ status: 'ok', message: 'Roundtable engine not yet implemented' });
});

// Static serving for production
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('{*splat}', (_req, res) => {
  res.sendFile('index.html', { root: distPath });
});

app.listen(PORT, () => {
  console.log(`Roundtable server running on port ${PORT}`);
});
