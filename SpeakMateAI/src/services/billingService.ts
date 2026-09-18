// Google Play Billing service (Phase 2 — expo-iap).
//
// Uses `expo-iap` (Expo-native, RN 0.81 + SDK 54 compatible). When the native
// module isn't present (Expo Go / web), purchase() returns a clear error and
// restore falls back to the backend-known subscription state.
//
// Flow:
//   1. UI calls billingService.getProducts() → server pricing + local SKUs.
//   2. UI calls billingService.purchase(sku).
//   3. purchase() opens Play Billing → returns purchase token.
//   4. purchase() POSTs token to /api/system/subscription/verify.
//   5. Backend validates & marks user premium; we finishTransaction locally.
//
// Restore uses `getAvailablePurchases()` and re-verifies each with backend.

import { Platform } from 'react-native';
import { PremiumProduct } from '@/types';
import { attachIdToken } from '@/services/tokenProvider';

// ---- Dynamic native module load (Expo-Go safe) ---------------------------
let iap: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  iap = require('expo-iap');
} catch {
  iap = null;
}
const iapAvailable = () => Platform.OS === 'android' && iap !== null;

// ---- Backend wiring ------------------------------------------------------
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

let currentUid: string | null = null;
export function setBillingAuthContext(uid: string | null) {
  currentUid = uid;
}

async function authHeaders(): Promise<Record<string, string>> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (currentUid) h['X-User-Id'] = currentUid;   // legacy trust-mode fallback
  return await attachIdToken(h);                  // adds Bearer <firebase_id_token>
}

// ---- Types ---------------------------------------------------------------
export interface PricingConfig {
  monthly_inr: number;
  yearly_inr: number;
  lifetime_inr: number;
  lifetime_enabled: boolean;
  monthly_sku: string;
  yearly_sku: string;
  lifetime_sku: string;
  plans: {
    monthly: PlanConfigDto;
    yearly: PlanConfigDto;
    lifetime: PlanConfigDto;
  };
}

interface PlanConfigDto {
  title: string;
  cta: string;
  billing_period: string;
  badge?: string | null;
  trial_days?: number | null;
  features: Array<{ label: string; included: boolean; note?: string }>;
}

export interface SubscriptionStatus {
  is_premium: boolean;
  plan: 'monthly' | 'yearly' | 'lifetime' | null;
  expires_at: string | null;
  source: string | null;
}

// ---- Connection lifecycle ------------------------------------------------
let connected = false;
async function ensureConnected(): Promise<boolean> {
  if (!iapAvailable()) return false;
  if (connected) return true;
  try {
    await iap.initConnection();
    connected = true;
    return true;
  } catch (e) {
    console.warn('[iap] initConnection failed', e);
    return false;
  }
}

// ---- Cached pricing ------------------------------------------------------
let cachedPricing: PricingConfig | null = null;

/** Build a fully-formed `plans` object from just the price numbers.
 *  Used when the backend is on an older schema and returns pricing without plans. */
function buildDefaultPlans(monthlyInr: number, yearlyInr: number, lifetimeInr: number): PricingConfig['plans'] {
  return {
    monthly: {
      title: 'Monthly Premium',
      cta: `Start 3-day free trial`,
      billing_period: `Free 3 days, then \u20b9${monthlyInr}/month. Cancel anytime.`,
      badge: '3-Day Free Trial',
      trial_days: 3,
      features: [
        { label: '3-day free trial', included: true, note: 'New subscribers only' },
        { label: 'Ad-free experience', included: true },
        { label: 'AI speaking practice', included: true, note: 'Limited' },
        { label: 'AI companion access', included: true, note: 'Expanded' },
        { label: 'AI Mock Interview', included: true },
        { label: 'TMAY Trainer', included: true },
        { label: 'Sales & Counselling Roleplay', included: true },
        { label: 'Resume-based interviews', included: true },
        { label: '30-Day Job Ready Roadmap', included: false, note: 'Yearly & Lifetime only' },
        { label: 'Advanced progress reports', included: false },
        { label: 'Priority access to new features', included: false },
      ],
    },
    yearly: {
      title: 'Yearly Premium',
      cta: `Subscribe for \u20b9${yearlyInr}/year`,
      billing_period: 'Renews yearly \u00b7 save 55%',
      badge: 'Best Value',
      trial_days: null,
      features: [
        { label: 'Ad-free experience', included: true },
        { label: 'AI speaking practice', included: true, note: 'Higher limits' },
        { label: 'AI companion access', included: true, note: 'All companions' },
        { label: 'AI Mock Interview', included: true },
        { label: 'TMAY Trainer', included: true },
        { label: 'Sales & Counselling Roleplay', included: true },
        { label: 'Resume-based interviews', included: true },
        { label: '30-Day Job Ready Roadmap', included: true },
        { label: 'Advanced progress reports', included: true },
        { label: 'Priority access to new features', included: true },
      ],
    },
    lifetime: {
      title: 'Lifetime Premium',
      cta: `Get Lifetime Access for \u20b9${lifetimeInr}`,
      billing_period: 'One-time payment \u00b7 no renewals',
      badge: 'Save Forever',
      trial_days: null,
      features: [
        { label: 'All Premium features', included: true },
        { label: 'Ad-free forever', included: true },
        { label: 'One-time payment', included: true, note: 'No recurring charges' },
        { label: 'Lifetime access to current features', included: true },
        { label: 'AI usage limits', included: true, note: 'Same as Yearly' },
        { label: 'Future features may be added', included: true, note: 'Subject to change' },
      ],
    },
  };
}

