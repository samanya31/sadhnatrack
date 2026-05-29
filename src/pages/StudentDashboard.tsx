import { useState, useEffect, useMemo } from 'react';
import { StudentLayout } from '../components/StudentLayout';
import { supabase } from '../lib/supabase';
import {
  PenLine,
  Target,
  History,
  BarChart3,
  Flame,
  Calendar,
  ChevronRight,
  CheckCircle,
  Clock,
  ArrowRight,
  Compass,
  Radio,
  Lock,
  BookOpen,
  Headphones,
  Star,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import studashImg from '../assets/studash.png';
import studashMobImg from '../assets/studash_mob.png';

// Metric label helpers
const metricLabels: Record<string, { label: string; unit: string; icon: any; color: string; lightBg: string; textColor: string }> = {
  rounds_completed: { label: 'Japa Rounds', unit: 'rounds/day', icon: Flame, color: 'from-orange-50 via-amber-50 to-yellow-50', lightBg: 'bg-orange-100', textColor: 'text-orange-700' },
  reading_minutes: { label: 'Book Reading', unit: 'min/day', icon: BookOpen, color: 'from-blue-50 via-indigo-50 to-purple-50', lightBg: 'bg-blue-100', textColor: 'text-blue-700' },
  hearing_minutes: { label: 'Audio Hearing', unit: 'min/day', icon: Headphones, color: 'from-emerald-50 via-teal-50 to-cyan-50', lightBg: 'bg-emerald-100', textColor: 'text-emerald-700' },
  mangal_arti: { label: 'Mangal Arti', unit: 'days/week', icon: Star, color: 'from-rose-50 via-pink-50 to-fuchsia-50', lightBg: 'bg-rose-100', textColor: 'text-rose-700' },
  morning_japa: { label: 'Morning Japa', unit: 'days/week', icon: Flame, color: 'from-violet-50 via-purple-50 to-indigo-50', lightBg: 'bg-violet-100', textColor: 'text-violet-700' },
};

const fallbackGoals = [
  {
    id: 'default-1',
    metric: 'rounds_completed',
    target_value: 16,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    isFallback: true,
  },
  {
    id: 'default-2',
    metric: 'reading_minutes',
    target_value: 30,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    isFallback: true,
  },
];

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [userTargets, setUserTargets] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Robust streak calculation
  const calculateStreak = (entries: any[]) => {
    if (!entries || entries.length === 0) return 0;
    const loggedDates = new Set(entries.map(e => e.date));
    let streak = 0;
    let checkDate = new Date();

    const formatDateStr = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    let checkStr = formatDateStr(checkDate);
    if (!loggedDates.has(checkStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = formatDateStr(checkDate);
      if (!loggedDates.has(checkStr)) return 0;
    }

    while (true) {
      const currentStr = formatDateStr(checkDate);
      if (loggedDates.has(currentStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const fetchAllData = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, bace:baces(name)')
        .eq('id', userId)
        .single();
      setUserProfile(profile);

      const { data: targets } = await supabase
        .from('sadhana_targets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setUserTargets(targets || []);

      const { data: entries } = await supabase
        .from('sadhana_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      const entriesList = entries || [];
      setAllEntries(entriesList);
      const today = entriesList.find((e: any) => e.date === todayStr);
      setTodayEntry(today || null);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  // All hooks before early return
  useEffect(() => {
    const initializeDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      await fetchAllData(user.id);
      setLoading(false);
    };
    initializeDashboard();
  }, [navigate]);

  const goalsForCarousel = useMemo(() => {
    if (!userTargets || userTargets.length === 0) return fallbackGoals;
    return userTargets.slice(0, 6);
  }, [userTargets]);

  const BANNER_COUNT = goalsForCarousel.length;

  useEffect(() => {
    if (BANNER_COUNT <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % BANNER_COUNT);
    }, 4500);
    return () => clearInterval(interval);
  }, [BANNER_COUNT]);

  const handleToggleMorningItem = async (field: 'mangal_arti' | 'tulasi_arti' | 'morning_japa' | 'morning_hearing') => {
    if (!userProfile?.id) return;
    const currentValue = todayEntry ? todayEntry[field] : false;
    const newValue = !currentValue;

    setTodayEntry((prev: any) => {
      const base = prev || {
        date: todayStr,
        mangal_arti: false,
        tulasi_arti: false,
        morning_japa: false,
        morning_hearing: false,
        rounds_completed: 0,
        reading_minutes: 0,
        hearing_minutes: 0
      };
      return { ...base, [field]: newValue };
    });

    try {
      const payload: any = {
        user_id: userProfile.id,
        date: todayStr,
        [field]: newValue
      };
      if (todayEntry?.id) payload.id = todayEntry.id;

      const { error } = await supabase
        .from('sadhana_entries')
        .upsert(payload, { onConflict: 'user_id, date' });
      if (error) throw error;
      await fetchAllData(userProfile.id);
    } catch (err) {
      console.error('Failed to sync morning item checkbox:', err);
      setTodayEntry((prev: any) => {
        if (!prev) return null;
        return { ...prev, [field]: currentValue };
      });
      alert('Failed to update status. Please check connection.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-primary-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const todayRounds = todayEntry?.rounds_completed || 0;
  const currentStreak = calculateStreak(allEntries);

  // Quick action cards
  const quickActions = [
    { title: 'Sadhna Entry', description: 'Log your daily progress', icon: PenLine, path: '/log', color: 'from-blue-600 via-indigo-600 to-violet-600', bg: 'bg-blue-50 text-blue-600' },
    { title: 'Goal Setting', description: 'Set custom targets', icon: Target, path: '/targets', color: 'from-rose-500 via-red-500 to-orange-500', bg: 'bg-red-50 text-red-500' },
    { title: 'Analytical Report', description: 'View detailed analysis', icon: BarChart3, path: '/reports', color: 'from-emerald-500 via-teal-500 to-cyan-500', bg: 'bg-emerald-50 text-emerald-600' },
    { title: 'Sadhna History', description: 'Review past sadhana records', icon: History, path: '/history', color: 'from-orange-500 via-amber-500 to-yellow-500', bg: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <StudentLayout>
      <div className="space-y-4 w-full animate-in fade-in duration-500">

        {/* 1. HERO SECTION */}
        <div className="relative overflow-hidden rounded-none sm:rounded-2xl shadow-xl min-h-[160px] md:min-h-[250px] flex items-center bg-slate-900">
          <picture className="absolute inset-0 z-0 w-full h-full">
            <source media="(max-width: 767px)" srcSet={studashMobImg} />
            <img 
              src={studashImg} 
              alt="Hero Background" 
              className="w-full h-full object-cover object-center"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-transparent" />

          <div className="relative z-10 w-full px-5 md:px-10 py-6 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 text-left">
              <button
                onClick={() => navigate('/targets')}
                className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold mb-2.5 hover:bg-white/20 transition-colors cursor-pointer"
              >
                🎓 {userProfile?.bace?.name || 'ISKCON BACE'} Student
              </button>
              <h2 className="text-xl md:text-4xl font-black text-white mb-1 tracking-tight">
                Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Devotee'}!
              </h2>
              <p className="text-blue-100 text-sm md:text-lg max-w-xl mb-4 font-medium leading-normal">
                You have completed <span className="font-bold text-white">{todayRounds} rounds</span> of Japa today.
                {currentStreak > 0 && <span className="ml-2 text-amber-300 font-bold">🔥 {currentStreak}-day streak!</span>}
              </p>
              <div className="flex flex-wrap gap-2 justify-start">
                <button
                  onClick={() => navigate('/log')}
                  className="px-5 py-2.5 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-1.5 text-sm cursor-pointer shadow-sm"
                >
                  <PenLine className="w-4 h-4" />
                  Log Today's Sadhana
                </button>
                <button
                  onClick={() => navigate('/targets')}
                  className="px-5 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  View Goals
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. GOALS CAROUSEL — light gradients, goals from Supabase */}
        <div className="px-2 sm:px-0">
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
            <div className="relative rounded-xl overflow-hidden w-full h-[170px] sm:h-[145px]">
              <div
                className="flex transition-transform duration-500 h-full w-full"
                style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
              >
                {goalsForCarousel.map((goal: any, idx: number) => {
                  const meta = metricLabels[goal.metric] || {
                    label: goal.metric?.replace(/_/g, ' ') || 'Goal',
                    unit: '',
                    icon: Star,
                    color: 'from-slate-50 via-gray-50 to-zinc-50',
                    lightBg: 'bg-slate-100',
                    textColor: 'text-slate-700'
                  };
                  const IconComp = meta.icon;
                  const isActive = goal.start_date <= todayStr && goal.end_date >= todayStr;
                  const isFallback = goal.isFallback;

                  return (
                    <div
                      key={goal.id || idx}
                      className={`min-w-full h-full p-5 flex flex-col justify-between relative bg-gradient-to-br ${meta.color}`}
                    >
                      {/* Subtle decorative circle */}
                      <div className={`absolute top-0 right-0 w-40 h-40 ${meta.lightBg} opacity-30 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none`} />

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl ${meta.lightBg} flex items-center justify-center`}>
                              <IconComp className={`w-4 h-4 ${meta.textColor}`} />
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${meta.lightBg} ${meta.textColor} border-current/20`}>
                              {isFallback ? 'Default Goal' : isActive ? 'Active Goal' : 'Goal'}
                            </span>
                          </div>
                          {!isFallback && (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              {goal.start_date} → {goal.end_date}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug mb-0.5 text-slate-800">
                          {meta.label}
                        </h3>
                        <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                          {isFallback
                            ? `Target: ${goal.target_value} ${meta.unit}. Set your own goals from Goal Setting!`
                            : `Target: ${goal.target_value} ${meta.unit}${isActive ? ' · Currently active' : ''}`
                          }
                        </p>
                      </div>

                      <div className="relative z-10 flex items-center justify-between mt-2 border-t border-slate-200/50 pt-2">
                        <button
                          onClick={() => navigate('/targets')}
                          className={`${meta.lightBg} ${meta.textColor} px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:opacity-80 transition-all flex items-center gap-1.5 cursor-pointer`}
                        >
                          {isFallback ? 'Set My Goals' : 'Manage Goals'}
                          <ArrowRight size={11} />
                        </button>
                        <div className="flex gap-1">
                          {goalsForCarousel.map((_: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => setCurrentBannerIndex(i)}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === currentBannerIndex ? `w-4 ${meta.lightBg}` : 'w-1.5 bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. FOUR QUICK ACTIONS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-2 sm:px-0">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className="group relative bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 text-left overflow-hidden flex flex-col cursor-pointer"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${action.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
              <div className="flex flex-row items-center gap-2.5 mb-2 md:mb-4">
                <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">
                  {action.title}
                </h3>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 font-semibold mb-4 flex-1">
                {action.description}
              </p>
              <div className="flex items-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors mt-auto">
                Access Now <ChevronRight className="w-3.5 h-3.5 ml-1 stroke-[3]" />
              </div>
            </button>
          ))}
        </div>

        {/* 4. TODAY'S SADHANA CHECKLIST — full width, no notice board or streak widget */}
        <div className="px-2 sm:px-0">
          <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-slate-800 tracking-tight">Today's Sadhana Checklist</h3>
              </div>
              <button
                onClick={() => navigate('/log')}
                className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-colors border border-blue-100/50 hover:bg-blue-100/70"
              >
                Log Full Form
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'mangal_arti', label: 'Mangal Arti Program', desc: 'Attended Mangal Arti prayers at the BACE/Temple', icon: Clock, accentColor: 'amber' },
                { key: 'tulasi_arti', label: 'Tulasi Arti Program', desc: 'Offered prayers and circumambulation to Tulasi Maharani', icon: Compass, accentColor: 'emerald' },
                { key: 'morning_japa', label: 'Morning Japa Chanting', desc: 'Chanted Japa rounds attentively in the morning hours', icon: Flame, accentColor: 'red' },
                { key: 'morning_hearing', label: 'Morning Lecture / Hearing', desc: 'Listened to morning Srimad Bhagavatam lecture/scriptures', icon: Radio, accentColor: 'blue' }
              ].map((item) => {
                const isChecked = todayEntry ? todayEntry[item.key] : false;
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggleMorningItem(item.key as any)}
                    className={`border rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-emerald-50/80 border-emerald-100 text-emerald-800'
                        : 'bg-white border-slate-150 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isChecked ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base">{item.label}</h3>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-colors flex-shrink-0 flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-emerald-500 text-white cursor-pointer'
                          : 'bg-slate-100 text-slate-500 cursor-pointer border border-slate-200 hover:bg-slate-200/60'
                      }`}
                    >
                      {isChecked ? <CheckCircle size={13} className="stroke-[3]" /> : <Lock size={13} />}
                      {isChecked ? 'Completed' : 'Tap to Log'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </StudentLayout>
  );
};
