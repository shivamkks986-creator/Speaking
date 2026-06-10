// Speech service: expo-av recording + OpenAI Whisper STT + OpenAI TTS (with expo-speech fallback)

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const AI = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api/ai` : '';

let recording: Audio.Recording | null = null;
let activeSound: Audio.Sound | null = null;

export interface TTSOptions {
  companionId?: string;
  voice?: string;
  speed?: number;          // 0.5 - 2.0
  model?: 'tts-1' | 'tts-1-hd';
}

export const speechService = {
  async requestPermissions(): Promise<boolean> {
    const { granted } = await Audio.requestPermissionsAsync();
    return granted;
  },

  async startRecording(): Promise<void> {
    const perm = await this.requestPermissions();
    if (!perm) throw new Error('Microphone permission denied');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await rec.startAsync();
    recording = rec;
  },

  async stopRecording(): Promise<{ uri: string | null; durationMillis: number }> {
    if (!recording) return { uri: null, durationMillis: 0 };
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const durationMillis = (status as { durationMillis?: number }).durationMillis ?? 0;
      recording = null;
      return { uri, durationMillis };
    } catch {
      recording = null;
      return { uri: null, durationMillis: 0 };
    }
  },

  async playAudio(uri: string): Promise<void> {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  },

  // Real STT — uploads recorded audio to backend Whisper endpoint
  async transcribe(uri: string, language: string = 'en'): Promise<string> {
    if (!AI) throw new Error('Backend not configured');
    const form = new FormData();
    const filename = uri.split('/').pop() || 'audio.m4a';
    const ext = filename.split('.').pop()?.toLowerCase() || 'm4a';
    const mime = ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : 'audio/m4a';
    // React Native FormData accepts { uri, name, type }
    form.append('file', { uri, name: filename, type: mime } as unknown as Blob);
    form.append('language', language);
    const res = await fetch(`${AI}/stt`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(`STT HTTP ${res.status}`);
    const data = (await res.json()) as { text: string };
    return data.text || '';
  },

  // Real TTS — fetch base64 mp3 from backend, write to cache, play via expo-av
  async speakWithAI(text: string, opts: TTSOptions = {}): Promise<void> {
    if (!AI) {
      this.speak(text);
      return;
    }
    try {
      const res = await fetch(`${AI}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 4000),
          companion_id: opts.companionId,
          voice: opts.voice,
          speed: opts.speed ?? 1.0,
          model: opts.model ?? 'tts-1',
        }),
      });
      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
      const data = (await res.json()) as { audio_base64: string };
      const cacheDir = FileSystem.cacheDirectory || '';
      const path = `${cacheDir}speakmate-tts-${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(path, data.audio_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await this.stopAudio();
      const { sound } = await Audio.Sound.createAsync({ uri: path });
      activeSound = sound;
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          activeSound = null;
          FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
        }
      });
    } catch (err) {
      console.warn('[speechService.speakWithAI] falling back to device TTS:', err);
      this.speak(text);
    }
  },

  speak(text: string, opts?: Speech.SpeechOptions): void {
    Speech.speak(text, { language: 'en-IN', pitch: 1.0, rate: 0.95, ...opts });
  },

  async stopAudio(): Promise<void> {
    Speech.stop();
    if (activeSound) {
      try {
        await activeSound.stopAsync();
        await activeSound.unloadAsync();
      } catch {
        /* noop */
      }
      activeSound = null;
    }
  },

  stopSpeaking(): void {
    this.stopAudio().catch(() => {});
  },
};
