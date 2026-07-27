import { useState, useEffect } from 'react';
import { StudentLayout } from '../components/StudentLayout';
import { 
  supabase, 
  fetchUserTargets, 
  createUserTarget, 
  deleteUserTarget, 
  updateTargetCompletion, 
  calculateTargetActualProgress 
} from '../lib/supabase';
import {
  Target,
  Trash2,
  Calendar,
  Headphones,
  Hammer,
  Dumbbell,
  BookOpen as BookIcon,
  CheckCircle2,
  Award,
  Star,
  Layers,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { TargetWelcomeModal } from '../components/TargetWelcomeModal';
import { TargetCreateModal } from '../components/TargetCreateModal';

export const StudentTargets = () => {
  const [targets, setTargets] = useState<any[]>([]);
  const [showWelcomeTargets, setShowWelcomeTargets] = useState(false);
  const [showCreateTarget, setShowCreateTarget] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('active');

  const fetchTargetsData = async (userId: string) => {
    try {
      setLoading(true);
      const userTargets = await fetchUserTargets(userId);
      const targetsWithProgress = await Promise.all(
        userTargets.map(async (target: any) => {
          let actualProgress = 0;
          if (target.metric !== 'custom_milestone') {
            actualProgress = await calculateTargetActualProgress(
              userId,
              target.metric,
              target.start_date,
              target.end_date
            );
          }
          return {
            ...target,
            actualProgress
          };
        })
      );
      setTargets(targetsWithProgress);
    } catch (err) {
      console.error('Error fetching targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, bace:baces!bace_id(name)')
          .eq('id', user.id)
          .single();
        setUserProfile(data);
        fetchTargetsData(user.id);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveTarget = async (newTargetData: any) => {
    if (!userProfile?.id) return;
    try {
      await createUserTarget({
        ...newTargetData,
        user_id: userProfile.id,
        current_progress: 0,
        is_completed: false
      });
      await fetchTargetsData(userProfile.id);
    } catch (err) {
      console.error('Failed to save target:', err);
    }
  };

  const handleToggleTargetComplete = async (targetId: string, isCompleted: boolean) => {
    if (!userProfile?.id) return;
    try {
      await updateTargetCompletion(targetId, isCompleted);
      await fetchTargetsData(userProfile.id);
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (!userProfile?.id) return;
    if (!confirm('Are you sure you want to delete this target?')) return;
    try {
      await deleteUserTarget(targetId);
      await fetchTargetsData(userProfile.id);
    } catch (err) {
      console.error('Failed to delete target:', err);
    }
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getMetricLabel = (m: string) => {
    if (m === 'reading_minutes') return 'Reading';
    if (m === 'hearing_minutes') return 'Hearing';
    if (m === 'rounds_completed') return 'Rounds';
    if (m === 'seva_minutes') return 'Seva';
    if (m === 'exercise_minutes') return 'Exercise';
    return 'Milestone';
  };

  const getMetricTheme = (m: string) => {
    switch (m) {
      case 'reading_minutes':
        return {
          bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          barColor: 'bg-emerald-500',
          icon: <BookIcon size={14} />
        };
      case 'hearing_minutes':
        return {
          bg: 'bg-purple-50 text-purple-600 border-purple-100',
          barColor: 'bg-purple-500',
          icon: <Headphones size={14} />
        };
      case 'rounds_completed':
        return {
          bg: 'bg-rose-50 text-rose-600 border-rose-100',
          barColor: 'bg-rose-500',
          icon: <Award size={14} />
        };
      case 'seva_minutes':
        return {
          bg: 'bg-amber-50 text-amber-600 border-amber-100',
          barColor: 'bg-amber-500',
          icon: <Hammer size={14} />
        };
      case 'exercise_minutes':
        return {
          bg: 'bg-teal-50 text-teal-600 border-teal-100',
          barColor: 'bg-teal-500',
          icon: <Dumbbell size={14} />
        };
      default:
        return {
          bg: 'bg-sky-50 text-sky-600 border-sky-100',
          barColor: 'bg-sky-500',
          icon: <Star size={14} />
        };
    }
  };

  // Filtered lists
  const filteredTargets = targets.filter(target => {
    const isCompleted = target.metric === 'custom_milestone' 
      ? target.is_completed 
      : (target.target_value > 0 && target.actualProgress >= target.target_value);

    if (filterTab === 'active') return !isCompleted;
    if (filterTab === 'completed') return isCompleted;
    return true;
  });

  // Calculate statistics
  const totalTargetsCount = targets.length;
  const completedTargetsCount = targets.filter(target => {
    if (target.metric === 'custom_milestone') return target.is_completed;
    return target.target_value > 0 && target.actualProgress >= target.target_value;
  }).length;
  const activeTargetsCount = totalTargetsCount - completedTargetsCount;

  return (
    <StudentLayout>
      <div className="max-w-[1600px] mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-100">
              <Sparkles size={12} />
              Goal Planner & Habit Builder
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Spiritual Targets</h1>
            <p className="text-slate-500 font-medium max-w-lg">Set, monitor and achieve weekly and monthly targets to build a strong sadhana routine.</p>
          </div>

          <div className="flex items-center gap-3">
            {targets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowWelcomeTargets(true)}
                className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-slate-200 shadow-soft active:scale-95 flex items-center gap-2"
              >
                <Layers size={14} />
                Swipe Card View
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCreateTarget(true)}
              className="px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-primary-600/20 active:scale-95 flex items-center gap-2"
            >
              <Target size={14} />
              Create Target
            </button>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Target size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Active Goals</p>
                <p className="text-2xl font-black text-slate-900">{activeTargetsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Completed</p>
                <p className="text-2xl font-black text-slate-900">{completedTargetsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                <Award size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Set</p>
                <p className="text-2xl font-black text-slate-900">{totalTargetsCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-soft">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Success Rate</p>
                <p className="text-2xl font-black text-slate-900">
                  {totalTargetsCount > 0 ? Math.round((completedTargetsCount / totalTargetsCount) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls & Target List */}
        <div className="space-y-6">
          <div className="flex border-b border-slate-200/60 pb-px">
            <div className="flex gap-4">
              {[
                { id: 'active', label: 'Active Targets' },
                { id: 'completed', label: 'Completed' },
                { id: 'all', label: 'All Goals' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`pb-4 text-xs font-black uppercase tracking-wider relative transition-colors ${
                    filterTab === tab.id 
                      ? 'text-slate-900' 
                      : 'text-slate-400 hover:text-slate-650'
                  }`}
                >
                  {tab.label}
                  {filterTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full animate-in fade-in duration-300" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-450 gap-4">
              <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider">Syncing Targets...</p>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="h-64 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4 bg-white/50 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <Target size={28} className="opacity-20" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-lg text-slate-900 tracking-tight">No Goals Found</p>
                <p className="font-medium text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {filterTab === 'active' 
                    ? "Establish new spiritual milestones to enhance your sadhana." 
                    : "No completed goals in this section yet. Take it step-by-step!"}
                </p>
              </div>
              {filterTab === 'active' && (
                <button
                  type="button"
                  onClick={() => setShowCreateTarget(true)}
                  className="mt-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Set Your First Target
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop view: Table */}
              <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest">Goal Title</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest">Activity & Period</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest">Timeline</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest w-[280px]">Progress</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredTargets.map((target) => {
                        const isMilestone = target.metric === 'custom_milestone';
                        const total = target.target_value;
                        const actual = isMilestone 
                          ? (target.is_completed ? 1 : target.current_progress) 
                          : target.actualProgress;
                        
                        const percent = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0;
                        const theme = getMetricTheme(target.metric);
                        
                        const today = new Date();
                        const targetEnd = new Date(target.end_date.replace(/-/g, '/'));
                        const daysLeft = Math.max(0, differenceInDays(targetEnd, today) + 1);

                        return (
                          <tr key={target.id} className="hover:bg-slate-50/40 transition-colors group">
                            {/* Title */}
                            <td className="px-6 py-5">
                              <h4 className="font-extrabold text-sm text-slate-800 leading-tight">
                                {target.title}
                              </h4>
                              {target.description && (
                                <p className="text-xs font-semibold text-slate-400 italic mt-1 max-w-[320px] truncate">
                                  "{target.description}"
                                </p>
                              )}
                            </td>

                            {/* Activity & Period */}
                            <td className="px-6 py-5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${theme.bg}`}>
                                  {theme.icon}
                                  {getMetricLabel(target.metric)}
                                </span>
                                <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-wider border border-slate-200/30">
                                  {target.period_type}
                                </span>
                              </div>
                            </td>

                            {/* Timeline */}
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2 text-slate-550 text-xs font-semibold">
                                <Calendar size={12} className="text-slate-350" />
                                <span>
                                  {daysLeft > 0 ? `${daysLeft} days left` : 'Ends today'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 block mt-1">
                                {format(new Date(target.start_date.replace(/-/g, '/')), 'MMM d')} - {format(new Date(target.end_date.replace(/-/g, '/')), 'MMM d, yyyy')}
                              </span>
                            </td>

                            {/* Progress */}
                            <td className="px-6 py-5">
                              {isMilestone ? (
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleTargetComplete(target.id, !target.is_completed)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                      target.is_completed
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {target.is_completed ? 'Completed' : 'Mark Complete'}
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1.5 max-w-[240px]">
                                  <div className="flex justify-between text-[11px] font-bold text-slate-555">
                                    <span>
                                      {['reading_minutes', 'hearing_minutes', 'seva_minutes', 'exercise_minutes'].includes(target.metric)
                                        ? formatMinutes(actual)
                                        : `${actual} R`
                                      } / {['reading_minutes', 'hearing_minutes', 'seva_minutes', 'exercise_minutes'].includes(target.metric)
                                        ? formatMinutes(total)
                                        : `${total} R`
                                      }
                                    </span>
                                    <span className={`font-black ${percent >= 100 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                      {percent}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/30">
                                    <div
                                      className={`h-full ${theme.barColor} transition-all duration-700 ease-out`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteTarget(target.id)}
                                className="p-2 rounded-xl text-slate-350 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 inline-flex items-center justify-center"
                                title="Delete Target"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile view: Cards */}
              <div className="grid grid-cols-1 gap-6 md:hidden">
                {filteredTargets.map((target) => {
                  const isMilestone = target.metric === 'custom_milestone';
                  const total = target.target_value;
                  const actual = isMilestone 
                    ? (target.is_completed ? 1 : target.current_progress) 
                    : target.actualProgress;
                  
                  const percent = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0;
                  const theme = getMetricTheme(target.metric);
                  
                  const today = new Date();
                  const targetEnd = new Date(target.end_date.replace(/-/g, '/'));
                  const daysLeft = Math.max(0, differenceInDays(targetEnd, today) + 1);

                  return (
                    <div 
                      key={target.id} 
                      className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col justify-between shadow-soft hover:shadow-md transition-all relative group"
                    >
                      <div>
                        {/* Card Category & Period */}
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${theme.bg}`}>
                              {theme.icon}
                              {getMetricLabel(target.metric)}
                            </span>
                            <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-wider border border-slate-200/30">
                              {target.period_type}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTarget(target.id)}
                            className="p-2 rounded-xl text-slate-350 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100"
                            title="Delete Target"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Title & Description */}
                        <h4 className="font-extrabold text-base text-slate-800 tracking-tight leading-snug mb-1">
                          {target.title}
                        </h4>
                        {target.description && (
                          <p className="text-xs font-semibold text-slate-400 italic mb-4 leading-relaxed">
                            "{target.description}"
                          </p>
                        )}
                      </div>

                      {/* Progress Detail */}
                      <div className="space-y-3 mt-4 pt-4 border-t border-slate-50">
                        {isMilestone ? (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-slate-350" />
                              <span className="text-[10px] font-bold text-slate-400">
                                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Completes today'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleTargetComplete(target.id, !target.is_completed)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                target.is_completed
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {target.is_completed ? 'Completed' : 'Mark Complete'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <span className="text-slate-900 font-extrabold">
                                  {['reading_minutes', 'hearing_minutes', 'seva_minutes', 'exercise_minutes'].includes(target.metric)
                                    ? formatMinutes(actual)
                                    : `${actual} R`
                                  }
                                </span>
                                <span>done</span>
                              </span>
                              <span className="text-slate-400">
                                Target: {['reading_minutes', 'hearing_minutes', 'seva_minutes', 'exercise_minutes'].includes(target.metric)
                                  ? formatMinutes(total)
                                  : `${total} R`
                                }
                              </span>
                            </div>
                            
                            {/* Bar */}
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/30">
                              <div
                                className={`h-full ${theme.barColor} transition-all duration-700 ease-out`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-450 flex items-center gap-1">
                                <Calendar size={10} />
                                {daysLeft > 0 ? `${daysLeft}d left` : 'Ends today'}
                              </span>
                              <span className={`font-black uppercase tracking-wider ${percent >= 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {percent}% Complete
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        <TargetCreateModal
          isOpen={showCreateTarget}
          onClose={() => setShowCreateTarget(false)}
          onSave={handleSaveTarget}
        />

        <TargetWelcomeModal
          isOpen={showWelcomeTargets}
          onClose={() => setShowWelcomeTargets(false)}
          targets={targets}
          onToggleComplete={handleToggleTargetComplete}
        />
      </div>
    </StudentLayout>
  );
};
