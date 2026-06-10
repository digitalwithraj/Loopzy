/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Habit, HabitCategory, HabitLog } from '../types';
import {
  computeHabitMetrics,
  formatDate,
  parseLocalDate,
  WEEKDAYS_SHORT,
} from '../utils/streak';
import { isHabitScheduledForDate } from '../utils/habitSchedule';
import {
  ArchiveRestore,
  BarChart3,
  BookOpen,
  Check,
  CheckCheck,
  Clock3,
  Crosshair,
  Edit2,
  Flame,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface DashboardProps {
  username: string;
  isPremium: boolean;
  habits: Habit[];
  logs: HabitLog[];
  todayStr: string;
  initialTab?: 'today' | 'profile';
  onLogout: () => void;
  onCreateHabit: () => void;
  onCreateHabitWithName?: (name: string, category?: HabitCategory) => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onToggleCheckIn: (habitId: string, completedDate: string, completed: boolean, note?: string) => void;
  onUpgradeToPremium: () => void;
  onNavigateToInsights: () => void;
}

const CATEGORY_META: Record<HabitCategory, { icon: React.ElementType; accent: string; label: string }> = {
  Mind: { icon: BookOpen, accent: 'from-indigo-500 to-sky-400', label: 'Mind' },
  Body: { icon: Zap, accent: 'from-emerald-400 to-teal-300', label: 'Body' },
  Spirit: { icon: Sparkles, accent: 'from-violet-400 to-fuchsia-400', label: 'Spirit' },
  Focus: { icon: Target, accent: 'from-amber-400 to-orange-400', label: 'Focus' },
  Routine: { icon: ArchiveRestore, accent: 'from-cyan-400 to-blue-500', label: 'Routine' },
};

const DAILY_MESSAGES = [
  'Your highest leverage move today is one small win before distractions get loud.',
  'Momentum is already available. Finish the next loop, then let the streak carry you.',
  'Aim for clean reps today. The score follows the ritual.',
  'Protect the first loop. It makes every next loop easier.',
  'Today does not need heroics. It needs one deliberate check-in.',
];

const HABIT_IDEAS: { category: HabitCategory; habits: string[] }[] = [
  { category: 'Body', habits: ['Morning Stretch', 'Drink Water', 'Walk 15 Minutes', 'Evening Yoga'] },
  { category: 'Mind', habits: ['Read 10 Pages', 'Learn a New Word', 'Daily Puzzle', 'Listen to a Podcast'] },
  { category: 'Spirit', habits: ['Meditation', 'Gratitude Journal', 'Deep Breathing', 'Digital Sunset'] },
  { category: 'Focus', habits: ['Pomodoro Session', 'Plan Tomorrow', 'Review Goals', 'Single Tasking'] },
  { category: 'Routine', habits: ['Make Your Bed', 'Tidy Up', 'Evening Wind Down', 'Prep in Advance'] },
];

function getGreeting() {
  const hour = new Date().getHours();
  console.log(`[Loopzy Dashboard] Local hour used for greeting: ${hour}`);
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 20) return 'Good Evening';
  return 'Good Night';
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2.5">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className={`h-3.5 w-3.5 ${tone}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

function LinearProgress({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-white/10 ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-400 shadow-[0_0_22px_rgba(99,102,241,0.55)]"
      />
    </div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full bg-slate-950/60">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeLinecap="round"
          strokeWidth="10"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#22C55E" />
            <stop offset="0.55" stopColor="#6366F1" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-black text-white tabular-nums">{value}%</p>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Today</p>
      </div>
    </div>
  );
}

function PremiumCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, borderColor: 'rgba(255,255,255,0.14)' }}
      transition={{ duration: 0.25 }}
      className={`rounded-3xl border border-white/8 bg-[#0F172A]/88 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl ${className}`}
    >
      {children}
    </motion.section>
  );
}

