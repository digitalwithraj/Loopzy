/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Habit, HabitLog, HabitCategory, HabitFrequency, CustomDay } from './types';
import Auth from './components/Auth';
import Onboarding, { OnboardingData } from './components/Onboarding';
import ResetPassword from './components/ResetPassword';
import AuthCallback from './components/AuthCallback';
import Dashboard from './components/Dashboard';
import MyLoops from './components/MyLoops';
import Analytics from './components/Analytics';
import ExportPanel from './components/ExportPanel';
import HabitForm from './components/HabitForm';
import Settings from './components/Settings';
import PwaInstall from './components/PwaInstall';
import OfflineDetector from './components/OfflineDetector';
import { supabase, isSupabaseEnabled } from './supabase';
import { calculateConsistencyScore, computeHabitMetrics, formatDate } from './utils/streak';
import { scheduledDayIndexesForHabit } from './utils/habitSchedule';
import { useReminderChecker, requestNotificationPermission } from './hooks/useReminderChecker';
import { Calendar, Bell, Download, Moon, Sun, CheckCircle, X, FileText, LogOut, Flame, Target, List, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import loopzyLogoLight from '../logo light mode.png';
import loopzyLogoDark from '../logo dark mode.png';

import avatarStudentMale from '../Avatar/male avatar 2.png';
import avatarStudentFemale from '../Avatar/male avatar 8.png';
import avatarProfMale from '../Avatar/male avatar 1.png';
import avatarProfFemale from '../Avatar/male avatar 6.png';
import avatarCreator from '../Avatar/male avatar 4.png';
import avatarEntrepreneur from '../Avatar/male avatar.png';

const AVATAR_MAP: Record<string, string> = {
  'student-male': avatarStudentMale,
  'student-female': avatarStudentFemale,
  'professional-male': avatarProfMale,
  'professional-female': avatarProfFemale,
  'creator': avatarCreator,
  'entrepreneur': avatarEntrepreneur,
};

interface PushNotificationMock {
  id: string;
  title: string;
  body: string;
}

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

export default function App() {
  // Development error banner state
  const [devErrorBanner, setDevErrorBanner] = useState<string | null>(null);
  const [todayStr, setTodayStr] = useState(() => formatDate(new Date()));

  // App authentication state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Track active Supabase realtime channel subscriptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const realtimeChannelsRef = useRef<any[]>([]);
  // Prevents onAuthStateChange from re-logging in during an active logout
  const isLoggingOutRef = useRef(false);

  // Profile context variables
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [, setDeleting] = useState(false);

  // Onboarding state — true when a logged-in user has NOT completed onboarding yet
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Password recovery flow — true when user clicked a Supabase reset email link
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);

  // Navigation and Theme state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'myloops' | 'analytics' | 'reports' | 'settings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('loopzy_dark_theme') === 'true';
  });


  // Modal active states
  const [showHabitForm, setShowHabitForm] = useState<boolean>(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [prefillData, setPrefillData] = useState<{ name: string; category?: HabitCategory } | null>(null);

  // Push notification state queue
  const [pushAlerts, setPushAlerts] = useState<PushNotificationMock[]>([]);

  // Keep today's date fresh for users who leave Loopzy open across midnight.
  useEffect(() => {
    const scheduleTodayRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);

      return window.setTimeout(() => {
        setTodayStr(formatDate(new Date()));
        refreshTimer = scheduleTodayRefresh();
      }, nextMidnight.getTime() - now.getTime());
    };

    let refreshTimer = scheduleTodayRefresh();

    return () => window.clearTimeout(refreshTimer);
  }, []);

  // Theme application
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('loopzy_dark_theme', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('loopzy_dark_theme', 'false');
    }
  }, [isDarkMode]);


  // ── Browser reminder checker ────────────────────────────────────────────
  // Poll every 60 s while the app is open; shows a browser Notification
  // when current local time matches a habit's reminderTime and the habit
  // is scheduled for today.
  const notifEnabled = localStorage.getItem('loopzy_settings_notif_habit_reminders') !== 'false';
  useReminderChecker(habits, currentUser, notifEnabled);

  // ── Supabase auth state subscription ──────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) {
      setAuthLoading(false);
      return;
    }

    // Track whether we have already initialised data for this mount to avoid
    // double-fetching (React StrictMode double-mount, or INITIAL_SESSION +
    // getSession racing).
    let dataInitialised = false;

    const bootstrapUser = async (user: any) => {
      if (dataInitialised) return;
      dataInitialised = true;
      console.log('[Loopzy] bootstrapUser — setting up data for', user.id);
      setCurrentUser(user);
      await fetchAndSetProfile(user);
      subscribeUserData(user.id);
    };

    // Listen to auth changes — this is the SINGLE source of truth.
    // In Supabase JS v2+, the very first event emitted is 'INITIAL_SESSION'
    // (not 'SIGNED_IN') when a persisted session already exists.
    //
    // CRITICAL: Supabase JS v2 holds an internal session lock while the
    // onAuthStateChange callback executes. If we 'await' any .from() query
    // inside this callback we deadlock — the query waits for the lock that
    // the callback already holds. Therefore we must NOT await bootstrapUser
    // here; instead we fire-and-forget and let the listener return immediately.
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, session) => {
      console.log(`[Loopzy] onAuthStateChange event='${event}'`);

      // Ignore events during an active logout to prevent the auto-refresh
      // from silently re-logging the user back in.
      if (isLoggingOutRef.current && event !== 'SIGNED_OUT') {
        console.log(`[Loopzy] onAuthStateChange: ignoring '${event}' — logout in progress.`);
        return;
      }

      const user = session?.user ?? null;
      console.log("Authenticated user:", user);
      console.log("Auth UID:", user?.id);

      // ── Password recovery flow ───────────────────────────────────────
      // Supabase fires PASSWORD_RECOVERY when the user clicks the
      // password-reset link in their email.  We intercept it here to
      // show the ResetPassword screen instead of auto-logging in.
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[Loopzy] PASSWORD_RECOVERY detected — showing reset screen.');
        sessionStorage.setItem('loopzy_recovery', 'true');
        setShowResetPassword(true);
        setAuthLoading(false);
        return;
      }

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && user) {
        // If the user landed on a recovery session (e.g. page refresh while
        // on the reset screen), route them to ResetPassword instead of the
        // main app.
        if (sessionStorage.getItem('loopzy_recovery') === 'true') {
          console.log('[Loopzy] Recovery session detected — showing reset screen.');
          sessionStorage.removeItem('loopzy_recovery');
          setShowResetPassword(true);
          setAuthLoading(false);
          return;
        }

        // Fire-and-forget: do NOT await — releasing the auth lock is essential.
        void bootstrapUser(user).catch((err) =>
          console.error('[Loopzy] bootstrapUser failed:', err)
        );
      } else if (event === 'SIGNED_OUT') {
        dataInitialised = false;
        realtimeChannelsRef.current.forEach((ch) => supabase!.removeChannel(ch));
        realtimeChannelsRef.current = [];
        setCurrentUser(null);
        setProfile(null);
        setHabits([]);
        setLogs([]);
        setShowResetPassword(false);
        isLoggingOutRef.current = false;
      }
      setAuthLoading(false);
    });

    // Fallback: if onAuthStateChange didn't fire INITIAL_SESSION (older
    // supabase-js or edge-case), getSession ensures we still bootstrap.
    supabase!.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      if (user) {
        void bootstrapUser(user).catch((err) =>
          console.error('[Loopzy] bootstrapUser (getSession fallback) failed:', err)
        );
      }
      setAuthLoading(false);
    });

    return () => {
      dataInitialised = false;
      subscription.unsubscribe();
      realtimeChannelsRef.current.forEach((ch) => supabase!.removeChannel(ch));
    };
  }, []);

  // Fetch profile from Supabase; use onboarding_completed as the sole source of truth
  const fetchAndSetProfile = async (user: any) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Existing user — load their stored profile
        const isOnboarded = Boolean(data.onboarding_completed);
        setProfile({
          id: data.id,
          name: data.name,
          avatar: data.avatar,
          timezone: data.timezone,
          onboardingCompleted: isOnboarded,
          isPremium: data.is_premium,
          createdAt: data.created_at,
        });
        if (!isOnboarded) {
          setShowOnboarding(true);
        }
      } else {
        // Brand-new user — insert a shell profile and show onboarding
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          avatar: 'av-calm',
          primary_goal: '',
          onboarding_completed: false,
        });
        if (insertError) {
          console.warn('[Loopzy] Could not insert shell profile:', insertError.message);
        }
        setProfile({
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          avatar: 'av-calm',
          timezone: 'UTC',
          onboardingCompleted: false,
          isPremium: false,
          createdAt: new Date().toISOString(),
        });
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Supabase profile fetch error:', err);
      // DB unreachable — show onboarding to be safe (it will fail gracefully
      // with an error message when the user tries to submit)
      setProfile({
        id: user.id,
        name: user.email?.split('@')[0] || 'User',
        avatar: 'av-calm',
        timezone: 'UTC',
        onboardingCompleted: false,
        isPremium: false,
        createdAt: new Date().toISOString(),
      });
      setShowOnboarding(true);
    }
  };

  // Handle onboarding completion — writes to Supabase first, only redirects on success
  const handleOnboardingComplete = async (data: OnboardingData): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !isSupabaseEnabled || !supabase) {
      // Supabase unavailable — cannot persist, keep user on onboarding
      return { success: false, error: 'Unable to connect to the server. Please check your connection and try again.' };
    }

    try {
      // Save goals as a comma-separated string in primary_goal
      const goalsCommaSeparated = data.goals.join(',');

      const profilePayload = {
        id: currentUser.id,
        name: data.name,
        avatar: data.avatar,
        primary_goal: goalsCommaSeparated,
        onboarding_completed: true,
      };

      console.log('[Loopzy] Attempting profile save with payload:', profilePayload);

      const { error, status, statusText } = await supabase.from('profiles').upsert(
        profilePayload,
        { onConflict: 'id' }
      );

      if (error) {
        // Log the full Supabase error for debugging
        console.error('Profile save error:', error);
        console.error('[Loopzy] Supabase error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          status,
          statusText,
        });
        throw error;
      }

      console.log('[Loopzy] Profile saved to Supabase after onboarding.');

      // Update local state
      setProfile((prev) =>
        prev
          ? { ...prev, name: data.name, avatar: data.avatar, onboardingCompleted: true }
          : {
              id: currentUser.id,
              name: data.name,
              avatar: data.avatar,
              timezone: 'UTC',
              onboardingCompleted: true,
              isPremium: false,
              createdAt: new Date().toISOString(),
            }
      );

      // Delay hiding onboarding so the success animation can play (2.4s)
      setTimeout(() => setShowOnboarding(false), 2400);

      return { success: true };
    } catch (err: any) {
      console.error('Profile save error:', err);
      console.error('[Loopzy] Full error object:', JSON.stringify(err, null, 2));

      // In development, show the actual error; in production, show a generic message
      const isDev = import.meta.env.DEV;
      const userMessage = isDev
        ? `Save failed: ${err?.message || err?.code || 'Unknown error'} (check console for details)`
        : 'Failed to save your profile. Please try again.';

      return {
        success: false,
        error: userMessage,
      };
    }
  };


  // Re-fetch habits from Supabase and update state
  const refetchHabits = async (userId: string) => {
    if (!supabase) return;
    let { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error && isMissingColumnError(error)) {
      console.warn('[Loopzy] Habits fetch with created_at ordering failed; retrying without ordering.', error);
      const fallback = await supabase.from('habits').select('*').eq('user_id', userId);
      data = fallback.data;
      error = fallback.error;
    }
    if (error) {
      console.error('[Loopzy] refetchHabits error:', error);
      return;
    }
    if (data) {
      console.log('[Loopzy] refetchHabits: loaded', data.length, 'habits from DB');
      setHabits(data.map(dbRowToHabit));
    }
  };

  // Re-fetch habit_logs from Supabase and update state.
  const refetchLogs = async (_userId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('habit_logs')
      .select('*');
    if (error) {
      console.error('[Loopzy] refetchLogs error:', error);
      return;
    }
    if (data) {
      console.log('[Loopzy] refetchLogs: loaded', data.length, 'logs from DB');
      setLogs(data.map(dbRowToLog));
    }
  };

  // Live Supabase Realtime subscriptions
  const subscribeUserData = (userId: string) => {
    if (!supabase) return;

    // Initial fetch — each table is individually resilient to schema mismatches.
    const fetchAll = async () => {
      // ── 1. Habits ────────────────────────────────────────────────────────
      let habitsRes = await supabase!.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (habitsRes.error && isMissingColumnError(habitsRes.error)) {
        console.warn('[Loopzy] Habits fetch with ordering failed; retrying without.', habitsRes.error);
        habitsRes = await supabase!.from('habits').select('*').eq('user_id', userId);
      }

      // ── 2. Habit logs ────────────────────────────────────────────────────
      const logsRes = await supabase!.from('habit_logs').select('*');

      console.log('[Loopzy] Initial fetch — habits:', habitsRes.data?.length ?? 0,
        'logs:', logsRes.data?.length ?? 0);
      if (habitsRes.error) console.error('[Loopzy] Habits fetch error:', habitsRes.error);
      if (logsRes.error) console.error('[Loopzy] Logs fetch error:', logsRes.error);

      if (habitsRes.data) setHabits(habitsRes.data.map(dbRowToHabit));
      if (logsRes.data) setLogs(logsRes.data.map(dbRowToLog));
    };
    fetchAll();

    // Realtime: habits
    const habitsChannel = supabase
      .channel('habits-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${userId}` }, () => {
        refetchHabits(userId).catch((err) =>
          console.error('[Loopzy] Realtime habit refetch failed:', err)
        );
      })
      .subscribe();

    // Realtime: habit_logs
    // Note: if user_id column doesn't exist on the table, the filter is a no-op
    // and Supabase won't push events. The post-write refetchLogs() call below
    // compensates for this — any change we make ourselves is always followed by
    // a fresh read from the server.
    const logsChannel = supabase
      .channel('logs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, () => {
        refetchLogs(userId).catch((err) =>
          console.error('[Loopzy] Realtime logs refetch failed:', err)
        );
      })
      .subscribe();

    realtimeChannelsRef.current = [habitsChannel, logsChannel];
  };

  // ── DB row ↔ TypeScript type converters ──────────────────────────────────
  // Map DB row → app Habit type
  const dbRowToHabit = (row: any): Habit => {
    const frequency = (row.frequency ?? 'daily') as HabitFrequency;
    const rowCustomDays: CustomDay[] = Array.isArray(row.custom_days) ? row.custom_days : [];
    const habit = {
      id: row.id,
      userId: row.user_id,
      name: row.title ?? row.name ?? '',
      description: row.description ?? '',
      category: row.category ?? 'Mind',
      frequency,
      frequencyDays: [] as number[],
      customDays: frequency === 'custom' ? rowCustomDays : ([] as CustomDay[]),
      reminderTime: row.reminder_time ?? '08:00',
      createdAt: row.created_at,
    };

    return {
      ...habit,
      frequencyDays: scheduledDayIndexesForHabit(habit),
    };
  };

  // Map DB row → app HabitLog type.
  const dbRowToLog = (row: any): HabitLog => {
    let completedDate: string = row.completed_date ?? '';
    if (!completedDate && row.created_at) {
      completedDate = row.created_at.split('T')[0];
    }
    return {
      id: String(row.id),
      userId: row.user_id ?? '',
      habitId: row.habit_id,
      completedDate,
      completed: row.completed ?? false,
      note: row.note ?? undefined,
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    };
  };

  // Sign out and clear active state
  const handleLogout = async () => {
    console.log('[Loopzy] handleLogout() called.');

    // ── STEP 1: Mark logout in progress so onAuthStateChange ignores
    // any SIGNED_IN / TOKEN_REFRESHED events that fire concurrently.
    isLoggingOutRef.current = true;

    // ── STEP 2: Clear ALL local state immediately.
    // This gives instant UI feedback — the login screen renders NOW,
    // before any async network call completes.
    console.log('[Loopzy] Clearing local auth state...');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        console.log('[Loopzy] Removing localStorage key:', key);
        localStorage.removeItem(key);
      }
    });
    realtimeChannelsRef.current.forEach((ch) => supabase?.removeChannel(ch));
    realtimeChannelsRef.current = [];
    setCurrentUser(null);
    setProfile(null);
    setHabits([]);
    setLogs([]);
    setShowOnboarding(false);
    setAuthLoading(false);
    console.log('[Loopzy] Local state cleared — login screen should be visible now.');

    // ── STEP 3: Invalidate the server session in the background.
    // We do NOT await this — the UI is already showing the login screen.
    // A 5-second timeout prevents a hanging network call from blocking anything.
    if (isSupabaseEnabled && supabase) {
      const signOutWithTimeout = () =>
        Promise.race([
          supabase!.auth.signOut(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('signOut timed out after 5s')), 5000)
          ),
        ]);

      signOutWithTimeout()
        .then(({ error }: any) => {
          if (error) {
            console.error('[Loopzy] supabase.auth.signOut() error:', error.message);
            // Local state is already cleared — server session expiry will
            // handle invalidation on its own within the token TTL.
          } else {
            console.log('[Loopzy] Server session invalidated successfully.');
          }
        })
        .catch((err: any) => {
          console.error('[Loopzy] signOut background task failed:', err?.message || err);
        })
        .finally(() => {
          isLoggingOutRef.current = false;
        });
    } else {
      console.warn('[Loopzy] Supabase not configured — local-only logout.');
      isLoggingOutRef.current = false;
    }
  };


  // LOGS CHECK-IN COMPLETION HANDLER
  // Saves to Supabase and then re-fetches from the server so that the
  // React state always reflects what the backend has — metrics derived
  // from `logs` will therefore be identical before and after reload.
  const handleToggleCheckIn = async (habitId: string, completedDate: string, completed: boolean, note?: string) => {
    const userId = currentUser?.id || '';

    if (!currentUser || !isSupabaseEnabled || !supabase || !userId) {
      const errMsg = 'Cannot update loop completion: Supabase is not configured or user session is unavailable.';
      console.error('[Loopzy]', errMsg);
      setDevErrorBanner(errMsg);
      triggerAlertBubble('Save Failed', errMsg);
      return;
    }

    try {
      const { data: existingLog, error: findError } = await supabase
        .from('habit_logs')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completed_date', completedDate)
        .maybeSingle();

      if (findError) throw findError;

      if (existingLog?.id) {
        const { error } = await supabase
          .from('habit_logs')
          .update({ completed })
          .eq('id', existingLog.id);

        if (error) throw error;
        console.log('[Loopzy] habit_logs update OK for habit', habitId, 'completed_date', completedDate);
      } else {
        const { error } = await supabase
          .from('habit_logs')
          .insert({
            habit_id: habitId,
            completed_date: completedDate,
            completed,
          });

        if (error) throw error;
        console.log('[Loopzy] habit_logs insert OK for habit', habitId, 'completed_date', completedDate);
      }

      await refetchLogs(userId);
    } catch (err: any) {
      console.error('[Loopzy] Supabase check-in save failure:', err);
      setDevErrorBanner(`Loop completion save failed: ${err?.message || err}`);
      triggerAlertBubble('Save Failed', err?.message || 'Unable to save loop completion.');
      await refetchLogs(userId);
      return;
    }

    if (completed) {
      const hName = habits.find((h) => h.id === habitId)?.name || 'Loop';
      triggerAlertBubble(`Checked: ${hName}! 🎉`, note ? `"${note}" added in journal.` : 'Consistency nurtures emotional balance. Excellent step!');
    }
  };

  const formatSupabaseError = (error: any) => {
    if (!error) return 'Unknown Supabase error';
    return JSON.stringify(
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
      null,
      2
    );
  };

  const isMissingColumnError = (error: any) =>
    error?.code === 'PGRST204' ||
    error?.code === 'PGRST205' ||
    error?.code === '42703' ||
    /column|schema cache|does not exist/i.test(`${error?.message || ''} ${error?.details || ''}`);

  // Detects PostgreSQL error 22P02: "invalid input syntax for type uuid"
  const isUuidTypeError = (error: any) =>
    error?.code === '22P02' ||
    /invalid input syntax for type uuid/i.test(`${error?.message || ''} ${error?.details || ''}`);

  const getAuthenticatedSupabaseUser = async () => {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Supabase auth user error:', error);
      return null;
    }
    console.log("Authenticated user:", data.user);
    console.log("Auth UID:", data.user?.id);
    return data.user;
  };

  // HABIT CREATION OR REFINEMENT
  const handleSaveHabit = async (habitData: {
    name: string;
    description: string;
    category: HabitCategory;
    frequency: HabitFrequency;
    frequencyDays: number[];
    customDays: Habit['customDays'];
    reminderTime: string;
  }): Promise<{ success: boolean; error?: string }> => {
    console.log('[Loopzy] handleSaveHabit — started');

    if (!currentUser?.id || !isSupabaseEnabled || !supabase) {
      const errMsg = 'Cannot save loop: Supabase is not configured or user session is unavailable.';
      console.error('[Loopzy]', errMsg);
      setDevErrorBanner(errMsg);
      triggerAlertBubble('Save Failed', errMsg);
      return { success: false, error: errMsg };
    }

    const authUser = await getAuthenticatedSupabaseUser();
    if (!authUser?.id) {
      const errMsg = 'Cannot save loop: no authenticated Supabase session found. Please log out and sign in again.';
      console.error('[Loopzy]', errMsg);
      setDevErrorBanner(errMsg);
      triggerAlertBubble('Save Failed', errMsg);
      return { success: false, error: errMsg };
    }

    const userId = authUser.id;
    const existingHabit = editingHabit;
    const isEditing = Boolean(existingHabit);

    // ── Build custom_days for ALL frequency types ──
    let resolvedCustomDays: CustomDay[];
    switch (habitData.frequency) {
      case 'daily':
        resolvedCustomDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        break;
      case 'weekdays':
        resolvedCustomDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        break;
      case 'weekends':
        resolvedCustomDays = ['saturday', 'sunday'];
        break;
      case 'custom':
        resolvedCustomDays = habitData.customDays;
        break;
      default:
        resolvedCustomDays = [];
    }

    console.log('[Loopzy] Save payload:', {
      frequency: habitData.frequency,
      custom_days: resolvedCustomDays,
    });

    const payload: Record<string, any> = {
      user_id: userId,
      title: habitData.name,
      description: habitData.description,
      category: habitData.category,
      frequency: habitData.frequency,
      custom_days: resolvedCustomDays,
      reminder_time: habitData.reminderTime,
    };
    if (!isEditing) {
      payload.created_at = new Date().toISOString();
    }

    const saveHabitRow = async (p: Record<string, any>) => {
      console.log('[Loopzy] About to call Supabase with payload:', JSON.stringify(p, null, 2));
      console.log('[Loopzy] Operation:', isEditing ? 'UPDATE' : 'INSERT');
      const op = isEditing
        ? supabase
            .from('habits')
            .update(p)
            .eq('id', existingHabit!.id)
            .eq('user_id', userId)
            .select()
            .maybeSingle()
        : supabase.from('habits').insert(p).select().single();
      const res = await op;
      console.log('[Loopzy] Raw Supabase response:', JSON.stringify(res, null, 2));
      return res;
    };

    try {
      const start = Date.now();
      const result = await saveHabitRow(payload);

      console.log(isEditing ? '[Loopzy] Update finished' : '[Loopzy] Insert finished');
      console.log('[Loopzy] Duration', Date.now() - start);
      console.log('[Loopzy] Supabase result.data:', result.data);
      console.log('[Loopzy] Supabase result.error:', result.error);

      const { data, error } = result;

      if (error) {
        const exactError = formatSupabaseError(error);
        const errMsg = `Loop save failed: ${exactError}`;
        console.error('[Loopzy] Habit save error:', error);
        console.error('[Loopzy] Payload that failed:', payload);
        setDevErrorBanner(errMsg);
        triggerAlertBubble('Save Failed', exactError);
        return { success: false, error: error.message || 'Loop save failed.' };
      }

      if (!data) {
        const errMsg = `Save completed but no row was returned. This may indicate a column mismatch or RLS issue. Payload keys: ${Object.keys(payload).join(', ')}`;
        console.error('[Loopzy] No data returned after save. Payload:', JSON.stringify(payload, null, 2));
        console.error('[Loopzy] Result object:', JSON.stringify(result, null, 2));
        setDevErrorBanner(errMsg);
        triggerAlertBubble('Save Issue', 'Loop saved but data could not be verified. Check console logs.');
        return { success: false, error: errMsg };
      }

      console.log('[Loopzy] Saved habit data from DB:', JSON.stringify(data, null, 2));
      console.log('[Loopzy] data.frequency:', data.frequency);
      console.log('[Loopzy] data.custom_days:', data.custom_days);

      const savedHabit = dbRowToHabit(data);
      setHabits((prev) =>
        isEditing
          ? prev.map((habit) => (habit.id === savedHabit.id ? savedHabit : habit))
          : [savedHabit, ...prev.filter((habit) => habit.id !== savedHabit.id)]
      );

      setDevErrorBanner(null);
      setShowHabitForm(false);
      setEditingHabit(null);

      triggerAlertBubble('Loop saved successfully', `"${habitData.name}" has been mapped into trackers successfully.`);

      // Request notification permission after the user creates their first
      // loop so the browser reminder checker can work.
      if (!isEditing && habits.length === 0) {
        requestNotificationPermission();
      }

      await refetchHabits(userId);
      return { success: true };
    } catch (err: any) {
      console.error('[Loopzy] Supabase habit save error:', err);
      console.error('[Loopzy] Payload that failed:', payload);
      const errMsg = `Loop save exception: ${err?.message || err}`;
      setDevErrorBanner(errMsg);
      triggerAlertBubble('Save Failed', err?.message || 'Unknown error');
      return { success: false, error: err?.message || 'Unable to save this loop. Please try again.' };
    }
  };

  const closeDeleteModal = () => {
    setShowHabitForm(false);
    setEditingHabit(null);
  };

  // DELETE HABIT ACTION
  const deleteHabit = async (habitId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setDeleting(true);

      console.log("DELETE START", habitId);

      if (!currentUser || !isSupabaseEnabled || !supabase) {
        throw new Error('Unable to connect to the server. Please sign in and try again.');
      }

      const { data, error } = await supabase
        .from("habits")
        .delete()
        .eq("id", habitId)
        .select();

      console.log("DELETE DATA", data);
      console.log("DELETE ERROR", error);

      if (error) throw error;

      setHabits(prev =>
        prev.filter(habit => habit.id !== habitId)
      );
      setLogs(prev => prev.filter(log => log.habitId !== habitId));

      closeDeleteModal();
      triggerAlertBubble('Loop Deleted', 'The loop has been removed.');

      return { success: true };
    } catch (err: any) {
      console.error("DELETE FAILED", err);
      alert(err.message || "Delete failed");
      return { success: false, error: err?.message || 'Delete failed' };
    } finally {
      setDeleting(false);
    }
  };

  // UPGRADE PLAN MOCK
  const handleUpgradeMock = () => {
    if (!profile) return;
    const final = { ...profile, isPremium: true };
    setProfile(final);

    if (currentUser && isSupabaseEnabled && supabase) {
      supabase.from('profiles').update({ is_premium: true }).eq('id', profile.id);
    }

    triggerAlertBubble('Access Unlocked! ✨', 'You are now a Loopzy Premium Master. Unlimited Export Reports activated!');
  };

  // SETTINGS HANDLERS
  const handleUpdateProfile = async (data: { name: string; avatar: string }): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.id || !isSupabaseEnabled || !supabase) {
      return { success: false, error: 'Cannot save profile: not connected.' };
    }
    try {
      const { error } = await supabase.from('profiles').upsert(
        { id: currentUser.id, name: data.name, avatar: data.avatar },
        { onConflict: 'id' }
      );
      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, name: data.name, avatar: data.avatar } : prev));
      return { success: true };
    } catch (err: any) {
      console.error('[Loopzy] Profile update error:', err);
      return { success: false, error: err?.message || 'Failed to update profile.' };
    }
  };

  const handleChangePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseEnabled || !supabase) {
      return { success: false, error: 'Cannot change password: not connected.' };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      triggerAlertBubble('Password Updated', 'Your password has been changed successfully.');
      return { success: true };
    } catch (err: any) {
      console.error('[Loopzy] Password change error:', err);
      return { success: false, error: err?.message || 'Failed to change password.' };
    }
  };

  const handleChangeEmail = async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseEnabled || !supabase) {
      return { success: false, error: 'Cannot change email: not connected.' };
    }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      triggerAlertBubble('Verification Sent', 'Check your inbox to confirm the new email.');
      return { success: true };
    } catch (err: any) {
      console.error('[Loopzy] Email change error:', err);
      return { success: false, error: err?.message || 'Failed to update email.' };
    }
  };

  const handleDeleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.id || !isSupabaseEnabled || !supabase) {
      console.error('[Loopzy] Cannot delete account: no user, Supabase disabled, or no client.');
      return { success: false, error: 'Cannot delete account: not connected.' };
    }

    const uid = currentUser.id;
    console.log('[Loopzy] === Account deletion started ===');
    console.log('[Loopzy] User ID:', uid);

    try {
      // ── Step 1: Delete application data (while session is still valid) ──
      console.log('[Loopzy] Step 1 — Removing application data...');

      const tables = [
        { name: 'habit_logs', query: supabase.from('habit_logs').delete().eq('user_id', uid) },
        { name: 'habits',     query: supabase.from('habits').delete().eq('user_id', uid) },
        { name: 'reminders',  query: supabase.from('reminders').delete().eq('user_id', uid) },
        { name: 'profiles',   query: supabase.from('profiles').delete().eq('id', uid) },
      ];

      for (const { name, query } of tables) {
        const { error: delErr } = await query;
        if (delErr) {
          console.error(`[Loopzy] Delete from ${name} failed:`, delErr);
          // Non-fatal — continue to try the RPC anyway.
        } else {
          console.log(`[Loopzy] Deleted from ${name} successfully.`);
        }
      }

      // ── Step 2: Delete the auth user via RPC ──
      console.log('[Loopzy] Step 2 — Calling delete_user_account RPC...');
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user_account');
      console.log('[Loopzy] RPC response received.');
      console.log('[Loopzy] RPC data:', rpcData);
      console.log('[Loopzy] RPC error object:', JSON.stringify(rpcError, null, 2));

      if (rpcError) {
        console.error('[Loopzy] RPC failed — code:', rpcError.code);
        console.error('[Loopzy] RPC failed — message:', rpcError.message);
        console.error('[Loopzy] RPC failed — details:', rpcError.details);
        console.error('[Loopzy] RPC failed — hint:', rpcError.hint);
        throw rpcError;
      }
      console.log('[Loopzy] Auth user deleted successfully.');

      // ── Step 3: Wipe client-side storage ──
      console.log('[Loopzy] Step 3 — Clearing client-side storage...');
      let removedCount = 0;
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('loopzy_') || key.startsWith('sb-')) {
          console.log('[Loopzy]  Removing localStorage:', key);
          localStorage.removeItem(key);
          removedCount++;
        }
      });
      sessionStorage.clear();
      console.log(`[Loopzy] Removed ${removedCount} localStorage keys.`);

      // ── Step 4: Sign out — the Auth screen will render ──
      console.log('[Loopzy] Step 4 — Signing out...');
      await handleLogout();
      console.log('[Loopzy] === Account deletion complete ===');
      return { success: true };
    } catch (err: any) {
      console.error('[Loopzy] === Account deletion FAILED ===');
      console.error('[Loopzy] Error:', err);
      if (err?.message)  console.error('[Loopzy]  message:', err.message);
      if (err?.code)     console.error('[Loopzy]  code:', err.code);
      if (err?.details)  console.error('[Loopzy]  details:', err.details);
      if (err?.hint)     console.error('[Loopzy]  hint:', err.hint);
      return { success: false, error: err?.message || 'Failed to delete account.' };
    }
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      profile: profile ? { name: profile.name, avatar: profile.avatar } : null,
      habits: habits.map((h) => ({
        name: h.name,
        category: h.category,
        frequency: h.frequency,
        createdAt: h.createdAt,
      })),
      logs: logs.map((l) => ({
        habitId: l.habitId,
        completedDate: l.completedDate,
        completed: l.completed,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loopzy-export-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerAlertBubble('Data Exported', 'Your loops and logs have been downloaded.');
  };

  // PUSH ALERTS SIMULATOR LOGIC
  const triggerAlertBubble = (title: string, body: string) => {
    const id = `push-${Date.now()}`;
    const newAlert = { id, title, body };
    setPushAlerts((prev) => [...prev, newAlert]);

    // Automatically dismiss push alert after 4.5 seconds
    setTimeout(() => {
      setPushAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 4500);
  };

  const activeHabitsForShell = habits;
  const shellCurrentStreak = activeHabitsForShell.length
    ? Math.max(...activeHabitsForShell.map((habit) => computeHabitMetrics(habit, logs, todayStr).currentStreak))
    : 0;
  const shellConsistencyScore = calculateConsistencyScore(activeHabitsForShell, logs, todayStr);

  // ── Auth callback detection ──────────────────────────────────────────
  // When Supabase redirects back after email confirmation, the URL will
  // contain auth tokens (hash or query params).  We intercept those here
  // and let the AuthCallback component handle session recovery.
  const isAuthCallback = (
    window.location.pathname.includes('/auth/callback') ||
    (window.location.hash && window.location.hash.includes('access_token')) ||
    (window.location.search && window.location.search.includes('code='))
  );

  if (isAuthCallback) {
    return <AuthCallback />;
  }

  return (
    <div className="min-h-screen overflow-x-hidden font-sans transition-colors duration-300 relative flex flex-col md:flex-row pb-16 md:pb-0"
      style={{ backgroundColor: 'var(--app-surface)', color: 'var(--app-text)' }}>

      {/* Offline detector banner */}
      <OfflineDetector />

      {/* PWA install prompt */}
      <PwaInstall />

      {/* Development error banner — shows exact Supabase errors */}
      {devErrorBanner && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white px-4 py-3 text-sm font-mono flex items-center justify-between shadow-lg">
          <span>⚠️ {devErrorBanner}</span>
          <button
            onClick={() => setDevErrorBanner(null)}
            className="ml-4 px-2 py-1 bg-red-800 hover:bg-red-900 rounded text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* 4. MOCK FLOATING PUSH BANNER ANCHOR */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none select-none max-w-sm w-full p-2">
        <AnimatePresence>
          {pushAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="bg-slate-900/90 dark:bg-slate-900 border border-slate-850/50 p-4 rounded-2xl shadow-2xl flex items-start gap-3 pointer-events-auto backdrop-blur-md"
            >
              <div className="p-2 bg-teal-500 rounded-xl text-white shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h5 className="text-xs font-black text-white">{alert.title}</h5>
                <p className="text-[10px] text-slate-350 leading-relaxed mt-0.5">{alert.body}</p>
              </div>
              <button
                onClick={() => setPushAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                className="text-slate-450 hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* RENDER RESET PASSWORD SCREEN BEFORE AUTH */}
      {showResetPassword ? (
        <ResetPassword onComplete={() => setShowResetPassword(false)} />
      ) : !currentUser ? (
        <div className="w-full min-h-screen flex items-center justify-center">
          <Auth
            onAuthSuccess={() => {
              // onAuthStateChange('SIGNED_IN') handles setting currentUser.
              // Nothing extra needed here — the state update triggers re-render.
              console.log('[Loopzy] Auth success callback fired.');
            }}
          />
        </div>
      ) : showOnboarding ? (
        <Onboarding onComplete={handleOnboardingComplete} />
      ) : (
        <>
          {/* 5. COZY DESKTOP SIDEBAR DRAWER PANEL (Screen scale limits) */}
          <aside className="hidden md:flex h-dvh min-h-0 w-72 shrink-0 flex-col justify-between overflow-y-auto border-r border-white/8 bg-[#030712] p-6 shadow-[18px_0_70px_rgba(0,0,0,0.28)]">
            <div className="space-y-6">
              
              {/* BRAND HEADER */}
              <div className="flex items-center h-20 mb-8 px-1">
                <img
                  src={loopzyLogoLight}
                  alt="Loopzy logo"
                  className="w-[200px] max-w-full h-auto object-contain shrink-0 dark:hidden"
                />
                <img
                  src={loopzyLogoDark}
                  alt="Loopzy logo"
                  className="hidden w-[200px] max-w-full h-auto object-contain shrink-0 dark:block"
                />
              </div>

              {/* NAVIGATION INDEX */}
              <nav className="space-y-2">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: CheckCircle },
                  { id: 'myloops', label: 'My Loops', icon: List },
                  { id: 'analytics', label: 'Insights', icon: Calendar },
                  { id: 'reports', label: 'Reports', icon: Download },
                  { id: 'settings', label: 'Settings', icon: SettingsIcon },
                ].map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full text-left py-3 px-4 rounded-2xl font-semibold text-sm flex items-center gap-3 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                        isActive
                          ? 'bg-white text-slate-950 shadow-[0_12px_34px_rgba(99,102,241,0.2)]'
                          : 'text-slate-400 hover:bg-white/[0.055] hover:text-white'
                      }`}
                      id={`sidebar-nav-btn-${item.id}`}
                    >
                      <Icon className="w-5 h-5 shrink-0" /> {item.label}
                    </button>
                  );
                })}
              </nav>

            </div>

            {/* LOWER SIDEBAR SECTION */}
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="rounded-3xl border border-white/8 bg-white/[0.045] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:border-white/12">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-black text-white">
                    {profile?.avatar && AVATAR_MAP[profile.avatar] ? (
                      <img
                        src={AVATAR_MAP[profile.avatar]}
                        alt={profile.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={profile?.avatar && AVATAR_MAP[profile.avatar] ? 'hidden' : ''}>
                      {getInitials(profile?.name)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white truncate leading-tight">{profile?.name || 'User'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser?.email || ''}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Log out"
                    className="h-10 w-10 shrink-0 rounded-full bg-white/[0.06] flex items-center justify-center text-slate-400 hover:bg-rose-400/16 hover:text-rose-300 cursor-pointer transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Theme switcher */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-full text-left p-3 bg-white/[0.045] hover:bg-white/[0.075] rounded-2xl flex items-center justify-between text-xs font-semibold cursor-pointer border border-white/8 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                id="sidebar-theme-toggle"
              >
                <div className="flex items-center gap-2 text-slate-300">
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-brand-500" />}
                  <span>{isDarkMode ? 'Light Preview' : 'Dark Mode'}</span>
                </div>
                <span className="text-[9px] font-mono bg-black/20 py-0.5 px-1.5 rounded-md text-slate-500">Mode</span>
              </button>
            </div>
          </aside>

          {/* 6. COZY MOBILE BOTTOM DOCK NAVIGATION BAR (Screen scale limits) */}
          <nav className="md:hidden fixed bottom-1.5 left-2.5 right-2.5 bg-slate-900/90 dark:bg-slate-900 border border-slate-850/50 h-14 rounded-2xl flex items-center justify-around p-1 shadow-2xl z-40 backdrop-blur-md">
            {[
              { id: 'dashboard', label: 'Checklist', icon: CheckCircle },
              { id: 'myloops', label: 'Loops', icon: List },
              { id: 'analytics', label: 'Metrics', icon: Calendar },
              { id: 'reports', label: 'Reports', icon: FileText },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition cursor-pointer select-none ${
                    isActive ? 'text-brand-300 font-extrabold' : 'text-slate-400'
                  }`}
                  id={`mobile-nav-btn-${item.id}`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[8px] font-mono mt-0.5 select-none">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 7. SCULPTED VIEWPORT CONTENT BODY SCREEN */}
          <main className="min-w-0 flex-1 p-4 md:h-dvh md:overflow-y-auto md:p-8">
            {/* Mobile Header Bar */}
            <div className="md:hidden flex items-center justify-between border-b border-white/8 pb-3 text-slate-100">
              <div className="flex items-center gap-1.5">
                <img
                  src={loopzyLogoLight}
                  alt="Loopzy logo"
                  className="h-11 w-auto max-w-[160px] object-contain shrink-0 dark:hidden"
                />
                <img
                  src={loopzyLogoDark}
                  alt="Loopzy logo"
                  className="hidden h-11 w-auto max-w-[160px] object-contain shrink-0 dark:block"
                />
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-1.5 rounded-full hover:bg-white/[0.08] transition cursor-pointer text-slate-300"
                  id="mobile-theme-toggle"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Log out"
                  title="Log out"
                  className="p-1.5 rounded-full hover:bg-rose-400/10 transition cursor-pointer text-slate-300 hover:text-rose-300"
                  id="mobile-profile-direct-toggle"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB-CORRESPONDING CORE ENGINE RENDERS */}
            <div className="mx-auto max-w-6xl pb-10 font-sans leading-relaxed md:pb-0">
              {activeTab === 'dashboard' && (
                <Dashboard
                  username={profile?.name || 'User'}
                  isPremium={profile?.isPremium || false}
                  habits={habits}
                  logs={logs}
                  todayStr={todayStr}
                  onLogout={handleLogout}
                   onCreateHabit={() => {
                    setEditingHabit(null);
                    setPrefillData(null);
                    setShowHabitForm(true);
                  }}
                  onCreateHabitWithName={(name: string, category?: HabitCategory) => {
                    setEditingHabit(null);
                    setPrefillData({ name, category });
                    setShowHabitForm(true);
                  }}
                  onEditHabit={(h) => {
                    setEditingHabit(h);
                    setShowHabitForm(true);
                  }}
                  onDeleteHabit={deleteHabit}
                  onToggleCheckIn={handleToggleCheckIn}
                  onUpgradeToPremium={handleUpgradeMock}
                  onNavigateToInsights={() => setActiveTab('analytics')}
                />
              )}

              {activeTab === 'myloops' && (
                <MyLoops
                  habits={habits}
                  logs={logs}
                  todayStr={todayStr}
                  onEditHabit={(h) => {
                    setEditingHabit(h);
                    setShowHabitForm(true);
                  }}
                  onDeleteHabit={deleteHabit}
                  onCreateHabit={() => {
                    setEditingHabit(null);
                    setPrefillData(null);
                    setShowHabitForm(true);
                  }}
                />
              )}

              {activeTab === 'analytics' && (
                <Analytics
                  habits={habits}
                  logs={logs}
                  todayStr={todayStr}
                />
              )}

              {activeTab === 'reports' && (
                <ExportPanel
                  habits={habits}
                  logs={logs}
                  todayStr={todayStr}
                  username={profile?.name || 'Explorer'}
                  isPremiumUser={profile?.isPremium || false}
                  onUpgradeToPremium={handleUpgradeMock}
                />
              )}

              {activeTab === 'settings' && (
                <Settings
                  profile={profile}
                  currentUser={currentUser as { email?: string } | null}
                  isDarkMode={isDarkMode}
                  onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                  onUpdateProfile={handleUpdateProfile}
                  onChangePassword={handleChangePassword}
                  onChangeEmail={handleChangeEmail}
                  onDeleteAccount={handleDeleteAccount}
                  onExportData={handleExportData}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </main>

          {/* 8. GENERAL MODAL CARD: CREATE / EDIT HABIT FORM */}
          <AnimatePresence>
            {showHabitForm && (
              <HabitForm
                habit={editingHabit}
                prefillData={prefillData}
                onSave={handleSaveHabit}
                onDelete={deleteHabit}
                onClose={() => {
                  setShowHabitForm(false);
                  setEditingHabit(null);
                  setPrefillData(null);
                }}
              />
            )}
          </AnimatePresence>

        </>
      )}
    </div>
  );
}
