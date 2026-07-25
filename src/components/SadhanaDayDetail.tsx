import {
  Clock,
  BookOpen,
  Headphones,
  Sunrise,
  Moon,
  MessageSquare,
  Hammer,
  Check,
  Calendar,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { SadhanaEntry } from '../types/index';

const formatTime = (timeStr: string | null | undefined) => {
  if (!timeStr) return '—';
  try {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'hh:mm a');
  } catch {
    return timeStr;
  }
};

interface SadhanaDayDetailProps {
  entry: SadhanaEntry | null;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Stack layout for dashboard side panel (avoids cramped 4-col grid) */
  embedded?: boolean;
}

export const SadhanaDayDetail = ({
  entry,
  emptyTitle = 'No Entry',
  emptyDescription = 'No sadhana entry was recorded for this date.',
  embedded = false,
}: SadhanaDayDetailProps) => {
  if (!entry) {
    return (
      <div className="h-full min-h-[280px] rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white/50 p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-[1.5rem] flex items-center justify-center">
          <Calendar size={28} className="opacity-20" />
        </div>
        <div className="space-y-1">
          <p className="font-black text-lg text-slate-900 tracking-tight">{emptyTitle}</p>
          <p className="font-medium text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0 overflow-hidden">
      <div className="bg-white/60 backdrop-blur-xl p-3 rounded-[1.5rem] border border-white shadow-sm flex items-center gap-3 px-4">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${entry.status === 'submitted' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <div className="min-w-0">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest truncate">
            {entry.status === 'submitted' ? 'Entry Finalized' : 'Draft Progress'}
          </h4>
          <p className="text-[10px] font-bold text-slate-400 italic truncate">
            {format(parseISO(entry.date), 'EEEE, do MMMM')}
          </p>
        </div>
      </div>

      <div
        className={
          embedded
            ? 'grid grid-cols-1 gap-4 min-w-0'
            : 'grid grid-cols-1 lg:grid-cols-4 gap-4 min-w-0'
        }
      >
        <div
          className={`bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex flex-col justify-between min-h-[160px] ${
            embedded ? '' : 'lg:col-span-2'
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-20 h-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: Math.min(entry.rounds_completed, 16) },
                      { value: Math.max(16 - entry.rounds_completed, 0) },
                    ]}
                    innerRadius={28}
                    outerRadius={38}
                    paddingAngle={0}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#4F46E5" />
                    <Cell fill="#EEF2FF" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                  <Check size={16} className="font-black" />
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">
                      {Math.min(entry.rounds_completed, 16)}
                    </span>
                    <span className="text-base font-bold text-slate-300">/16</span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">Rounds</p>
                </div>
                {entry.rounds_completed > 16 && (
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black text-amber-600">+{entry.rounds_completed - 16}</span>
                    <p className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest">Extra</p>
                  </div>
                )}
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest mt-2 ${
                  entry.rounds_completed >= 16
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-orange-50 text-orange-600 border border-orange-100'
                }`}
              >
                {entry.rounds_completed >= 16 ? 'Completed' : 'In Progress'}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100/50 max-w-full">
              <Clock size={11} className="shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-widest truncate">
                {entry.rounds_completed_by
                  ? `Finished at ${formatTime(entry.rounds_completed_by)}`
                  : 'Time not logged'}
              </span>
            </div>
            {entry.rounds_description && (
              <div className="flex items-center text-blue-600 bg-blue-50/60 px-2.5 py-1 rounded-full border border-blue-100/60 max-w-full min-w-0">
                <span className="text-[9px] font-bold italic truncate">{entry.rounds_description}</span>
              </div>
            )}
          </div>
        </div>

        <div className={embedded ? 'grid grid-cols-2 gap-4' : 'contents'}>
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
              <Sunrise size={22} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wake Up</p>
            <p className="text-lg font-black text-slate-900">{formatTime(entry.wakeup_time)}</p>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
              <Moon size={22} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sleep</p>
            <p className="text-lg font-black text-slate-900">{formatTime(entry.sleep_time)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-sm rounded-[1.5rem] border border-white p-3 shadow-sm min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1 h-5 bg-slate-200 rounded-full shrink-0" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Attendance Status</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Mangal Arti', value: entry.mangal_arti },
              { label: 'Tulasi Arti', value: entry.tulasi_arti },
              { label: 'Morning Japa', value: entry.morning_japa },
              { label: 'Morning Hearing', value: entry.morning_hearing },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border min-w-0 ${
                  item.value
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-slate-50/50 border-slate-100/50 text-slate-400'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    item.value ? 'bg-emerald-500 text-white' : 'bg-slate-200'
                  }`}
                >
                  {item.value ? <Check size={10} strokeWidth={4} /> : <div className="w-1 h-1 bg-current rounded-full" />}
                </div>
                <span className="text-[10px] font-black tracking-tight truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        {entry.morning_comment && (
          <div className="w-full mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 px-2">
            <MessageSquare className="text-rose-400 shrink-0 mt-0.5" size={12} />
            <p className="text-xs font-bold text-slate-600 leading-relaxed italic break-words">
              &quot;{entry.morning_comment}&quot;
            </p>
          </div>
        )}
      </div>

      <div className={`grid gap-4 min-w-0 ${embedded ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="bg-white rounded-[2rem] border border-slate-100 p-4 hover:shadow-md transition-shadow min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 shrink-0">
              <Headphones size={20} />
            </div>
            <div className="text-right min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hearing</p>
              <p className="text-xl font-black text-slate-900">{entry.hearing_minutes || 0}m</p>
            </div>
          </div>
          {(entry.hearing_done || entry.hearing_minutes > 0) && (
            <div className="mt-3 pt-2 border-t border-slate-50 space-y-1">
              <p className="text-xs font-black text-slate-800 truncate">{entry.hearing_speaker || 'Unknown Speaker'}</p>
              <p className="text-[10px] font-bold text-slate-400 italic truncate">{entry.hearing_title || 'General Lecture'}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 p-4 hover:shadow-md transition-shadow min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="text-right min-w-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reading</p>
              <p className="text-xl font-black text-slate-900">{entry.reading_minutes || 0}m</p>
            </div>
          </div>
          {(entry.reading_done || entry.reading_minutes > 0) && (
            <div className="mt-3 pt-2 border-t border-slate-50 flex flex-wrap items-center gap-2">
              <p className="text-xs font-black text-slate-800 truncate">{entry.reading_book || 'Unknown Book'}</p>
              <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase border border-emerald-100/50 shrink-0">
                Sloka {entry.reading_sloka || '—'}
              </span>
            </div>
          )}
        </div>

        <div
          className={`rounded-[2rem] border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0 ${
            embedded ? 'md:col-span-2' : ''
          } ${
            (entry.seva_performed || entry.seva_done) ? 'bg-amber-50/50 border-amber-100' : 'bg-white border-slate-100'
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                (entry.seva_performed || entry.seva_done) ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'
              }`}
            >
              <Hammer size={24} />
            </div>
            <div className="min-w-0">
              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Daily Seva</h5>
              <p className={`text-base font-semibold tracking-tight ${(entry.seva_performed || entry.seva_done) ? 'text-slate-700' : 'text-slate-300'}`}>
                {(entry.seva_performed || entry.seva_done) ? 'Service Completed' : 'No Service Logged'}
              </p>
              {(entry.seva_performed || entry.seva_done) && entry.seva_topic && (
                <p className="text-xs font-semibold text-amber-900/80 italic mt-1 break-words">&quot;{entry.seva_topic}&quot;</p>
              )}
            </div>
          </div>
          {(entry.seva_performed || entry.seva_done) && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-amber-600">{entry.seva_minutes}m</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