export default function Dashboard({
  username,
  isPremium,
  habits,
  logs,
  todayStr,
  initialTab = 'today',
  onLogout,
  onCreateHabit,
  onCreateHabitWithName,
  onEditHabit,
  onDeleteHabit,
  onToggleCheckIn,
  onUpgradeToPremium,
  onNavigateToInsights,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'profile'>(initialTab);
  const [focusMode, setFocusMode] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);
  const [showExploreHabits, setShowExploreHabits] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const activeHabits = useMemo(() => habits.filter((habit) => !habit.isArchived), [habits]);

  const todayScheduledHabits = useMemo(
    () =>
      activeHabits.filter((habit) => isHabitScheduledForDate(habit, parseLocalDate(todayStr))),
    [activeHabits, todayStr]
  );

  const completedLogIds = useMemo(
    () => new Set(logs.filter((log) => log.completedDate === todayStr && log.completed).map((log) => log.habitId)),
    [logs, todayStr]
  );

  const completedCount = todayScheduledHabits.filter((habit) => completedLogIds.has(habit.id)).length;
  const remainingCount = Math.max(todayScheduledHabits.length - completedCount, 0);
  const todayProgressPercent = todayScheduledHabits.length
    ? Math.round((completedCount / todayScheduledHabits.length) * 100)
    : 0;
  const bestStreak = activeHabits.length
    ? Math.max(...activeHabits.map((habit) => computeHabitMetrics(habit, logs, todayStr).currentStreak))
    : 0;
  const dailyMessage = DAILY_MESSAGES[parseLocalDate(todayStr).getDate() % DAILY_MESSAGES.length];

  const displayHabits = useMemo(
    () =>
      focusMode
        ? todayScheduledHabits.filter((h) => !completedLogIds.has(h.id))
        : todayScheduledHabits,
    [focusMode, todayScheduledHabits, completedLogIds]
  );

  const weeklyStats = useMemo(() => {
    const today = parseLocalDate(todayStr);
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(monday.getDate() - daysSinceMonday);

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      dates.push(formatDate(d));
    }

    return dates.map((date) => {
      const dateObj = parseLocalDate(date);
      const scheduled = activeHabits.filter((habit) => isHabitScheduledForDate(habit, dateObj));
      const completed = scheduled.filter((habit) =>
        logs.some((log) => log.habitId === habit.id && log.completedDate === date && log.completed)
      ).length;
      return {
        date,
        day: WEEKDAYS_SHORT[dateObj.getDay()],
        total: scheduled.length,
        completed,
        percent: scheduled.length ? Math.round((completed / scheduled.length) * 100) : 0,
      };
    });
  }, [activeHabits, logs, todayStr]);

  const bestDay = weeklyStats.reduce((best, day) => (day.percent > best.percent ? day : best), weeklyStats[0]);
  const getTodayHabitNote = (habitId: string) =>
    logs.find((log) => log.habitId === habitId && log.completedDate === todayStr)?.note || '';

  const handleCompleteAll = () => {
    const incomplete = displayHabits.filter((h) => !completedLogIds.has(h.id));
    incomplete.forEach((habit) => {
      onToggleCheckIn(habit.id, todayStr, true);
    });
  };

  const closeDeleteModal = () => {
    setSelectedHabit(null);
  };

  const deleteHabit = async (habitId: string) => {
    console.log("DELETE CLICKED");
    console.log("Habit ID:", habitId);

    if (deletingHabitId) return;

    setDeletingHabitId(habitId);

    try {
      const result = await onDeleteHabit(habitId);

      if (result.success) {
        closeDeleteModal();
        return;
      }

      alert(result.error || 'Delete failed');
    } catch (err: any) {
      console.error("DELETE FAILED", err);
      alert(err.message || "Delete failed");
    } finally {
      setDeletingHabitId(null);
    }
  };

  return (
    <div className="relative min-h-full space-y-5 text-left text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.22),transparent_62%)]" />

      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-indigo-300/80">
            {(() => {
              const d = parseLocalDate(todayStr);
              const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
              const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()];
              return `${day} · ${month} ${d.getDate()}`;
            })()}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">
            {getGreeting()}, {username || 'Raj'}
          </h1>
        </div>
        <button
          onClick={onCreateHabit}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 shadow-[0_12px_34px_rgba(99,102,241,0.24)] transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-300"
          id="dash-primary-add-habit"
        >
          <Plus className="h-4 w-4" />
          Loop
        </button>
      </div>

      {activeTab === 'today' && (
        <>
          <PremiumCard className="overflow-hidden p-0">
            <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center md:p-5">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Productivity Overview</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                    <StatTile icon={Check} label="Completed" value={`${completedCount}`} tone="text-emerald-400" />
                    <StatTile icon={Clock3} label="Remaining" value={`${remainingCount}`} tone="text-amber-400" />
                    <StatTile icon={Target} label="Complete" value={`${todayProgressPercent}%`} tone="text-indigo-300" />
                    <StatTile icon={Flame} label="Streak" value={`${bestStreak}d`} tone="text-orange-400" />
                    <StatTile icon={ShieldCheck} label="Score" value={`${todayProgressPercent}`} tone="text-emerald-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Daily Progress</span>
                    <span>{completedCount}/{todayScheduledHabits.length || 0}</span>
                  </div>
                  <LinearProgress value={todayProgressPercent} />
                </div>

                <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                    <p className="text-xs font-medium leading-relaxed text-indigo-100">{dailyMessage}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <CircularProgress value={todayProgressPercent} />
              </div>
            </div>
          </PremiumCard>

          <PremiumCard>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white">Quick Wins</h2>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -2 }}
                onClick={onCreateHabit}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.045] p-3 transition hover:border-white/16 hover:bg-white/[0.075] focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[4.5rem]"
              >
                <Plus className="h-6 w-6 text-indigo-300" />
                <span className="text-xs font-black text-slate-200">New Loop</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -2 }}
                onClick={handleCompleteAll}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.045] p-3 transition hover:border-white/16 hover:bg-white/[0.075] focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[4.5rem]"
              >
                <CheckCheck className="h-6 w-6 text-emerald-400" />
                <span className="text-xs font-black text-slate-200">Complete All</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -2 }}
                onClick={onNavigateToInsights}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.045] p-3 transition hover:border-white/16 hover:bg-white/[0.075] focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[4.5rem]"
              >
                <BarChart3 className="h-6 w-6 text-violet-400" />
                <span className="text-xs font-black text-slate-200">Insights</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -2 }}
                onClick={() => setFocusMode(!focusMode)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[4.5rem] ${
                  focusMode
                    ? 'border-indigo-400/40 bg-indigo-500/10 shadow-[0_0_26px_rgba(99,102,241,0.28)]'
                    : 'border-white/8 bg-white/[0.045] hover:border-white/16 hover:bg-white/[0.075]'
                }`}
              >
                <Crosshair className={`h-6 w-6 ${focusMode ? 'text-indigo-300' : 'text-slate-400'}`} />
                <span className={`text-xs font-black ${focusMode ? 'text-indigo-200' : 'text-slate-200'}`}>
                  {focusMode ? 'Focus: ON' : 'Focus: OFF'}
                </span>
              </motion.button>
            </div>
          </PremiumCard>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Today's Loops</h2>
              <button
                onClick={onCreateHabit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2 text-xs font-black text-white transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                id="dash-add-custom-loop-btn"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {displayHabits.length === 0 ? (
              <PremiumCard className="flex flex-col items-center justify-center py-12 md:py-16">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_36px_rgba(99,102,241,0.34)]">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="mx-auto mt-5 max-w-md text-center">
                  <h3 className="text-xl font-black text-white">
                    {focusMode
                      ? 'Focus mode — all done!'
                      : activeHabits.length === 0
                        ? 'No loops yet'
                        : 'Ready to build momentum?'}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    {focusMode
                      ? 'You completed everything scheduled. Turn off focus mode or create a new loop.'
                      : activeHabits.length === 0
                        ? 'Create your first loop to start building consistency.'
                        : 'No loops scheduled today.'}
                  </p>
                </div>
                {!focusMode && (
                  <div className="mt-8 w-full max-w-sm space-y-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ y: -2 }}
                      onClick={onCreateHabit}
                      className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_34px_rgba(99,102,241,0.34)] transition hover:shadow-[0_16px_40px_rgba(99,102,241,0.45)] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      id="empty-create-first-habit"
                    >
                      Create Your First Loop
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ y: -2 }}
                      onClick={() => setShowExploreHabits(true)}
                      className="w-full rounded-2xl border border-white/8 bg-white/[0.045] px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      id="empty-explore-ideas"
                    >
                      Explore Loop Ideas
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      whileHover={{ y: -2 }}
                      onClick={() => onCreateHabitWithName?.('Read 10 Pages')}
                      className="w-full rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-6 py-3.5 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/16 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      id="empty-simple-win"
                    >
                      Start with a Simple Win
                    </motion.button>
                  </div>
                )}
              </PremiumCard>
            ) : (
              <div className="grid gap-3">
                <AnimatePresence initial={false}>
                  {displayHabits.map((habit) => {
                    const completed = completedLogIds.has(habit.id);
                    const metrics = computeHabitMetrics(habit, logs, todayStr);
                    const savedNote = getTodayHabitNote(habit.id);
                    const Icon = CATEGORY_META[habit.category].icon;

                    return (
                      <motion.article
                        key={habit.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className={`group relative overflow-hidden rounded-3xl border p-3 transition ${
                          completed
                            ? 'border-emerald-400/30 bg-emerald-400/10'
                            : 'border-white/8 bg-[#0F172A]/88 hover:border-indigo-300/24 hover:bg-[#111B31]'
                        }`}
                        id={`habit-card-row-${habit.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${CATEGORY_META[habit.category].accent}`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`truncate text-sm font-black ${completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                                {habit.name}
                              </h3>
                              <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                {habit.category}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-500">{habit.description}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
                              <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-400" />{metrics.currentStreak}d streak</span>
                              <span>Hit Rate {metrics.completionRate}%</span>
                              {savedNote && <span className="truncate text-indigo-300">Note: {savedNote}</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              onClick={() => onEditHabit(habit)}
                              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                              id={`edit-settings-row-${habit.id}`}
                              aria-label={`Edit ${habit.name}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setSelectedHabit(habit)}
                              disabled={deletingHabitId === habit.id}
                              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-rose-400/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
                              id={`delete-habit-row-${habit.id}`}
                              aria-label={`Delete ${habit.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => onToggleCheckIn(habit.id, todayStr, !completed)}
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                              completed
                                ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                                : 'border-white/12 text-transparent hover:border-indigo-300 hover:text-indigo-300'
                            }`}
                            id={`toggle-check-btn-${habit.id}`}
                            aria-label={completed ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}
                          >
                            <Check className="h-5 w-5 stroke-[3]" />
                          </button>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </section>

          <PremiumCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Weekly Performance</p>
                <h2 className="mt-1 text-lg font-black text-white">Completion rhythm</h2>
              </div>
              <p className="text-xs font-bold text-slate-400">Best: {bestDay?.day || '-'} · {bestDay?.percent || 0}%</p>
            </div>
            <div className="mt-4 flex h-36 items-end gap-2">
              {weeklyStats.map((day) => (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end rounded-full bg-white/[0.035] p-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(day.percent, 6)}%` }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      className="w-full rounded-full bg-gradient-to-t from-indigo-500 to-emerald-400"
                      title={`${day.percent}% complete, ${day.completed}/${day.total} loops`}
                    />
                  </div>
                  <span className="text-[11px] font-black text-slate-500">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatTile icon={Target} label="Avg" value={`${Math.round(weeklyStats.reduce((sum, day) => sum + day.percent, 0) / 7)}%`} tone="text-indigo-300" />
              <StatTile icon={Check} label="Total" value={`${weeklyStats.reduce((sum, day) => sum + day.completed, 0)}`} tone="text-emerald-300" />
              <StatTile icon={Flame} label="Streak" value={`${bestStreak}d`} tone="text-orange-400" />
            </div>
          </PremiumCard>
        </>
      )}

      {activeTab === 'profile' && (
        <div className="grid gap-3 md:grid-cols-[1fr_0.9fr]">
          <PremiumCard>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Account</p>
            <h2 className="mt-2 text-2xl font-black text-white">{username}</h2>
            <p className="mt-1 text-sm text-slate-400">{isPremium ? 'Premium member' : 'Free plan'}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <StatTile icon={Flame} label="Streak" value={`${bestStreak}d`} tone="text-orange-400" />
              <StatTile icon={ShieldCheck} label="Score" value={`${todayProgressPercent}`} tone="text-emerald-300" />
            </div>
            <button
              onClick={onLogout}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-black text-rose-200 transition hover:bg-rose-400/16"
              id="dash-signout-btn"
            >
              <LogOut className="h-4 w-4" />
              Sign Out Securely
            </button>
          </PremiumCard>

          <PremiumCard>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-black text-white">
              {isPremium ? 'Premium Active' : 'Unlock deeper analytics'}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Advanced monthly insights, exports, and long-range performance reporting for serious loop builders.
            </p>
            {!isPremium && (
              <button
                onClick={onUpgradeToPremium}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.02]"
                id="profile-unlock-premium-btn"
              >
                Go Premium for $2/mo
                <Zap className="h-4 w-4 text-amber-500" />
              </button>
            )}
          </PremiumCard>
        </div>
      )}

      <div className="hidden gap-1.5 rounded-2xl border border-white/8 bg-white/[0.035] p-1 md:flex">
        {[
          { id: 'today', label: 'Today', icon: Check },
          { id: 'profile', label: 'Profile', icon: Trophy },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'today' | 'profile')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              activeTab === tab.id ? 'bg-white text-slate-950' : 'text-slate-500 hover:text-white'
            }`}
            id={`dash-tab-btn-${tab.id}`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedHabit && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
            <button
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (!deletingHabitId) closeDeleteModal();
              }}
              aria-label="Cancel delete loop"
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F172A] p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-habit-title"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-400/12 text-rose-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 id="delete-habit-title" className="mt-4 text-lg font-black text-white">Delete Loop?</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">This loop will be removed permanently.</p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={Boolean(deletingHabitId)}
                  className="flex-1 rounded-2xl border border-white/8 bg-white/[0.04] py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                  id="cancel-delete-habit"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteHabit(selectedHabit.id)}
                  disabled={Boolean(deletingHabitId)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 py-2.5 text-xs font-black text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-slate-600"
                  id="confirm-delete-habit"
                >
                  {deletingHabitId ? 'Deleting...' : 'Delete Loop'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExploreHabits && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
            <button
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowExploreHabits(false)}
              aria-label="Close explore ideas"
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-[#0F172A] p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="explore-ideas-title"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 id="explore-ideas-title" className="text-lg font-black text-white">Explore Loop Ideas</h3>
                <button
                  onClick={() => setShowExploreHabits(false)}
                  className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-white/[0.06] hover:text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  aria-label="Close"
                  id="explore-ideas-close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-5 text-sm leading-relaxed text-slate-400">
                Browse ideas across categories. When you're ready, create your own custom loop.
              </p>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-none pr-1">
                {HABIT_IDEAS.map((group) => {
                  const Icon = CATEGORY_META[group.category].icon;
                  return (
                    <div key={group.category}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${CATEGORY_META[group.category].accent}`}>
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{group.category}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.habits.map((habit) => (
                          <motion.button
                            key={habit}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              onCreateHabitWithName?.(habit, group.category);
                              setShowExploreHabits(false);
                            }}
                            className="w-full rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2.5 text-sm font-medium text-slate-300 text-left hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-white transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            {habit}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowExploreHabits(false)}
                className="mt-6 w-full rounded-2xl bg-white py-3 text-sm font-black text-slate-950 transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-300"
                id="explore-ideas-done"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
