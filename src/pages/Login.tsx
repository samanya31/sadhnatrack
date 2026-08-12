import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { sendBrevoOtpEmail } from '../lib/brevo';
import { LogIn, Mail, Lock, Loader2, Sparkles, User, KeyRound, CheckCircle2, AlertCircle, Key, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import loginImg from '../assets/loginimg.png';
import loginImgRes from '../assets/loginimgres.png';
import iskconLogo from '../assets/iskcon img.png';

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
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address first.');
      return;
    }

    setSendingOtp(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Check if email is already registered using RPC (bypasses RLS for guest signup)
      let isRegistered = false;
      const { data: rpcExists, error: rpcErr } = await supabase.rpc('check_email_exists', {
        p_email: cleanEmail
      });

      if (!rpcErr && rpcExists === true) {
        isRegistered = true;
      } else {
        // Direct query fallback
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (existingProfile) isRegistered = true;
      }

      if (isRegistered) {
        throw new Error('This email address is already registered. Please sign in or use a different email address.');
      }

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

    const cleanEmail = forgotEmail.trim().toLowerCase();

    try {
      // 1. Check if email exists in profiles using RPC
      const { data: exists, error: rpcErr } = await supabase.rpc('check_email_exists', {
        p_email: cleanEmail
      });

      if (rpcErr) console.warn('RPC check_email_exists error:', rpcErr);

      if (!exists) {
        throw new Error('No account found with this email address. Please check the spelling or register a new account.');
      }

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
        throw new Error('VITE_BREVO_API_KEY is missing from your .env file!');
      }

      // Send OTP via Brevo REST API
      await sendBrevoOtpEmail(cleanEmail, generatedOtp, 'reset');

      setForgotStep('otp');
      setForgotSuccess(`A 6-digit OTP code has been sent to ${cleanEmail}. Check your inbox.`);
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
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* ===== PAGE BACKGROUND SPLIT ===== */}
      <div className="absolute inset-0 flex flex-col lg:flex-row">
        {/* LEFT GREY SIDE (50%) */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-[#F2F5FA]" />

        {/* RIGHT WARM ORANGE SIDE (50%) */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-[#FFF3E6]" />
      </div>

      {/* ===== CENTER FLOATING CARD ===== */}
      <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="
          w-full
          max-w-[1180px]
          h-auto
          lg:h-[84vh]
          min-h-[600px]
          bg-white
          rounded-[2.5rem]
          shadow-[0_30px_70px_rgba(0,0,0,0.08)]
          overflow-hidden
          flex
          flex-col
          lg:flex-row
          border
          border-slate-100
        ">
          {/* LEFT LOGIN / SIGNUP PANEL */}
          <div className="w-full lg:w-1/2 flex flex-col pt-0 lg:pt-6 p-6 sm:p-10 lg:px-12 pb-6 overflow-y-auto lg:overflow-hidden relative">
            
            {/* Mobile Banner Illustration */}
            <div className="w-[calc(100%+4rem)] -mx-8 sm:-mx-12 h-56 lg:hidden relative shrink-0 -mt-8 sm:-mt-12 overflow-hidden mb-6 bg-[#FFF3E6] animate-in fade-in duration-700">
              <img
                src={loginImgRes}
                alt="Sadhana Track Login"
                className="w-full h-full object-cover object-center transition-opacity duration-500 animate-fade-in"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent z-10"></div>
            </div>

            <div className="w-full max-w-md mx-auto flex flex-col justify-center my-auto relative z-10">
              
              {/* Logo & Header */}
              <div className={`flex items-center gap-3 ${isSignUp ? 'mb-3' : 'mb-4 sm:mb-5'}`}>
                <img src={iskconLogo} alt="ISKCON Logo" className={`${isSignUp ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-14 h-14 sm:w-16 sm:h-16'} object-contain shrink-0`} />
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">Sadhana Track</h2>
                  <p className="text-[9px] sm:text-[10px] font-extrabold text-orange-600 uppercase tracking-widest">Spiritual Growth Platform</p>
                </div>
              </div>

              <div className={`${isSignUp ? 'mb-3' : 'mb-4 sm:mb-5'}`}>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h1>
                <p className="text-slate-500 text-xs font-medium mt-0.5">
                  {isSignUp ? 'Register to start tracking your daily spiritual progress' : 'Enter your credentials to access your dashboard'}
                </p>
              </div>

              {/* Mode Switcher Pills */}
              <div className={`flex bg-slate-100/80 p-1.5 rounded-2xl ${isSignUp ? 'mb-3' : 'mb-4 sm:mb-5'} border border-slate-200/50`}>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); setSuccessMessage(null); }}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    !isSignUp ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); setSuccessMessage(null); }}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    isSignUp ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-start gap-2.5">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {!isSignUp ? (
                /* Login Form */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-sm font-medium bg-white shadow-xs"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between ml-1 mb-1.5">
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
                        className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-sm font-medium bg-white shadow-xs"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                /* Registration Form */
                <form onSubmit={handleSignUp} className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-medium bg-white shadow-xs"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between ml-1 mb-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                      {isEmailVerified && email.trim() === verifiedEmail && (
                        <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-medium bg-white shadow-xs"
                          placeholder="name@example.com"
                        />
                      </div>
                      {!(isEmailVerified && email.trim() === verifiedEmail) && (
                        <button
                          type="button"
                          disabled={sendingOtp || !email.includes('@')}
                          onClick={handleSendSignupOtp}
                          className="px-3 py-2 text-[9px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl border border-orange-200 transition-all shrink-0 cursor-pointer disabled:opacity-40 flex items-center gap-1"
                        >
                          {sendingOtp ? <Loader2 className="animate-spin" size={12} /> : null}
                          {otpSent ? 'Resend' : 'Send OTP'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline OTP Verification Box */}
                  {otpSent && !(isEmailVerified && email.trim() === verifiedEmail) && (
                    <div className="bg-orange-50/90 border border-orange-200/80 p-2.5 rounded-xl space-y-1.5 animate-in fade-in duration-300">
                      <p className="text-[10px] font-bold text-orange-800 flex items-center gap-1">
                        <ShieldCheck size={14} className="text-orange-600 shrink-0" />
                        OTP sent to <span className="font-black text-orange-950 underline">{email}</span>:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={signupOtpInput}
                          onChange={(e) => setSignupOtpInput(e.target.value)}
                          placeholder="6-Digit OTP"
                          className="px-3 py-1.5 text-center text-sm font-mono font-black bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none flex-1 tracking-[0.2em]"
                        />
                        <button
                          type="button"
                          disabled={verifyingOtp || signupOtpInput.trim().length < 6}
                          onClick={handleVerifySignupInlineOtp}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                        >
                          {verifyingOtp ? <Loader2 className="animate-spin" size={12} /> : 'Verify'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-medium bg-white shadow-xs"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Gender</label>
                      <select
                        required
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-2.5 py-2.5 bg-white border border-slate-200 outline-none rounded-xl text-slate-900 font-bold text-xs capitalize shadow-xs"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Center Code</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                          type="text"
                          required
                          value={baceCode}
                          onChange={(e) => setBaceCode(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-bold uppercase bg-white shadow-xs"
                          placeholder="DELHI26"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading || !(isEmailVerified && email.trim() === verifiedEmail)}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                      {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                    {!(isEmailVerified && email.trim() === verifiedEmail) && (
                      <p className="text-center text-[9px] font-bold text-slate-400 mt-1">
                        🔒 Verify your email address via OTP above to unlock Sign Up
                      </p>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Pinned Left Footer */}
            <div className="mt-auto pt-4 border-t border-slate-100 relative z-10">
              <p className="text-[11px] font-semibold text-slate-400 select-none">
                © {new Date().getFullYear()} Sadhana Track • Spiritual Growth Platform<br />
                <span className="text-orange-600 font-extrabold">BACE Community & Habit Telemetry</span>
              </p>
            </div>

            {/* Bottom Right Corner ISKCON Logo Watermark */}
            <div className="absolute bottom-0 right-0 pointer-events-none z-0 overflow-hidden select-none">
              <img
                src={iskconLogo}
                alt="ISKCON Logo Watermark"
                className="w-40 sm:w-48 lg:w-56 h-auto object-contain opacity-12 translate-x-3 translate-y-3"
              />
            </div>
          </div>

          {/* RIGHT PANEL - SINGLE FULL BOX IMAGE */}
          <div className="hidden lg:block w-1/2 relative overflow-hidden bg-[#FFF3E6]">
            <img
              src={loginImg}
              alt="Sadhana Track Login"
              className="w-full h-full object-cover object-left"
            />
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
