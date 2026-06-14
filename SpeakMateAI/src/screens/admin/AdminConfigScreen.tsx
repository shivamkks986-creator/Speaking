// AdminConfigScreen — admin-only kill-switch & budget control panel.
// Accessible only if user's email is in EXPO_PUBLIC_ADMIN_EMAILS (comma-separated).
// Lets you flip module switches, set daily budget, and edit maintenance copy.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, Alert, TextInput, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { radius, spacing } from '@/config/theme';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { adminUpdateConfig, adminBackendToggle } from '@/services/remoteConfigService';

const ADMIN_EMAILS = (process.env.EXPO_PUBLIC_ADMIN_EMAILS || 'admin@speakmate.ai')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminUser(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export default function AdminConfigScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { config, refresh } = useRemoteConfig();
  const [saving, setSaving] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('500');
  const [quotaInput, setQuotaInput] = useState('30');
  const [maintInput, setMaintInput] = useState(config.maintenanceMessage);

  useEffect(() => {
    setMaintInput(config.maintenanceMessage);
  }, [config.maintenanceMessage]);

  if (!isAdminUser(user?.email)) {
    return (
      <View style={styles.unauth}>
        <Ionicons name="lock-closed" size={48} color="#FCA5A5" />
        <Text style={styles.unauthText}>Admin access only</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const toggleField = async (field: 'tutorEnabled' | 'speakingEnabled' | 'interviewEnabled' | 'premiumEnabled' | 'globalAIEnabled', value: boolean) => {
    setSaving(field);
    try {
      await adminUpdateConfig({ [field]: value });
      await refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(null);
    }
  };

  const saveMaintenanceMsg = async () => {
    setSaving('maint');
    try {
      await adminUpdateConfig({ maintenanceMessage: maintInput });
      await adminBackendToggle(user!.email!, { maintenance_message: maintInput });
      Alert.alert('Saved', 'Maintenance message updated.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const saveBudget = async () => {
    const v = parseFloat(budgetInput);
    if (isNaN(v) || v < 0) {
      Alert.alert('Invalid', 'Enter a valid budget in INR (e.g. 500)');
      return;
    }
    setSaving('budget');
    try {
      await adminBackendToggle(user!.email!, { daily_budget_inr: v });
      await refresh();
      Alert.alert('Saved', `Daily budget set to ₹${v}`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const saveQuota = async () => {
    const v = parseInt(quotaInput, 10);
    if (isNaN(v) || v < 0) {
      Alert.alert('Invalid', 'Enter a valid daily limit (e.g. 30)');
      return;
    }
    setSaving('quota');
    try {
      await adminBackendToggle(user!.email!, { user_daily_free_limit: v });
      await refresh();
      Alert.alert('Saved', `Free users now get ${v} AI calls/day`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const forceKill = async (kill: boolean) => {
    setSaving('force');
    try {
      await adminBackendToggle(user!.email!, { force_disabled: kill });
      await refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to toggle');
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#1F0E3D', '#0A0418']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={20} color="#F2EEFF" />
            </Pressable>
            <Text style={styles.title}>Admin Console</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Budget status */}
          <View style={styles.statusCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.statusLabel}>Today's spend</Text>
              <Text style={[styles.statusValue, { color: config.budgetRemainingPct < 20 ? '#FCA5A5' : '#34D399' }]}>
                ₹{config.todayCostINR.toFixed(2)}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(0, 100 - config.budgetRemainingPct)}%`,
                    backgroundColor: config.budgetRemainingPct < 20 ? '#FCA5A5' : '#34D399',
                  },
                ]}
              />
            </View>
            <Text style={styles.barCaption}>
              {config.budgetRemainingPct.toFixed(1)}% remaining of daily budget
            </Text>
          </View>

          {/* Emergency force-disable */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>🚨 Emergency Kill Switch</Text>
                <Text style={styles.cardSub}>Instantly disables ALL AI calls via backend</Text>
              </View>
              {saving === 'force' ? (
                <ActivityIndicator color="#FCA5A5" />
              ) : (
                <Switch
                  value={config.forceDisabled}
                  onValueChange={(v) => forceKill(v)}
                  trackColor={{ false: '#444', true: '#FCA5A5' }}
                  thumbColor={config.forceDisabled ? '#EF4444' : '#888'}
                  testID="admin-force-disable"
                />
              )}
            </View>
          </View>

          {/* Module toggles */}
          <Text style={styles.section}>Module switches (Firestore)</Text>
          <ToggleRow label="Global AI"     icon="planet"     value={config.globalAIEnabled}  onChange={(v) => toggleField('globalAIEnabled', v)}  busy={saving === 'globalAIEnabled'} testID="admin-toggle-global" />
          <ToggleRow label="AI Tutor"      icon="chatbubbles" value={config.tutorEnabled}     onChange={(v) => toggleField('tutorEnabled', v)}     busy={saving === 'tutorEnabled'}     testID="admin-toggle-tutor" />
          <ToggleRow label="Speaking"      icon="mic"         value={config.speakingEnabled}  onChange={(v) => toggleField('speakingEnabled', v)}  busy={saving === 'speakingEnabled'}  testID="admin-toggle-speaking" />
          <ToggleRow label="Interview"     icon="briefcase"   value={config.interviewEnabled} onChange={(v) => toggleField('interviewEnabled', v)} busy={saving === 'interviewEnabled'} testID="admin-toggle-interview" />
          <ToggleRow label="Premium store" icon="diamond"     value={config.premiumEnabled}   onChange={(v) => toggleField('premiumEnabled', v)}   busy={saving === 'premiumEnabled'}   testID="admin-toggle-premium" />

          {/* Daily budget */}
          <Text style={styles.section}>Daily budget (INR)</Text>
          <View style={styles.card}>
            <Text style={styles.cardSub}>Current: ₹{config.todayCostINR.toFixed(2)} spent today</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <View style={styles.budgetInputWrap}>
                <Text style={{ color: '#A992FF', fontWeight: '800', marginRight: 4 }}>₹</Text>
                <TextInput
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor="rgba(242,238,255,0.4)"
                  style={styles.budgetInput}
                  testID="admin-budget-input"
                />
              </View>
              <Pressable
                onPress={saveBudget}
                disabled={saving === 'budget'}
                style={styles.savePill}
                testID="admin-budget-save"
              >
                <Text style={styles.savePillText}>{saving === 'budget' ? '…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Per-user daily free limit */}
          <Text style={styles.section}>Free user daily limit</Text>
          <View style={styles.card}>
            <Text style={styles.cardSub}>
              Free users get this many AI calls per day. Premium users are unlimited. Hitting the
              limit shows a soft paywall.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
              <View style={styles.budgetInputWrap}>
                <Ionicons name="flash" size={14} color="#A992FF" style={{ marginRight: 4 }} />
                <TextInput
                  value={quotaInput}
                  onChangeText={setQuotaInput}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor="rgba(242,238,255,0.4)"
                  style={styles.budgetInput}
                  testID="admin-quota-input"
                />
              </View>
              <Pressable
                onPress={saveQuota}
                disabled={saving === 'quota'}
                style={styles.savePill}
                testID="admin-quota-save"
              >
                <Text style={styles.savePillText}>{saving === 'quota' ? '…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Maintenance message */}
          <Text style={styles.section}>Maintenance message</Text>
          <View style={styles.card}>
            <TextInput
              value={maintInput}
              onChangeText={setMaintInput}
              multiline
              placeholder="Shown on the MaintenanceScreen"
              placeholderTextColor="rgba(242,238,255,0.4)"
              style={[styles.budgetInput, { minHeight: 70, textAlignVertical: 'top' }]}
              testID="admin-maintenance-input"
            />
            <Pressable
              onPress={saveMaintenanceMsg}
              disabled={saving === 'maint'}
              style={[styles.savePill, { alignSelf: 'flex-end', marginTop: 8 }]}
              testID="admin-maintenance-save"
            >
              <Text style={styles.savePillText}>{saving === 'maint' ? '…' : 'Save'}</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            Changes propagate to every device within 1 minute · No app update required.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ToggleRow({ label, icon, value, onChange, busy, testID }: { label: string; icon: keyof typeof import('@expo/vector-icons/build/Ionicons').default.glyphMap; value: boolean; onChange: (v: boolean) => void; busy: boolean; testID?: string }) {
  return (
    <View style={styles.toggleRow}>
      <Ionicons name={icon} size={18} color="#A992FF" />
      <Text style={styles.toggleLabel}>{label}</Text>
      {busy ? (
        <ActivityIndicator color="#A992FF" />
      ) : (
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: '#444', true: '#34D399' }}
          thumbColor={value ? '#34D399' : '#888'}
          testID={testID}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { color: '#F2EEFF', fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  statusCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: spacing.md },
  statusLabel: { color: 'rgba(242,238,255,0.6)', fontSize: 12, fontWeight: '700' },
  statusValue: { fontSize: 18, fontWeight: '800' },
  barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' },
  barCaption: { color: 'rgba(242,238,255,0.5)', fontSize: 11, marginTop: 6 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: spacing.sm },
  cardTitle: { color: '#F2EEFF', fontSize: 14, fontWeight: '800' },
  cardSub: { color: 'rgba(242,238,255,0.55)', fontSize: 11, marginTop: 4 },
  section: { color: '#F2EEFF', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm, textTransform: 'uppercase' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  toggleLabel: { color: '#F2EEFF', fontSize: 13, fontWeight: '700', flex: 1 },
  budgetInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: radius.md, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  budgetInput: { flex: 1, color: '#F2EEFF', fontSize: 14, paddingVertical: 10 },
  savePill: { backgroundColor: '#7C5CFF', paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill },
  savePillText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
  footer: { color: 'rgba(242,238,255,0.45)', fontSize: 11, textAlign: 'center', marginTop: spacing.xl, fontStyle: 'italic' },
  unauth: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0418', gap: spacing.md, padding: spacing.lg },
  unauthText: { color: '#FCA5A5', fontSize: 16, fontWeight: '700' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.pill },
  backBtnText: { color: '#F2EEFF', fontWeight: '700' },
});
