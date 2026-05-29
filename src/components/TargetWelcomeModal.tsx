import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2, Award, Calendar, BookOpen, Headphones, Hammer, Dumbbell, Star } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { SadhanaTarget, TargetMetricType } from '../types';
import { differenceInDays } from 'date-fns';

interface TargetWithProgress extends SadhanaTarget {
  actualProgress: number; // dynamically computed actual progress from logs
}

interface TargetWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: TargetWithProgress[];
  onToggleComplete: (targetId: string, isCompleted: boolean) => Promise<void>;
}

export const TargetWelcomeModal: React.FC<TargetWelcomeModalProps> = ({
  isOpen,
  onClose,
  targets,
  onToggleComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  if (!isOpen || targets.length === 0) return null;

  const currentTarget = targets[currentIndex];
  
  // Calculate remaining days
  const today = new Date();
  const targetEnd = new Date(currentTarget.end_date.replace(/-/g, '/'));
  const daysLeft = Math.max(0, differenceInDays(targetEnd, today) + 1);

  // Swipe detection min distance
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < targets.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const nextCard = () => {
    if (currentIndex < targets.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Convert minutes to hours and minutes string
  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  // SVG Progress Circle parameters
  const radius = 64;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const getProgressInfo = (target: TargetWithProgress) => {
    const isMilestone = target.metric === 'custom_milestone';
    const total = target.target_value;
    const actual = isMilestone 
      ? (target.is_completed ? 1 : target.current_progress) 
      : target.actualProgress;
    
    const rawPercent = total > 0 ? (actual / total) * 100 : 0;
    const percent = Math.min(100, Math.round(rawPercent));
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    let displayTarget = '';
    let displayActual = '';

    if (['reading_minutes', 'hearing_minutes', 'seva_minutes', 'exercise_minutes'].includes(target.metric)) {
      displayTarget = formatMinutes(total);
      displayActual = formatMinutes(actual);
    } else if (target.metric === 'rounds_completed') {
      displayTarget = `${total} R`;
      displayActual = `${actual} R`;
    } else {
      // Milestone
      displayTarget = 'Achieved';
      displayActual = target.is_completed ? 'Yes' : 'No';
    }

    return { percent, strokeDashoffset, displayTarget, displayActual, isMilestone, actual };
  };

  const { percent, strokeDashoffset, displayTarget, displayActual, isMilestone } = getProgressInfo(currentTarget);

  // Styling based on metric
  const getMetricTheme = (m: TargetMetricType) => {
    switch (m) {
      case 'reading_minutes':
        return {
          bg: 'bg-emerald-50 text-emerald-600',
          strokeColor: '#10B981',
          gradient: 'from-emerald-500 to-teal-600',
          icon: <BookOpen size={24} className="text-white" />
        };
      case 'hearing_minutes':
        return {
          bg: 'bg-purple-50 text-purple-600',
          strokeColor: '#8B5CF6',
          gradient: 'from-purple-500 to-indigo-600',
          icon: <Headphones size={24} className="text-white" />
        };
      case 'rounds_completed':
        return {
          bg: 'bg-rose-50 text-rose-600',
          strokeColor: '#F43F5E',
          gradient: 'from-rose-500 to-pink-600',
          icon: <Award size={24} className="text-white" />
        };
      case 'seva_minutes':
        return {
          bg: 'bg-amber-50 text-amber-600',
          strokeColor: '#F59E0B',
          gradient: 'from-amber-500 to-orange-600',
          icon: <Hammer size={24} className="text-white" />
        };
      case 'exercise_minutes':
        return {
          bg: 'bg-teal-50 text-teal-600',
          strokeColor: '#14B8A6',
          gradient: 'from-teal-500 to-emerald-600',
          icon: <Dumbbell size={24} className="text-white" />
        };
      default:
        return {
          bg: 'bg-sky-50 text-sky-600',
          strokeColor: '#0EA5E9',
          gradient: 'from-sky-500 to-blue-600',
          icon: <Star size={24} className="text-white" />
        };
    }
  };

  const theme = getMetricTheme(currentTarget.metric);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark blur backdrop */}
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Main Container */}
      <div 
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative w-full max-w-[400px] bg-white rounded-[3rem] shadow-2xl border border-slate-100/50 p-6 sm:p-8 flex flex-col items-center justify-between text-center overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Floating Confetti effect for completed targets */}
        {percent >= 100 && (
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-300 via-rose-300 to-emerald-300" />
        )}

        {/* Modal Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <X size={18} className="stroke-[3]" />
        </button>

        {/* Card Header (Target Meta) */}
        <div className="w-full space-y-2 mb-6">
          <div className="flex items-center justify-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${theme.bg}`}>
              {currentTarget.period_type} Target
            </span>
            <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={10} />
              {daysLeft > 0 ? `${daysLeft} days left` : 'Ends today'}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight px-4 mt-2">
            {currentTarget.title}
          </h2>
          {currentTarget.description && (
            <p className="text-xs font-semibold text-slate-400 italic truncate max-w-[280px] mx-auto">
              "{currentTarget.description}"
            </p>
          )}
        </div>

        {/* SVG Circular Progress Meter */}
        <div className="relative flex items-center justify-center mb-8">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90 filter drop-shadow-sm"
          >
            <circle
              stroke="#F1F5F9"
              fill="transparent"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={theme.strokeColor}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={circumference + ' ' + circumference}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              className="transition-all duration-700 ease-in-out"
            />
          </svg>
          {/* Inner Circle Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`w-12 h-12 bg-gradient-to-br ${theme.gradient} rounded-2xl flex items-center justify-center shadow-lg transform rotate-6 mb-1.5`}>
              <div className="transform -rotate-6">
                {theme.icon}
              </div>
            </div>
            {isMilestone ? (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target</span>
            ) : (
              <span className="text-2xl font-black text-slate-900 tracking-tighter">{percent}%</span>
            )}
          </div>
        </div>

        {/* Progress Stats details */}
        <div className="w-full bg-slate-50/50 rounded-3xl p-4 border border-slate-100 shadow-inner mb-6">
          <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {isMilestone ? 'Status' : 'Progress'}
              </p>
              <p className="text-lg font-black text-slate-800 tracking-tight">
                {isMilestone ? (currentTarget.is_completed ? 'Achieved' : 'Active') : displayActual}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Goal Target</p>
              <p className="text-lg font-black text-slate-800 tracking-tight">{displayTarget}</p>
            </div>
          </div>
        </div>

        {/* Encouraging Quote or Milestone Actions */}
        <div className="w-full px-4 mb-6">
          {isMilestone ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-500 mb-2">Did you accomplish this goal?</p>
              {currentTarget.is_completed ? (
                <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-2xl border border-emerald-100 font-extrabold text-sm shadow-sm">
                  <CheckCircle2 size={18} />
                  Milestone Completed!
                </div>
              ) : (
                <button
                  onClick={() => onToggleComplete(currentTarget.id, true)}
                  className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-800/10 active:scale-[0.98] transition-all"
                >
                  Mark Completed
                </button>
              )}
            </div>
          ) : (
            <div>
              {percent >= 100 ? (
                <p className="text-sm font-extrabold text-emerald-600 flex items-center justify-center gap-1.5 animate-bounce">
                  🎉 Goal Completed! Haribol!
                </p>
              ) : (
                <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                  {percent > 50 
                    ? "Over halfway there! Keep pushing your sadhana limits!" 
                    : "Every minute counts. Chant, read, hear, and inspire yourself!"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation Arrows & Pagination Dots */}
        {targets.length > 1 && (
          <div className="w-full flex items-center justify-between mt-auto pt-2 border-t border-slate-100/60">
            <button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft size={20} className="stroke-[3]" />
            </button>

            {/* Dots indicator */}
            <div className="flex gap-1.5">
              {targets.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'w-5 bg-slate-900' : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextCard}
              disabled={currentIndex === targets.length - 1}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-50 transition-colors"
            >
              <ChevronRight size={20} className="stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
