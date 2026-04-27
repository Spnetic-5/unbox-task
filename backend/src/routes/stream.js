const express = require('express');

const { speedSseHub } = require('../services/sseHub');

const streamRouter = express.Router();

streamRouter.get('/speed', (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // If behind compression middleware/proxies, flushing helps. Safe even if undefined.
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  // Initial comment to open the stream ASAP.
  res.write(': connected\n\n');

  speedSseHub.addClient(res);

  req.on('close', () => {
    speedSseHub.removeClient(res);
  });
});

module.exports = { streamRouter };

