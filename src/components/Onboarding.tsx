/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ChevronLeft,
  Check,
  Sparkles,
  Zap,
  BookOpen,
  Dumbbell,
  Briefcase,
  User,
} from 'lucide-react';
import onboardingWelcome from '../../logo (2).png';
import loopzyLogoLight from '../../logo light mode.png';
import loopzyLogoDark from '../../logo dark mode.png';

// Avatar image imports from /Avatar folder
import avatarStudentMale from '../../Avatar/male avatar 2.png';
import avatarStudentFemale from '../../Avatar/male avatar 8.png';
import avatarProfMale from '../../Avatar/male avatar 1.png';
import avatarProfFemale from '../../Avatar/male avatar 6.png';
import avatarCreator from '../../Avatar/male avatar 4.png';
import avatarEntrepreneur from '../../Avatar/male avatar.png';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingData {
  onboardingCompleted: boolean;
  name: string;
  avatar: string;
  goals: string[];
}

interface OnboardingProps {
  onComplete: (data: OnboardingData) => Promise<{ success: boolean; error?: string }>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

const AVATAR_OPTIONS: { id: string; label: string; image: string; gradient: string }[] = [
  { id: 'student-male', label: 'Student Male', image: avatarStudentMale, gradient: 'from-blue-400 to-cyan-400' },
  { id: 'student-female', label: 'Student Female', image: avatarStudentFemale, gradient: 'from-pink-400 to-rose-400' },
  { id: 'professional-male', label: 'Professional Male', image: avatarProfMale, gradient: 'from-indigo-400 to-blue-500' },
  { id: 'professional-female', label: 'Professional Female', image: avatarProfFemale, gradient: 'from-violet-400 to-purple-500' },
  { id: 'creator', label: 'Creator', image: avatarCreator, gradient: 'from-orange-400 to-amber-400' },
  { id: 'entrepreneur', label: 'Entrepreneur', image: avatarEntrepreneur, gradient: 'from-emerald-400 to-teal-400' },
];

const GOAL_OPTIONS: { id: string; label: string; icon: React.ElementType; description: string; colors: [string, string] }[] = [
  { id: 'productivity', label: 'Productivity', icon: Zap, description: 'Get more done every day.', colors: ['#F59E0B', '#F97316'] },
  { id: 'learning', label: 'Learning', icon: BookOpen, description: 'Build powerful learning habits.', colors: ['#3B82F6', '#6366F1'] },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, description: 'Stay active and consistent.', colors: ['#10B981', '#059669'] },
  { id: 'career', label: 'Career', icon: Briefcase, description: 'Advance your professional growth.', colors: ['#EC4899', '#E11D48'] },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Animated progress bar dots */
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
        {current} / {total}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i + 1 === current ? 28 : 8,
              backgroundColor:
                i + 1 < current
                  ? '#7C3AED'
                  : i + 1 === current
                    ? '#3B82F6'
                    : undefined,
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`h-2 rounded-full transition-colors ${i + 1 > current ? 'bg-slate-200 dark:bg-slate-700' : ''
              }`}
          />
        ))}
      </div>
    </div>
  );
}

