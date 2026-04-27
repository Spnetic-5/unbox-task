const { Pool } = require('pg');

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || 10),
  });
}

let _pool;
function getPool() {
  if (!_pool) _pool = createPool();
  return _pool;
}

module.exports = { getPool };

