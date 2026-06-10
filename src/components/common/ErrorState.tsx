import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Something went wrong.', onRetry }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={56} color={theme.colors.error} />
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.error }]}>
        Oops!
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.msg, { color: theme.colors.onSurfaceVariant }]}
      >
        {message}
      </Text>
      {onRetry ? (
        <Button mode="contained" onPress={onRetry} style={{ marginTop: 16 }}>
          Try again
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { marginTop: 12, marginBottom: 4 },
  msg: { textAlign: 'center' },
});
