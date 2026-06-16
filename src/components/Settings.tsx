/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  User,
  Bell,
  Palette,
  Shield,
  Moon,
  Sun,
  LogOut,
  Trash2,
  Download,
  Check,
  X,
  Camera,
  Save,
  Sparkles,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ChevronRight,
  Flame,
  Target,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { UserProfile } from '../types';
import avatarStudentMale from '../../Avatar/male avatar 2.png';
import avatarStudentFemale from '../../Avatar/male avatar 8.png';
import avatarProfMale from '../../Avatar/male avatar 1.png';
import avatarProfFemale from '../../Avatar/male avatar 6.png';
import avatarCreator from '../../Avatar/male avatar 4.png';
import avatarEntrepreneur from '../../Avatar/male avatar.png';

const AVATAR_OPTIONS: { id: string; label: string; image: string; gradient: string }[] = [
  { id: 'student-male', label: 'Student Male', image: avatarStudentMale, gradient: 'from-blue-400 to-cyan-400' },
  { id: 'student-female', label: 'Student Female', image: avatarStudentFemale, gradient: 'from-pink-400 to-rose-400' },
  { id: 'professional-male', label: 'Professional Male', image: avatarProfMale, gradient: 'from-indigo-400 to-blue-500' },
  { id: 'professional-female', label: 'Professional Female', image: avatarProfFemale, gradient: 'from-violet-400 to-purple-500' },
  { id: 'creator', label: 'Creator', image: avatarCreator, gradient: 'from-orange-400 to-amber-400' },
  { id: 'entrepreneur', label: 'Entrepreneur', image: avatarEntrepreneur, gradient: 'from-emerald-400 to-teal-400' },
];

const AVATAR_MAP: Record<string, string> = Object.fromEntries(
  AVATAR_OPTIONS.map((a) => [a.id, a.image])
);

const NOTIF_KEYS = {
  habitReminders: 'loopzy_settings_notif_habit_reminders',
  dailySummary: 'loopzy_settings_notif_daily_summary',
  streakReminder: 'loopzy_settings_notif_streak_reminder',
} as const;

function loadNotificationSettings() {
  return {
    habitReminders: localStorage.getItem(NOTIF_KEYS.habitReminders) !== 'false',
    dailySummary: localStorage.getItem(NOTIF_KEYS.dailySummary) !== 'false',
    streakReminder: localStorage.getItem(NOTIF_KEYS.streakReminder) !== 'false',
  };
}

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

function PremiumCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/8 bg-[#0F172A]/88 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 ${checked ? 'bg-indigo-500' : 'bg-white/10'}`}
      role="switch"
      aria-checked={checked}
      id={id}
    >
      <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
    </button>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      <span className="h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
      <span className="h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
      <span className="h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

interface SettingsProps {
  profile: UserProfile | null;
  currentUser: { email?: string } | null;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onUpdateProfile: (data: { name: string; avatar: string }) => Promise<{ success: boolean; error?: string }>;
  onChangePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  onChangeEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteAccount: () => Promise<{ success: boolean; error?: string }>;
  onExportData: () => void;
  onLogout: () => void;
}

export default function Settings({
  profile,
  currentUser,
  isDarkMode,
  onToggleTheme,
  onUpdateProfile,
  onChangePassword,
  onChangeEmail,
  onDeleteAccount,
  onExportData,
  onLogout,
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState('profile');
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [notifications, setNotifications] = useState(loadNotificationSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.name || '');
    setSelectedAvatar(profile?.avatar || '');
  }, [profile]);

  useEffect(() => {
    setEmail(currentUser?.email || '');
  }, [currentUser]);

  const handleNotificationChange = (key: keyof typeof NOTIF_KEYS) => (value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(NOTIF_KEYS[key], String(value));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    const result = await onUpdateProfile({ name: displayName, avatar: selectedAvatar });
    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated.' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile.' });
    }
    setSaving(false);
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || email === currentUser?.email) {
      setShowEmailForm(false);
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await onChangeEmail(email.trim());
    if (result.success) {
      setMessage({ type: 'success', text: 'Verification email sent. Check your inbox.' });
      setShowEmailForm(false);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update email.' });
    }
    setSaving(false);
  };

  const handleSavePassword = async () => {
    if (!newPassword.trim()) {
      setMessage({ type: 'error', text: 'New password is required.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await onChangePassword(newPassword);
    if (result.success) {
      setMessage({ type: 'success', text: 'Password changed.' });
      setNewPassword('');
      setShowPasswordForm(false);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to change password.' });
    }
    setSaving(false);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    const result = await onDeleteAccount();
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Failed to delete account.' });
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const SECTIONS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'pwa', label: 'PWA', icon: Smartphone },
  ];

  const renderSectionPills = () => (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Settings sections">
      {SECTIONS.map((section) => {
        const active = activeSection === section.id;
        const Icon = section.icon;
        return (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              active
                ? 'border-indigo-400/40 bg-indigo-500 text-white shadow-[0_0_26px_rgba(99,102,241,0.28)]'
                : 'border-white/8 bg-white/[0.035] text-slate-400 hover:border-white/16 hover:text-white'
            }`}
            id={`settings-section-pill-${section.id}`}
          >
            <Icon className="h-4 w-4" />
            {section.label}
          </button>
        );
      })}
    </div>
  );

  const renderAvatarPicker = () => (
    <AnimatePresence>
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAvatarPicker(false)}
            aria-label="Close avatar picker"
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F172A] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-picker-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="avatar-picker-title" className="text-lg font-black text-white">Choose Avatar</h3>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 hover:bg-white/[0.06] hover:text-white transition focus:outline-none focus:ring-2 focus:ring-indigo-300"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {AVATAR_OPTIONS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => {
                      setSelectedAvatar(avatar.id);
                      setShowAvatarPicker(false);
                    }}
                    className={`relative rounded-2xl border-2 p-2 transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
                      isSelected
                        ? 'border-indigo-400 bg-indigo-500/10'
                        : 'border-white/8 bg-white/[0.035] hover:border-white/16'
                    }`}
                  >
                    <div className={`aspect-square rounded-xl bg-gradient-to-br ${avatar.gradient} grid place-items-center`}>
                      <img src={avatar.image} alt={avatar.label} className="h-full w-full rounded-xl object-cover" />
                    </div>
                    {isSelected && (
                      <div className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-indigo-500 text-white shadow">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowAvatarPicker(false)}
              className="mt-4 w-full rounded-2xl border border-white/8 bg-white/[0.04] py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.07]"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderDeleteConfirm = () => (
    <AnimatePresence>
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
            aria-label="Cancel delete"
          />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-[#0F172A] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-400/12 text-rose-300">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 id="delete-account-title" className="mt-4 text-lg font-black text-white">Delete Account?</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              This will permanently remove your account and all Loopzy data.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-2xl border border-white/8 bg-white/[0.04] py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 py-2.5 text-xs font-black text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderProfileSection = () => (
    <PremiumCard>
      <div className="flex items-center gap-2 mb-5">
        <User className="h-4 w-4 text-indigo-300" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Profile</h2>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setShowAvatarPicker(true)}
          className="group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 transition focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {selectedAvatar && AVATAR_MAP[selectedAvatar] ? (
            <img src={AVATAR_MAP[selectedAvatar]} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-black text-white">{getInitials(displayName || profile?.name)}</span>
          )}
          <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </button>
        <div>
          <p className="text-sm font-black text-white">{displayName || 'Your Name'}</p>
          <p className="text-xs text-slate-400">Click to change avatar</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            className="w-full rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            id="settings-display-name"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</label>
          {showEmailForm ? (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="new@email.com"
                className="flex-1 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                id="settings-email-input"
              />
              <button
                onClick={handleSaveEmail}
                disabled={saving}
                className="rounded-2xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                {saving ? <LoadingDots /> : 'Save'}
              </button>
              <button
                onClick={() => setShowEmailForm(false)}
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.07]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-2.5">
              <span className="text-sm text-slate-300">{currentUser?.email || 'Not signed in'}</span>
              <button
                onClick={() => setShowEmailForm(true)}
                className="text-xs font-black text-indigo-300 hover:text-indigo-200 transition"
              >
                Change
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</label>
          {showPasswordForm ? (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  id="settings-new-password"
                />
                <button
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSavePassword}
                  disabled={saving}
                  className="rounded-2xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white transition hover:bg-indigo-400 disabled:opacity-50"
                >
                  {saving ? <LoadingDots /> : 'Change'}
                </button>
                <button
                  onClick={() => { setShowPasswordForm(false); setNewPassword(''); }}
                  className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.07]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="w-full rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/[0.06]"
            >
              Set new password
            </button>
          )}
        </div>
      </div>

      <button
        onClick={handleSaveProfile}
        disabled={saving}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.02] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save Profile'}
      </button>
    </PremiumCard>
  );

  const renderNotificationsSection = () => (
    <PremiumCard>
      <div className="flex items-center gap-2 mb-5">
        <Bell className="h-4 w-4 text-indigo-300" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Notifications</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">Loop Reminders</p>
            <p className="text-xs text-slate-400 mt-0.5">Get reminded to complete your daily loops</p>
          </div>
          <Toggle
            checked={notifications.habitReminders}
            onChange={handleNotificationChange('habitReminders')}
            id="settings-toggle-habit-reminders"
          />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">Daily Summary</p>
            <p className="text-xs text-slate-400 mt-0.5">Receive a daily summary of your progress</p>
          </div>
          <Toggle
            checked={notifications.dailySummary}
            onChange={handleNotificationChange('dailySummary')}
            id="settings-toggle-daily-summary"
          />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">Streak Reminder</p>
            <p className="text-xs text-slate-400 mt-0.5">Get notified when your streak is at risk</p>
          </div>
          <Toggle
            checked={notifications.streakReminder}
            onChange={handleNotificationChange('streakReminder')}
            id="settings-toggle-streak-reminder"
          />
        </div>
      </div>
    </PremiumCard>
  );

  const renderAppearanceSection = () => (
    <PremiumCard>
      <div className="flex items-center gap-2 mb-5">
        <Palette className="h-4 w-4 text-indigo-300" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Appearance</h2>
      </div>

      <p className="text-xs text-slate-400 mb-4">Choose your preferred theme for the dashboard.</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => !isDarkMode && onToggleTheme()}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
            !isDarkMode
              ? 'border-indigo-400/40 bg-indigo-500/10'
              : 'border-white/8 bg-white/[0.035] hover:border-white/16'
          }`}
        >
          <Sun className={`h-8 w-8 ${!isDarkMode ? 'text-amber-400' : 'text-slate-500'}`} />
          <span className={`text-xs font-black ${!isDarkMode ? 'text-white' : 'text-slate-400'}`}>Light Mode</span>
        </button>
        <button
          onClick={() => isDarkMode && onToggleTheme()}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
            isDarkMode
              ? 'border-indigo-400/40 bg-indigo-500/10'
              : 'border-white/8 bg-white/[0.035] hover:border-white/16'
          }`}
        >
          <Moon className={`h-8 w-8 ${isDarkMode ? 'text-indigo-300' : 'text-slate-500'}`} />
          <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-400'}`}>Dark Mode</span>
        </button>
      </div>
    </PremiumCard>
  );

  const [pwaInstallState, setPwaInstallState] = useState<'installed' | 'available' | 'unavailable'>('unavailable');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setPwaInstallState('installed');
      return;
    }

    const handler = () => setPwaInstallState('available');
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => setPwaInstallState('installed'));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handlePwaInstall = async () => {
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as any;
      promptEvent.prompt();
      promptEvent.userChoice.then((choice: { outcome: string }) => {
        if (choice.outcome === 'accepted') setPwaInstallState('installed');
      });
      window.removeEventListener('beforeinstallprompt', handler);
    };
    window.dispatchEvent(new Event('beforeinstallprompt'));
  };

  const renderPwaSection = () => (
    <PremiumCard>
      <div className="flex items-center gap-2 mb-5">
        <Smartphone className="h-4 w-4 text-indigo-300" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">PWA</h2>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-3">
          <div className="flex items-center gap-3">
            {isOnline ? <Wifi className="h-5 w-5 text-emerald-400" /> : <WifiOff className="h-5 w-5 text-amber-400" />}
            <div>
              <p className="text-sm font-black text-white">Connection</p>
              <p className="text-xs text-slate-400">{isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${isOnline ? 'border-emerald-400/30 text-emerald-400' : 'border-amber-400/30 text-amber-400'}`}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-3">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-indigo-300" />
            <div>
              <p className="text-sm font-black text-white">App Status</p>
              <p className="text-xs text-slate-400">
                {pwaInstallState === 'installed' ? 'Installed on device' : pwaInstallState === 'available' ? 'Ready to install' : 'Not available'}
              </p>
            </div>
          </div>
          {pwaInstallState === 'available' && (
            <button
              onClick={handlePwaInstall}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-black text-white transition hover:bg-indigo-400"
            >
              Install
            </button>
          )}
          {pwaInstallState === 'installed' && (
            <span className="rounded-full border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
              Installed
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-white/6 bg-white/[0.025] px-4 py-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-black text-white">Version</p>
              <p className="text-xs text-slate-400">0.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </PremiumCard>
  );

  const renderAccountSection = () => (
    <PremiumCard>
      <div className="flex items-center gap-2 mb-5">
        <Shield className="h-4 w-4 text-indigo-300" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Account</h2>
      </div>

      <div className="space-y-3">
        <button
          onClick={onExportData}
          className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-left transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-indigo-300" />
            <div>
              <p className="text-sm font-black text-white">Export Data</p>
              <p className="text-xs text-slate-400">Download your loops and logs</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-left transition hover:bg-rose-400/16 focus:outline-none focus:ring-2 focus:ring-rose-300"
        >
          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-rose-300" />
            <div>
              <p className="text-sm font-black text-rose-200">Delete Account</p>
              <p className="text-xs text-rose-300/60">Permanently remove all data</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-rose-300/50" />
        </button>

        <button
          onClick={onLogout}
          className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-left transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-black text-white">Logout</p>
              <p className="text-xs text-slate-400">Sign out of your account</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
      </div>
    </PremiumCard>
  );

  return (
    <div className="relative min-h-full space-y-5 text-left text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.22),transparent_62%)]" />

      <div className="relative">
        <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your profile, notifications, and preferences.</p>
      </div>

      <div className="relative">
        {renderSectionPills()}
      </div>

      {message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
            message.type === 'success'
              ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
              : 'border-red-400/20 bg-red-500/10 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="relative space-y-5">
        {activeSection === 'profile' && renderProfileSection()}
        {activeSection === 'notifications' && renderNotificationsSection()}
        {activeSection === 'appearance' && renderAppearanceSection()}
        {activeSection === 'account' && renderAccountSection()}
        {activeSection === 'pwa' && renderPwaSection()}
      </div>

      {renderAvatarPicker()}
      {renderDeleteConfirm()}
    </div>
  );
}
