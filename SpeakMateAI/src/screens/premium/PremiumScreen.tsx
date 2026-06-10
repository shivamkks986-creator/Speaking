// Premium subscription screen — premium dark UI with Monthly/Quarterly/Annual + Free Trial highlight
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuth } from '@/contexts/AuthContext';
import { billingService } from '@/services/billingService';
import { PremiumProduct } from '@/types';
import { radius, spacing } from '@/config/theme';

const BENEFITS = [
  { icon: 'infinite' as const,        title: 'Unlimited AI Companions',    sub: 'All 5 companions unlocked' },
  { icon: 'mic' as const,             title: 'Unlimited Voice Practice',   sub: 'Record & get instant AI feedback' },
  { icon: 'school' as const,          title: 'IELTS Mode',                 sub: 'Targeted band-7+ training' },
  { icon: 'briefcase' as const,       title: 'Interview Mode',             sub: 'HR · Tech · Behavioural · Sales' },
  { icon: 'analytics' as const,       title: 'Advanced Pronunciation',     sub: 'Phoneme-level analysis' },
  { icon: 'volume-high' as const,     title: 'Premium AI Voices',          sub: 'Lifelike multi-accent voices' },
  { icon: 'stats-chart' as const,     title: 'Progress Reports',           sub: 'Weekly & monthly insights' },
  { icon: 'shield-checkmark' as const, title: 'Streak Protection',         sub: 'Never lose your streak' },
];

