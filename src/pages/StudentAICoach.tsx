import { useEffect, useState } from 'react';
import { StudentLayout } from '../components/StudentLayout';
import { AICoachCard } from '../components/AICoachCard';
import { PersonalBenchmarksModal } from '../components/PersonalBenchmarksModal';
import { supabase } from '../lib/supabase';
import { Sparkles, Settings } from 'lucide-react';

export const StudentAICoach = () => {
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isPersonal, setIsPersonal] = useState(false);
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        const { data: prof } = await supabase
          .from('profiles')
          .select('bace_id, practice_type')
          .eq('id', user.id)
          .maybeSingle();
        if (prof?.practice_type === 'personal' || !prof?.bace_id) {
          setIsPersonal(true);
        }
      }
      setLoading(false);
    });
  }, []);

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto animate-fade-in pb-20 px-4 sm:px-0">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 animate-slide-up">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Sparkles size={22} />
              </div>
              <span>AI Sadhna Coach</span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-lg">
              {isPersonal 
                ? 'Personalized spiritual progress analysis grounded in your personal sadhana standards' 
                : 'Personalized spiritual progress analysis grounded in your center\'s benchmarks'}
            </p>
          </div>

          {isPersonal && (
            <button
              onClick={() => setIsStandardsModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 text-slate-800 hover:text-emerald-700 shadow-sm font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer hover:shadow-md"
            >
              <Settings size={16} className="text-emerald-600" />
              <span>My Personal Sadhana Standards</span>
            </button>
          )}
        </div>

        {/* AI Sadhna Coach Core Card */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-bold text-slate-500">Loading AI Sadhna Coach...</p>
          </div>
        ) : (
          userId && <AICoachCard key={refreshKey} userId={userId} />
        )}

        {/* Modal for setting Personal Standards */}
        {userId && (
          <PersonalBenchmarksModal
            userId={userId}
            isOpen={isStandardsModalOpen}
            onClose={() => setIsStandardsModalOpen(false)}
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        )}

      </div>
    </StudentLayout>
  );
};
