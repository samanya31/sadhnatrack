import React, { useState, useEffect } from 'react';
import { X, Target, Calendar, Headphones, Hammer, Dumbbell, BookOpen as BookIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import type { TargetPeriodType, TargetMetricType } from '../types';

interface TargetCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (target: {
    title: string;
    description: string;
    period_type: TargetPeriodType;
    metric: TargetMetricType;
    target_value: number;
    start_date: string;
    end_date: string;
  }) => Promise<void>;
}

export const TargetCreateModal: React.FC<TargetCreateModalProps> = ({ isOpen, onClose, onSave }) => {
  const [metric, setMetric] = useState<TargetMetricType>('reading_minutes');
  const [periodType, setPeriodType] = useState<TargetPeriodType>('monthly');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDisplayVal, setTargetDisplayVal] = useState<number>(30); // Hours or Count
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  // Auto-generate title and dates on selections
  useEffect(() => {
    // Generate dates based on period type
    const today = new Date();
    if (periodType === 'weekly') {
      setStartDate(format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (periodType === 'monthly') {
      setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(today), 'yyyy-MM-dd'));
    }

    // Default targets based on metric
    if (metric === 'reading_minutes') {
      setTitle(`Read ${targetDisplayVal} Hours`);
    } else if (metric === 'hearing_minutes') {
      setTitle(`Hear ${targetDisplayVal} Hours`);
    } else if (metric === 'rounds_completed') {
      setTitle(`Chant ${targetDisplayVal} Rounds`);
    } else if (metric === 'seva_minutes') {
      setTitle(`Perform ${targetDisplayVal} Hours of Seva`);
    } else if (metric === 'exercise_minutes') {
      setTitle(`Exercise ${targetDisplayVal} Hours`);
    } else if (metric === 'custom_milestone') {
      setTitle('Learn mantra: ');
    }
  }, [metric, periodType, targetDisplayVal]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert hours to minutes for the database if it's a minutes-based metric
      const isMinutesMetric = ['reading_minutes', 'hearing_minutes', 'seva_minutes', 'exercise_minutes'].includes(metric);
      const targetDbValue = isMinutesMetric ? targetDisplayVal * 60 : targetDisplayVal;

      await onSave({
        title,
        description,
        period_type: periodType,
        metric,
        target_value: targetDbValue,
        start_date: startDate,
        end_date: endDate,
      });
      onClose();
    } catch (err) {
      console.error('Error saving target:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (m: TargetMetricType) => {
    switch (m) {
      case 'reading_minutes': return <BookIcon className="text-emerald-500" size={18} />;
      case 'hearing_minutes': return <Headphones className="text-purple-500" size={18} />;
      case 'rounds_completed': return <Target className="text-rose-500" size={18} />;
      case 'seva_minutes': return <Hammer className="text-amber-500" size={18} />;
      case 'exercise_minutes': return <Dumbbell className="text-teal-500" size={18} />;
      default: return <Target className="text-slate-500" size={18} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-[500px] max-h-[92vh] overflow-y-auto bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
              <Target size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Set New Target</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Goal Planner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <X size={18} className="stroke-[3]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Metric Selector */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Track Activity</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { id: 'reading_minutes', label: 'Reading', bg: 'hover:bg-emerald-50/50' },
                { id: 'hearing_minutes', label: 'Hearing', bg: 'hover:bg-purple-50/50' },
                { id: 'rounds_completed', label: 'Rounds', bg: 'hover:bg-rose-50/50' },
                { id: 'seva_minutes', label: 'Seva', bg: 'hover:bg-amber-50/50' },
                { id: 'exercise_minutes', label: 'Exercise', bg: 'hover:bg-teal-50/50' },
                { id: 'custom_milestone', label: 'Custom Milestone', bg: 'hover:bg-slate-50/50' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id as TargetMetricType)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                    metric === m.id
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm scale-[1.02]'
                      : `bg-white border-slate-100 text-slate-600 ${m.bg}`
                  }`}
                >
                  {getMetricIcon(m.id as TargetMetricType)}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Value / Hours Input */}
          {metric !== 'custom_milestone' ? (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Target Value ({['reading_minutes', 'hearing_minutes', 'seva_minutes', 'exercise_minutes'].includes(metric) ? 'Hours' : 'Rounds'})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  value={targetDisplayVal}
                  onChange={(e) => setTargetDisplayVal(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-extrabold text-sm focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all shadow-inner"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase tracking-wider select-none">
                  {['reading_minutes', 'hearing_minutes', 'seva_minutes', 'exercise_minutes'].includes(metric) ? 'Hours' : 'Rounds'}
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Target Value</label>
              <input
                type="hidden"
                value={targetDisplayVal}
              />
              <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 font-semibold text-xs leading-relaxed shadow-inner">
                Custom Milestones (e.g. learning a mantra) are tracked as binary goals (Completed / Incomplete).
              </div>
            </div>
          )}

          {/* Period Type Selection */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Goal Frequency</label>
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
              {[
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'custom', label: 'Custom Range' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodType(p.id as TargetPeriodType)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                    periodType === p.id
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/20'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates Input (shown only if Custom is selected) */}
          {periodType === 'custom' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">From Date</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 h-12 focus-within:bg-white focus-within:border-primary-500 transition-all shadow-inner">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer w-full p-0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">To Date</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 h-12 focus-within:bg-white focus-within:border-primary-500 transition-all shadow-inner">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer w-full p-0"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold bg-slate-50/50 px-4 py-3 rounded-2xl border border-slate-100">
              <Calendar size={14} className="text-slate-300" />
              <span>Interval: {format(new Date(startDate.replace(/-/g, '/')), 'MMM d')} to {format(new Date(endDate.replace(/-/g, '/')), 'MMM d, yyyy')}</span>
            </div>
          )}

          {/* Goal Title */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Goal Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Read Sri Isopanisad, Learn Chapter 12 Mantras"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-extrabold text-sm focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all shadow-inner"
            />
          </div>

          {/* Goal Description */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Short Notes (Optional)</label>
            <textarea
              placeholder="Detail your plan to achieve this target..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold text-sm focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all resize-none shadow-inner"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-primary-600 text-white hover:bg-primary-700 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Set Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
