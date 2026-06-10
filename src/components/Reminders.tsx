/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Habit, Reminder } from '../types';
import { Bell, BellOff, Hourglass, Plus, Check, Trash2, Mail, PlayCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface RemindersProps {
  habits: Habit[];
  reminders: Reminder[];
  onSaveReminder: (reminder: Reminder) => void;
  onToggleReminder: (id: string, active: boolean) => void;
  onDeleteReminder: (id: string) => void;
  onTriggerMockPush: (title: string, body: string) => void;
}

export default function Reminders({
  habits,
  reminders,
  onSaveReminder,
  onToggleReminder,
  onDeleteReminder,
  onTriggerMockPush,
}: RemindersProps) {
  const [newType, setNewType] = useState<'daily' | 'habit'>('daily');
  const [newHabitId, setNewHabitId] = useState<string>('');
  const [newTime, setNewTime] = useState('08:00');
  const [newTitle, setNewTitle] = useState('Morning Check-In Reflection');
  const [emailAlertsOnly, setEmailAlertsOnly] = useState(false);

  const activeHabits = habits.filter((h) => !h.isArchived);

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();

    let finalTitle = newTitle.trim();
    if (newType === 'habit') {
      const parent = habits.find((h) => h.id === newHabitId);
      finalTitle = parent ? `Time to nurture: ${parent.name}` : 'Loop Call';
    }

    const r: Reminder = {
      id: `r-${Date.now()}`,
      userId: 'local-user',
      habitId: newType === 'habit' ? newHabitId : undefined,
      type: newType,
      time: newTime,
      days: [0, 1, 2, 3, 4, 5, 6],
      active: true,
      title: finalTitle || 'Intention check-in',
    };

    onSaveReminder(r);
    setNewTitle('');
    setNewHabitId('');
  };

  const handleSimulate = (rem: Reminder) => {
    let body = "Take a peaceful moment to record your completion progress today.";
    if (rem.type === 'habit') {
      const h = habits.find((hab) => hab.id === rem.habitId);
      body = h ? `Gentle progress check for: "${h.name}". Consistency builds calming bonds.` : body;
    }
    onTriggerMockPush(rem.title, body);
  };

  return (
    <div className="space-y-6 select-none">
      
      {/* EXPLANATORY SUPPORT TITLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs text-left relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-100/30 rounded-full blur-2xl pointer-events-none" />
        <Bell className="w-6 h-6 text-indigo-600 mb-2" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-sans">Watering Your Loops</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Loopzy reminders function as a watering can for consistency. We deliver general daily roundups at key morning/evening milestones or focused habit specific check-in times.
        </p>

        {/* EMAIL DIGEST TOGGLE REQUIREMENT */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl mt-4 text-[11px]">
          <div className="flex items-center gap-2 text-slate-705 dark:text-slate-300">
            <Mail className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="font-bold">Emailed Daily Intention Digests</p>
              <p className="text-[9px] text-slate-400">Receive an encouraging brief list of scheduled loops at 08:30 AM.</p>
            </div>
          </div>
          <button
            onClick={() => setEmailAlertsOnly(!emailAlertsOnly)}
            className={`px-3 py-1 bg-white dark:bg-slate-700 font-bold border rounded-lg transition text-[10px] cursor-pointer ${
              emailAlertsOnly
                ? 'border-indigo-400 text-indigo-650'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-5'
            }`}
            id="email-alerts-toggle-btn"
          >
            {emailAlertsOnly ? 'Active Email Alerts' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE REMINDERS */}
      <div className="space-y-3 text-left">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest pl-1">Scheduled Alarms</h4>

        {reminders.length === 0 ? (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl text-center py-10 space-y-2">
            <BellOff className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-450">Quiet waters...</p>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">You have no active alarms configured. Setup a general routine review alert below.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {reminders.map((rem) => (
              <div
                key={rem.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-xs flex items-center justify-between"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0 pr-3">
                  <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    rem.active
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="font-bold text-xs text-slate-850 dark:text-slate-150 truncate max-w-[200px]">{rem.title}</h5>
                      <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 py-0.5 px-1.5 rounded-md font-bold text-[8px] uppercase">
                        {rem.type === 'daily' ? 'system' : 'loop'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-[11px] bg-slate-50 dark:bg-slate-800/50 py-0.5 px-1.5 rounded">
                        🕒 {rem.time}
                      </span>
                      <span>• All Days</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* SIMULATE TRIGGER BUTTON */}
                  <button
                    onClick={() => handleSimulate(rem)}
                    title="Simulate push alert on screen"
                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition cursor-pointer"
                    id={`simulate-alert-${rem.id}`}
                  >
                    <PlayCircle className="w-5 h-5" />
                  </button>

                  {/* ACTIVE TOGGLE */}
                  <button
                    onClick={() => onToggleReminder(rem.id, !rem.active)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      rem.active ? 'bg-indigo-650' : 'bg-slate-250 dark:bg-slate-700'
                    }`}
                    id={`toggle-reminder-${rem.id}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-xs transition-transform ${
                      rem.active ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>

                  {/* DELETE ALERT */}
                  <button
                    onClick={() => onDeleteReminder(rem.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition cursor-pointer"
                    id={`delete-reminder-${rem.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE NEW REMINDER BOX */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs text-left">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3">Setup a reminder watering can</h4>

        <form onSubmit={handleCreateReminder} className="space-y-3.5">
          {/* TYPE */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setNewType('daily')}
              className={`text-center py-2 text-[11px] font-semibold rounded-lg capitalize transition cursor-pointer ${
                newType === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-150 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              id="new-reminder-type-daily"
            >
              General Review
            </button>
            <button
              type="button"
              onClick={() => setNewType('habit')}
              className={`text-center py-2 text-[11px] font-semibold rounded-lg capitalize transition cursor-pointer ${
                newType === 'habit'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-150 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              id="new-reminder-type-habit"
            >
              Specific Loop
            </button>
          </div>

          {/* DYNAMIC FIELD */}
          {newType === 'daily' ? (
            <div className="space-y-1 bg-slate-5/50 dark:bg-slate-800/10 p-2.5 rounded-2xl">
              <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Reminder Title Message</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="E.g., Morning Checklist Intentions"
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none p-0 cursor-text"
                id="new-reminder-title-input"
              />
            </div>
          ) : (
            <div className="space-y-1 bg-slate-5/50 dark:bg-slate-800/10 p-2.5 rounded-2xl">
              <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Select Target Loop</label>
              {activeHabits.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No loops available yet. Create a loop first.</p>
              ) : (
                <select
                  required
                  value={newHabitId}
                  onChange={(e) => setNewHabitId(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none outline-none focus:ring-0 p-0 cursor-pointer"
                  id="new-reminder-habit-select"
                >
                  <option value="" className="dark:bg-slate-800">-- Choose Loop --</option>
                  {activeHabits.map((h) => (
                    <option key={h.id} value={h.id} className="dark:bg-slate-800">
                      {h.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* TIME CONTAINER */}
          <div className="space-y-1 bg-slate-5/50 dark:bg-slate-800/10 p-2.5 rounded-2xl">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Trigger time</label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full bg-transparent border-none text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none outline-none focus:ring-0 p-0 cursor-pointer"
              id="new-reminder-time-input"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-650 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-100 dark:shadow-none transition flex items-center justify-center gap-1 cursor-pointer"
            id="add-reminder-btn"
          >
            <Plus className="w-4 h-4" /> Schedule Reminder Alert
          </button>
        </form>
      </div>

    </div>
  );
}
