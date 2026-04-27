import './Speedometer.css';

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export function Speedometer({ speedMps, min = 0, max = 40 }) {
  const speed = typeof speedMps === 'number' && Number.isFinite(speedMps) ? speedMps : 0;
  const normalized = (clamp(speed, min, max) - min) / (max - min);

  // 270° sweep: -225° .. +45°
  const angle = -225 + normalized * 270;

  const kmh = speed * 3.6;

  return (
    <div className="Speedometer">
      <div className="Speedometer-dial" role="img" aria-label="Speedometer dial">
        <div className="Speedometer-ticks" />
        <div className="Speedometer-needleWrap" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="Speedometer-needle" />
        </div>
        <div className="Speedometer-centerCap" />
      </div>
      <div className="Speedometer-readout">
        <div className="Speedometer-value">{kmh.toFixed(1)}</div>
        <div className="Speedometer-unit">km/h</div>
      </div>
    </div>
  );
}

