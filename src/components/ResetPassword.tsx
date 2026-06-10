import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../supabaseClient.js';
import { validatePassword, isPasswordValid } from '../utils/passwordValidation';
import loopzyLogoLight from '../../logo light mode.png';
import loopzyLogoDark from '../../logo dark mode.png';

interface ResetPasswordProps {
  onComplete: () => void;
}

export default function ResetPassword({ onComplete }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const { isValid, error: validationError } = validatePassword(password);
    if (!isValid) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      const msg = updateError.message.toLowerCase();
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('missing') || msg.includes('not authenticated')) {
        setError('Reset Link Expired. Please request a new password reset email.');
      } else {
        setError(updateError.message);
      }
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);
  };

  const handleBackToLogin = () => {
    onComplete();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 lg:pt-6 pb-3 sm:pb-4 lg:pb-6 selection:bg-brand-500/15 select-none transition-colors duration-300">
        <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 lg:p-5 relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-brand-100/20 dark:bg-brand-800/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-brand-100/20 dark:bg-brand-800/5 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-2 z-10 relative">
            <img
              src={loopzyLogoLight}
              alt="Loopzy logo"
              className="h-14 sm:h-16 w-auto object-contain mx-auto dark:hidden"
            />
            <img
              src={loopzyLogoDark}
              alt="Loopzy logo"
              className="hidden h-14 sm:h-16 w-auto object-contain mx-auto dark:block"
            />
          </div>

          <div className="z-10 relative text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
              Password Updated
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Your password has been updated successfully.
            </p>

            <button
              onClick={handleBackToLogin}
              className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md hover:shadow-brand-500/20 dark:hover:shadow-brand-500/10 transition-all cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && (error.includes('Expired') || error.includes('expired'))) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 lg:pt-6 pb-3 sm:pb-4 lg:pb-6 selection:bg-brand-500/15 select-none transition-colors duration-300">
        <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 lg:p-5 relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-brand-100/20 dark:bg-brand-800/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-brand-100/20 dark:bg-brand-800/5 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-2 z-10 relative">
            <img
              src={loopzyLogoLight}
              alt="Loopzy logo"
              className="h-14 sm:h-16 w-auto object-contain mx-auto dark:hidden"
            />
            <img
              src={loopzyLogoDark}
              alt="Loopzy logo"
              className="hidden h-14 sm:h-16 w-auto object-contain mx-auto dark:block"
            />
          </div>

          <div className="z-10 relative text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
              Reset Link Expired
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
              Please request a new password reset email.
            </p>

            <button
              onClick={handleBackToLogin}
              className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md hover:shadow-brand-500/20 dark:hover:shadow-brand-500/10 transition-all cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 lg:pt-6 pb-3 sm:pb-4 lg:pb-6 selection:bg-brand-500/15 select-none transition-colors duration-300">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 lg:p-5 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-brand-100/20 dark:bg-brand-800/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-brand-100/20 dark:bg-brand-800/5 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-2 z-10 relative">
          <img
            src={loopzyLogoLight}
            alt="Loopzy logo"
            className="h-14 sm:h-16 w-auto object-contain mx-auto dark:hidden"
          />
          <img
            src={loopzyLogoDark}
            alt="Loopzy logo"
            className="hidden h-14 sm:h-16 w-auto object-contain mx-auto dark:block"
          />
        </div>

        <div className="text-center space-y-0.5 z-10 relative mb-3">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Reset Your Password
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter a new password for your Loopzy account.
          </p>
        </div>

        {error && (
          <div className="mb-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2 z-10 relative">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 pl-1">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 cursor-text transition"
                id="reset-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 pl-1">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 cursor-text transition"
                id="reset-confirm-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!password || !confirmPassword || !isPasswordValid(password) || loading}
            className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md hover:shadow-brand-500/20 dark:hover:shadow-brand-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            id="reset-password-submit"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
