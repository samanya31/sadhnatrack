import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedUser = useRef<string | null>(null);

  useEffect(() => {
    // Initial session check
    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session) {
          await fetchRoleWithTimeout(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    };

    initApp();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      
      if (currentSession) {
        if (lastFetchedUser.current !== currentSession.user.id) {
          setLoading(true); // Show loading when user changes
          await fetchRoleWithTimeout(currentSession.user.id);
        }
      } else {
        setRole(null);
        lastFetchedUser.current = null;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRoleWithTimeout = async (userId: string) => {
    if (lastFetchedUser.current === userId && role !== null) {
      setLoading(false);
      return;
    }
    lastFetchedUser.current = userId;

    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve({ role: 'student' }), 3000);
    });

    const fetcher = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        
        if (error) throw error;
        return { role: data?.role || 'student' };
      } catch (err) {
        return { role: 'student' };
      }
    })();

    const result: any = await Promise.race([fetcher, timeout]);
    setRole(result.role);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfaf5]">
        <div className="flex flex-col items-center gap-8 animate-in fade-in duration-700">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-primary-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verifying Identity</h2>
            <p className="text-slate-400 font-medium text-sm px-4">Preparing your personalized dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to={role === 'admin' ? "/admin" : "/dashboard"} replace />} 
        />
        
        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            session ? (
              role === 'admin' ? <Navigate to="/admin" replace /> : <StudentDashboard />
            ) : <Navigate to="/login" replace />
          } 
        />

        {/* Protected Admin Route */}
        <Route 
          path="/admin" 
          element={
            session && role === 'admin' ? (
              <AdminDashboard />
            ) : (
              <Navigate to={session ? "/dashboard" : "/login"} replace />
            )
          } 
        />

        <Route path="/" element={<Navigate to={session ? (role === 'admin' ? "/admin" : "/dashboard") : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
