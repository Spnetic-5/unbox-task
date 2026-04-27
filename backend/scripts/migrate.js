const fs = require('fs');
const path = require('path');

require('dotenv').config();

const { getPool } = require('../src/db/pool');

async function main() {
  const sqlPath = path.join(__dirname, '..', 'src', 'db', 'migrate.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const pool = getPool();
  await pool.query(sql);

  // eslint-disable-next-line no-console
  console.log('migrations applied');

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

