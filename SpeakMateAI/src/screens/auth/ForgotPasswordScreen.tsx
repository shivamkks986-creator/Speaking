import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AuthStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { validateEmail } from '@/utils/validators';
import ScreenContainer from '@/components/common/ScreenContainer';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async () => {
    const eErr = validateEmail(email);
    if (eErr) {
      setError(eErr);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send reset email';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Ionicons name="lock-open" size={48} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.title}>
          Reset password
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Enter your email — we'll send a reset link.
        </Text>
      </View>

      {success ? (
        <View style={[styles.success, { backgroundColor: theme.colors.tertiaryContainer }]}>
          <Ionicons name="checkmark-circle" size={36} color={theme.colors.tertiary} />
          <Text style={{ color: theme.colors.onTertiaryContainer, marginTop: 8, textAlign: 'center' }}>
            Reset email sent to {email}. Check your inbox (and spam folder).
          </Text>
          <Button mode="contained" style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
            Back to login
          </Button>
        </View>
      ) : (
        <>
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-outline" />}
            testID="forgot-email-input"
          />
          {error ? (
            <HelperText type="error" visible style={{ marginTop: 4 }}>
              {error}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            onPress={onSubmit}
            loading={loading}
            disabled={loading}
            contentStyle={{ height: 48 }}
            style={{ marginTop: 16, borderRadius: 12 }}
            testID="forgot-submit-btn"
          >
            Send reset link
          </Button>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: 16, marginBottom: 24 },
  title: { fontWeight: '700', marginTop: 8 },
  subtitle: { marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  success: { padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 24 },
});
