// Record → stop → Whisper transcript. Shared by Roadmap day practice + Accent module.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { speechService } from '@/services/speechService';

export type RecPhase = 'idle' | 'recording' | 'transcribing';

export function useVoiceRecorder(maxSeconds = 60) {
  const [phase, setPhase] = useState<RecPhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);

  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => () => {
    clear();
    speechService.stopRecording().catch(() => {});
  }, []);

  const start = useCallback(async () => {
    await speechService.startRecording(); // throws on mic permission denial
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    started.current = Date.now();
    setSeconds(0);
    setPhase('recording');
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - started.current) / 1000);
      setSeconds(Math.min(s, maxSeconds));
    }, 250);
  }, [maxSeconds]);

  // Returns transcript + duration; empty transcript when nothing was heard.
  const stop = useCallback(async (): Promise<{ text: string; sec: number }> => {
    clear();
    const { uri, durationMillis } = await speechService.stopRecording();
    const sec = Math.max(1, Math.round(durationMillis / 1000));
    if (!uri) {
      setPhase('idle');
      return { text: '', sec };
    }
    setPhase('transcribing');
    try {
      const text = (await speechService.transcribe(uri)).trim();
      return { text, sec };
    } finally {
      setPhase('idle');
    }
  }, []);

  return { phase, seconds, start, stop };
}
