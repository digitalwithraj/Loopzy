/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Habit, HabitLog, ExportReportData } from '../types';
import { computeHabitMetrics, calculateConsistencyScore, formatDate, parseLocalDate } from '../utils/streak';
import { Download, FileText, Calendar, Filter, Sparkles, AlertCircle, FileCode, Check, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ExportPanelProps {
  habits: Habit[];
  logs: HabitLog[];
  todayStr: string;
  username: string;
  isPremiumUser: boolean;
  onUpgradeToPremium: () => void;
}

const RANGE_PRESETS = [
  { id: 'weekly', label: 'Last 7 Days (Basic)', days: 7, premiumOnly: false },
  { id: 'monthly', label: 'Last 30 Days (Premium)', days: 30, premiumOnly: true },
  { id: 'yearly', label: 'Past 365 Days (Premium)', days: 365, premiumOnly: true },
];

export default function ExportPanel({
  habits,
  logs,
  todayStr,
  username,
  isPremiumUser,
  onUpgradeToPremium,
}: ExportPanelProps) {
  const [selectedRangePreset, setSelectedRangePreset] = useState<string>('weekly');
  const [showNotesInReport, setShowNotesInReport] = useState(true);

  const activeHabits = habits;

  // Compute calculated date range
  const configDays = useMemo(() => {
    const found = RANGE_PRESETS.find((p) => p.id === selectedRangePreset);
    return found ? found.days : 7;
  }, [selectedRangePreset]);

  // Gate the available report range based on subscription state
  const appliedRangeIsPremium = useMemo(() => {
    const found = RANGE_PRESETS.find((p) => p.id === selectedRangePreset);
    return found ? found.premiumOnly : false;
  }, [selectedRangePreset]);

  const finalIsAuthorized = useMemo(() => {
    if (!appliedRangeIsPremium) return true;
    return isPremiumUser;
  }, [appliedRangeIsPremium, isPremiumUser]);

  // Calculate Date bounds as formatted strings
  const rangeBounds = useMemo(() => {
    const today = parseLocalDate(todayStr);
    const start = new Date(today);
    start.setDate(today.getDate() - (configDays - 1));
    return {
      startStr: formatDate(start),
      endStr: todayStr,
    };
  }, [configDays, todayStr]);

  // Aggregate Report performance metrics in scope
  const reportRecords: ExportReportData[] = useMemo(() => {
    return activeHabits.map((habit) => {
      // Habit specific metrics
      const m = computeHabitMetrics(habit, logs, todayStr);
      
      // Notes written in date range
      const habitLogs = logs.filter(
        (l) =>
          l.habitId === habit.id &&
          l.completedDate >= rangeBounds.startStr &&
          l.completedDate <= rangeBounds.endStr
      );

      const mappedLogs = habitLogs.map((l) => ({
        completedDate: l.completedDate,
        completed: l.completed,
        note: l.note,
      }));

      // In range logs count
      const inRangeCompleted = mappedLogs.filter((l) => l.completed).length;
      const inRangeScheduled = configDays; // simplified for range calculation
      const inRangeRate = Math.round((inRangeCompleted / inRangeScheduled) * 100) || 0;

      return {
        habitId: habit.id,
        habitName: habit.name,
        completionRate: inRangeRate,
        currentStreak: m.currentStreak,
        longestStreak: m.longestStreak,
        missedCount: Math.max(0, configDays - inRangeCompleted),
        logs: mappedLogs,
      };
    });
  }, [activeHabits, logs, configDays, rangeBounds, todayStr]);

  const overallConsistency = useMemo(() => {
    if (reportRecords.length === 0) return 0;
    const totals = reportRecords.reduce((sum, r) => sum + r.completionRate, 0);
    return Math.round(totals / reportRecords.length);
  }, [reportRecords]);

  // CSV GENERATOR UTILITY
  const triggerCSVDownload = () => {
    if (!finalIsAuthorized) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Loop Name,Hit Rate,Current Streak,Longest Streak,Missed Count,Journal Notes\r\n';

    reportRecords.forEach((rec) => {
      const notes = rec.logs
        .filter((l) => l.note)
        .map((l) => `${l.completedDate}: ${l.note?.replace(/"/g, '""')}`)
        .join(' | ');

      csvContent += `"${rec.habitName}",${rec.completionRate}%,${rec.currentStreak} days,${rec.longestStreak} days,${rec.missedCount},"${notes}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Loopzy_Report_${selectedRangePreset}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON EXPORT UTILITY
  const triggerJSONDownload = () => {
    if (!finalIsAuthorized) return;

    const exportObj = {
      reportScope: selectedRangePreset,
      generatedDate: todayStr,
      user: username,
      summary: {
        consistencyScore: overallConsistency,
        habitCount: reportRecords.length,
      },
      habits: reportRecords,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `Loopzy_Export_${selectedRangePreset}_${todayStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // HIGH-FIDELITY PDF BUILDER VIA JSPDF
  const triggerPDFDownload = () => {
    if (!finalIsAuthorized) return;

    const doc = new jsPDF();
    let verticalCursor = 20;

    // Drawn Header Branding
    doc.setFillColor(30, 41, 59); // deep charcoal
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('LOOPZY LOOP RITUAL REPORT', 14, 25);
    doc.setFontSize(10);
    doc.text(`Consistency Companion • Mode: ${selectedRangePreset.toUpperCase()}`, 14, 32);

    verticalCursor = 50;

    // Report Summary Details Block
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, verticalCursor, 182, 30, 'FD');

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.text('USER PROFILE:', 20, verticalCursor + 8);
    doc.text('STATED DATE RANGE:', 20, verticalCursor + 16);
    doc.text('RECORDS STATUS:', 20, verticalCursor + 24);

    doc.setTextColor(15, 23, 42);
    doc.text(username, 70, verticalCursor + 8);
    doc.text(`${rangeBounds.startStr} to ${rangeBounds.endStr}`, 70, verticalCursor + 16);
    doc.text(`Active compliance score is currently ${overallConsistency}%`, 70, verticalCursor + 24);

    verticalCursor += 40;

    // Performance Summary Column Headers
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('LOOP EFFICIENCY SUMMARY:', 14, verticalCursor);
    verticalCursor += 8;

    reportRecords.forEach((rec, idx) => {
      if (verticalCursor > 260) {
        doc.addPage();
        verticalCursor = 20;
      }

      // Draw rounded card borders
      doc.setDrawColor(241, 245, 249);
      doc.setFillColor(255, 255, 255);
      doc.rect(14, verticalCursor, 182, 32, 'FD');

      // Draw small accent banner
      doc.setFillColor(79, 70, 229); // indigo
      doc.rect(14, verticalCursor, 4, 32, 'F');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.text(rec.habitName, 22, verticalCursor + 8);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Hit Rate: ${rec.completionRate}%`, 22, verticalCursor + 16);
      doc.text(`Current Active: ${rec.currentStreak} days`, 22, verticalCursor + 24);
      doc.text(`Personal Longest Streak: ${rec.longestStreak} days`, 95, verticalCursor + 16);
      doc.text(`Missed Tracker days: ${rec.missedCount}`, 95, verticalCursor + 24);

      verticalCursor += 38;
    });

    // Option journal reflections notes section as footnotes
    if (showNotesInReport) {
      const activeNotes = reportRecords.flatMap((r) =>
        r.logs.filter((l) => l.note).map((l) => ({ name: r.habitName, completedDate: l.completedDate, note: l.note }))
      );
      
      if (activeNotes.length > 0) {
        if (verticalCursor > 230) {
          doc.addPage();
          verticalCursor = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('JOURNAL NOTES COLLECTED:', 14, verticalCursor);
        verticalCursor += 8;

        activeNotes.forEach((entry) => {
          if (verticalCursor > 270) {
            doc.addPage();
            verticalCursor = 20;
          }

          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(`• [${entry.completedDate}] (${entry.name})`, 14, verticalCursor);
          doc.setTextColor(100, 116, 139);
          doc.text(`"${entry.note}"`, 14, verticalCursor + 5);
          verticalCursor += 12;
        });
      }
    }

    // Save File Direct to Client
    doc.save(`Loopzy_Report_${selectedRangePreset}_${todayStr}.pdf`);
  };

  return (
    <div className="space-y-6 select-none text-left">
      
      {/* EXPORT RANGE CONTROL WITH PREMIUM UPGRADE INCENTIVE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4.5 h-4.5 text-indigo-600" />
            <h4 className="font-bold text-xs text-slate-800 dark:text-slate-150 uppercase tracking-wider">Report Selection Range</h4>
          </div>
          {!isPremiumUser && (
            <span className="text-[9px] font-mono font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
              <Sparkles className="w-2.5 h-2.5" /> FREE MEMBER
            </span>
          )}
        </div>

        {/* Radio selector blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {RANGE_PRESETS.map((preset) => {
            const isSelected = selectedRangePreset === preset.id;
            const gateAlert = preset.premiumOnly && !isPremiumUser;

            return (
              <button
                key={preset.id}
                onClick={() => setSelectedRangePreset(preset.id)}
                className={`p-3 text-left border rounded-2xl flex flex-col justify-between transition cursor-pointer relative ${
                  isSelected
                    ? gateAlert
                      ? 'border-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/10'
                      : 'border-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10'
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-150 dark:hover:border-slate-750 bg-transparent'
                }`}
                id={`preset-range-btn-${preset.id}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{preset.label}</span>
                    {preset.premiumOnly && (
                      <span className="text-[8px] bg-indigo-500 text-white px-1 py-0.2 rounded font-semibold scale-90">PM</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Breakdown checklist across {preset.days} calendar days.</p>
                </div>
                {isSelected && (
                  <div className="absolute bottom-2 right-2 p-0.5 bg-indigo-600 rounded-full text-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* UPGRADE BUTTON IF TRYING TO USE PREMIUM OPTIONS */}
        {appliedRangeIsPremium && !isPremiumUser && (
          <div className="p-4 bg-gradient-to-r from-amber-50 to-indigo-50 dark:from-indigo-950/20 dark:to-indigo-950/10 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Loopzy Premium Blocked
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-350 font-medium">
                Generating Monthly or Yearly deep reports is locked under the Premium plan.
              </p>
              <p className="text-[10px] text-slate-500">Upgrade to experience advanced consistency diagnostics & PDF exports.</p>
            </div>
            <button
              onClick={onUpgradeToPremium}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition shrink-0 cursor-pointer flex items-center gap-1 text-[11px]"
              id="upgrade-export-btn"
            >
              Unlock Premium <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </button>
          </div>
        )}

        {/* CHECKBOX SETTINGS */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="show-notes-chk"
            checked={showNotesInReport}
            onChange={(e) => setShowNotesInReport(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-405 cursor-pointer"
          />
          <label htmlFor="show-notes-chk" className="text-xs text-slate-600 dark:text-slate-450 cursor-pointer font-medium">
            Include full daily reflective journal note records in the exports
          </label>
        </div>
      </div>

      {/* THREE DIRECT EXPORT FORMAT CONTROL BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* PDF EXPORT BUTTON */}
        <button
          onClick={triggerPDFDownload}
          disabled={!finalIsAuthorized}
          className={`p-4 rounded-2xl shadow-xs border flex items-center gap-3.5 transition group text-left cursor-pointer ${
            finalIsAuthorized
              ? 'bg-white hover:bg-indigo-50/10 dark:bg-slate-900 border-slate-100 hover:border-indigo-400'
              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50 dark:bg-slate-900/20'
          }`}
          id="export-pdf-action-btn"
        >
          <div className={`p-3 rounded-xl shrink-0 ${finalIsAuthorized ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
            <FileText className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="font-bold text-xs text-slate-850 dark:text-slate-150">Export to PDF Document</h5>
            <p className="text-[10px] text-slate-500 mt-0.5">High-fidelity printable format completed reports.</p>
          </div>
          <Download className="w-4 h-4 text-slate-350 group-hover:translate-y-0.5 transition-transform" />
        </button>

        {/* CSV EXPORT BUTTON */}
        <button
          onClick={triggerCSVDownload}
          disabled={!finalIsAuthorized}
          className={`p-4 rounded-2xl shadow-xs border flex items-center gap-3.5 transition group text-left cursor-pointer ${
            finalIsAuthorized
              ? 'bg-white hover:bg-indigo-50/10 dark:bg-slate-900 border-slate-100 hover:border-indigo-400'
              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50 dark:bg-slate-900/20'
          }`}
          id="export-csv-action-btn"
        >
          <div className={`p-3 rounded-xl shrink-0 ${finalIsAuthorized ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
            <FileText className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="font-bold text-xs text-slate-850 dark:text-slate-150">Export to CSV Sheet</h5>
            <p className="text-[10px] text-slate-500 mt-0.5">Tabular grid compatible with Excel spreadsheet tools.</p>
          </div>
          <Download className="w-4 h-4 text-slate-350 group-hover:translate-y-0.5 transition-transform" />
        </button>

        {/* JSON EXPORT BUTTON */}
        <button
          onClick={triggerJSONDownload}
          disabled={!finalIsAuthorized}
          className={`p-4 rounded-2xl shadow-xs border flex items-center gap-3.5 transition group text-left cursor-pointer ${
            finalIsAuthorized
              ? 'bg-white hover:bg-indigo-50/10 dark:bg-slate-900 border-slate-100 hover:border-indigo-400'
              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50 dark:bg-slate-900/20'
          }`}
          id="export-json-action-btn"
        >
          <div className={`p-3 rounded-xl shrink-0 ${finalIsAuthorized ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
            <FileCode className="w-5.5 h-5.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="font-bold text-xs text-slate-850 dark:text-slate-150">Backup JSON File</h5>
            <p className="text-[10px] text-slate-500 mt-0.5">Backup complete raw loop logs safely in custom code.</p>
          </div>
          <Download className="w-4 h-4 text-slate-350 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* REPORT PAPER DESK LIVE PREVIEW */}
      <div className="bg-slate-100 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 text-left">
        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest pl-1 mb-2.5 flex items-center gap-1">
          <Eye className="w-4 h-4 text-slate-450" /> Live Printable Layout Preview
        </h4>

        {/* The Mock Printable Paper */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 md:p-8 rounded-2xl shadow-inner max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 text-slate-700 dark:text-slate-300">
            <div>
              <p className="text-sm font-black font-sans tracking-tight text-slate-900 dark:text-white uppercase">Loopzy Summary Report</p>
              <p className="text-[10px] font-mono text-slate-400">GENTLE RITUAL ENGINE SUMMARY</p>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 dark:bg-slate-800 py-1 px-2.5 rounded-lg">
              {selectedRangePreset} PREVIEW
            </span>
          </div>

          {/* Quick Details Profile */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Tracked User Name</p>
              <p className="font-bold mt-0.5 text-slate-850 dark:text-slate-150">{username}</p>
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">Coverage Range</p>
              <p className="font-bold mt-0.5 text-slate-850 dark:text-slate-150">{rangeBounds.startStr} to {rangeBounds.endStr}</p>
            </div>
          </div>

          {/* Habit Statistics Grid Table */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">Loop Hit Rate Metrics</p>

            {reportRecords.length === 0 ? (
              <p className="text-xs text-slate-450 italic text-center py-4">No active loops logged check-ins in selected range presets.</p>
            ) : (
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {/* Headers */}
                <div className="bg-slate-50 dark:bg-slate-800/60 grid grid-cols-3 p-2.5 text-[9px] font-mono font-bold text-slate-500 uppercase">
                  <span>Loop Item</span>
                  <span className="text-center">Streak Statistics</span>
                  <span className="text-right">Hit Rate</span>
                </div>

                {/* Rows mapped */}
                {reportRecords.map((r) => (
                  <div key={r.habitId} className="grid grid-cols-3 p-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-semibold truncate">{r.habitName}</span>
                    <span className="text-center font-mono">🔥 {r.currentStreak}d (max {r.longestStreak}d)</span>
                    <span className="text-right font-extrabold text-indigo-600 dark:text-indigo-400">{r.completionRate}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer of Printable report */}
          <div className="text-center border-t border-dashed pt-4 text-[10px] text-slate-400 italic font-mono space-y-1">
            <p>Overall Hit Rate is currently {overallConsistency}%.</p>
            <p>“Consistency is about taking small steps day by day, not a struggle for perfection.”</p>
          </div>
        </div>
      </div>

    </div>
  );
}
