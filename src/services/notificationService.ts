import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeworkItem, Exam } from '../types';

// Detect if we are in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';
const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';
const STANDARD_CHANNEL_ID = 'snapschool_alerts_v3';
const EMERGENCY_CHANNEL_ID = 'snapschool_emergency_v3';
const STANDARD_SOUND = 'notification.m4a';
const EMERGENCY_SOUND = 'alert.m4a';

// Configure Android Channels with MAX importance for audible heads-up banners
export const initNotificationChannels = async () => {
  if (isExpoGo || Platform.OS !== 'android') return;
  try {
    // Android locks a channel's sound after creation, so custom sounds use new v3 IDs.
    await Notifications.setNotificationChannelAsync(STANDARD_CHANNEL_ID, {
      name: 'SnapSchool — Alertes',
      description: 'Actualités, devoirs, notes et messages de votre école',
      importance: Notifications.AndroidImportance.MAX,
      sound: STANDARD_SOUND,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: '#0055d4',
      enableVibrate: true,
      showBadge: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL_ID, {
      name: 'SnapSchool — Urgences',
      description: 'Alertes urgentes et annonces prioritaires de votre école',
      importance: Notifications.AndroidImportance.MAX,
      sound: EMERGENCY_SOUND,
      vibrationPattern: [0, 500, 180, 500, 180, 500],
      lightColor: '#ff0000',
      enableVibrate: true,
      showBadge: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    // Keep previous channels for notifications already queued with older app versions.
    await Notifications.setNotificationChannelAsync('snapschool_alerts_v2', {
      name: 'SnapSchool Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0055d4',
      enableVibrate: true,
      showBadge: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    // 2. Primary Emergency Channel v2 - MAX importance + urgent vibration
    await Notifications.setNotificationChannelAsync('snapschool_emergency_v2', {
      name: 'SnapSchool Urgences',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#ff0000',
      enableVibrate: true,
      showBadge: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    // 3. Fallback 'default' channel with MAX importance (never delete, required as safe fallback)
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SnapSchool Standard',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0055d4',
      enableVibrate: true,
      showBadge: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.NOTIFICATION,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });

    // 4. Overwrite legacy snapschool_alerts_v1 without sound: null
    await Notifications.setNotificationChannelAsync('snapschool_alerts_v1', {
      name: 'SnapSchool Notifications (v1)',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0055d4',
      enableVibrate: true,
      showBadge: true,
    });

    console.log('[NOTIF] Android notification channels v3 configured with SnapSchool custom sounds');
  } catch (error) {
    console.warn('[NOTIF] Failed to configure Android channels:', error);
  }
};

// Function to safe-initialize notification handler
const setupHandler = () => {
  // Guard: Expo Go has strict limitations on native modules (SDK 53+)
  if (isExpoGo) {
    console.log("[NOTIF-SAFETNET] Skipping notification handler setup in Expo Go");
    return;
  }

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      }),
    });

    initNotificationChannels();
  } catch (error) {
    console.warn("Notifications: Failed to set handler (likely Expo Go limitation):", error);
  }
};

setupHandler();

export const notificationService = {
  initChannels: initNotificationChannels,

  isEnabled: async () => {
    try {
      return (await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)) !== 'false';
    } catch (error) {
      console.warn('[NOTIF-PREF-READ-FAIL]', error);
      return true;
    }
  },

  setEnabled: async (enabled: boolean) => {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  },

  /**
   * Request permissions from the user
   */
  requestPermissions: async () => {
    // Guard: Requesting push permissions in Expo Go (SDK 53+) is unsupported
    if (isExpoGo) {
      console.log("[NOTIF-SAFETNET] Skipping permission request in Expo Go");
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (error) {
      console.warn("Notifications: Permissions check failed:", error);
      return false;
    }
  },

  /**
   * Get the Expo push token
   */
  getPushToken: async () => {
    if (isExpoGo) return null;
    
    try {
      const granted = await notificationService.requestPermissions();
      if (!granted) return null;

      // Project ID is required for standalone apps (EAS) - ensure robust fallback
      const projectId = 
        Constants.expoConfig?.extra?.eas?.projectId || 
        Constants.easConfig?.projectId || 
        'ea2d0e56-8dca-4913-84e5-37322118c6be';
      
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId
      })).data;
      
      console.log("[NOTIF-TOKEN] Push token acquired successfully");
      return token;
    } catch (error) {
      console.error("[NOTIF-TOKEN-FAIL]", error);
      return null;
    }
  },

  /**
   * Schedule a local notification for an upcoming homework task
   * @param task The homework item
   * @param hoursBefore How many hours before the deadline to fire the alert (default 24)
   */
  scheduleHomeworkReminder: async (task: HomeworkItem, hoursBefore = 24) => {
    if (isExpoGo) return;
    try {
      const dueDate = new Date(task.dueDate);
      const triggerDate = new Date(dueDate.getTime() - hoursBefore * 60 * 60 * 1000);

      // If the trigger date is already in the past, don't schedule
      if (triggerDate < new Date()) return;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "📚 Homework Reminder",
          body: `Don't forget to submit your assignment: "${task.title}". It's due soon!`,
          data: { screen: 'Home', taskId: task.id },
          sound: STANDARD_SOUND,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, channelId: STANDARD_CHANNEL_ID },
      });

      console.log(`[DEBUG-NOTIF] Scheduled reminder for ${task.title} at ${triggerDate}`);
      return id;
    } catch (error) {
      // Fail silently or log warning - do not crash
      console.log(`[NOTIF-FAIL] Could not schedule homework reminder: ${error}`);
    }
  },

  /**
   * Schedule a local notification for an upcoming exam
   * @param exam The exam item
   */
  scheduleExamReminder: async (exam: Exam) => {
    if (isExpoGo) return;
    try {
      const examDate = new Date(exam.time);
      // Remind the morning of the exam (e.g., 7 AM)
      const triggerDate = new Date(examDate);
      triggerDate.setHours(7, 0, 0, 0);

      if (triggerDate < new Date()) return;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎯 Exam Alert!",
          body: `You have a ${exam.subject} exam today: "${exam.description}". Good luck!`,
          data: { screen: 'Home', examId: exam.id },
          sound: STANDARD_SOUND,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate, channelId: STANDARD_CHANNEL_ID },
      });

      return id;
    } catch (error) {
      console.log(`[NOTIF-FAIL] Could not schedule exam reminder: ${error}`);
    }
  },

  /**
   * Clear all scheduled notifications
   */
  cancelAll: async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.log("[NOTIF-FAIL] Could not cancel notifications");
    }
  },

  // ─── Test Methods ─────────────────────────────────────────────────────────────
  
  async testEmergencySiren() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚨 SIREN TEST: Emergency",
        body: "This is a test of the emergency alert sound.",
        sound: EMERGENCY_SOUND,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: EMERGENCY_CHANNEL_ID,
      },
    });
  },

  async testStandardNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📢 TEST: Standard Notification",
        body: "This is a test of the standard notification sound.",
        sound: STANDARD_SOUND,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: STANDARD_CHANNEL_ID,
      },
    });
  },

  /**
   * Listen for notification tap responses
   */
  addNotificationResponseReceivedListener: (handler: (response: Notifications.NotificationResponse) => void) => {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }
};
