// Google Play Billing — placeholders only.
// Replace later with `expo-in-app-purchases` or `react-native-iap`.

import { PremiumProduct } from '@/types';

const products: PremiumProduct[] = [
  {
    id: 'speakmate_monthly',
    title: 'Monthly',
    price: '₹199',
    durationMonths: 1,
  },
  {
    id: 'speakmate_quarterly',
    title: '3 Months',
    price: '₹499',
    durationMonths: 3,
    savings: 'Save 17%',
    popular: true,
  },
  {
    id: 'speakmate_yearly',
    title: 'Yearly',
    price: '₹1,499',
    durationMonths: 12,
    savings: 'Save 38%',
  },
];

export const billingService = {
  async getProducts(): Promise<PremiumProduct[]> {
    return products;
  },

  async purchase(productId: string): Promise<{ ok: boolean; receipt?: string; error?: string }> {
    // TODO: integrate Google Play Billing.
    // const purchase = await InAppPurchases.purchaseItemAsync(productId);
    return { ok: false, error: `Billing not configured yet. (productId: ${productId})` };
  },

  async restorePurchases(): Promise<{ ok: boolean; isPremium: boolean }> {
    return { ok: false, isPremium: false };
  },

  async cancelSubscription(): Promise<void> {
    // Direct user to Play Store subscription settings
  },
};
