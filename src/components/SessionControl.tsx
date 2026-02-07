import type { SessionStatus, VisualizationMode } from '../types/SessionState';

interface SessionControlProps {
  status: SessionStatus;
  mode: VisualizationMode;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onModeChange: (mode: VisualizationMode) => void;
}

export function SessionControl({
  status,
  mode,
  error,
  onStart,
  onStop,
  onModeChange,
}: SessionControlProps) {
  const isActive = status === 'active';
  const isRequesting = status === 'requesting';

  return (
    <div className="session-control">
      <div className="controls">
        {!isActive ? (
          <button
            onClick={onStart}
            disabled={isRequesting}
            className="btn btn-start"
          >
            {isRequesting ? 'Requesting...' : 'Start'}
          </button>
        ) : (
          <button onClick={onStop} className="btn btn-stop">
            Stop
          </button>
        )}

        <div className="mode-select">
          <label htmlFor="mode">Mode:</label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => onModeChange(e.target.value as VisualizationMode)}
          >
            <option value="bars">Frequency Bars</option>
            <option value="waveform">Waveform</option>
            <option value="circular">Circular</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="status">
        Status: <span className={`status-${status}`}>{status}</span>
      </div>
    </div>
  );
}
