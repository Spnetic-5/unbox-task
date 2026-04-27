import { useEffect, useMemo, useState } from 'react';

import { API_BASE_URL } from '../config';

function clampHistory(next, limit) {
  if (next.length <= limit) return next;
  return next.slice(next.length - limit);
}

export function useSpeedStream({ historyLimit = 60 } = {}) {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('connecting'); // connecting|open|closed|error

  const streamUrl = useMemo(() => {
    const base = API_BASE_URL.replace(/\/$/, '');
    return `${base}/api/stream/speed`;
  }, []);

  useEffect(() => {
    let es = null;
    let retryTimer = null;
    let closed = false;

    function connect() {
      if (closed) return;
      setStatus('connecting');

      es = new EventSource(streamUrl);

      es.onopen = () => setStatus('open');
      es.onerror = () => {
        setStatus('error');
        try {
          es.close();
        } catch (_err) {}
        es = null;

        // Simple backoff; good enough for demo.
        retryTimer = window.setTimeout(connect, 1000);
      };

      es.addEventListener('speed', (evt) => {
        let payload;
        try {
          payload = JSON.parse(evt.data);
        } catch (_err) {
          return;
        }

        const speed_mps = Number(payload.speed_mps);
        if (!Number.isFinite(speed_mps)) return;

        const ts = payload.ts ? new Date(payload.ts).toISOString() : new Date().toISOString();
        const sample = { ts, speed_mps, source: payload.source };

        setCurrent(sample);
        setHistory((prev) => clampHistory([...prev, sample], historyLimit));
      });
    }

    connect();

    return () => {
      closed = true;
      setStatus('closed');
      if (retryTimer) window.clearTimeout(retryTimer);
      if (es) es.close();
    };
  }, [streamUrl, historyLimit]);

  return { current, history, status, streamUrl };
}

