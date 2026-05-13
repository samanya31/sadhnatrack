import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { supabase } from '../lib/supabase';
import type { BACE } from '../types/index';
import { 
  Building2, 
  Plus, 
  Search, 
  Loader2, 
  Trash2, 
  ChevronRight,
  ShieldCheck,
  Calendar
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
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminData, setAdminData] = useState({ fullName: '', email: '', password: '' });
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    fetchBaces();
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

  const fetchCenterAdmins = async (baceId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('bace_id', baceId)
      .eq('role', 'admin');
    setCenterAdmins(data || []);
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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBace) return;
    setAdminLoading(true);
    
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
          data: {
            full_name: adminData.fullName,
            role: 'admin',
            bace_id: selectedBace.id
          }
        }
      });

      if (signUpError) throw signUpError;
      
      alert('Admin created successfully! They can now log in.');
      setAdminData({ fullName: '', email: '', password: '' });
      setIsAddingAdmin(false);
      fetchCenterAdmins(selectedBace.id);
    } catch (err: any) {
      alert('Error creating admin: ' + err.message);
    } finally {
      setAdminLoading(false);
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
            className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition-all hover:scale-105 active:scale-95 shadow-xl"
          >
            <Plus size={18} />
            Create New BACE
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-soft hover:shadow-md transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                <Building2 size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Centers</p>
                <p className="text-2xl font-black text-slate-900">{baces.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and List Section */}
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
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={submitting}
                  className="flex-1 px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
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
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => setSelectedBace(null)}
              className="absolute right-8 top-8 w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-all"
            >
              <Plus size={24} className="rotate-45" />
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
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all flex items-center gap-2"
                  >
                    <Plus size={14} />
                    Add New Admin
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {centerAdmins.map(admin => (
                    <div key={admin.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-400 text-sm">
                        {admin.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate">{admin.full_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest">{admin.email}</p>
                      </div>
                    </div>
                  ))}
                  {centerAdmins.length === 0 && !isAddingAdmin && (
                    <div className="col-span-full py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No admins assigned yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Admin Form */}
              {isAddingAdmin && (
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-primary-100 animate-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Register Center Admin</h4>
                  <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                        <input
                          required
                          value={adminData.fullName}
                          onChange={e => setAdminData({...adminData, fullName: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
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
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temporary Password</label>
                      <input
                        type="password"
                        required
                        value={adminData.password}
                        onChange={e => setAdminData({...adminData, password: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setIsAddingAdmin(false)}
                        className="flex-1 py-3 bg-white text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={adminLoading}
                        className="flex-1 py-3 bg-primary-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50"
                      >
                        {adminLoading ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Confirm Registration'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
