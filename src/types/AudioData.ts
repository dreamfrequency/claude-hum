export interface FrequencyData {
  frequencies: Uint8Array;
  binCount: number;
  sampleRate: number;
}

export interface TimeDomainData {
  waveform: Uint8Array;
  bufferLength: number;
}

export interface AudioAnalysis {
  frequencyData: FrequencyData;
  timeDomainData: TimeDomainData;
  amplitude: number;
  dominantFrequency: number;
  pitchData: PitchData | null;
}

export interface PitchData {
  frequency: number;
  note: string;
  cents: number;
}
