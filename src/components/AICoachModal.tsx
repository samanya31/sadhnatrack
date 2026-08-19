import React, { useState, useEffect } from 'react';
import { generateSadhanaReport, saveSadhanaReport, checkCachedSadhanaReport, type SADHANAReportResult } from '../lib/aiCoach';
import { Sparkles, CheckCircle2, TrendingUp, AlertTriangle, Compass, Target, Lightbulb, Copy, Save, RefreshCw, Clock, X, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AICoachModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AICoachModal: React.FC<AICoachModalProps> = ({ userId, isOpen, onClose }) => {
  const [timeRangeDays, setTimeRangeDays] = useState<number>(7);
  const [report, setReport] = useState<SADHANAReportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check 24h cache when modal opens or timeRangeDays changes (0 API Calls!)
  useEffect(() => {
    if (isOpen && userId) {
      loadCachedReport();
    }
  }, [isOpen, userId, timeRangeDays]);

  const loadCachedReport = async () => {
    setErrorMsg(null);
    const reportType = timeRangeDays > 14 ? 'monthly' : 'weekly';
    const cached = await checkCachedSadhanaReport(userId, reportType);
    if (cached) {
      setReport(cached);
    } else {
      setReport(null);
    }
  };

  // Explicit On-Demand Report Generation (Only triggered on user click!)
  const handleGenerateReport = async (forceRefresh: boolean = false) => {
    setLoading(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const res = await generateSadhanaReport(userId, timeRangeDays, forceRefresh);
      setReport(res);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setErrorMsg(err.message || 'Unable to generate Sadhana report.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('bace_id')
        .eq('id', userId)
        .single();

      await saveSadhanaReport(userId, profile?.bace_id || null, report);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Report saved or already recorded!');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const textToCopy = `
🤖 AI SADHNA COACH REPORT (${report.reportType.toUpperCase()})
Period: ${report.timeRangeStart} to ${report.timeRangeEnd}

🌟 WHAT'S GOING WELL:
${report.sections.whatWentWell.map((s) => `• ${s}`).join('\n')}

📉 WHAT DECLINED:
${report.sections.whatDeclined.map((s) => `• ${s}`).join('\n')}

🔍 IMPORTANT PATTERNS:
${report.sections.importantPatterns.map((s) => `• ${s}`).join('\n')}

🎯 GOAL PERFORMANCE:
${report.sections.goalPerformance.map((s) => `• ${s}`).join('\n')}

💡 RECOMMENDATIONS:
${report.sections.recommendations.map((s) => `• ${s}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col p-6 sm:p-8 relative overflow-hidden">
        
        {/* Sticky Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 shrink-0 bg-white z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">AI Sadhna Coach</h2>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold rounded-full border border-indigo-100 uppercase">
                  RAG V1
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Personalized RAG analytics grounded in your center's benchmarks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Timeframe selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setTimeRangeDays(7)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRangeDays === 7
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Weekly (7d)
              </button>
              <button
                onClick={() => setTimeRangeDays(30)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRangeDays === 30
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Monthly (30d)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 min-h-0 pr-1">
          
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Synthesizing Sadhana Snapshot...</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Evaluating logs against center benchmarks & generating defensible guidance
                </p>
              </div>
            </div>
          )}

          {/* INITIAL STATE (No report generated yet & not cached) */}
          {!loading && !report && (
            <div className="py-10 text-center space-y-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 rounded-3xl p-8 border border-indigo-100/60">
              <div className="w-16 h-16 bg-white text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-md border border-indigo-100">
                <Sparkles size={32} />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-black text-slate-900">Generate Your Spiritual Sadhana Report</h3>
                <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                  Analyze your recent wake-up times, Japa speed, and scripture studies evaluated grounded in your center's configured benchmarks.
                </p>
              </div>
              <button
                onClick={() => handleGenerateReport(true)}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-extrabold transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 mx-auto cursor-pointer hover:scale-105"
              >
                <Play size={16} className="fill-current" />
                <span>✨ Generate My Sadhana Report</span>
              </button>
            </div>
          )}

          {/* REPORT DISPLAY */}
          {!loading && report && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Cache Indicator & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-500 font-bold">
                    {report.timeRangeStart} to {report.timeRangeEnd}
                  </span>
                  {report.isCached && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <Clock size={11} /> 24h Cached (0 API Cost)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateReport(true)}
                    className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                    title="Regenerate Report"
                  >
                    <RefreshCw size={14} />
                    <span>Re-analyze</span>
                  </button>

                  <button
                    onClick={handleCopyReport}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Copy size={13} />
                    <span>{copiedSuccess ? '✓ Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleSaveReport}
                    disabled={saving || savedSuccess}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {savedSuccess ? <CheckCircle2 size={13} /> : <Save size={13} />}
                    <span>{saving ? 'Saving...' : savedSuccess ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              </div>

              {/* 5 REPORT SECTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. What's Going Well */}
                <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>What's Going Well</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 font-medium">
                    {report.sections.whatWentWell.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. What Declined */}
                <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100/80 space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
                    <TrendingUp size={16} className="text-amber-600" />
                    <span>What Declined</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 font-medium">
                    {report.sections.whatDeclined.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* 3. Important Patterns & 4. Goal Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Patterns */}
                <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100/80 space-y-3">
                  <div className="flex items-center gap-2 text-blue-800 font-extrabold text-xs uppercase tracking-wider">
                    <Compass size={16} className="text-blue-600" />
                    <span>Important Patterns</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 font-medium">
                    {report.sections.importantPatterns.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-500 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Goals */}
                <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100/80 space-y-3">
                  <div className="flex items-center gap-2 text-purple-800 font-extrabold text-xs uppercase tracking-wider">
                    <Target size={16} className="text-purple-600" />
                    <span>Goal Performance</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 font-medium">
                    {report.sections.goalPerformance.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-purple-500 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* 5. 2-3 Recommendations */}
              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider">
                  <Lightbulb size={16} className="text-indigo-600" />
                  <span>2–3 Recommendations</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 font-medium">
                  {report.sections.recommendations.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-600 font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
