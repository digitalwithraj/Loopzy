/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CustomDay, Habit, HabitCategory, HabitFrequency } from '../types';
import { CUSTOM_DAY_OPTIONS, customDaysToFrequencyDays, frequencyDaysToCustomDays } from '../utils/habitSchedule';
import { X, Check, Trash2, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import TimePicker from './TimePicker';

interface HabitFormProps {
  habit?: Habit | null;
  prefillData?: { name: string; category?: HabitCategory } | null;
  onSave: (habitData: {
    name: string;
    description: string;
    category: HabitCategory;
    frequency: HabitFrequency;
    frequencyDays: number[];
    customDays: CustomDay[];
    reminderTime: string;
  }) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const FREQUENCY_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: 'daily',    label: 'Daily'    },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'custom',   label: 'Custom'   },
];

const SCHEDULE_DAYS: Array<{ key: CustomDay; label: string; index: number }> = [
  { key: 'monday', label: 'Mon', index: 1 },
  { key: 'tuesday', label: 'Tue', index: 2 },
  { key: 'wednesday', label: 'Wed', index: 3 },
  { key: 'thursday', label: 'Thu', index: 4 },
  { key: 'friday', label: 'Fri', index: 5 },
  { key: 'saturday', label: 'Sat', index: 6 },
  { key: 'sunday', label: 'Sun', index: 0 },
];

const FREQUENCY_INFO: Record<HabitFrequency, { title: string; description: string; activeIndexes: number[] }> = {
  daily: {
    title: 'Daily Loop',
    description: 'This loop will appear every day.',
    activeIndexes: [0, 1, 2, 3, 4, 5, 6],
  },
  weekdays: {
    title: 'Weekday Loop',
    description: 'This loop will only appear Monday through Friday.',
    activeIndexes: [1, 2, 3, 4, 5],
  },
  weekends: {
    title: 'Weekend Loop',
    description: 'This loop will only appear on Saturday and Sunday.',
    activeIndexes: [0, 6],
  },
  custom: {
    title: 'Custom Schedule',
    description: 'Choose exactly which days this loop should appear.',
    activeIndexes: [],
  },
};

