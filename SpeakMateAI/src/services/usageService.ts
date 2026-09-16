// UsageService — fetches per-endpoint quota from backend so the UI can:
//   • Show "3 of 5 daily practice left" on any AI screen
//   • Detect when limit is hit and pop the upgrade / rewarded-ad modal
//   • Grant bonus quota after a rewarded ad completes

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

let currentUid: string | null = null;
let currentIsPremium = false;

export function setUsageAuthContext(uid: string | null, isPremium: boolean) {
  currentUid = uid;
  currentIsPremium = isPremium;
}

export interface EndpointQuota {
  used: number;
  limit: number;   // -1 = unlimited (premium)
  bonus: number;
  remaining: number;
}

export interface QuotaStatus {
  uid: string;
  is_premium: boolean;
  used: number;
  limit: number;
  bonus: number;
  remaining: number;
  per_endpoint: Record<string, EndpointQuota>;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentUid) h['X-User-Id'] = currentUid;
  h['X-Is-Premium'] = currentIsPremium ? 'true' : 'false';
  return h;
}

export const usageService = {
  async getQuota(): Promise<QuotaStatus | null> {
    if (!currentUid) return null;
    try {
      const res = await fetch(`${API}/system/quota`, { headers: headers() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /** Convenience: is this endpoint out of quota (for a free user)? */
  isLimitHit(quota: QuotaStatus | null, endpoint: string): boolean {
    if (!quota || quota.is_premium) return false;
    const ep = quota.per_endpoint?.[endpoint];
    if (!ep) return false;
    return ep.remaining <= 0;
  },
};
