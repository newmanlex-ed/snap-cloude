import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { screen, ValidationError } from './engine/screen.js';
import { STATES, STATES_AS_OF, programName } from './data/states.js';
import { FEDERAL } from './engine/federal.js';

// Privacy by design: this server is a pure calculator. It stores nothing, and it
// deliberately logs no request bodies, so students' financial details are never
// persisted anywhere.

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('Referrer-Policy', 'no-referrer');
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/states', (_req, res) => {
    res.json({
      fiscalYear: FEDERAL.fiscalYear,
      stateDataAsOf: STATES_AS_OF,
      states: STATES.map((s) => ({
        code: s.code,
        name: s.name,
        program: programName(s),
        regions: s.sua?.regions?.map(({ id, label }) => ({ id, label })) ?? null,
      })),
    });
  });

  app.post('/api/screen', (req, res) => {
    try {
      res.json(screen(req.body));
    } catch (err) {
      if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
      console.error('screen failed:', err.message); // message only, never the inputs
      res.status(500).json({ error: 'Something went wrong on our side. Your answers were not saved.' });
    }
  });

  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3001;
  createApp().listen(port, () => console.log(`SNAP screener API on :${port}`));
}
