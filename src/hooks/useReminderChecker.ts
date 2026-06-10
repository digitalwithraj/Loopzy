import { useEffect } from 'react';
import { Habit } from '../types';
import { isHabitScheduledForDate } from '../utils/habitSchedule';

const CHECK_INTERVAL_MS = 60000;
const NOTIF_PREFIX = 'loopzy_last_notified_';

function getCurrentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function useReminderChecker(
  habits: Habit[],
  user: unknown,
  enabled: boolean
) {
  useEffect(() => {
    if (!user || !enabled) return;
    if (Notification.permission !== 'granted') return;

    const checkReminders = () => {
      const currentHHMM = getCurrentHHMM();
      const today = getTodayDate();

      for (const habit of habits) {
        if (habit.isArchived) continue;
        if (habit.reminderTime !== currentHHMM) continue;
        if (!isHabitScheduledForDate(habit, new Date())) continue;

        const key = `${NOTIF_PREFIX}${habit.id}`;
        if (localStorage.getItem(key) === today) continue;

        new Notification('🔔 Time for your Loop', {
          body: habit.name,
        });

        localStorage.setItem(key, today);
      }
    };

    const interval = setInterval(checkReminders, CHECK_INTERVAL_MS);
    checkReminders();

    return () => clearInterval(interval);
  }, [habits, user, enabled]);
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[Reminder] Notifications not supported');
    return Promise.resolve('denied');
  }
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  return Notification.requestPermission();
}
