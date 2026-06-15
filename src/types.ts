/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // Avatar name or color index
  timezone: string;
  onboardingCompleted: boolean;
  isPremium: boolean;
  createdAt: string;
}

export type HabitCategory = 'Mind' | 'Body' | 'Spirit' | 'Focus' | 'Routine';

export type HabitFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom';
export type CustomDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type HabitStatus = 'active' | 'paused' | 'archived';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  frequencyDays: number[]; // 0 for Sun, 1 for Mon, etc.
  customDays: CustomDay[];
  reminderTime: string; // "HH:MM"
  isArchived: boolean;
  status: HabitStatus;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  userId: string;
  habitId: string;
  completedDate: string; // YYYY-MM-DD
  completed: boolean;
  note?: string; // Optional journal entry/note
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  habitId?: string;
  type: 'daily' | 'habit';
  time: string; // "HH:MM"
  days: number[]; // days active
  active: boolean;
  title: string;
}

export interface UserGoal {
  id: string;
  title: string;
  description: string;
  selected: boolean;
}

export interface ExportReportData {
  habitId: string;
  habitName: string;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  missedCount: number;
  logs: {
    completedDate: string;
    completed: boolean;
    note?: string;
  }[];
}
