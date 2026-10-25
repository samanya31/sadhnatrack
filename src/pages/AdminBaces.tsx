import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase, registerUserWithoutLoggingIn } from '../lib/supabase';
import { sendBrevoCenterApprovedEmail } from '../lib/brevo';
import type { BACE } from '../types/index';
import { 
  Building2, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  UserCheck,
  UserPlus,
  X,
  Eye,
  EyeOff,
  MapPin,
  Users,
  Mail,
  Phone,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminBaces = () => {
  const [baces, setBaces] = useState<BACE[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingBace, setIsAddingBace] = useState(false);
  const [newBaceName, setNewBaceName] = useState('');
  const [newBaceAccessKey, setNewBaceAccessKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedBace, setSelectedBace] = useState<BACE | null>(null);
  const [centerAdmins, setCenterAdmins] = useState<any[]>([]);
  const [allAdminsList, setAllAdminsList] = useState<any[]>([]);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminAddMode, setAdminAddMode] = useState<'allot' | 'register'>('allot');
  const [selectedExistingAdminId, setSelectedExistingAdminId] = useState<string>('');
  const [adminData, setAdminData] = useState({ fullName: '', email: '', password: '' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Center In-Charge Requests Management
  const [activeTab, setActiveTab] = useState<'centers' | 'requests'>('centers');
  const [centerRequests, setCenterRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<any | null>(null);
  const [approvalCenterName, setApprovalCenterName] = useState('');
  const [approvalAccessKey, setApprovalAccessKey] = useState('');
  const [approvingLoading, setApprovingLoading] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingLoading, setRejectingLoading] = useState(false);

  useEffect(() => {
    fetchBaces();
    fetchAllAdmins();
    fetchCenterRequests();
  }, []);

  const fetchBaces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('baces')
      .select('*')
      .order('name');
    
    if (error) console.error('Error fetching BACEs:', error);
    else setBaces(data || []);
    setLoading(false);
  };

  const fetchAllAdmins = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('full_name');
    setAllAdminsList(data || []);
  };

  const fetchCenterAdmins = async (baceId: string) => {
    // 1. Fetch direct bace_id matches
    const { data: directData } = await supabase
      .from('profiles')
      .select('*')
      .eq('bace_id', baceId)
      .in('role', ['admin', 'super_admin']);

    // 2. Fetch admin_baces junction matches
    let junctionAdmins: any[] = [];
    try {
      const { data: junctionData } = await supabase
        .from('admin_baces')
        .select('admin:profiles(*)')
        .eq('bace_id', baceId);
      junctionAdmins = (junctionData || []).map((j: any) => j.admin).filter(Boolean);
    } catch (e) {
      console.warn('admin_baces table query skipped:', e);
    }

    const directAdmins = directData || [];

    // Merge and deduplicate by id
    const adminMap = new Map();
    [...directAdmins, ...junctionAdmins].forEach(admin => {
      adminMap.set(admin.id, admin);
    });

    setCenterAdmins(Array.from(adminMap.values()));
  };

  useEffect(() => {
    if (selectedBace) {
      fetchCenterAdmins(selectedBace.id);
    }
  }, [selectedBace]);

  const handleAddBace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaceName.trim()) return;

    setSubmitting(true);
    const { error } = await supabase
      .from('baces')
      .insert([{ 
        name: newBaceName.trim(),
        access_key: newBaceAccessKey.trim() 
      }]);

    if (error) {
      alert('Error adding BACE: ' + error.message);
    } else {
      setNewBaceName('');
      setNewBaceAccessKey('');
      setIsAddingBace(false);
      fetchBaces();
    }
    setSubmitting(false);
  };

  const handleDeleteBace = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this BACE? This may affect users assigned to it.')) return;

    const { error } = await supabase
      .from('baces')
      .delete()
      .eq('id', id);

    if (error) alert('Error deleting BACE: ' + error.message);
    else fetchBaces();
  };

  const filteredBaces = baces.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAllotExistingAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBace || !selectedExistingAdminId) return;
    setAdminLoading(true);

    try {
      // 1. Try RPC function
      const { error: rpcError } = await supabase.rpc('allot_admin_to_bace', {
        p_admin_id: selectedExistingAdminId,
        p_bace_id: selectedBace.id
      });

      if (rpcError) {
        // Fallback: direct insert to admin_baces and role update
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', selectedExistingAdminId);
        const { error: insertError } = await supabase
          .from('admin_baces')
          .insert({ admin_id: selectedExistingAdminId, bace_id: selectedBace.id });
        if (insertError) throw insertError;
      }

      alert('Admin allotted to center successfully!');
      setSelectedExistingAdminId('');
      setIsAddingAdmin(false);
      fetchCenterAdmins(selectedBace.id);
      fetchAllAdmins();
    } catch (err: any) {
      alert('Error allotting admin: ' + err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBace) return;
    setAdminLoading(true);
    
    try {
      // Use isolated secondary client so current super admin session is NOT logged out!
      const { data: signUpData, error: signUpError } = await registerUserWithoutLoggingIn(
        adminData.email,
        adminData.password,
        {
          data: {
            full_name: adminData.fullName,
            role: 'admin',
            bace_id: selectedBace.id,
            created_by_admin: true
          }
        }
      );

      if (signUpError) throw signUpError;
      
      // Also insert into admin_baces junction table if user was created
      if (signUpData?.user) {
        await supabase
          .from('admin_baces')
          .insert({ admin_id: signUpData.user.id, bace_id: selectedBace.id });
      }

      alert('Admin registered successfully! They can log in using their email and password.');
      setAdminData({ fullName: '', email: '', password: '' });
      setIsAddingAdmin(false);
      fetchCenterAdmins(selectedBace.id);
      fetchAllAdmins();
    } catch (err: any) {
      alert('Error creating admin: ' + err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRemoveAdminFromCenter = async (adminId: string) => {
    if (!selectedBace) return;
    if (!window.confirm('Remove this admin from managing this center?')) return;

    try {
      await supabase.rpc('remove_admin_from_bace', {
        p_admin_id: adminId,
        p_bace_id: selectedBace.id
      });

      await supabase
        .from('admin_baces')
        .delete()
        .eq('admin_id', adminId)
        .eq('bace_id', selectedBace.id);

      fetchCenterAdmins(selectedBace.id);
    } catch (err: any) {
      alert('Error removing admin: ' + err.message);
    }
  };

  const fetchCenterRequests = async () => {
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from('center_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching center_requests:', error);
        setCenterRequests([]);
      } else {
        setCenterRequests(data || []);
      }
    } catch (e) {
      console.warn('center_requests fetch failed:', e);
      setCenterRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const generateAccessKey = (name: string) => {
    const cleanPrefix = name
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'BACE';
    const num = Math.floor(100 + Math.random() * 900);
    return `${cleanPrefix}-${num}`;
  };

  const handleOpenApproveModal = (req: any) => {
    setSelectedRequestForApproval(req);
    setApprovalCenterName(req.center_name);
    setApprovalAccessKey(generateAccessKey(req.center_name));
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestForApproval || !approvalCenterName.trim() || !approvalAccessKey.trim()) return;

    setApprovingLoading(true);
    try {
      const cleanCenterName = approvalCenterName.trim();
      const cleanAccessKey = approvalAccessKey.trim().toUpperCase();
      const req = selectedRequestForApproval;

      // 1. Create BACE entry
      const { data: baceData, error: baceError } = await supabase
        .from('baces')
        .insert([{
          name: cleanCenterName,
          access_key: cleanAccessKey
        }])
        .select()
        .single();

      if (baceError) throw baceError;

      // 2. Register Center In-charge user account as Admin
      const defaultPassword = req.password || 'Spiritual@108';
      const { data: signUpData, error: signUpError } = await registerUserWithoutLoggingIn(
        req.email,
        defaultPassword,
        {
          data: {
            full_name: req.full_name,
            phone: req.phone,
            role: 'admin',
            bace_id: baceData.id,
            created_by_admin: true,
            force_password_change: false
          }
        }
      );

      if (signUpError && !signUpError.message?.includes('already registered')) {
        throw signUpError;
      }

      // 3. Link into admin_baces junction table
      const adminUserId = signUpData?.user?.id;
      if (adminUserId) {
        await supabase
          .from('admin_baces')
          .insert({ admin_id: adminUserId, bace_id: baceData.id });
      }

      // 4. Update request status to 'approved'
      await supabase
        .from('center_requests')
        .update({
          status: 'approved',
          bace_id: baceData.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', req.id);

      // 5. Send Brevo welcome email with Center Access Code & onboarding instructions
      const loginUrl = window.location.origin + '/login';
      await sendBrevoCenterApprovedEmail({
        toEmail: req.email,
        inchargeName: req.full_name,
        centerName: cleanCenterName,
        accessCode: cleanAccessKey,
        loginUrl
      });

      alert(`🎉 Center "${cleanCenterName}" approved successfully!\n\nAccess code "${cleanAccessKey}" and instructions have been emailed to ${req.email}.`);
      setSelectedRequestForApproval(null);
      fetchBaces();
      fetchCenterRequests();
    } catch (err: any) {
      alert('Error approving center: ' + err.message);
    } finally {
      setApprovingLoading(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectingRequest) return;
    setRejectingLoading(true);
    try {
      await supabase
        .from('center_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          reviewed_at: new Date().toISOString()
        })
        .eq('id', rejectingRequest.id);

      alert('Request marked as rejected.');
      setRejectingRequest(null);
      setRejectionReason('');
      fetchCenterRequests();
    } catch (err: any) {
      alert('Error rejecting request: ' + err.message);
    } finally {
      setRejectingLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
                <Building2 size={24} />
              </div>
              BACE Centers
            </h1>
            <p className="text-slate-500 font-bold mt-2 uppercase tracking-[0.2em] text-xs">
              Manage Bhaktivedanta Academy Centers
            </p>
          </div>

          <button
            onClick={() => setIsAddingBace(true)}
            className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
          >
            <Plus size={18} />
            Create New BACE
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-soft hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                <Building2 size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Centers</p>
                <p className="text-2xl font-black text-slate-900">{baces.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-soft hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Leader Requests</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-slate-900">
                    {centerRequests.filter(r => r.status === 'pending').length}
                  </p>
                  {centerRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full">
                      Needs Review
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-soft hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Approved Requests</p>
                <p className="text-2xl font-black text-slate-900">
                  {centerRequests.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('centers')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'centers'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Building2 size={16} />
            <span>Active Centers ({baces.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Center In-charge Requests</span>
            {centerRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] rounded-full animate-pulse">
                {centerRequests.filter(r => r.status === 'pending').length} Pending
              </span>
            )}
          </button>
        </div>

        {activeTab === 'centers' ? (
          /* Search and List Section */
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-soft overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search centers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500/20 transition-all font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <Loader2 size={40} className="text-primary-600 animate-spin" />
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Loading centers...</p>
                </div>
              ) : filteredBaces.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">BACE Name</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Key (Password)</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Created Date</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredBaces.map((bace) => (
                      <tr 
                        key={bace.id} 
                        onClick={() => setSelectedBace(bace)}
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all">
                              <ShieldCheck size={20} />
                            </div>
                            <span className="font-black text-slate-900">{bace.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block border border-amber-100">
                            {bace.access_key || 'No Key Set'}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs font-mono text-slate-400">{bace.id}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
                            <Calendar size={14} className="text-slate-300" />
                            {format(new Date(bace.created_at), 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBace(bace.id);
                              }}
                              className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 size={18} />
                            </button>
                            <ChevronRight size={18} className="text-slate-200 group-hover:translate-x-1 transition-all" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-32">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-6">
                    <Building2 size={40} />
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No centers found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CENTER INCHARGE REQUESTS SECTION */
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-soft overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Center In-charge Applications</span>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-black rounded-full">
                    {centerRequests.length} Total
                  </span>
                </h3>
                <p className="text-slate-500 font-medium text-xs mt-1">
                  Review registrations from youth leaders and center coordinators requesting access codes.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchCenterRequests}
                disabled={requestsLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer self-start md:self-auto"
              >
                {requestsLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>Refresh Requests</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              {requestsLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                  <Loader2 size={40} className="text-blue-600 animate-spin" />
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Loading requests...</p>
                </div>
              ) : centerRequests.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Applicant</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested Center</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Students & Notes</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {centerRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-black">
                              {req.full_name ? req.full_name[0] : 'L'}
                            </div>
                            <div>
                              <span className="text-sm font-black text-slate-900 block">{req.full_name}</span>
                              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                                <span className="flex items-center gap-1"><Mail size={12} /> {req.email}</span>
                                {req.phone && <span className="flex items-center gap-1 font-mono"><Phone size={12} /> {req.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-6">
                          <div>
                            <span className="text-sm font-black text-slate-900 block">{req.center_name}</span>
                            {req.location && (
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                <MapPin size={12} className="text-slate-400" /> {req.location}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-8 py-6 text-xs text-slate-600 font-medium max-w-xs">
                          {req.student_count > 0 && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg font-bold text-slate-700 mb-1">
                              <Users size={12} />
                              <span>~{req.student_count} students</span>
                            </div>
                          )}
                          {req.notes && <p className="text-slate-500 line-clamp-2 italic">"{req.notes}"</p>}
                        </td>

                        <td className="px-8 py-6 text-slate-500 font-bold text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" />
                            {req.created_at ? format(new Date(req.created_at), 'MMM dd, yyyy') : 'N/A'}
                          </div>
                        </td>

                        <td className="px-8 py-6 whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <span>Pending Review</span>
                            </span>
                          ) : req.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-xs font-bold">
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>

                        <td className="px-8 py-6 text-right whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(req)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 size={14} />
                                <span>Review & Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingRequest(req);
                                  setRejectionReason('');
                                }}
                                className="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : req.status === 'approved' ? (
                            <span className="text-xs font-bold text-emerald-600">Active Center</span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">{req.rejection_reason || 'Rejected'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-32">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mx-auto mb-6">
                    <ShieldCheck size={40} />
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No leader applications yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add BACE Modal */}
      {isAddingBace && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                <Plus size={20} />
              </div>
              Create Center
            </h2>
            <form onSubmit={handleAddBace} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                  BACE Name (e.g. BACE Delhi)
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={newBaceName}
                  onChange={(e) => setNewBaceName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500/20 transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="Enter center name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                  Access Password (for registration)
                </label>
                <input
                  type="text"
                  required
                  value={newBaceAccessKey}
                  onChange={(e) => setNewBaceAccessKey(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500/20 transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="e.g. DELHI2026"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddingBace(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="flex-1 px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Create Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Center Management Modal */}
      {selectedBace && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300 relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedBace(null)}
              className="absolute right-8 top-8 w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-all cursor-pointer"
            >
              <X size={24} />
            </button>

            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                  <ShieldCheck size={24} />
                </div>
                {selectedBace.name}
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 ml-16">
                Center Administration
              </p>
            </div>

            <div className="space-y-8">
              {/* Current Admins */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Assigned Admins</h3>
                  <button 
                    onClick={() => setIsAddingAdmin(true)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={14} />
                    Add Center Admin
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {centerAdmins.map(admin => (
                    <div key={admin.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400 text-sm shrink-0">
                          {admin.full_name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate">{admin.full_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{admin.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAdminFromCenter(admin.id)}
                        className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shrink-0 cursor-pointer"
                        title="Remove allotment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {centerAdmins.length === 0 && !isAddingAdmin && (
                    <div className="col-span-full py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No admins assigned yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Admin Form (Allot Pre-Existing vs Register New) */}
              {isAddingAdmin && (
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-primary-100 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Allot or Register Admin</h4>
                    
                    {/* Toggle Tabs */}
                    <div className="flex bg-slate-200/60 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setAdminAddMode('allot')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminAddMode === 'allot'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <UserCheck size={12} />
                        Allot Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminAddMode('register')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                          adminAddMode === 'register'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <UserPlus size={12} />
                        Register New
                      </button>
                    </div>
                  </div>

                  {adminAddMode === 'allot' ? (
                    /* Allot Existing Admin Form */
                    <form onSubmit={handleAllotExistingAdmin} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Select Existing Admin User
                        </label>
                        <select
                          required
                          value={selectedExistingAdminId}
                          onChange={e => setSelectedExistingAdminId(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 outline-none transition-all cursor-pointer"
                        >
                          <option value="">Select an admin to assign...</option>
                          {allAdminsList.map(admin => (
                            <option key={admin.id} value={admin.id}>
                              {admin.full_name || admin.email} ({admin.email})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setIsAddingAdmin(false)}
                          className="flex-1 py-3 bg-white text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-100 transition-all border border-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={adminLoading || !selectedExistingAdminId}
                          className="flex-1 py-3 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 cursor-pointer"
                        >
                          {adminLoading ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Allot to Center'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Register New Admin Form */
                    <form onSubmit={handleCreateAdmin} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                          <input
                            required
                            value={adminData.fullName}
                            onChange={e => setAdminData({...adminData, fullName: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                            placeholder="John Doe"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                          <input
                            type="email"
                            required
                            value={adminData.email}
                            onChange={e => setAdminData({...adminData, email: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                            placeholder="admin@example.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temporary Password</label>
                        <div className="relative">
                          <input
                            type={showAdminPassword ? 'text' : 'password'}
                            required
                            value={adminData.password}
                            onChange={e => setAdminData({...adminData, password: e.target.value})}
                            className="w-full pl-4 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                            tabIndex={-1}
                          >
                            {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setIsAddingAdmin(false)}
                          className="flex-1 py-3 bg-white text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-100 transition-all border border-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={adminLoading}
                          className="flex-1 py-3 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 cursor-pointer"
                        >
                          {adminLoading ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Register & Assign'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review & Approve Center In-charge Modal */}
      {selectedRequestForApproval && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <button
              onClick={() => setSelectedRequestForApproval(null)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Super Admin Verification</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Approve Center In-charge</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Verify center details and assign a unique Center Access Code. A welcome email will be dispatched automatically upon approval.
              </p>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Leader Name</span>
                  <span className="font-black text-slate-900">{selectedRequestForApproval.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Email Address</span>
                  <span className="font-bold text-slate-700">{selectedRequestForApproval.email}</span>
                </div>
                {selectedRequestForApproval.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Mobile</span>
                    <span className="font-mono font-bold text-slate-700">{selectedRequestForApproval.phone}</span>
                  </div>
                )}
                {selectedRequestForApproval.location && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Location</span>
                    <span className="font-bold text-slate-700">{selectedRequestForApproval.location}</span>
                  </div>
                )}
                {selectedRequestForApproval.student_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Est. Students</span>
                    <span className="font-bold text-blue-700">~{selectedRequestForApproval.student_count} devotees</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
                  Confirm Center / BACE Name
                </label>
                <input
                  type="text"
                  required
                  value={approvalCenterName}
                  onChange={(e) => setApprovalCenterName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="e.g. ISKCON Youth Forum Pune"
                />
              </div>

              <div>
                <div className="flex items-center justify-between ml-1 mb-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Generated Center Access Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setApprovalAccessKey(generateAccessKey(approvalCenterName))}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    Regenerate Code ↻
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={approvalAccessKey}
                  onChange={(e) => setApprovalAccessKey(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-base font-black text-emerald-700 tracking-wider uppercase focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  placeholder="PUNE-101"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-1 ml-1">
                  Students will use this access code during signup to join this center.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Clicking approve will create the center in the database, activate the coordinator's admin account, and immediately email them their access code and student registration guidelines.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequestForApproval(null)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approvingLoading || !approvalCenterName.trim() || !approvalAccessKey.trim()}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {approvingLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>{approvingLoading ? 'Approving & Emailing...' : 'Approve & Send Code'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <h3 className="text-xl font-black text-slate-900 mb-2">Reject Center Application</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to reject the application for <strong>{rejectingRequest.center_name}</strong> by {rejectingRequest.full_name}?
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">
                  Rejection Reason (Optional)
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 outline-none"
                  placeholder="e.g. Duplicate request or center already registered"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingRequest(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rejectingLoading}
                  onClick={handleConfirmRejection}
                  className="flex-1 py-3 bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  {rejectingLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
