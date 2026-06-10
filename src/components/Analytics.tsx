/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Habit, HabitLog } from '../types';
import { isHabitScheduledForDate } from '../utils/habitSchedule';
import {
  computeHabitMetrics,
  getPastDates,
  parseLocalDate,
  calculateConsistencyScore,
  WEEKDAYS_SHORT,
  MONTHS_SHORT,
  CATEGORY_COLORS,
} from '../utils/streak';
import { Calendar, Award, Flame, CheckCircle, BookOpen, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsProps {
  habits: Habit[];
  logs: HabitLog[];
  todayStr: string;
}

export default function Analytics({ habits, logs, todayStr }: AnalyticsProps) {
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const activeHabits = habits.filter((h) => !h.isArchived);

  // Filter logs based on selected habit
  const filteredLogs = selectedHabitId === 'all'
    ? logs
    : logs.filter((l) => l.habitId === selectedHabitId);

  // Streaks statistics
  const consistencyScore = calculateConsistencyScore(activeHabits, logs, todayStr);

  // Heatmap: Create past 120 days of data
  // Columns = 17 weeks roughly
  const pastDaysList = getPastDates(120, todayStr);
  
  // Group days into weeks for the contribution heat grid
  const weeksGrid: string[][] = [];
  let tempWeek: string[] = [];

  pastDaysList.forEach((dateStr, i) => {
    tempWeek.push(dateStr);
    if (tempWeek.length === 7 || i === pastDaysList.length - 1) {
      weeksGrid.push(tempWeek);
      tempWeek = [];
    }
  });

  // Helper to count completed logs on a date
  const getLogsCompletenessForDate = (dateStr: string) => {
    const completedOnDate = logs.filter((l) => l.completedDate === dateStr && l.completed);
    if (selectedHabitId === 'all') {
      return completedOnDate.length;
    }
    return completedOnDate.some((l) => l.habitId === selectedHabitId) ? 1 : 0;
  };

  // Helper to get total active habits scheduled on that day
  const getScheduledCountForDate = (dateStr: string) => {
    if (selectedHabitId !== 'all') {
      const h = habits.find((hab) => hab.id === selectedHabitId);
      return h ? 1 : 0;
    }

    const dayObj = parseLocalDate(dateStr);

    return activeHabits.filter((h) => {
      return isHabitScheduledForDate(h, dayObj);
    }).length;
  };

  // Heatmap intensity color class getter
  const getHeatmapColorClass = (count: number, scheduledTotal: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-400';
    if (scheduledTotal === 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-400';

    const ratio = count / scheduledTotal;
    if (ratio <= 0.34) return 'bg-indigo-150 dark:bg-indigo-950/20 hover:scale-110';
    if (ratio <= 0.67) return 'bg-indigo-305 dark:bg-indigo-800/40 hover:scale-110';
    return 'bg-indigo-600 hover:scale-110';
  };

  // Weekly Completion (last 7 days) Spark Chart
  const last7Days = getPastDates(7, todayStr);
  const weeklyCompletionRate = last7Days.map((dStr) => {
    const totalScheduled = getScheduledCountForDate(dStr);
    const completed = logs.filter((l) => l.completedDate === dStr && l.completed && (selectedHabitId === 'all' || l.habitId === selectedHabitId)).length;
    return totalScheduled === 0 ? 0 : Math.round((completed / totalScheduled) * 100);
  });

  // Journal reflections log
  const journalReflections = logs
    .filter((l) => l.note && l.note.trim() && (selectedHabitId === 'all' || l.habitId === selectedHabitId))
    .sort((a, b) => b.completedDate.localeCompare(a.completedDate))
    .slice(0, 10);

  // Get selected habit description/stats if not 'all'
  const selectedHabit = habits.find((h) => h.id === selectedHabitId);
  const selectedHabitMetrics = selectedHabit
    ? computeHabitMetrics(selectedHabit, logs, todayStr)
    : null;

  return (
    <div className="space-y-6 select-none">
      
      {/* FILTER CONTROL TAB */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-3 rounded-2xl shadow-xs">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase">Track Focus:</span>
        <select
          value={selectedHabitId}
          onChange={(e) => setSelectedHabitId(e.target.value)}
          className="bg-transparent border-0 ring-0 hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none p-1.5 rounded-lg cursor-pointer max-w-[200px]"
          id="analytics-focus-select"
        >
          <option value="all">🌟 Everything Combined</option>
          {activeHabits.map((h) => (
            <option key={h.id} value={h.id}>
              {h.category === 'Mind' && '🧠'}
              {h.category === 'Body' && '💪'}
              {h.category === 'Spirit' && '☀️'}
              {h.category === 'Focus' && '🎯'}
              {h.category === 'Routine' && '🔄'} {h.name}
            </option>
          ))}
        </select>
      </div>

      {/* CORE SCORES METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Consistency Score Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-xs text-left relative overflow-hidden">
          <div className="absolute top-3 right-3 p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Consistency</p>
          <h2 className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">
            {selectedHabitMetrics ? selectedHabitMetrics.completionRate : consistencyScore}%
          </h2>
          <p className="text-[9px] text-slate-500 mt-1 italic leading-tight">Hit Rate = Percentage of scheduled loop completions since the loop was created.</p>
        </div>

        {/* Current Active Streak Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-xs text-left relative overflow-hidden">
          <div className="absolute top-3 right-3 p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-lg">
            <Flame className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Active Streak</p>
          <h2 className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">
            {selectedHabitMetrics
              ? selectedHabitMetrics.currentStreak
              : Math.max(...activeHabits.map((h) => computeHabitMetrics(h, logs, todayStr).currentStreak), 0)}{' '}
            <span className="text-xs font-semibold text-slate-400 font-sans">days</span>
          </h2>
          <p className="text-[9px] text-slate-500 mt-1 italic leading-tight">Longest current chain of daily check-ins.</p>
        </div>

        {/* Global Success / Gaps Card */}
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl shadow-xs text-left relative overflow-hidden">
          <div className="absolute top-3 right-3 p-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Consistency Score</p>
          <h2 className="text-3xl font-extrabold text-slate-850 dark:text-slate-100 mt-1">
            {selectedHabitMetrics
              ? selectedHabitMetrics.longestStreak
              : Math.max(...activeHabits.map((h) => computeHabitMetrics(h, logs, todayStr).longestStreak), 0)}{' '}
            <span className="text-xs font-semibold text-slate-400 font-sans">days max</span>
          </h2>
          <p className="text-[9px] text-slate-500 mt-1 italic leading-tight">Maximum historical consistency achieved.</p>
        </div>
      </div>

      {/* HEATMAP / GITHUB CALENDAR PROGRESS VIEW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs text-left">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest pl-1">Grid Consistency Calendar</h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-1 mt-0.5">
          Past 120 days of track. High intensity blocks correspond to a higher completed density.
        </p>

        {/* The Contribution Heat Grid */}
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex gap-1.5 min-w-[340px] items-end">
            <div className="grid grid-rows-7 gap-1 text-[8px] font-mono font-semibold text-slate-400 pr-1 select-none">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            <div className="flex flex-1 justify-between gap-1">
              {weeksGrid.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-1">
                  {week.map((dateStr) => {
                    const cnt = getLogsCompletenessForDate(dateStr);
                    const sched = getScheduledCountForDate(dateStr);
                    const colorClass = getHeatmapColorClass(cnt, sched);
                    
                    return (
                      <div
                        key={dateStr}
                        title={`${dateStr}: ${cnt} / ${sched} completed`}
                        className={`w-3.5 h-3.5 rounded-sm transition-transform duration-200 cursor-help ${colorClass}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center justify-between mt-4 pl-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-350" /> Hover over a square to view detailed score ratio.
          </span>
          <div className="flex items-center gap-1 font-mono">
            <span>Less</span>
            <div className="w-2.5 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-indigo-150 dark:bg-indigo-950/20 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-indigo-305 dark:bg-indigo-800/40 rounded-sm" />
            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-sm" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* WEEKLY TRENDS & PERFORMANCE GRAPHS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sparkline Completion Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs text-left">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest pl-1">Compliance Spark Chart</h4>
            <span className="text-[10px] text-sky-500 font-mono bg-sky-50 dark:bg-sky-950/30 px-2 py-0.5 rounded-md font-semibold">Weekly View</span>
          </div>

          <div className="h-28 flex items-end justify-between gap-2.5 px-3">
            {last7Days.map((dateStr, i) => {
              const rate = weeklyCompletionRate[i];
              // Get day abbreviation
              const dayIndex = parseLocalDate(dateStr).getDay();
              const label = WEEKDAYS_SHORT[dayIndex];
              const isToday = dateStr === todayStr;

              return (
                <div key={dateStr} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="text-[9px] font-mono font-bold text-slate-400 leading-none">{rate}%</div>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 relative group`}
                    style={{
                      height: `${Math.max(5, rate)}%`,
                      backgroundColor: isToday ? 'var(--color-indigo-500, #6366f1)' : 'var(--color-indigo-305, #a5b4fc)',
                    }}
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20 font-sans">
                      {dateStr}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-bold mt-1 ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CALMING JOURNAL REFLECTIONS LIST */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs text-left">
          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3">Reflective Journals</h4>

          {journalReflections.length === 0 ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl text-center space-y-1.5 py-8 md:py-10">
              <BookOpen className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Your journals are waiting...</p>
              <p className="text-[10px] text-slate-400">Add supportive notes during your daily check-ins to view them here.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[120px] overflow-y-auto pr-1">
              {journalReflections.map((log) => {
                const h = habits.find((hab) => hab.id === log.habitId);
                const colorConfig = h ? CATEGORY_COLORS[h.category] : CATEGORY_COLORS.Mind;

                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-5/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-1 text-[11px] hover:bg-slate-5 dark:hover:bg-slate-800/20 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-200 truncate pr-2">
                        {h ? h.name : 'Completed Loop'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">{log.completedDate}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed italic pl-1 border-l-2 border-indigo-400">
                      “{log.note}”
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
