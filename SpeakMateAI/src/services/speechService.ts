// Speech service wrapping expo-av (recording) and expo-speech (TTS)

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

let recording: Audio.Recording | null = null;

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

  speak(text: string, opts?: Speech.SpeechOptions): void {
    Speech.speak(text, { language: 'en-IN', pitch: 1.0, rate: 0.95, ...opts });
  },

  stopSpeaking(): void {
    Speech.stop();
  },
};
