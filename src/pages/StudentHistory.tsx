import { useState, useEffect } from 'react';
import { StudentLayout } from '../components/StudentLayout';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  Headphones, 
  Sunrise, 
  Moon,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Hammer,
  TrendingUp,
  ClipboardList,
  Target,
  Award,
  Check
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';

export const StudentHistory = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthEntries, setMonthEntries] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  useEffect(() => {
    fetchMonthData();
  }, [currentMonth]);

  const fetchMonthData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('sadhana_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth(currentMonth), 'yyyy-MM-dd'));

      setMonthEntries(data || []);
    } catch (error) {
      console.error('Error fetching month data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedDateEntry = monthEntries.find(e => isSameDay(parseISO(e.date), selectedDate));

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '—';
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'hh:mm a');
    } catch (e) {
      return timeStr;
    }
  };

  // Stats for the top bar
  const totalRounds = monthEntries.reduce((sum, e) => sum + (e.rounds_completed || 0), 0);
  const avgRounds = monthEntries.length > 0 ? (totalRounds / monthEntries.length).toFixed(1) : 0;
  const totalHearing = monthEntries.reduce((sum, e) => sum + (e.hearing_minutes || 0), 0);

  return (
    <StudentLayout>
      <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-primary-100">
              <TrendingUp size={12} />
              Spiritual Performance
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Sadhana History</h1>
            <p className="text-slate-500 font-medium max-w-lg">Review your spiritual data with the same depth as the admin console.</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white p-2 rounded-[2rem] shadow-soft border border-slate-100">
              <button 
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-6 py-2 text-xs font-black text-slate-900 uppercase tracking-[0.2em]">
                {format(currentMonth, 'MMMM yyyy')}
              </div>
              <button 
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-95"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Top Summary Cards (Exact Admin Style) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-soft hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                <Target size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Rounds</p>
                <p className="text-2xl font-black text-slate-900">{avgRounds}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-soft hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                <Headphones size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hearing</p>
                <p className="text-2xl font-black text-slate-900">{totalHearing}m</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-soft hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Award size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logs</p>
                <p className="text-2xl font-black text-slate-900">{monthEntries.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-soft hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                <ClipboardList size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progress</p>
                <p className="text-2xl font-black text-slate-900">{Math.round((monthEntries.length / daysInMonth.length) * 100)}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Calendar Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4 md:space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 md:p-8 shadow-soft">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Date</h3>
                 <Calendar size={18} className="text-slate-300" />
              </div>
              <div className="grid grid-cols-7 gap-3 text-center mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-3">
                {daysInMonth.map((day, idx) => {
                  const entry = monthEntries.find(e => isSameDay(parseISO(e.date), day));
                  const isSelected = isSameDay(day, selectedDate);
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300
                        ${isSelected 
                          ? 'bg-slate-900 text-white shadow-xl scale-110 z-10' 
                          : 'hover:bg-slate-50 text-slate-600'}
                        active:scale-95
                      `}
                    >
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                        {format(day, 'd')}
                      </span>
                      {entry && !isSelected && (
                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${entry.status === 'submitted' ? 'bg-emerald-400' : 'bg-amber-400 shadow-sm'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed View (Exact Admin Layout) */}
          <div className="lg:col-span-8">
            {selectedDateEntry ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Status Bar */}
                <div className="bg-white/60 backdrop-blur-xl p-4 rounded-[2rem] border border-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 px-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${selectedDateEntry.status === 'submitted' ? 'bg-emerald-500' : 'bg-amber-500 shadow-sm'} animate-pulse`} />
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                        {selectedDateEntry.status === 'submitted' ? 'Entry Finalized' : 'Draft Progress'}
                      </h4>
                      <p className="text-xs font-bold text-slate-400 italic">Logged on {format(parseISO(selectedDateEntry.date), 'EEEE, do MMMM')}</p>
                    </div>
                  </div>
                </div>

                {/* Top Row Grid (Admin Logic) */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main Rounds Card */}
                  <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 md:p-7 flex flex-col justify-between min-h-[180px] group hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-6">
                      <div className="relative w-24 h-24 shrink-0 min-h-[96px]">
                        <ResponsiveContainer width="100%" height="100%" minHeight={96}>
                          <PieChart>
                            <Pie
                              data={[
                                { value: Math.min(selectedDateEntry.rounds_completed, 16) },
                                { value: Math.max(16 - selectedDateEntry.rounds_completed, 0) }
                              ]}
                              innerRadius={32}
                              outerRadius={44}
                              paddingAngle={0}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                              stroke="none"
                            >
                              <Cell fill="#4F46E5" />
                              <Cell fill="#EEF2FF" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                            <Check size={20} className="font-black" />
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                {Math.min(selectedDateEntry.rounds_completed, 16)}
                              </span>
                              <span className="text-lg font-bold text-slate-300">/16</span>
                            </div>
                            <p className="text-sm font-bold text-slate-500 mb-3">Rounds</p>
                          </div>

                          {selectedDateEntry.rounds_completed > 16 && (
                            <div className="text-right">
                              <div className="flex items-baseline justify-end gap-1 text-amber-600">
                                <span className="text-2xl font-black">+{selectedDateEntry.rounds_completed - 16}</span>
                              </div>
                              <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">Extra</p>
                            </div>
                          )}
                        </div>
                        
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          selectedDateEntry.rounds_completed >= 16 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-orange-50 text-orange-600 border border-orange-100'
                        }`}>
                          {selectedDateEntry.rounds_completed >= 16 ? 'Completed' : 'In Progress'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap items-center justify-center gap-2.5">
                      <div className="flex items-center gap-2 text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100/50">
                        <Clock size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {selectedDateEntry.rounds_completed_by 
                            ? `Finished at ${formatTime(selectedDateEntry.rounds_completed_by)}` 
                            : 'Time not logged'}
                        </span>
                      </div>
                      {selectedDateEntry.rounds_description && (
                        <div className="flex items-center gap-2 text-blue-600 bg-blue-50/60 px-3 py-1.5 rounded-full border border-blue-100/60">
                          <span className="text-[10px] font-bold italic truncate max-w-[200px]">
                            {selectedDateEntry.rounds_description}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wake Up Card */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-5 md:p-6 flex flex-col items-center justify-center gap-3 group hover:shadow-md transition-all duration-300 min-h-[140px] md:min-h-[180px]">
                    <div className="w-12 h-12 bg-blue-50 rounded-[1.2rem] flex items-center justify-center text-blue-500 transition-transform group-hover:scale-110 duration-300">
                      <Sunrise size={28} />
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Wake Up</p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">{formatTime(selectedDateEntry.wakeup_time)}</p>
                    </div>
                  </div>

                  {/* Sleep Card */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-5 md:p-6 flex flex-col items-center justify-center gap-3 group hover:shadow-md transition-all duration-300 min-h-[140px] md:min-h-[180px]">
                    <div className="w-12 h-12 bg-indigo-50 rounded-[1.2rem] flex items-center justify-center text-indigo-500 transition-transform group-hover:scale-110 duration-300">
                      <Moon size={28} />
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sleep</p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">{formatTime(selectedDateEntry.sleep_time)}</p>
                    </div>
                  </div>
                </div>

                {/* Attendance Row */}
                <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] border border-white p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3 px-2 sm:px-4 py-2">
                      <div className="w-1 h-6 bg-slate-200 rounded-full"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Attendance Status</span>
                    </div>
                    <div className="w-full md:w-auto grid grid-cols-1 min-[420px]:grid-cols-2 md:flex md:flex-nowrap gap-3">
                      {[
                        { label: 'Mangal Arti', value: selectedDateEntry.mangal_arti },
                        { label: 'Tulasi Arti', value: selectedDateEntry.tulasi_arti },
                        { label: 'Morning Japa', value: selectedDateEntry.morning_japa },
                        { label: 'Morning Hearing', value: selectedDateEntry.morning_hearing },
                      ].map((item) => (
                        <div 
                          key={item.label} 
                          className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl border transition-all w-full md:w-auto md:shrink-0 ${
                            item.value 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm' 
                              : 'bg-slate-50/50 border-slate-100/50 text-slate-400'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.value ? 'bg-emerald-500 text-white' : 'bg-slate-200'}`}>
                            {item.value ? <Check size={12} strokeWidth={4} /> : <div className="w-1 h-1 bg-current rounded-full" />}
                          </div>
                          <span className="text-xs font-black tracking-tight">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedDateEntry.morning_comment && (
                    <div className="w-full mt-4 pt-4 border-t border-slate-100 flex items-start gap-3 px-4">
                      <MessageSquare className="text-rose-400 shrink-0 mt-0.5" size={14} />
                      <p className="text-xs md:text-sm font-bold text-slate-600 leading-relaxed italic">
                        "{selectedDateEntry.morning_comment}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Content Sections Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hearing Info */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-5 md:p-8 space-y-4 md:space-y-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500">
                        <Headphones size={24} />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hearing</p>
                        <p className="text-2xl font-black text-slate-900">{selectedDateEntry.hearing_minutes || 0}m</p>
                      </div>
                    </div>
                    {selectedDateEntry.hearing_done && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2">
                        <p className="text-sm font-black text-slate-800 shrink-0">{selectedDateEntry.hearing_speaker || "Unknown Speaker"}</p>
                        <p className="text-[10px] font-bold text-slate-400 italic border-l border-slate-200 pl-4">{selectedDateEntry.hearing_title || "General Lecture"}</p>
                      </div>
                    )}
                  </div>

                  {/* Reading Info */}
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 p-5 md:p-8 space-y-4 md:space-y-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                        <BookOpen size={24} />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reading</p>
                        <p className="text-2xl font-black text-slate-900">{selectedDateEntry.reading_minutes || 0}m</p>
                      </div>
                    </div>
                    {selectedDateEntry.reading_done && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                        <p className="text-sm font-black text-slate-800 shrink-0">{selectedDateEntry.reading_book || "Unknown Book"}</p>
                        <div className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-emerald-100/50">
                          Sloka {selectedDateEntry.reading_sloka || "—"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Seva Wide Card */}
                  <div className={`md:col-span-2 rounded-[2.5rem] border p-5 md:p-8 flex items-center justify-between gap-6 md:gap-8 hover:shadow-md transition-all ${
                    selectedDateEntry.seva_performed 
                      ? 'bg-amber-50/50 border-amber-100' 
                      : 'bg-white border-slate-100'
                  }`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${
                        selectedDateEntry.seva_performed ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'
                      }`}>
                        <Hammer size={32} />
                      </div>
                      <div>
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Seva</h5>
                        <p className={`text-xl font-semibold tracking-tight ${selectedDateEntry.seva_performed ? 'text-slate-700' : 'text-slate-300'}`}>
                          {selectedDateEntry.seva_performed ? 'Service Completed' : 'No Service Logged'}
                        </p>
                        {selectedDateEntry.seva_performed && selectedDateEntry.seva_topic && (
                          <div className="mt-2.5 p-4 bg-amber-100/40 rounded-2xl border border-amber-200/30">
                            <p className="text-sm font-semibold text-amber-900/80 leading-relaxed italic">
                              "{selectedDateEntry.seva_topic}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedDateEntry.seva_performed && (
                      <div className="text-right shrink-0">
                        <p className="text-3xl font-black text-amber-600">{selectedDateEntry.seva_minutes}m</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                      </div>
                    )}
                  </div>

                  {/* Exercise Wide Card */}
                  <div className={`md:col-span-2 rounded-[2.5rem] border p-5 md:p-8 flex items-center justify-between gap-6 md:gap-8 hover:shadow-md transition-all ${
                    selectedDateEntry.exercise_done 
                      ? 'bg-teal-50/50 border-teal-100' 
                      : 'bg-white border-slate-100'
                  }`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${
                        selectedDateEntry.exercise_done ? 'bg-teal-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829L9.939 3.575a2 2 0 1 1 2.829 2.829z"/></svg>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Physical Exercise</h5>
                        <p className={`text-xl font-semibold tracking-tight ${selectedDateEntry.exercise_done ? 'text-slate-700' : 'text-slate-300'}`}>
                          {selectedDateEntry.exercise_done ? 'Exercise Completed' : 'No Exercise Logged'}
                        </p>
                        {selectedDateEntry.exercise_done && selectedDateEntry.exercise_description && (
                          <div className="mt-2.5 p-4 bg-teal-100/40 rounded-2xl border border-teal-200/30">
                            <p className="text-sm font-semibold text-teal-900/80 leading-relaxed italic">
                              "{selectedDateEntry.exercise_description}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedDateEntry.exercise_done && (
                      <div className="text-right shrink-0">
                        <p className="text-3xl font-black text-teal-600">{selectedDateEntry.exercise_minutes}m</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 md:h-64 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4 bg-white/50 p-12 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center">
                  <Calendar size={32} className="opacity-10" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-xl text-slate-900 tracking-tight">Silent Devotion</p>
                  <p className="font-medium text-slate-400 max-w-sm mx-auto leading-relaxed">No sadhana entry was recorded for this date. Every day is a new beginning!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};
