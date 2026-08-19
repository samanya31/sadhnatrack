import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentLog } from './pages/StudentLog';
import { StudentHistory } from './pages/StudentHistory';
import { StudentReports } from './pages/StudentReports';
import { StudentTargets } from './pages/StudentTargets';
import { StudentAICoach } from './pages/StudentAICoach';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminReports } from './pages/AdminReports';
import { AdminBaces } from './pages/AdminBaces';
import { ForceChangePassword } from './pages/ForceChangePassword';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [forcePasswordChange, setForcePasswordChange] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const lastFetchedUser = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const resolveRoleFromSession = (currentSession: Session, dbRole?: string | null) => {
      const metadataRole =
        (currentSession.user.user_metadata?.role as string | undefined) ||
        (currentSession.user.app_metadata?.role as string | undefined);
      // DB role always wins. Fall back to metadata only when DB has no result.
      // NEVER default to 'student' blindly — admins get stranded in student view.
      return dbRole || metadataRole || null;
    };

    const fetchRole = async (currentSession: Session) => {
      if (!mounted) return;

      // Don't pre-set from metadata alone — wait for DB result.
      // Show loading spinner until DB confirms the real role.
      setRole(null);
      setForcePasswordChange(false);

      try {
        const roleQuery = supabase
          .from('profiles')
          .select('role, force_password_change')
          .eq('id', currentSession.user.id)
          .maybeSingle();

        // Best-effort DB role lookup; skip silently if slow.
        const timeoutMs = 4000;
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), timeoutMs);
        });

        const result = await Promise.race([roleQuery, timeoutPromise]);
        if (!mounted) return;

        if (result === null) {
          // Timeout: fall back to metadata role or student
          const fallback = resolveRoleFromSession(currentSession) || 'student';
          setRole(fallback);
          setLoading(false);
          return;
        }

        if (result.error) throw result.error;

        const dbRole = result.data?.role;
        const dbForceChange = result.data?.force_password_change;
        // DB role is the truth — use it unconditionally
        setRole(dbRole || resolveRoleFromSession(currentSession) || 'student');
        if (dbForceChange !== undefined && dbForceChange !== null) {
          setForcePasswordChange(dbForceChange);
        }
      } catch {
        // DB failed — fall back to metadata, never blank
        const fallback = resolveRoleFromSession(currentSession) || 'student';
        setRole(fallback);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const initializeSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(currentSession);

      if (currentSession) {
        lastFetchedUser.current = currentSession.user.id;
        setLoading(true);
        void fetchRole(currentSession);
      } else {
        setRole(null);
        setLoading(false);
      }
    };

    void initializeSession();

    // Listen for auth changes (handles initial load, login, and logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;
      
      setSession(currentSession);
      
      if (currentSession) {
        if (lastFetchedUser.current !== currentSession.user.id) {
          lastFetchedUser.current = currentSession.user.id;
          setLoading(true);
          void fetchRole(currentSession);
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

  if (session && forcePasswordChange) {
    return (
      <Router>
        <Routes>
          <Route path="/force-change-password" element={<ForceChangePassword />} />
          <Route path="*" element={<Navigate to="/force-change-password" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to={(role === 'admin' || role === 'super_admin') ? "/admin" : "/dashboard"} replace />} 
        />
        
        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            session ? (
              (role === 'admin' || role === 'super_admin') ? <Navigate to="/admin" replace /> : <StudentDashboard />
            ) : <Navigate to="/login" replace />
          } 
        />

        <Route 
          path="/log" 
          element={
            session ? (
              (role === 'admin' || role === 'super_admin') ? <Navigate to="/admin" replace /> : <StudentLog />
            ) : <Navigate to="/login" replace />
          } 
        />

        <Route 
          path="/history" 
          element={
            session ? (
              (role === 'admin' || role === 'super_admin') ? <Navigate to="/admin" replace /> : <StudentHistory />
            ) : <Navigate to="/login" replace />
          } 
        />

        <Route 
          path="/reports" 
          element={
            session ? (
              (role === 'admin' || role === 'super_admin') ? <Navigate to="/admin/reports" replace /> : <StudentReports />
            ) : <Navigate to="/login" replace />
          } 
        />

        <Route 
          path="/targets" 
          element={
            session ? (
              (role === 'admin' || role === 'super_admin') ? <Navigate to="/admin" replace /> : <StudentTargets />
            ) : <Navigate to="/login" replace />
          } 
        />

        <Route 
          path="/ai-coach" 
          element={
            session ? (
              (role === 'admin' || role === 'super_admin') ? <Navigate to="/admin" replace /> : <StudentAICoach />
            ) : <Navigate to="/login" replace />
          } 
        />

        {/* Protected Admin Route */}
        <Route 
          path="/admin" 
          element={
            session && (role === 'admin' || role === 'super_admin') ? (
              <AdminDashboard />
            ) : (
              <Navigate to={session ? "/dashboard" : "/login"} replace />
            )
          } 
        />

        <Route 
          path="/admin/students" 
          element={
            session && (role === 'admin' || role === 'super_admin') ? (
              <AdminDashboard />
            ) : (
              <Navigate to={session ? "/dashboard" : "/login"} replace />
            )
          } 
        />

        <Route 
          path="/admin/reports" 
          element={
            session && (role === 'admin' || role === 'super_admin') ? (
              <AdminReports />
            ) : (
              <Navigate to={session ? "/dashboard" : "/login"} replace />
            )
          } 
        />

        <Route 
          path="/admin/baces" 
          element={
            session && role === 'super_admin' ? (
              <AdminBaces />
            ) : (
              <Navigate to={session ? "/admin" : "/login"} replace />
            )
          } 
        />

        <Route 
          path="/change-password" 
          element={session ? <ForceChangePassword /> : <Navigate to="/login" replace />} 
        />

        <Route path="/" element={<Navigate to={session ? ((role === 'admin' || role === 'super_admin') ? "/admin" : "/dashboard") : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
