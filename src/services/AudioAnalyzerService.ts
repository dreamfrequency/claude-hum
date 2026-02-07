import { AudioCaptureService } from './AudioCaptureService';
import type { AudioAnalysis, FrequencyData, TimeDomainData } from '../types/AudioData';

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

  getAnalysis(): AudioAnalysis {
    return {
      frequencyData: this.getFrequencyData(),
      timeDomainData: this.getTimeDomainData(),
      amplitude: this.getAmplitude(),
      dominantFrequency: this.getDominantFrequency(),
    };
  }
}
