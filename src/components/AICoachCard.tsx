import React, { useState, useEffect } from 'react';
import { generateSadhanaReport, saveSadhanaReport, type SADHANAReportResult } from '../lib/aiCoach';
import { Sparkles, CheckCircle2, TrendingUp, AlertTriangle, Compass, Target, Lightbulb, Copy, Save, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AICoachCardProps {
  userId: string;
}

export const AICoachCard: React.FC<AICoachCardProps> = ({ userId }) => {
  const [timeRangeDays, setTimeRangeDays] = useState<number>(7);
  const [report, setReport] = useState<SADHANAReportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  useEffect(() => {
    handleGenerateReport(false);
  }, [userId, timeRangeDays]);

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

  return (
    <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 shadow-xl border-slate-100/50 mb-10 overflow-hidden relative">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">AI Sadhna Coach</h2>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-mono font-bold rounded-full border border-indigo-100 uppercase">
                RAG V1
              </span>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-0.5">
              Personalized spiritual progress analysis grounded in center benchmarks
            </p>
          </div>
        </div>

        {/* Timeframe & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTimeRangeDays(7)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRangeDays === 7 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Weekly (7d)
            </button>
            <button
              onClick={() => setTimeRangeDays(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRangeDays === 30 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Monthly (30d)
            </button>
          </div>

          <button
            onClick={() => handleGenerateReport(true)}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Analyzing...' : 'Generate Report'}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 animate-pulse">
            Analyzing sadhana logs against center benchmarks...
          </p>
        </div>
      )}

      {/* Error View */}
      {errorMsg && !loading && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generated Report Display */}
      {report && !loading && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Metadata & Cache Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-600 font-mono text-[11px]">
              <Clock size={14} className="text-slate-400" />
              <span>Period: <strong>{report.timeRangeStart}</strong> to <strong>{report.timeRangeEnd}</strong></span>
            </div>

            {report.isCached && (
              <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Cached from last 24h</span>
              </span>
            )}
          </div>

          {/* 5 Structured Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. What's Going Well */}
            <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <CheckCircle2 size={16} />
                <span className="uppercase tracking-wider">What's Going Well</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                {report.sections.whatWentWell.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* 2. What Declined */}
            <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-xs">
                <TrendingUp size={16} className="rotate-180" />
                <span className="uppercase tracking-wider">What Declined / Needs Focus</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                {report.sections.whatDeclined.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* 3. Important Patterns */}
            <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                <Compass size={16} />
                <span className="uppercase tracking-wider">Important Patterns</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                {report.sections.importantPatterns.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* 4. Goal Performance */}
            <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-xs">
                <Target size={16} />
                <span className="uppercase tracking-wider">Goal Performance</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                {report.sections.goalPerformance.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

          </div>

          {/* 5. 2-3 Actionable Recommendations */}
          <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
              <Lightbulb size={16} />
              <span className="uppercase tracking-wider">2–3 Actionable Recommendations</span>
            </div>
            <ul className="text-xs text-slate-800 font-medium space-y-2 list-disc pl-4">
              {report.sections.recommendations.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Footer Controls: Save & Copy */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <span className="text-[11px] font-mono text-slate-400">
              Engine: <code className="text-indigo-600 font-bold">{report.modelUsed}</code>
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyReport}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Copy size={14} />
                <span>{copiedSuccess ? '✓ Copied!' : 'Copy Report'}</span>
              </button>

              <button
                onClick={handleSaveReport}
                disabled={saving || savedSuccess}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : savedSuccess ? '✓ Saved to History' : 'Save Report'}</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
