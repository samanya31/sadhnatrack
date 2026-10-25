import React, { useState, useEffect } from 'react';
import { fetchPersonalBenchmarks, savePersonalBenchmarks } from '../lib/benchmarks';
import { X, Settings, Check, Clock, Sunrise, BookOpen, Headphones, Sparkles, Loader2 } from 'lucide-react';

interface PersonalBenchmarksModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const PersonalBenchmarksModal: React.FC<PersonalBenchmarksModalProps> = ({
  userId,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [targetRounds, setTargetRounds] = useState<string>('16');
  const [wakeupTime, setWakeupTime] = useState<string>('04:30');
  const [japaTime, setJapaTime] = useState<string>('12:00');
  const [readingMins, setReadingMins] = useState<string>('30');
  const [hearingMins, setHearingMins] = useState<string>('30');

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadStandards();
    }
  }, [isOpen, userId]);

  const loadStandards = async () => {
    setLoading(true);
    try {
      const standards = await fetchPersonalBenchmarks(userId);
      if (standards.target_rounds) setTargetRounds(standards.target_rounds.target_value);
      if (standards.wakeup_time) setWakeupTime(standards.wakeup_time.target_value);
      if (standards.japa_completion_time) setJapaTime(standards.japa_completion_time.target_value);
      if (standards.reading_minutes) setReadingMins(standards.reading_minutes.target_value);
      if (standards.hearing_minutes) setHearingMins(standards.hearing_minutes.target_value);
    } catch (err) {
      console.error('Error loading personal standards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    try {
      await savePersonalBenchmarks(userId, {
        target_rounds: targetRounds || '16',
        wakeup_time: wakeupTime,
        japa_completion_time: japaTime,
        reading_minutes: readingMins,
        hearing_minutes: hearingMins,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
        if (onSaved) onSaved();
      }, 1200);
    } catch (err: any) {
      console.error('Save personal standards error:', err);
      alert(err.message || 'Error saving personal sadhana standards');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-2">
            <Sparkles size={12} />
            <span>Personal Practice Track 🪷</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings size={22} className="text-emerald-600" />
            <span>My Personal Sadhana Standards</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            Customize your personal daily spiritual standards. Set your own pace for rounds, rise time, reading, and hearing. Your AI Sadhna Coach evaluates your daily logs against these standards.
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="animate-spin mx-auto mb-2 text-emerald-600" size={24} />
            <p className="text-xs font-bold">Loading your standards...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            
            {/* Daily Target Rounds - Prominent Full Width */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-emerald-50/30 border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                  <span>📿</span>
                  <span>Daily Japa Target (Rounds)</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {targetRounds} Rounds / day
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 font-medium">
                Not everyone starts at 16 rounds. Choose whatever count you are comfortably practicing daily.
              </p>
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {['1', '2', '4', '8', '12', '16', '25', '32'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetRounds(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      targetRounds === r
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {r} Rounds
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Custom Rounds:</span>
                <input
                  type="number"
                  min="1"
                  max="192"
                  required
                  value={targetRounds}
                  onChange={(e) => setTargetRounds(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Wake-Up Target */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  <Sunrise size={16} className="text-amber-500" />
                  <span>Wake-Up Standard</span>
                </div>
                <input
                  type="time"
                  required
                  value={wakeupTime}
                  onChange={(e) => setWakeupTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Brahma Muhurta rise time</p>
              </div>

              {/* Japa Completion Target */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  <Clock size={16} className="text-indigo-500" />
                  <span>Japa Completion Time</span>
                </div>
                <input
                  type="time"
                  required
                  value={japaTime}
                  onChange={(e) => setJapaTime(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                  Finish {targetRounds ? `${targetRounds} rounds` : 'your rounds'} by this hour
                </p>
              </div>

              {/* Reading Target (Minutes) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  <BookOpen size={16} className="text-emerald-500" />
                  <span>Daily Reading (Mins)</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="360"
                  required
                  value={readingMins}
                  onChange={(e) => setReadingMins(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="30"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Svadhyaya (Prabhupada books)</p>
              </div>

              {/* Hearing Target (Minutes) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  <Headphones size={16} className="text-purple-500" />
                  <span>Daily Hearing (Mins)</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="360"
                  required
                  value={hearingMins}
                  onChange={(e) => setHearingMins(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="30"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">Shravanam (Lectures & Kirtan)</p>
              </div>

            </div>

            {savedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>Personal sadhana standards saved! AI Coach will now use these standards.</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || savedSuccess}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{saving ? 'Saving...' : 'Save Standards'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
