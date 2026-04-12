import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { resolveCruciblePersistenceContext } from './crucible-persistence';
import { setupHealthCheck } from './health';
import { applySharpenedProposition, sharpenProposition } from './proposition-sharpener';
import { getSession, handleDirectorCommand, startRoundtable, getDeepDiveSession, saveDeepDiveSession, getSpikeFromSession } from './roundtable-engine';
import { loadPersonaBySlug } from './persona-loader';
import { askDeepDiveQuestion, summarizeDeepDive } from './deepdive-engine';

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
    let persistenceContext = undefined;

    if (command === '止') {
      try {
        persistenceContext = await resolveCruciblePersistenceContext(req, {
          conversationId: sessionId,
        });
      } catch (error) {
        console.error('[POST /api/roundtable/director] Failed to resolve persistence context:', error);
      }
    }

    const directorContext = command === '止' ? { persistenceContext } : undefined;
    await handleDirectorCommand({ sessionId, command, payload }, res, directorContext);
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

// POST /api/roundtable/deepdive - 从 Spike 发起深聊
app.post('/api/roundtable/deepdive', async (req, res) => {
  const { sessionId, spikeId, openingQuestion } = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  if (!spikeId || typeof spikeId !== 'string') {
    return res.status(400).json({ error: 'Missing spikeId' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const spike = getSpikeFromSession(session, spikeId);
  if (!spike) {
    return res.status(404).json({ error: 'Spike not found' });
  }

  const persona = loadPersonaBySlug(spike.sourceSpeaker);
  if (!persona) {
    return res.status(400).json({ error: `Persona not found: ${spike.sourceSpeaker}` });
  }

  try {
    const { randomUUID } = await import('crypto');
    const deepDiveSession = {
      id: randomUUID(),
      parentSessionId: session.id,
      spikeId: spike.id,
      spikeTitle: spike.title,
      spikeContent: spike.content,
      sourceSpeaker: spike.sourceSpeaker,
      status: 'active' as const,
      turns: [] as Array<{ role: 'user' | 'philosopher'; content: string; timestamp: number }>,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const question = openingQuestion || spike.bridgeHint;

    const philosopherTurn = await askDeepDiveQuestion({
      deepDiveSession,
      question,
      personaProfile: persona,
      session,
      spike,
    });

    deepDiveSession.turns.push(
      { role: 'user', content: question, timestamp: Date.now() },
      philosopherTurn,
    );
    deepDiveSession.updatedAt = Date.now();
    saveDeepDiveSession(deepDiveSession);

    res.json({ deepDive: deepDiveSession, spikeId: spike.id, sourceSpeaker: spike.sourceSpeaker });
  } catch (error) {
    console.error('[POST /api/roundtable/deepdive] Error:', error);
    res.status(500).json({ error: 'Failed to start DeepDive' });
  }
});

// POST /api/roundtable/deepdive/question - 追问
app.post('/api/roundtable/deepdive/question', async (req, res) => {
  const { deepDiveId, question } = req.body;

  if (!deepDiveId || typeof deepDiveId !== 'string') {
    return res.status(400).json({ error: 'Missing deepDiveId' });
  }
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Missing question' });
  }

  const deepDiveSession = getDeepDiveSession(deepDiveId);
  if (!deepDiveSession) {
    return res.status(404).json({ error: 'DeepDive session not found' });
  }
  if (deepDiveSession.status !== 'active') {
    return res.status(400).json({ error: 'DeepDive session is not active' });
  }

  const parentSession = getSession(deepDiveSession.parentSessionId);
  if (!parentSession) {
    return res.status(404).json({ error: 'Parent session not found' });
  }

  const spike = getSpikeFromSession(parentSession, deepDiveSession.spikeId);
  if (!spike) {
    return res.status(404).json({ error: 'Spike not found' });
  }

  const persona = loadPersonaBySlug(deepDiveSession.sourceSpeaker);
  if (!persona) {
    return res.status(400).json({ error: `Persona not found: ${deepDiveSession.sourceSpeaker}` });
  }

  try {
    const userTurn = { role: 'user' as const, content: question, timestamp: Date.now() };
    deepDiveSession.turns.push(userTurn);

    const philosopherTurn = await askDeepDiveQuestion({
      deepDiveSession,
      question,
      personaProfile: persona,
      session: parentSession,
      spike,
    });

    deepDiveSession.turns.push(philosopherTurn);
    deepDiveSession.updatedAt = Date.now();
    saveDeepDiveSession(deepDiveSession);

    res.json({ turn: philosopherTurn, deepDive: deepDiveSession });
  } catch (error) {
    console.error('[POST /api/roundtable/deepdive/question] Error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// POST /api/roundtable/deepdive/summarize - 总结深聊
app.post('/api/roundtable/deepdive/summarize', async (req, res) => {
  const { deepDiveId } = req.body;

  if (!deepDiveId || typeof deepDiveId !== 'string') {
    return res.status(400).json({ error: 'Missing deepDiveId' });
  }

  const deepDiveSession = getDeepDiveSession(deepDiveId);
  if (!deepDiveSession) {
    return res.status(404).json({ error: 'DeepDive session not found' });
  }

  const parentSession = getSession(deepDiveSession.parentSessionId);
  if (!parentSession) {
    return res.status(404).json({ error: 'Parent session not found' });
  }

  const spike = getSpikeFromSession(parentSession, deepDiveSession.spikeId);
  if (!spike) {
    return res.status(404).json({ error: 'Spike not found' });
  }

  try {
    deepDiveSession.status = 'summarizing';
    saveDeepDiveSession(deepDiveSession);

    const summary = await summarizeDeepDive({ deepDiveSession, spike });

    deepDiveSession.summary = summary;
    deepDiveSession.status = 'completed';
    deepDiveSession.updatedAt = Date.now();
    saveDeepDiveSession(deepDiveSession);

    res.json({ summary, deepDive: deepDiveSession });
  } catch (error) {
    console.error('[POST /api/roundtable/deepdive/summarize] Error:', error);
    res.status(500).json({ error: 'Failed to summarize DeepDive' });
  }
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
