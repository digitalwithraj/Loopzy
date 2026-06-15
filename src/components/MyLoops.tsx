import React, { useState, useMemo, useEffect } from 'react';
import { Habit, HabitLog, HabitCategory } from '../types';
import { computeHabitMetrics } from '../utils/streak';
import {
  Search,
  Flame,
  Target,
  CheckCircle,
  PauseCircle,
  PlayCircle,
  Archive,
  Trash2,
  Edit3,
  BookOpen,
  Zap,
  Sparkles,
  ArchiveRestore,
  Plus,
  X,
  AlertTriangle,
  Percent,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface MyLoopsProps {
  habits: Habit[];
  logs: HabitLog[];
  todayStr: string;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onPauseHabit: (habitId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onResumeHabit: (habitId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onArchiveHabit: (habitId: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onCreateHabit: () => void;
}

const CATEGORY_META: Record<HabitCategory, { icon: React.ElementType; accent: string; label: string }> = {
  Mind: { icon: BookOpen, accent: 'from-indigo-500 to-sky-400', label: 'Mind' },
  Body: { icon: Zap, accent: 'from-emerald-400 to-teal-300', label: 'Body' },
  Spirit: { icon: Sparkles, accent: 'from-violet-400 to-fuchsia-400', label: 'Spirit' },
  Focus: { icon: Target, accent: 'from-amber-400 to-orange-400', label: 'Focus' },
  Routine: { icon: ArchiveRestore, accent: 'from-cyan-400 to-blue-500', label: 'Routine' },
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  paused: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  archived: 'text-slate-500 bg-slate-500/10 border-slate-500/30',
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.archived;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors}`}>
      {status === 'active' && <CheckCircle className="h-3 w-3" />}
      {status === 'paused' && <PauseCircle className="h-3 w-3" />}
      {status === 'archived' && <Archive className="h-3 w-3" />}
      {status}
    </span>
  );
}

function PremiumCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-3xl border border-white/8 bg-[#0F172A]/88 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl ${className}`}
    >
      {children}
    </motion.section>
  );
}

function DeleteModal({
  habit,
  onConfirm,
  onClose,
  deleting,
}: {
  habit: Habit;
  onConfirm: (id: string) => void;
  onClose: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
      <button
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!deleting) onClose(); }}
        aria-label="Cancel"
      />
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F172A] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="myloops-delete-title"
      >
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-400/12 text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h3 id="myloops-delete-title" className="mt-4 text-lg font-black text-white">Delete Loop?</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          "<span className="font-semibold text-white">{habit.name}</span>" will be removed permanently.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-2xl border border-white/8 bg-white/[0.04] py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(habit.id)}
            disabled={deleting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 py-2.5 text-xs font-black text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            {deleting ? 'Deleting...' : 'Delete Loop'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function MyLoops({
  habits,
  logs,
  todayStr,
  onEditHabit,
  onDeleteHabit,
  onPauseHabit,
  onResumeHabit,
  onArchiveHabit,
  onCreateHabit,
}: MyLoopsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeHabits = useMemo(
    () => habits.filter((h) => h.status === 'active'),
    [habits]
  );

  const pausedHabits = useMemo(
    () => habits.filter((h) => h.status === 'paused'),
    [habits]
  );

  const archivedHabits = useMemo(
    () => habits.filter((h) => h.status === 'archived'),
    [habits]
  );

  const sortHabits = (list: Habit[]) => {
    return [...list].sort((a, b) => {
      const metricsA = computeHabitMetrics(a, logs, todayStr);
      const metricsB = computeHabitMetrics(b, logs, todayStr);
      const streakDiff = metricsB.currentStreak - metricsA.currentStreak;
      if (streakDiff !== 0) return streakDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const filterByName = (list: Habit[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((h) => h.name.toLowerCase().includes(q));
  };

  const sortedActive = useMemo(
    () => filterByName(sortHabits(activeHabits)),
    [activeHabits, searchQuery, logs, todayStr]
  );

  const sortedPaused = useMemo(
    () => filterByName(sortHabits(pausedHabits)),
    [pausedHabits, searchQuery, logs, todayStr]
  );

  const sortedArchived = useMemo(
    () => filterByName(sortHabits(archivedHabits)),
    [archivedHabits, searchQuery, logs, todayStr]
  );

  const hasAnyLoops = habits.length > 0;
  const totalVisible =
    sortedActive.length + sortedPaused.length + (showArchived ? sortedArchived.length : 0);
  const hasActiveOrPaused = useMemo(
    () => sortedActive.length + sortedPaused.length > 0,
    [sortedActive.length, sortedPaused.length]
  );

  const handleDelete = async (habitId: string) => {
    const result = await onDeleteHabit(habitId);
    if (result.success) {
      setDeletingHabit(null);
    }
  };

  function LoopCard({ habit }: { habit: Habit }) {
    const metrics = useMemo(
      () => computeHabitMetrics(habit, logs, todayStr),
      [habit, logs, todayStr]
    );
    const Icon = CATEGORY_META[habit.category]?.icon || BookOpen;
    const iconAccent = CATEGORY_META[habit.category]?.accent || 'from-indigo-500 to-sky-400';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="group relative overflow-hidden rounded-3xl border border-white/8 bg-[#0F172A]/88 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl transition hover:border-white/12 hover:bg-[#111B31]"
      >
        <div className="flex items-start gap-3">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${iconAccent}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-black text-white">
                {habit.name}
              </h3>
              <StatusBadge status={habit.status} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold">
              <span className="inline-flex items-center gap-1 text-orange-400">
                <Flame className="h-3 w-3" />
                {metrics.currentStreak}d streak
              </span>
              <span className="inline-flex items-center gap-1 text-indigo-300">
                <Target className="h-3 w-3" />
                {metrics.completionRate}% hit rate
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Percent className="h-3 w-3" />
                {metrics.totalScheduledCount > 0
                  ? Math.round((metrics.totalScheduledCount - metrics.missedCount) / metrics.totalScheduledCount * 100)
                  : 0}% completion
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Archive className="h-3 w-3" />
                {habit.category}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              onClick={() => onEditHabit(habit)}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
              aria-label={`Edit ${habit.name}`}
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/6 pt-3">
          {habit.status === 'active' && (
            <ActionButton
              icon={PauseCircle}
              label="Pause"
              onClick={() => onPauseHabit(habit.id)}
              className="text-amber-400 hover:bg-amber-400/10"
            />
          )}
          {habit.status === 'paused' && (
            <ActionButton
              icon={PlayCircle}
              label="Resume"
              onClick={() => onResumeHabit(habit.id)}
              className="text-emerald-400 hover:bg-emerald-400/10"
            />
          )}
          {habit.status === 'active' && (
            <ActionButton
              icon={Archive}
              label="Archive"
              onClick={() => onArchiveHabit(habit.id)}
              className="text-slate-400 hover:bg-white/[0.06]"
            />
          )}
          <ActionButton
            icon={Trash2}
            label="Delete"
            onClick={() => setDeletingHabit(habit)}
            className="text-rose-400 hover:bg-rose-400/10"
          />
        </div>
      </motion.div>
    );
  }

  function ActionButton({
    icon: Icon,
    label,
    onClick,
    className = '',
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    className?: string;
  }) {
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded-xl border border-white/6 px-2.5 py-1.5 text-[10px] font-bold transition ${className}`}
      >
        <Icon className="h-3 w-3" />
        {label}
      </button>
    );
  }

  function SectionHeader({
    title,
    count,
    accentColor,
    icon: Icon,
  }: {
    title: string;
    count: number;
    accentColor: string;
    icon: React.ElementType;
  }) {
    if (count === 0) return null;
    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accentColor}`} />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">{title}</h2>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${accentColor} border-current/20`}>
          {count}
        </span>
      </div>
    );
  }

  if (!hasAnyLoops) {
    return (
      <div className="relative min-h-full space-y-5 text-left text-slate-100">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.22),transparent_62%)]" />
        <div className="relative">
          <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">My Loops</h1>
          <p className="mt-1 text-sm text-slate-400">Manage and organize your active loops.</p>
        </div>
        <PremiumCard className="flex flex-col items-center justify-center py-16">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_0_36px_rgba(99,102,241,0.34)]">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h3 className="mx-auto mt-5 text-xl font-black text-white">No loops yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-center text-sm leading-relaxed text-slate-400">
            Create your first loop to start building consistency.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ y: -2 }}
            onClick={onCreateHabit}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-black text-white shadow-[0_12px_34px_rgba(99,102,241,0.34)] transition hover:shadow-[0_16px_40px_rgba(99,102,241,0.45)] focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <Plus className="h-4 w-4" />
            Create Loop
          </motion.button>
        </PremiumCard>
      </div>
    );
  }

  useEffect(() => {
    if (!hasActiveOrPaused && habits.length > 0) {
      setShowArchived(true);
    }
  }, [hasActiveOrPaused, habits.length]);

  return (
    <div className="relative min-h-full space-y-5 text-left text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.22),transparent_62%)]" />

      <div className="relative">
        <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">My Loops</h1>
        <p className="mt-1 text-sm text-slate-400">Manage and organize your active loops.</p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Search className="h-4 w-4 text-slate-500" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search loops..."
          className="w-full rounded-2xl border border-white/8 bg-[#0F172A]/88 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 backdrop-blur-xl transition focus:border-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {totalVisible === 0 && searchQuery.trim() !== '' && (
        <PremiumCard className="flex flex-col items-center justify-center py-12">
          <Search className="h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm font-bold text-slate-400">No loops match "{searchQuery}"</p>
          <p className="mt-1 text-xs text-slate-500">Try a different search term.</p>
        </PremiumCard>
      )}

      {totalVisible > 0 && (
        <div className="space-y-6">
          {sortedActive.length > 0 && (
            <div className="space-y-3">
              <SectionHeader title="Active" count={sortedActive.length} accentColor="text-emerald-400" icon={CheckCircle} />
              <div className="grid gap-3">
                <AnimatePresence initial={false}>
                  {sortedActive.map((habit) => (
                    <LoopCard key={habit.id} habit={habit} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {sortedPaused.length > 0 && (
            <div className="space-y-3">
              <SectionHeader title="Paused" count={sortedPaused.length} accentColor="text-amber-400" icon={PauseCircle} />
              <div className="grid gap-3">
                <AnimatePresence initial={false}>
                  {sortedPaused.map((habit) => (
                    <LoopCard key={habit.id} habit={habit} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-left"
            >
              <Archive className={`h-4 w-4 ${archivedHabits.length > 0 ? 'text-slate-400' : 'text-slate-600'}`} />
              <h2 className={`text-sm font-black uppercase tracking-wider ${archivedHabits.length > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                Archived
              </h2>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold text-slate-400 border-current/20`}>
                {archivedHabits.length}
              </span>
              {archivedHabits.length > 0 && (
                <span className="text-[10px] font-bold text-indigo-400">{showArchived ? 'Hide' : 'Show'}</span>
              )}
            </button>

            {showArchived && sortedArchived.length > 0 && (
              <div className="grid gap-3">
                <AnimatePresence initial={false}>
                  {sortedArchived.map((habit) => (
                    <LoopCard key={habit.id} habit={habit} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {showArchived && sortedArchived.length === 0 && (
              <PremiumCard className="flex flex-col items-center justify-center py-8">
                <Archive className="h-8 w-8 text-slate-600" />
                <p className="mt-2 text-sm text-slate-500">No archived loops.</p>
              </PremiumCard>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {deletingHabit && (
          <DeleteModal
            habit={deletingHabit}
            onConfirm={handleDelete}
            onClose={() => setDeletingHabit(null)}
            deleting={false}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
