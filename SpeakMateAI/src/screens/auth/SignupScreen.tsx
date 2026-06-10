import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail, validateName, validatePassword } from '@/utils/validators';
import ScreenContainer from '@/components/common/ScreenContainer';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const theme = useTheme();
  const { signUp } = useAuth();
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
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.header}>
            <Ionicons name="person-add" size={48} color={theme.colors.primary} />
            <Text variant="headlineMedium" style={styles.title}>
              Create account
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Start your free 7-day learning journey
            </Text>
          </View>

          <View>
            <TextInput
              mode="outlined"
              label="Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              left={<TextInput.Icon icon="account-outline" />}
              testID="signup-name-input"
            />
            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              left={<TextInput.Icon icon="email-outline" />}
              style={{ marginTop: 12 }}
              testID="signup-email-input"
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
              testID="signup-password-input"
            />
            {error ? (
              <HelperText type="error" visible style={{ marginTop: 4 }}>
                {error}
              </HelperText>
            ) : (
              <HelperText type="info" visible style={{ marginTop: 4 }}>
                Use at least 6 characters.
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={onSubmit}
              loading={loading}
              disabled={loading}
              contentStyle={styles.btnContent}
              style={styles.primaryBtn}
              testID="signup-submit-btn"
            >
              Create account
            </Button>

            <Text style={[styles.terms, { color: theme.colors.onSurfaceVariant }]}>
              By signing up you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>Already a user? </Text>
            <Button
              mode="text"
              compact
              onPress={() => navigation.navigate('Login')}
              testID="signup-login-link"
            >
              Log in
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { alignItems: 'center', marginTop: 12, marginBottom: 24 },
  title: { fontWeight: '700', marginTop: 8 },
  primaryBtn: { marginTop: 16, borderRadius: 12 },
  btnContent: { height: 48 },
  terms: { textAlign: 'center', marginTop: 12, fontSize: 12 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 16,
    paddingTop: 24,
  },
});
