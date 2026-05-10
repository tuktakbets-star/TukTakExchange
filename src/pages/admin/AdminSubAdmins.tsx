import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  Wallet, 
  Ban, 
  History, 
  ChevronRight,
  Eye,
  User,
  Key,
  Mail,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabaseService, orderBy } from '@/lib/supabaseService';
import bcrypt from 'bcryptjs';

export default function AdminSubAdmins() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [newSubAdmin, setNewSubAdmin] = useState({
    fullName: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    passportPhoto: '',
    currentCountry: '',
    balanceType: 'VND', // Default
    allowedServices: ['add_money', 'cash_in', 'exchange', 'withdraw', 'recharge']
  });
  const [loading, setLoading] = useState(false);
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'operators' | 'requests'>('operators');

  useEffect(() => {
    fetchSubAdmins();
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const data = await supabaseService.getCollection('operator_balance_requests', [orderBy('created_at', 'desc')]);
    setRequests(data || []);
  };

  const fetchSubAdmins = async () => {
    const data = await supabaseService.getCollection('sub_admins');
    setSubAdmins(data || []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubAdmin.fullName || !newSubAdmin.username || !newSubAdmin.password) {
      toast.error('Required fields missing');
      return;
    }
    setLoading(true);
    try {
      // Hashing password
      const hashedPassword = await bcrypt.hash(newSubAdmin.password, 10);
      
      const payload = {
        full_name: newSubAdmin.fullName,
        username: newSubAdmin.username.toLowerCase().trim(),
        password: hashedPassword,
        email: newSubAdmin.email,
        phone: newSubAdmin.phone,
        passport_photo: newSubAdmin.passportPhoto,
        current_country: newSubAdmin.currentCountry,
        balance_type: newSubAdmin.balanceType,
        allowed_services: newSubAdmin.allowedServices,
        wallet_balance: 0,
        status: 'active',
        is_online: false,
        created_at: new Date().toISOString()
      };

      const id = await supabaseService.addDocument('sub_admins', payload);
      
      if (id) {
        toast.success(`Sub Admin ${newSubAdmin.fullName} created successfully`);
        setIsAddModalOpen(false);
        setNewSubAdmin({ 
          fullName: '', 
          username: '', 
          password: '', 
          email: '', 
          phone: '', 
          passportPhoto: '', 
          currentCountry: '', 
          balanceType: 'VND',
          allowedServices: ['add_money', 'cash_in', 'exchange', 'withdraw', 'recharge']
        });
        fetchSubAdmins();
      }
    } catch (error) {
      toast.error('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleService = (service: string) => {
    setNewSubAdmin(prev => {
      const allowed = [...prev.allowedServices];
      if (allowed.includes(service)) {
        return { ...prev, allowedServices: allowed.filter(s => s !== service) };
      } else {
        return { ...prev, allowedServices: [...allowed, service] };
      }
    });
  };

  const handleDeposit = async () => {
    if (!selectedSubAdmin || !depositAmount || isNaN(Number(depositAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const amount = Number(depositAmount);
      const currentBalance = (selectedSubAdmin.walletBalance ?? selectedSubAdmin.wallet_balance ?? 0);
      const newBalance = currentBalance + amount;

      // 1. Update sub admin balance
      await supabaseService.updateDocument('sub_admins', selectedSubAdmin.id, {
        walletBalance: newBalance,
        wallet_balance: newBalance
      });

      // 2. Record transaction
      await supabaseService.addDocument('sub_admin_wallet_transactions', {
        sub_admin_id: selectedSubAdmin.id,
        type: 'deposit',
        amount: amount,
        reason: 'Admin top-up',
        balance_after: newBalance,
        created_at: new Date().toISOString()
      });

      toast.success(`৳${amount} added to ${selectedSubAdmin.username}'s wallet`);
      setIsWalletModalOpen(false);
      setDepositAmount('');
      fetchSubAdmins();
    } catch (error) {
      toast.error('Failed to update wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (request: any, action: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const subAdmin = subAdmins.find(s => s.id === request.sub_admin_id);
      if (!subAdmin && action === 'approved') {
        toast.error('Sub Admin not found');
        return;
      }

      const amount = Number(request.amount);
      let newBalance = Number(subAdmin?.walletBalance ?? subAdmin?.wallet_balance ?? 0);
      
      if (action === 'approved') {
        if (request.type === 'refill') {
          newBalance += amount;
        } else if (request.type === 'withdraw') {
          if (newBalance < amount) {
            toast.error('Operator has insufficient balance to withdraw');
            setLoading(false);
            return;
          }
          newBalance -= amount;
        }

        // 1. Update sub admin balance
        await supabaseService.updateDocument('sub_admins', request.sub_admin_id, {
          walletBalance: newBalance,
          wallet_balance: newBalance
        });

        // 2. Record transaction with proof_url and extra metadata
        await supabaseService.addDocument('sub_admin_wallet_transactions', {
          sub_admin_id: request.sub_admin_id,
          type: request.type === 'refill' ? 'credit' : 'debit',
          amount: amount,
          reason: `${request.type === 'refill' ? 'Refill' : 'Withdrawal'} approved: ${request.account_type || ''} ${request.withdrawal_account_number || ''}`,
          balance_after: newBalance,
          proof_url: request.proof_url || '',
          metadata: {
            account_type: request.account_type,
            account_name: request.withdrawal_account_name,
            account_number: request.withdrawal_account_number,
            tx_id: request.tx_id,
            country: request.country,
            balance_type: request.balance_type
          },
          created_at: new Date().toISOString()
        });
      }

      // 3. Update request status
      await supabaseService.updateDocument('operator_balance_requests', request.id, {
        status: action,
        updated_at: new Date().toISOString()
      });

      toast.success(`Request ${action} successfully`);
      fetchRequests();
      fetchSubAdmins();
    } catch (error) {
      toast.error('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubAdmins = subAdmins.filter(s => 
    (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-black tracking-tight text-white line-clamp-1">Sub Admin Management</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Create and oversee your team of operators.</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="h-12 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold px-6 shadow-xl shadow-red-600/20"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Create New Sub Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Operators', value: subAdmins.length, icon: User, color: 'blue' },
          { label: 'Total team Balance', value: `${subAdmins[0]?.balanceType === 'BDT' ? '৳' : subAdmins[0]?.balanceType === 'USDT' ? '$' : '₫'}${subAdmins.reduce((acc, curr) => acc + (curr.walletBalance ?? curr.wallet_balance ?? 0), 0).toLocaleString()}`, icon: Wallet, color: 'green' },
          { label: 'Currently Active', value: subAdmins.filter(s => s.status === 'active').length, icon: ShieldCheck, color: 'cyan' },
        ].map((stat, i) => (
          <div key={i} className="p-8 bg-[#161b22] border border-white/5 rounded-[2.5rem] relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
             <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-500",
                  stat.color === 'blue' ? "bg-blue-600/20 text-blue-400" :
                  stat.color === 'green' ? "bg-green-600/20 text-green-400" :
                  "bg-cyan-600/20 text-cyan-400"
                )}>
                   <stat.icon className="w-6 h-6" />
                </div>
                <div>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                   <h3 className="text-2xl font-black text-white">{stat.value}</h3>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-8">
        <button 
          onClick={() => setActiveTab('operators')}
          className={cn(
            "pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
            activeTab === 'operators' ? "text-blue-500" : "text-slate-500 hover:text-white"
          )}
        >
          Team Operators
          {activeTab === 'operators' && <motion.div layoutId="tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={cn(
            "pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
            activeTab === 'requests' ? "text-red-500" : "text-slate-500 hover:text-white"
          )}
        >
          Refill / Withdraw Requests
          {activeTab === 'requests' && <motion.div layoutId="tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-red-500" />}
          {requests.filter(r => r.status === 'pending').length > 0 && (
            <span className="absolute -top-2 -right-4 w-4 h-4 bg-red-600 text-white text-[8px] rounded-full flex items-center justify-center animate-pulse">
              {requests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'operators' ? (
        <div className="space-y-8">
          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                placeholder="Search by name, username..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 bg-white/5 border-white/10 pl-12 rounded-2xl"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                     <tr className="border-b border-white/5">
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operator Info</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wallet Balance</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Online</th>
                        <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {filteredSubAdmins.map((sub) => (
                        <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-blue-500 border border-white/10 uppercase shadow-lg group-hover:scale-105 transition-transform">
                                    {(sub.username || 'U')[0]}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white tracking-tight">{sub.fullName}</span>
                                    <span className="text-xs font-bold text-slate-600 mt-1 italic">@{sub.username}</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className="text-lg font-black text-white">{sub.balanceType === 'BDT' ? '৳' : sub.balanceType === 'USDT' ? '$' : '₫'}{(sub.walletBalance ?? sub.wallet_balance ?? 0).toLocaleString()}</span>
                           </td>
                           <td className="px-8 py-6 text-center">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                sub.status === 'active' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                sub.status === 'inactive' ? "bg-slate-500/10 text-slate-500 border-slate-500/20" :
                                "bg-red-500/10 text-red-500 border-red-500/20"
                              )}>
                                 {sub.status}
                              </span>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center justify-center">
                                 <div className={cn(
                                   "w-2.5 h-2.5 rounded-full ring-4 shadow-lg",
                                   sub.isOnline ? "bg-green-500 ring-green-500/10 animate-pulse" : "bg-slate-800 ring-transparent"
                                 )} />
                              </div>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                 <Button variant="dark" className="h-9 w-9 p-0 rounded-xl hover:bg-blue-600/10 hover:text-blue-500 group-hover:ring-1 ring-blue-500/20">
                                    <Eye className="w-4 h-4" />
                                 </Button>
                                 <Button 
                                    onClick={() => {
                                      setSelectedSubAdmin(sub);
                                      setIsWalletModalOpen(true);
                                    }}
                                    variant="dark" 
                                    className="h-9 w-9 p-0 rounded-xl hover:bg-green-600/10 hover:text-green-500 group-hover:ring-1 ring-green-500/20"
                                 >
                                    <Wallet className="w-4 h-4" />
                                 </Button>
                                 <Button variant="dark" className="h-9 w-9 p-0 rounded-xl hover:bg-red-600/10 hover:text-red-500 group-hover:ring-1 ring-red-500/20">
                                    <Ban className="w-4 h-4" />
                                 </Button>
                                 <Button variant="dark" className="h-9 w-9 p-0 rounded-xl">
                                    <History className="w-4 h-4" />
                                 </Button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-black italic">Operator</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-black italic">Type</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-black italic">Amount</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-black italic text-center">Proof</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-black italic text-center">Status</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-black italic text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.02] transition-colors font-medium">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white">@{req.username}</span>
                          <span className="text-[10px] font-bold text-slate-600 mt-1">{new Date(req.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          req.type === 'refill' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {req.type}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-lg font-black text-white">{Number(req.amount).toLocaleString()} {req.balance_type}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        {req.proof_url ? (
                          <a href={req.proof_url} target="_blank" rel="noopener noreferrer" className="p-2 inline-block bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                             <Eye className="w-4 h-4 text-blue-500" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">No Proof</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          req.status === 'pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse" :
                          req.status === 'approved' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        {req.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              onClick={() => handleRequestAction(req, 'approved')}
                              className="h-10 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold px-4"
                            >
                              Approve
                            </Button>
                            <Button 
                              onClick={() => handleRequestAction(req, 'rejected')}
                              variant="ghost" 
                              className="h-10 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl font-bold px-4"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-slate-500 font-bold italic uppercase tracking-widest">
                         No balance requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Sub Admin Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-slate-800 text-white rounded-[2.5rem] p-0 overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.1)]">
           <div className="p-8 bg-gradient-to-br from-red-600/20 to-orange-600/20 border-b border-white/5 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
              <DialogTitle className="text-2xl font-display font-black tracking-tight">Create New Sub Admin</DialogTitle>
              <p className="text-sm text-red-500/80 font-bold mt-1 uppercase tracking-widest">Assign operational authority</p>
           </div>
           
           <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</Label>
                    <Input 
                      placeholder="e.g. John Doe"
                      value={newSubAdmin.fullName}
                      onChange={(e) => setNewSubAdmin({...newSubAdmin, fullName: e.target.value})}
                      className="bg-white/5 border-white/10 h-12 rounded-2xl px-5 text-sm font-medium focus:ring-red-500 transition-all shadow-inner"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Username</Label>
                    <Input 
                      placeholder="unique_username"
                      value={newSubAdmin.username}
                      onChange={(e) => setNewSubAdmin({...newSubAdmin, username: e.target.value})}
                      className="bg-white/5 border-white/10 h-12 rounded-2xl px-5 text-sm font-medium focus:ring-red-500 transition-all shadow-inner"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</Label>
                 <div className="relative">
                    <Input 
                      type="password"
                      placeholder="••••••••"
                      value={newSubAdmin.password}
                      onChange={(e) => setNewSubAdmin({...newSubAdmin, password: e.target.value})}
                      className="bg-white/5 border-white/10 h-12 rounded-2xl px-12 text-sm font-medium focus:ring-red-500 transition-all"
                    />
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email (Contact)</Label>
                    <Input 
                      type="email"
                      placeholder="operator@system.com"
                      value={newSubAdmin.email}
                      onChange={(e) => setNewSubAdmin({...newSubAdmin, email: e.target.value})}
                      className="bg-white/5 border-white/10 h-12 rounded-2xl px-5 text-sm font-medium focus:ring-red-500 transition-all"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</Label>
                    <Input 
                      placeholder="+880..."
                      value={newSubAdmin.phone}
                      onChange={(e) => setNewSubAdmin({...newSubAdmin, phone: e.target.value})}
                      className="bg-white/5 border-white/10 h-12 rounded-2xl px-5 text-sm font-medium focus:ring-red-500 transition-all"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Passport Photo URL</Label>
                    <Input 
                      placeholder="https://..."
                      value={newSubAdmin.passportPhoto}
                      onChange={(e) => setNewSubAdmin({...newSubAdmin, passportPhoto: e.target.value})}
                      className="bg-white/5 border-white/10 h-12 rounded-2xl px-5 text-sm font-medium focus:ring-red-500 transition-all px-5"
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Current Country</Label>
                    <Input 
                      placeholder="e.g. Bangladesh"
                      value={newSubAdmin.currentCountry}
                      onChange={(e) => setNewSubAdmin({...newSubAdmin, currentCountry: e.target.value})}
                      className="bg-white/5 border-white/10 h-12 rounded-2xl px-5 text-sm font-medium focus:ring-red-500 transition-all"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Balance Type</Label>
                 <select 
                   value={newSubAdmin.balanceType}
                   onChange={(e) => setNewSubAdmin({...newSubAdmin, balanceType: e.target.value})}
                   className="w-full bg-white/5 border border-white/10 h-12 rounded-2xl px-5 text-sm font-medium focus:ring-red-500 transition-all appearance-none"
                 >
                   <option value="VND">Digital VND (Main)</option>
                   <option value="BDT">BDT Balance</option>
                   <option value="USDT">USDT Asset</option>
                 </select>
              </div>

              <div className="space-y-4 pt-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Allowed Services (Service Limitations)</Label>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                   {[
                     { id: 'add_money', label: 'Add Money' },
                     { id: 'cash_in', label: 'Cash In' },
                     { id: 'exchange', label: 'Exchange' },
                     { id: 'withdraw', label: 'Withdraw' },
                     { id: 'recharge', label: 'Recharge' }
                   ].map((service) => (
                     <button
                       key={service.id}
                       type="button"
                       onClick={() => handleToggleService(service.id)}
                       className={cn(
                         "px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                         newSubAdmin.allowedServices.includes(service.id)
                           ? "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                           : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20 whitespace-nowrap"
                       )}
                     >
                       {service.label}
                     </button>
                   ))}
                 </div>
              </div>

              <DialogFooter className="pt-8">
                 <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="h-14 flex-1 rounded-2xl font-bold">Cancel</Button>
                 <Button 
                  type="submit"
                  disabled={loading}
                  className="h-14 flex-[2] bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                 >
                    {loading ? 'Creating Account Pool...' : 'Authorize Sub Admin Access'}
                 </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      {/* Wallet Deposit Modal */}
      <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2.5rem] p-0 overflow-hidden shadow-[0_0_80px_rgba(34,197,94,0.1)]">
           <div className="p-8 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-b border-white/5">
              <DialogTitle className="text-2xl font-display font-black tracking-tight">Load Operator Wallet</DialogTitle>
              <p className="text-sm text-green-500/80 font-bold mt-1 uppercase tracking-widest">Adding funds to @{selectedSubAdmin?.username}</p>
           </div>
           
           <div className="p-8 space-y-6">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Balance</p>
                  <p className="text-xl font-black text-white mt-1">{selectedSubAdmin?.balanceType === 'BDT' ? '৳' : selectedSubAdmin?.balanceType === 'USDT' ? '$' : '₫'}{(selectedSubAdmin?.walletBalance ?? selectedSubAdmin?.wallet_balance ?? 0).toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-500" />
                </div>
              </div>

              <div className="space-y-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Deposit Amount (BDT)</Label>
                 <Input 
                   type="number"
                   placeholder="Enter amount eg. 5000"
                   value={depositAmount}
                   onChange={(e) => setDepositAmount(e.target.value)}
                   className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-lg font-black focus:ring-green-500 transition-all shadow-inner"
                 />
              </div>

              <DialogFooter className="pt-4">
                 <Button type="button" variant="ghost" onClick={() => setIsWalletModalOpen(false)} className="h-14 flex-1 rounded-2xl font-bold">Cancel</Button>
                 <Button 
                  onClick={handleDeposit}
                  disabled={loading}
                  className="h-14 flex-[2] bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold shadow-xl shadow-green-600/20 active:scale-95 transition-all"
                 >
                    {loading ? 'Processing...' : 'Confirm Load Wallet'}
                 </Button>
              </DialogFooter>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