/** Fully-populated hard fallback when the backend is unreachable. */
function hardFallback(): PricingConfig {
  return {
    monthly_inr: 149, yearly_inr: 799, lifetime_inr: 1499,
    lifetime_enabled: true,
    monthly_sku: 'premium_monthly',
    yearly_sku: 'premium_yearly',
    lifetime_sku: 'premium_lifetime',
    plans: buildDefaultPlans(149, 799, 1499),
  };
}

async function fetchPricing(): Promise<PricingConfig> {
  if (cachedPricing) return cachedPricing;
  try {
    const res = await fetch(`${API}/system/pricing`);
    if (!res.ok) throw new Error(String(res.status));
    const raw: any = await res.json();

    // Backfill missing fields so older backend deployments still render fully.
    const monthlyInr = Number(raw?.monthly_inr ?? 149);
    const yearlyInr = Number(raw?.yearly_inr ?? 799);
    const lifetimeInr = Number(raw?.lifetime_inr ?? 1499);
    const built = buildDefaultPlans(monthlyInr, yearlyInr, lifetimeInr);

    cachedPricing = {
      monthly_inr: monthlyInr,
      yearly_inr: yearlyInr,
      lifetime_inr: lifetimeInr,
      lifetime_enabled: raw?.lifetime_enabled !== false,
      monthly_sku: String(raw?.monthly_sku ?? 'premium_monthly'),
      yearly_sku: String(raw?.yearly_sku ?? 'premium_yearly'),
      lifetime_sku: String(raw?.lifetime_sku ?? 'premium_lifetime'),
      plans: {
        monthly: raw?.plans?.monthly ?? built.monthly,
        yearly: raw?.plans?.yearly ?? built.yearly,
        lifetime: raw?.plans?.lifetime ?? built.lifetime,
      },
    };
    return cachedPricing;
  } catch {
    // Fallback if backend unreachable — offline / first-launch scenario.
    cachedPricing = hardFallback();
    return cachedPricing;
  }
}

