import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validatePassword } from '@/utils/validators';
import ScreenContainer from '@/components/common/ScreenContainer';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
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
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google Sign-In failed';
      Alert.alert('Google Sign-In', message);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Ionicons name="mic-circle" size={56} color={theme.colors.primary} />
          <Text variant="headlineMedium" style={styles.title}>
            Welcome back
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Continue your English journey
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            left={<TextInput.Icon icon="email-outline" />}
            testID="login-email-input"
          />
          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPwd}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPwd ? 'eye-off' : 'eye'}
                onPress={() => setShowPwd(!showPwd)}
              />
            }
            style={{ marginTop: 12 }}
            testID="login-password-input"
          />
          {error ? (
            <HelperText type="error" visible style={{ marginTop: 4 }}>
              {error}
            </HelperText>
          ) : null}

          <Button
            mode="text"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgot}
            testID="login-forgot-btn"
          >
            Forgot password?
          </Button>

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={loading}
            disabled={loading}
            contentStyle={styles.btnContent}
            style={styles.primaryBtn}
            testID="login-submit-btn"
          >
            Log in
          </Button>

          <View style={styles.dividerRow}>
            <Divider style={styles.divider} />
            <Text style={{ marginHorizontal: 8, color: theme.colors.onSurfaceVariant }}>OR</Text>
            <Divider style={styles.divider} />
          </View>

          <Button
            mode="outlined"
            icon="google"
            onPress={onGoogle}
            contentStyle={styles.btnContent}
            testID="login-google-btn"
          >
            Continue with Google
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>New here? </Text>
          <Button
            mode="text"
            compact
            onPress={() => navigation.navigate('Signup')}
            testID="login-signup-link"
          >
            Create account
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', marginTop: 12, marginBottom: 24 },
  title: { fontWeight: '700', marginTop: 8 },
  form: { gap: 0 },
  forgot: { alignSelf: 'flex-end', marginTop: 4 },
  primaryBtn: { marginTop: 12, borderRadius: 12 },
  btnContent: { height: 48 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  divider: { flex: 1, height: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
});
