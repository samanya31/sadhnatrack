import React, { useState } from 'react';
import { StudentLayout } from '../components/StudentLayout';
import { supabase } from '../lib/supabase';
import {
  Save,
  Clock,
  RotateCcw,
  BookOpen,
  Headphones,
  UserCheck,
  Calendar as CalendarIcon,
  Hash,
  Book,
  Moon,
  CheckCircle2,
  Hammer,
  User,
  Bookmark,
  MessageSquare,
  BarChart3,
  Dumbbell
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const StudentDashboard = () => {
  const navigate = useNavigate();

  // 12-hour time picker helper
  const parse24to12 = (time24: string) => {
    if (!time24) return { hour: '', minute: '', period: 'AM' };
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { hour: String(hour12), minute: String(m).padStart(2, '0'), period };
  };

  const to24 = (hour: string, minute: string, period: string) => {
    if (!hour || !minute) return '';
    let h = parseInt(hour);
    if (period === 'AM' && h === 12) h = 0;
    else if (period === 'PM' && h !== 12) h += 12;
    return `${String(h).padStart(2, '0')}:${minute}`;
  };

  const TimePicker = ({ value, onChange, icon: Icon, disabled }: { value: string; onChange: (val: string) => void; icon: any; disabled?: boolean }) => {
    const parsed = parse24to12(value);
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'hour' | 'minute'>('hour');
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Outside click listener
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    const update = (field: string, val: string) => {
      let nextHour = field === 'hour' ? val : parsed.hour;
      let nextMinute = field === 'minute' ? val : parsed.minute;
      let nextPeriod = field === 'period' ? val : parsed.period;

      if (!nextHour || !nextMinute) {
        if (field === 'hour' && val) {
          nextMinute = '00';
        } else if (field === 'minute' && val) {
          nextHour = '05';
        } else {
          onChange('');
          return;
        }
      }

      onChange(to24(nextHour, nextMinute, nextPeriod));
    };

    const handleHourSelect = (h: string) => {
      update('hour', h);
      // Auto-transition to minutes after a short delay for premium feel
      setTimeout(() => {
        setActiveTab('minute');
      }, 150);
    };

    const handleMinuteSelect = (m: string) => {
      update('minute', m);
      // Auto-close after selecting minute
      setTimeout(() => {
        setIsOpen(false);
      }, 150);
    };

    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    // Compute hand angle and coordinates
    let handAngle = 0;
    if (activeTab === 'hour' && parsed.hour) {
      const hNum = parseInt(parsed.hour);
      handAngle = (hNum % 12) * 30;
    } else if (activeTab === 'minute' && parsed.minute) {
      const mNum = parseInt(parsed.minute);
      handAngle = mNum * 6;
    }

    return (
      <div ref={containerRef} className="relative w-full">
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2 h-14 w-full focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all shadow-sm">
          <Icon size={18} className="text-slate-400 shrink-0" />
          
          {/* Clickable Display Area */}
          <div 
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="relative flex-1 h-full flex items-center justify-center min-w-0 cursor-pointer"
          >
            <div className="flex items-center gap-1 font-bold text-slate-800 select-none">
              {parsed.hour && parsed.minute ? (
                <>
                  <span className="text-lg font-black">{parsed.hour.padStart(2, '0')}</span>
                  <span className="text-slate-300">:</span>
                  <span className="text-lg font-black">{parsed.minute}</span>
                </>
              ) : (
                <>
                  <span className="text-slate-400 font-extrabold text-sm">HH</span>
                  <span className="text-slate-350">:</span>
                  <span className="text-slate-400 font-extrabold text-sm">MM</span>
                </>
              )}
              <span className="text-[10px] text-slate-350 ml-1">▼</span>
            </div>
          </div>

          {/* AM/PM Switcher on the right (keeps it side-by-side) */}
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/50 relative z-10">
            <button
              type="button"
              disabled={disabled}
              onClick={() => update('period', 'AM')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                parsed.period === 'AM'
                  ? 'bg-white text-slate-800 shadow-sm font-extrabold border border-slate-200/40'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >AM</button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => update('period', 'PM')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                parsed.period === 'PM'
                  ? 'bg-white text-slate-800 shadow-sm font-extrabold border border-slate-200/40'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >PM</button>
          </div>
        </div>

        {/* Visual Clock Picker Popover */}
        {isOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-72 bg-white border border-slate-200 rounded-[2rem] shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header: Tab selection */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200/30">
              <button
                type="button"
                onClick={() => setActiveTab('hour')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                  activeTab === 'hour'
                    ? 'bg-white text-primary-600 shadow-sm border border-slate-200/40'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Hours
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('minute')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                  activeTab === 'minute'
                    ? 'bg-white text-primary-600 shadow-sm border border-slate-200/40'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Minutes
              </button>
            </div>

            {/* Selected Value Indicator */}
            <div className="text-center mb-2">
              <button
                type="button"
                onClick={() => setActiveTab('hour')}
                className={`text-2xl font-black transition-all ${
                  activeTab === 'hour' ? 'text-primary-600 scale-110' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {parsed.hour ? parsed.hour.padStart(2, '0') : 'HH'}
              </button>
              <span className="text-2xl font-black text-slate-300 mx-2">:</span>
              <button
                type="button"
                onClick={() => setActiveTab('minute')}
                className={`text-2xl font-black transition-all ${
                  activeTab === 'minute' ? 'text-primary-600 scale-110' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {parsed.minute ? parsed.minute : 'MM'}
              </button>
            </div>

            {/* Circular Clock Dial */}
            <div className="w-52 h-52 rounded-full border border-slate-100 bg-slate-50/50 relative flex items-center justify-center mx-auto my-3 select-none">
              {/* Clock Center Dot */}
              <div className="absolute w-2 h-2 rounded-full bg-primary-600 z-20" />
              
              {/* Clock Hand */}
              {((activeTab === 'hour' && parsed.hour) || (activeTab === 'minute' && parsed.minute)) && (
                <div 
                  className="absolute bottom-1/2 left-1/2 w-0.5 bg-primary-500 origin-bottom transition-all duration-200 z-10"
                  style={{ 
                    height: '76px', 
                    transform: `translateX(-50%) rotate(${handAngle}deg)` 
                  }}
                >
                  {/* Circle tip representing the selected state */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary-600 border border-white" />
                </div>
              )}

              {/* Render Numbers */}
              {activeTab === 'hour' ? (
                hours.map((h) => {
                  const hNum = parseInt(h);
                  const angle = (hNum * 30 * Math.PI) / 180;
                  const r = 76; // radius of numbers inside 208px container
                  const x = Math.sin(angle) * r;
                  const y = -Math.cos(angle) * r;
                  const isSelected = parsed.hour && parseInt(parsed.hour) === hNum;

                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute w-8 h-8 rounded-full text-xs font-black flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-110 z-20'
                          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 active:scale-90 z-20'
                      }`}
                    >
                      {h.padStart(2, '0')}
                    </button>
                  );
                })
              ) : (
                minutes.map((m) => {
                  const mNum = parseInt(m);
                  const angle = (mNum * 6 * Math.PI) / 180;
                  const r = 76; // radius of numbers inside 208px container
                  const x = Math.sin(angle) * r;
                  const y = -Math.cos(angle) * r;
                  const isSelected = parsed.minute && parseInt(parsed.minute) === mNum;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMinuteSelect(m)}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                      }}
                      className={`absolute w-8 h-8 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-110 z-20'
                          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 active:scale-90 z-20'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Control buttons */}
            <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="flex-1 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    wakeup_time: '',
    sleep_time: '',
    rounds_completed: 0,
    rounds_completed_by: '',
    rounds_description: '',
    hearing_done: false,
    hearing_minutes: 0,
    hearing_title: '',
    hearing_speaker: '',
    reading_done: false,
    reading_minutes: 0,
    reading_book: '',
    reading_sloka: '',
    seva_performed: false,
    seva_minutes: 0,
    seva_topic: '',
    exercise_done: false,
    exercise_minutes: 0,
    exercise_description: '',
    mangal_arti: false,
    tulasi_arti: false,
    morning_japa: false,
    morning_hearing: false,
    morning_comment: '',
    status: 'draft' as 'draft' | 'submitted'
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [entryId, setEntryId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const entryIdRef = React.useRef<string | null>(null);

  // Keep ref in sync with state for use in closures
  React.useEffect(() => {
    entryIdRef.current = entryId;
  }, [entryId]);

  // Fetch user profile on mount
  React.useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, bace:baces(name)')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchProfile();
  }, []);

  // Fetch today's entry on mount or date change
  React.useEffect(() => {
    const fetchTodayEntry = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('sadhana_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', formData.date)
          .maybeSingle();

        if (data) {
          setEntryId(data.id);
          setFormData({
            date: data.date,
            wakeup_time: data.wakeup_time || '',
            sleep_time: data.sleep_time || '',
            rounds_completed: data.rounds_completed || 0,
            rounds_completed_by: data.rounds_completed_by || '',
            rounds_description: data.rounds_description || '',
            hearing_done: data.hearing_done || false,
            mangal_arti: data.mangal_arti || false,
            tulasi_arti: data.tulasi_arti || false,
            morning_japa: data.morning_japa || false,
            morning_hearing: data.morning_hearing || false,
            morning_comment: data.morning_comment || '',
            hearing_minutes: data.hearing_minutes || 0,
            hearing_speaker: data.hearing_speaker || '',
            hearing_title: data.hearing_title || '',
            reading_done: data.reading_done || false,
            reading_minutes: data.reading_minutes || 0,
            reading_book: data.reading_book || '',
            reading_sloka: data.reading_sloka || '',
            seva_performed: data.seva_performed || false,
            seva_minutes: data.seva_minutes || 0,
            seva_topic: data.seva_topic || '',
            exercise_done: data.exercise_done || false,
            exercise_minutes: data.exercise_minutes || 0,
            exercise_description: data.exercise_description || '',
            status: data.status || 'draft'
          });
          setLastSaved(new Date(data.created_at));
        } else {
          setEntryId(null);
          // Reset fields but keep date
          setFormData(prev => ({
            ...prev,
            wakeup_time: '',
            sleep_time: '',
            rounds_completed: 0,
            rounds_completed_by: '',
            rounds_description: '',
            hearing_done: false,
            hearing_minutes: 0,
            hearing_title: '',
            hearing_speaker: '',
            reading_done: false,
            reading_minutes: 0,
            reading_book: '',
            reading_sloka: '',
            seva_performed: false,
            seva_minutes: 0,
            seva_topic: '',
            exercise_done: false,
            exercise_minutes: 0,
            exercise_description: '',
            mangal_arti: false,
            tulasi_arti: false,
            morning_japa: false,
            morning_hearing: false,
            morning_comment: '',
            status: 'draft'
          }));
        }
      } catch (err) {
        console.error('Error fetching entry:', err);
      }
    };

    fetchTodayEntry();
  }, [formData.date]);

  const sanitizePayload = (data: typeof formData) => {
    const sanitized = { ...data };
    // Convert empty strings to null for time and numeric fields to avoid DB errors
    if (sanitized.wakeup_time === "") sanitized.wakeup_time = null as any;
    if (sanitized.sleep_time === "") sanitized.sleep_time = null as any;
    if (sanitized.rounds_completed_by === "") sanitized.rounds_completed_by = null as any;
    return sanitized;
  };

  // Auto-save logic (Debounced)
  const saveDraft = async (dataToSave: typeof formData) => {
    if (dataToSave.status === 'submitted') return; // Don't auto-save if already submitted

    setAutoSaveStatus('saving');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        ...sanitizePayload(dataToSave),
        user_id: user.id,
        ...(entryIdRef.current ? { id: entryIdRef.current } : {})
      };

      const { data, error } = await supabase
        .from('sadhana_entries')
        .upsert(payload, { onConflict: 'user_id, date' })
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEntryId(data.id);
        setLastSaved(new Date());
        setAutoSaveStatus('saved');
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('error');
    }
  };

  // Trigger auto-save when formData changes (except date change which triggers fetch)
  React.useEffect(() => {
    if (formData.status === 'submitted') return;

    const timer = setTimeout(() => {
      saveDraft(formData);
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    formData.wakeup_time,
    formData.sleep_time,
    formData.rounds_completed,
    formData.rounds_completed_by,
    formData.rounds_description,
    formData.hearing_done,
    formData.hearing_minutes,
    formData.hearing_title,
    formData.hearing_speaker,
    formData.reading_done,
    formData.reading_minutes,
    formData.reading_book,
    formData.reading_sloka,
    formData.seva_performed,
    formData.seva_minutes,
    formData.seva_topic,
    formData.exercise_done,
    formData.exercise_minutes,
    formData.exercise_description,
    formData.mangal_arti,
    formData.tulasi_arti,
    formData.morning_japa,
    formData.morning_hearing,
    formData.morning_comment
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to final submit? You won\'t be able to edit this entry later.')) {
      setLoading(true);
      setSuccess(false);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const payload = {
          ...sanitizePayload(formData),
          user_id: user.id,
          status: 'submitted',
          ...(entryIdRef.current ? { id: entryIdRef.current } : {})
        };

        const { error } = await supabase
          .from('sadhana_entries')
          .upsert(payload, { onConflict: 'user_id, date' });

        if (error) throw error;
        setSuccess(true);
        setFormData(prev => ({ ...prev, status: 'submitted' }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error(err);
        alert('Error final submitting sadhana entry.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <StudentLayout>
      <div className="max-w-4xl mx-auto px-1 sm:px-0 mb-10 animate-fade-in">
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-slide-up">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4 justify-center md:justify-start">
              <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
                <Save size={28} />
              </div>
              Sadhna Entry
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
              <p className="text-slate-500 font-medium text-lg">Log your daily spiritual progress</p>
              {userProfile?.bace?.name && (
                <div className="px-3 py-1 bg-primary-50 text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-primary-100 flex items-center gap-2">
                  <Hammer size={12} className="rotate-45" />
                  {userProfile.bace.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            {formData.status === 'submitted' && (
              <div className="px-4 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                Final Submitted
              </div>
            )}
            {formData.status === 'draft' && (
              <div className="flex items-center gap-2 px-4 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100">
                {autoSaveStatus === 'saving' ? (
                  <>
                    <RotateCcw size={12} className="animate-spin" />
                    Saving Draft...
                  </>
                ) : autoSaveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    Draft Saved {lastSaved && `at ${format(lastSaved, 'HH:mm')}`}
                  </>
                ) : (
                  <>
                    <Save size={12} />
                    Autosave Active
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {success && (
          <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="shrink-0 text-emerald-500" />
              <span className="font-black text-base md:text-lg">Sadhana entry saved successfully!</span>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="w-full md:w-auto bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <BarChart3 size={18} />
              View Reports
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-10">
          {/* Basic Info */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50 relative z-20">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                  <CalendarIcon size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Basic Info</h2>
              </div>
              {formData.status !== 'submitted' && (
                <button
                  type="button"
                  onClick={() => saveDraft(formData)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
                >
                  <Save size={14} />
                  Save Draft
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Date</label>
                <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="input-field h-14 rounded-2xl" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Sleep Time (Prev. Night)</label>
                <TimePicker icon={Moon} value={formData.sleep_time} onChange={(val) => setFormData({ ...formData, sleep_time: val })} disabled={formData.status === 'submitted'} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Wake-up Time</label>
                <TimePicker icon={Clock} value={formData.wakeup_time} onChange={(val) => setFormData({ ...formData, wakeup_time: val })} disabled={formData.status === 'submitted'} />
              </div>
            </div>
          </section>

          {/* Morning Program Section */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-sm">
                  <Moon size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Morning Program</h2>
              </div>
              {formData.status !== 'submitted' && (
                <button
                  type="button"
                  onClick={() => saveDraft(formData)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
                >
                  <Save size={14} />
                  Save Draft
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { key: 'mangal_arti', label: 'Mangal Arti' },
                { key: 'tulasi_arti', label: 'Tulasi Arti' },
                { key: 'morning_japa', label: 'Japa' },
                { key: 'morning_hearing', label: 'Hearing' },
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() => formData.status !== 'submitted' && setFormData({ ...formData, [item.key]: !formData[item.key as keyof typeof formData] })}
                  className={`
                    p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2 text-center
                    ${formData[item.key as keyof typeof formData]
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}
                  `}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData[item.key as keyof typeof formData] ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                    {formData[item.key as keyof typeof formData] ? <CheckCircle2 size={20} /> : <div className="w-2 h-2 bg-current rounded-full" />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                  <span className="text-[10px] font-bold opacity-60 uppercase">{formData[item.key as keyof typeof formData] ? 'Attended' : 'Not Attended'}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Optional Comment</label>
              <textarea
                value={formData.morning_comment}
                onChange={(e) => setFormData({ ...formData, morning_comment: e.target.value })}
                className="input-field min-h-[80px] py-4 rounded-2xl"
                placeholder="Any comments on why you couldn't attend."
              />
            </div>
          </section>

          {/* Japa */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                  <RotateCcw size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Japa Rounds</h2>
              </div>
              {formData.status !== 'submitted' && (
                <button
                  type="button"
                  onClick={() => saveDraft(formData)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
                >
                  <Save size={14} />
                  Save Draft
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Rounds Completed</label>
                <input type="number" min="0" required value={formData.rounds_completed} onChange={(e) => setFormData({ ...formData, rounds_completed: parseInt(e.target.value) || 0 })} className="input-field h-14 rounded-2xl" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Final Completion (Time)</label>
                <TimePicker icon={Clock} value={formData.rounds_completed_by} onChange={(val) => setFormData({ ...formData, rounds_completed_by: val })} disabled={formData.status === 'submitted'} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <MessageSquare size={14} className="text-slate-400" /> Chanting Breakdown (Optional)
                </label>
                <textarea
                  value={formData.rounds_description}
                  onChange={(e) => setFormData({ ...formData, rounds_description: e.target.value })}
                  className="input-field min-h-[80px] py-4 rounded-2xl"
                  placeholder="e.g. 8 in morning, 4 in afternoon, 4 in night"
                />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Hearing */}
            <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
                    <Headphones size={24} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Hearing</h2>
                </div>
                {formData.status !== 'submitted' && (
                  <button
                    type="button"
                    onClick={() => saveDraft(formData)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
                  >
                    <Save size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <input type="checkbox" id="hearing_done" checked={formData.hearing_done} onChange={(e) => setFormData({ ...formData, hearing_done: e.target.checked })} className="w-6 h-6 text-primary-600 rounded-lg focus:ring-primary-500 cursor-pointer" />
                  <label htmlFor="hearing_done" className="text-sm font-black text-slate-700 cursor-pointer uppercase tracking-wider">Hearing Done?</label>
                </div>

                {formData.hearing_done && (
                  <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Minutes</label>
                      <input type="number" min="0" value={formData.hearing_minutes} onChange={(e) => setFormData({ ...formData, hearing_minutes: parseInt(e.target.value) || 0 })} className="input-field h-12 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User size={14} className="text-slate-400" /> Speaker
                      </label>
                      <input type="text" value={formData.hearing_speaker} onChange={(e) => setFormData({ ...formData, hearing_speaker: e.target.value })} className="input-field h-12 rounded-xl" placeholder="e.g. Srila Prabhupada" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Bookmark size={14} className="text-slate-400" /> Topic
                      </label>
                      <input type="text" value={formData.hearing_title} onChange={(e) => setFormData({ ...formData, hearing_title: e.target.value })} className="input-field h-12 rounded-xl" placeholder="e.g. Varna Ashrama" />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Reading */}
            <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <BookOpen size={24} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Reading</h2>
                </div>
                {formData.status !== 'submitted' && (
                  <button
                    type="button"
                    onClick={() => saveDraft(formData)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
                  >
                    <Save size={14} />
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <input type="checkbox" id="reading_done" checked={formData.reading_done} onChange={(e) => setFormData({ ...formData, reading_done: e.target.checked })} className="w-6 h-6 text-primary-600 rounded-lg focus:ring-primary-500 cursor-pointer" />
                  <label htmlFor="reading_done" className="text-sm font-black text-slate-700 cursor-pointer uppercase tracking-wider">Reading Done?</label>
                </div>

                {formData.reading_done && (
                  <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Minutes</label>
                      <input type="number" min="0" value={formData.reading_minutes} onChange={(e) => setFormData({ ...formData, reading_minutes: parseInt(e.target.value) || 0 })} className="input-field h-12 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Book size={14} className="text-slate-400" /> Book Name
                      </label>
                      <input type="text" value={formData.reading_book} onChange={(e) => setFormData({ ...formData, reading_book: e.target.value })} className="input-field h-12 rounded-xl" placeholder="e.g. Bhagavad Gita" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Hash size={14} className="text-slate-400" /> Sloka #
                      </label>
                      <input type="text" value={formData.reading_sloka} onChange={(e) => setFormData({ ...formData, reading_sloka: e.target.value })} className="input-field h-12 rounded-xl" placeholder="e.g. 2.13" />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Seva Section */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                  <UserCheck size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Seva Performed</h2>
              </div>
              {formData.status !== 'submitted' && (
                <button
                  type="button"
                  onClick={() => saveDraft(formData)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
                >
                  <Save size={14} />
                  Save Draft
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input type="checkbox" id="seva_performed" checked={formData.seva_performed} onChange={(e) => setFormData({ ...formData, seva_performed: e.target.checked })} className="w-6 h-6 text-primary-600 rounded-lg focus:ring-primary-500 cursor-pointer" />
                <label htmlFor="seva_performed" className="text-sm font-black text-slate-700 cursor-pointer uppercase tracking-wider">Yes, I performed Seva today</label>
              </div>

              {formData.seva_performed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seva Minutes</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" min="0" value={formData.seva_minutes} onChange={(e) => setFormData({ ...formData, seva_minutes: parseInt(e.target.value) || 0 })} className="input-field pl-12 h-14 rounded-2xl" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seva Details / Topic</label>
                    <div className="relative">
                      <Hammer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" value={formData.seva_topic} onChange={(e) => setFormData({ ...formData, seva_topic: e.target.value })} className="input-field pl-12 h-14 rounded-2xl" placeholder="e.g. Temple Cleaning" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Exercise Section */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm">
                  <Dumbbell size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Physical Exercise</h2>
              </div>
              {formData.status !== 'submitted' && (
                <button
                  type="button"
                  onClick={() => saveDraft(formData)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
                >
                  <Save size={14} />
                  Save Draft
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input type="checkbox" id="exercise_done" checked={formData.exercise_done} onChange={(e) => setFormData({ ...formData, exercise_done: e.target.checked })} className="w-6 h-6 text-primary-600 rounded-lg focus:ring-primary-500 cursor-pointer" />
                <label htmlFor="exercise_done" className="text-sm font-black text-slate-700 cursor-pointer uppercase tracking-wider">Yes, I exercised today</label>
              </div>

              {formData.exercise_done && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Exercise Minutes</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" min="0" value={formData.exercise_minutes} onChange={(e) => setFormData({ ...formData, exercise_minutes: parseInt(e.target.value) || 0 })} className="input-field pl-12 h-14 rounded-2xl" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Exercise Type / Details</label>
                    <div className="relative">
                      <Dumbbell className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" value={formData.exercise_description} onChange={(e) => setFormData({ ...formData, exercise_description: e.target.value })} className="input-field pl-12 h-14 rounded-2xl" placeholder="e.g. Jogging, Yoga, Gym" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-col md:flex-row justify-end gap-4 pt-4 pb-20">
            {formData.status !== 'submitted' ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-emerald-700 text-white flex items-center justify-center gap-3 px-12 py-5 text-xl font-black shadow-2xl rounded-[1.5rem] hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <RotateCcw className="animate-spin" size={28} /> : <CheckCircle2 size={28} />}
                {loading ? 'Submitting...' : 'Final Submit'}
              </button>
            ) : (
              <div className="w-full md:w-auto bg-emerald-50 text-emerald-600 flex items-center justify-center gap-3 px-12 py-5 text-xl font-black rounded-[1.5rem] border-2 border-emerald-100">
                <CheckCircle2 size={28} />
                Submitted
              </div>
            )}
          </div>
        </form>
      </div>
    </StudentLayout>
  );
};