// ---- Public API ----------------------------------------------------------
export const billingService = {
  async getPricing(): Promise<PricingConfig> {
    return await fetchPricing();
  },

  async getProducts(): Promise<PremiumProduct[]> {
    const p = await fetchPricing();
    const monthlyTotal = p.monthly_inr * 12;
    const savingsPct = Math.round(100 - (p.yearly_inr / monthlyTotal) * 100);
    const list: PremiumProduct[] = [
      {
        id: p.monthly_sku,
        title: p.plans.monthly.title,
        price: `\u20b9${p.monthly_inr}`,
        durationMonths: 1,
        planKey: 'monthly',
        billingPeriod: p.plans.monthly.billing_period,
        cta: p.plans.monthly.cta,
        badge: p.plans.monthly.badge ?? undefined,
        features: p.plans.monthly.features,
      },
      {
        id: p.yearly_sku,
        title: p.plans.yearly.title,
        price: `\u20b9${p.yearly_inr}`,
        durationMonths: 12,
        popular: true,
        savings: `Save ${savingsPct}%`,
        planKey: 'yearly',
        billingPeriod: p.plans.yearly.billing_period,
        cta: p.plans.yearly.cta,
        badge: p.plans.yearly.badge ?? undefined,
        features: p.plans.yearly.features,
      },
    ];
    if (p.lifetime_enabled) {
      list.push({
        id: p.lifetime_sku,
        title: p.plans.lifetime.title,
        price: `\u20b9${p.lifetime_inr}`,
        durationMonths: 999,
        planKey: 'lifetime',
        billingPeriod: p.plans.lifetime.billing_period,
        cta: p.plans.lifetime.cta,
        badge: p.plans.lifetime.badge ?? undefined,
        features: p.plans.lifetime.features,
      });
    }
    return list;
  },

  /**
   * Trigger a Play Billing purchase for the given SKU.
   * Subscription SKUs (monthly/yearly) use requestPurchase({request:{ios,android},type:'subs'});
   * lifetime uses requestPurchase({request:{ios,android},type:'inapp'}). After
   * Play returns a token we verify it server-side, then finishTransaction so
   * Play releases the receipt.
   */
  async purchase(productId: string): Promise<{ ok: boolean; error?: string; status?: SubscriptionStatus }> {
    if (!currentUid) return { ok: false, error: 'Please sign in first to subscribe.' };
    if (!iapAvailable()) {
      return { ok: false, error: 'In-app purchases require the Play Store build. Please install SpeakMate from Google Play.' };
    }
    const ok = await ensureConnected();
    if (!ok) return { ok: false, error: 'Could not connect to Play Store. Make sure Google Play is signed in.' };

    const pricing = await fetchPricing();
    const isSubscription = productId === pricing.monthly_sku || productId === pricing.yearly_sku;

    try {
      // Fetch product details first so Play has them cached before purchase.
      let offerToken: string | undefined;
      if (isSubscription) {
        const subs = await iap.fetchProducts({ skus: [productId], type: 'subs' });
        const sub = subs?.[0];
        offerToken = sub?.subscriptionOfferDetails?.[0]?.offerToken;
        if (!offerToken) {
          return { ok: false, error: 'This subscription is not active in Play Console yet. Please try again in a few hours.' };
        }
      } else {
        await iap.fetchProducts({ skus: [productId], type: 'inapp' });
      }

      // Kick off the purchase. expo-iap resolves with the purchase object
      // directly (older react-native-iap returned an array).
      const purchase = await iap.requestPurchase({
        request: {
          android: {
            skus: [productId],
            ...(isSubscription && offerToken
              ? { subscriptionOffers: [{ sku: productId, offerToken }] }
              : {}),
          },
        },
        type: isSubscription ? 'subs' : 'inapp',
      });

      const p = Array.isArray(purchase) ? purchase[0] : purchase;
      const purchaseToken: string | undefined =
        p?.purchaseTokenAndroid ?? p?.purchaseToken ?? p?.transactionReceipt;
      if (!purchaseToken) return { ok: false, error: 'Play did not return a purchase token.' };

      // Server-verify + activate premium.
      const status = await this.verifyPurchase(productId, purchaseToken, p?.transactionId ?? p?.id);

      // Only finish the transaction AFTER backend confirms entitlement.
      try {
        await iap.finishTransaction({ purchase: p, isConsumable: false });
      } catch (e) {
        console.warn('[iap] finishTransaction failed (non-fatal)', e);
      }

      return { ok: true, status };
    } catch (e: any) {
      const msg = String(e?.message ?? e?.code ?? 'unknown');
      if (msg.includes('E_USER_CANCELLED') || msg.toLowerCase().includes('cancel')) {
        return { ok: false, error: 'Purchase cancelled.' };
      }
      console.warn('[iap] purchase failed', e);
      return { ok: false, error: msg };
    }
  },

  async verifyPurchase(productId: string, purchaseToken: string, orderId?: string): Promise<SubscriptionStatus> {
    const res = await fetch(`${API}/system/subscription/verify`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ product_id: productId, purchase_token: purchaseToken, order_id: orderId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'verification_failed' }));
      throw new Error(String(err.detail ?? 'verification_failed'));
    }
    return await res.json();
  },

  /**
   * Fetch server-side entitlement WITHOUT any Play Store lookup — cheapest
   * way to answer "is this user premium right now?". Called on every app
   * launch by AuthContext so a device that lost/refreshed local state
   * (Firestore, AsyncStorage) still sees the correct premium status.
   */
  async fetchStatus(): Promise<SubscriptionStatus> {
    if (!currentUid) return { is_premium: false, plan: null, expires_at: null, source: null };
    try {
      const res = await fetch(`${API}/system/subscription/status`, { headers: await authHeaders() });
      if (!res.ok) return { is_premium: false, plan: null, expires_at: null, source: null };
      return await res.json();
    } catch {
      return { is_premium: false, plan: null, expires_at: null, source: null };
    }
  },

  /**
   * Restore purchases. If native IAP is available, we pull local receipts
   * and re-verify each with backend; otherwise we ask the backend to
   * report the latest known subscription for this uid.
   */
  async restorePurchases(): Promise<SubscriptionStatus> {
    if (!currentUid) return { is_premium: false, plan: null, expires_at: null, source: null };

    // First: client-side restore via IAP (best source of truth on device).
    if (iapAvailable() && (await ensureConnected())) {
      try {
        const purchases: any[] = (await iap.getAvailablePurchases()) ?? [];
        for (const p of purchases) {
          const token: string | undefined = p?.purchaseTokenAndroid ?? p?.purchaseToken;
          const sku: string | undefined = p?.productId ?? p?.productIds?.[0];
          if (!token || !sku) continue;
          try {
            const status = await this.verifyPurchase(sku, token, p?.transactionId);
            if (status.is_premium) return status;
          } catch {
            // Try the next purchase.
          }
        }
      } catch (e) {
        console.warn('[iap] restore failed', e);
      }
    }

    // Fallback: backend lookup (returns the DB row we already have).
    try {
      const res = await fetch(`${API}/system/subscription/restore`, { method: 'POST', headers: await authHeaders() });
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
        headers: await authHeaders(),
        body: JSON.stringify({ endpoint }),
      });
      if (!res.ok) return { ok: false, reason: `http_${res.status}` };
      return await res.json();
    } catch (e: any) {
      return { ok: false, reason: e?.message || 'network' };
    }
  },

  async cancelSubscription(): Promise<void> {
    // Direct user to Play Store subscription settings — handled from UI via Linking.
  },

  /** Called from App root when the user signs out. */
  async endConnection(): Promise<void> {
    if (iapAvailable() && connected) {
      try { await iap.endConnection(); } catch {}
      connected = false;
    }
  },
};
