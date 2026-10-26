import React, { useState, useEffect } from 'react';
import { StudentLayout } from '../components/StudentLayout';
import { supabase } from '../lib/supabase';
import { sendBrevoOtpEmail } from '../lib/brevo';
import { 
  Lock, 
  Trash2, 
  HelpCircle, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Mail, 
  ChevronDown, 
  Search, 
  Building2, 
  X,
  KeyRound
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
  id: string;
  category: 'sadhana' | 'standards' | 'streaks' | 'targets' | 'coach' | 'account';
  question: string;
  answer: string;
}

const FAQS_DATA: FAQItem[] = [
  {
    id: 'faq-score',
    category: 'sadhana',
    question: 'How is the Daily Sadhana Score calculated?',
    answer: 'Your Daily Score (out of 100%) is calculated across core spiritual disciplines: Rising Time (waking before 5:00 AM earns maximum points), Japa Chanting (target 16 rounds distributed across morning, noon, and evening), Hearing Srila Prabhupada lectures, Reading scriptures (Bhagavad-gita, Srimad Bhagavatam), attending Morning & Evening Aarti, and performing Devotional Service (Seva).'
  },
  {
    id: 'faq-past-entry',
    category: 'sadhana',
    question: 'Can I log or update sadhana for past dates?',
    answer: 'Yes! Go to "Today\'s Entry" or "Sadhana History". Click on the Date picker at the top of the logging form, select any previous date, fill in your details, and click "Submit Sadhana". Your logs for that date will be immediately updated.'
  },
  {
    id: 'faq-standards-diff',
    category: 'standards',
    question: 'What is the difference between Center Standards and Personal Standards?',
    answer: 'Center Standards are configured by your Center In-charge/BACE mentor to guide all students in the center toward collective benchmarks. Personal Standards are self-tailored goals for independent practitioners, allowing you to set your own target rounds, target wake-up time, and reading durations.'
  },
  {
    id: 'faq-configure-standards',
    category: 'standards',
    question: 'Can I chant fewer or more than 16 rounds?',
    answer: 'Yes. While 16 rounds is the recommended ISKCON standard for initiated or aspiring devotees, beginners and personal practitioners can customize their target number of rounds (e.g. 1, 4, 8, or 16) through the "Configure My Standards" button on the Dashboard.'
  },
  {
    id: 'faq-streaks',
    category: 'streaks',
    question: 'How are Sadhana Streaks calculated?',
    answer: 'A streak counts consecutive days on which you have actively submitted your sadhana entry. Simply logging into the app without submitting a daily sadhana log does NOT increment your streak.'
  },
  {
    id: 'faq-targets',
    category: 'targets',
    question: 'How do Spiritual Targets work?',
    answer: 'Under "Spiritual Targets", you can set focused spiritual habits for 7, 14, 21, or 30 days — such as chanting before 7:30 AM, reading 20 minutes daily, or minimizing screen time. Check off your targets daily to build consistent spiritual habits.'
  },
  {
    id: 'faq-ai-coach',
    category: 'coach',
    question: 'What does the AI Sadhna Coach do?',
    answer: 'The AI Sadhna Coach analyzes your historical sadhana logs, waking times, and chanting consistency over time to generate personalized spiritual reflections, gentle encouragement, and practical suggestions based on the teachings of Srila Prabhupada.'
  },
  {
    id: 'faq-privacy',
    category: 'coach',
    question: 'Is my sadhana data private?',
    answer: 'Yes! If you are a Personal Practitioner, only you can see your sadhana entries. If you are enrolled under an ISKCON Center, only you and your assigned Center Mentors/Admins have access to your entries for guidance and encouragement.'
  },
  {
    id: 'faq-switch-center',
    category: 'account',
    question: 'Can I switch from a Center to Personal Practice or vice versa?',
    answer: 'Yes. If you graduate from a BACE or change locations, you can transition to Personal Practice while retaining all your historical sadhana logs and targets. Contact your Center Administrator or Super Admin to adjust your enrollment.'
  },
  {
    id: 'faq-deletion-policy',
    category: 'account',
    question: 'Why do center students need email verification for account deletion?',
    answer: 'Students enrolled in a center have their progress mentored by BACE authorities. To prevent accidental deletion or unauthorized tampering, a two-step email verification code is required. In addition, Center Admins have the authorization to delete student records directly from their Center Directory.'
  },
  {
    id: 'faq-what-deleted',
    category: 'account',
    question: 'What happens when I delete my account?',
    answer: 'Account deletion is permanent and irreversible. All your daily sadhana logs, streak history, spiritual targets, custom benchmarks, and AI coach reflections will be immediately and completely erased from the database.'
  }
];

