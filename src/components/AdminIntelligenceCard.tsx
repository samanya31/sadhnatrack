import React, { useState } from 'react';
import { analyzeBaceStudentsHealth, type BaceHealthAnalysis } from '../lib/adminIntelligence';
import { ShieldAlert, AlertTriangle, CheckCircle2, MessageSquare, Sparkles, RefreshCw, X, Play } from 'lucide-react';

interface AdminIntelligenceCardProps {
  baceId?: string | null;
}

export const AdminIntelligenceCard: React.FC<AdminIntelligenceCardProps> = ({ baceId }) => {
  const [analysis, setAnalysis] = useState<BaceHealthAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'inactive' | 'declining' | 'leaders'>('inactive');

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const data = await analyzeBaceStudentsHealth(baceId);
      setAnalysis(data);
    } catch (err) {
      console.error('Error fetching admin intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial On-Demand Banner (Only generates when Admin clicks button!)
  if (!analysis && !loading) {
    return (
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl border-slate-100/50 mb-10 bg-gradient-to-r from-indigo-50/50 via-white to-blue-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Smart Mentoring Intelligence</h2>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-mono font-bold rounded-full uppercase">
                On-Demand Analysis
              </span>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-1 max-w-xl">
              Detect inactive loggers, Sadhana At Risk trends, and consistency leaders evaluated dynamically against your center's configured benchmarks.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalysis}
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 shrink-0 cursor-pointer hover:scale-105"
        >
          <Play size={16} className="fill-current" />
          <span>✨ Generate Center Insights</span>
        </button>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="glass-card rounded-[2.5rem] p-8 shadow-xl border-slate-100/50 mb-10 text-center py-12">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-bold text-slate-500">Evaluating BACE students against center benchmarks...</p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl border-slate-100/50 mb-10 animate-fade-in relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Smart Mentoring Intelligence</h2>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold rounded-full border border-emerald-200 uppercase">
                Generated On-Demand
              </span>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              Automated student risk classification evaluated dynamically against center benchmarks
            </p>
          </div>
        </div>

        {/* Center Health Score Indicator & Close/Refresh Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Center Health Score</span>
              <span className="text-xl font-black text-indigo-600">{analysis.centerHealthScore}%</span>
            </div>
            <button
              onClick={fetchAnalysis}
              className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-white transition-colors cursor-pointer"
              title="Re-analyze Insights"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <button
            onClick={() => setAnalysis(null)}
            className="p-2.5 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close Insights Panel"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Metric Risk Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        
        {/* Inactive Tab Button */}
        <button
          onClick={() => setActiveTab('inactive')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
            activeTab === 'inactive'
              ? 'bg-red-50/70 border-red-200 ring-2 ring-red-500/20'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold">
              <ShieldAlert size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono text-red-600 font-bold uppercase block">Inactive</span>
              <span className="text-base font-black text-slate-900">{analysis.inactiveStudents.length} Students</span>
            </div>
          </div>
        </button>

        {/* Declining Tab Button */}
        <button
          onClick={() => setActiveTab('declining')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
            activeTab === 'declining'
              ? 'bg-amber-50/70 border-amber-200 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono text-amber-600 font-bold uppercase block">Sadhana At Risk</span>
              <span className="text-base font-black text-slate-900">{analysis.decliningStudents.length} Students</span>
            </div>
          </div>
        </button>

        {/* Leaders Tab Button */}
        <button
          onClick={() => setActiveTab('leaders')}
          className={`p-4 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
            activeTab === 'leaders'
              ? 'bg-emerald-50/70 border-emerald-200 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-100 hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase block">Consistency Leaders</span>
              <span className="text-base font-black text-slate-900">{analysis.topPerformers.length} Students</span>
            </div>
          </div>
        </button>

      </div>

      {/* Tab Details Display */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 min-h-[160px]">
        
        {/* INACTIVE STUDENTS */}
        {activeTab === 'inactive' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider">
              🚨 Inactive Students (Missing logs for 3+ days)
            </h3>

            {analysis.inactiveStudents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 font-medium">✨ Great job! All students are actively logging daily sadhana.</p>
            ) : (
              <div className="space-y-2.5">
                {analysis.inactiveStudents.map((st) => (
                  <div key={st.studentId} className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{st.fullName}</h4>
                      <p className="text-[11px] text-slate-500">{st.reason} (Last logged: {st.lastLoggedDate})</p>
                    </div>

                    {st.whatsappMessage && (
                      <a
                        href={st.whatsappMessage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <MessageSquare size={13} />
                        <span>Send WhatsApp</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DECLINING STUDENTS */}
        {activeTab === 'declining' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              📉 Sadhana At Risk (Deviations from center benchmarks)
            </h3>

            {analysis.decliningStudents.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 font-medium">✨ No students showing declining sadhana trends!</p>
            ) : (
              <div className="space-y-2.5">
                {analysis.decliningStudents.map((st) => (
                  <div key={st.studentId} className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{st.fullName}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{st.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONSISTENCY LEADERS */}
        {activeTab === 'leaders' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              🌟 Consistency Leaders (&gt;90% compliance)
            </h3>

            {analysis.topPerformers.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 font-medium">Log entries accumulating... Leaders will appear here!</p>
            ) : (
              <div className="space-y-2.5">
                {analysis.topPerformers.map((st) => (
                  <div key={st.studentId} className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{st.fullName}</h4>
                      <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{st.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
