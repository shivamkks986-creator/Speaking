import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useScreenInsets } from '@/hooks/useScreenInsets';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * ScreenContainer — every regular (non custom-header) screen should use this.
 * It guarantees:
 *   • Top padding never clipped behind the status bar / punch-hole camera
 *   • Bottom content never hidden behind the floating bottom tab bar
 * Both values come from `useScreenInsets` so the fix is centralized and
 * cannot regress when an individual screen is refactored.
 */
export default function ScreenContainer({
  children,
  scroll = false,
  padded = true,
  contentStyle,
}: Props) {
  const theme = useTheme();
  const { headerPaddingTop, bottomPad } = useScreenInsets();
  const Container = scroll ? ScrollView : View;
  return (
    <View
      style={[styles.flex, { backgroundColor: theme.colors.background, paddingTop: headerPaddingTop }]}
    >
      <Container
        style={styles.flex}
        contentContainerStyle={[
          padded ? styles.padded : null,
          scroll ? { paddingBottom: bottomPad } : null,
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: 16, paddingVertical: 8 },
});
