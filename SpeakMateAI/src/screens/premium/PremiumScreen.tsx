import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '@/contexts/AuthContext';
import { billingService } from '@/services/billingService';
import { PremiumProduct } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius } from '@/config/theme';

const BENEFITS = [
  { icon: 'infinite', label: 'Unlimited AI Tutor chats' },
  { icon: 'mic', label: 'Unlimited speaking sessions' },
  { icon: 'briefcase', label: 'Full mock interview library' },
  { icon: 'analytics', label: 'Advanced pronunciation analytics' },
  { icon: 'cloud-done', label: 'Cloud progress sync' },
  { icon: 'remove-circle', label: 'Ad-free experience' },
];

export default function PremiumScreen() {
  const theme = useTheme();
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
      Alert.alert('Welcome to Premium 🎉', 'Enjoy the unlimited experience!');
      navigation.goBack();
    } else {
      Alert.alert(
        'Coming Soon',
        res.error ||
          'Google Play Billing will be enabled in the next release. Stay tuned!'
      );
    }
  };

  const onRestore = async () => {
    const res = await billingService.restorePurchases();
    if (res.ok && res.isPremium) {
      await updateProfile({ isPremium: true });
      Alert.alert('Restored', 'Your premium subscription has been restored.');
    } else {
      Alert.alert('Nothing to restore', 'No active subscription was found for this account.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <LinearGradient
          colors={['#1A1340', '#3A2FB0', '#6D5BFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} testID="premium-close">
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Ionicons name="diamond" size={48} color="#FFD86B" />
          <Text style={styles.heroTitle}>SpeakMate Premium</Text>
          <Text style={styles.heroSub}>
            Unlock your fastest path to fluent English.
          </Text>
        </LinearGradient>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.label} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <Ionicons
                  name={b.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={{ flex: 1 }}>{b.label}</Text>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.tertiary} />
            </View>
          ))}
        </View>

        <Text variant="titleMedium" style={styles.planTitle}>
          Choose your plan
        </Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={theme.colors.primary} />
        ) : (
          <View style={styles.plans}>
            {products.map((p) => {
              const active = selected === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelected(p.id)}
                  style={[
                    styles.planCard,
                    {
                      borderColor: active ? theme.colors.primary : theme.colors.outline,
                      backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surface,
                    },
                  ]}
                  testID={`premium-plan-${p.id}`}
                >
                  {p.popular ? (
                    <View style={[styles.popular, { backgroundColor: theme.colors.secondary }]}>
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  ) : null}
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                    {p.title}
                  </Text>
                  <Text variant="headlineSmall" style={{ fontWeight: '800', marginTop: 4 }}>
                    {p.price}
                  </Text>
                  {p.savings ? (
                    <Text style={{ color: theme.colors.tertiary, fontWeight: '700', fontSize: 12 }}>
                      {p.savings}
                    </Text>
                  ) : null}
                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={theme.colors.primary}
                      style={styles.checkmark}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Button
            mode="contained"
            onPress={onPurchase}
            loading={purchasing}
            disabled={purchasing || !!user?.isPremium}
            contentStyle={{ height: 52 }}
            style={{ borderRadius: 14 }}
            testID="premium-purchase-btn"
          >
            {user?.isPremium ? 'You are Premium 🎉' : 'Continue'}
          </Button>
          <Button mode="text" onPress={onRestore} style={{ marginTop: 8 }} testID="premium-restore-btn">
            Restore purchases
          </Button>
          <Text style={[styles.legal, { color: theme.colors.onSurfaceVariant }]}>
            Cancel anytime via Google Play. Subscriptions auto-renew unless cancelled at least 24 hours
            before the end of the period.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 28, alignItems: 'center', paddingTop: 36 },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 8 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 10 },
  heroSub: { color: 'rgba(255,255,255,0.9)', marginTop: 4, textAlign: 'center' },
  benefits: { padding: 16, gap: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { fontWeight: '700', paddingHorizontal: 16, marginTop: 8 },
  plans: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 12 },
  planCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: 14,
    minHeight: 100,
  },
  popular: {
    position: 'absolute',
    top: -10,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  checkmark: { position: 'absolute', bottom: 8, right: 8 },
  legal: { textAlign: 'center', marginTop: 12, fontSize: 11, lineHeight: 16 },
});
