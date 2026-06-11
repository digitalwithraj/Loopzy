import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../supabaseClient.js';
import { validatePassword, isPasswordValid } from '../utils/passwordValidation';
import loopzyLogoLight from '../../logo light mode.png';
import loopzyLogoDark from '../../logo dark mode.png';

interface AuthProps {
  onAuthSuccess: () => void;
}

function getUserFriendlyAuthError(error: { message: string; code?: string }): string {
  const msg = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? '';

  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Please confirm your email address.';
  }
  if (msg.includes('user already registered') || code === 'user_already_exists') {
    return 'An account with this email already exists.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
    return 'Incorrect email or password.';
  }
  if (msg.includes('email not found') || msg.includes('user not found') || msg.includes('user_not_found')) {
    return 'Account not found.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Please try again later.';
  }
  if (msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('email') && (msg.includes('send') || msg.includes('deliver') || msg.includes('smtp'))) {
    return 'Unable to send email. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmScreen, setConfirmScreen] = useState<{ email: string } | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handlePasswordBlur = () => {
    if (!isSignUp) return;
    const { error } = validatePassword(password);
    setPasswordError(error);
  };

  const handleSignUp = async () => {
    const { isValid, error: validationError } = validatePassword(password);
    if (!isValid) {
      setPasswordError(validationError);
      return;
    }
    setLoading(true);
    setAuthError(null);
    setPasswordError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    });
    setLoading(false);
    if (error) {
      setAuthError(getUserFriendlyAuthError(error));
    } else {
      setConfirmScreen({ email });
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setAuthError(getUserFriendlyAuthError(error));
    } else {
      onAuthSuccess();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (isForgot) {
      supabase.auth.resetPasswordForEmail(email);
      setResetSent(true);
      return;
    }
    if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  const handleResend = async () => {
    if (!confirmScreen) return;
    setLoading(true);
    setAuthError(null);
    setResendMessage(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email: confirmScreen.email });
    setLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setResendMessage('Verification email sent successfully.');
      setTimeout(() => setResendMessage(null), 4000);
    }
  };

  const handleBackToSignIn = () => {
    setConfirmScreen(null);
    setIsSignUp(false);
    setEmail(confirmScreen?.email ?? '');
    setPassword('');
    setUsername('');
    setAuthError(null);
  };

  if (confirmScreen) {
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
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1.5">
              Check your email
            </h1>

            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-1.5">
              We've sent a verification link to<br />
              <span className="font-medium text-slate-700 dark:text-slate-300">{confirmScreen.email}</span>
            </p>

            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed mb-4">
              Please open your inbox and confirm your account to continue.
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 mb-4">
              <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                Didn't receive the email? Check your spam folder or request another email.
              </p>
            </div>

            {resendMessage && (
              <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">{resendMessage}</p>
              </div>
            )}

            {authError && (
              <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">{authError}</p>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md hover:shadow-brand-500/20 dark:hover:shadow-brand-500/10 transition-all cursor-pointer"
              >
                {loading ? 'Sending...' : 'Resend Email'}
              </button>

              <button
                type="button"
                onClick={handleBackToSignIn}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition py-2"
              >
                Back to Sign In
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 lg:pt-6 pb-3 sm:pb-4 lg:pb-6 selection:bg-brand-500/15 select-none transition-colors duration-300">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-5 lg:p-5 relative overflow-hidden">

        {/* Ambient glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-brand-100/20 dark:bg-brand-800/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-brand-100/20 dark:bg-brand-800/5 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
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

        {/* Heading / Subheading */}
        {!isForgot && (
          <div className={`text-center space-y-0.5 z-10 relative ${isSignUp ? 'mb-3' : 'mb-3'}`}>
            {isSignUp && (
              <span className="text-[10px] font-semibold text-brand-500 dark:text-brand-400 uppercase tracking-[0.15em]">
                Step 1 of 2
              </span>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {isSignUp ? 'Welcome to Loopzy' : 'Welcome Back'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isSignUp ? 'Start your first loop today.' : "Let's continue the loop."}
            </p>
          </div>
        )}

        {/* Error banner */}
        {authError && (
          <div className="mb-2 p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{authError}</p>
          </div>
        )}

        {isForgot ? (
          <form onSubmit={handleSubmit} className="space-y-3 z-10 relative">
            <div className="text-center space-y-1 mb-1.5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Reset password</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We'll send you a recovery email.
              </p>
            </div>

            {resetSent ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
                A password reset request has been initiated. Please check your inbox shortly.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 cursor-text transition"
                    id="forgot-email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm transition-all cursor-pointer"
                  id="send-reset-btn"
                >
                  {loading ? 'Sending Recovery...' : 'Send Recovery Email'}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsForgot(false);
                setResetSent(false);
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition"
              id="forgot-back-btn"
            >
              Back to sign-in
            </button>
          </form>
        ) : (
          <div className="space-y-2 z-10 relative">
            <form onSubmit={handleSubmit} className="space-y-2 text-left">
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 pl-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="How should Loopzy call you?"
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 cursor-text transition"
                      id="signup-username"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 pl-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setAuthError(null); }}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 cursor-text transition"
                    id="login-email"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-xs text-brand-500 hover:text-brand-400 font-medium cursor-pointer transition"
                      id="forgot-password-link"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAuthError(null); }}
                    onBlur={handlePasswordBlur}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-12 pr-12 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/20 cursor-text transition"
                    id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 transition-colors cursor-pointer p-2"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {isSignUp && passwordError && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 leading-relaxed pt-0.5">
                    {passwordError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSignUp ? !username.trim() || !email.includes('@') || !isPasswordValid(password) || loading : !email || !password || loading}
                className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md hover:shadow-brand-500/20 dark:hover:shadow-brand-500/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                id="email-submit-btn"
              >
                {loading ? 'Processing...' : isSignUp ? 'Start My Loop' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {isSignUp && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center flex items-center justify-center gap-1">
                <span className="text-emerald-500">✓</span>
                Your data stays private
              </p>
            )}

            <div className="text-center">
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isSignUp ? 'Already in the loop? ' : "New to Loopzy? "}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-brand-500 hover:text-brand-400 font-semibold cursor-pointer inline transition"
                  id="toggle-auth-mode-btn"
                >
                  {isSignUp ? 'Sign In' : 'Create your account'}
                </button>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
