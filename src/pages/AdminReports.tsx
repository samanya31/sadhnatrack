import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { 
  Clock, 
  RotateCcw, 
  BookOpen, 
  Headphones, 
  UserCheck, 
  TrendingUp, 
  Calendar,
  Search,
  ArrowLeft,
  Building2
} from 'lucide-react';
import type { UserProfile, BACE } from '../types/index';

export const AdminReports = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(7);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingProfiles, setFetchingProfiles] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [baces, setBaces] = useState<BACE[]>([]);
  const [selectedBace, setSelectedBace] = useState<string>('all');

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, bace:baces!bace_id(name)')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
        
        let myBaces: BACE[] = [];
        let defaultBaceId = 'all';

        if (profile?.role === 'super_admin') {
          const { data: baceData } = await supabase.from('baces').select('*');
          myBaces = baceData || [];
          defaultBaceId = 'all';
        } else if (profile?.role === 'admin') {
          const { data: directBace } = await supabase.from('baces').select('*').eq('id', profile?.bace_id || '');
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
          defaultBaceId = myBaces.length > 0 ? myBaces[0].id : (profile?.bace_id || 'all');
        } else {
          defaultBaceId = profile?.bace_id || 'all';
        }

        setBaces(myBaces);
        setSelectedBace(defaultBaceId);
        setUserProfile(profile);
      }
    };
    initialize();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchProfiles();
    }
  }, [userProfile, selectedBace]);

  useEffect(() => {
    if (selectedStudent) {
      fetchSadhanaData();
    }
  }, [timeRange, selectedStudent]);

  const fetchProfiles = async () => {
    setFetchingProfiles(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name');

      if (selectedBace !== 'all') {
        query = query.eq('bace_id', selectedBace);
      }

      const { data, error } = await query;
      if (error) throw error;
      let list = data || [];

      if (selectedBace === 'all' && userProfile?.role === 'admin') {
        const myBaceIds = new Set(baces.map(b => b.id));
        if (userProfile.bace_id) myBaceIds.add(userProfile.bace_id);
        list = list.filter(p => p.bace_id && myBaceIds.has(p.bace_id));
      }

      setProfiles(list);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setFetchingProfiles(false);
    }
  };

  const fetchSadhanaData = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      const startDate = format(subDays(new Date(), timeRange), 'yyyy-MM-dd');

      const { data: entries, error } = await supabase
        .from('sadhana_entries')
        .select('*')
        .eq('user_id', selectedStudent.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;

      const processedData = entries?.map(entry => ({
        ...entry,
        formattedDate: format(parseISO(entry.date), 'MMM dd'),
        wakeupScore: entry.wakeup_time ? calculateWakeupScore(entry.wakeup_time) : null,
        sleepScore: entry.sleep_time ? calculateSleepScore(entry.sleep_time) : null,
        japaScore: entry.rounds_completed_by ? calculateJapaScore(entry.rounds_completed_by) : null,
      }));

      setData(processedData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions (copied from StudentReports)
  const timeToDecimal = (timeStr: string) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    return parts[0] + parts[1] / 60;
  };

  const formatDecimalTime = (decimal: number) => {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const calculateSleepScore = (timeStr: string) => {
    const val = timeToDecimal(timeStr);
    if (val === null) return null;
    const normalizedTime = val < 12 ? val + 24 : val;
    return 30 - normalizedTime;
  };

  const sleepScoreToTime = (score: number) => {
    let normalizedTime = 30 - score;
    let actualTime = normalizedTime >= 24 ? normalizedTime - 24 : normalizedTime;
    return formatDecimalTime(actualTime);
  };

  const calculateJapaScore = (timeStr: string) => {
    const val = timeToDecimal(timeStr);
    if (val === null) return null;
    const normalizedTime = val < 4 ? val + 24 : val;
    return 28 - normalizedTime;
  };

  const japaScoreToTime = (score: number) => {
    let normalizedTime = 28 - score;
    let actualTime = normalizedTime >= 24 ? normalizedTime - 24 : normalizedTime;
    return formatDecimalTime(actualTime);
  };

  const calculateWakeupScore = (timeStr: string) => {
    const val = timeToDecimal(timeStr);
    if (val === null) return null;
    return 12 - val;
  };

  const wakeupScoreToTime = (score: number) => {
    let actualTime = 12 - score;
    return formatDecimalTime(actualTime);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 shadow-xl border border-slate-100 rounded-2xl">
          <p className="font-black text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
              {entry.name}: {
                entry.name.toLowerCase().includes('sleep')
                  ? sleepScoreToTime(entry.value)
                  : entry.name.toLowerCase().includes('wake')
                    ? wakeupScoreToTime(entry.value)
                    : entry.name.toLowerCase().includes('finish') || entry.name.toLowerCase().includes('japa') && entry.name.toLowerCase().includes('time')
                      ? japaScoreToTime(entry.value)
                      : entry.name.toLowerCase().includes('time') 
                        ? formatDecimalTime(entry.value) 
                        : entry.value
              }
              {entry.name.toLowerCase().includes('minutes') ? ' min' : ''}
              {entry.name.toLowerCase().includes('rounds') ? ' rounds' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChartSection = ({ title, subtitle, icon: Icon, color, children, iconBg }: any) => (
    <section className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col min-h-[350px] group hover:shadow-md transition-all">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center ${color} shadow-sm transition-transform group-hover:scale-110`}>
          <Icon size={24} />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none">{title}</h2>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-1.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );

  const filteredProfiles = profiles.filter(p => 
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout activeTab="logs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!selectedStudent ? (
          <div className="space-y-8 py-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <TrendingUp className="text-primary-600" size={32} />
                  Sadhana Reports
                </h1>
                <p className="text-slate-500 mt-1 font-semibold">Select a student to view their spiritual progress charts</p>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search students..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm"
                  />
                </div>

                {(userProfile?.role === 'super_admin' || (userProfile?.role === 'admin' && baces.length > 0)) && (
                  <div className="flex items-center gap-4 bg-white p-1.5 pl-6 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
                    <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">
                      <Building2 size={16} className="text-primary-500" />
                      Center
                    </div>
                    <select
                      value={selectedBace}
                      onChange={(e) => setSelectedBace(e.target.value)}
                      className="bg-slate-50 border-none outline-none font-black text-slate-700 py-2 px-6 rounded-xl cursor-pointer text-xs uppercase tracking-widest focus:ring-2 focus:ring-primary-500/20"
                    >
                      {userProfile?.role === 'super_admin' ? (
                        <option value="all">Global (All)</option>
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
            </div>

            {fetchingProfiles ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold">Loading directory...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProfiles.map(profile => (
                  <button 
                    key={profile.id} 
                    onClick={() => setSelectedStudent(profile)}
                    className="bg-white p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-4 border border-slate-100 shadow-sm hover:border-primary-300 hover:shadow-xl transition-all group active:scale-95"
                  >
                    <div className="w-20 h-20 bg-slate-100 rounded-[1.8rem] flex items-center justify-center font-black text-3xl text-slate-500 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-inner">
                      {profile.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-lg tracking-tight leading-tight">{profile.full_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">{profile.email?.split('@')[0]}</p>
                    </div>
                    <div className="mt-2 px-4 py-1.5 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                      View Report
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-100 transition-all shadow-sm hover:shadow-md"
                >
                  <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary-500/20">
                    {selectedStudent.full_name?.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{selectedStudent.full_name}'s Report</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">{selectedStudent.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                {[7, 15, 30].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                      timeRange === range
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {range} Days
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-bold text-sm">Processing records...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] p-20 text-center flex flex-col items-center gap-6 border border-slate-100 shadow-sm">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                  <Calendar size={32} />
                </div>
                <p className="text-slate-500 font-bold">No sadhana data found for this student in the last {timeRange} days.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Wake-up Time */}
                <ChartSection title="Wake-up Time" subtitle="Daily Rise Time" icon={Clock} color="text-blue-600" iconBg="bg-blue-50">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} 
                      domain={[0, 12]} 
                      ticks={[0, 2, 4, 6, 8, 10, 12]} 
                      tickFormatter={(v) => {
                        const h = 12 - v;
                        return h === 0 ? '12 AM' : h === 12 ? '12 PM' : `${h} AM`;
                      }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line name="Wake-up Time" type="monotone" dataKey="wakeupScore" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} connectNulls />
                  </LineChart>
                </ChartSection>

                {/* Sleep Time */}
                <ChartSection title="Sleep Time" subtitle="Night Rest Time" icon={Clock} color="text-purple-600" iconBg="bg-purple-50">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} 
                      domain={[0, 10]} 
                      ticks={[0, 2, 4, 6, 8, 10]} 
                      tickFormatter={(v) => {
                        const time = 30 - v;
                        const h = time >= 24 ? time - 24 : time;
                        return h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : `${h > 12 ? h - 12 : h}${h >= 12 ? ' PM' : ' AM'}`;
                      }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line name="Sleep Time" type="monotone" dataKey="sleepScore" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} connectNulls />
                  </LineChart>
                </ChartSection>

                {/* Japa Completion Time */}
                <ChartSection title="Japa Finished" subtitle="Chanting Completion" icon={RotateCcw} color="text-orange-600" iconBg="bg-orange-50">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} 
                      domain={[0, 24]} 
                      ticks={[0, 4, 8, 12, 16, 20, 24]} 
                      tickFormatter={(v) => {
                        const time = 28 - v;
                        const h = time >= 24 ? time - 24 : time;
                        return h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : `${h > 12 ? h - 12 : h}${h >= 12 ? ' PM' : ' AM'}`;
                      }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line name="Finish Time" type="monotone" dataKey="japaScore" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} connectNulls />
                  </LineChart>
                </ChartSection>

                {/* Hearing Minutes */}
                <ChartSection title="Hearing" subtitle="Shravanam Progress" icon={Headphones} color="text-indigo-600" iconBg="bg-indigo-50">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorHearingAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} domain={[0, 240]} ticks={[0, 60, 120, 180, 240]} tickFormatter={(v) => `${v/60}h`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area name="Hearing Minutes" type="monotone" dataKey="hearing_minutes" stroke="#6366f1" strokeWidth={4} fill="url(#colorHearingAdmin)" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ChartSection>

                {/* Reading Minutes */}
                <ChartSection title="Reading" subtitle="Svadhyaya Progress" icon={BookOpen} color="text-emerald-600" iconBg="bg-emerald-50">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorReadingAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} domain={[0, 240]} ticks={[0, 60, 120, 180, 240]} tickFormatter={(v) => `${v/60}h`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area name="Reading Minutes" type="monotone" dataKey="reading_minutes" stroke="#10b981" strokeWidth={4} fill="url(#colorReadingAdmin)" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ChartSection>

                {/* Seva Minutes */}
                <ChartSection title="Seva" subtitle="Service Contribution" icon={UserCheck} color="text-rose-600" iconBg="bg-rose-50">
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="colorSevaAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} domain={[0, 240]} ticks={[0, 60, 120, 180, 240]} tickFormatter={(v) => `${v/60}h`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area name="Seva Minutes" type="monotone" dataKey="seva_minutes" stroke="#f43f5e" strokeWidth={4} fill="url(#colorSevaAdmin)" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ChartSection>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
