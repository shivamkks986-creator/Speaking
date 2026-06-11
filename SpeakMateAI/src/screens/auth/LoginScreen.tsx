// Premium Login — dark gradient hero, trust badges, AI-coach branding
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
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

import { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validatePassword } from '@/utils/validators';
import { radius, spacing } from '@/config/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (eErr || pErr) {
      setError(eErr ?? pErr);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
            {/* Hero */}
            <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
              <LinearGradient
                colors={['#FACC15', '#FF6B9D', '#7C5CFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoCircle}
              >
                <Ionicons name="diamond" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.heroTitle}>Speak English With Confidence</Text>
              <Text style={styles.heroSub}>
                Practice speaking, improve pronunciation and crack interviews with AI.
              </Text>

              {/* Trust badges */}
              <View style={styles.badges}>
                <TrustBadge icon="star" text="4.8 Rating" color="#FACC15" />
                <TrustBadge icon="mic" text="50K+ Convos" color="#FF6B9D" />
                <TrustBadge icon="people" text="1000+ Learners" color="#22D3EE" />
              </View>
            </Animated.View>

            {/* Google CTA */}
            <Animated.View entering={FadeInUp.delay(150).duration(500)}>
              <Pressable onPress={onGoogle} style={styles.googleBtn} testID="login-google-btn">
                <View style={styles.googleIcon}>
                  <Ionicons name="logo-google" size={18} color="#0B0618" />
                </View>
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Form */}
            <Animated.View entering={FadeInUp.delay(220).duration(500)}>
              <Field
                icon="mail"
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="login-email-input"
              />
              <View style={{ height: spacing.md }} />
              <Field
                icon="lock-closed"
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                trailing={
                  <Pressable onPress={() => setShowPwd(!showPwd)} hitSlop={10}>
                    <Ionicons name={showPwd ? 'eye-off' : 'eye'} size={18} color="rgba(242,238,255,0.5)" />
                  </Pressable>
                }
                testID="login-password-input"
              />

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgot}
                testID="login-forgot-btn"
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>

              <Pressable onPress={onSubmit} disabled={loading} testID="login-submit-btn">
                <LinearGradient
                  colors={['#7C5CFF', '#FF6B9D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.cta, loading && { opacity: 0.6 }]}
                >
                  <Text style={styles.ctaText}>{loading ? 'Logging in…' : 'Log In'}</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Pressable onPress={() => navigation.navigate('Signup')} testID="login-signup-link">
                <Text style={styles.footerLink}>Create Account</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function TrustBadge({
  icon,
  text,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
}) {
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
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
  hero: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xl },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  heroTitle: {
    color: '#F2EEFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 32,
  },
  heroSub: {
    color: 'rgba(242,238,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  badges: { flexDirection: 'row', gap: 8, marginTop: spacing.lg, flexWrap: 'wrap', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  googleIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  googleText: { color: '#0B0618', fontWeight: '700', fontSize: 14 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: 'rgba(242,238,255,0.5)', marginHorizontal: 10, fontSize: 12, fontWeight: '600' },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: radius.lg,
  },
  field: { flex: 1, color: '#F2EEFF', fontSize: 14 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderColor: 'rgba(255,107,107,0.3)',
    borderWidth: 1,
    padding: 10,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  errorText: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },
  forgot: { alignSelf: 'flex-end', marginTop: spacing.sm, marginBottom: spacing.md },
  forgotText: { color: '#A992FF', fontSize: 13, fontWeight: '700' },
  cta: {
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: { color: 'rgba(242,238,255,0.6)', fontSize: 13 },
  footerLink: { color: '#A992FF', fontWeight: '800', fontSize: 13 },
});
