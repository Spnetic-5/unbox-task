import './App.css';

import { SpeedHistory } from './components/SpeedHistory';
import { Speedometer } from './components/Speedometer';
import { useSpeedStream } from './hooks/useSpeedStream';

function App() {
  const { current, history, status, streamUrl } = useSpeedStream({ historyLimit: 60 });

  return (
    <div className="App">
      <div className="App-shell">
        <header className="App-topbar">
          <div className="App-title">Speedometer</div>
          <div className="App-subtitle">
            <span className={`App-pill App-pill--${status}`}>{status}</span>
            <span className="App-url">{streamUrl}</span>
          </div>
        </header>

        <main className="App-main">
          <Speedometer speedMps={current?.speed_mps ?? 0} />
          <SpeedHistory rows={history} />
        </main>
      </div>
    </div>
  );
}

export default App;
