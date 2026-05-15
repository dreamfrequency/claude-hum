import { useEffect, useRef, useState } from 'react';
import { AudioAnalyzerService } from '../services/AudioAnalyzerService';
import type { PitchData } from '../types/AudioData';

interface PitchDisplayProps {
  analyzerService: AudioAnalyzerService | null;
  isActive: boolean;
}

export function PitchDisplay({ analyzerService, isActive }: PitchDisplayProps) {
  const [pitch, setPitch] = useState<PitchData | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !analyzerService) {
      setPitch(null);
      return;
    }

    const update = () => {
      setPitch(analyzerService.getPitch());
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, analyzerService]);

  const centsClass = pitch
    ? Math.abs(pitch.cents) < 10
      ? 'pitch-cents--intune'
      : Math.abs(pitch.cents) < 25
        ? 'pitch-cents--close'
        : 'pitch-cents--off'
    : '';

  return (
    <div className={`pitch-display${!isActive || !pitch ? ' pitch-display--inactive' : ''}`}>
      <span className="pitch-note">{pitch ? pitch.note : '—'}</span>
      <span className="pitch-freq">{pitch ? `${pitch.frequency} Hz` : ''}</span>
      <span className={`pitch-cents ${centsClass}`}>
        {pitch ? `${pitch.cents >= 0 ? '+' : ''}${pitch.cents} ¢` : ''}
      </span>
    </div>
  );
}
