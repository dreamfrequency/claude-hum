import type { AudioAnalysis } from '../types/AudioData';
import type { VisualizationMode } from '../types/SessionState';

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private mode: VisualizationMode = 'bars';
  private getAudioData: (() => AudioAnalysis) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  };

  setMode(mode: VisualizationMode): void {
    this.mode = mode;
  }

  start(getAudioData: () => AudioAnalysis): void {
    this.getAudioData = getAudioData;
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.getAudioData = null;
    this.clear();
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
  }

  private animate = (): void => {
    if (!this.getAudioData) return;

    const analysis = this.getAudioData();
    this.render(analysis);
    this.animationId = requestAnimationFrame(this.animate);
  };

  private render(analysis: AudioAnalysis): void {
    this.clear();

    switch (this.mode) {
      case 'bars':
        this.renderBars(analysis);
        break;
      case 'waveform':
        this.renderWaveform(analysis);
        break;
      case 'circular':
        this.renderCircular(analysis);
        break;
    }
  }

  private clear(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, rect.width, rect.height);
  }

  private renderBars(analysis: AudioAnalysis): void {
    const { frequencies } = analysis.frequencyData;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const barCount = Math.min(frequencies.length, 128);
    const barWidth = width / barCount;
    const gap = 2;

    let dominantBin = 0;
    let maxAmp = 0;
    for (let i = 0; i < barCount; i++) {
      if (frequencies[i] > maxAmp) { maxAmp = frequencies[i]; dominantBin = i; }
    }
    const hue = (dominantBin / barCount) * 270;

    for (let i = 0; i < barCount; i++) {
      const value = frequencies[i] / 255;
      const barHeight = value * height * 0.8;

      this.ctx.fillStyle = `hsl(${hue}, 80%, ${45 + value * 30}%)`;

      const x = i * barWidth;
      const y = height - barHeight;

      this.ctx.fillRect(x + gap / 2, y, barWidth - gap, barHeight);
    }
  }

  private renderWaveform(analysis: AudioAnalysis): void {
    const { waveform, bufferLength } = analysis.timeDomainData;
    const { frequencies } = analysis.frequencyData;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const binCount = Math.min(frequencies.length, 128);
    let dominantBin = 0;
    let maxAmp = 0;
    for (let i = 0; i < binCount; i++) {
      if (frequencies[i] > maxAmp) {
        maxAmp = frequencies[i];
        dominantBin = i;
      }
    }
    const hue = (dominantBin / binCount) * 270;

    this.ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const sliceWidth = width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = waveform[i] / 128.0;
      const y = (v * height) / 2;
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    this.ctx.stroke();
  }

  private renderCircular(analysis: AudioAnalysis): void {
    const { frequencies } = analysis.frequencyData;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(width, height) * 0.2;

    const barCount = Math.min(frequencies.length, 180);
    const angleStep = (Math.PI * 2) / barCount;

    let dominantBin = 0;
    let maxAmp = 0;
    for (let i = 0; i < barCount; i++) {
      if (frequencies[i] > maxAmp) { maxAmp = frequencies[i]; dominantBin = i; }
    }
    const hue = (dominantBin / barCount) * 270;

    for (let i = 0; i < barCount; i++) {
      const value = frequencies[i] / 255;
      const barLength = value * baseRadius * 1.5;

      const angle = i * angleStep - Math.PI / 2;
      const x1 = centerX + Math.cos(angle) * baseRadius;
      const y1 = centerY + Math.sin(angle) * baseRadius;
      const x2 = centerX + Math.cos(angle) * (baseRadius + barLength);
      const y2 = centerY + Math.sin(angle) * (baseRadius + barLength);

      this.ctx.strokeStyle = `hsl(${hue}, 80%, ${45 + value * 30}%)`;
      this.ctx.lineWidth = 2;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }
}
