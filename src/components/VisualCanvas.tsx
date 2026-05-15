import { useEffect, useRef } from 'react';
import { CanvasEngine } from '../services/CanvasEngine';
import { AudioAnalyzerService } from '../services/AudioAnalyzerService';
import type { VisualizationMode, ChakraCalibration } from '../types/SessionState';

interface VisualCanvasProps {
  analyzerService: AudioAnalyzerService | null;
  isActive: boolean;
  mode: VisualizationMode;
  calibration: ChakraCalibration | null;
}

export function VisualCanvas({ analyzerService, isActive, mode, calibration }: VisualCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    engineRef.current = new CanvasEngine(canvasRef.current);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setCalibration(calibration);
    }
  }, [calibration]);

  useEffect(() => {
    if (!engineRef.current || !analyzerService) return;

    if (isActive) {
      engineRef.current.start(() => analyzerService.getAnalysis());
    } else {
      engineRef.current.stop();
    }

    return () => {
      engineRef.current?.stop();
    };
  }, [isActive, analyzerService]);

  return (
    <canvas
      ref={canvasRef}
      className="visual-canvas"
    />
  );
}
