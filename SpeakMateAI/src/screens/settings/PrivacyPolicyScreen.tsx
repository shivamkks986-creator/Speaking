import React from 'react';
import { Text, useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import { PRIVACY_POLICY_TEXT } from '@/utils/constants';
import ScreenContainer from '@/components/common/ScreenContainer';

export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  return (
    <ScreenContainer scroll>
      <Text style={[styles.text, { color: theme.colors.onSurface }]}>{PRIVACY_POLICY_TEXT}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  text: { lineHeight: 22, fontSize: 14 },
});
