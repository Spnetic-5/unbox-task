function createSseHub() {
  /** @type {Set<import('http').ServerResponse>} */
  const clients = new Set();

  function addClient(res) {
    clients.add(res);
  }

  function removeClient(res) {
    clients.delete(res);
  }

  function sendEvent({ event, data }) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const lines = [];
    if (event) lines.push(`event: ${event}`);
    lines.push(`data: ${payload}`);
    const wire = `${lines.join('\n')}\n\n`;

    for (const res of clients) {
      try {
        res.write(wire);
      } catch (_err) {
        clients.delete(res);
      }
    }
  }

  function count() {
    return clients.size;
  }

  return { addClient, removeClient, sendEvent, count };
}

const speedSseHub = createSseHub();

module.exports = { createSseHub, speedSseHub };

