import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { sendBrevoOtpEmail } from '../lib/brevo';
import { LogIn, Mail, Lock, Loader2, Sparkles, User, KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Key, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('male');
  const [baceCode, setBaceCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inline OTP Email Verification for Sign Up
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [signupOtpInput, setSignupOtpInput] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Forgot Password Modal (Email -> OTP -> New Password)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSignupOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }

    setSendingOtp(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in database
      const { error: dbError } = await supabase.from('password_otps').insert({
        email: cleanEmail,
        otp_code: generatedOtp,
        type: 'signup',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      if (dbError) throw new Error('Database error storing OTP: ' + dbError.message);

      // Send OTP email via Brevo API
      const apiKey = import.meta.env.VITE_BREVO_API_KEY;
      if (apiKey) {
        await sendBrevoOtpEmail(cleanEmail, generatedOtp, 'signup');
      } else {
        console.warn('VITE_BREVO_API_KEY is missing in .env');
      }

      setOtpSent(true);
      setSuccessMessage(`A 6-digit verification OTP code has been sent to ${cleanEmail}. Please enter it below.`);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifySignupInlineOtp = async () => {
    const cleanEmail = email.trim();
    const cleanOtp = signupOtpInput.trim();

    if (cleanOtp.length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setVerifyingOtp(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data: dbOtps, error: dbErr } = await supabase
        .from('password_otps')
        .select('*')
        .eq('email', cleanEmail)
        .eq('otp_code', cleanOtp)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (dbErr) throw dbErr;

      if (dbOtps && dbOtps.length > 0) {
        await supabase.from('password_otps').delete().eq('id', dbOtps[0].id);
        setIsEmailVerified(true);
        setVerifiedEmail(cleanEmail);
        setSuccessMessage('✓ Email address verified successfully! You can now click Sign Up.');
      } else {
        throw new Error('Invalid or expired 6-digit OTP code.');
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();

    if (!isEmailVerified || cleanEmail !== verifiedEmail) {
      setError('Please verify your email address via OTP before signing up.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      // 1. Validate the Center Access Code using RPC
      const { data: baceData, error: rpcError } = await supabase.rpc('get_bace_by_access_key', {
        key_input: baceCode.trim()
      });

      if (rpcError) throw new Error('Failed to validate Center Access Code. Please try again.');

      if (!baceData || baceData.length === 0) {
        throw new Error('Invalid Center Access Code. Please check with your center coordinator.');
      }

      const baceId = baceData[0].id;
      const baceName = baceData[0].name;

      // 2. Register user
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'student',
            bace_id: baceId,
            gender: gender,
            created_by_admin: false,
            force_password_change: false
          }
        }
      });

      if (signUpError) throw signUpError;

      // 3. Auto login user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (!signInError) {
        setSuccessMessage(`Account created successfully for center "${baceName}"! Logging you in...`);
      } else {
        setSuccessMessage(`Account created successfully for center "${baceName}"! Please sign in.`);
        setIsSignUp(false);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    const cleanEmail = forgotEmail.trim();

    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store in password_otps table
      await supabase.from('password_otps').insert({
        email: cleanEmail,
        otp_code: generatedOtp,
        type: 'reset',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      const apiKey = import.meta.env.VITE_BREVO_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_BREVO_API_KEY is missing from your .env file! Please add VITE_BREVO_API_KEY=your_key in .env and restart your server.');
      }

      // Send OTP via Brevo REST API
      await sendBrevoOtpEmail(cleanEmail, generatedOtp, 'reset');

      setForgotStep('otp');
      setForgotSuccess(`A 6-digit OTP code has been sent via Brevo to ${cleanEmail}. Check your inbox.`);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to send OTP code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);

    const cleanEmail = forgotEmail.trim();
    const cleanOtp = forgotOtp.trim();

    try {
      // 1. Check Brevo database OTP match
      const { data: dbOtps } = await supabase
        .from('password_otps')
        .select('*')
        .eq('email', cleanEmail)
        .eq('otp_code', cleanOtp)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (dbOtps && dbOtps.length > 0) {
        // Delete used OTP
        await supabase.from('password_otps').delete().eq('id', dbOtps[0].id);
        setForgotStep('new_password');
        setForgotSuccess('OTP verified successfully! Now set your new password.');
        return;
      }

      // 2. Fallback to Supabase auth verifyOtp
      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'recovery'
      });

      if (error) throw error;

      // If authenticated by Supabase recovery session, navigate to password change
      setShowForgotModal(false);
      navigate('/change-password');
    } catch (err: any) {
      setForgotError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleUpdateNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);

    try {
      // Try updating logged in recovery user session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        // If not logged in, try signing in with recovery / admin or clear force password flag
        throw updateError;
      }

      alert('Password updated successfully! You can now log in with your new password.');
      setShowForgotModal(false);
      setForgotStep('email');
      setPassword(newPassword);
    } catch (err: any) {
      setForgotError('Failed to update password: ' + err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfaf5] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-200/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-200/30 rounded-full blur-[100px]" />

      <div className="w-full max-w-md z-10">
        <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white shadow-2xl relative">
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
              <Sparkles size={32} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              {isSignUp ? 'Register to start tracking your spiritual progress' : 'Track your spiritual progress every day'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-sm font-semibold flex items-start gap-2">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {!isSignUp ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between ml-1 mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotStep('email');
                      setForgotError(null);
                      setForgotSuccess(null);
                      setShowForgotModal(true);
                    }}
                    className="text-[10px] font-black text-primary-600 uppercase tracking-widest hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest shadow-xl disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field pl-10"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between ml-1 mb-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  {isEmailVerified && email.trim() === verifiedEmail && (
                    <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ✓ Email Verified
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      disabled={isEmailVerified && email.trim() === verifiedEmail}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (isEmailVerified && e.target.value.trim() !== verifiedEmail) {
                          setIsEmailVerified(false);
                          setOtpSent(false);
                        }
                      }}
                      className="input-field pl-10"
                      placeholder="name@example.com"
                    />
                  </div>
                  {!(isEmailVerified && email.trim() === verifiedEmail) && (
                    <button
                      type="button"
                      disabled={sendingOtp || !email.includes('@')}
                      onClick={handleSendSignupOtp}
                      className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-2xl border border-primary-200 transition-all shrink-0 cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {sendingOtp ? <Loader2 className="animate-spin" size={14} /> : null}
                      {otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline OTP Verification Box */}
              {otpSent && !(isEmailVerified && email.trim() === verifiedEmail) && (
                <div className="bg-orange-50/90 border border-orange-200/80 p-3.5 rounded-2xl space-y-2 animate-in fade-in duration-300">
                  <p className="text-[11px] font-bold text-orange-800 flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-orange-600 shrink-0" />
                    Enter 6-digit OTP code sent to <span className="font-black text-orange-950 underline">{email}</span>:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={signupOtpInput}
                      onChange={(e) => setSignupOtpInput(e.target.value)}
                      placeholder="6-Digit OTP"
                      className="px-3 py-2 text-center text-base font-mono font-black bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none flex-1 tracking-[0.3em]"
                    />
                    <button
                      type="button"
                      disabled={verifyingOtp || signupOtpInput.trim().length < 6}
                      onClick={handleVerifySignupInlineOtp}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {verifyingOtp ? <Loader2 className="animate-spin" size={14} /> : 'Verify'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Gender</label>
                  <select
                    required
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="input-field py-[11px] bg-slate-50 border-none outline-none rounded-2xl w-full text-slate-900 font-bold"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Center Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      value={baceCode}
                      onChange={(e) => setBaceCode(e.target.value)}
                      className="input-field pl-10"
                      placeholder="e.g. DELHI26"
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !(isEmailVerified && email.trim() === verifiedEmail)}
                  className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
                {!(isEmailVerified && email.trim() === verifiedEmail) && (
                  <p className="text-center text-[10px] font-bold text-slate-400 mt-2">
                    🔒 Verify your email address via OTP above to unlock Sign Up
                  </p>
                )}
              </div>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            {!isSignUp ? (
              <p className="text-slate-500 text-sm font-medium">
                Don't have an account?{' '}
                <span
                  onClick={() => {
                    setIsSignUp(true);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-primary-600 font-black cursor-pointer hover:underline"
                >
                  Register Here
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest text-[10px] mx-auto transition-all cursor-pointer"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </button>
            )}
          </div>

        </div>
      </div>



      {/* Forgot Password Modal (Brevo OTP Integration) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 sm:p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4">
                <Key size={28} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Reset Password</h3>
              <p className="text-slate-500 text-xs font-bold mt-2">
                {forgotStep === 'email' 
                  ? 'Enter your registered email to receive a 6-digit OTP' 
                  : forgotStep === 'otp'
                  ? `Enter the OTP sent to ${forgotEmail}`
                  : 'Enter your new password below'}
              </p>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 'email' && (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full btn-primary py-3.5 text-xs font-black uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {forgotLoading ? <Loader2 className="animate-spin" size={16} /> : 'Send 6-Digit OTP Email'}
                </button>
              </form>
            )}

            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 text-center">6-Digit OTP Code</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.4em] font-mono font-black bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || forgotOtp.length < 6}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {forgotLoading ? <Loader2 className="animate-spin" size={16} /> : 'Verify OTP Code'}
                </button>
              </form>
            )}

            {forgotStep === 'new_password' && (
              <form onSubmit={handleUpdateNewPassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || newPassword.length < 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {forgotLoading ? <Loader2 className="animate-spin" size={16} /> : 'Save New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
