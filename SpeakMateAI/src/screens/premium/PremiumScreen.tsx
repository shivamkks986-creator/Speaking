// Premium subscription screen — plan-differentiated features + sticky bottom CTA.
//
// Layout:
//   ┌─────────────────────────────┐
//   │ ScrollView                   │
//   │   Hero header                │
//   │   Plan cards (Monthly | Yearly | Lifetime)
//   │   Selected plan features (with lock icons for excluded)
//   │   Testimonials                │
//   │   Terms · Privacy · Restore  │
//   └─────────────────────────────┘
//   ▪▪ STICKY BOTTOM CTA (absolute) ▪▪
//   [ Subscribe for ₹149/month  → ]
//   ▪▪ safe area + tab bar padding ▪▪
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useNavigation } from '@react-navigation/native';
import FadeInView from '@/components/common/FadeInView';

import { useAuth } from '@/contexts/AuthContext';
import { billingService } from '@/services/billingService';
import { PremiumProduct } from '@/types';
import { radius, spacing } from '@/config/theme';

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'IELTS 7.5 Achiever', quote: 'Jumped from 6.0 to 7.5 in speaking in 6 weeks. Worth every rupee.', rating: 5 },
  { name: 'Rohit K.', role: 'Software Engineer', quote: 'Cracked Wipro interview after 2 weeks of mock practice.', rating: 5 },
  { name: 'Anjali M.', role: 'Sales Manager', quote: 'Daily 15-min chats fixed my grammar. Boss noticed the change.', rating: 5 },
];

const CTA_HEIGHT = 76;

