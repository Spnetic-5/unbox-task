const express = require('express');

const { getPool } = require('../db/pool');

const speedsRouter = express.Router();

function toFiniteNumber(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

speedsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 60), 1), 10_000);
    const since = typeof req.query.since === 'string' ? new Date(req.query.since) : null;
    const sinceValid = since && !Number.isNaN(since.getTime()) ? since : null;

    const pool = getPool();
    const params = [];
    let where = '';
    if (sinceValid) {
      params.push(sinceValid.toISOString());
      where = `WHERE ts >= $${params.length}`;
    }

    params.push(limit);
    const q = `
      SELECT id, ts, speed_mps, source
      FROM speed_samples
      ${where}
      ORDER BY ts DESC
      LIMIT $${params.length}
    `;

    const { rows } = await pool.query(q, params);
    res.json({ rows: rows.reverse() });
  } catch (err) {
    next(err);
  }
});

speedsRouter.post('/', async (req, res, next) => {
  try {
    const speed_mps = toFiniteNumber(req.body?.speed_mps);
    if (speed_mps === null) {
      return res.status(400).json({ error: 'speed_mps_required_number' });
    }

    const ts = typeof req.body?.ts === 'string' ? new Date(req.body.ts) : null;
    const tsValid = ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : null;

    const source = typeof req.body?.source === 'string' ? req.body.source : 'api';

    const pool = getPool();
    const { rows } = await pool.query(
      `
      INSERT INTO speed_samples (ts, speed_mps, source)
      VALUES (COALESCE($1::timestamptz, NOW()), $2, $3)
      RETURNING id, ts, speed_mps, source
      `,
      [tsValid, speed_mps, source]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = { speedsRouter };