/** Glowing brand button */
function PrimaryButton({
  children,
  onClick,
  disabled = false,
  id,
  fullWidth = false,
  height,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  id?: string;
  fullWidth?: boolean;
  height?: number;
}) {
  return (
    <motion.button
      id={id}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      whileHover={disabled ? {} : { scale: 1.02, boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}
      className={`relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all overflow-hidden ${fullWidth ? 'w-full' : ''} ${disabled
          ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
          : 'cursor-pointer'
        }`}
      style={{
        ...(height ? { height: `${height}px`, paddingTop: 0, paddingBottom: 0 } : {}),
        ...(disabled
          ? {}
          : {
            background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
          }),
      }}
    >
      {/* Shimmer */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 -skew-x-12 opacity-0"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }}
          animate={{ x: ['-100%', '200%'], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut', repeatDelay: 2 }}
        />
      )}
      {children}
    </motion.button>
  );
}

/** Ghost back button */
function BackButton({ onClick, id }: { onClick: () => void; id?: string }) {
  return (
    <motion.button
      id={id}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
    >
      <ChevronLeft className="w-4 h-4" />
      Back
    </motion.button>
  );
}

// ─── Step 1: Name Collection ──────────────────────────────────────────────────

function StepName({
  name,
  onChange,
  onNext,
  error,
}: {
  name: string;
  onChange: (v: string) => void;
  onNext: () => void;
  error: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onNext();
  };

  return (
    <motion.div
      key="step-name"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center gap-3 w-full"
    >
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: 'backOut' }}
        className="relative w-32 h-32 flex items-center justify-center"
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950/40 dark:to-purple-950/40 blur-xl" />
        <img
          src={onboardingWelcome}
          alt="Welcome"
          className="relative w-28 h-28 object-contain drop-shadow-lg"
        />
        {/* Floating sparkles */}
        {[
          { top: '5%', left: '5%', delay: 0 },
          { top: '10%', right: '8%', delay: 0.4 },
          { bottom: '12%', left: '8%', delay: 0.8 },
        ].map((pos, i) => (
          <motion.div
            key={i}
            style={{ position: 'absolute', ...pos as any }}
            animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2 + i * 0.5, delay: pos.delay }}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </motion.div>
        ))}
      </motion.div>

      {/* Text */}
      <div className="text-center space-y-1">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight"
        >
          What should we call you?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-slate-500 dark:text-slate-400"
        >
          This helps personalize your Loopzy experience.
        </motion.p>
      </div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="w-full space-y-2"
      >
        <div
          className={`relative flex items-center rounded-2xl border-2 transition-colors duration-200 bg-slate-50 dark:bg-slate-800/60 ${error
              ? 'border-red-400'
              : 'border-slate-200 dark:border-slate-700 focus-within:border-blue-400 dark:focus-within:border-blue-500'
            }`}
        >
          <div className="pl-4 pr-2 text-slate-400">
            <User className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            id="onboarding-name-input"
            type="text"
            value={name}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your name"
            aria-label="Your name"
            className="flex-1 bg-transparent py-3 pr-4 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
            maxLength={40}
          />
          {name.length >= 2 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="pr-4 text-green-500"
            >
              <Check className="w-4 h-4" />
            </motion.div>
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-500 font-medium pl-1"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="w-full"
      >
        <PrimaryButton onClick={onNext} id="onboarding-name-continue">
          Continue <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </motion.div>
    </motion.div>
  );
}

// ─── Step 2: Avatar Selection ─────────────────────────────────────────────────

