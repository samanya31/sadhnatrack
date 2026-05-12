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
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const StudentDashboard = () => {
  const navigate = useNavigate();
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
  const entryIdRef = React.useRef<string | null>(null);

  // Keep ref in sync with state for use in closures
  React.useEffect(() => {
    entryIdRef.current = entryId;
  }, [entryId]);

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
            <p className="text-slate-500 mt-3 font-medium text-lg">Log your daily spiritual progress and stay consistent</p>
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
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
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
                <div className="relative">
                  <Moon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="time" value={formData.sleep_time} onChange={(e) => setFormData({ ...formData, sleep_time: e.target.value })} className="input-field pl-12 h-14 rounded-2xl" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Wake-up Time</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="time" required value={formData.wakeup_time} onChange={(e) => setFormData({ ...formData, wakeup_time: e.target.value })} className="input-field pl-12 h-14 rounded-2xl" />
                </div>
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
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
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
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="time" value={formData.rounds_completed_by} onChange={(e) => setFormData({ ...formData, rounds_completed_by: e.target.value })} className="input-field pl-12 h-14 rounded-2xl" />
                </div>
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
