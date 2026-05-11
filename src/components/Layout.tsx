import React from 'react';
import { LogOut, ClipboardList, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  userRole?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, userRole }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 glass-card border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
                  <ClipboardList size={20} />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-orange-600 bg-clip-text text-transparent">
                  Sadhana Track
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {userRole === 'admin' && (
                <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-3 py-1 rounded-full text-xs font-semibold">
                  <ShieldCheck size={14} />
                  ADMIN
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-600 hover:text-red-600 transition-colors"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {children}
      </main>
      
      <footer className="mt-auto py-6 md:py-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-xs md:text-sm">
          © {new Date().getFullYear()} Sadhana Tracking System.
        </div>
      </footer>
    </div>
  );
};
