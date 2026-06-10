import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Switch, useTheme, Divider, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/utils/constants';
import { notificationService } from '@/services/notificationService';
import ScreenContainer from '@/components/common/ScreenContainer';
import Card from '@/components/common/Card';

interface Prefs {
  dailyReminder: boolean;
  streakReminder: boolean;
}

const defaults: Prefs = { dailyReminder: true, streakReminder: true };

export default function NotificationPrefsScreen() {
  const theme = useTheme();
  const [prefs, setPrefs] = useState<Prefs>(defaults);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFS)
      .then((raw) => raw && setPrefs({ ...defaults, ...JSON.parse(raw) }))
      .catch(() => {});
  }, []);

  const save = async (next: Prefs) => {
    setPrefs(next);
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(next));
  };

  const apply = async () => {
    try {
      await notificationService.cancelAll();
      if (prefs.dailyReminder) await notificationService.scheduleDailyReminder(19, 0);
      if (prefs.streakReminder) await notificationService.scheduleStreakReminder();
      Alert.alert('Saved', 'Your notification preferences have been applied.');
    } catch {
      Alert.alert(
        'Permission needed',
        'Please enable notifications for SpeakMate AI in your phone settings.'
      );
    }
  };

  return (
    <ScreenContainer scroll>
      <Card>
        <Row
          icon="alarm"
          label="Daily learning reminder"
          description="Get a friendly nudge every evening at 7:00 PM."
          value={prefs.dailyReminder}
          onValueChange={(v) => save({ ...prefs, dailyReminder: v })}
          testID="notif-daily-toggle"
        />
        <Divider style={{ marginVertical: 4 }} />
        <Row
          icon="flame"
          label="Streak reminder"
          description="A late-night reminder so you never break your streak."
          value={prefs.streakReminder}
          onValueChange={(v) => save({ ...prefs, streakReminder: v })}
          testID="notif-streak-toggle"
        />
      </Card>

      <Button
        mode="contained"
        onPress={apply}
        style={{ marginTop: 16, borderRadius: 12 }}
        contentStyle={{ height: 46 }}
        testID="notif-apply-btn"
      >
        Apply preferences
      </Button>
      <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
        We'll request notification permission the first time you enable any reminder.
      </Text>
    </ScreenContainer>
  );
}

function Row({
  icon,
  label,
  description,
  value,
  onValueChange,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={theme.colors.primary} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  note: { textAlign: 'center', marginTop: 12, fontSize: 12 },
});
