import { AudioCaptureService } from './AudioCaptureService';
import type { AudioAnalysis, FrequencyData, TimeDomainData, PitchData } from '../types/AudioData';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class AudioAnalyzerService {
  private captureService: AudioCaptureService;

  constructor(captureService: AudioCaptureService) {
    this.captureService = captureService;
  }

  getFrequencyData(): FrequencyData {
    const frequencies = this.captureService.getFrequencyData();
    return {
      frequencies,
      binCount: frequencies.length,
      sampleRate: this.captureService.getSampleRate(),
    };
  }

  getTimeDomainData(): TimeDomainData {
    const waveform = this.captureService.getTimeDomainData();
    return {
      waveform,
      bufferLength: waveform.length,
    };
  }

  getAmplitude(): number {
    const timeDomain = this.captureService.getTimeDomainData();
    if (timeDomain.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < timeDomain.length; i++) {
      const normalized = (timeDomain[i] - 128) / 128;
      sum += normalized * normalized;
    }

    return Math.sqrt(sum / timeDomain.length);
  }

  getDominantFrequency(): number {
    const frequencyData = this.captureService.getFrequencyData();
    const sampleRate = this.captureService.getSampleRate();

    if (frequencyData.length === 0 || sampleRate === 0) return 0;

    let maxIndex = 0;
    let maxValue = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i];
        maxIndex = i;
      }
    }

    const nyquist = sampleRate / 2;
    return (maxIndex / frequencyData.length) * nyquist;
  }

  getPitch(): PitchData | null {
    const buffer = this.captureService.getTimeDomainDataFloat();
    const sampleRate = this.captureService.getSampleRate();

    if (buffer.length === 0 || sampleRate === 0) return null;

    const freq = this.autocorrelate(buffer, sampleRate);
    if (freq < 0) return null;

    return this.frequencyToNote(freq);
  }

  private autocorrelate(buffer: Float32Array, sampleRate: number): number {
    const n = buffer.length;

    let rms = 0;
    for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
    if (Math.sqrt(rms / n) < 0.01) return -1;

    // Restrict lag range to 80–1000 Hz to avoid O(n²) cost on the full buffer
    const minLag = Math.floor(sampleRate / 1000);
    const maxLag = Math.min(Math.ceil(sampleRate / 80), Math.floor(n / 2));

    // Normalised autocorrelation
    const corr = new Float32Array(maxLag + 1);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      const count = n - lag;
      for (let i = 0; i < count; i++) sum += buffer[i] * buffer[i + lag];
      corr[lag] = sum / count;
    }

    // Find highest peak in the lag range
    let bestLag = minLag;
    for (let lag = minLag + 1; lag <= maxLag; lag++) {
      if (corr[lag] > corr[bestLag]) bestLag = lag;
    }

    // Require positive correlation
    if (corr[bestLag] <= 0) return -1;

    // Parabolic interpolation for sub-sample accuracy
    const prev = corr[bestLag - 1] ?? corr[bestLag];
    const peak = corr[bestLag];
    const next = corr[bestLag + 1] ?? corr[bestLag];
    const denom = prev - 2 * peak + next;
    const refinedLag = denom !== 0
      ? bestLag + 0.5 * (prev - next) / denom
      : bestLag;

    return sampleRate / refinedLag;
  }

  private frequencyToNote(freq: number): PitchData {
    const exactMidi = 69 + 12 * Math.log2(freq / 440);
    const nearestMidi = Math.round(exactMidi);
    const noteIndex = ((nearestMidi % 12) + 12) % 12;
    const octave = Math.floor(nearestMidi / 12) - 1;
    const cents = Math.round((exactMidi - nearestMidi) * 100);

    return {
      frequency: Math.round(freq * 10) / 10,
      note: `${NOTE_NAMES[noteIndex]}${octave}`,
      cents,
    };
  }

  getAnalysis(): AudioAnalysis {
    return {
      frequencyData: this.getFrequencyData(),
      timeDomainData: this.getTimeDomainData(),
      amplitude: this.getAmplitude(),
      dominantFrequency: this.getDominantFrequency(),
      pitchData: this.getPitch(),
    };
  }
}
