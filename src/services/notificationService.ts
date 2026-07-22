import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { HomeworkItem, Exam } from '../types';

// Detect if we are in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

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
      }),
    });

    // Configure Android Channels
    if (Platform.OS === 'android') {
      // 1. Standard Channel
      Notifications.setNotificationChannelAsync('default', {
        name: 'SnapSchool Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'notification.m4a',
      });

      // 2. Emergency/Important Channel
      Notifications.setNotificationChannelAsync('emergency', {
        name: 'SnapSchool Emergency',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#ff0000',
        sound: 'alert.m4a',
      });
    }
  } catch (error) {
    console.warn("Notifications: Failed to set handler (likely Expo Go limitation):", error);
  }
};

setupHandler();

export const notificationService = {
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
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return null;

      // Project ID is required for standalone apps (EAS)
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId
      })).data;
      
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
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
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
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
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
        body: "This is a test of the emergency siren sound.",
        sound: 'alert.m4a',
      },
      trigger: null,
    });
  },

  async testStandardNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📢 TEST: Standard Notification",
        body: "This is a test of the standard notification sound.",
        sound: 'notification.m4a',
      },
      trigger: null,
    });
  },

  /**
   * Listen for notification tap responses
   */
  addNotificationResponseReceivedListener: (handler: (response: Notifications.NotificationResponse) => void) => {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }
};
