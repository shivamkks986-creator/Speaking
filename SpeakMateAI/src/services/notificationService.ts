import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#6D5BFF',
      });
    }
    return status === 'granted';
  },

  async scheduleDailyReminder(hour = 19, minute = 0): Promise<string | null> {
    const granted = await this.requestPermissions();
    if (!granted) return null;
    await this.cancelAll();
    return Notifications.scheduleNotificationAsync({
      content: {
        title: '🎙️ Time to practise English!',
        body: 'A 5-minute session keeps your streak alive. Tap to start.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
      },
    });
  },

  async scheduleStreakReminder(): Promise<string | null> {
    const granted = await this.requestPermissions();
    if (!granted) return null;
    return Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Don\'t break your streak!',
        body: 'You\'re doing amazing — finish today\'s practice before bedtime.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 21,
        minute: 30,
        repeats: true,
      },
    });
  },

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
