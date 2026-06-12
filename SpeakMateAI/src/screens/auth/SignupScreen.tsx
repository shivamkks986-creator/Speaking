// Premium Signup — dark gradient hero, benefit checks, AI-coach branding
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import FadeInView from '@/components/common/FadeInView';

import { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validateName, validatePassword } from '@/utils/validators';
import { radius, spacing } from '@/config/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

const BENEFITS = [
  { icon: 'chatbubbles' as const, text: 'AI Speaking Coach' },
  { icon: 'pulse' as const, text: 'Instant Feedback' },
  { icon: 'flame' as const, text: 'Daily Challenges' },
  { icon: 'briefcase' as const, text: 'Interview Practice' },
];

export default function SignupScreen({ navigation }: Props) {
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const nErr = validateName(name);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (nErr || eErr || pErr) {
      setError(nErr ?? eErr ?? pErr);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(name.trim(), email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      Alert.alert('Google Sign-In', err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0618' }}>
      <LinearGradient colors={['#1A1038', '#130A2B', '#0B0618']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={24} color="#F2EEFF" />
            </Pressable>

            {/* Hero */}
            <FadeInView duration={500} style={styles.hero}>
              <LinearGradient
                colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoCircle}
              >
                <Ionicons name="diamond" size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.heroTitle}>Start Your English Success Journey</Text>
              <Text style={styles.heroSub}>
                Master speaking, pronunciation, confidence and interviews.
              </Text>
            </FadeInView>

            {/* Benefits */}
            <FadeInView delay={100} duration={500} direction="up" style={styles.benefitsGrid}>
              {BENEFITS.map((b) => (
                <View key={b.text} style={styles.benefit}>
                  <View style={styles.benefitDot}>
                    <Ionicons name={b.icon} size={14} color="#34D399" />
                  </View>
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </FadeInView>

            {/* Google CTA */}
            <FadeInView delay={180} duration={500} direction="up">
              <Pressable onPress={onGoogle} style={styles.googleBtn} testID="signup-google-btn">
                <Ionicons name="logo-google" size={18} color="#0B0618" />
                <Text style={styles.googleText}>Sign up with Google</Text>
              </Pressable>
            </FadeInView>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Form */}
            <FadeInView delay={240} duration={500} direction="up">
              <Field
                icon="person"
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                testID="signup-name-input"
              />
              <View style={{ height: spacing.md }} />
              <Field
                icon="mail"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="signup-email-input"
              />
              <View style={{ height: spacing.md }} />
              <Field
                icon="lock-closed"
                placeholder="Password (min 6 chars)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                trailing={
                  <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={10}>
                    <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={18} color="rgba(242,238,255,0.5)" />
                  </Pressable>
                }
                testID="signup-password-input"
              />

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable onPress={onSubmit} disabled={loading} testID="signup-submit-btn" style={{ marginTop: spacing.lg }}>
                <LinearGradient
                  colors={['#7C5CFF', '#FF6B9D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.cta, loading && { opacity: 0.6 }]}
                >
                  <Text style={styles.ctaText}>{loading ? 'Creating…' : 'Create Account'}</Text>
                </LinearGradient>
              </Pressable>

              <Text style={styles.terms}>
                By signing up you agree to our Terms of Service and Privacy Policy.
              </Text>
            </FadeInView>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already a user? </Text>
              <Pressable onPress={() => navigation.navigate('Login')} testID="signup-login-link">
                <Text style={styles.footerLink}>Log In</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field(props: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (s: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  testID?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Ionicons name={props.icon} size={18} color="rgba(242,238,255,0.5)" />
      <RNTextInput
        placeholder={props.placeholder}
        placeholderTextColor="rgba(242,238,255,0.4)"
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        style={styles.field}
        testID={props.testID}
      />
      {props.trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.06)' },
  hero: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.lg },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: '#7C5CFF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  heroTitle: { color: '#F2EEFF', fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 28 },
  heroSub: { color: 'rgba(242,238,255,0.65)', fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: spacing.lg },
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg, justifyContent: 'center' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.3)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  benefitDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(52,211,153,0.2)', alignItems: 'center', justifyContent: 'center' },
  benefitText: { color: '#34D399', fontSize: 11, fontWeight: '700' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: radius.pill,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  googleText: { color: '#0B0618', fontWeight: '700', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: 'rgba(242,238,255,0.5)', marginHorizontal: 10, fontSize: 12, fontWeight: '600' },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md, height: 52, borderRadius: radius.lg,
  },
  field: { flex: 1, color: '#F2EEFF', fontSize: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.3)', borderWidth: 1, padding: 10, borderRadius: radius.md, marginTop: spacing.sm },
  errorText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },
  cta: { paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center', shadowColor: '#7C5CFF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  terms: { color: 'rgba(242,238,255,0.45)', textAlign: 'center', marginTop: spacing.md, fontSize: 11, lineHeight: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: 'rgba(242,238,255,0.6)', fontSize: 13 },
  footerLink: { color: '#A992FF', fontWeight: '800', fontSize: 13 },
});
