import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchCenterBenchmarks } from '../lib/benchmarks';
import { X, Settings, Check, Clock, Sunrise, BookOpen, Headphones, Save, Sparkles } from 'lucide-react';

interface CenterBenchmarksModalProps {
  baceId: string | null;
  baceName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CenterBenchmarksModal: React.FC<CenterBenchmarksModalProps> = ({
  baceId,
  baceName = 'BACE Center',
  isOpen,
  onClose,
}) => {
  const [wakeupTime, setWakeupTime] = useState<string>('04:30');
  const [japaTime, setJapaTime] = useState<string>('12:00');
  const [readingMins, setReadingMins] = useState<string>('30');
  const [hearingMins, setHearingMins] = useState<string>('30');

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && baceId) {
      loadBenchmarks();
    }
  }, [isOpen, baceId]);

  const loadBenchmarks = async () => {
    setLoading(true);
    try {
      const benchmarks = await fetchCenterBenchmarks(baceId);
      if (benchmarks.wakeup_time) setWakeupTime(benchmarks.wakeup_time.target_value);
      if (benchmarks.japa_completion_time) setJapaTime(benchmarks.japa_completion_time.target_value);
      if (benchmarks.reading_minutes) setReadingMins(benchmarks.reading_minutes.target_value);
      if (benchmarks.hearing_minutes) setHearingMins(benchmarks.hearing_minutes.target_value);
    } catch (err) {
      console.error('Error loading benchmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baceId) return;

    setSaving(true);
    try {
      const recordsToUpsert = [
        {
          bace_id: baceId,
          metric: 'wakeup_time',
          target_value: wakeupTime,
          unit: 'time',
          description: 'Brahma Muhurta Wake-Up Target',
        },
        {
          bace_id: baceId,
          metric: 'japa_completion_time',
          target_value: japaTime,
          unit: 'time',
          description: '16 Rounds Target Completion Time',
        },
        {
          bace_id: baceId,
          metric: 'reading_minutes',
          target_value: readingMins,
          unit: 'minutes',
          description: 'Daily Reading Target',
        },
        {
          bace_id: baceId,
          metric: 'hearing_minutes',
          target_value: hearingMins,
          unit: 'minutes',
          description: 'Daily Hearing Target',
        },
      ];

      const { error } = await supabase
        .from('organization_benchmarks')
        .upsert(recordsToUpsert, { onConflict: 'bace_id,metric' });

      if (error) throw error;

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Save benchmarks error:', err);
      alert(err.message || 'Error saving center benchmarks');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col p-5 sm:p-7 relative overflow-hidden">
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Settings size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Configure Benchmarks</h3>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-mono font-bold rounded-md uppercase border border-indigo-100">
                  {baceName}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Set targets used by AI Sadhna Coach & Admin Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-slate-400">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-600">Loading benchmarks for {baceName}...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden min-h-0">
            
            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs sm:text-sm">
              
              {/* Wake-up Time Benchmark */}
              <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                      <Sunrise size={18} />
                    </div>
                    <span>Target Wake-up Time (Brahma Muhurta)</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                    Rise Target
                  </span>
                </div>

                <input
                  type="time"
                  value={wakeupTime}
                  onChange={(e) => setWakeupTime(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-mono text-base sm:text-lg font-black text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
                <p className="text-[11px] text-slate-500 font-medium">Students waking past this target will be evaluated in AI Sadhana reports.</p>
              </div>

              {/* Japa Completion Time Benchmark */}
              <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                      <Clock size={18} />
                    </div>
                    <span>Target Japa Completion Time (16 Rounds)</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100">
                    Finish Target
                  </span>
                </div>

                <input
                  type="time"
                  value={japaTime}
                  onChange={(e) => setJapaTime(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-mono text-base sm:text-lg font-black text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
                <p className="text-[11px] text-slate-500 font-medium">Ideal time to finish 16 rounds of Japa (e.g. 12:00 PM).</p>
              </div>

              {/* Daily Reading & Hearing Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Daily Reading Target */}
                <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                      <BookOpen size={16} />
                    </div>
                    <span>Daily Reading (Mins)</span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={readingMins}
                    onChange={(e) => setReadingMins(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-mono text-base sm:text-lg font-black text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                {/* Daily Hearing Target */}
                <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base text-slate-900">
                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                      <Headphones size={16} />
                    </div>
                    <span>Daily Hearing (Mins)</span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={hearingMins}
                    onChange={(e) => setHearingMins(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-mono text-base sm:text-lg font-black text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

              </div>

            </div>

            {/* Sticky Save Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Sparkles size={13} className="text-indigo-500" />
                <span>Saved to BACE standards</span>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || savedSuccess}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 cursor-pointer disabled:opacity-50 hover:scale-105"
                >
                  {savedSuccess ? <Check size={16} /> : <Save size={16} />}
                  <span>{saving ? 'Saving...' : savedSuccess ? '✓ Saved!' : 'Save Benchmarks'}</span>
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