function StepAvatar({
  selected,
  onSelect,
  onNext,
  onBack,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <motion.div
      key="step-avatar"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center gap-3 w-full"
    >
      <div className="text-center space-y-1">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight"
        >
          Choose your avatar
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          Pick the character that represents you.
        </motion.p>
      </div>

      {/* Avatar Grid */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {AVATAR_OPTIONS.map((avatar, idx) => {
          const isSelected = selected === avatar.id;
          return (
            <motion.button
              key={avatar.id}
              id={`onboarding-avatar-${avatar.id}`}
              onClick={() => onSelect(avatar.id)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.06, duration: 0.3, ease: 'backOut' }}
              whileHover={{ y: -4, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`relative flex flex-col items-center overflow-hidden rounded-2xl border-2 cursor-pointer transition-all duration-200 ${isSelected
                  ? 'border-transparent shadow-xl shadow-blue-200/60 dark:shadow-blue-900/40'
                  : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                }`}
              style={
                isSelected
                  ? {
                    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #3B82F6, #7C3AED) border-box',
                    borderColor: 'transparent',
                  }
                  : {}
              }
              aria-pressed={isSelected}
              aria-label={`Select ${avatar.label} avatar`}
            >
              {/* Selection glow overlay */}
              {isSelected && (
                <motion.div
                  layoutId="avatar-glow"
                  className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none z-10"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #7C3AED)' }}
                  initial={false}
                />
              )}

              {/* Avatar portrait — fills card top */}
              <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
                <img
                  src={avatar.image}
                  alt={avatar.label}
                  className="w-full h-full object-cover object-top"
                  draggable={false}
                />
                {/* Selected badge */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 flex items-center justify-center shadow-md z-20"
                  >
                    <Check className="w-3 h-3 text-blue-500 stroke-[3]" />
                  </motion.div>
                )}
              </div>


            </motion.button>
          );
        })}
      </div>


      {/* Controls */}
      <div className="flex items-center justify-between w-full pt-1">
        <BackButton onClick={onBack} id="onboarding-avatar-back" />
        <PrimaryButton
          onClick={onNext}
          disabled={!selected}
          id="onboarding-avatar-continue"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Goal Selection ───────────────────────────────────────────────────

function StepGoal({
  selectedGoals,
  onToggle,
  onFinish,
  onBack,
  isCompleting,
  error,
}: {
  selectedGoals: string[];
  onToggle: (id: string) => void;
  onFinish: () => void;
  onBack: () => void;
  isCompleting: boolean;
  error: string;
}) {
  return (
    <motion.div
      key="step-goal"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center w-full"
      style={{ gap: '6px' }}
    >
      {/* Heading */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight"
        >
          What do you want to improve?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"
        >
          Select all areas you&apos;d like to improve.
        </motion.p>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="inline-block mt-1 text-[10px] font-semibold tabular-nums"
          style={{ color: selectedGoals.length > 0 ? '#8B5CF6' : '#94a3b8' }}
        >
          {selectedGoals.length} Selected
        </motion.span>
      </div>

      {/* Goal Cards — no scroll, 4 compact cards */}
      <div className="flex flex-col w-full" style={{ gap: '5px' }}>
        {GOAL_OPTIONS.map((goal, idx) => {
          const GoalIcon = goal.icon;
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <motion.button
              key={goal.id}
              id={`onboarding-goal-${goal.id}`}
              onClick={() => onToggle(goal.id)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3 }}
              whileHover={{ x: 3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isSelected}
              aria-label={`Select ${goal.label} goal`}
              className={`relative flex items-center gap-3 rounded-xl text-left cursor-pointer transition-all duration-200 overflow-hidden ${
                isSelected
                  ? 'bg-purple-50/80 dark:bg-purple-950/30'
                  : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/80'
              }`}
              style={{
                height: '56px',
                padding: '0 12px',
                borderWidth: '1.5px',
                borderStyle: 'solid',
                borderColor: isSelected
                  ? 'rgba(139, 92, 246, 0.55)'
                  : 'rgba(148, 163, 184, 0.2)',
                boxShadow: isSelected
                  ? '0 0 20px rgba(139,92,246,0.10), 0 2px 8px rgba(139,92,246,0.06)'
                  : 'none',
              }}
            >
              {/* Icon */}
              <div
                className="relative flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ background: `linear-gradient(135deg, ${goal.colors[0]}, ${goal.colors[1]})` }}
              >
                <GoalIcon className="w-4 h-4 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[13px] text-slate-800 dark:text-slate-100 leading-none">
                  {goal.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none truncate mt-0.5">
                  {goal.description}
                </p>
              </div>

              {/* Checkmark */}
              <motion.div
                animate={{
                  scale: isSelected ? 1 : 0,
                  opacity: isSelected ? 1 : 0,
                }}
                transition={{ duration: 0.2, ease: 'backOut' }}
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
              >
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500 dark:text-red-400 font-medium text-center w-full px-1"
        >
          {error}
        </motion.p>
      )}

      {/* CTA + Back */}
      <div className="flex flex-col items-center w-full" style={{ gap: '2px', marginTop: '2px' }}>
        <PrimaryButton
          onClick={onFinish}
          disabled={selectedGoals.length === 0 || isCompleting}
          id="onboarding-goal-finish"
          fullWidth
          height={48}
        >
          {isCompleting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full"
              />
              Setting up…
            </>
          ) : (
            <>
              Start My Journey <Sparkles className="w-4 h-4" />
            </>
          )}
        </PrimaryButton>
        <BackButton onClick={onBack} id="onboarding-goal-back" />
      </div>
    </motion.div>
  );
}

// ─── Success Overlay ──────────────────────────────────────────────────────────

function SuccessOverlay({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e40af 100%)' }}
    >
      {/* Animated particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 8 + 4,
            height: Math.random() * 8 + 4,
            background: i % 2 === 0 ? '#3B82F6' : '#7C3AED',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -60, -120],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 1.5 + Math.random() * 1,
            delay: Math.random() * 0.8,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Central success icon */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: 'backOut' }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #7C3AED)' }}>
          <Check className="w-12 h-12 text-white stroke-[2.5]" />
        </div>
        {/* Rings */}
        {[1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 rounded-full border-2 border-blue-400/30"
            animate={{ scale: [1, 1.6 + ring * 0.4], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: ring * 0.3 }}
          />
        ))}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="text-3xl font-bold text-white mb-2 text-center px-8"
      >
        You're all set, {name}! 🎉
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-blue-200 text-sm text-center px-8"
      >
        Your personalized journey begins now…
      </motion.p>
    </motion.div>
  );
}

// ─── Main Onboarding Component ────────────────────────────────────────────────

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finishError, setFinishError] = useState('');

  // Validate name and advance
  const handleNameNext = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Please enter your name to continue.');
      return;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      return;
    }
    setNameError('');
    setStep(2);
  };

  // Toggle a goal in/out of the selectedGoals array
  const handleToggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
    setFinishError('');
  };

  // Finish: persist to Supabase first, only show success on DB write success
  const handleFinish = async () => {
    if (selectedGoals.length === 0) return;
    setIsCompleting(true);
    setFinishError('');

    const data: OnboardingData = {
      onboardingCompleted: true,
      name: name.trim(),
      avatar: selectedAvatar,
      goals: selectedGoals,
    };

    const result = await onComplete(data);

    if (result.success) {
      setIsCompleting(false);
      setShowSuccess(true);
      // Parent handles redirect after the success animation plays
    } else {
      setIsCompleting(false);
      setFinishError(result.error || 'Something went wrong. Please try again.');
    }
  };

  return (
    <>
      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && <SuccessOverlay name={name.trim()} />}
      </AnimatePresence>

      {/* Main onboarding screen */}
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 relative"
        style={{ background: 'linear-gradient(160deg, #f8faff 0%, #f0f4ff 40%, #f5f0ff 100%)', overflow: 'hidden' }}
      >
        {/* Background decoration */}
        <div
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative w-full max-w-xs bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 dark:border-slate-700/50 px-5 py-3 md:px-6 md:py-4 flex flex-col gap-2"
          style={{ boxShadow: '0 32px 80px rgba(59,130,246,0.12), 0 4px 20px rgba(0,0,0,0.06)' }}
        >
          {/* Header: Logo + Progress */}
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="h-10">
              <img
                src={loopzyLogoLight}
                alt="Loopzy"
                className="h-10 w-auto object-contain dark:hidden"
              />
              <img
                src={loopzyLogoDark}
                alt="Loopzy"
                className="hidden h-10 w-auto object-contain dark:block"
              />
            </div>
            {/* Progress */}
            <ProgressBar current={step} total={TOTAL_STEPS} />
          </div>

          {/* Step label */}
          <div className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Step {step} of {TOTAL_STEPS}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepName
                name={name}
                onChange={(v) => {
                  setName(v);
                  if (nameError) setNameError('');
                }}
                onNext={handleNameNext}
                error={nameError}
              />
            )}
            {step === 2 && (
              <StepAvatar
                selected={selectedAvatar}
                onSelect={setSelectedAvatar}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <StepGoal
                selectedGoals={selectedGoals}
                onToggle={handleToggleGoal}
                onFinish={handleFinish}
                onBack={() => setStep(2)}
                isCompleting={isCompleting}
                error={finishError}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-3 text-xs text-slate-400 dark:text-slate-600 text-center"
        >
          By continuing you agree to Loopzy's{' '}
          <span className="underline cursor-pointer hover:text-slate-600">Terms of Service</span>
        </motion.p>
      </div>
    </>
  );
}
