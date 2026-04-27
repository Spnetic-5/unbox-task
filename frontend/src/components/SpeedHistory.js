import './SpeedHistory.css';

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString();
  } catch (_err) {
    return iso;
  }
}

export function SpeedHistory({ rows }) {
  const items = Array.isArray(rows) ? rows : [];

  return (
    <div className="SpeedHistory">
      <div className="SpeedHistory-title">Recent samples</div>
      <div className="SpeedHistory-list" role="list">
        {items.length === 0 ? (
          <div className="SpeedHistory-empty">Waiting for data…</div>
        ) : (
          [...items].slice(-10).reverse().map((r, idx) => (
            <div key={`${r.ts}-${idx}`} className="SpeedHistory-row" role="listitem">
              <div className="SpeedHistory-ts">{fmtTime(r.ts)}</div>
              <div className="SpeedHistory-val">{(Number(r.speed_mps) * 3.6).toFixed(1)} km/h</div>
              <div className="SpeedHistory-src">{r.source || ''}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

