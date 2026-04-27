const express = require('express');
const cors = require('cors');

const { speedsRouter } = require('./routes/speeds');
const { streamRouter } = require('./routes/stream');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/speeds', speedsRouter);
  app.use('/api/stream', streamRouter);

  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}

module.exports = { createApp };

