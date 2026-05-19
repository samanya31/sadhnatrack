import { useEffect, useState } from 'react';
import { StudentLayout } from '../components/StudentLayout';
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
import { Clock, RotateCcw, BookOpen, Headphones, UserCheck, TrendingUp, Calendar } from 'lucide-react';

export const StudentReports = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(7); // default 7 days

  useEffect(() => {
    fetchSadhanaData();
  }, [timeRange]);

  const timeToDecimal = (timeStr: string) => {
    if (!timeStr) return null;
    try {
      // Handles HH:mm and HH:mm:ss formats from database
      const parts = timeStr.split(':').map(Number);
      if (parts.length < 2) return null;
      const hours = parts[0];
      const minutes = parts[1];
      if (isNaN(hours) || isNaN(minutes)) return null;
      return hours + minutes / 60;
    } catch (e) {
      return null;
    }
  };

  const formatDecimalTime = (decimal: number) => {
    if (decimal === null || decimal === undefined) return '--:--';
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const calculateSleepScore = (timeStr: string) => {
    const val = timeToDecimal(timeStr);
    if (val === null) return null;
    // Map time to a continuous night scale: 12 PM to 12 PM
    // Focus range: 8 PM (20h) to 5 AM (29h)
    const normalizedTime = val < 12 ? val + 24 : val;
    // Invert: 30 - normalizedTime
    // 8 PM (20) -> 10 (Highest)
    // 12 AM (24) -> 6
    // 5 AM (29) -> 1 (Lowest)
    return 30 - normalizedTime;
  };

  const sleepScoreToTime = (score: number) => {
    // Reverse: normalizedTime = 30 - score
    let normalizedTime = 30 - score;
    let actualTime = normalizedTime >= 24 ? normalizedTime - 24 : normalizedTime;
    return formatDecimalTime(actualTime);
  };

  const calculateJapaScore = (timeStr: string) => {
    const val = timeToDecimal(timeStr);
    if (val === null) return null;
    // We treat 4 AM as 0 (Ideal start)
    // If time is before 4 AM (e.g. 1 AM), it's the next day (24 + 1 = 25)
    const normalizedTime = val < 4 ? val + 24 : val;
    // Invert: 28 - normalizedTime
    // 4 AM (4) -> 24 (Highest)
    // 10 AM (10) -> 18
    // 8 PM (20) -> 8
    // 1 AM Next Day (25) -> 3 (Lowest)
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
    // Standard wake range 0-12 (Midnight to Noon)
    // Invert: 12 - val
    // 4 AM (4) -> 8 (Highest)
    // 10 AM (10) -> 2 (Lowest)
    return 12 - val;
  };

  const wakeupScoreToTime = (score: number) => {
    let actualTime = 12 - score;
    return formatDecimalTime(actualTime);
  };

  const fetchSadhanaData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = format(subDays(new Date(), timeRange), 'yyyy-MM-dd');

      const { data: entries, error } = await supabase
        .from('sadhana_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: true });

      if (error) throw error;

      // Process data for charts
      const processedData = entries?.map(entry => ({
        ...entry,
        formattedDate: format(parseISO(entry.date), 'MMM dd'),
        // Convert time string "HH:mm" to decimal hours for charting
        wakeupScore: entry.wakeup_time ? calculateWakeupScore(entry.wakeup_time) : null,
        // For sleep, we want "Early = High, Late = Low"
        // We'll map 6 PM (18) to 6 AM (30) range, then invert it
        // High Value = Earlier Sleep
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

  if (loading && data.length === 0) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold">Analyzing your progress...</p>
        </div>
      </StudentLayout>
    );
  }

  const ChartSection = ({ title, subtitle, icon: Icon, color, children, iconBg }: any) => (
    <section className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl border-slate-100/50 flex flex-col min-h-[400px]">
      <div className="flex items-center gap-4 mb-8">
        <div className={`w-12 h-12 ${iconBg} rounded-2xl flex items-center justify-center ${color} shadow-sm`}>
          <Icon size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">{title}</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto animate-fade-in pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 animate-slide-up px-4 sm:px-0">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <TrendingUp className="text-primary-600" size={32} />
              Sadhana Reports
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-lg">Visual representation of your spiritual journey</p>
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit">
            {[7, 15, 30].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
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

        {data.length === 0 ? (
          <div className="mx-4 sm:mx-0 glass-card rounded-[2.5rem] p-20 text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
              <Calendar size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">No data found</h2>
              <p className="text-slate-500 font-medium mt-2">Start logging your daily sadhana to see reports here!</p>
            </div>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="btn-primary mt-4 rounded-2xl px-10 py-4 text-lg font-black"
            >
              Go to Entry Form
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-0">
            {/* Wake-up Time */}
            <ChartSection title="Wake-up Time" subtitle="Daily Rise Time (Higher = Earlier)" icon={Clock} color="text-blue-600" iconBg="bg-blue-100">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  domain={[0, 12]} 
                  ticks={[0, 2, 4, 6, 8, 10, 12]} 
                  tickFormatter={(v) => {
                    const h = 12 - v;
                    return h === 0 ? '12 AM' : h === 12 ? '12 PM' : `${h} AM`;
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  name="Wake-up Time" 
                  type="monotone" 
                  dataKey="wakeupScore" 
                  stroke="#2563eb" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                  connectNulls
                />
              </LineChart>
            </ChartSection>

            {/* Sleep Time */}
            <ChartSection title="Sleep Time" subtitle="Night Rest Time (Higher = Earlier)" icon={Clock} color="text-purple-600" iconBg="bg-purple-100">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  domain={[0, 10]} 
                  ticks={[0, 2, 4, 6, 8, 10]} 
                  tickFormatter={(v) => {
                    const time = 30 - v;
                    const h = time >= 24 ? time - 24 : time;
                    return h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : `${h > 12 ? h - 12 : h}${h >= 12 ? ' PM' : ' AM'}`;
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  name="Sleep Time" 
                  type="monotone" 
                  dataKey="sleepScore" 
                  stroke="#8b5cf6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                  connectNulls
                />
              </LineChart>
            </ChartSection>

            {/* Japa Completion Time */}
            <ChartSection title="Japa Finished" subtitle="Chanting Completion (Higher = Earlier)" icon={RotateCcw} color="text-orange-600" iconBg="bg-orange-100">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  domain={[0, 24]} 
                  ticks={[0, 4, 8, 12, 16, 20, 24]} 
                  tickFormatter={(v) => {
                    const time = 28 - v;
                    const h = time >= 24 ? time - 24 : time;
                    return h === 0 || h === 24 ? '12 AM' : h === 12 ? '12 PM' : `${h > 12 ? h - 12 : h}${h >= 12 ? ' PM' : ' AM'}`;
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  name="Finish Time" 
                  type="monotone" 
                  dataKey="japaScore" 
                  stroke="#f97316" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
                  connectNulls 
                />
              </LineChart>
            </ChartSection>


            {/* Hearing Minutes */}
            <ChartSection title="Hearing" subtitle="Shravanam Progress" icon={Headphones} color="text-indigo-600" iconBg="bg-indigo-100">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorHearing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  domain={[0, 240]} 
                  ticks={[0, 60, 120, 180, 240]}
                  tickFormatter={(v) => `${v/60}h`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area name="Hearing Minutes" type="monotone" dataKey="hearing_minutes" stroke="#6366f1" strokeWidth={4} fill="url(#colorHearing)" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ChartSection>

            {/* Reading Minutes */}
            <ChartSection title="Reading" subtitle="Svadhyaya Progress" icon={BookOpen} color="text-emerald-600" iconBg="bg-emerald-100">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorReading" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  domain={[0, 240]} 
                  ticks={[0, 60, 120, 180, 240]}
                  tickFormatter={(v) => `${v/60}h`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area name="Reading Minutes" type="monotone" dataKey="reading_minutes" stroke="#10b981" strokeWidth={4} fill="url(#colorReading)" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ChartSection>

            {/* Seva Minutes */}
            <ChartSection title="Seva" subtitle="Service Contribution" icon={UserCheck} color="text-rose-600" iconBg="bg-rose-100">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSeva" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  domain={[0, 240]} 
                  ticks={[0, 60, 120, 180, 240]}
                  tickFormatter={(v) => `${v/60}h`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area name="Seva Minutes" type="monotone" dataKey="seva_minutes" stroke="#f43f5e" strokeWidth={4} fill="url(#colorSeva)" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ChartSection>

            {/* Exercise Minutes */}
            <ChartSection title="Exercise" subtitle="Physical Activity Tracker" icon={Clock} color="text-teal-600" iconBg="bg-teal-100">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorExercise" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                  domain={[0, 120]} 
                  ticks={[0, 30, 60, 90, 120]}
                  tickFormatter={(v) => `${v}m`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area name="Exercise Minutes" type="monotone" dataKey="exercise_minutes" stroke="#14b8a6" strokeWidth={4} fill="url(#colorExercise)" dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ChartSection>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};
