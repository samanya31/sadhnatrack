import React, { useState } from 'react';
import { Layout } from '../components/Layout';
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
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

export const StudentDashboard = () => {
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
    seva_topic: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase.from('sadhana_entries').insert([
        { ...formData, user_id: user.id }
      ]);

      if (error) throw error;
      setSuccess(true);
      
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
        seva_topic: ''
      }));

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Error saving sadhana entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-1 sm:px-0">
        <div className="mb-6 md:mb-10 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Daily Sadhana Log</h1>
          <p className="text-slate-500 mt-1 font-medium">Submit your spiritual progress for today</p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
            <CheckCircle2 size={24} className="shrink-0 text-emerald-500" />
            <span className="font-black text-sm md:text-base">Sadhana entry saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-10">
          {/* Basic Info */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <CalendarIcon size={24} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Basic Info</h2>
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

          {/* Japa */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                <RotateCcw size={24} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Japa Rounds</h2>
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
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shadow-sm">
                  <Headphones size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Hearing</h2>
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
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <BookOpen size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Reading</h2>
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

          {/* Sewa Section */}
          <section className="glass-card rounded-[2rem] p-6 md:p-10 shadow-xl border-slate-100/50">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
                <UserCheck size={24} />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Sewa Performed</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <input type="checkbox" id="seva_performed" checked={formData.seva_performed} onChange={(e) => setFormData({ ...formData, seva_performed: e.target.checked })} className="w-6 h-6 text-primary-600 rounded-lg focus:ring-primary-500 cursor-pointer" />
                <label htmlFor="seva_performed" className="text-sm font-black text-slate-700 cursor-pointer uppercase tracking-wider">Yes, I performed Sewa today</label>
              </div>

              {formData.seva_performed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Sewa Minutes</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" min="0" value={formData.seva_minutes} onChange={(e) => setFormData({ ...formData, seva_minutes: parseInt(e.target.value) || 0 })} className="input-field pl-12 h-14 rounded-2xl" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Sewa Details / Topic</label>
                    <div className="relative">
                      <Hammer className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" value={formData.seva_topic} onChange={(e) => setFormData({ ...formData, seva_topic: e.target.value })} className="input-field pl-12 h-14 rounded-2xl" placeholder="e.g. Temple Cleaning" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="flex justify-end pt-4 pb-20">
            <button type="submit" disabled={loading} className="w-full md:w-auto btn-primary flex items-center justify-center gap-3 px-12 py-5 text-xl font-black shadow-2xl rounded-[1.5rem]">
              {loading ? <RotateCcw className="animate-spin" size={28} /> : <Save size={28} />}
              {loading ? 'Saving...' : 'Submit Sadhana'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};
