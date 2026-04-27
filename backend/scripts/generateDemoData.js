require('dotenv').config();

const { getPool } = require('../src/db/pool');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function buildProfile({ seconds, maxSpeedMps }) {
  // Deterministic, demo-friendly profile:
  // - accelerate (0..30s)
  // - cruise (30..60s)
  // - brake (60..90s)
  // - stop (90..end)
  /** @type {number[]} */
  const out = [];
  for (let t = 0; t < seconds; t++) {
    let v;
    if (t < 30) {
      v = (t / 30) * maxSpeedMps;
    } else if (t < 60) {
      v = maxSpeedMps;
    } else if (t < 90) {
      v = ((90 - t) / 30) * maxSpeedMps;
    } else {
      v = 0;
    }

    // Small smooth wobble to look like sensor noise, but deterministic.
    const wobble = 0.35 * Math.sin(t / 3) + 0.2 * Math.sin(t / 7);
    out.push(clamp(v + wobble, 0, maxSpeedMps));
  }
  return out;
}

async function main() {
  const seconds = Math.min(Math.max(Number(process.env.DEMO_SECONDS || 120), 1), 3600);
  const maxSpeedMps = Math.min(Math.max(Number(process.env.DEMO_MAX_SPEED_MPS || 22), 1), 60);
  const live = String(process.env.DEMO_LIVE || 'true') !== 'false'; // insert 1Hz with sleeps
  const source = process.env.DEMO_SOURCE || 'demo';
  const clear = String(process.env.DEMO_CLEAR || 'false') === 'true';

  const pool = getPool();

  if (clear) {
    await pool.query('DELETE FROM speed_samples');
  }

  const speeds = buildProfile({ seconds, maxSpeedMps });
  const start = new Date();

  // eslint-disable-next-line no-console
  console.log(
    `generating demo data: seconds=${seconds} maxSpeedMps=${maxSpeedMps} live=${live} clear=${clear}`
  );

  for (let i = 0; i < speeds.length; i++) {
    const ts = new Date(start.getTime() + i * 1000).toISOString();
    await pool.query(
      `
      INSERT INTO speed_samples (ts, speed_mps, source)
      VALUES ($1::timestamptz, $2, $3)
      `,
      [ts, speeds[i], source]
    );

    if (live) await sleep(1000);
  }

  await pool.end();
  // eslint-disable-next-line no-console
  console.log('demo data generation complete');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

