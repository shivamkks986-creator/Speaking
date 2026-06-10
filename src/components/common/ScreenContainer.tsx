import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export default function ScreenContainer({
  children,
  scroll = false,
  padded = true,
  contentStyle,
}: Props) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <Container
        style={styles.flex}
        contentContainerStyle={[
          padded ? styles.padded : null,
          scroll ? styles.scrollContent : null,
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  padded: { paddingHorizontal: 16, paddingVertical: 8 },
  scrollContent: { paddingBottom: 32 },
});