export const StudentSettings: React.FC = () => {
  const navigate = useNavigate();

  // User & Profile State
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'password' | 'faqs' | 'danger'>('password');

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Center Affiliation / Shift State
  const [centerAccessCode, setCenterAccessCode] = useState('');
  const [centerLoading, setCenterLoading] = useState(false);
  const [centerError, setCenterError] = useState<string | null>(null);
  const [centerSuccess, setCenterSuccess] = useState<string | null>(null);

  // Account Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteStep, setDeleteStep] = useState<'request' | 'otp'>('request');
  const [deleteOtpInput, setDeleteOtpInput] = useState('');
  const [deleteOtpSending, setDeleteOtpSending] = useState(false);
  const [deleteOtpError, setDeleteOtpError] = useState<string | null>(null);
  const [deleteOtpSuccess, setDeleteOtpSuccess] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // FAQs State
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-score');

  // Load User & Profile
  useEffect(() => {
    let mounted = true;
    const loadUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          navigate('/login');
          return;
        }

        if (mounted) setUser(authUser);

        const { data: prof } = await supabase
          .from('profiles')
          .select('*, bace:baces!bace_id(name)')
          .eq('id', authUser.id)
          .maybeSingle();

        if (mounted) {
          setProfile(prof || null);
          setLoadingProfile(false);
        }
      } catch (err) {
        console.error('Failed to load user profile in settings:', err);
        if (mounted) setLoadingProfile(false);
      }
    };

    loadUserData();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const baceData: any = profile?.bace;
  const centerName = Array.isArray(baceData) ? baceData[0]?.name : baceData?.name;
  const isPersonal = profile?.practice_type === 'personal' || (!profile?.bace_id && !centerName);

  const maskEmail = (em: string) => {
    if (!em) return '';
    const [name, dom] = em.split('@');
    if (!dom) return em;
    return `${name.slice(0, 1)}••••••@${dom}`;
  };

  // --- 1. Password Update Handler ---
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // Clear force_password_change if applicable
      await supabase
        .from('profiles')
        .update({ force_password_change: false })
        .eq('id', user?.id);

      setPasswordSuccess('Password successfully updated! Keep your new password secure.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // --- Center Affiliation: Join / Switch Center ---
  const handleJoinCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setCenterError(null);
    setCenterSuccess(null);

    const cleanCode = centerAccessCode.trim().toUpperCase();
    if (!cleanCode) {
      setCenterError('Please enter a Center Access Code.');
      return;
    }

    if (!user?.id) return;

    setCenterLoading(true);
    try {
      // 1. Verify access code via RPC or table
      let baceId: string | null = null;
      let targetBaceName: string | null = null;

      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('get_bace_by_access_key', {
          key_input: cleanCode
        });
        if (!rpcErr && rpcData && rpcData.length > 0) {
          baceId = rpcData[0].id;
          targetBaceName = rpcData[0].name;
        }
      } catch {
        // Fallback
      }

      if (!baceId) {
        const { data: tableData } = await supabase
          .from('baces')
          .select('id, name')
          .eq('access_key', cleanCode)
          .maybeSingle();

        if (tableData) {
          baceId = tableData.id;
          targetBaceName = tableData.name;
        }
      }

      if (!baceId || !targetBaceName) {
        throw new Error('Invalid Center Access Code. Please ask your center coordinator for the access code (e.g. HALD-101).');
      }

      // 2. Update user profile to center mode
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          bace_id: baceId,
          practice_type: 'center'
        })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      // 3. Update auth metadata
      try {
        await supabase.auth.updateUser({
          data: {
            bace_id: baceId,
            practice_type: 'center'
          }
        });
      } catch {
        // ignore
      }

      // 4. Update local state
      setProfile((prev: any) => ({
        ...prev,
        bace_id: baceId,
        practice_type: 'center',
        bace: { name: targetBaceName }
      }));

      setCenterSuccess(`🎉 Successfully shifted to "${targetBaceName}"! Your sadhana entries and streaks are preserved, and your center mentor can now guide you.`);
      setCenterAccessCode('');
    } catch (err: any) {
      setCenterError(err.message || 'Failed to enroll in center. Please check the code.');
    } finally {
      setCenterLoading(false);
    }
  };

  // --- Center Affiliation: Switch to Personal Practice ---
  const handleSwitchToPersonal = async () => {
    if (!user?.id) return;
    setCenterLoading(true);
    setCenterError(null);
    setCenterSuccess(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bace_id: null,
          practice_type: 'personal'
        })
        .eq('id', user.id);

      if (error) throw error;

      try {
        await supabase.auth.updateUser({
          data: {
            bace_id: null,
            practice_type: 'personal'
          }
        });
      } catch {
        // ignore
      }

      setProfile((prev: any) => ({
        ...prev,
        bace_id: null,
        practice_type: 'personal',
        bace: null
      }));

      setCenterSuccess('🪷 You have switched to Personal Practice! You can configure your personal sadhana standards anytime on the Dashboard.');
    } catch (err: any) {
      setCenterError(err.message || 'Failed to switch to personal practice.');
    } finally {
      setCenterLoading(false);
    }
  };

  // --- 2. Account Deletion: Send OTP (For Center Students) ---
  const handleSendDeletionOtp = async () => {
    if (!user?.email) return;
    setDeleteOtpSending(true);
    setDeleteOtpError(null);
    setDeleteOtpSuccess(null);

    try {
      const cleanEmail = user.email.toLowerCase().trim();
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store in password_otps
      await supabase.from('password_otps').insert({
        email: cleanEmail,
        otp_code: generatedOtp,
        type: 'deletion',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      // Send via Brevo
      const apiKey = import.meta.env.VITE_BREVO_API_KEY;
      if (apiKey) {
        await sendBrevoOtpEmail(cleanEmail, generatedOtp, 'deletion', centerName);
      }

      setDeleteStep('otp');
      setResendTimer(30);
      setDeleteOtpSuccess(`A 6-digit security verification code has been sent to ${maskEmail(cleanEmail)}.`);
    } catch (err: any) {
      setDeleteOtpError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setDeleteOtpSending(false);
    }
  };

  // --- 3. Execute Account Deletion ---
  const handleConfirmAccountDeletion = async () => {
    if (!user?.id) return;
    setDeleteOtpError(null);

    // Verify confirmation text
    if (deleteConfirmationText.trim().toLowerCase() !== 'delete') {
      setDeleteOtpError('Please type "delete" to confirm your decision.');
      return;
    }

    // For Center Students, verify OTP
    if (!isPersonal) {
      const cleanEmail = user.email?.toLowerCase().trim() || '';
      const cleanOtp = deleteOtpInput.trim();

      if (cleanOtp.length !== 6) {
        setDeleteOtpError('Please enter the 6-digit code sent to your email.');
        return;
      }

      const { data: dbOtps, error: otpErr } = await supabase
        .from('password_otps')
        .select('*')
        .eq('email', cleanEmail)
        .eq('otp_code', cleanOtp)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (otpErr || !dbOtps || dbOtps.length === 0) {
        setDeleteOtpError('Invalid or expired verification code. Please check your email or resend a new code.');
        return;
      }

      // Delete used OTP
      await supabase.from('password_otps').delete().eq('id', dbOtps[0].id);
    }

    setDeletingAccount(true);

    try {
      const userId = user.id;

      // 1. Try deleting via RPC function
      let rpcSucceeded = false;
      try {
        const { error: rpcErr } = await supabase.rpc('delete_user_account', { target_user_id: userId });
        if (!rpcErr) {
          rpcSucceeded = true;
        }
      } catch {
        rpcSucceeded = false;
      }

      // 2. Direct database cleanup fallback
      if (!rpcSucceeded) {
        await supabase.from('sadhana_entries').delete().eq('user_id', userId);
        await supabase.from('sadhana_targets').delete().eq('user_id', userId);
        await supabase.from('profiles').delete().eq('id', userId);
      }

      // 3. Sign out cleanly
      await supabase.auth.signOut({ scope: 'local' });

      // 4. Redirect to login
      window.location.href = '/login?deleted=true';
    } catch (err: any) {
      setDeleteOtpError(err.message || 'Failed to complete account deletion. Please try again.');
      setDeletingAccount(false);
    }
  };

  // Filtered FAQs
  const filteredFaqs = FAQS_DATA.filter(faq => {
    const matchesCategory = selectedFaqCategory === 'all' || faq.category === selectedFaqCategory;
    const matchesQuery = 
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) || 
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  if (loadingProfile) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="animate-spin text-primary-600" size={36} />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
        
        {/* Header Banner */}
        <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-primary-50/50 via-orange-50/30 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-primary-50 text-primary-700 font-black text-[10px] uppercase tracking-wider rounded-full border border-primary-100/50">
                  Account Management
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPersonal ? 'bg-emerald-500' : 'bg-primary-500'}`} />
                  {isPersonal ? 'Personal Practice 🪷' : `${centerName || 'BACE'} Student 🏛️`}
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                Account & Spiritual Settings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Manage your credentials, explore practitioner FAQs, and configure account security.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-right hidden md:block">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed In As</p>
                <p className="text-xs font-black text-slate-800 truncate max-w-[180px]">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Mobile-Optimized Segmented Control (Zero Horizontal Swiping) */}
          <div className="mt-5 sm:mt-8">
            <div className="grid grid-cols-3 p-1 sm:p-1.5 bg-slate-100/90 rounded-2xl gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1.5 sm:px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${
                  activeTab === 'password'
                    ? 'bg-white text-primary-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <KeyRound size={15} className="shrink-0" />
                <span className="sm:hidden">Password</span>
                <span className="hidden sm:inline">Password & Center</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('faqs')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1.5 sm:px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${
                  activeTab === 'faqs'
                    ? 'bg-white text-primary-600 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <HelpCircle size={15} className="shrink-0" />
                <span className="sm:hidden">FAQs</span>
                <span className="hidden sm:inline">Sadhana FAQs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('danger')}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 sm:py-3 px-1.5 sm:px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer text-center ${
                  activeTab === 'danger'
                    ? 'bg-white text-red-600 shadow-sm border border-red-200/60'
                    : 'text-slate-500 hover:text-red-600 hover:bg-white/50'
                }`}
              >
                <Trash2 size={15} className="shrink-0" />
                <span className="sm:hidden">Delete</span>
                <span className="hidden sm:inline">Account Deletion</span>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PASSWORD & CENTER AFFILIATION */}
        {/* ======================================================== */}
        {activeTab === 'password' && (
          <div className="space-y-6">
            {/* 1. Update Password Card */}
            <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border border-slate-100 shadow-sm space-y-6">
              <div className="max-w-xl">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-4">
                  <Lock size={22} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Update Password</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Enter your new password below. Make sure it is at least 6 characters long and easy for you to remember.
                </p>

                {passwordSuccess && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs font-bold animate-in fade-in duration-200">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs font-bold animate-in fade-in duration-200">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="mt-6 space-y-5">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter at least 6 characters"
                        className="w-full px-4 py-3.5 pr-12 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 font-bold text-sm outline-none transition-all bg-slate-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full px-4 py-3.5 pr-12 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 font-bold text-sm outline-none transition-all bg-slate-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full sm:w-auto px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* 2. Center Affiliation & Shift Card */}
            <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border border-slate-100 shadow-sm space-y-6">
              <div className="max-w-2xl">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 size={24} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-3 py-1 font-black text-[10px] uppercase tracking-wider rounded-full border ${
                    isPersonal ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}>
                    {isPersonal ? 'Personal Practitioner 🪷' : `Enrolled: ${centerName || 'Center Student 🏛️'}`}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {isPersonal ? 'Shift to an ISKCON Center / BACE' : 'Center Affiliation & Transfer'}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  {isPersonal
                    ? 'Decided to join an ISKCON center or BACE? Enter the unique Center Access Code given by your center in-charge. All your past sadhana logs, habit targets, and streak histories will be transferred seamlessly!'
                    : `You are currently enrolled under "${centerName || 'your center'}". Your daily sadhana logs are reviewed by your center mentor. You can transfer to another center using an access code, or return to personal practice.`}
                </p>

                {centerSuccess && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs font-bold animate-in fade-in duration-200">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{centerSuccess}</span>
                  </div>
                )}

                {centerError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs font-bold animate-in fade-in duration-200">
                    <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                    <span>{centerError}</span>
                  </div>
                )}

                <form onSubmit={handleJoinCenter} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      {isPersonal ? 'Enter Center Access Code' : 'Transfer to Another Center (New Access Code)'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={centerAccessCode}
                        onChange={(e) => setCenterAccessCode(e.target.value.toUpperCase())}
                        placeholder="e.g. HALD-101 or BACE-DELHI"
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 font-mono font-bold text-sm tracking-wider uppercase outline-none transition-all bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={centerLoading || !centerAccessCode.trim()}
                      className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {centerLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Verifying & Enrolling...</span>
                        </>
                      ) : (
                        <>
                          <Building2 size={16} />
                          <span>{isPersonal ? 'Verify & Join Center' : 'Transfer to New Center'}</span>
                        </>
                      )}
                    </button>

                    {!isPersonal && (
                      <button
                        type="button"
                        onClick={handleSwitchToPersonal}
                        disabled={centerLoading}
                        className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        Leave Center (Shift to Personal)
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: FAQS */}
        {/* ======================================================== */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            {/* Search and Category Filter */}
            <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Guidance on sadhana logging, benchmarks, streaks, targets, and account features.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 transition-all bg-slate-50/50"
                  />
                  {faqSearch && (
                    <button
                      onClick={() => setFaqSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                {[
                  { id: 'all', label: 'All Questions' },
                  { id: 'sadhana', label: 'Sadhana & Scoring' },
                  { id: 'standards', label: 'Standards & Rounds' },
                  { id: 'streaks', label: 'Streaks' },
                  { id: 'targets', label: 'Spiritual Targets' },
                  { id: 'coach', label: 'AI Coach' },
                  { id: 'account', label: 'Account & Security' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedFaqCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      selectedFaqCategory === cat.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQs Accordion List */}
            <div className="space-y-3">
              {filteredFaqs.map(faq => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors cursor-pointer gap-4"
                    >
                      <span className="font-black text-sm text-slate-900 leading-snug">
                        {faq.question}
                      </span>
                      <div className={`p-1.5 rounded-lg text-slate-400 bg-slate-50 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary-600 bg-primary-50' : ''}`}>
                        <ChevronDown size={16} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-5 pt-1 text-xs text-slate-600 font-medium leading-relaxed border-t border-slate-50 bg-slate-50/30">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFaqs.length === 0 && (
                <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200">
                  <p className="text-slate-500 font-bold text-sm">No matching questions found.</p>
                  <p className="text-slate-400 text-xs mt-1">Try clearing your search term or selecting another category.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ACCOUNT DELETION (DANGER ZONE) */}
        {/* ======================================================== */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border border-red-100 shadow-sm space-y-6">
              <div>
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4">
                  <Trash2 size={22} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-red-50 text-red-700 font-black text-[10px] uppercase tracking-wider rounded-full border border-red-200">
                    Danger Zone
                  </span>
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-full">
                    {isPersonal ? 'Personal Practitioner' : `Center Enrolled: ${centerName || 'BACE'}`}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-3">Permanently Delete Account</h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 leading-relaxed">
                  Permanently remove your account and all associated spiritual tracking data from Sadhana Track.
                </p>
              </div>

              {/* What happens list */}
              <div className="p-5 bg-red-50/60 border border-red-200/80 rounded-2xl space-y-3">
                <p className="text-xs font-black text-red-900 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-600" />
                  What happens when you delete your account:
                </p>
                <ul className="text-xs text-red-800 space-y-1.5 list-disc list-inside font-medium">
                  <li>All daily sadhana entries, morning rising records, and chanting round logs are erased.</li>
                  <li>Your spiritual targets, streak histories, and badges are permanently reset.</li>
                  <li>AI Sadhna Coach personal reports and reflections are deleted.</li>
                  <li>Your login access and profile information cannot be recovered.</li>
                </ul>
              </div>

              {/* Contextual Notice Based on Center vs Personal */}
              {isPersonal ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
                  <p className="font-black flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Personal Practitioner (Direct Deletion)
                  </p>
                  <p className="text-slate-600 font-medium leading-relaxed">
                    Because you are a self-guided personal practitioner, you can directly delete your account. You will just need to type <span className="font-bold text-slate-900 font-mono">delete</span> in the confirmation modal.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
                  <p className="font-black flex items-center gap-2">
                    <Building2 size={16} className="text-amber-700" />
                    Center Student Verification Required
                  </p>
                  <p className="text-slate-700 font-medium leading-relaxed">
                    Because you are enrolled under <span className="font-bold text-amber-950">{centerName || 'your center'}</span>, two-step email verification via a 6-digit OTP code is required before your account can be deleted.
                  </p>
                  <p className="text-[11px] text-amber-800 font-semibold pt-1">
                    ℹ️ Alternatively, your Center Admin can also delete or remove your account directly from the Center Directory.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(true);
                    setDeleteStep('request');
                    setDeleteConfirmationText('');
                    setDeleteOtpInput('');
                    setDeleteOtpError(null);
                    setDeleteOtpSuccess(null);
                  }}
                  className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 size={16} />
                  <span>{isPersonal ? 'Delete My Personal Account' : 'Request Account Deletion (Verify OTP)'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* ACCOUNT DELETION CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteOtpError(null);
                setDeleteOtpSuccess(null);
              }}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-5">
              <AlertTriangle size={28} />
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">Confirm Account Deletion</h3>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              This action is <span className="font-bold text-red-600">permanent and cannot be undone</span>. All your logs, scores, and streak data will be lost forever.
            </p>

            {/* Error & Success Messages */}
            {deleteOtpError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-start gap-2">
                <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                <span>{deleteOtpError}</span>
              </div>
            )}

            {deleteOtpSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-start gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{deleteOtpSuccess}</span>
              </div>
            )}

            {/* === FLOW FOR PERSONAL PRACTITIONER (Direct text confirmation) === */}
            {isPersonal ? (
              <div className="mt-5 space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <p className="font-bold">Account: <span className="text-slate-900">{user?.email}</span></p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Mode: Personal Spiritual Sadhana</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Please type <span className="font-black text-red-600 font-mono">delete</span> to confirm deletion:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="delete"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 font-mono font-bold text-sm outline-none transition-all"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deletingAccount}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAccountDeletion}
                    disabled={deletingAccount || deleteConfirmationText.trim().toLowerCase() !== 'delete'}
                    className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Delete My Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* === FLOW FOR CENTER STUDENT (Email OTP Verification Required) === */
              <div className="mt-5 space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <p className="font-bold">Center: <span className="text-slate-900">{centerName || 'Assigned BACE'}</span></p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Email: {maskEmail(user?.email || '')}</p>
                </div>

                {deleteStep === 'request' ? (
                  <div className="space-y-4 pt-1">
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      To safeguard center records, click below to receive a 6-digit verification code at <span className="font-bold text-slate-900">{maskEmail(user?.email || '')}</span>.
                    </p>

                    <button
                      type="button"
                      onClick={handleSendDeletionOtp}
                      disabled={deleteOtpSending}
                      className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {deleteOtpSending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Sending Verification Code...</span>
                        </>
                      ) : (
                        <>
                          <Mail size={16} />
                          <span>Send 6-Digit Verification Code</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        Enter 6-Digit Email Code:
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={deleteOtpInput}
                        onChange={(e) => setDeleteOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full text-center px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 font-mono font-black text-xl tracking-[0.3em] outline-none transition-all"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        Type <span className="font-black text-red-600 font-mono">delete</span> to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmationText}
                        onChange={(e) => setDeleteConfirmationText(e.target.value)}
                        placeholder="delete"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 font-mono font-bold text-sm outline-none transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        type="button"
                        onClick={handleSendDeletionOtp}
                        disabled={resendTimer > 0 || deleteOtpSending}
                        className="text-primary-600 hover:underline font-bold disabled:text-slate-400 disabled:no-underline cursor-pointer"
                      >
                        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend verification code'}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteModal(false)}
                        disabled={deletingAccount}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmAccountDeletion}
                        disabled={
                          deletingAccount || 
                          deleteOtpInput.length !== 6 || 
                          deleteConfirmationText.trim().toLowerCase() !== 'delete'
                        }
                        className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {deletingAccount ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Deleting Account...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 size={16} />
                            <span>Verify & Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </StudentLayout>
  );
};
