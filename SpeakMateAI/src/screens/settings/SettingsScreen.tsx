import React from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Text, useTheme, Avatar, Divider, Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import ScreenContainer from '@/components/common/ScreenContainer';
import Card from '@/components/common/Card';
import { ThemeMode } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { user, signOut } = useAuth();
  const { mode, setMode, isDark } = useAppTheme();

  const onSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => Alert.alert('Error', 'Could not sign out.'));
        },
      },
    ]);
  };

  return (
    <ScreenContainer scroll>
      <Text variant="headlineMedium" style={styles.title}>
        Settings
      </Text>

      <Pressable onPress={() => navigation.navigate('Profile')} testID="settings-profile-row">
        <Card>
          <View style={styles.profileRow}>
            {user?.photoURL ? (
              <Avatar.Image size={56} source={{ uri: user.photoURL }} />
            ) : (
              <Avatar.Text
                size={56}
                label={(user?.displayName || 'U').slice(0, 1).toUpperCase()}
                color="#fff"
                style={{ backgroundColor: theme.colors.primary }}
              />
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }} numberOfLines={1}>
                {user?.displayName || 'Set your name'}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                {user?.email}
              </Text>
              {user?.isPremium ? (
                <View style={[styles.premiumPill, { backgroundColor: theme.colors.tertiaryContainer }]}>
                  <Ionicons name="diamond" size={12} color={theme.colors.tertiary} />
                  <Text style={{ color: theme.colors.onTertiaryContainer, fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
                    PREMIUM
                  </Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.onSurfaceVariant} />
          </View>
        </Card>
      </Pressable>

      {!user?.isPremium ? (
        <Pressable onPress={() => navigation.navigate('Premium')} testID="settings-premium-cta">
          <Card style={[styles.premiumCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Ionicons name="diamond" size={24} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '700' }}>Go Premium</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                Unlock unlimited learning
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </Card>
        </Pressable>
      ) : null}

      <SectionTitle title="Appearance" />
      <Card>
        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Theme</Text>
        <View style={styles.themeRow}>
          {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[
                styles.themeOption,
                {
                  borderColor: mode === m ? theme.colors.primary : theme.colors.outline,
                  backgroundColor: mode === m ? theme.colors.primaryContainer : 'transparent',
                },
              ]}
              testID={`settings-theme-${m}`}
            >
              <Ionicons
                name={m === 'light' ? 'sunny' : m === 'dark' ? 'moon' : 'phone-portrait'}
                size={20}
                color={mode === m ? theme.colors.primary : theme.colors.onSurface}
              />
              <Text
                style={{
                  marginTop: 4,
                  color: mode === m ? theme.colors.primary : theme.colors.onSurface,
                  fontWeight: mode === m ? '700' : '500',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionTitle title="Preferences" />
      <Card>
        <Row
          icon="notifications-outline"
          label="Notifications"
          onPress={() => navigation.navigate('NotificationPrefs')}
          testID="settings-notif-row"
        />
        <Divider />
        <Row
          icon="document-text-outline"
          label="Privacy policy"
          onPress={() => navigation.navigate('PrivacyPolicy')}
          testID="settings-privacy-row"
        />
        <Divider />
        <Row
          icon="information-circle-outline"
          label="About"
          onPress={() =>
            Alert.alert('SpeakMate AI', 'Version 1.0.0\nBuilt with ❤️ for learners in India.')
          }
          testID="settings-about-row"
        />
      </Card>

      <Pressable onPress={onSignOut} style={styles.signOut} testID="settings-signout-btn">
        <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
        <Text style={{ color: theme.colors.error, fontWeight: '700', marginLeft: 8 }}>Sign out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

function SectionTitle({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Text
      variant="labelLarge"
      style={{
        marginTop: 20,
        marginBottom: 8,
        color: theme.colors.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
      }}
    >
      {title}
    </Text>
  );
}

function Row({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row} testID={testID}>
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <Text style={{ flex: 1, marginLeft: 12 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 32,
  },
});
