const http = require('http');

require('dotenv').config();

const { createApp } = require('./app');
const { startSpeedListener } = require('./db/listener');

async function startServer() {
  const port = Number(process.env.PORT || 8080);
  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(port, resolve);
  });

  // eslint-disable-next-line no-console
  console.log(`backend listening on :${port}`);

  await startSpeedListener();

  return { server };
}

module.exports = { startServer };

