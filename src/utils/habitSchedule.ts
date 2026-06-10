/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomDay, Habit } from '../types';

export const CUSTOM_DAY_OPTIONS: Array<{ value: CustomDay; label: string; shortLabel: string; dayIndex: number }> = [
  { value: 'monday', label: 'Monday', shortLabel: 'M', dayIndex: 1 },
  { value: 'tuesday', label: 'Tuesday', shortLabel: 'T', dayIndex: 2 },
  { value: 'wednesday', label: 'Wednesday', shortLabel: 'W', dayIndex: 3 },
  { value: 'thursday', label: 'Thursday', shortLabel: 'T', dayIndex: 4 },
  { value: 'friday', label: 'Friday', shortLabel: 'F', dayIndex: 5 },
  { value: 'saturday', label: 'Saturday', shortLabel: 'S', dayIndex: 6 },
  { value: 'sunday', label: 'Sunday', shortLabel: 'S', dayIndex: 0 },
];

const DAY_INDEX_TO_CUSTOM_DAY: Record<number, CustomDay> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const CUSTOM_DAY_TO_INDEX = CUSTOM_DAY_OPTIONS.reduce<Record<CustomDay, number>>((acc, day) => {
  acc[day.value] = day.dayIndex;
  return acc;
}, {} as Record<CustomDay, number>);

export function dayIndexToCustomDay(dayIndex: number): CustomDay {
  return DAY_INDEX_TO_CUSTOM_DAY[dayIndex] ?? 'sunday';
}

export function customDaysToFrequencyDays(customDays: CustomDay[]): number[] {
  return customDays
    .map((day) => CUSTOM_DAY_TO_INDEX[day])
    .filter((dayIndex) => typeof dayIndex === 'number')
    .sort((a, b) => a - b);
}

export function frequencyDaysToCustomDays(frequencyDays: number[]): CustomDay[] {
  return frequencyDays
    .filter((dayIndex) => dayIndex >= 0 && dayIndex <= 6)
    .map(dayIndexToCustomDay)
    .filter((day, index, days) => days.indexOf(day) === index);
}

export function scheduledDayIndexesForHabit(habit: Pick<Habit, 'frequency' | 'frequencyDays' | 'customDays'>): number[] {
  switch (habit.frequency) {
    case 'daily':
      return [0, 1, 2, 3, 4, 5, 6];
    case 'weekdays':
      return [1, 2, 3, 4, 5];
    case 'weekends':
      return [0, 6];
    case 'custom':
      return customDaysToFrequencyDays(
        habit.customDays?.length ? habit.customDays : frequencyDaysToCustomDays(habit.frequencyDays ?? [])
      );
    default:
      return habit.frequencyDays ?? [];
  }
}

export function isLoopScheduledForToday(habit: Pick<Habit, 'frequency' | 'frequencyDays' | 'customDays'>): boolean {
  return isHabitScheduledForDate(habit, new Date());
}

export function isLoopScheduledForDay(
  loop: Pick<Habit, 'frequency' | 'frequencyDays' | 'customDays'>,
  date: Date
): boolean {
  return isHabitScheduledForDate(loop, date);
}

export function isHabitScheduledForDate(
  habit: Pick<Habit, 'frequency' | 'frequencyDays' | 'customDays'>,
  date: Date
): boolean {
  const dayIndex = date.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  console.log(
    `[Loopzy Schedule] Checking "${(habit as any).name || 'unnamed'}" — ` +
    `date=${date.toISOString().split('T')[0]} localDay=${dayNames[dayIndex]}(${dayIndex}) ` +
    `frequency="${habit.frequency}" customDays=[${(habit.customDays ?? []).join(',')}] ` +
    `frequencyDays=[${(habit.frequencyDays ?? []).join(',')}]`
  );

  switch (habit.frequency) {
    case 'daily': {
      const result = true;
      console.log(`[Loopzy Schedule] => daily: ${result}`);
      return result;
    }
    case 'weekdays': {
      const result = dayIndex >= 1 && dayIndex <= 5;
      console.log(`[Loopzy Schedule] => weekdays (Mon-Fri): dayIndex=${dayIndex} => ${result}`);
      return result;
    }
    case 'weekends': {
      const result = dayIndex === 0 || dayIndex === 6;
      console.log(`[Loopzy Schedule] => weekends (Sat-Sun): dayIndex=${dayIndex} => ${result}`);
      return result;
    }
    case 'custom': {
      const today = dayIndexToCustomDay(dayIndex);
      const result = habit.customDays?.length
        ? habit.customDays.includes(today)
        : (habit.frequencyDays ?? []).includes(dayIndex);
      console.log(`[Loopzy Schedule] => custom: today=${today} dayIndex=${dayIndex} => ${result}`);
      return result;
    }
    default: {
      console.log(`[Loopzy Schedule] => unknown frequency "${habit.frequency}", defaulting to false`);
      return false;
    }
  }
}
