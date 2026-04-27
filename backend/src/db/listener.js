const { speedSseHub } = require('../services/sseHub');
const { getPool } = require('./pool');

let started = false;

async function startSpeedListener() {
  if (started) return;
  started = true;

  // Dedicated client for LISTEN/NOTIFY (pool clients can be recycled).
  const pool = getPool();
  const client = await pool.connect();

  client.on('notification', (msg) => {
    if (msg.channel !== 'speed_insert') return;
    if (!msg.payload) return;

    let data;
    try {
      data = JSON.parse(msg.payload);
    } catch (_err) {
      return;
    }

    speedSseHub.sendEvent({ event: 'speed', data });
  });

  client.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('LISTEN client error', err);
  });

  await client.query('LISTEN speed_insert');
  // eslint-disable-next-line no-console
  console.log('listening for NOTIFY speed_insert');
}

module.exports = { startSpeedListener };

