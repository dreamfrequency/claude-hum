import type { SessionConfig } from '../types/SessionState';
import { DEFAULT_SESSION_CONFIG } from '../types/SessionState';

export class AudioCaptureService {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private config: SessionConfig;

  constructor(config: SessionConfig = DEFAULT_SESSION_CONFIG) {
    this.config = config;
  }

  async start(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();

      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.analyserNode.minDecibels = this.config.minDecibels;
      this.analyserNode.maxDecibels = this.config.maxDecibels;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyserNode);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  stop(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyserNode = null;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(0);
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getTimeDomainData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(0);
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getSampleRate(): number {
    return this.audioContext?.sampleRate ?? 0;
  }

  isActive(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running';
  }
}
