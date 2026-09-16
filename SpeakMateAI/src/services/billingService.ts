// Google Play Billing service (Phase 1: backend-verified stub).
//
// Phase 1 (current): the backend `/api/system/subscription/verify` endpoint
// records purchases and marks the user premium. The native Play Billing SDK
// (`react-native-iap`) is NOT wired yet — `purchase()` returns a controlled
// error until Phase 2 adds it via prebuild.
//
// Phase 2 (next session): add `react-native-iap`, call the real Play Store
// billing flow, then pass the resulting `purchase_token` to
// `/api/system/subscription/verify` for server-side validation.

import { PremiumProduct } from '@/types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

// currentUid/isPremium are set by authService on login/refresh.
let currentUid: string | null = null;
export function setBillingAuthContext(uid: string | null) {
  currentUid = uid;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentUid) h['X-User-Id'] = currentUid;
  return h;
}

export interface PricingConfig {
  monthly_inr: number;
  yearly_inr: number;
  lifetime_inr: number;
  lifetime_enabled: boolean;
  monthly_sku: string;
  yearly_sku: string;
  lifetime_sku: string;
}

export interface SubscriptionStatus {
  is_premium: boolean;
  plan: 'monthly' | 'yearly' | 'lifetime' | null;
  expires_at: string | null;
  source: string | null;
}

export const billingService = {
  /** Fetches admin-configured prices from backend. Falls back to defaults. */
  async getPricing(): Promise<PricingConfig> {
    try {
      const res = await fetch(`${API}/system/pricing`);
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } catch {
      return {
        monthly_inr: 149, yearly_inr: 799, lifetime_inr: 1499,
        lifetime_enabled: true,
        monthly_sku: 'speakmate_monthly_149',
        yearly_sku: 'speakmate_yearly_799',
        lifetime_sku: 'speakmate_lifetime_1499',
      };
    }
  },

  /** Returns products in the shape the UI expects, built from server pricing. */
  async getProducts(): Promise<PremiumProduct[]> {
    const p = await this.getPricing();
    const list: PremiumProduct[] = [
      { id: p.monthly_sku, title: 'Monthly',  price: `₹${p.monthly_inr}`,  durationMonths: 1 },
      { id: p.yearly_sku,  title: 'Yearly',   price: `₹${p.yearly_inr}`,   durationMonths: 12, popular: true, savings: `Save ${Math.round(100 - (p.yearly_inr / (p.monthly_inr * 12)) * 100)}%` },
    ];
    if (p.lifetime_enabled) {
      list.push({ id: p.lifetime_sku, title: 'Lifetime', price: `₹${p.lifetime_inr}`, durationMonths: 999 });
    }
    return list;
  },

  /** Phase 2 will replace this with real Play Billing SDK. */
  async purchase(productId: string): Promise<{ ok: boolean; receipt?: string; error?: string }> {
    return { ok: false, error: 'In-app purchases require the v1.0.8+ native build. Please wait for the next Play Store update.' };
  },

  /** Server-verify a Play Store receipt & mark user premium. */
  async verifyPurchase(productId: string, purchaseToken: string, orderId?: string): Promise<SubscriptionStatus> {
    const res = await fetch(`${API}/system/subscription/verify`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ product_id: productId, purchase_token: purchaseToken, order_id: orderId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'verification_failed' }));
      throw new Error(String(err.detail ?? 'verification_failed'));
    }
    return await res.json();
  },

  async restorePurchases(): Promise<SubscriptionStatus> {
    if (!currentUid) return { is_premium: false, plan: null, expires_at: null, source: null };
    try {
      const res = await fetch(`${API}/system/subscription/restore`, { method: 'POST', headers: authHeaders() });
      if (!res.ok) return { is_premium: false, plan: null, expires_at: null, source: null };
      return await res.json();
    } catch {
      return { is_premium: false, plan: null, expires_at: null, source: null };
    }
  },

  /** Called after a rewarded ad completes. Server grants bonus quota. */
  async claimRewardedAd(endpoint?: string): Promise<{
    ok: boolean; reason?: string; bonus_granted?: number;
    total_bonus_today?: number; remaining_bonus_slots?: number; wait_seconds?: number;
  }> {
    if (!currentUid) return { ok: false, reason: 'login_required' };
    try {
      const res = await fetch(`${API}/system/rewarded/claim`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ endpoint }),
      });
      if (!res.ok) return { ok: false, reason: `http_${res.status}` };
      return await res.json();
    } catch (e: any) {
      return { ok: false, reason: e?.message || 'network' };
    }
  },

  async cancelSubscription(): Promise<void> {
    // Direct user to Play Store subscription settings (opens in native browser).
    // Phase 2: use Linking.openURL('https://play.google.com/store/account/subscriptions')
  },
};
