import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { setupHealthCheck } from './health';
import { applySharpenedProposition, sharpenProposition } from './proposition-sharpener';

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

// ========== Roundtable API ==========

// POST /api/roundtable/sharpen - 检测并锐化命题
app.post('/api/roundtable/sharpen', async (req, res) => {
  const { proposition, mode = 'sharpen' } = req.body;

  if (!proposition || typeof proposition !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid proposition' });
  }

  try {
    const result = await sharpenProposition(proposition, { mode });
    res.json({
      ...result,
      original: proposition,
    });
  } catch (error) {
    console.error('[POST /api/roundtable/sharpen] Error:', error);
    // Fallback：返回原命题，标记为已锐化（降级策略）
    res.json({
      isSharp: true,
      original: proposition,
      sharpened: proposition,
      reasoning: 'Fallback due to error',
    });
  }
});

// POST /api/roundtable/sharpen/apply - 应用锐化结果
app.post('/api/roundtable/sharpen/apply', (req, res) => {
  const { selectedProposition, original } = req.body;

  if (!selectedProposition || typeof selectedProposition !== 'string') {
    return res.status(400).json({ error: 'Missing selectedProposition' });
  }

  if (!original || typeof original !== 'string') {
    return res.status(400).json({ error: 'Missing original' });
  }

  const result = applySharpenedProposition(original, selectedProposition);

  if (!result.success) {
    return res.status(400).json({ error: 'Invalid selection' });
  }

  res.json({
    success: true,
    finalProposition: result.finalProposition,
  });
});

// Placeholder for future roundtable endpoints
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