export default function PremiumScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  let tabBarHeight = 0;
  try { tabBarHeight = useBottomTabBarHeight(); } catch { tabBarHeight = 0; }
  const { headerPaddingTop } = useScreenInsets();
  const { user, updateProfile } = useAuth();
  const [products, setProducts] = useState<PremiumProduct[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    billingService.getProducts()
      .then((p) => {
        setProducts(p);
        // Default to the "popular" plan if any, else the yearly plan, else first.
        const popular = p.find((x) => x.popular) ?? p.find((x) => x.planKey === 'yearly') ?? p[0];
        if (popular) setSelectedSku(popular.id);
      })
      .catch((e) => {
        console.warn('[premium] getProducts failed', e);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () => products.find((p) => p.id === selectedSku),
    [products, selectedSku]
  );

  const onPurchase = async () => {
    if (!selected || purchasing) return;
    setPurchasing(true);
    try {
      const res = await billingService.purchase(selected.id);
      if (res.ok) {
        await updateProfile({ isPremium: true });
        Alert.alert('Welcome to Premium 🎉', `Your ${selected.title} is now active.`, [
          { text: 'Great!', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Purchase failed', res.error || 'Please try again. If it persists, contact support.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const status = await billingService.restorePurchases();
      if (status.is_premium) {
        await updateProfile({ isPremium: true });
        const dt = status.expires_at ? ` (till ${new Date(status.expires_at).toLocaleDateString()})` : '';
        Alert.alert('Restored ✅', `Your ${status.plan} subscription is active${dt}.`);
      } else {
        Alert.alert('No active subscription', 'No paid subscription found for this account.');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message || 'Please try again in a moment.');
    } finally {
      setRestoring(false);
    }
  };

  const scrollPaddingBottom = CTA_HEIGHT + tabBarHeight + insets.bottom + 24;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0A0418', '#1a0b3d', '#0A0418']} style={StyleSheet.absoluteFillObject} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerPaddingTop + 8, paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        testID="premium-scroll"
      >
        {/* --- Hero header --- */}
        <FadeInView delay={0}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Ionicons name="diamond" size={14} color="#FACC15" />
              <Text style={styles.heroBadgeText}>SPEAKMATE PREMIUM</Text>
            </View>
            <Text style={styles.heroTitle}>Unlock your{'\n'}full potential.</Text>
            <Text style={styles.heroSub}>
              Pick a plan and get instant access. Cancel anytime.
            </Text>
          </View>
        </FadeInView>

        {/* --- Plan cards (horizontal scroll for smaller screens) --- */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#7C5CFF" />
          </View>
        ) : (
          <FadeInView delay={100}>
            <View style={styles.plansRow}>
              {products.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  selected={selectedSku === p.id}
                  onPress={() => setSelectedSku(p.id)}
                />
              ))}
            </View>
          </FadeInView>
        )}

        {/* --- Selected plan features --- */}
        {selected && (
          <FadeInView delay={200}>
            <View style={styles.featuresCard} testID="premium-features-card">
              <View style={styles.featuresHeader}>
                <Text style={styles.featuresTitle}>{selected.title} includes</Text>
                {selected.billingPeriod ? (
                  <Text style={styles.featuresBilling}>{selected.billingPeriod}</Text>
                ) : null}
              </View>
              {(selected.features || []).map((f, idx) => (
                <View key={idx} style={styles.featureRow} testID={`feature-${idx}`}>
                  <Ionicons
                    name={f.included ? 'checkmark-circle' : 'lock-closed'}
                    size={20}
                    color={f.included ? '#22C55E' : 'rgba(255,255,255,0.28)'}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureLabel, !f.included && styles.featureLabelExcluded]}>
                      {f.label}
                    </Text>
                    {f.note ? <Text style={styles.featureNote}>{f.note}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </FadeInView>
        )}

        {/* --- Testimonials --- */}
        <FadeInView delay={300}>
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Loved by learners</Text>
            {TESTIMONIALS.map((t, idx) => (
              <View key={idx} style={styles.testimonial}>
                <View style={styles.starRow}>
                  {[...Array(t.rating)].map((_, i) => (
                    <Ionicons key={i} name="star" size={12} color="#FACC15" />
                  ))}
                </View>
                <Text style={styles.testimonialQuote}>"{t.quote}"</Text>
                <Text style={styles.testimonialAuthor}>— {t.name}, {t.role}</Text>
              </View>
            ))}
          </View>
        </FadeInView>

        {/* --- Footer links --- */}
        <View style={styles.footerLinks}>
          <Pressable onPress={onRestore} disabled={restoring} testID="premium-restore-btn">
            <Text style={styles.footerLink}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
          </Pressable>
          <Text style={styles.footerLinkSep}>·</Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Terms & Privacy',
                'Subscriptions auto-renew until cancelled. Manage in Play Store → Subscriptions.\n\nPrivacy: gift-hub-sync.emergent.host/api/legal/privacy\nData Deletion: gift-hub-sync.emergent.host/api/legal/data-deletion'
              )
            }
            testID="premium-terms-btn"
          >
            <Text style={styles.footerLink}>Terms & Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* --- Sticky bottom CTA --- */}
      {selected && (
        <View
          style={[
            styles.ctaWrap,
            { paddingBottom: (insets.bottom || 12) + tabBarHeight + 4 },
          ]}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(10,4,24,0.85)', '#0A0418']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <Pressable
            onPress={onPurchase}
            disabled={purchasing || loading}
            style={({ pressed }) => [
              styles.ctaBtn,
              (purchasing || loading) && styles.ctaBtnDisabled,
              pressed && styles.ctaBtnPressed,
            ]}
            testID="premium-purchase-btn"
          >
            <LinearGradient
              colors={['#7C5CFF', '#5B3FD9']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            {purchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.ctaBtnLabel}>{selected.cta}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// PlanCard
// -----------------------------------------------------------------------------
function PlanCard({ plan, selected, onPress }: { plan: PremiumProduct; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.planCard, selected && styles.planCardActive]}
      testID={`plan-${plan.planKey}`}
    >
      {plan.badge ? (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{plan.badge}</Text>
        </View>
      ) : null}
      <Text style={[styles.planTitle, selected && styles.planTitleActive]}>{plan.title}</Text>
      <Text style={[styles.planPrice, selected && styles.planPriceActive]}>{plan.price}</Text>
      <Text style={styles.planPeriod}>
        {plan.planKey === 'monthly' ? '/month' : plan.planKey === 'yearly' ? '/year' : 'one-time'}
      </Text>
      {plan.savings ? <Text style={styles.planSavings}>{plan.savings}</Text> : null}
      {selected && (
        <View style={styles.planCheck}>
          <Ionicons name="checkmark-circle" size={20} color="#7C5CFF" />
        </View>
      )}
    </Pressable>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0418' },
  scrollContent: { paddingHorizontal: spacing.md },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },

  // Hero
  hero: { paddingVertical: 16, alignItems: 'center' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(250,204,21,0.10)',
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(250,204,21,0.30)',
    marginBottom: 12,
  },
  heroBadgeText: { color: '#FACC15', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#F2EEFF', fontSize: 32, fontWeight: '800', textAlign: 'center', lineHeight: 38 },
  heroSub: { color: 'rgba(242,238,255,0.65)', fontSize: 14, textAlign: 'center', marginTop: 8 },

  // Plan cards
  plansRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  planCard: {
    flex: 1, borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12, alignItems: 'center', minHeight: 130, justifyContent: 'center',
    position: 'relative',
  },
  planCardActive: {
    borderColor: '#7C5CFF', backgroundColor: 'rgba(124,92,255,0.15)',
    transform: [{ scale: 1.02 }],
  },
  planBadge: {
    position: 'absolute', top: -10, alignSelf: 'center',
    backgroundColor: '#FACC15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  planBadgeText: { color: '#0A0418', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  planTitle: { color: 'rgba(242,238,255,0.75)', fontSize: 12, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  planTitleActive: { color: '#F2EEFF' },
  planPrice: { color: 'rgba(242,238,255,0.9)', fontSize: 20, fontWeight: '800' },
  planPriceActive: { color: '#FFFFFF' },
  planPeriod: { color: 'rgba(242,238,255,0.5)', fontSize: 10 },
  planSavings: { color: '#22C55E', fontSize: 10, fontWeight: '700', marginTop: 4 },
  planCheck: { position: 'absolute', top: 6, right: 6 },

  // Features
  featuresCard: {
    marginTop: 24, padding: 16, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  featuresHeader: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  featuresTitle: { color: '#F2EEFF', fontSize: 16, fontWeight: '700' },
  featuresBilling: { color: 'rgba(242,238,255,0.55)', fontSize: 12, marginTop: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  featureLabel: { color: '#F2EEFF', fontSize: 14, fontWeight: '500' },
  featureLabelExcluded: { color: 'rgba(242,238,255,0.4)' },
  featureNote: { color: 'rgba(242,238,255,0.5)', fontSize: 11, marginTop: 2 },

  // Testimonials
  sectionTitle: { color: '#F2EEFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  testimonial: {
    padding: 14, borderRadius: radius.md, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  starRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  testimonialQuote: { color: 'rgba(242,238,255,0.85)', fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  testimonialAuthor: { color: 'rgba(242,238,255,0.55)', fontSize: 11, fontWeight: '600', marginTop: 6 },

  // Footer
  footerLinks: {
    marginTop: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
  },
  footerLink: { color: '#7C5CFF', fontSize: 12, fontWeight: '600' },
  footerLinkSep: { color: 'rgba(242,238,255,0.3)' },

  // Sticky CTA
  ctaWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.md, paddingTop: 20,
  },
  ctaBtn: {
    height: CTA_HEIGHT - 24,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#7C5CFF', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 8 },
    }),
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnPressed: { transform: [{ scale: 0.98 }] },
  ctaBtnLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
