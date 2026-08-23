import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sendBrevoOtpEmail } from '../lib/brevo';
import { 
  LogIn, 
  Mail, 
  Lock, 
  Loader2, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Building2, 
  ArrowRight, 
  RefreshCw, 
  Sparkles,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import loginImg from '../assets/loginimg.png';
import loginImgRes from '../assets/loginimgres.png';
import iskconLogo from '../assets/iskcon img.png';

export const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Common Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step-based Signup Flow States
  const [signupStep, setSignupStep] = useState<'create' | 'verify' | 'ready'>('create');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('male');
  const [baceCode, setBaceCode] = useState('');
  const [verifiedBaceId, setVerifiedBaceId] = useState('');
  const [verifiedBaceName, setVerifiedBaceName] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [verifiedOtpCode, setVerifiedOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Helper to mask email address (e.g. sa*****@gmail.com)
  const maskEmail = (emailStr: string) => {
    if (!emailStr || !emailStr.includes('@')) return emailStr;
    const [user, domain] = emailStr.split('@');
    if (user.length <= 2) {
      return `${user[0]}*@${domain}`;
    }
    const visiblePart = user.slice(0, 2);
    const maskedPart = '*'.repeat(user.length - 2);
    return `${visiblePart}${maskedPart}@${domain}`;
  };

  // LOGIN HANDLER
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
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: CREATE ACCOUNT HANDLER
  const handleStep1CreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    const cleanName = fullName.trim();
    const cleanCode = baceCode.trim().toUpperCase();

    if (!cleanName || !cleanEmail || !cleanPhone || !password || !confirmPassword || !cleanCode) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (cleanPhone.length !== 10) {
      setError('Mobile number is mandatory and must be exactly 10 digits.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match each other.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      // 1. Pre-check if email is already registered using RPC
      let isRegistered = false;
      const { data: rpcExists, error: rpcErr } = await supabase.rpc('check_email_exists', {
        p_email: cleanEmail
      });

      if (!rpcErr && rpcExists === true) {
        isRegistered = true;
      } else {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .maybeSingle();
        if (existingProfile) isRegistered = true;
      }

      if (isRegistered) {
        throw new Error('This email address is already registered. Please sign in or use a different email.');
      }

      // 2. Validate Center Access Code via RPC
      const { data: baceData, error: baceErr } = await supabase.rpc('get_bace_by_access_key', {
        key_input: cleanCode
      });

      if (baceErr || !baceData || baceData.length === 0) {
        throw new Error('Invalid Center Access Code. Please check with your center coordinator (e.g. HALD-101).');
      }

      setVerifiedBaceId(baceData[0].id);
      setVerifiedBaceName(baceData[0].name);

      // 3. Generate & store 6-digit OTP code
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      await supabase.from('password_otps').insert({
        email: cleanEmail,
        otp_code: generatedOtp,
        type: 'signup',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      // 4. Send Brevo OTP email
      const apiKey = import.meta.env.VITE_BREVO_API_KEY;
      if (apiKey) {
        await sendBrevoOtpEmail(cleanEmail, generatedOtp, 'signup');
      }

      // Advance to Step 2
      setSignupStep('verify');
      setResendTimer(30);
      setSuccessMessage(`We've sent a 6-digit verification code to ${cleanEmail}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP HANDLER FOR STEP 2
  const handleResendSignupOtp = async () => {
    if (resendTimer > 0) return;
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await supabase.from('password_otps').insert({
        email: cleanEmail,
        otp_code: generatedOtp,
        type: 'signup',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      const apiKey = import.meta.env.VITE_BREVO_API_KEY;
      if (apiKey) {
        await sendBrevoOtpEmail(cleanEmail, generatedOtp, 'signup');
      }

      setResendTimer(30);
      setSuccessMessage(`Resent a new 6-digit verification code to ${cleanEmail}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY EMAIL HANDLER
  const handleStep2VerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpInput.trim();

    if (cleanOtp.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Verify OTP code in password_otps
      const { data: dbOtps, error: dbErr } = await supabase
        .from('password_otps')
        .select('*')
        .eq('email', cleanEmail)
        .eq('otp_code', cleanOtp)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (dbErr) throw dbErr;

      if (!dbOtps || dbOtps.length === 0) {
        throw new Error('Invalid or expired verification code. Please check your email or click Resend OTP.');
      }

      // Delete used OTP
      await supabase.from('password_otps').delete().eq('id', dbOtps[0].id);

      // 2. Register user in Supabase Auth
      const { error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'student',
            bace_id: verifiedBaceId,
            gender: gender,
            created_by_admin: false,
            force_password_change: false
          }
        }
      });

      if (signUpError) throw signUpError;

      // Advance to Step 3
      setSignupStep('ready');
      setError(null);
      setSuccessMessage(null);
    } catch (err: any) {
      setError(err.message || 'Email verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: CONTINUE TO DASHBOARD HANDLER
  const handleStep3Continue = async () => {
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (signInError) throw signInError;

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Auto login error:', err);
      setIsSignUp(false);
      setSignupStep('create');
      setError('Account created! Please sign in with your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD MODAL HANDLERS
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();

    try {
      const { data: exists, error: rpcErr } = await supabase.rpc('check_email_exists', {
        p_email: cleanEmail
      });

      if (rpcErr) console.warn('RPC check_email_exists error:', rpcErr);

      if (!exists) {
        throw new Error('No account found with this email address. Please check the spelling or register a new account.');
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

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
      const { data: dbOtps } = await supabase
        .from('password_otps')
        .select('*')
        .eq('email', cleanEmail)
        .eq('otp_code', cleanOtp)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!dbOtps || dbOtps.length === 0) {
        throw new Error('Invalid or expired 6-digit OTP code.');
      }

      setVerifiedOtpCode(cleanOtp);
      setForgotStep('new_password');
      setForgotSuccess('✓ OTP verified! Now enter your new password.');
    } catch (err: any) {
      setForgotError(err.message || 'OTP verification failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);

    const cleanEmail = forgotEmail.trim();

    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long.');
      setForgotLoading(false);
      return;
    }

    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('reset_user_password_with_otp', {
        p_email: cleanEmail,
        p_otp: verifiedOtpCode,
        p_new_password: newPassword
      });

      if (rpcErr) throw rpcErr;
      if (rpcRes && rpcRes.success === false) {
        throw new Error(rpcRes.error || 'Password reset failed.');
      }

      setForgotSuccess('🎉 Password updated successfully! Logging you in...');
      setTimeout(async () => {
        setShowForgotModal(false);
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: newPassword
        });
        if (signInErr) {
          setError('Password updated! Please sign in with your new password.');
        }
      }, 1500);
    } catch (err: any) {
      setForgotError(err.message || 'Failed to update password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* ===== PAGE BACKGROUND SPLIT ===== */}
      <div className="absolute inset-0 flex flex-col lg:flex-row pointer-events-none">
        {/* LEFT GREY SIDE (50%) */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-[#F2F5FA]" />

        {/* RIGHT WARM ORANGE SIDE (50%) */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-[#FFF3E6]" />
      </div>

      {/* ===== CENTER FLOATING CARD (FULL SCREEN ON MOBILE, FLOATING CARD ON LAPTOP) ===== */}
      <div className="relative min-h-screen flex items-center justify-center p-0 lg:p-8 z-10">
        <div className="
          w-full
          min-h-screen lg:min-h-[600px]
          max-w-none lg:max-w-[1180px]
          h-auto lg:h-[84vh]
          bg-white
          rounded-none lg:rounded-[2.5rem]
          shadow-none lg:shadow-[0_30px_70px_rgba(0,0,0,0.08)]
          overflow-y-auto lg:overflow-hidden
          flex
          flex-col
          lg:flex-row
          border-none lg:border lg:border-slate-100
        ">
          {/* LEFT LOGIN / SIGNUP PANEL */}
          <div className="w-full lg:w-1/2 flex flex-col min-h-screen lg:min-h-0 pt-0 lg:pt-6 p-6 sm:p-10 lg:px-12 pb-6 overflow-y-auto relative">
            
            {/* Mobile Banner Illustration */}
            <div className="w-[calc(100%+3rem)] sm:w-[calc(100%+5rem)] -mx-6 sm:-mx-10 max-h-[45vh] lg:hidden relative shrink-0 -mt-6 sm:-mt-10 overflow-hidden bg-[#FFF3E6] animate-in fade-in duration-700">
              <img
                src={loginImgRes}
                alt="Sadhana Track Login"
                className="w-full h-auto max-h-[45vh] object-cover object-top transition-opacity duration-500 animate-fade-in block"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/70 to-transparent z-10"></div>
            </div>

            <div className="w-full max-w-md mx-auto flex flex-col justify-start lg:justify-center my-0 lg:my-auto relative z-20 -mt-3 sm:-mt-4 py-0 sm:py-2">
              
              {/* Logo & Header */}
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <img src={iskconLogo} alt="ISKCON Logo" className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0" />
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">AI Sadhna Coach</h2>
                  <p className="text-[9px] sm:text-[10px] font-extrabold text-orange-600 uppercase tracking-widest">Spiritual Growth Platform</p>
                </div>
              </div>

              <div className="mb-4 sm:mb-5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {!isSignUp ? 'Welcome Back' : signupStep === 'create' ? 'Create Account' : signupStep === 'verify' ? 'Verify Email' : 'Account Ready'}
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                  {!isSignUp 
                    ? 'Enter your credentials to access your dashboard' 
                    : signupStep === 'create' 
                    ? 'Step 1 of 3: Enter your details & center access code' 
                    : signupStep === 'verify' 
                    ? 'Step 2 of 3: Enter 6-digit OTP sent to your email' 
                    : 'Step 3 of 3: Your account is verified and ready'}
                </p>
              </div>

              {/* Signup Step Progress Indicator */}
              {isSignUp && (
                <div className="flex items-center justify-between gap-2 mb-4 bg-orange-50/60 p-2 rounded-xl border border-orange-100">
                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${signupStep === 'create' ? 'text-orange-600 font-extrabold' : 'text-slate-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${signupStep === 'create' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
                    <span>Create</span>
                  </div>

                  <div className="h-[2px] flex-1 bg-slate-200">
                    <div className={`h-full bg-orange-500 transition-all ${signupStep !== 'create' ? 'w-full' : 'w-0'}`} />
                  </div>

                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${signupStep === 'verify' ? 'text-orange-600 font-extrabold' : 'text-slate-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${signupStep === 'verify' ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
                    <span>Verify</span>
                  </div>

                  <div className="h-[2px] flex-1 bg-slate-200">
                    <div className={`h-full bg-emerald-500 transition-all ${signupStep === 'ready' ? 'w-full' : 'w-0'}`} />
                  </div>

                  <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${signupStep === 'ready' ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${signupStep === 'ready' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
                    <span>Ready</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {!isSignUp ? (
                /* LOGIN FORM WITH PERFECT DENSITY */
                <form onSubmit={handleLogin} className="space-y-4 sm:space-y-4.5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-sm font-medium bg-white shadow-xs"
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
                        className="w-full pl-11 pr-4 py-3 sm:py-3.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-sm font-medium bg-white shadow-xs"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3.5 sm:py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>

                  {/* Don't have an account link */}
                  <div className="text-center pt-3 sm:pt-4">
                    <p className="text-xs sm:text-sm font-semibold text-slate-500">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(true);
                          setSignupStep('create');
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer transition-colors"
                      >
                        Sign up now →
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* 3-STEP SIGNUP FORM */
                <>
                  {/* STEP 1: CREATE ACCOUNT */}
                  {signupStep === 'create' && (
                    <form onSubmit={handleStep1CreateAccount} className="space-y-2.5">
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
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-medium bg-white shadow-xs"
                            placeholder="user@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between ml-1 mb-1">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile No. (10 digits)</label>
                          <span className="text-[9px] font-bold text-orange-600 uppercase">* Mandatory</span>
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-mono font-bold bg-white shadow-xs tracking-wider"
                            placeholder="9876543210"
                          />
                        </div>
                        {phone.length > 0 && phone.length < 10 && (
                          <p className="text-[10px] font-bold text-amber-600 mt-1 ml-1">
                            ⚠️ Mobile number must be exactly 10 digits ({phone.length}/10)
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                              type="password"
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-medium bg-white shadow-xs"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Confirm Password</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                              type="password"
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className={`w-full pl-9 pr-3 py-2.5 border rounded-xl outline-none transition-all text-xs font-medium bg-white shadow-xs ${
                                confirmPassword.length > 0 && password !== confirmPassword
                                  ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                                  : 'border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                              }`}
                              placeholder="••••••••"
                            />
                          </div>
                          {confirmPassword.length > 0 && password !== confirmPassword && (
                            <p className="text-[10px] font-bold text-red-500 mt-1 ml-1 animate-in fade-in">
                              ⚠️ Passwords do not match each other
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Gender</label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-medium bg-white shadow-xs"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Center Access Code</label>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                              type="text"
                              required
                              value={baceCode}
                              onChange={(e) => setBaceCode(e.target.value.toUpperCase())}
                              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-xs font-mono font-bold bg-white uppercase shadow-xs"
                              placeholder="HALD-101"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword) || (phone.length > 0 && phone.length < 10)}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
                      >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                        <span>{loading ? 'Validating & Sending Code...' : 'Create Account →'}</span>
                      </button>

                      {/* Already have an account link */}
                      <div className="text-center pt-2">
                        <p className="text-xs font-semibold text-slate-500">
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setIsSignUp(false);
                              setError(null);
                              setSuccessMessage(null);
                            }}
                            className="font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer transition-colors"
                          >
                            Sign in →
                          </button>
                        </p>
                      </div>
                    </form>
                  )}

                  {/* STEP 2: VERIFY EMAIL */}
                  {signupStep === 'verify' && (
                    <form onSubmit={handleStep2VerifyEmail} className="space-y-4 py-2 animate-fade-in">
                      <div className="bg-orange-50/80 border border-orange-200/80 p-4 rounded-2xl text-center space-y-3">
                        <div className="w-12 h-12 bg-white text-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-orange-100">
                          <Mail size={24} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900">Verify your email</h3>
                          <p className="text-xs font-medium text-slate-600 mt-1">
                            We've sent a 6-digit verification code to <span className="font-bold text-slate-900">{maskEmail(email)}</span>.
                          </p>
                        </div>

                        <div className="pt-2">
                          <input
                            type="text"
                            maxLength={6}
                            required
                            autoFocus
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full max-w-[220px] text-center px-4 py-3 border-2 border-orange-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all text-xl font-mono font-black tracking-[0.4em] bg-white shadow-xs"
                            placeholder="••••••"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || otpInput.trim().length < 6}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        <span>{loading ? 'Verifying Code...' : 'Verify Email'}</span>
                      </button>

                      <div className="flex items-center justify-between text-xs font-bold pt-1">
                        <button
                          type="button"
                          disabled={resendTimer > 0 || loading}
                          onClick={handleResendSignupOtp}
                          className="text-orange-600 hover:text-orange-700 disabled:text-slate-400 cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <RefreshCw size={12} className={resendTimer > 0 ? 'animate-spin' : ''} />
                          <span>{resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend OTP'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setSignupStep('create'); setError(null); setSuccessMessage(null); }}
                          className="text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                        >
                          Change email
                        </button>
                      </div>
                    </form>
                  )}

                  {/* STEP 3: ACCOUNT READY */}
                  {signupStep === 'ready' && (
                    <div className="py-6 text-center space-y-5 animate-fade-in">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-md border border-emerald-200">
                        <CheckCircle2 size={36} />
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          Welcome to {verifiedBaceName}! 🎉
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                          Your account has been created and verified successfully. You are now ready to track your daily sadhana and spiritual targets.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleStep3Continue}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                        <span>{loading ? 'Logging in...' : 'Continue to AI Sadhna Coach →'}</span>
                      </button>
                    </div>
                  )}
                </>
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

          {/* RIGHT PANEL - SINGLE FULL BOX IMAGE WITH OVERLAY */}
          <div className="hidden lg:block w-1/2 relative overflow-hidden bg-[#FFF3E6]">
            <img
              src={loginImg}
              alt="Sadhana Track Login"
              className="w-full h-full object-cover object-left"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-10 text-white z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold w-fit mb-3">
                <Sparkles size={14} className="text-amber-300 fill-amber-300" />
                <span>AI-Powered Spiritual Growth Platform</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight leading-tight mb-2">
                Transform Your Daily Sadhana Journey
              </h3>
              <p className="text-sm font-medium text-slate-200 max-w-md leading-relaxed">
                Track Japa, rise times, and scriptural study with personalized AI mentoring grounded in your center's benchmarks.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md p-6 sm:p-8 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Reset Password</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {forgotStep === 'email' && 'Enter your email address to receive a 6-digit OTP code.'}
                {forgotStep === 'otp' && `We sent a 6-digit OTP code to ${forgotEmail}.`}
                {forgotStep === 'new_password' && 'Enter your new password below.'}
              </p>
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 'email' && (
              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-sm font-medium bg-white"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                  <span>{forgotLoading ? 'Sending OTP...' : 'Send OTP Code'}</span>
                </button>
              </form>
            )}

            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">6-Digit OTP Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center px-4 py-3 border-2 border-orange-300 rounded-xl focus:border-orange-500 outline-none text-xl font-mono font-black tracking-[0.4em]"
                    placeholder="••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || forgotOtp.trim().length < 6}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? <Loader2 className="animate-spin" size={16} /> : null}
                  <span>{forgotLoading ? 'Verifying...' : 'Verify OTP'}</span>
                </button>
              </form>
            )}

            {forgotStep === 'new_password' && (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none text-sm font-medium bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                  <span>{forgotLoading ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
