// CustomRoleScreen — user types their target role (e.g. "React Native Dev",
// "Data Engineer at fintech"), we ask Gemini to generate a bespoke glossary,
// then render it identically to JobTermsScreen. This means learners aren't
// limited to the 11 pre-baked tracks — any niche role is covered.
//
// UX flow:
//   1. TextInput + "Generate terms" button (top).
//   2. Loading state while backend is thinking (~4-7s for Gemini Flash).
//   3. Result cards (flip-to-expand, same look as static glossary).
//   4. "Start mock interview" CTA at bottom — falls back to HR track since
//      backend doesn't have a custom track. If user wants role-specific
//      questions, they can also use ResumeInterview flow.

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { attachIdToken } from '@/services/tokenProvider';
import { radius, spacing } from '@/config/theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Term {
  term: string;
  definition: string;
  example: string;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}/api/ai` : '';

export default function CustomRoleScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const [role, setRole] = useState('');
  const [terms, setTerms] = useState<Term[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);

  const generate = useCallback(async () => {
    const trimmed = role.trim();
    if (trimmed.length < 2) {
      Alert.alert('Enter a role', 'Try something like "React Native Developer" or "Product Manager".');
      return;
    }
    setLoading(true);
    setTerms(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.uid) headers['X-User-Id'] = user.uid;
      await attachIdToken(headers);
      const res = await fetch(`${API}/custom-terms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ role: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const reason: string = err?.detail?.reason || err?.detail || `HTTP ${res.status}`;
        Alert.alert(
          'Could not generate terms',
          reason.includes('quota')
            ? 'Daily limit reached. Upgrade to Premium for unlimited role lookups.'
            : 'Please try again in a moment.',
        );
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data.terms) || data.terms.length === 0) {
        Alert.alert('No terms found', 'Try phrasing the role differently, e.g. "iOS Developer".');
        return;
      }
      setTerms(data.terms);
      setExpanded(0);
    } catch {
      Alert.alert('Network error', 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [role, user?.uid]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0418' }}>
      <LinearGradient colors={['#0A0418', '#150828', '#1F0E3D']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            testID="custom-role-back-btn"
          >
            <Ionicons name="chevron-back" size={22} color="#F2EEFF" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.title}>Custom Role Vocabulary</Text>
            <Text style={styles.subtitle}>AI-curated terms for any job profile</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>YOUR TARGET ROLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. React Native Developer"
              placeholderTextColor="rgba(242,238,255,0.35)"
              value={role}
              onChangeText={setRole}
              autoCorrect={false}
              editable={!loading}
              testID="custom-role-input"
            />
            <Pressable
              onPress={generate}
              disabled={loading || role.trim().length < 2}
              style={[styles.genBtn, (loading || role.trim().length < 2) && styles.genBtnDisabled]}
              testID="custom-role-generate-btn"
            >
              <LinearGradient
                colors={['#7C5CFF', '#5B3FE0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.genBtnGrad}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.genBtnText}>Generate terms</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
            <Text style={styles.inputHint}>
              Tip: be specific — "SDR at SaaS company" beats "sales".
            </Text>
          </View>

          {terms && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.section}>
                {terms.length} terms for "{role.trim()}"
              </Text>
              {terms.map((t, idx) => {
                const open = expanded === idx;
                return (
                  <Pressable
                    key={`${t.term}-${idx}`}
                    onPress={() => setExpanded(open ? null : idx)}
                    style={[styles.termCard, open && styles.termCardOpen]}
                    testID={`custom-term-${idx}`}
                  >
                    <View style={styles.termHeader}>
                      <View style={styles.termIndex}>
                        <Text style={styles.termIndexText}>{String(idx + 1).padStart(2, '0')}</Text>
                      </View>
                      <Text style={styles.termName}>{t.term}</Text>
                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#A992FF"
                      />
                    </View>
                    {open && (
                      <View style={styles.termBody}>
                        <Text style={styles.termLabel}>DEFINITION</Text>
                        <Text style={styles.termDefinition}>{t.definition}</Text>
                        {t.example ? (
                          <>
                            <Text style={[styles.termLabel, { marginTop: spacing.md }]}>INTERVIEW EXAMPLE</Text>
                            <View style={styles.exampleBox}>
                              <Text style={styles.termExample}>{t.example}</Text>
                            </View>
                          </>
                        ) : null}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: { color: '#F2EEFF', fontSize: 17, fontWeight: '800' },
  subtitle: { color: 'rgba(242,238,255,0.5)', fontSize: 12, marginTop: 2 },
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputLabel: {
    color: 'rgba(242,238,255,0.5)',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: '#F2EEFF',
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genBtn: { marginTop: spacing.md, borderRadius: radius.xl, overflow: 'hidden' },
  genBtnDisabled: { opacity: 0.5 },
  genBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  genBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  inputHint: {
    color: 'rgba(242,238,255,0.4)',
    fontSize: 11,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  section: { color: '#F2EEFF', fontWeight: '800', fontSize: 15, marginBottom: spacing.md },
  termCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  termCardOpen: {
    backgroundColor: 'rgba(124,92,255,0.12)',
    borderColor: 'rgba(124,92,255,0.4)',
  },
  termHeader: { flexDirection: 'row', alignItems: 'center' },
  termIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(124,92,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  termIndexText: { color: '#A992FF', fontSize: 12, fontWeight: '800' },
  termName: { flex: 1, color: '#F2EEFF', fontSize: 15, fontWeight: '700' },
  termBody: { paddingTop: spacing.md, paddingLeft: 42 },
  termLabel: {
    color: 'rgba(242,238,255,0.5)',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '800',
  },
  termDefinition: {
    color: '#F2EEFF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  exampleBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#7C5CFF',
  },
  termExample: {
    color: 'rgba(242,238,255,0.9)',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },
});
