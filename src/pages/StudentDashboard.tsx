import { useState, useEffect, useMemo } from 'react';
import { StudentLayout } from '../components/StudentLayout';
import { supabase, calculateTargetActualProgress } from '../lib/supabase';
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
  BookOpen,
  Headphones,
  Star,
  PlayCircle
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import studashImg from '../assets/studash.png';
import studashMobImg from '../assets/studash_mob.png';
import studashImgF from '../assets/studash_f.png';
import studashMobImgF from '../assets/studash_mob_f.png';
import { SadhanaDayDetail } from '../components/SadhanaDayDetail';
import type { SadhanaEntry } from '../types/index';

// Metric label helpers — richer gradients + button accents per goal type
const metricLabels: Record<
  string,
  {
    label: string;
    unit: string;
    icon: typeof Flame;
    color: string;
    lightBg: string;
    textColor: string;
    badge: string;
    btn: string;
    dot: string;
  }
> = {
  rounds_completed: {
    label: 'Japa Rounds',
    unit: 'rounds/day',
    icon: Flame,
    color: 'from-orange-100 via-amber-50 to-yellow-100',
    lightBg: 'bg-white/70',
    textColor: 'text-orange-800',
    badge: 'bg-orange-500/15 text-orange-800 border-orange-300/50',
    btn: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-200/50 hover:from-orange-600 hover:to-amber-600',
    dot: 'bg-orange-500',
  },
  reading_minutes: {
    label: 'Book Reading',
    unit: 'min/day',
    icon: BookOpen,
    color: 'from-blue-100 via-indigo-50 to-violet-100',
    lightBg: 'bg-white/70',
    textColor: 'text-indigo-800',
    badge: 'bg-indigo-500/15 text-indigo-800 border-indigo-300/50',
    btn: 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200/50 hover:from-indigo-600 hover:to-violet-600',
    dot: 'bg-indigo-500',
  },
  hearing_minutes: {
    label: 'Audio Hearing',
    unit: 'min/day',
    icon: Headphones,
    color: 'from-emerald-100 via-teal-50 to-cyan-100',
    lightBg: 'bg-white/70',
    textColor: 'text-emerald-800',
    badge: 'bg-emerald-500/15 text-emerald-800 border-emerald-300/50',
    btn: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/50 hover:from-emerald-600 hover:to-teal-600',
    dot: 'bg-emerald-500',
  },
  mangal_arti: {
    label: 'Mangal Arti',
    unit: 'days/week',
    icon: Star,
    color: 'from-rose-100 via-pink-50 to-fuchsia-100',
    lightBg: 'bg-white/70',
    textColor: 'text-rose-800',
    badge: 'bg-rose-500/15 text-rose-800 border-rose-300/50',
    btn: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200/50 hover:from-rose-600 hover:to-pink-600',
    dot: 'bg-rose-500',
  },
  morning_japa: {
    label: 'Morning Japa',
    unit: 'days/week',
    icon: Flame,
    color: 'from-violet-100 via-purple-50 to-indigo-100',
    lightBg: 'bg-white/70',
    textColor: 'text-violet-800',
    badge: 'bg-violet-500/15 text-violet-800 border-violet-300/50',
    btn: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-200/50 hover:from-violet-600 hover:to-purple-600',
    dot: 'bg-violet-500',
  },
  seva_minutes: {
    label: 'Seva/Service',
    unit: 'min',
    icon: Star,
    color: 'from-amber-100 via-orange-50 to-rose-50',
    lightBg: 'bg-white/70',
    textColor: 'text-amber-900',
    badge: 'bg-amber-500/15 text-amber-900 border-amber-300/50',
    btn: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/50 hover:from-amber-600 hover:to-orange-600',
    dot: 'bg-amber-500',
  },
  exercise_minutes: {
    label: 'Exercise',
    unit: 'min',
    icon: Star,
    color: 'from-teal-100 via-emerald-50 to-green-100',
    lightBg: 'bg-white/70',
    textColor: 'text-teal-800',
    badge: 'bg-teal-500/15 text-teal-800 border-teal-300/50',
    btn: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-200/50 hover:from-teal-600 hover:to-emerald-600',
    dot: 'bg-teal-500',
  },
  custom_milestone: {
    label: 'Custom Milestone',
    unit: 'units',
    icon: Star,
    color: 'from-slate-100 via-blue-50 to-indigo-100',
    lightBg: 'bg-white/70',
    textColor: 'text-slate-800',
    badge: 'bg-slate-500/15 text-slate-800 border-slate-300/50',
    btn: 'bg-gradient-to-r from-slate-600 to-indigo-600 text-white shadow-md shadow-slate-200/50 hover:from-slate-700 hover:to-indigo-700',
    dot: 'bg-indigo-500',
  },
};

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayEntry, setTodayEntry] = useState<SadhanaEntry | null>(null);
  const [yesterdayEntry, setYesterdayEntry] = useState<SadhanaEntry | null>(null);
  const [userTargets, setUserTargets] = useState<any[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

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
      
      const userTargetsList = targets || [];
      const targetsWithProgress = await Promise.all(
        userTargetsList.map(async (target: any) => {
          let actualProgress = 0;
          if (target.metric !== 'custom_milestone') {
            actualProgress = await calculateTargetActualProgress(
              userId,
              target.metric,
              target.start_date,
              target.end_date
            );
          } else {
            actualProgress = target.is_completed ? target.target_value : target.current_progress;
          }
          return {
            ...target,
            actualProgress
          };
        })
      );
      setUserTargets(targetsWithProgress);

      const { data: entries } = await supabase
        .from('sadhana_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      const entriesList = entries || [];
      const today = entriesList.find((e: any) => e.date === todayStr);
      const yesterday = entriesList.find((e: any) => e.date === yesterdayStr);
      setTodayEntry(today || null);
      setYesterdayEntry(yesterday || null);
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
    if (!userTargets?.length) return [];
    return userTargets.slice(0, 6);
  }, [userTargets]);

  const heroImages = useMemo(() => {
    const isFemale = userProfile?.gender === 'female';
    return {
      desktop: isFemale ? studashImgF : studashImg,
      mobile: isFemale ? studashMobImgF : studashMobImg,
    };
  }, [userProfile?.gender]);

  const BANNER_COUNT = goalsForCarousel.length;

  useEffect(() => {
    if (BANNER_COUNT <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % BANNER_COUNT);
    }, 4500);
    return () => clearInterval(interval);
  }, [BANNER_COUNT]);

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

  // Quick action cards
  const quickActions = [
    { title: 'Sadhna Entry', description: 'Log your daily progress', icon: PenLine, path: '/log', color: 'from-blue-600 via-indigo-600 to-violet-600', bg: 'bg-blue-50 text-blue-600' },
    { title: 'Goal Setting', description: 'Set custom targets', icon: Target, path: '/targets', color: 'from-rose-500 via-red-500 to-orange-500', bg: 'bg-red-50 text-red-500' },
    { title: 'Analytical Report', description: 'View detailed analysis', icon: BarChart3, path: '/reports', color: 'from-emerald-500 via-teal-500 to-cyan-500', bg: 'bg-emerald-50 text-emerald-600' },
    { title: 'Sadhna History', description: 'Review past sadhana records', icon: History, path: '/history', color: 'from-orange-500 via-amber-500 to-yellow-500', bg: 'bg-amber-50 text-amber-600' },
  ];

  const checklistItems = [
    {
      key: 'basic_info',
      label: 'Basic Information',
      desc: 'Wakeup and sleep times',
      icon: Clock,
      isFilled: !!(todayEntry?.wakeup_time || todayEntry?.sleep_time),
      statusText: todayEntry?.wakeup_time || todayEntry?.sleep_time ? 'Filled' : 'Not Filled',
    },
    {
      key: 'rounds_completed',
      label: 'Japa Chanting',
      desc: 'Daily rounds of Hare Krishna Mahamantra',
      icon: Flame,
      isFilled: !!(todayEntry && todayEntry.rounds_completed > 0),
      statusText: todayEntry && todayEntry.rounds_completed > 0 ? `Filled · ${todayEntry.rounds_completed} rounds` : 'Not Filled',
    },
    {
      key: 'reading_minutes',
      label: 'Scripture Reading',
      desc: "Reading Srila Prabhupada's books",
      icon: BookOpen,
      isFilled: !!(todayEntry && todayEntry.reading_minutes > 0),
      statusText: todayEntry && todayEntry.reading_minutes > 0 ? 'Filled' : 'Not Filled',
    },
    {
      key: 'hearing_minutes',
      label: 'Lecture Hearing',
      desc: 'Hearing lectures, classes, or Kirtan',
      icon: Headphones,
      isFilled: !!(todayEntry && todayEntry.hearing_minutes > 0),
      statusText: todayEntry && todayEntry.hearing_minutes > 0 ? 'Filled' : 'Not Filled',
    },
  ];

  return (
    <StudentLayout>
      <div className="space-y-4 w-full animate-in fade-in duration-500">

        {/* 1. HERO SECTION */}
        <div className="relative overflow-hidden rounded-2xl shadow-xl min-h-[160px] md:min-h-[250px] flex items-center bg-slate-900">
          <picture className="absolute inset-0 z-0 w-full h-full">
            <source media="(max-width: 767px)" srcSet={heroImages.mobile} />
            <img
              src={heroImages.desktop}
              alt="Hero Background"
              className="w-full h-full object-cover object-center"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/50 to-transparent" />

          <div className="relative z-10 w-full px-5 md:px-10 py-6 md:py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1 text-left">
              <button
                onClick={() => navigate('/targets')}
                className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold mb-2.5 hover:bg-white/20 transition-colors cursor-pointer"
              >
                🎓 ISKCON BACE STUDENT
              </button>
              <h2 className="text-xl md:text-4xl font-black text-white mb-1 tracking-tight">
                Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Devotee'}!
              </h2>
              <p className="text-blue-100 text-sm md:text-lg max-w-xl mb-4 font-medium leading-normal">
                You have completed <span className="font-bold text-white">{todayRounds} rounds</span> of Japa today.
                <br />
                Keep up the momentum!
              </p>
              <div className="flex flex-wrap gap-2 justify-start">
                <button
                  onClick={() => navigate('/log')}
                  className="px-5 py-2.5 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl font-bold hover:bg-white/30 transition-all flex items-center gap-1.5 text-sm cursor-pointer shadow-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  Resume Chanting Log
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. GOALS CAROUSEL — only when student has set goals */}
        {goalsForCarousel.length > 0 && (
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-100 min-w-0">
          <div className="relative rounded-xl overflow-hidden w-full sm:min-h-[200px]">
            <div
              className="flex transition-transform duration-500 w-full sm:min-h-[200px]"
              style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
            >
              {goalsForCarousel.map((goal: any, idx: number) => {
                const meta = metricLabels[goal.metric] || {
                  label: goal.metric?.replace(/_/g, ' ') || 'Goal',
                  unit: '',
                  icon: Star,
                  color: 'from-slate-100 via-blue-50 to-indigo-100',
                  lightBg: 'bg-white/70',
                  textColor: 'text-slate-800',
                  badge: 'bg-slate-500/15 text-slate-800 border-slate-300/50',
                  btn: 'bg-gradient-to-r from-slate-600 to-indigo-600 text-white shadow-md hover:from-slate-700 hover:to-indigo-700',
                  dot: 'bg-indigo-500',
                };
                const IconComp = meta.icon;
                const isActive = goal.start_date <= todayStr && goal.end_date >= todayStr;
                const isFallback = goal.isFallback;

                // Dynamically resolve actual progress
                let actual = 0;
                if (isFallback) {
                  if (goal.metric === 'rounds_completed') {
                    actual = todayRounds;
                  } else if (goal.metric === 'reading_minutes') {
                    actual = todayEntry?.reading_minutes || 0;
                  }
                } else {
                  actual = goal.actualProgress || 0;
                }

                const isMilestone = goal.metric === 'custom_milestone';
                const total = isMilestone ? 1 : goal.target_value;
                const milestoneDone = !!goal.is_completed;
                const progressValue = isMilestone ? (milestoneDone ? 1 : 0) : actual;
                const percent = isMilestone
                  ? milestoneDone
                    ? 100
                    : 0
                  : total > 0
                    ? Math.min(100, Math.round((progressValue / total) * 100))
                    : 0;

                // Convert minute-based metrics to hours
                const isTimeMetric = goal.metric.includes('minutes');
                const formatVal = (val: number) => {
                  if (isTimeMetric) {
                    const hrs = val / 60;
                    return hrs % 1 === 0 ? `${hrs}h` : `${hrs.toFixed(1).replace('.0', '')}h`;
                  }
                  return `${val}`;
                };

                const unitLabel = isTimeMetric ? 'hours' : meta.unit || 'units';
                const formattedActual = isMilestone
                  ? milestoneDone
                    ? 'Completed'
                    : 'Not completed'
                  : formatVal(progressValue);
                const formattedTotal = isMilestone ? 'Milestone' : formatVal(total);

                const dateRangeShort =
                  !isFallback && goal.start_date && goal.end_date
                    ? `${format(parseISO(goal.start_date), 'MMM d')} – ${format(parseISO(goal.end_date), 'MMM d, yyyy')}`
                    : null;

                return (
                  <div
                    key={goal.id || idx}
                    className={`w-full flex-[0_0_100%] box-border px-4 sm:px-5 pt-3 sm:pt-5 pb-3 sm:pb-5 flex flex-col justify-start sm:justify-between gap-2 sm:gap-4 relative bg-gradient-to-br border border-white/60 overflow-hidden sm:min-h-[200px] ${meta.color}`}
                  >
                    <div className={`absolute top-0 right-0 w-40 sm:w-48 h-40 sm:h-48 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 blur-3xl pointer-events-none opacity-25 ${meta.dot}`} />
                    <div className={`absolute bottom-0 left-0 w-24 sm:w-32 h-24 sm:h-32 rounded-full -ml-8 sm:-ml-10 -mb-8 sm:-mb-10 blur-2xl pointer-events-none opacity-15 ${meta.dot}`} />

                    <div className="relative z-10 min-w-0 sm:flex-1">
                      <div className="flex flex-col gap-1.5 sm:gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-1.5 sm:mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-9 h-9 rounded-xl ${meta.lightBg} border border-white/80 shadow-sm flex items-center justify-center shrink-0`}>
                            <IconComp className={`w-4 h-4 ${meta.textColor}`} />
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shrink-0 ${meta.badge}`}>
                            {isFallback ? 'Default Goal' : isActive ? 'Active Goal' : 'Goal'}
                          </span>
                        </div>
                        {!isFallback && dateRangeShort && (
                          <span className="text-[9px] font-bold text-slate-500 bg-white/60 px-2 py-1 rounded-full border border-white/80 self-start sm:self-auto max-w-full">
                            {dateRangeShort}
                          </span>
                        )}
                      </div>

                      <h3 className={`text-[15px] sm:text-lg font-black tracking-tight leading-snug mb-1 sm:mb-1.5 break-words ${meta.textColor}`}>
                        {goal.title || meta.label}
                      </h3>
                      <div className="space-y-0 text-[11px] sm:text-xs font-semibold text-slate-600 leading-snug sm:leading-relaxed">
                        {isMilestone ? (
                          <>
                            <p>
                              Goal type: <span className="text-slate-800">Custom milestone (yes / no)</span>
                            </p>
                            <p>
                              Status:{' '}
                              <span className={milestoneDone ? 'text-emerald-700' : 'text-slate-800'}>
                                {formattedActual} ({percent}%)
                              </span>
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              Target: <span className="text-slate-800">{formattedTotal} {unitLabel}</span>
                            </p>
                            <p>
                              Progress: <span className="text-slate-800">{formattedActual} ({percent}%)</span>
                              {!isFallback && (
                                <span className="hidden sm:inline text-slate-500">
                                  {' '}
                                  · {isActive ? 'Currently active' : 'Not active'}
                                </span>
                              )}
                            </p>
                            {!isFallback && (
                              <p className="text-slate-500 sm:hidden">
                                {isActive ? 'Currently active' : 'Not active'}
                              </p>
                            )}
                          </>
                        )}
                        {!isFallback && isMilestone && (
                          <p className="text-slate-500">
                            {isActive ? 'Currently active' : 'Not active'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 pt-2 sm:pt-3 mt-1 sm:mt-0 border-t border-black/5 shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate('/targets')}
                        className={`${meta.btn} w-full sm:w-auto justify-center px-4 py-2 sm:py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer`}
                      >
                        {isFallback ? 'Set My Goals' : 'Manage Goals'}
                        <ArrowRight size={11} className="shrink-0" />
                      </button>
                      <div className="flex gap-1.5 items-center justify-center sm:justify-end shrink-0">
                        {goalsForCarousel.map((_: any, i: number) => (
                          <button
                            key={i}
                            type="button"
                            aria-label={`Go to goal ${i + 1}`}
                            onClick={() => setCurrentBannerIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              i === currentBannerIndex ? `w-6 ${meta.dot}` : 'w-1.5 bg-slate-300/80'
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
        )}

        {/* 3. FOUR QUICK ACTIONS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.path)}
              className="group relative bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-5 md:p-7 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 text-left overflow-hidden flex flex-col cursor-pointer min-h-[128px] sm:min-h-[148px] lg:min-h-[160px]"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${action.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
              <div className="flex flex-row items-center gap-2.5 mb-3 md:mb-4">
                <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                  <action.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">
                  {action.title}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-semibold mb-4 flex-1 line-clamp-2">
                {action.description}
              </p>
              <div className="flex items-center text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-600 transition-colors mt-auto pt-1">
                Access Now <ChevronRight className="w-3.5 h-3.5 ml-1 stroke-[3]" />
              </div>
            </button>
          ))}
        </div>

        {/* 4. TODAY'S SCHEDULE (left) + YESTERDAY'S HISTORY (right) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 items-start min-w-0">
          {/* Left — Today's Sadhana Schedule (4 items) */}
          <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-6 shadow-sm border border-slate-100 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
                <h3 className="font-bold text-lg text-slate-800">Today&apos;s Sadhana Schedule</h3>
              </div>
              <button
                onClick={() => navigate('/log')}
                className="text-sm text-blue-600 font-semibold hover:underline shrink-0"
              >
                Log Sadhana
              </button>
            </div>

            <div className="space-y-3">
              {checklistItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate('/log')}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/log')}
                    className={`rounded-xl px-5 py-4 flex items-center justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer min-w-0 ${
                      item.isFilled
                        ? 'bg-emerald-50/80 border border-emerald-100'
                        : 'bg-white border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          item.isFilled
                            ? 'bg-white border border-emerald-200 text-emerald-600'
                            : 'bg-slate-50 border border-slate-200 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 text-base leading-tight">{item.label}</h4>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{item.desc}</p>
                        <p
                          className={`text-[10px] font-black uppercase mt-1 tracking-wide ${
                            item.isFilled ? 'text-emerald-600' : 'text-blue-600'
                          }`}
                        >
                          {item.statusText}
                        </p>
                      </div>
                    </div>
                    {item.isFilled && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                        <CheckCircle className="w-4 h-4" />
                        Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Previous day sadhana history */}
          <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl p-6 shadow-sm border border-slate-100 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="min-w-0">
                <h3 className="font-bold text-lg text-slate-800">Yesterday&apos;s Sadhana</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {format(subDays(new Date(), 1), 'EEEE, MMM d')}
                </p>
              </div>
              <button
                onClick={() => navigate('/history')}
                className="text-sm text-blue-600 font-semibold hover:underline shrink-0"
              >
                View All
              </button>
            </div>
            <SadhanaDayDetail
              embedded
              entry={yesterdayEntry}
              emptyTitle="No Entry Yesterday"
              emptyDescription="You did not log sadhana for yesterday. Start today and build your streak."
            />
          </div>
        </div>

      </div>
    </StudentLayout>
  );
};
