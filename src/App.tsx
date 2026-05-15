import { useState, useRef, useCallback } from 'react';
import { AudioCaptureService } from './services/AudioCaptureService';
import { AudioAnalyzerService } from './services/AudioAnalyzerService';
import { SessionControl } from './components/SessionControl';
import { VisualCanvas } from './components/VisualCanvas';
import { PitchDisplay } from './components/PitchDisplay';
import { CalibrationFlow } from './components/CalibrationFlow';
import type { SessionState, VisualizationMode, ChakraCalibration } from './types/SessionState';
import { DEFAULT_SESSION_CONFIG } from './types/SessionState';
import './App.css';

function App() {
  const [calibration, setCalibration] = useState<ChakraCalibration | null>(null);

  const [sessionState, setSessionState] = useState<SessionState>({
    status: 'idle',
    mode: 'circular',
    config: DEFAULT_SESSION_CONFIG,
    error: null,
  });

  const captureServiceRef = useRef<AudioCaptureService | null>(null);
  const [analyzerService, setAnalyzerService] = useState<AudioAnalyzerService | null>(null);

  const handleCalibrationComplete = useCallback((data: ChakraCalibration) => {
    setCalibration(data);
  }, []);

  const handleStart = useCallback(async () => {
    setSessionState((prev) => ({ ...prev, status: 'requesting', error: null }));

    try {
      const capture = new AudioCaptureService(sessionState.config);
      await capture.start();

      captureServiceRef.current = capture;
      const analyzer = new AudioAnalyzerService(capture);
      setAnalyzerService(analyzer);

      setSessionState((prev) => ({ ...prev, status: 'active' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to access microphone';
      setSessionState((prev) => ({
        ...prev,
        status: 'error',
        error: message,
      }));
    }
  }, [sessionState.config]);

  const handleStop = useCallback(() => {
    captureServiceRef.current?.stop();
    captureServiceRef.current = null;
    setAnalyzerService(null);
    setSessionState((prev) => ({ ...prev, status: 'idle', error: null }));
  }, []);

  const handleModeChange = useCallback((mode: VisualizationMode) => {
    setSessionState((prev) => ({ ...prev, mode }));
  }, []);

  if (!calibration) {
    return <CalibrationFlow onComplete={handleCalibrationComplete} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Claude Hum</h1>
        <p>Welcome back, {calibration.name}</p>
      </header>

      <main className="app-main">
        <VisualCanvas
          analyzerService={analyzerService}
          isActive={sessionState.status === 'active'}
          mode={sessionState.mode}
          calibration={calibration}
        />
      </main>

      <div className="pitch-section">
        <PitchDisplay
          analyzerService={analyzerService}
          isActive={sessionState.status === 'active'}
        />
      </div>

      <footer className="app-footer">
        <SessionControl
          status={sessionState.status}
          mode={sessionState.mode}
          error={sessionState.error}
          onStart={handleStart}
          onStop={handleStop}
          onModeChange={handleModeChange}
        />
      </footer>
    </div>
  );
}

export default App;