export default function HabitForm({ habit, prefillData, onSave, onDelete, onClose }: HabitFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HabitCategory>('Mind');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [frequencyDays, setFrequencyDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [customDays, setCustomDays] = useState<CustomDay[]>([]);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isCustomInvalid = frequency === 'custom' && customDays.length === 0;

  const selectedScheduleIndexes = useMemo(
    () => (frequency === 'custom' ? customDaysToFrequencyDays(customDays) : FREQUENCY_INFO[frequency].activeIndexes),
    [customDays, frequency]
  );

  useEffect(() => {
    setSubmitMessage(null);
    setIsSubmitting(false);

    if (habit) {
      setName(habit.name);
      setDescription(habit.description);
      setCategory(habit.category);
      setFrequency(habit.frequency);
      setFrequencyDays(habit.frequencyDays);
      setCustomDays(habit.customDays?.length ? habit.customDays : frequencyDaysToCustomDays(habit.frequencyDays));
      setReminderTime(habit.reminderTime);
      setIsDescriptionExpanded(!!habit.description);
    } else if (prefillData) {
      setName(prefillData.name);
      setDescription('');
      setCategory(prefillData.category ?? 'Mind');
      setFrequency('daily');
      setFrequencyDays([0, 1, 2, 3, 4, 5, 6]);
      setCustomDays([]);
      setReminderTime('08:00');
      setIsDescriptionExpanded(false);
    } else {
      setName('');
      setDescription('');
      setCategory('Mind');
      setFrequency('daily');
      setFrequencyDays([0, 1, 2, 3, 4, 5, 6]);
      setCustomDays([]);
      setReminderTime('08:00');
      setIsDescriptionExpanded(false);
    }
  }, [habit, prefillData]);

  const handleDayToggle = (day: CustomDay) => {
    setCustomDays((prev) =>
      prev.includes(day)
        ? prev.filter((selectedDay) => selectedDay !== day)
        : CUSTOM_DAY_OPTIONS.map((option) => option.value).filter((optionDay) => [...prev, day].includes(optionDay))
    );
  };

  const handleFrequencySelect = (val: HabitFrequency) => {
    setFrequency(val);
    setSubmitMessage(null);

    if (val === 'daily') {
      setFrequencyDays([0, 1, 2, 3, 4, 5, 6]);
      setCustomDays([]);
    } else if (val === 'weekdays') {
      setFrequencyDays([1, 2, 3, 4, 5]);
      setCustomDays([]);
    } else if (val === 'weekends') {
      setFrequencyDays([0, 6]);
      setCustomDays([]);
    } else {
      setFrequencyDays(customDaysToFrequencyDays(customDays));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('STEP 1 - Submit clicked');

    if (!name.trim()) {
      console.log('STEP 1A - Validation failed: empty habit name');
      setSubmitMessage({ type: 'error', text: 'Loop name is required.' });
      return;
    }

    if (isCustomInvalid) {
      setSubmitMessage({ type: 'error', text: 'Select at least one day.' });
      return;
    }

    if (isSubmitting) {
      console.log('STEP 1B - Submit ignored: already saving');
      return;
    }

    console.log('STEP 2 - Validation passed');

    const payload = {
      name: name.trim(),
      description: description.trim(),
      category,
      frequency,
      frequencyDays: frequency === 'custom' ? customDaysToFrequencyDays(customDays) : frequencyDays,
      customDays: frequency === 'custom' ? customDays : [],
      reminderTime,
    };
    console.log('STEP 2A - Form payload built');
    console.log(payload);

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      console.log('STEP 2B - Calling onSave');
      const result = await onSave(payload);
      console.log('STEP 8 - onSave returned');
      console.log(result);

      if (result.success) {
        setSubmitMessage({ type: 'success', text: habit ? 'Loop updated.' : 'Loop created.' });
        return;
      }

      setSubmitMessage({ type: 'error', text: result.error || 'Unable to save this loop. Please try again.' });
    } catch (error: any) {
      console.log('STEP 8A - onSave threw');
      console.log(error);
      setSubmitMessage({ type: 'error', text: error?.message || 'Unable to save this loop. Please try again.' });
    } finally {
      console.log('STEP 9 - Clearing saving state');
      setIsSubmitting(false);
    }
  };

  const handleTimeSave = (time: string) => {
    setReminderTime(time);
    setShowTimePicker(false);
    console.log('Reminder Time:', time);
  };

  const formatReminderTime = (time: string): string => {
    if (!time) return '8:00 AM';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-[400px] relative z-10 overflow-hidden"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2 pb-0.5 md:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-3 pt-[2px] max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer text-gray-400"
              id="close-habit-modal-btn"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-gray-800">
              {habit ? 'Edit Loop' : 'New Loop'}
            </h3>
            <div className="w-7" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-[5px]">

            {/* ── LOOP NAME ──────────────────────────────────────────── */}
            <div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What loop do you want to build?"
                maxLength={80}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 h-11 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-200 placeholder:text-gray-300"
                id="habit-name-input"
              />
            </div>

            {/* ── DESCRIPTION ───────────────────────────────────────── */}
            {!isDescriptionExpanded ? (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded(true)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition cursor-pointer text-left w-full"
              >
                + Add Description (Optional)
              </button>
            ) : (
              <div>
                <textarea
                  autoFocus
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., Use warm water, read physical book only."
                  maxLength={200}
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 h-[70px] text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none placeholder:text-gray-300 py-2"
                  id="habit-description-input"
                />
              </div>
            )}

            {/* ── FREQUENCY (segmented control) ─────────────────────── */}
            <div className="flex bg-gray-100 rounded-xl p-0.5" role="radiogroup" aria-label="Frequency">
              {FREQUENCY_OPTIONS.map(({ value, label }, i) => {
                const active = frequency === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleFrequencySelect(value)}
                    role="radio"
                    aria-checked={active}
                    className={`flex-1 py-[7px] text-[11px] font-semibold transition cursor-pointer ${
                      i === 0 ? 'rounded-l-xl' : i === FREQUENCY_OPTIONS.length - 1 ? 'rounded-r-xl' : ''
                    } ${
                      active
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    id={`frequency-segment-${value}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* ── SCHEDULE SUMMARY ──────────────────────────────────── */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2">
              <span className="text-[11px] font-semibold text-gray-500 shrink-0">Repeats:</span>
              <span className="text-[11px] font-bold text-gray-800">
                {frequency === 'daily' ? 'Every Day'
                  : frequency === 'weekdays' ? 'Weekdays (Mon\u2013Fri)'
                  : frequency === 'weekends' ? 'Weekends (Sat\u2013Sun)'
                  : 'Selected Days'}
              </span>
              <div className="flex items-center gap-[3px] ml-auto">
                {frequency === 'custom' ? (
                  SCHEDULE_DAYS.map(({ key, label }) => {
                    const isSelected = customDays.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDayToggle(key)}
                        aria-pressed={isSelected}
                        title={label}
                        className={`h-5 min-w-[26px] rounded text-[8px] font-bold transition cursor-pointer flex items-center justify-center px-[3px] ${
                          isSelected
                            ? 'bg-brand-600 text-white'
                            : 'bg-white text-gray-400 border border-gray-200 hover:border-brand-200'
                        }`}
                        id={`weekday-toggle-${key}`}
                      >
                        {isSelected && <Check className="h-[7px] w-[7px] stroke-[4] shrink-0" />}
                        <span>{label}</span>
                      </button>
                    );
                  })
                ) : (
                  SCHEDULE_DAYS.map(({ label, index }) => {
                    const isActive = selectedScheduleIndexes.includes(index);
                    return (
                      <div
                        key={label}
                        className={`h-5 min-w-[26px] flex items-center justify-center rounded text-[8px] font-bold px-[3px] ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'text-gray-300'
                        }`}
                      >
                        {isActive && <Check className="h-[7px] w-[7px] stroke-[4] shrink-0 mr-[1px]" />}
                        <span>{label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {frequency === 'custom' && isCustomInvalid && (
              <p className="text-[10px] font-semibold text-red-500" id="custom-days-validation">
                Select at least one day for your custom schedule.
              </p>
            )}

            {/* ── REMINDER ──────────────────────────────────────────── */}
            <div
              className="bg-gray-50 border border-gray-100 rounded-xl cursor-pointer"
              onClick={() => setShowTimePicker(true)}
            >
              <div className="flex items-center gap-2 px-3.5 py-2">
                <Bell className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-[11px] font-semibold text-gray-500">Reminder</span>
                <span className="text-[11px] font-bold text-gray-800 ml-auto">{formatReminderTime(reminderTime)}</span>
              </div>
            </div>

            {/* ── FOOTER ACTIONS ────────────────────────────────────── */}
            <div className={`flex items-center ${habit && onDelete ? 'gap-2' : ''}`}>
              {habit && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(habit.id)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 font-semibold px-2 py-2 rounded-xl hover:bg-red-50 transition cursor-pointer"
                  id="delete-habit-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isCustomInvalid}
                className={`${habit && onDelete ? 'flex-1' : 'w-full'} bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed text-white font-bold h-11 rounded-xl text-sm shadow-sm shadow-brand-100 transition cursor-pointer flex items-center justify-center gap-2`}
                id="save-habit-submit"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {isSubmitting ? 'Saving...' : habit ? 'Save Changes' : 'Start Loop'}
              </button>
            </div>

            {submitMessage && (
              <div
                role="status"
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                   submitMessage.type === 'success'
                     ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                     : 'border-red-200 bg-red-50 text-red-600'
                 }`}
                id="habit-save-feedback"
              >
                {submitMessage.text}
              </div>
            )}

          </form>
        </div>
      </motion.div>

      {showTimePicker && (
        <TimePicker
          initialTime={reminderTime}
          onSave={handleTimeSave}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </div>
  );
}
