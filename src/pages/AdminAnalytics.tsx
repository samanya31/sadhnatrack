import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import {
  Calendar,
  ChevronDown,
  Users,
  CheckCircle2,
  Target,
  Info,
  Flame,
  CalendarDays,
  BarChart2,
  ArrowDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { fetchProductAnalytics, defaultAnalyticsData, type AnalyticsSummary } from '../lib/analyticsService';
import { supabase } from '../lib/supabase';

// Mini Sparkline Component for Top KPI Cards
const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const chartData = data.map((val, idx) => ({ idx, val }));
  return (
    <div className="w-full h-8 mt-2">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const AdminAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary>(defaultAnalyticsData);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'live' | 'demo'>('live');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [centers, setCenters] = useState<Array<{ id: string; name: string }>>([]);
  const [dateRange] = useState('Oct 1, 2026 – Oct 15, 2026');
  const [showCenterMenu, setShowCenterMenu] = useState(false);

  useEffect(() => {
    loadCenters();
    loadAnalytics();
  }, [selectedCenter, mode]);

  const loadCenters = async () => {
    try {
      const { data: baces } = await supabase.from('baces').select('id, name').order('name');
      if (baces) {
        setCenters(baces);
      }
    } catch (err) {
      console.warn('Error loading centers:', err);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetchProductAnalytics(selectedCenter, mode);
      setData(res);
    } catch (err) {
      console.error('Failed to load product analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHeatmapColor = (val: number | null) => {
    if (val === null) return 'bg-slate-50 text-slate-300';
    if (val >= 65) return 'bg-emerald-100/80 text-emerald-900 font-black';
    if (val >= 45) return 'bg-emerald-50 text-emerald-800 font-bold';
    if (val >= 30) return 'bg-emerald-50/50 text-emerald-700 font-semibold';
    return 'bg-amber-50 text-amber-800 font-semibold';
  };

  return (
    <AdminLayout>
      <div className={`space-y-6 pb-12 animate-fade-in font-sans transition-opacity duration-300 ${loading ? 'opacity-80' : 'opacity-100'}`}>
        
        {/* =========================================================================
            TOP HEADER & FILTERS BAR
        ========================================================================= */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Product Analytics Dashboard
              </h1>
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
                  mode === 'live'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <span>{mode === 'live' ? '🟢' : '📊'}</span>
                {mode === 'live'
                  ? 'Live Production Telemetry (Real Supabase Records)'
                  : 'Demo Showcase Mode (234 Users Design Baseline)'}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Track</span>
              <span className="text-slate-300">→</span>
              <span>Understand</span>
              <span className="text-slate-300">→</span>
              <span className="text-emerald-600 font-bold">Improve</span>
              <span>🍃</span>
            </p>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live DB vs Demo Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
              <button
                onClick={() => setMode('live')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'live'
                    ? 'bg-white text-emerald-800 shadow-xs font-black ring-1 ring-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Calculate 100% real metrics from Supabase database"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    mode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                  }`}
                ></span>
                <span>Live DB</span>
              </button>
              <button
                onClick={() => setMode('demo')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  mode === 'demo'
                    ? 'bg-white text-blue-700 shadow-xs font-black ring-1 ring-blue-500/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Show 234-user demo showcase dataset from mockup"
              >
                <span>📊 Demo</span>
              </button>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-xs cursor-pointer hover:border-slate-300 transition-colors">
              <Calendar size={15} className="text-slate-400" />
              <span>{dateRange}</span>
            </div>

            {/* Center Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCenterMenu(!showCenterMenu)}
                className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span>
                  {selectedCenter === 'all'
                    ? 'All Centers'
                    : centers.find((c) => c.id === selectedCenter)?.name || 'Center'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showCenterMenu && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-1.5 z-30 animate-scale-up">
                  <button
                    onClick={() => {
                      setSelectedCenter('all');
                      setShowCenterMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      selectedCenter === 'all' ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All Centers
                  </button>
                  {centers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCenter(c.id);
                        setShowCenterMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer truncate ${
                        selectedCenter === c.id ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Total Users Stat Badge */}
            <div className="flex items-center gap-3 pl-3 pr-4 py-1.5 bg-blue-50/60 border border-blue-100 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
                <Users size={16} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-slate-500">Total Users</span>
                  <span className="text-base font-black text-slate-900 leading-none">{data.totalUsers}</span>
                  <span className="text-[10px] font-black text-emerald-600 flex items-center leading-none">
                    ↑ {data.totalUsersGrowth}%
                  </span>
                </div>
                <span className="text-[9px] font-medium text-slate-400 leading-none mt-0.5">vs. previous 15 days</span>
              </div>
            </div>

            {/* Profile Avatar */}
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-sm ring-2 ring-white">
              SB
            </div>
          </div>
        </div>

        {/* =========================================================================
            ROW 1: TOP 5 KPI CARDS WITH SPARKLINES
        ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* 1. DAU */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Daily Active Users (DAU)</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{data.dau}</span>
                <span className="text-xs font-black text-emerald-600 flex items-center">
                  ↑ {data.dauGrowth}%
                </span>
              </div>
            </div>
            <MiniSparkline data={data.sparklines.dau} color="#10B981" />
          </div>

          {/* 2. WAU */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Weekly Active Users (WAU)</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{data.wau}</span>
                <span className="text-xs font-black text-emerald-600 flex items-center">
                  ↑ {data.wauGrowth}%
                </span>
              </div>
            </div>
            <MiniSparkline data={data.sparklines.wau} color="#3B82F6" />
          </div>

          {/* 3. MAU */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Monthly Active Users (MAU)</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{data.mau}</span>
                <span className="text-xs font-black text-emerald-600 flex items-center">
                  ↑ {data.mauGrowth}%
                </span>
              </div>
            </div>
            <MiniSparkline data={data.sparklines.mau} color="#8B5CF6" />
          </div>

          {/* 4. Daily Log Completion Rate */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Daily Log Completion Rate</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{data.logCompletionRate}%</span>
                <span className="text-xs font-black text-emerald-600 flex items-center">
                  ↑ {data.logCompletionGrowth}%
                </span>
              </div>
            </div>
            <MiniSparkline data={data.sparklines.completion} color="#10B981" />
          </div>

          {/* 5. Activation Rate */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                  <span>Activation Rate</span>
                  <Info size={12} className="text-slate-400" />
                </div>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Target size={14} />
                </div>
              </div>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">{data.activationRate}%</span>
                <span className="text-xs font-black text-emerald-600 flex items-center">
                  ↑ {data.activationGrowth}%
                </span>
              </div>
            </div>
            <MiniSparkline data={data.sparklines.activation} color="#A855F7" />
          </div>

        </div>

        {/* =========================================================================
            ROW 2: USER GROWTH, ACTIVATION FUNNEL, RETENTION COHORTS
        ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. User Growth Bar Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <span>User Growth</span>
                <Info size={14} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]"></span>
                  <span className="text-slate-500">New Users</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                  <span className="text-slate-500">Total Users</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={data.userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="newUsers" fill="#60A5FA" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalUsers" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Activation Funnel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <span>Activation Funnel</span>
                <Info size={14} className="text-slate-400" />
              </div>
              <span className="text-xs font-bold text-slate-500">
                Conversion Rate: <span className="font-black text-slate-900">{data.funnelConversionRate}%</span>
              </span>
            </div>

            {/* Custom Tapered Funnel Stages */}
            <div className="space-y-2.5 flex-1 flex flex-col justify-center">
              {data.activationFunnel.map((step, idx) => {
                // Width tapering: 100%, 88%, 76%, 66%
                const widthPercent = [100, 88, 76, 66][idx] || 60;
                return (
                  <div key={step.stage} className="flex flex-col items-center">
                    <div
                      style={{ width: `${widthPercent}%`, backgroundColor: step.color }}
                      className="py-3 px-4 rounded-xl text-center shadow-xs text-white transition-all hover:scale-[1.01]"
                    >
                      <div className="text-base font-black leading-tight">{step.count}</div>
                      <div className="text-[10px] font-bold opacity-90 leading-tight mt-0.5">
                        {step.stage}
                      </div>
                      <div className="text-[9px] font-semibold opacity-80 mt-0.5">
                        {step.percentage}%
                      </div>
                    </div>
                    {idx < data.activationFunnel.length - 1 && (
                      <ArrowDown size={14} className="text-slate-300 my-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Retention Cohorts Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <span>Retention Cohorts</span>
                <Info size={14} className="text-slate-400" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-2.5 font-bold">Cohort</th>
                    <th className="pb-2.5 text-center font-bold">D1</th>
                    <th className="pb-2.5 text-center font-bold">D7</th>
                    <th className="pb-2.5 text-center font-bold">D30</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.retentionCohorts.map((row) => (
                    <tr key={row.cohort} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-700">{row.cohort}</td>
                      <td className="py-1.5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg ${getHeatmapColor(row.d1)}`}>
                          {row.d1 !== null ? `${row.d1}%` : '–'}
                        </span>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg ${getHeatmapColor(row.d7)}`}>
                          {row.d7 !== null ? `${row.d7}%` : '–'}
                        </span>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg ${getHeatmapColor(row.d30)}`}>
                          {row.d30 !== null ? `${row.d30}%` : '–'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* =========================================================================
            ROW 3: DAILY LOGGING TREND, REMINDER EFFECTIVENESS, CENTER ENGAGEMENT
        ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 1. Daily Logging Trend */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <span>Daily Logging Trend</span>
                <Info size={14} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-slate-400"></span>
                  <span className="text-slate-400">Expected Logs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                  <span className="text-slate-700">Actual Logs</span>
                </div>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={data.dailyLoggingTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expectedLogs"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 2, fill: '#94A3B8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualLogs"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563EB' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Reminder Effectiveness */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <span>Reminder Effectiveness</span>
                <Info size={14} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]"></span>
                  <span className="text-slate-500">10 PM Reminder</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA]"></span>
                  <span className="text-slate-500">12 AM Reminder</span>
                </div>
              </div>
            </div>

            {/* Custom Bar Comparison */}
            <div className="flex-1 flex items-end justify-center gap-10 pb-4 pt-6">
              {data.reminderEffectiveness.map((rem) => (
                <div key={rem.name} className="flex flex-col items-center">
                  <span className="text-sm font-black text-slate-800 mb-2">{rem.rate}%</span>
                  <div
                    style={{ height: `${rem.rate * 2.2}px`, backgroundColor: rem.color }}
                    className="w-20 rounded-2xl shadow-sm transition-all hover:opacity-90"
                  />
                  <span className="text-[10px] font-bold text-slate-500 mt-3 text-center max-w-[90px] leading-tight">
                    Log Completion Rate ({rem.name.replace(' Reminder', '')})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Center-wise Engagement Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <span>Center-wise Engagement</span>
                <Info size={14} className="text-slate-400" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="pb-2 font-bold">Center</th>
                    <th className="pb-2 text-center font-bold">Users</th>
                    <th className="pb-2 text-center font-bold">DAU</th>
                    <th className="pb-2 text-center font-bold">Log Completion</th>
                    <th className="pb-2 text-center font-bold">7-day Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.centerEngagement.map((c) => (
                    <tr key={c.center} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 font-bold text-slate-800">{c.center}</td>
                      <td className="py-2.5 text-center font-semibold text-slate-600">{c.users}</td>
                      <td className="py-2.5 text-center font-semibold text-slate-600">{c.dau}</td>
                      <td className="py-1.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            c.logCompletion >= 60
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100/70 text-amber-800'
                          }`}
                        >
                          {c.logCompletion}%
                        </span>
                      </td>
                      <td className="py-1.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            c.retention7d >= 45
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100/70 text-amber-800'
                          }`}
                        >
                          {c.retention7d}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* =========================================================================
            ROW 4: TOP SADHANA ACTIVITIES, STREAKS & HABITS, KEY INSIGHTS
        ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 1. Top Sadhana Activities Logged */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <span>Top Sadhana Activities Logged</span>
                <Info size={14} className="text-slate-400" />
              </div>
            </div>

            <div className="space-y-4 my-auto">
              {data.topActivities.map((act) => (
                <div key={act.name} className="flex items-center gap-3">
                  <span className="w-16 text-xs font-bold text-slate-600">{act.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      style={{ width: `${act.percentage}%`, backgroundColor: act.color }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-black text-slate-700">{act.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Streaks & Habit Formation */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <span>Streaks & Habit Formation</span>
                <Info size={14} className="text-slate-400" />
              </div>
            </div>

            {/* 2x2 Metric Cards Grid */}
            <div className="grid grid-cols-2 gap-3 my-auto">
              
              {/* 7+ Day Streaks */}
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Flame size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">7+ Day Streaks</div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-900">{data.streaks.sevenDayPlus}</span>
                    <span className="text-[10px] font-black text-emerald-600">↑ {data.streaks.sevenDayPlusGrowth}%</span>
                  </div>
                </div>
              </div>

              {/* Avg Logging Days/Week */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg. Logging Days/Week</div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-900">{data.streaks.avgLoggingDays}</span>
                    <span className="text-[10px] font-black text-emerald-600">↑ {data.streaks.avgLoggingDaysGrowth}</span>
                  </div>
                </div>
              </div>

              {/* Longest Streak */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longest Streak</div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-900">{data.streaks.longestStreakDays} days</span>
                  </div>
                </div>
              </div>

              {/* Users with Goals */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Users with Goals</div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-900">{data.streaks.usersWithGoals}</span>
                    <span className="text-[10px] font-black text-emerald-600">↑ {data.streaks.usersWithGoalsGrowth}%</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3. Key Insights & Recommendations */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-amber-500 font-bold text-lg">💡</span>
              <span className="text-sm font-black text-slate-900 tracking-tight">Key Insights & Recommendations</span>
            </div>

            <div className="space-y-2.5 my-auto">
              {data.insights.map((insight, idx) => {
                const badgeColors = [
                  'bg-blue-600 text-white',
                  'bg-blue-600 text-white',
                  'bg-emerald-600 text-white',
                  'bg-amber-500 text-white',
                  'bg-slate-400 text-white',
                ];
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                        badgeColors[idx] || 'bg-slate-400 text-white'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">{insight}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
};
export default AdminAnalytics;
