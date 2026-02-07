export type SessionStatus = 'idle' | 'requesting' | 'active' | 'paused' | 'error';

export type VisualizationMode = 'bars' | 'waveform' | 'circular';

export interface SessionConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  minDecibels: number;
  maxDecibels: number;
}

export interface SessionState {
  status: SessionStatus;
  mode: VisualizationMode;
  config: SessionConfig;
  error: string | null;
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
};
