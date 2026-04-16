import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HomeworkItem, Exam } from '../types';

// Configure how notifications should be handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationService = {
  /**
   * Request permissions from the user
   */
  requestPermissions: async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  },

  /**
   * Schedule a local notification for an upcoming homework task
   * @param task The homework item
   * @param hoursBefore How many hours before the deadline to fire the alert (default 24)
   */
  scheduleHomeworkReminder: async (task: HomeworkItem, hoursBefore = 24) => {
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
        trigger: triggerDate,
      });

      console.log(`[DEBUG-NOTIF] Scheduled reminder for ${task.title} at ${triggerDate}`);
      return id;
    } catch (error) {
      console.error("Failed to schedule homework reminder:", error);
    }
  },

  /**
   * Schedule a local notification for an upcoming exam
   * @param exam The exam item
   */
  scheduleExamReminder: async (exam: Exam) => {
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
        trigger: triggerDate,
      });

      return id;
    } catch (error) {
      console.error("Failed to schedule exam reminder:", error);
    }
  },

  /**
   * Clear all scheduled notifications
   */
  cancelAll: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
