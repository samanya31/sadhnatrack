import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  Users,
  ShieldCheck, 
  Menu, 
  X, 
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Building2,
  Lock
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/index';

import iskconLogo from '../assets/iskcon img.png';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: 'logs' | 'students';
  setActiveTab?: (tab: 'logs' | 'students') => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          const metaRole = user.user_metadata?.role;
          const userRole = profile?.role || metaRole || 'super_admin';

          if (!profile) {
            profile = {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || 'Administrator',
              role: userRole,
              bace_id: user.user_metadata?.bace_id || null,
              created_at: user.created_at
            } as any;
          }

          if (profile && profile.bace_id) {
            const { data: bace } = await supabase
              .from('baces')
              .select('name')
              .eq('id', profile.bace_id)
              .maybeSingle();
            if (bace) profile.bace = bace;
          }

          setUserProfile(profile);
        }
      } catch (err) {
        console.error('Error loading admin profile:', err);
      }
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    navigate('/login');
  };

  const navItems = [
    { id: 'logs', name: 'Activity Log', icon: ClipboardList, description: 'Manage student logs', path: '/admin', roles: ['admin', 'super_admin'] },
    { id: 'students', name: 'Student Directory', icon: Users, description: 'User management', path: '/admin/students', roles: ['admin', 'super_admin'] },
    { id: 'reports', name: 'Analytical Reports', icon: TrendingUp, description: 'View progress charts', path: '/admin/reports', roles: ['admin', 'super_admin'] },
    { id: 'baces', name: 'Manage BACEs', icon: Building2, description: 'Center management', path: '/admin/baces', roles: ['super_admin'] },
    { id: 'change-password', name: 'Change Password', icon: Lock, description: 'Update password', path: '/change-password', roles: ['admin', 'super_admin'] },
  ] as const;

  const currentRole = userProfile?.role ?? null;
  const filteredNavItems = currentRole
    ? navItems.filter(item => (item.roles as readonly string[]).includes(currentRole))
    : [];

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Admin Header - Light Theme */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/50 h-20 shadow-soft">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-8">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin')}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center p-1 shadow-md border border-slate-100 overflow-hidden">
                <img src={iskconLogo} alt="ISKCON Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col justify-center">
                <h2 className="text-[14px] sm:text-[18px] font-black text-slate-900 leading-tight tracking-tight">
                  Sadhana Admin
                </h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5 opacity-80">
                  Control Center
                </p>
              </div>
            </div>

            <div className="hidden md:flex h-10 w-[1px] bg-slate-200/60 mx-2"></div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200/50 shadow-sm">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                  {userProfile?.role === 'super_admin' ? 'All Centers' : (userProfile?.bace?.name || 'BACE')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden sm:flex flex-col items-end text-right">
              <p className="text-sm font-black text-slate-900 truncate max-w-[150px]">
                {userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Administrator'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-primary-100/50">
                  <ShieldCheck size={10} />
                  {userProfile?.role === 'super_admin' ? 'Super Admin' : 'BACE Admin'}
                </div>
                <button 
                  onClick={() => navigate('/change-password')}
                  className="px-2.5 py-1 text-slate-400 hover:text-primary-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-slate-200/50 hover:bg-slate-50 transition-all cursor-pointer animate-in fade-in"
                >
                  Change Password
                </button>
              </div>
            </div>

            <div className="h-10 w-[1px] bg-slate-200/60 hidden sm:block"></div>

            <button 
              onClick={handleLogout}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 group"
              title="Logout"
            >
              <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40
            w-72 bg-white border-r border-slate-200/60
            transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 transition-transform duration-300 ease-in-out
            flex flex-col pt-20 lg:pt-0 shadow-2xl lg:shadow-none
          `}
        >
          <div className="flex-1 overflow-y-auto py-8 px-4 space-y-8">
            <div>
              <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">
                Administration
              </p>
              <div className="space-y-1">
                {filteredNavItems.map((item) => {
                  const isPathActive = location.pathname === item.path;
                  const isActive = isPathActive && (item.path !== '/admin' || activeTab === item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (location.pathname !== item.path) {
                          navigate(item.path, { state: { targetTab: item.id } });
                        } else if (item.path === '/admin') {
                          setActiveTab?.(item.id as any);
                        }
                        setIsSidebarOpen(false);
                      }}
                      className={`
                        w-full group flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200
                        ${isActive 
                          ? 'bg-primary-50 text-primary-600 shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                      `}
                    >
                      <div className={`
                        p-2 rounded-xl transition-all duration-200
                        ${isActive ? 'bg-white shadow-sm' : 'bg-transparent group-hover:bg-white group-hover:shadow-sm'}
                      `}>
                        <item.icon size={20} />
                      </div>
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-black">{item.name}</span>
                        <span className={`text-[10px] font-medium opacity-60`}>{item.description}</span>
                      </div>
                      {isActive && <ChevronRight size={14} className="ml-auto opacity-40" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-[#F9FAFB]">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 min-h-full flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            
            <footer className="mt-20 pt-10 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                <p>© {new Date().getFullYear()} BACE ADMIN TERMINAL</p>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};
