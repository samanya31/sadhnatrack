import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase, registerUserWithoutLoggingIn } from '../lib/supabase';
import { type SadhanaEntry } from '../types/index';
import { 
  Search, 
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock,
  UserPlus,
  Loader2,
  X,
  ArrowLeft,
  BookOpen,
  Headphones,
  Sunrise,
  Check,
  FileSpreadsheet,
  Moon,
  MessageSquare,
  Hammer,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import { 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { UserProfile, BACE } from '../types/index';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'students'>('logs');
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/admin/students') {
      setActiveTab('students');
    } else if (location.pathname === '/admin') {
      setActiveTab('logs');
    }
    
    if (location.state?.targetTab) {
      setActiveTab(location.state.targetTab);
    }
  }, [location.pathname, location.state]);
  const [entries, setEntries] = useState<SadhanaEntry[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [baces, setBaces] = useState<BACE[]>([]);
  const [selectedBace, setSelectedBace] = useState<string>('all');
  
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [drilldownStudent, setDrilldownStudent] = useState<any | null>(null);
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [regData, setRegData] = useState({
    email: '',
    password: '',
    fullName: '',
    baceId: '',
    role: 'student',
    gender: '' as '' | 'male' | 'female' | 'other',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, bace:baces!bace_id(name)')
            .eq('id', user.id)
            .maybeSingle();
          
          let myBaces: BACE[] = [];
          let defaultBaceId = 'all';

          if (profile?.role === 'super_admin') {
            const { data: baceData } = await supabase.from('baces').select('*');
            myBaces = baceData || [];
            defaultBaceId = 'all';
          } else if (profile?.role === 'admin') {
            const { data: directBace } = await supabase.from('baces').select('*').eq('id', profile.bace_id || '');
            let junctionBaces: any[] = [];
            try {
              const { data: junctionData } = await supabase.from('admin_baces').select('bace:baces!bace_id(*)').eq('admin_id', user.id);
              junctionBaces = (junctionData || []).map((j: any) => j.bace).filter(Boolean);
            } catch (e) {
              console.warn('admin_baces table not ready yet:', e);
            }

            const baceMap = new Map();
            [...(directBace || []), ...junctionBaces].forEach(b => baceMap.set(b.id, b));
            myBaces = Array.from(baceMap.values());
            if (myBaces.length > 0) {
              defaultBaceId = myBaces[0].id;
            } else {
              defaultBaceId = profile?.bace_id || 'all';
            }
          } else {
            defaultBaceId = profile?.bace_id || 'all';
          }

          setBaces(myBaces);
          setSelectedBace(defaultBaceId);
          setRegData(prev => ({ ...prev, baceId: defaultBaceId === 'all' ? '' : defaultBaceId }));
          setUserProfile(profile);
        }
      } catch (err) {
        console.error('Error initializing dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchEntries();
      fetchProfiles();
    }
  }, [userProfile, selectedBace]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) {
        console.error('fetchProfiles DB error:', error.message, error.code);
        // Show error in UI for debugging
        setProfiles([]);
        return;
      }

      console.log('fetchProfiles raw count:', data?.length, 'selectedBace:', selectedBace);

      let list = (data || []).filter(p => p.role === 'student');

      if (selectedBace !== 'all') {
        list = list.filter(p => p.bace_id === selectedBace);
      } else if (userProfile?.role === 'admin') {
        const myBaceIds = new Set(baces.map(b => b.id));
        if (userProfile.bace_id) myBaceIds.add(userProfile.bace_id);
        list = list.filter(p => p.bace_id && myBaceIds.has(p.bace_id));
      }

      console.log('fetchProfiles final count:', list.length);
      setProfiles(list);
    } catch (err: any) {
      console.error('fetchProfiles exception:', err?.message || err);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      
      // 1. Try relational query
      const { data: joinData, error: joinError } = await supabase
        .from('sadhana_entries')
        .select(`
          *,
          user:profiles(full_name, email, bace_id, role)
        `)
        .order('date', { ascending: false });

      if (!joinError && joinData) {
        data = joinData;
      } else {
        // 2. Fallback: Separate queries if relationship join fails
        const { data: rawEntries } = await supabase
          .from('sadhana_entries')
          .select('*')
          .order('date', { ascending: false });

        const { data: rawProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, bace_id, role');

        const profileMap = new Map((rawProfiles || []).map(p => [p.id, p]));
        data = (rawEntries || []).map(entry => ({
          ...entry,
          user: profileMap.get(entry.user_id) || { full_name: 'Student', email: '', bace_id: null, role: 'student' }
        }));
      }

      // Filter out activity log entries belonging to admins or super admins
      data = data.filter(e => e.user?.role !== 'admin' && e.user?.role !== 'super_admin');

      if (selectedBace !== 'all') {
        data = data.filter(e => e.user?.bace_id === selectedBace);
      } else if (userProfile?.role === 'admin') {
        const myBaceIds = new Set(baces.map(b => b.id));
        if (userProfile.bace_id) myBaceIds.add(userProfile.bace_id);
        data = data.filter(e => e.user?.bace_id && myBaceIds.has(e.user.bace_id));
      }

      setEntries(data);
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    const role = regData.role || 'student';
    const baceId =
      userProfile?.role === 'super_admin' ? regData.baceId : userProfile?.bace_id || regData.baceId;

    if (role === 'student' && !regData.gender) {
      setRegError('Please select gender for the student.');
      setRegLoading(false);
      return;
    }

    try {
      const { error } = await registerUserWithoutLoggingIn(
        regData.email,
        regData.password,
        {
          data: {
            full_name: regData.fullName,
            role,
            bace_id: baceId,
            created_by_admin: true,
            ...(role === 'student' ? { gender: regData.gender } : {}),
          },
        }
      );
      if (error) throw error;
      alert(role === 'admin' ? 'BACE admin registered!' : 'Student registered!');
      setIsModalOpen(false);
      setRegData({
        email: '',
        password: '',
        fullName: '',
        baceId: userProfile?.role === 'super_admin' ? '' : userProfile?.bace_id || '',
        role: 'student',
        gender: '',
      });
      fetchProfiles();
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const exportToExcel = (studentId: string, studentName: string) => {
    const studentData = entries.filter(e => e.user_id === studentId);
    const headers = [
      "Date", "Wake-up Time", "Sleep Time", 
      "Mangal Arti", "Tulasi Arti", "Morning Japa", "Morning Hearing", "Morning Comment",
      "Japa Rounds", "Japa Finished By", "Rounds Breakdown",
      "Hearing (Mins)", "Hearing Speaker", "Hearing Topic",
      "Reading (Mins)", "Reading Book", "Reading Sloka",
      "Seva (Mins)", "Seva Details",
      "Exercise (Mins)", "Exercise Type"
    ];

    const rows = studentData.map(e => [
      e.date,
      formatTime(e.wakeup_time),
      formatTime(e.sleep_time),
      e.mangal_arti ? "Yes" : "No",
      e.tulasi_arti ? "Yes" : "No",
      e.morning_japa ? "Yes" : "No",
      e.morning_hearing ? "Yes" : "No",
      e.morning_comment || "",
      e.rounds_completed,
      formatTime(e.rounds_completed_by),
      e.rounds_description || "",
      e.hearing_minutes,
      e.hearing_speaker || "",
      e.hearing_title || "",
      e.reading_minutes,
      e.reading_book || "",
      e.reading_sloka || "",
      e.seva_minutes || 0,
      e.seva_topic || "",
      e.exercise_minutes || 0,
      e.exercise_description || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Sadhana_${studentName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Removed unused filteredEntries

  const studentEntries = selectedStudent 
    ? entries.filter(e => e.user_id === selectedStudent)
    : [];

  const selectedDateEntry = studentEntries.find(e => e.date === filterDate);
  const selectedProfile = profiles.find(p => p.id === selectedStudent);

  if (selectedStudent) {
    return (
      <AdminLayout>
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 font-bold group">
              <div className="p-2 rounded-full group-hover:bg-primary-50 transition-colors">
                <ArrowLeft size={20} />
              </div>
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 w-full sm:w-auto">
              <CalendarDays className="text-primary-500" size={20} />
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent border-none outline-none font-bold text-slate-700 w-full cursor-pointer" />
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg">
                  {selectedProfile?.full_name?.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{selectedProfile?.full_name}</h1>
                  <p className="text-slate-500 font-medium text-sm">{selectedProfile?.email}</p>
                </div>
              </div>
              <button onClick={() => exportToExcel(selectedProfile.id, selectedProfile.full_name)} className="bg-emerald-800 text-white rounded-2xl h-14 px-8 flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-900 transition-all active:scale-95 font-black text-sm">
                <FileSpreadsheet size={20} />
                Export to Excel
              </button>
            </div>
          </div>

            {selectedDateEntry ? (
              <div className="space-y-8">
                {/* Top Row Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Main Rounds Card - Dominant */}
                  <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 md:p-7 flex flex-col justify-between min-h-[180px] group hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-6">
                      {/* Circular Progress Ring */}
                      <div className="relative w-24 h-24 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
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

                      {/* Rounds Text Content */}
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
                            <div className="text-right animate-in fade-in zoom-in duration-500">
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
                          <span className="text-[10px] font-bold italic truncate max-w-[200px]" title={selectedDateEntry.rounds_description}>
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
                      <p className="text-xl font-black text-slate-900 tracking-tight">
                        {selectedDateEntry.sleep_time ? formatTime(selectedDateEntry.sleep_time) : '--:--'}
                      </p>
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
                <div className="space-y-8">
                  {/* Activities Grid */}
                  <div className="grid grid-cols-1 gap-6">
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
                    </div>

                    {/* Seva Wide Card */}
                    <div className={`rounded-[2.5rem] border p-5 md:p-8 flex items-center justify-between gap-6 md:gap-8 hover:shadow-md transition-all ${
                      (selectedDateEntry.seva_performed || selectedDateEntry.seva_done) 
                        ? 'bg-amber-50/50 border-amber-100' 
                        : 'bg-white border-slate-100'
                    }`}>
                      <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${
                          (selectedDateEntry.seva_performed || selectedDateEntry.seva_done) ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'
                        }`}>
                          <Hammer size={32} />
                        </div>
                        <div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Seva</h5>
                          <p className={`text-xl font-semibold tracking-tight ${(selectedDateEntry.seva_performed || selectedDateEntry.seva_done) ? 'text-slate-700' : 'text-slate-300'}`}>
                            {(selectedDateEntry.seva_performed || selectedDateEntry.seva_done) ? 'Service Completed' : 'No Service Logged'}
                          </p>
                          {(selectedDateEntry.seva_performed || selectedDateEntry.seva_done) && selectedDateEntry.seva_topic && (
                            <div className="mt-2.5 p-4 bg-amber-100/40 rounded-2xl border border-amber-200/30">
                              <p className="text-sm font-semibold text-amber-900/80 leading-relaxed italic">
                                "{selectedDateEntry.seva_topic}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      {(selectedDateEntry.seva_performed || selectedDateEntry.seva_done) && (
                        <div className="text-right shrink-0">
                          <p className="text-3xl font-black text-amber-600">{selectedDateEntry.seva_minutes}m</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
                        </div>
                      )}
                    </div>

                    {/* Exercise Wide Card */}
                    <div className={`rounded-[2.5rem] border p-5 md:p-8 flex items-center justify-between gap-6 md:gap-8 hover:shadow-md transition-all ${
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
              </div>
            ) : (
              <div className="h-48 md:h-64 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white/50">
                <Calendar size={32} className="opacity-20" />
                <p className="font-bold text-sm md:text-base">No sadhana entry for this date</p>
              </div>
            )}
          </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary-600" size={48} />
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-1 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4 justify-center md:justify-start">
                {drilldownStudent && activeTab === 'logs' && (
                  <button 
                    onClick={() => setDrilldownStudent(null)}
                    className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary-600 transition-all shadow-sm"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                {activeTab === 'logs' 
                  ? (drilldownStudent ? `${drilldownStudent.full_name}'s Logs` : 'Activity Log') 
                  : 'Student Directory'}
              </h1>
              <p className="text-slate-500 font-semibold mt-1">
                {userProfile?.role === 'super_admin' 
                  ? (activeTab === 'logs' ? (drilldownStudent ? 'Detailed activity history' : 'Select a student to view logs') : 'Global Student Directory')
                  : `${userProfile?.bace?.name || 'Center'} ${activeTab === 'logs' ? 'Management' : 'Directory'}`
                }
              </p>
            </div>

            {(userProfile?.role === 'super_admin' || (userProfile?.role === 'admin' && baces.length > 0)) && (
              <div className="flex items-center gap-4 bg-white p-2 pl-6 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
                <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-widest text-[10px]">
                  <Building2 size={16} className="text-primary-500" />
                  Select Center
                </div>
                <select
                  value={selectedBace}
                  onChange={(e) => setSelectedBace(e.target.value)}
                  className="bg-slate-50 border-none outline-none font-black text-slate-700 py-3 px-6 rounded-xl cursor-pointer text-xs uppercase tracking-widest focus:ring-2 focus:ring-primary-500/20"
                >
                  {userProfile?.role === 'super_admin' ? (
                    <option value="all">Global View (All BACEs)</option>
                  ) : (
                    <option value="all">All My Centers ({baces.length})</option>
                  )}
                  {baces.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {activeTab === 'logs' ? (
            <div className="space-y-6">
              {!drilldownStudent && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Search students..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="input-field pl-12 w-full h-14 rounded-2xl border-slate-200 bg-white shadow-sm" 
                    />
                  </div>
                </div>
              )}

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {!drilldownStudent ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {profiles.filter(p => 
                      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map(profile => (
                      <button 
                        key={profile.id} 
                        onClick={() => setDrilldownStudent(profile)}
                        className="bg-white p-6 rounded-[2rem] flex items-center gap-4 border border-slate-100 shadow-sm hover:border-primary-300 hover:shadow-xl transition-all group text-left"
                      >
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-xl text-slate-400 group-hover:bg-primary-600 group-hover:text-white transition-all">
                          {profile.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-lg tracking-tight truncate">{profile.full_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{profile.email?.split('@')[0]}</p>
                        </div>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-primary-600 transition-colors" />
                      </button>
                    ))}
                    {profiles.length === 0 && (
                      <div className="col-span-full py-16 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 flex flex-col items-center justify-center p-6">
                        <p className="text-slate-500 font-bold text-lg mb-2">No students found in this center.</p>
                        <p className="text-slate-400 text-xs max-w-sm mb-6">Register students using the "Register User" button at the top of the page, or run the SQL policies in your Supabase dashboard to fix RLS.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-[0.2em]">
                          <th className="px-8 py-6">Student</th>
                          <th className="px-8 py-6 text-center">Sadhana Date</th>
                          <th className="px-8 py-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white/50">
                        {entries
                          .filter(e => e.user_id === drilldownStudent.id)
                          .map((entry) => (
                            <tr key={entry.id} className="group hover:bg-slate-50/80 transition-all">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-inner">
                                    {entry.user?.full_name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900 text-base tracking-tight">{entry.user?.full_name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.user?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex justify-center">
                                  <div className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black flex items-center gap-3 shadow-sm border border-slate-200/50">
                                    <Calendar size={16} className="text-slate-400" />
                                    {format(new Date(entry.date), 'MMM dd, yyyy')}
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <button 
                                  onClick={() => setSelectedStudent(entry.id)}
                                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                                >
                                  View Log
                                </button>
                              </td>
                            </tr>
                          ))}
                        {entries.filter(e => e.user_id === drilldownStudent.id).length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                                  <FileSpreadsheet size={32} />
                                </div>
                                <p className="text-slate-400 font-bold">No sadhana entries found for this student.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex justify-between items-center gap-4 px-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Directory</h2>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary rounded-2xl h-14 flex items-center gap-2 px-6 md:px-8 shadow-2xl"><UserPlus size={20} /> <span className="hidden sm:inline">Add Student</span></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {profiles.map(profile => (
                  <button key={profile.id} onClick={() => setSelectedStudent(profile.id)} className="glass-card p-6 rounded-[2rem] flex flex-col items-center text-center gap-4 hover:border-primary-300 hover:shadow-2xl transition-all group border border-slate-100">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-[1.5rem] flex items-center justify-center font-black text-2xl md:text-3xl text-slate-500 group-hover:bg-primary-600 group-hover:text-white transition-all">{profile.full_name?.charAt(0)}</div>
                    <div>
                      <p className="font-black text-slate-900 text-lg md:text-xl tracking-tight">{profile.full_name}</p>
                      {profile.gender && (
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1 capitalize">
                          {profile.gender}
                        </p>
                      )}
                      <p className="text-xs font-bold text-slate-400 mt-1 truncate max-w-[200px]">{profile.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-8 md:p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-6 md:right-8 top-6 md:top-8 text-slate-400 hover:text-slate-900 transition-colors"><X size={28} /></button>
            <div className="mb-8 md:mb-10 text-center">
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {regData.role === 'admin' ? 'New BACE Admin' : 'New Student'}
              </h3>
            </div>
            {regError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{regError}</div>}
            <form onSubmit={handleRegister} className="space-y-5">
              {userProfile?.role === 'super_admin' && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Select Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                        regData.role !== 'admin' ? 'bg-primary-50 border-primary-600 text-primary-600' : 'bg-slate-50 border-transparent text-slate-400'
                      }`}
                      onClick={() => setRegData({ ...regData, role: 'student' })}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                        regData.role === 'admin' ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-slate-50 border-transparent text-slate-400'
                      }`}
                      onClick={() => setRegData({ ...regData, role: 'admin' })}
                    >
                      BACE Admin
                    </button>
                  </div>
                </div>
              )}
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label><input type="text" required value={regData.fullName} onChange={(e) => setRegData({ ...regData, fullName: e.target.value })} className="input-field h-12 md:h-14 rounded-xl" /></div>
              {regData.role === 'student' && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Gender</label>
                  <select
                    required
                    value={regData.gender}
                    onChange={(e) =>
                      setRegData({
                        ...regData,
                        gender: e.target.value as 'male' | 'female' | 'other',
                      })
                    }
                    className="input-field h-12 md:h-14 rounded-xl w-full bg-slate-50 border-none px-4 font-bold text-slate-700 capitalize"
                  >
                    <option value="">Select gender...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label><input type="email" required value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} className="input-field h-12 md:h-14 rounded-xl" /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label><input type="password" required value={regData.password} onChange={(e) => setRegData({ ...regData, password: e.target.value })} className="input-field h-12 md:h-14 rounded-xl" /></div>
              
              {userProfile?.role === 'super_admin' && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Assign to BACE</label>
                  <select
                    required
                    value={regData.baceId}
                    onChange={(e) => setRegData({ ...regData, baceId: e.target.value })}
                    className="input-field h-12 md:h-14 rounded-xl w-full bg-slate-50 border-none px-4 font-bold text-slate-700"
                  >
                    <option value="">Select a center...</option>
                    {baces.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="submit" disabled={regLoading} className="w-full h-14 md:h-16 btn-primary rounded-2xl flex items-center justify-center gap-3 text-base font-black shadow-xl mt-4">
                {regLoading ? <Loader2 className="animate-spin" size={24} /> : <UserPlus size={24} />} {regLoading ? 'Registering...' : 'Add Student'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
