/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Habit, HabitLog } from '../types';
import { isHabitScheduledForDate } from './habitSchedule';

/**
 * Gets a YYYY-MM-DD local date string from a Date object
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses YYYY-MM-DD to a local Date object start-of-day
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Calculates current streak, longest streak, and completion rate
 */
export function computeHabitMetrics(
  habit: Habit,
  logs: HabitLog[],
  todayStr: string
): {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  missedCount: number;
  totalScheduledCount: number;
} {
  // Filter active logs for this habit that are marked completed
  const completedLogs = logs.filter((l) => l.habitId === habit.id && l.completed);
  const completedDates = Array.from(new Set(completedLogs.map((l) => l.completedDate))).sort();

  if (completedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      missedCount: 0,
      totalScheduledCount: 0,
    };
  }

  // Set up date tracking
  const today = parseLocalDate(todayStr);
  const startOfHabit = parseLocalDate(habit.createdAt.split('T')[0]);

  // Determine all scheduled dates from creation to today
  const scheduledDates: string[] = [];
  const tempDate = new Date(startOfHabit);
  while (tempDate <= today) {
    const tempStr = formatDate(tempDate);
    const isScheduled = isHabitScheduledForDate(habit, tempDate);

    if (isScheduled) {
      scheduledDates.push(tempStr);
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Completion stats within scheduled dates
  const scheduledCompleted = completedDates.filter((d) => scheduledDates.includes(d));
  const totalScheduledCount = scheduledDates.length;
  const completionRate = totalScheduledCount > 0
    ? Math.round((scheduledCompleted.length / totalScheduledCount) * 100)
    : 0;

  // Missed days are scheduled days prior to today that were NOT completed
  const missedCount = scheduledDates.filter((d) => d !== todayStr && !completedDates.includes(d)).length;

  // Streak calculations — only evaluates scheduled days so non-scheduled days (e.g.
  // weekends for a weekday habit) never break a streak.
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const completedSet = new Set(completedDates);

  for (const dStr of scheduledDates) {
    if (completedSet.has(dStr)) {
      tempStreak += 1;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      if (dStr !== todayStr) {
        tempStreak = 0;
      }
    }
  }

  // Current streak walks backwards through scheduled dates only.
  // Non-scheduled days never break the streak — they are simply skipped.
  currentStreak = 0;
  for (let i = scheduledDates.length - 1; i >= 0; i--) {
    const dStr = scheduledDates[i];
    if (completedSet.has(dStr)) {
      currentStreak++;
    } else if (dStr !== todayStr) {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    completionRate,
    missedCount,
    totalScheduledCount,
  };
}

/**
 * Calculates a global Consistency Score (0-100) based on all habits
 */
export function calculateConsistencyScore(habits: Habit[], logs: HabitLog[], todayStr: string): number {
  if (habits.length === 0) return 0;

  let totalScheduled = 0;
  let totalCompleted = 0;

  habits.forEach((habit) => {
    const metrics = computeHabitMetrics(habit, logs, todayStr);
    totalScheduled += metrics.totalScheduledCount;
    // Count completed logs for this habit
    const completedForHabit = logs.filter((l) => l.habitId === habit.id && l.completed).length;
    totalCompleted += completedForHabit;
  });

  if (totalScheduled === 0) return 0;
  return Math.min(100, Math.round((totalCompleted / totalScheduled) * 100));
}

/**
 * Generates array of date strings for the last N days (including today)
 */
export function getPastDates(daysCount: number, todayStr: string): string[] {
  const dates: string[] = [];
  const baseDate = parseLocalDate(todayStr);
  for (let i = daysCount - 1; i >= 0; i--) {
    const temp = new Date(baseDate);
    temp.setDate(temp.getDate() - i);
    dates.push(formatDate(temp));
  }
  return dates;
}

/**
 * Converts weekday number to letter (0=S, 1=M, etc.)
 */
export const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEKDAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  Mind: {
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-900/45',
    accent: 'bg-indigo-500',
  },
  Body: {
    bg: 'bg-teal-50/70 dark:bg-teal-950/20',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-100 dark:border-teal-900/45',
    accent: 'bg-teal-500',
  },
  Spirit: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900/45',
    accent: 'bg-emerald-500',
  },
  Focus: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900/45',
    accent: 'bg-amber-500',
  },
  Routine: {
    bg: 'bg-sky-50/70 dark:bg-sky-950/20',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-100 dark:border-sky-900/45',
    accent: 'bg-sky-500',
  },
};
