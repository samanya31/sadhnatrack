import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentReports } from './pages/StudentReports';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminReports } from './pages/AdminReports';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedUser = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchRole = async (userId: string) => {
      // Safety timeout: fallback to student after 5 seconds if fetch hangs
      const timeout = setTimeout(() => {
        if (mounted && loading) {
          console.warn("Role fetch timed out, falling back to student.");
          setRole('student');
          setLoading(false);
        }
      }, 10000);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        
        clearTimeout(timeout);

        if (mounted) {
          setRole(data?.role || 'student');
          setLoading(false);
        }
      } catch (err) {
        clearTimeout(timeout);
        console.error("Role fetch failed:", err);
        if (mounted) {
          setRole('student');
          setLoading(false);
        }
      }
    };

    // Listen for auth changes (handles initial load, login, and logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;
      
      setSession(currentSession);
      
      if (currentSession) {
        if (lastFetchedUser.current !== currentSession.user.id) {
          lastFetchedUser.current = currentSession.user.id;
          setLoading(true);
          await fetchRole(currentSession.user.id);
        } else {
          setLoading(false);
        }
      } else {
        setRole(null);
        lastFetchedUser.current = null;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

        <Route 
          path="/reports" 
          element={
            session ? (
              role === 'admin' ? <Navigate to="/admin" replace /> : <StudentReports />
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

        <Route 
          path="/admin/students" 
          element={
            session && role === 'admin' ? (
              <AdminDashboard />
            ) : (
              <Navigate to={session ? "/dashboard" : "/login"} replace />
            )
          } 
        />

        <Route 
          path="/admin/reports" 
          element={
            session && role === 'admin' ? (
              <AdminReports />
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
