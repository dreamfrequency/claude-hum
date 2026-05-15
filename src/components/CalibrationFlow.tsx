import { useState, useRef, useCallback } from 'react';
import { AudioCaptureService } from '../services/AudioCaptureService';
import { AudioAnalyzerService } from '../services/AudioAnalyzerService';
import { DEFAULT_SESSION_CONFIG } from '../types/SessionState';
import type { ChakraCalibration } from '../types/SessionState';

type CalibStep = 'name' | 'lowest' | 'highest' | 'complete';

interface Props {
  onComplete: (data: ChakraCalibration) => void;
}

const RECORD_MS = 5000;

function stableFreq(freqs: number[], mode: 'low' | 'high'): number {
  if (freqs.length === 0) return mode === 'low' ? 80 : 300;
  const sorted = [...freqs].sort((a, b) => a - b);
  const idx = mode === 'low'
    ? Math.floor(sorted.length * 0.15)
    : Math.floor(sorted.length * 0.85);
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

export function CalibrationFlow({ onComplete }: Props) {
  const [step, setStep] = useState<CalibStep>('name');
  const [name, setName] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [recording, setRecording] = useState(false);
  const [currentFreq, setCurrentFreq] = useState<number | null>(null);
  const [completedCalib, setCompletedCalib] = useState<ChakraCalibration | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lowestRef = useRef<number>(80);
  const collectedRef = useRef<number[]>([]);
  const captureRef = useRef<AudioCaptureService | null>(null);
  const analyzerRef = useRef<AudioAnalyzerService | null>(null);

  const startRecording = useCallback(async (mode: 'low' | 'high', userName: string) => {
    setError(null);
    collectedRef.current = [];
    setCountdown(5);

    try {
      const capture = new AudioCaptureService(DEFAULT_SESSION_CONFIG);
      await capture.start();
      captureRef.current = capture;
      analyzerRef.current = new AudioAnalyzerService(capture);
      setRecording(true);

      const countdownId = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);

      const sampleId = setInterval(() => {
        const analyzer = analyzerRef.current;
        if (!analyzer) return;
        const amplitude = analyzer.getAmplitude();
        const pitch = analyzer.getPitch();
        if (pitch && amplitude > 0.04 && pitch.frequency > 40 && pitch.frequency < 1200) {
          collectedRef.current.push(pitch.frequency);
          setCurrentFreq(Math.round(pitch.frequency));
        }
      }, 80);

      setTimeout(() => {
        clearInterval(countdownId);
        clearInterval(sampleId);
        captureRef.current?.stop();
        captureRef.current = null;
        analyzerRef.current = null;
        setRecording(false);
        setCurrentFreq(null);

        const freq = stableFreq(collectedRef.current, mode);

        if (mode === 'low') {
          lowestRef.current = freq;
          setStep('highest');
        } else {
          const base = lowestRef.current;
          const top = Math.max(freq, base + 20);
          const thresholds = Array.from({ length: 6 }, (_, i) =>
            base + (i + 1) * (top - base) / 7
          );
          const calib: ChakraCalibration = { name: userName, baseFreq: base, topFreq: top, thresholds };
          setCompletedCalib(calib);
          setStep('complete');
        }
      }, RECORD_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not access microphone');
      setRecording(false);
    }
  }, []);

  if (step === 'name') {
    return (
      <div className="calib-overlay">
        <div className="calib-card">
          <h1 className="calib-title">Claude Hum</h1>
          <p className="calib-sub">What's your name?</p>
          <input
            className="calib-input"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('lowest')}
            autoFocus
          />
          <button
            className="btn btn-start calib-btn"
            disabled={!name.trim()}
            onClick={() => setStep('lowest')}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === 'lowest') {
    return (
      <div className="calib-overlay">
        <div className="calib-card">
          <p className="calib-greeting">Hi {name}!</p>
          <p className="calib-prompt">Let's tune to your voice.</p>
          <p className="calib-prompt">Give me your <strong>lowest</strong> possible hum...</p>
          {!recording && (
            <>
              {error && <p className="calib-error">{error}</p>}
              <button className="btn btn-start calib-btn" onClick={() => startRecording('low', name)}>
                {error ? 'Try Again' : 'Start'}
              </button>
            </>
          )}
          {recording && (
            <div className="calib-recording">
              <div className="calib-countdown">{countdown}</div>
              <div className="calib-pulse" />
              {currentFreq && <p className="calib-freq">{currentFreq} Hz</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'highest') {
    return (
      <div className="calib-overlay">
        <div className="calib-card">
          <p className="calib-prompt">Now your <strong>highest</strong> possible hum...</p>
          {!recording && (
            <>
              {error && <p className="calib-error">{error}</p>}
              <button className="btn btn-start calib-btn" onClick={() => startRecording('high', name)}>
                {error ? 'Try Again' : 'Start'}
              </button>
            </>
          )}
          {recording && (
            <div className="calib-recording">
              <div className="calib-countdown">{countdown}</div>
              <div className="calib-pulse" />
              {currentFreq && <p className="calib-freq">{currentFreq} Hz</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="calib-overlay">
      <div className="calib-card">
        <div className="calib-complete-icon">✓</div>
        <p className="calib-greeting">Perfect, {name}!</p>
        <p className="calib-sub">Your chakra range is set.</p>
        <button
          className="btn btn-start calib-btn"
          onClick={() => completedCalib && onComplete(completedCalib)}
        >
          Begin Session
        </button>
      </div>
    </div>
  );
}
