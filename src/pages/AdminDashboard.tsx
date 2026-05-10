import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { type SadhanaEntry } from '../types/index';
import { 
  Search, 
  Calendar,
  ChevronRight,
  Clock,
  UserPlus,
  Loader2,
  X,
  ArrowLeft,
  BookOpen,
  Headphones,
  RotateCcw,
  Moon,
  Bookmark,
  CalendarDays,
  Hammer,
  FileSpreadsheet,
  User
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'students'>('logs');
  const [entries, setEntries] = useState<SadhanaEntry[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [regData, setRegData] = useState({ email: '', password: '', fullName: '' });
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    fetchEntries();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('full_name');
    setProfiles(data || []);
  };

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('sadhana_entries')
        .select(`
          *,
          user:profiles(full_name, email)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '—';
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'hh:mm a');
    } catch (e) {
      return timeStr;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: regData.email,
        password: regData.password,
        options: {
          data: { full_name: regData.fullName }
        }
      });
      if (error) throw error;
      alert('Student registered!');
      setIsModalOpen(false);
      setRegData({ email: '', password: '', fullName: '' });
      fetchProfiles();
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const exportToExcel = (studentId: string, studentName: string) => {
    const studentData = entries.filter(e => e.user_id === studentId);
    const headers = [
      "Date", "Wake-up Time", "Sleep Time", 
      "Japa Rounds", "Japa Finished By", 
      "Hearing (Mins)", "Hearing Speaker", "Hearing Topic",
      "Reading (Mins)", "Reading Book", "Reading Sloka",
      "Sewa (Mins)", "Sewa Details"
    ];

    const rows = studentData.map(e => [
      e.date,
      formatTime(e.wakeup_time),
      formatTime(e.sleep_time),
      e.rounds_completed,
      formatTime(e.rounds_completed_by),
      e.hearing_minutes,
      e.hearing_speaker || "",
      e.hearing_title || "",
      e.reading_minutes,
      e.reading_book || "",
      e.reading_sloka || "",
      e.seva_minutes || 0,
      e.seva_topic || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Sadhana_${studentName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEntries = entries.filter(entry => 
    entry.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const studentEntries = selectedStudent 
    ? entries.filter(e => e.user_id === selectedStudent)
    : [];

  const selectedDateEntry = studentEntries.find(e => e.date === filterDate);
  const selectedProfile = profiles.find(p => p.id === selectedStudent);

  if (selectedStudent) {
    return (
      <Layout userRole="admin">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-2 text-slate-500 hover:text-primary-600 font-bold group">
              <div className="p-2 rounded-full group-hover:bg-primary-50 transition-colors">
                <ArrowLeft size={20} />
              </div>
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 w-full sm:w-auto">
              <CalendarDays className="text-primary-500" size={20} />
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent border-none outline-none font-bold text-slate-700 w-full cursor-pointer" />
            </div>
          </div>

          <div className="glass-card p-6 md:p-10 rounded-[2.5rem] border-none shadow-2xl bg-gradient-to-br from-white to-primary-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary-600 text-white rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl">
                  {selectedProfile?.full_name?.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">{selectedProfile?.full_name}</h1>
                  <p className="text-slate-500 font-medium">{selectedProfile?.email}</p>
                </div>
              </div>
              <button onClick={() => exportToExcel(selectedProfile.id, selectedProfile.full_name)} className="btn-primary rounded-2xl h-14 px-8 flex items-center justify-center gap-3 shadow-xl bg-slate-900 border-none hover:bg-slate-800">
                <FileSpreadsheet size={20} />
                Export to Excel
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 px-2">
              <div className="w-2 h-8 bg-primary-500 rounded-full"></div>
              Sadhana for {format(new Date(filterDate), 'MMM dd, yyyy')}
            </h3>
            
            {selectedDateEntry ? (
              <div className="glass-card overflow-hidden rounded-[2rem] border border-slate-100 shadow-2xl">
                <div className="p-5 md:p-10">
                  <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 md:gap-4 mb-8 md:mb-10 w-full">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-5 py-3 rounded-2xl font-black text-base md:text-lg border border-orange-100 justify-center sm:justify-start">
                        <RotateCcw size={20} />
                        {selectedDateEntry.rounds_completed} Rounds
                      </div>
                      {selectedDateEntry.rounds_completed_by && (
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-tighter text-center">Finished: {formatTime(selectedDateEntry.rounds_completed_by)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-5 py-3 rounded-2xl font-black text-base md:text-lg border border-blue-100 w-full sm:w-auto justify-center sm:justify-start">
                      <Clock size={20} />
                      {formatTime(selectedDateEntry.wakeup_time)}
                    </div>
                    {selectedDateEntry.sleep_time && (
                      <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-5 py-3 rounded-2xl font-black text-base md:text-lg border border-indigo-100 w-full sm:w-auto justify-center sm:justify-start">
                        <Moon size={20} />
                        {formatTime(selectedDateEntry.sleep_time)}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                    <div className="space-y-6 md:space-y-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                          <p className="text-[10px] uppercase font-black text-slate-400 mb-2 flex items-center gap-1.5">
                            <Headphones size={14} /> Hearing
                          </p>
                          <p className="text-xl font-black text-slate-800">{selectedDateEntry.hearing_done ? `${selectedDateEntry.hearing_minutes} mins` : 'Not done'}</p>
                        </div>
                        <div className="p-6 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                          <p className="text-[10px] uppercase font-black text-slate-400 mb-2 flex items-center gap-1.5">
                            <BookOpen size={14} /> Reading
                          </p>
                          <p className="text-xl font-black text-slate-800">{selectedDateEntry.reading_done ? `${selectedDateEntry.reading_minutes} mins` : 'Not done'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {selectedDateEntry.hearing_done && (
                          <div className="p-6 rounded-[1.5rem] bg-purple-50/50 border border-purple-100 space-y-3">
                            <p className="text-[10px] uppercase font-black text-purple-600 tracking-wider">Hearing Details</p>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <User size={18} className="text-purple-500 shrink-0" />
                                <span className="font-black text-slate-700">{selectedDateEntry.hearing_speaker || "No speaker provided"}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Bookmark size={18} className="text-purple-400 shrink-0" />
                                <span className="font-bold text-slate-600 text-sm">{selectedDateEntry.hearing_title || "No topic provided"}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedDateEntry.reading_done && (
                          <div className="p-6 rounded-[1.5rem] bg-emerald-50/50 border border-emerald-100 space-y-3">
                            <p className="text-[10px] uppercase font-black text-emerald-600 tracking-wider">Reading Details</p>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <Bookmark size={18} className="text-emerald-500 shrink-0" />
                                <span className="font-black text-slate-700">{selectedDateEntry.reading_book || "No book provided"}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                                <span className="font-black text-slate-700 uppercase text-xs">Sloka {selectedDateEntry.reading_sloka || "—"}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className={`p-8 rounded-[2.5rem] border-2 ${selectedDateEntry.seva_performed ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400'} flex flex-col gap-5`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${selectedDateEntry.seva_performed ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                              <Hammer size={32} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Sewa Status</p>
                              <p className="text-2xl font-black">{selectedDateEntry.seva_performed ? 'Completed' : 'None'}</p>
                            </div>
                          </div>
                          {selectedDateEntry.seva_performed && (
                            <div className="bg-amber-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black">
                              {selectedDateEntry.seva_minutes || 0} mins
                            </div>
                          )}
                        </div>
                        
                        {selectedDateEntry.seva_performed && (
                          <div className="bg-white/70 p-5 rounded-2xl border border-amber-200/50">
                            <p className="text-[10px] font-black text-amber-600 mb-1 uppercase tracking-wider">Sewa Details</p>
                            <p className="font-bold text-slate-800 text-sm md:text-base leading-relaxed">
                              {selectedDateEntry.seva_topic || "No details provided"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-48 md:h-64 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white/50">
                <Calendar size={32} className="opacity-20" />
                <p className="font-bold text-sm md:text-base">No sadhana entry for this date</p>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout userRole="admin">
      <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-1 sm:px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Admin Console</h1>
            <p className="text-slate-500 font-semibold mt-1">Management & Logs</p>
          </div>
          <div className="flex bg-slate-200/50 backdrop-blur-sm p-1 md:p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('logs')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'logs' ? 'bg-white text-primary-600 shadow-xl' : 'text-slate-500'}`}>Activity</button>
            <button onClick={() => setActiveTab('students')} className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'students' ? 'bg-white text-primary-600 shadow-xl' : 'text-slate-500'}`}>Students</button>
          </div>
        </div>

        {activeTab === 'logs' ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-12 w-full h-14 rounded-2xl border-slate-200 bg-white" />
              </div>
            </div>

            <div className="space-y-6">
              <div className="hidden lg:block glass-card rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white/60">
                    <tr>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Student & Date</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Wake Up</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Rounds</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center">Completed By</th>
                      <th className="px-8 py-6"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-primary-50/30 transition-colors cursor-pointer" onClick={() => { setFilterDate(entry.date); setSelectedStudent(entry.user_id); }}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500">{entry.user?.full_name?.charAt(0)}</div>
                            <div>
                              <p className="font-black text-slate-900">{entry.user?.full_name}</p>
                              <p className="text-xs font-bold text-slate-400">{format(new Date(entry.date), 'MMM dd, yyyy')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-black">{formatTime(entry.wakeup_time)}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-black text-orange-600">{entry.rounds_completed}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-xl text-xs font-black">{formatTime(entry.rounds_completed_by)}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:bg-primary-600 hover:text-white"><ChevronRight size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden space-y-4">
                {filteredEntries.map(entry => (
                  <div key={entry.id} className="glass-card p-5 md:p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4" onClick={() => { setFilterDate(entry.date); setSelectedStudent(entry.user_id); }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-2xl flex items-center justify-center font-black text-xl">{entry.user?.full_name?.charAt(0)}</div>
                        <div>
                          <p className="font-black text-slate-900 text-lg leading-tight">{entry.user?.full_name}</p>
                          <p className="text-xs font-bold text-slate-400">{format(new Date(entry.date), 'EEE, MMM dd')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="bg-orange-600 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-lg">{entry.rounds_completed} Rounds</div>
                        <p className="text-[10px] font-black text-slate-400 mt-1">{formatTime(entry.rounds_completed_by)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center gap-4 px-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Directory</h2>
              <button onClick={() => setIsModalOpen(true)} className="btn-primary rounded-2xl h-14 flex items-center gap-2 px-6 md:px-8 shadow-2xl"><UserPlus size={20} /> <span className="hidden sm:inline">Add Student</span></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {profiles.map(profile => (
                <button key={profile.id} onClick={() => setSelectedStudent(profile.id)} className="glass-card p-6 rounded-[2rem] flex flex-col items-center text-center gap-4 hover:border-primary-300 hover:shadow-2xl transition-all group border border-slate-100">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-[1.5rem] flex items-center justify-center font-black text-2xl md:text-3xl text-slate-500 group-hover:bg-primary-600 group-hover:text-white transition-all">{profile.full_name?.charAt(0)}</div>
                  <div>
                    <p className="font-black text-slate-900 text-lg md:text-xl tracking-tight">{profile.full_name}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 truncate max-w-[200px]">{profile.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-8 md:p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-6 md:right-8 top-6 md:top-8 text-slate-400 hover:text-slate-900 transition-colors"><X size={28} /></button>
            <div className="mb-8 md:mb-10 text-center"><h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">New Student</h3></div>
            <form onSubmit={handleRegister} className="space-y-5">
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label><input type="text" required value={regData.fullName} onChange={(e) => setRegData({ ...regData, fullName: e.target.value })} className="input-field h-12 md:h-14 rounded-xl" /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label><input type="email" required value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} className="input-field h-12 md:h-14 rounded-xl" /></div>
              <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label><input type="password" required value={regData.password} onChange={(e) => setRegData({ ...regData, password: e.target.value })} className="input-field h-12 md:h-14 rounded-xl" /></div>
              <button type="submit" disabled={regLoading} className="w-full h-14 md:h-16 btn-primary rounded-2xl flex items-center justify-center gap-3 text-base font-black shadow-xl mt-4">
                {regLoading ? <Loader2 className="animate-spin" size={24} /> : <UserPlus size={24} />} {regLoading ? 'Registering...' : 'Add Student'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};
