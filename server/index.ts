import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { setupHealthCheck } from './health';
import { applySharpenedProposition, sharpenProposition } from './proposition-sharpener';
import { getSession, handleDirectorCommand, startRoundtable } from './roundtable-engine';

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

app.post('/api/roundtable/turn/stream', async (req, res) => {
  const { proposition, sharpenedProposition, contrastAnchor, preferredPersonas } = req.body;

  if (!proposition || typeof proposition !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid proposition' });
  }

  try {
    await startRoundtable(
      { proposition, sharpenedProposition, contrastAnchor, preferredPersonas },
      res
    );
  } catch (error) {
    console.error('[POST /api/roundtable/turn/stream] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/roundtable/director', async (req, res) => {
  const { sessionId, command, payload } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Missing command' });
  }

  try {
    await handleDirectorCommand({ sessionId, command, payload }, res);
  } catch (error) {
    console.error('[POST /api/roundtable/director] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/roundtable/session/:id', (req, res) => {
  const { id } = req.params;
  const session = getSession(id);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
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
