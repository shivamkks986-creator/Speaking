// Remote Config service — reads the kill-switch document from Firestore at
// `system/config`. Falls back to backend `/api/system/config` for budget info.
// Admin can edit Firestore Console doc directly — no app update required.
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface RemoteConfig {
  globalAIEnabled: boolean;
  speakingEnabled: boolean;
  interviewEnabled: boolean;
  premiumEnabled: boolean;
  tutorEnabled: boolean;
  maintenanceMessage: string;
  // From backend usage tracker (server-authoritative budget data).
  budgetRemainingPct: number;
  todayCostINR: number;
  forceDisabled: boolean;
}

export const DEFAULT_CONFIG: RemoteConfig = {
  globalAIEnabled: true,
  speakingEnabled: true,
  interviewEnabled: true,
  premiumEnabled: true,
  tutorEnabled: true,
  maintenanceMessage: "We're upgrading our AI systems. Please check back soon!",
  budgetRemainingPct: 100,
  todayCostINR: 0,
  forceDisabled: false,
};

const CONFIG_DOC_PATH = ['system', 'config'] as const;

function ref() {
  return doc(db, CONFIG_DOC_PATH[0], CONFIG_DOC_PATH[1]);
}

async function ensureSeed(): Promise<void> {
  const snap = await getDoc(ref());
  if (!snap.exists()) {
    await setDoc(ref(), {
      globalAIEnabled: true,
      speakingEnabled: true,
      interviewEnabled: true,
      premiumEnabled: true,
      tutorEnabled: true,
      maintenanceMessage: DEFAULT_CONFIG.maintenanceMessage,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function fetchRemoteConfig(): Promise<Partial<RemoteConfig>> {
  try {
    await ensureSeed();
    const snap = await getDoc(ref());
    const data = snap.data() || {};
    return {
      globalAIEnabled: data.globalAIEnabled !== false,
      speakingEnabled: data.speakingEnabled !== false,
      interviewEnabled: data.interviewEnabled !== false,
      premiumEnabled: data.premiumEnabled !== false,
      tutorEnabled: data.tutorEnabled !== false,
      maintenanceMessage: data.maintenanceMessage || DEFAULT_CONFIG.maintenanceMessage,
    };
  } catch (e) {
    console.warn('[remoteConfig] fetch failed, using defaults', e);
    return {};
  }
}

export function subscribeRemoteConfig(
  cb: (partial: Partial<RemoteConfig>) => void
): () => void {
  try {
    const unsub = onSnapshot(
      ref(),
      (snap) => {
        const data = snap.data() || {};
        cb({
          globalAIEnabled: data.globalAIEnabled !== false,
          speakingEnabled: data.speakingEnabled !== false,
          interviewEnabled: data.interviewEnabled !== false,
          premiumEnabled: data.premiumEnabled !== false,
          tutorEnabled: data.tutorEnabled !== false,
          maintenanceMessage: data.maintenanceMessage || DEFAULT_CONFIG.maintenanceMessage,
        });
      },
      (err) => console.warn('[remoteConfig] snapshot error', err)
    );
    return unsub;
  } catch (e) {
    console.warn('[remoteConfig] subscribe failed', e);
    return () => {};
  }
}

export async function fetchBackendStatus(): Promise<Pick<RemoteConfig, 'budgetRemainingPct' | 'todayCostINR' | 'forceDisabled' | 'globalAIEnabled'> | null> {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!url) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/api/system/config`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      budgetRemainingPct: Number(data.budget_remaining_pct ?? 100),
      todayCostINR: Number(data.today_cost_inr ?? 0),
      forceDisabled: Boolean(data.force_disabled),
      globalAIEnabled: Boolean(data.global_ai_enabled),
    };
  } catch {
    return null;
  }
}

// Admin-only — flip Firestore flags (called from AdminConfigScreen).
export async function adminUpdateConfig(patch: Partial<RemoteConfig>): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.globalAIEnabled !== undefined) payload.globalAIEnabled = patch.globalAIEnabled;
  if (patch.speakingEnabled !== undefined) payload.speakingEnabled = patch.speakingEnabled;
  if (patch.interviewEnabled !== undefined) payload.interviewEnabled = patch.interviewEnabled;
  if (patch.premiumEnabled !== undefined) payload.premiumEnabled = patch.premiumEnabled;
  if (patch.tutorEnabled !== undefined) payload.tutorEnabled = patch.tutorEnabled;
  if (patch.maintenanceMessage !== undefined) payload.maintenanceMessage = patch.maintenanceMessage;
  await updateDoc(ref(), payload);
}

// Admin-only — call backend admin-toggle for budget/force-disabled.
export async function adminBackendToggle(
  email: string,
  patch: { force_disabled?: boolean; global_ai_enabled?: boolean; daily_budget_inr?: number; maintenance_message?: string }
): Promise<void> {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!url) throw new Error('Backend URL not configured');
  const res = await fetch(`${url.replace(/\/$/, '')}/api/system/admin-toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Email': email },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Backend toggle failed: ${res.status} ${t}`);
  }
}
