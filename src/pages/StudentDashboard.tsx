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
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  Award,
  Compass,
  Bell,
  Radio,
  Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import studashImg from '../assets/studash.png';
import studashMobImg from '../assets/studash_mob.png';

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [userTargets, setUserTargets] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [activeStatIndex, setActiveStatIndex] = useState(0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Hardcoded premium banners for Ekadashi, Temple events, and Quotes
  const banners = useMemo(() => [
    {
      id: 1,
      title: "Ekadashi Mahadvadashi Alert 🌌",
      description: "Prepare for the upcoming Ekadashi. Plan extra rounds of chanting, reading, and pure fasting from grains to refresh your spirit.",
      badge: "Spiritual Event",
      bgClass: "from-indigo-950 via-purple-900 to-indigo-900",
      badgeClass: "bg-purple-500/30 text-purple-200 border-purple-400/30",
      cta: "Schedule Extra Rounds",
      action: () => navigate('/targets')
    },
    {
      id: 2,
      title: "Weekly Sangha & Saturday Feast 🛕",
      description: "Join fellow devotees this Saturday at 6:30 PM for ecstatic congregational Kirtan, a deep discourse, and delicious Mahaprasadam.",
      badge: "Temple Program",
      bgClass: "from-amber-950 via-orange-900 to-rose-900",
      badgeClass: "bg-orange-500/30 text-orange-200 border-orange-400/30",
      cta: "Log Sadhana progress",
      action: () => navigate('/log')
    },
    {
      id: 3,
      title: "Prabhupada Vani Inspiration 📖",
      description: "\"By chanting the Hare Krishna mantra, one's heart is cleansed of all dirty things, and one is immediately elevated to the spiritual platform.\"",
      badge: "Daily Quote",
      bgClass: "from-emerald-950 via-teal-900 to-emerald-900",
      badgeClass: "bg-emerald-500/30 text-emerald-200 border-emerald-400/30",
      cta: "Read Books Today",
      action: () => navigate('/log')
    }
  ], [navigate]);

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
    
    // Check if logged today or yesterday. If neither, streak is broken
    if (!loggedDates.has(checkStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
      checkStr = formatDateStr(checkDate);
      if (!loggedDates.has(checkStr)) {
        return 0;
      }
    }
    
    // Count consecutive days backward
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

  // Monthly reading minutes accumulator
  const getMonthlyReadingMinutes = (entries: any[]) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const monthly = entries.filter((e: any) => {
      const d = new Date(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    
    return monthly.reduce((sum, e) => sum + (e.reading_minutes || 0), 0);
  };

  const fetchAllData = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, bace:baces(name)')
        .eq('id', userId)
        .single();
      setUserProfile(profile);

      // 2. Fetch targets
      const { data: targets } = await supabase
        .from('sadhana_targets')
        .select('*')
        .eq('user_id', userId);
      setUserTargets(targets || []);

      // 3. Fetch Entries
      const { data: entries } = await supabase
        .from('sadhana_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      
      const entriesList = entries || [];
      setAllEntries(entriesList);

      // Extract today's entry
      const today = entriesList.find((e: any) => e.date === todayStr);
      setTodayEntry(today || null);

    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      await fetchAllData(user.id);
      setLoading(false);
    };

    initializeDashboard();
  }, [navigate]);

  // Sync timers
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Handle optimistic checkbox toggles for the Morning program from the dashboard!
  const handleToggleMorningItem = async (field: 'mangal_arti' | 'tulasi_arti' | 'morning_japa' | 'morning_hearing') => {
    if (!userProfile?.id) return;
    
    const currentValue = todayEntry ? todayEntry[field] : false;
    const newValue = !currentValue;
    
    // 1. Update local state immediately for instant feedback
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
      return {
        ...base,
        [field]: newValue
      };
    });

    try {
      // 2. Sync to Supabase
      const payload: any = {
        user_id: userProfile.id,
        date: todayStr,
        [field]: newValue
      };
      
      if (todayEntry?.id) {
        payload.id = todayEntry.id;
      }
      
      const { error } = await supabase
        .from('sadhana_entries')
        .upsert(payload, { onConflict: 'user_id, date' });
        
      if (error) throw error;
      
      // 3. Re-fetch all entries in background to recalculate averages & streaks
      await fetchAllData(userProfile.id);
    } catch (err) {
      console.error("Failed to sync morning item checkbox:", err);
      // Revert state
      setTodayEntry((prev: any) => {
        if (!prev) return null;
        return {
          ...prev,
          [field]: currentValue
        };
      });
      alert("Failed to update status. Please check connection.");
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

  // Compute stats
  const todayRounds = todayEntry?.rounds_completed || 0;
  const dailyJapaTarget = 16; // Standard ISKCON target

  const currentStreak = calculateStreak(allEntries);
  const streakGoal = 7; // Progress circle towards 7 days

  // Adapt to reading targets
  const readingTargetObj = userTargets.find((t: any) => {
    return t.metric === 'reading_minutes' && t.start_date <= todayStr && t.end_date >= todayStr;
  });

  const readingGoalValue = readingTargetObj ? Number(readingTargetObj.target_value) : 1200; // default 20 hours (1200 mins)
  const actualReadingMinutes = readingTargetObj 
    ? allEntries.filter((e: any) => e.date >= readingTargetObj.start_date && e.date <= readingTargetObj.end_date).reduce((sum, e) => sum + (e.reading_minutes || 0), 0)
    : getMonthlyReadingMinutes(allEntries);

  const leftReadingMinutes = Math.max(0, readingGoalValue - actualReadingMinutes);
  const leftReadingHours = (leftReadingMinutes / 60).toFixed(1);

  // Rotating Stats Configuration exactly like the reference
  const statsRecords = [
    {
      label: 'Daily Japa Progress',
      value: Math.min(100, Math.round((todayRounds / dailyJapaTarget) * 100)),
      displayVal: `${todayRounds} Rnds`,
      color: 'text-indigo-650',
      text: todayRounds >= dailyJapaTarget ? 'Incredible chanting! You met your target! 🙏' : `Chanted ${todayRounds} of ${dailyJapaTarget} rounds. Keep it up.`,
      btnText: 'Log Extra Rounds',
      action: () => navigate('/log')
    },
    {
      label: 'Weekly Sadhana Streak',
      value: Math.min(100, Math.round((currentStreak / streakGoal) * 100)),
      displayVal: `🔥 ${currentStreak}d`,
      color: 'text-rose-650',
      text: currentStreak >= streakGoal ? 'Weekly logging streak accomplished! Sincere devotee! ✨' : `Chanted and logged for ${currentStreak} days consecutively.`,
      btnText: 'Set New Targets',
      action: () => navigate('/targets')
    },
    {
      label: 'Monthly Reading Progress',
      value: Math.min(100, Math.round((actualReadingMinutes / readingGoalValue) * 100)),
      displayVal: `${leftReadingHours}h left`,
      color: 'text-emerald-650',
      text: `You have left ${leftReadingHours} hours of reading for this month. Keep up the focus!`,
      btnText: 'Analyze Analytical Reports',
      action: () => navigate('/reports')
    }
  ];

  // Auto rotate stats widget every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStatIndex(prev => (prev + 1) % statsRecords.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [statsRecords.length]);

  // Notice board data styled exactly like the reference notices
  const notices = [
    {
      id: 1,
      title: "Collective Morning Japa Session",
      content: "Join daily Japa session at 5:00 AM in the BACE Temple Hall. Elevate your morning consciousness together.",
      icon: Info,
      dateStr: "TODAY • 05:00 AM",
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50"
    },
    {
      id: 2,
      title: "Complete Your Weekly Draft Submissions",
      content: "Ensure all draft logs for the last week are completed and 'Final Submitted'. Reports compile on Sunday.",
      icon: AlertTriangle,
      dateStr: "URGENT • REMINDER",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50"
    },
    {
      id: 3,
      title: "Outstanding Chanting Performance",
      content: "Amazing collective effort! Our BACE community members crossed a total of 1,200 rounds chanting this week! 🎉",
      icon: Award,
      dateStr: "MILESTONE • EVENT",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50"
    }
  ];

  // Exactly matching the 4 grid quick-action buttons under the Hero
  const quickActions = [
    {
      title: 'Sadhna Entry',
      description: 'Log your daily progress',
      icon: PenLine,
      path: '/log',
      color: 'from-blue-600 via-indigo-600 to-violet-600',
      bg: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Goal Setting',
      description: 'Set custom targets',
      icon: Target,
      path: '/targets',
      color: 'from-rose-500 via-red-650 to-orange-600',
      bg: 'bg-red-50 text-red-650'
    },
    {
      title: 'Analytical Report',
      description: 'View detailed analysis',
      icon: BarChart3,
      path: '/reports',
      color: 'from-emerald-500 via-teal-605 to-cyan-600',
      bg: 'bg-emerald-50 text-emerald-650'
    },
    {
      title: 'Sadhna History',
      description: 'Review past sadhana records',
      icon: History,
      path: '/history',
      color: 'from-orange-500 via-amber-605 to-yellow-600',
      bg: 'bg-amber-50 text-amber-650'
    }
  ];

  return (
    <StudentLayout>
      <div className="space-y-5 w-full animate-in fade-in duration-500">
      
      {/* 1. HERO SECTION (Exactly styled as requested) */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl min-h-[160px] md:min-h-[260px] flex items-center bg-slate-900 group">
        {/* Mobile background (< md) */}
        <div
          className="absolute inset-0 z-0 block md:hidden"
          style={{
            backgroundImage: `url(${studashMobImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Desktop / tablet background (md+) */}
        <div
          className="absolute inset-0 z-0 hidden md:block"
          style={{
            backgroundImage: `url(${studashImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Sleek shadow gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-transparent"></div>

        {/* Content Overlay */}
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
              <br className="md:hidden" />
              Keep up the momentum!
            </p>

            <div className="flex flex-wrap gap-2 justify-start">
              <button
                onClick={() => navigate('/log')}
                className="px-5 py-2.5 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-1.5 text-sm cursor-pointer shadow-sm"
              >
                <PenLine className="w-4 h-4 sm:w-5 sm:h-5" />
                Resume Chanting Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC CAROUSEL BANNERS (Sliding, auto-rotating) */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100">
        <div className="relative rounded-xl overflow-hidden group w-full h-[180px] sm:h-[150px]">
          <div
            className="flex transition-transform duration-500 h-full w-full"
            style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
          >
            {banners.map((banner) => (
              <div key={banner.id} className={`min-w-full h-full p-5 flex flex-col justify-between relative bg-gradient-to-br ${banner.bgClass} text-white`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none select-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${banner.badgeClass}`}>
                      {banner.badge}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight leading-snug mb-1">{banner.title}</h3>
                  <p className="text-white/80 text-xs font-semibold leading-relaxed line-clamp-2">{banner.description}</p>
                </div>
                <div className="relative z-10 flex items-center justify-between mt-2 border-t border-white/10 pt-2">
                  <button onClick={banner.action} className="bg-white text-slate-900 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1.5 group/btn cursor-pointer">
                    {banner.cta}
                    <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                  <div className="flex gap-1">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentBannerIndex(idx)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          idx === currentBannerIndex ? 'bg-white w-3' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. FOUR QUICK ACTIONS GRID (Identical design style to mockup) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
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

      {/* 4. SPLIT LAYOUT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Main Content - Left (2 Columns) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Schedule Card */}
          <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-650" />
                <h3 className="font-bold text-lg text-slate-800 tracking-tight">Today's Sadhana Checklist</h3>
              </div>
              <button
                onClick={() => navigate('/log')}
                className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-colors border border-blue-100/50 hover:bg-blue-100/70"
              >
                Log Full Form
              </button>
            </div>

            <div className="space-y-3">
              {[
                { key: 'mangal_arti', label: 'Mangal Arti Program', desc: 'Attended Mangal Arti prayers at the BACE/Temple', icon: Clock, color: 'text-amber-500 border-amber-200' },
                { key: 'tulasi_arti', label: 'Tulasi Arti Program', desc: 'Offered prayers and circumambulation to Tulasi Maharani', icon: Compass, color: 'text-emerald-500 border-emerald-200' },
                { key: 'morning_japa', label: 'Morning Japa Chanting', desc: 'Chanted Japa rounds attentively in the morning hours', icon: Flame, color: 'text-red-500 border-red-200' },
                { key: 'morning_hearing', label: 'Morning Lecture / Hearing', desc: 'Listened to morning Srimad Bhagavatam lecture/scriptures', icon: Radio, color: 'text-blue-500 border-blue-200' }
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

        {/* Sidebar - Right (1 Column) */}
        <div className="space-y-6">
          
          {/* Notice Board Card */}
          <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 md:p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-slate-800 tracking-tight">Notice Board</h3>
            </div>
            
            <div className="space-y-4">
              {notices.map((notice, i) => {
                const Icon = notice.icon;
                return (
                  <div key={i} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0 flex gap-3 group">
                    <div className={`w-10 h-10 rounded-xl ${notice.iconBg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                      <Icon className={`w-5 h-5 ${notice.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-slate-400">
                          {notice.dateStr}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-800 leading-tight group-hover:text-blue-650 transition-colors cursor-pointer mb-1 line-clamp-1">
                        {notice.title}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed line-clamp-2 italic">
                        {notice.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rotating Progress Widget (Styled exactly as reference with dots and CTA) */}
          <div
            className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 md:p-6 text-center shadow-xl border border-slate-100 transition-all duration-700 min-h-[220px] md:min-h-[280px] flex flex-col justify-center relative overflow-hidden group"
          >
            {/* Soft backdrop radial light reflection */}
            <div
              className={`${statsRecords[activeStatIndex].color.replace('text-', 'bg-')}/5 absolute top-0 right-0 w-48 h-48 rounded-full -mr-24 -mt-24 blur-3xl`}
            />

            <div className="mb-5 md:mb-6 relative inline-flex items-center justify-center mx-auto select-none">
              {/* SVG Ring exactly modeled from reference */}
              <svg
                className={`w-20 h-20 md:w-24 md:h-24 transform -rotate-90 drop-shadow-sm ${statsRecords[activeStatIndex].color}`}
                viewBox="0 0 96 96"
              >
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="opacity-10"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * statsRecords[activeStatIndex].value) / 100}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg md:text-xl font-black tracking-tight leading-none text-slate-800">
                  {statsRecords[activeStatIndex].displayVal}
                </span>
              </div>
            </div>

            <div className="relative z-10 px-1">
              <h3 className="font-black text-base md:text-lg mb-1 md:mb-1.5 tracking-tight text-slate-800">
                {statsRecords[activeStatIndex].label}
              </h3>
              <p className="text-slate-400 text-xs mb-5 md:mb-6 leading-relaxed font-semibold">
                {statsRecords[activeStatIndex].text}
              </p>

              {/* Slide indicators (dots) */}
              <div className="flex justify-center gap-2 mb-5 md:mb-6">
                {statsRecords.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveStatIndex(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                      i === activeStatIndex 
                        ? `w-8 ${statsRecords[i].color.replace('text-', 'bg-')} shadow-sm` 
                        : 'w-2 bg-slate-200 hover:bg-slate-350'
                    }`}
                  />
                ))}
              </div>

              {/* Progress CTA Button */}
              <button
                onClick={statsRecords[activeStatIndex].action}
                className={`w-full py-3 ${statsRecords[activeStatIndex].color.replace('text-', 'bg-')} hover:brightness-95 active:scale-[0.98] rounded-xl text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md`}
              >
                <span className="flex items-center gap-1.5">
                  {statsRecords[activeStatIndex].btnText}
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 stroke-[3]" />
                </span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
    </StudentLayout>
  );
};