export default function PremiumScreen() {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();
  const [products, setProducts] = useState<PremiumProduct[]>([]);
  const [selected, setSelected] = useState<string>('speakmate_quarterly');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    billingService
      .getProducts()
      .then((p) => {
        setProducts(p);
        const popular = p.find((x) => x.popular);
        if (popular) setSelected(popular.id);
      })
      .finally(() => setLoading(false));
  }, []);

  const onPurchase = async () => {
    setPurchasing(true);
    const res = await billingService.purchase(selected);
    setPurchasing(false);
    if (res.ok) {
      await updateProfile({ isPremium: true });
      Alert.alert('Welcome to Premium 🎉', 'Enjoy unlimited AI conversations!');
      navigation.goBack();
    } else {
      Alert.alert('Coming Soon', res.error || 'Google Play Billing will be enabled in the next release.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418', '#150828']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.heroWrap}>
            <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} testID="premium-close">
              <Ionicons name="close" size={22} color="#F2EEFF" />
            </Pressable>
            <LinearGradient
              colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.diamondCircle}
            >
              <Ionicons name="diamond" size={42} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.heroTitle}>SpeakMate Premium</Text>
            <Text style={styles.heroSub}>Your fastest path to fluent English</Text>

            <View style={styles.trialPill}>
              <Ionicons name="gift" size={14} color="#FACC15" />
              <Text style={styles.trialText}>7-day free trial · Cancel anytime</Text>
            </View>
          </View>

          {/* Plans */}
          <View style={styles.plansWrap}>
            {loading ? (
              <ActivityIndicator color="#A992FF" />
            ) : (
              products.map((p, i) => {
                const active = selected === p.id;
                return (
                  <Animated.View key={p.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                    <Pressable
                      onPress={() => setSelected(p.id)}
                      style={[
                        styles.planCard,
                        active && { borderColor: '#A992FF', backgroundColor: 'rgba(124,92,255,0.15)' },
                      ]}
                      testID={`premium-plan-${p.id}`}
                    >
                      {p.popular && (
                        <LinearGradient colors={['#FACC15', '#FF6B9D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.popularPill}>
                          <Text style={styles.popularText}>MOST POPULAR</Text>
                        </LinearGradient>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={styles.planTitle}>{p.title}</Text>
                          {p.savings && <Text style={styles.planSavings}>{p.savings}</Text>}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.planPrice}>{p.price}</Text>
                          <Text style={styles.planUnit}>/{p.durationMonths === 1 ? 'mo' : p.durationMonths === 12 ? 'yr' : `${p.durationMonths}mo`}</Text>
                        </View>
                      </View>
                      {active && (
                        <View style={styles.activeDot}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })
            )}
          </View>

          {/* Benefits */}
          <Text style={styles.section}>What you unlock</Text>
          <View style={styles.benefitsWrap}>
            {BENEFITS.map((b, i) => (
              <Animated.View key={b.title} entering={FadeInDown.delay(i * 40).duration(300)} style={styles.benefitRow}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={b.icon} size={18} color="#A992FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitSub}>{b.sub}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color="#34D399" />
              </Animated.View>
            ))}
          </View>

          {/* Free vs Premium comparison */}
          <Text style={styles.section}>Free vs Premium</Text>
          <View style={[styles.compareWrap]}>
            <View style={styles.compareHeadRow}>
              <Text style={[styles.compareHead, { flex: 2 }]}>Feature</Text>
              <Text style={[styles.compareHead, { flex: 1, textAlign: 'center' }]}>Free</Text>
              <Text style={[styles.compareHead, { flex: 1, textAlign: 'center', color: '#FACC15' }]}>Premium</Text>
            </View>
            {[
              ['AI Tutor Chats', '5 / day', 'Unlimited'],
              ['Voice Practice', '3 / day', 'Unlimited'],
              ['Interview Mocks', '1 / day', 'Unlimited'],
              ['AI Companions', '1 unlocked', 'All 5'],
              ['IELTS Mode', '—', '✓'],
              ['Resume Review', '—', '✓'],
              ['Premium Voices', '—', '✓'],
              ['Progress Reports', '—', '✓'],
            ].map((row, i) => (
              <View key={i} style={styles.compareRow}>
                <Text style={[styles.compareCell, { flex: 2 }]}>{row[0]}</Text>
                <Text style={[styles.compareCell, { flex: 1, textAlign: 'center', color: 'rgba(242,238,255,0.55)' }]}>{row[1]}</Text>
                <Text style={[styles.compareCell, { flex: 1, textAlign: 'center', color: '#34D399', fontWeight: '700' }]}>{row[2]}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Pressable
              onPress={onPurchase}
              disabled={purchasing || !!user?.isPremium}
              testID="premium-purchase-btn"
            >
              <LinearGradient
                colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>
                  {user?.isPremium ? "You're Premium 🎉" : 'Start 7-day Free Trial'}
                </Text>
              </LinearGradient>
            </Pressable>
            <Text style={styles.legal}>
              No commitment. Cancel anytime via Google Play. After trial: auto-renews unless cancelled 24h before period end.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { alignItems: 'center', paddingTop: spacing.lg, paddingHorizontal: spacing.lg },
  closeBtn: { position: 'absolute', top: spacing.md, right: spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  diamondCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  heroTitle: { color: '#F2EEFF', fontSize: 28, fontWeight: '800' },
  heroSub: { color: 'rgba(242,238,255,0.7)', fontSize: 14, marginTop: 4, textAlign: 'center' },
  trialPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(250,204,21,0.15)', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, marginTop: spacing.md, borderWidth: 1, borderColor: 'rgba(250,204,21,0.3)' },
  trialText: { color: '#FACC15', fontWeight: '700', fontSize: 12 },
  plansWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.sm },
  planCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.xl, padding: spacing.lg, borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  popularPill: { position: 'absolute', top: -10, right: 16, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  popularText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  planTitle: { color: '#F2EEFF', fontSize: 17, fontWeight: '800' },
  planSavings: { color: '#34D399', fontSize: 12, fontWeight: '700', marginTop: 2 },
  planPrice: { color: '#F2EEFF', fontSize: 22, fontWeight: '800' },
  planUnit: { color: 'rgba(242,238,255,0.6)', fontSize: 11 },
  activeDot: { position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: 11, backgroundColor: '#7C5CFF', alignItems: 'center', justifyContent: 'center' },
  section: { color: '#F2EEFF', fontWeight: '800', fontSize: 16, marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  benefitsWrap: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: 'rgba(255,255,255,0.04)', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  benefitIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(124,92,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { color: '#F2EEFF', fontWeight: '700', fontSize: 14 },
  benefitSub: { color: 'rgba(242,238,255,0.6)', fontSize: 11, marginTop: 2 },
  cta: { paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center', shadowColor: '#7C5CFF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  legal: { color: 'rgba(242,238,255,0.45)', fontSize: 11, textAlign: 'center', marginTop: spacing.md, paddingHorizontal: spacing.md, lineHeight: 16 },
  compareWrap: {
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  compareHeadRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(124,92,255,0.18)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  compareHead: { color: '#F2EEFF', fontWeight: '800', fontSize: 12 },
  compareRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  compareCell: { color: '#F2EEFF', fontSize: 12, fontWeight: '600' },
});
