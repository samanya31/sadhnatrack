import { useState, useEffect } from 'react';
import { StudentLayout } from '../components/StudentLayout';
import { supabase } from '../lib/supabase';
import {
  PenLine,
  Target,
  History,
  BarChart3,
  Flame,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpenCheck,
  Compass
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import studashImg from '../assets/studash.png';
import studashMobImg from '../assets/studash_mob.png';

// Circular Progress Dial Component
const ProgressDial = ({
  value,
  target,
  title,
  subtitle,
  icon: Icon,
  colorClass,
  strokeColor,
  formatValue
}: {
  value: number;
  target: number;
  title: string;
  subtitle: string;
  icon: any;
  colorClass: string;
  strokeColor: string;
  formatValue: (v: number, t: number) => string;
}) => {
  const percentage = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200/50 flex flex-col items-center justify-between text-center min-h-[260px] relative overflow-hidden group hover:shadow-md transition-all duration-300">
      <div className="flex flex-col items-center gap-1 z-10 w-full">
        <div className={`p-3 rounded-2xl ${colorClass} bg-opacity-10 text-opacity-100 flex items-center justify-center mb-2`}>
          <Icon size={20} className="stroke-[2.5]" />
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{subtitle}</p>
      </div>

      <div className="relative my-4 flex items-center justify-center">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle cx="64" cy="64" r={radius} className="stroke-slate-100 fill-none stroke-[8]" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="fill-none stroke-[8] transition-all duration-1000 ease-out"
            style={{
              stroke: strokeColor,
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
          <span className="text-base font-black text-slate-800 leading-none">{formatValue(value, target)}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{percentage}%</span>
        </div>
      </div>

      <div className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl uppercase tracking-widest z-10">
        Goal: {target}
      </div>
    </div>
  );
};

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [userTargets, setUserTargets] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Hardcoded premium banners for Ekadashi, Temple events, and Quotes
  const banners = [
    {
      id: 1,
      title: "Ekadashi Mahadvadashi Alert 🌌",
      description: "Prepare for the upcoming Ekadashi. Plan extra rounds of chanting, reading, and pure fasting from grains to refresh your spirit.",
      badge: "Spiritual Event",
      bgClass: "from-indigo-950 via-purple-900 to-indigo-900 text-white",
      badgeClass: "bg-purple-500/30 text-purple-200 border-purple-400/30",
      cta: "Schedule Extra Rounds",
      action: () => navigate('/targets')
    },
    {
      id: 2,
      title: "Weekly Sangha & saturday Feast 🛕",
      description: "Join fellow devotees this Saturday at 6:30 PM for ecstatic congregational Kirtan, a deep discourse, and delicious Mahaprasadam.",
      badge: "Temple Program",
      bgClass: "from-amber-950 via-orange-900 to-rose-900 text-white",
      badgeClass: "bg-orange-500/30 text-orange-200 border-orange-400/30",
      cta: "Log Sadhana Log",
      action: () => navigate('/log')
    },
    {
      id: 3,
      title: "Prabhupada Vani Inspiration 📖",
      description: "\"By chanting the Hare Krishna mantra, one's heart is cleansed of all dirty things, and one is immediately elevated to the spiritual platform.\"",
      badge: "Daily Quote",
      bgClass: "from-emerald-950 via-teal-900 to-emerald-900 text-white",
      badgeClass: "bg-emerald-500/30 text-emerald-200 border-emerald-400/30",
      cta: "Read Books Today",
      action: () => navigate('/log')
    }
  ];

  // Auto rotate banners every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

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

  // Quick Action Buttons
  const quickActions = [
    {
      name: "Log Today's Entry",
      description: "Log rounds, reading, hearing & seva",
      icon: PenLine,
      color: "from-emerald-500 to-teal-600 shadow-emerald-200",
      path: "/log"
    },
    {
      name: "Spiritual Targets",
      description: "Set custom reading and chanting goals",
      icon: Target,
      color: "from-rose-500 to-orange-500 shadow-rose-200",
      path: "/targets"
    },
    {
      name: "Analytical Reports",
      description: "View progress charts and logs summary",
      icon: BarChart3,
      color: "from-blue-500 to-indigo-600 shadow-blue-200",
      path: "/reports"
    },
    {
      name: "Sadhana History",
      description: "View, review, and search past logs",
      icon: History,
      color: "from-amber-500 to-yellow-600 shadow-amber-250",
      path: "/history"
    }
  ];

  // Hardcoded Notice Board Announcements with premium style treatments
  const notices = [
    {
      id: 1,
      type: "info",
      title: "Collective Morning Japa Session",
      content: "Join daily Japa session at 5:00 AM in the BACE Temple Hall. Elevate your morning consciousness together.",
      icon: Info,
      badge: "BACE Schedule",
      borderClass: "border-blue-100 bg-blue-50/30 text-blue-800",
      iconClass: "bg-blue-100 text-blue-600",
      badgeClass: "bg-blue-100/60 text-blue-700"
    },
    {
      id: 2,
      type: "warning",
      title: "Complete Your Weekly Draft Submissions",
      content: "Ensure all draft logs for the last week are completed and 'Final Submitted'. Reports are scheduled to compile on Sunday.",
      icon: AlertTriangle,
      badge: "Urgent Reminder",
      borderClass: "border-amber-100 bg-amber-50/30 text-amber-800",
      iconClass: "bg-amber-100 text-amber-600",
      badgeClass: "bg-amber-100/60 text-amber-700"
    },
    {
      id: 3,
      type: "success",
      title: "Outstanding Chanting Performance",
      content: "Amazing collective effort! Our BACE community members crossed a total of 1,200 rounds chanting this week! Let's keep it up! 🎉",
      icon: Award,
      badge: "Community Milestone",
      borderClass: "border-emerald-100 bg-emerald-50/30 text-emerald-800",
      iconClass: "bg-emerald-100 text-emerald-600",
      badgeClass: "bg-emerald-100/60 text-emerald-700"
    }
  ];

  return (
    <StudentLayout>
      <div className="max-w-[1200px] mx-auto px-1 sm:px-0 mb-10 animate-in fade-in duration-500">
        
        {/* 1. HERO BANNER CARD */}
        <div className="relative rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-200/50 min-h-[220px] md:min-h-[280px] flex items-center p-6 md:p-12 mb-8 group">
          {/* Desktop Background */}
          <img 
            src={studashImg} 
            alt="Dashboard" 
            className="absolute inset-0 w-full h-full object-cover hidden md:block group-hover:scale-102 transition-transform duration-700 ease-out" 
          />
          {/* Mobile Background */}
          <img 
            src={studashMobImg} 
            alt="Dashboard Mobile" 
            className="absolute inset-0 w-full h-full object-cover md:hidden group-hover:scale-102 transition-transform duration-700 ease-out" 
          />
          
          {/* Dark overlay for rich contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-transparent"></div>
          
          <div className="relative z-10 max-w-xl text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-primary-500/30 text-primary-200 border border-primary-400/30 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg">
                {userProfile?.bace?.name || 'BACE Devotee'}
              </span>
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Active
              </span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-black tracking-tight leading-tight mb-2">
              Hare Krishna, {userProfile?.full_name || 'Student'}! 🙏
            </h1>
            <p className="text-slate-200 text-xs md:text-sm font-bold uppercase tracking-wider mb-4 opacity-90">
              Welcome back to your spiritual dashboard
            </p>
            <p className="text-slate-350 text-xs md:text-sm font-medium leading-relaxed max-w-md hidden sm:block">
              "By chanting the Hare Krishna Maha Mantra, our hearts are cleansed, our habits are refined, and we find true spiritual peace."
            </p>
          </div>
        </div>

        {/* 2. PROGRESS DIALS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          
          {/* Japa Progress Circle */}
          <ProgressDial
            value={todayRounds}
            target={dailyJapaTarget}
            title="Daily Japa"
            subtitle="Rounds Chanted Today"
            icon={Flame}
            colorClass="bg-orange-500 text-orange-600"
            strokeColor="#EA580C"
            formatValue={(v) => `${v} Rnds`}
          />

          {/* Logging Streak Progress Circle */}
          <ProgressDial
            value={currentStreak}
            target={streakGoal}
            title="Weekly Streak"
            subtitle="Consecutive Logged Days"
            icon={Sparkles}
            colorClass="bg-red-500 text-red-650"
            strokeColor="#DC2626"
            formatValue={(v) => `🔥 ${v} Days`}
          />

          {/* Reading Target Progress Circle (Fulfills exact User Request for hours remaining) */}
          <ProgressDial
            value={actualReadingMinutes}
            target={readingGoalValue}
            title="Monthly Reading"
            subtitle="Reading Goal Progress"
            icon={BookOpenCheck}
            colorClass="bg-blue-500 text-blue-650"
            strokeColor="#2563EB"
            formatValue={() => `${leftReadingHours}h left`}
          />

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-10">
          
          {/* LEFT & CENTER PORTIONS (2 columns wide on large screen) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 3. AUTO ROTATING ANNOUNCEMENT CAROUSEL */}
            <div className="relative rounded-[2rem] overflow-hidden shadow-md border border-slate-200/50 p-6 md:p-8 min-h-[180px] flex flex-col justify-between transition-all duration-500">
              {/* Dynamic sliding gradient bg based on active banner */}
              <div className={`absolute inset-0 bg-gradient-to-br ${banners[currentBannerIndex].bgClass} opacity-95 transition-all duration-700 ease-in-out`}></div>
              
              {/* Dynamic decorative backdrop circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-xl pointer-events-none select-none"></div>
              
              <div className="relative z-10 w-full flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${banners[currentBannerIndex].badgeClass}`}>
                      {banners[currentBannerIndex].badge}
                    </span>
                    <div className="flex gap-1">
                      {banners.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentBannerIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            idx === currentBannerIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <h2 className="text-lg md:text-xl font-black text-white tracking-tight leading-snug mb-2 animate-in fade-in duration-300">
                    {banners[currentBannerIndex].title}
                  </h2>
                  <p className="text-white/80 text-xs md:text-sm font-medium leading-relaxed mb-6 animate-in fade-in duration-300 max-w-2xl">
                    {banners[currentBannerIndex].description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <button
                    onClick={banners[currentBannerIndex].action}
                    className="bg-white text-slate-900 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-slate-50 transition-colors flex items-center gap-2 group/btn cursor-pointer"
                  >
                    {banners[currentBannerIndex].cta}
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/5 cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. TODAY'S CHECKLIST MILESTONES (With Instant Click Sync) */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Compass size={20} className="text-emerald-500" />
                    Today's Sadhana Checklist
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Quick tap to log milestones instantly on Supabase</p>
                </div>
                <button
                  onClick={() => navigate('/log')}
                  className="text-xs font-black text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-colors border border-primary-100/50"
                >
                  Full Form
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'mangal_arti', label: 'Mangal Arti', desc: 'Attended morning Arti program' },
                  { key: 'tulasi_arti', label: 'Tulasi Arti', desc: 'Attended Tulasi Puja program' },
                  { key: 'morning_japa', label: 'Chanted Japa', desc: 'Completed morning chant rounds' },
                  { key: 'morning_hearing', label: 'Heard Lecture', desc: 'Heard morning Srimad Bhagavatam' }
                ].map((item) => {
                  const isChecked = todayEntry ? todayEntry[item.key] : false;
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleToggleMorningItem(item.key as any)}
                      className={`
                        p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group/item select-none
                        ${isChecked
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-inner'
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-slate-500'}
                      `}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                        <span className="text-[10px] font-medium opacity-60 leading-none">{item.desc}</span>
                      </div>
                      
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20' 
                          : 'bg-white border border-slate-200 text-transparent group-hover/item:border-emerald-300'
                      }`}>
                        <CheckCircle size={16} className={isChecked ? 'stroke-[3.5]' : 'text-slate-200'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. QUICK ACTIONS GRID */}
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-widest mb-4">Quick Tools Portal</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(action.path)}
                    className="bg-white border border-slate-200/50 rounded-[2rem] p-5 flex items-center gap-4 text-left group hover:shadow-md hover:border-slate-300/60 transition-all duration-300 cursor-pointer"
                  >
                    <div className={`p-4 bg-gradient-to-br ${action.color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-350`}>
                      <action.icon size={22} className="stroke-[2.5]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{action.name}</h3>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-tight">{action.description}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 group-hover:text-slate-400 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT PORTION (BACE NOTICE BOARD - 1 column wide on large screen) */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200/50 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 shadow-inner">
                    <Calendar size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-800 tracking-tight">Notice Board</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-0.5">BACE Announcements</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {notices.map((notice) => (
                    <div
                      key={notice.id}
                      className={`p-4 rounded-2xl border ${notice.borderClass} space-y-3 flex flex-col justify-between`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${notice.badgeClass}`}>
                          {notice.badge}
                        </span>
                        <div className={`p-1.5 rounded-lg ${notice.iconClass}`}>
                          <notice.icon size={14} className="stroke-[2.5]" />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider leading-snug mb-1">
                          {notice.title}
                        </h4>
                        <p className="text-[11px] font-medium leading-relaxed opacity-90">
                          {notice.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stats panel */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-center bg-slate-50 rounded-2xl p-4">
                <div>
                  <span className="block text-xs font-black text-slate-800 leading-none">
                    {allEntries.length}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Logs Total</span>
                </div>
                <div className="h-6 w-[1px] bg-slate-200"></div>
                <div>
                  <span className="block text-xs font-black text-slate-800 leading-none">
                    {allEntries.length > 0 
                      ? (allEntries.reduce((sum, e) => sum + (e.rounds_completed || 0), 0) / allEntries.length).toFixed(1) 
                      : 0}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Rounds</span>
                </div>
                <div className="h-6 w-[1px] bg-slate-200"></div>
                <div>
                  <span className="block text-xs font-black text-slate-800 leading-none text-emerald-600 flex items-center justify-center gap-0.5">
                    <TrendingUp size={12} />
                    100%
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sincerity</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </StudentLayout>
  );
};
