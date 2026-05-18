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
  Phone,
  Calculator
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isRequestDetailsModalOpen, setIsRequestDetailsModalOpen] = useState(false);
  const [isAdminBankModalOpen, setIsAdminBankModalOpen] = useState(false);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [selectedSubAdmin, setSelectedSubAdmin] = useState<any>(null);
  const [editingCommissions, setEditingCommissions] = useState<any>({});
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [editingServices, setEditingServices] = useState<string[] | null>(null);
  const [adminBankSettings, setAdminBankSettings] = useState<any>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    instructions: ''
  });
  const [history, setHistory] = useState<any[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [ledgerBalances, setLedgerBalances] = useState<Record<string, number>>({});
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
    fetchAdminBankSettings();

    // Subscribe to transactions to calculate real-time ledger balances for all operators
    const unsubLedger = supabaseService.subscribeToCollection('sub_admin_wallet_transactions', [], (data) => {
      const creditTypes = ['credit', 'deposit', 'refill', 'adjustment_add', 'bonus', 'commission'];
      const debitTypes = ['debit', 'withdraw', 'adjustment_sub', 'fee'];
      
      const balances: Record<string, number> = {};
      
      (data || []).forEach(tx => {
        const saId = tx.sub_admin_id || tx.subAdminId;
        if (!saId) return;
        
        if (!balances[saId]) balances[saId] = 0;
        
        const amount = Number(tx.amount || 0);
        if (creditTypes.includes(tx.type)) {
          balances[saId] += amount;
        } else if (debitTypes.includes(tx.type)) {
          balances[saId] -= amount;
        }
      });
      
      setLedgerBalances(balances);
    });

    return () => {
      unsubLedger();
    };
  }, []);

  const fetchAdminBankSettings = async () => {
    const data = await supabaseService.getCollection('admin_settings', []);
    const settings = data?.find((s: any) => s.key === 'sub_admin_refill_bank');
    if (settings) {
      setAdminBankSettings(settings.value);
    }
  };

  const handleSaveAdminBank = async () => {
    setLoading(true);
    try {
      const data = await supabaseService.getCollection('admin_settings', []);
      const existing = data?.find((s: any) => s.key === 'sub_admin_refill_bank');
      
      if (existing) {
        await supabaseService.updateDocument('admin_settings', existing.id, { 
          value: adminBankSettings,
          updated_at: new Date().toISOString()
        });
      } else {
        await supabaseService.addDocument('admin_settings', { 
          key: 'sub_admin_refill_bank', 
          value: adminBankSettings,
          updated_at: new Date().toISOString()
        });
      }
      toast.success('Refill bank settings updated');
      setIsAdminBankModalOpen(false);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    const data = await supabaseService.getCollection('operator_balance_requests', [orderBy('created_at', 'desc')]);
    setRequests(data || []);
  };

  const fetchSubAdmins = async () => {
    const data = await supabaseService.getCollection('sub_admins');
    setSubAdmins(data || []);
  };

  const fetchHistory = async (subAdminId: string) => {
    const data = await supabaseService.getCollection('sub_admin_wallet_transactions', [
      orderBy('created_at', 'desc')
    ]);
    // Filter locally since getCollection might not support complex queries easily in this setup
    setHistory(data?.filter((t: any) => t.subAdminId === subAdminId) || []);
  };

  const handleToggleStatus = async (sub: any) => {
    const newStatus = sub.status === 'active' ? 'banned' : 'active';
    setLoading(true);
    try {
      await supabaseService.updateDocument('sub_admins', sub.id, { status: newStatus });
      toast.success(`Sub Admin ${sub.username} is now ${newStatus}`);
      fetchSubAdmins();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

   const handleUpdateCommissions = async () => {
    if (!selectedSubAdmin) return;
    setLoading(true);
    try {
      // Force all keys to be snake_case for DB storage to be consistent
      const commissionsToSave: any = {};
      Object.keys(editingCommissions).forEach(k => {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        commissionsToSave[snakeKey] = editingCommissions[k];
      });

      const res = await supabaseService.updateDocument('sub_admins', selectedSubAdmin.id, {
        service_commissions: commissionsToSave,
        serviceCommissions: commissionsToSave,
        updated_at: new Date().toISOString()
      });
      
      if (res.success) {
        toast.success('Service commissions updated');
        setIsCommissionModalOpen(false);
        fetchSubAdmins();
      }
    } catch (error) {
      toast.error('Failed to update commissions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateServices = async (subId: string, services: string[]) => {
    try {
      await supabaseService.updateDocument('sub_admins', subId, { 
        allowed_services: services,
        allowedServices: services,
        updated_at: new Date().toISOString()
      });
      toast.success('Services updated successfully');
      fetchSubAdmins();
      // Update selected sub admin state to reflect changes in modal
      setSelectedSubAdmin((prev: any) => ({ ...prev, allowed_services: services, allowedServices: services }));
    } catch (error) {
      toast.error('Failed to update services');
    }
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
        allowedServices: newSubAdmin.allowedServices,
        service_commissions: {
          add_money: { type: 'percent', value: 0 },
          cash_in: { type: 'percent', value: 0 },
          exchange: { type: 'percent', value: 0 },
          withdraw: { type: 'percent', value: 0 },
          recharge: { type: 'percent', value: 0 }
        },
        serviceCommissions: {
          add_money: { type: 'percent', value: 0 },
          cash_in: { type: 'percent', value: 0 },
          exchange: { type: 'percent', value: 0 },
          withdraw: { type: 'percent', value: 0 },
          recharge: { type: 'percent', value: 0 }
        },
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
      const subAdminId = request.subAdminId || request.sub_admin_id;
      
      if (!subAdminId) {
        toast.error('Invalid request: Missing Operator ID');
        setLoading(false);
        return;
      }

      // Fetch sub admin directly to avoid "not found" due to stale or filtered state
      const { data: subAdmin } = await supabaseService.getDocument('sub_admins', subAdminId);
      
      if (!subAdmin && action === 'approved') {
        toast.error('Operator record not found in system');
        setLoading(false);
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
        await supabaseService.updateDocument('sub_admins', subAdminId, {
          walletBalance: newBalance,
          wallet_balance: newBalance,
          vndBalance: newBalance,
          vnd_balance: newBalance,
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // 2. Record transaction with proof_url and extra metadata
        await supabaseService.addDocument('sub_admin_wallet_transactions', {
          sub_admin_id: subAdminId,
          type: request.type === 'refill' ? 'credit' : 'debit',
          amount: amount,
          reason: `${request.type === 'refill' ? 'Refill' : 'Withdrawal'} approved: ${request.accountType || ''} ${request.withdrawalAccountNumber || ''}`,
          balance_after: newBalance,
          proof_url: request.proofUrl || request.proof_url || '',
          metadata: {
            account_type: request.accountType || request.account_type,
            account_name: request.withdrawalAccountName || request.withdrawal_account_name,
            account_number: request.withdrawalAccountNumber || request.withdrawal_account_number,
            tx_id: request.txId || request.tx_id,
            country: request.country,
            balance_type: request.balanceType || request.balance_type
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
          { label: 'Total team Balance', value: `${subAdmins[0]?.balanceType === 'BDT' ? '৳' : subAdmins[0]?.balanceType === 'USDT' ? '$' : '₫'}${subAdmins.reduce((acc, curr) => {
            const docBalance = curr.walletBalance ?? curr.wallet_balance ?? curr.vndBalance ?? curr.vnd_balance ?? 0;
            const ledgerBalance = ledgerBalances[curr.id];
            // Only use ledgerBalance if it's NOT 0 OR if we explicitly want to trust it.
            // Since the user reported Admin seeing 0, we should prefer the document balance if ledger is 0 but doc is not.
            const balance = (ledgerBalance && ledgerBalance !== 0) ? ledgerBalance : docBalance;
            return acc + Number(balance);
          }, 0).toLocaleString()}`, icon: Wallet, color: 'green' },
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

        {activeTab === 'requests' && (
          <Button 
            onClick={() => setIsAdminBankModalOpen(true)}
            variant="ghost"
            className="pb-4 h-auto text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 hover:text-amber-400 hover:bg-transparent"
          >
            Refill Bank Settings
          </Button>
        )}
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
                              <span className="text-lg font-black text-white">{sub.balanceType === 'BDT' ? '৳' : sub.balanceType === 'USDT' ? '$' : '₫'}{(sub.walletBalance ?? sub.wallet_balance ?? sub.vndBalance ?? sub.vnd_balance ?? 0).toLocaleString()}</span>
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
                                 <Button 
                                    onClick={() => {
                                      setSelectedSubAdmin(sub);
                                      setEditingServices(null);
                                      setIsDetailsModalOpen(true);
                                    }}
                                    variant="dark" 
                                    className="h-9 w-9 p-0 rounded-xl hover:bg-blue-600/10 hover:text-blue-500 group-hover:ring-1 ring-blue-500/20"
                                 >
                                    <Eye className="w-4 h-4" />
                                 </Button>
                                 <Button 
                                    onClick={() => {
                                      setSelectedSubAdmin(sub);
                                      const defaults: any = {
                                        add_money: { type: 'percent', value: 0 },
                                        cash_in: { type: 'percent', value: 0 },
                                        exchange: { type: 'percent', value: 0 },
                                        withdraw: { type: 'percent', value: 0 },
                                        recharge: { type: 'percent', value: 0 }
                                      };
                                      const rawComms = sub.service_commissions || sub.serviceCommissions || {};
                                      const normalizedComms: any = {};
                                      // map ANY camelCase keys back to snake_case for editing
                                      Object.keys(rawComms).forEach(k => {
                                        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                                        normalizedComms[snakeKey] = rawComms[k];
                                      });

                                      setEditingCommissions({
                                        ...defaults,
                                        ...normalizedComms
                                      });
                                      setIsCommissionModalOpen(true);
                                    }}
                                    variant="dark" 
                                    className="h-9 w-9 p-0 rounded-xl hover:bg-red-600/10 hover:text-red-500 group-hover:ring-1 ring-red-500/20"
                                    title="Manage Commissions"
                                 >
                                    <Calculator className="w-4 h-4" />
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
                                 <Button 
                                    onClick={() => handleToggleStatus(sub)}
                                    variant="dark" 
                                    className={cn(
                                       "h-9 w-9 p-0 rounded-xl group-hover:ring-1",
                                       sub.status === 'banned' 
                                          ? "hover:bg-green-600/10 hover:text-green-500 ring-green-500/20" 
                                          : "hover:bg-red-600/10 hover:text-red-500 ring-red-500/20"
                                    )}
                                 >
                                    <Ban className="w-4 h-4" />
                                 </Button>
                                 <Button 
                                    onClick={() => {
                                      setSelectedSubAdmin(sub);
                                      fetchHistory(sub.id);
                                      setIsHistoryModalOpen(true);
                                    }}
                                    variant="dark" 
                                    className="h-9 w-9 p-0 rounded-xl hover:bg-amber-600/10 hover:text-amber-500 group-hover:ring-1 ring-amber-500/20"
                                 >
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
                          <span className="text-[10px] font-bold text-slate-600 mt-1">{new Date(req.createdAt).toLocaleString()}</span>
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
                        <span className="text-lg font-black text-white">{Number(req.amount).toLocaleString()} {req.balanceType}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {req.proofUrl && (
                            <a href={req.proofUrl} target="_blank" rel="noopener noreferrer" className="p-2 inline-block bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                               <Eye className="w-4 h-4 text-blue-500" />
                            </a>
                          )}
                          <Button
                            onClick={() => {
                              setSelectedRequest(req);
                              setIsRequestDetailsModalOpen(true);
                            }}
                            variant="ghost"
                            className="p-2 h-auto inline-block bg-white/5 rounded-xl hover:bg-white/10 transition-all"
                          >
                             <MoreVertical className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
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
                  <p className="text-xl font-black text-white mt-1">
                    {selectedSubAdmin?.balanceType === 'BDT' ? '৳' : selectedSubAdmin?.balanceType === 'USDT' ? '$' : '₫'}
                    {Number(selectedSubAdmin?.walletBalance ?? selectedSubAdmin?.wallet_balance ?? selectedSubAdmin?.vndBalance ?? selectedSubAdmin?.vnd_balance ?? 0).toLocaleString()}
                  </p>
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

      {/* Details & Services Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
           <div className="p-8 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-b border-white/5 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
              <DialogTitle className="text-2xl font-display font-black tracking-tight">{selectedSubAdmin?.fullName}</DialogTitle>
              <p className="text-sm text-blue-500/80 font-bold mt-1 uppercase tracking-widest">Operator Identity & Permission Pool</p>
           </div>
           
           <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Profile Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Username</p>
                       <p className="text-sm font-bold text-white">@{selectedSubAdmin?.username}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Address</p>
                       <p className="text-sm font-bold text-white">{selectedSubAdmin?.email || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone Number</p>
                       <p className="text-sm font-bold text-white">{selectedSubAdmin?.phone || 'N/A'}</p>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location</p>
                       <p className="text-sm font-bold text-white">{selectedSubAdmin?.current_country || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passport / NID Photo</p>
                       {selectedSubAdmin?.passport_photo ? (
                          <a href={selectedSubAdmin.passport_photo} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1 mt-1">
                             View Document <ChevronRight className="w-3 h-3" />
                          </a>
                       ) : (
                          <p className="text-xs text-slate-500 italic mt-1">No document uploaded</p>
                       )}
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Status</p>
                       <p className={cn(
                          "text-[10px] font-black uppercase tracking-widest mt-1",
                          selectedSubAdmin?.status === 'active' ? "text-green-500" : "text-red-500"
                       )}>
                          {selectedSubAdmin?.status}
                       </p>
                    </div>
                 </div>
              </div>

              {/* Service Management */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Services (Management)</Label>
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { id: 'add_money', label: 'Add Money' },
                      { id: 'cash_in', label: 'Cash In' },
                      { id: 'exchange', label: 'Exchange' },
                      { id: 'withdraw', label: 'Withdraw' },
                      { id: 'recharge', label: 'Recharge' }
                    ].map((service) => {
                      const userServices = selectedSubAdmin?.allowedServices || selectedSubAdmin?.allowed_services || [];
                      const isAllowed = (editingServices !== null ? editingServices : userServices).includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            const current = editingServices !== null ? editingServices : userServices;
                            const next = isAllowed 
                              ? current.filter((s: string) => s !== service.id)
                              : [...current, service.id];
                            setEditingServices(next);
                          }}
                          className={cn(
                            "px-4 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-[0.1em] transition-all text-center flex flex-col items-center justify-center gap-2 min-h-[80px]",
                            isAllowed
                              ? "bg-green-600 border-green-400 text-white shadow-[0_15px_40px_rgba(34,197,94,0.3)] ring-4 ring-green-600/10 scale-[1.02] z-10"
                              : "bg-slate-950/40 border-white/5 text-slate-600 grayscale opacity-40 hover:opacity-100 hover:grayscale-0 hover:bg-white/5 hover:border-white/10"
                          )}
                        >
                          <span className={cn(
                             "w-6 h-6 rounded-full flex items-center justify-center mb-1",
                             isAllowed ? "bg-white/20" : "bg-white/5"
                          )}>
                             {isAllowed ? <ShieldCheck className="w-4 h-4 text-white" /> : <div className="w-1.5 h-1.5 bg-slate-700 rounded-full" />}
                          </span>
                          {service.label}
                          {isAllowed && (
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500 rounded text-[6px] font-black text-white">ACTIVE</span>
                          )}
                        </button>
                      );
                    })}
                 </div>
                 {editingServices !== null && (
                   <Button 
                     onClick={() => {
                       handleUpdateServices(selectedSubAdmin.id, editingServices);
                       setEditingServices(null);
                     }}
                     className="w-full h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-green-600/20 animate-in fade-in slide-in-from-bottom-2"
                   >
                     Apply Service Changes
                   </Button>
                 )}
              </div>
           </div>

           <div className="p-8 border-t border-white/5 bg-slate-950/50">
              <Button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold"
              >
                 Close Overview
              </Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Transaction History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
           <div className="p-8 bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-b border-white/5 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
              <DialogTitle className="text-2xl font-display font-black tracking-tight">Wallet Ledger History</DialogTitle>
              <p className="text-sm text-amber-500/80 font-bold mt-1 uppercase tracking-widest">@{selectedSubAdmin?.username}'s Activity Logs</p>
           </div>
           
           <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="sticky top-0 bg-slate-900 border-b border-white/5">
                    <tr>
                       <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Date / Time</th>
                       <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Type</th>
                       <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic font-black">Amount</th>
                       <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Reason</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {history.map((tx) => (
                       <tr key={tx.id} className="hover:bg-white/[0.02]">
                          <td className="px-6 py-4">
                             <p className="text-[10px] font-bold text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                             <span className={cn(
                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                tx.type === 'deposit' || tx.type === 'credit' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                             )}>
                                {tx.type}
                             </span>
                          </td>
                          <td className="px-6 py-4">
                             <p className={cn(
                                "text-sm font-black italic",
                                tx.type === 'deposit' || tx.type === 'credit' ? "text-green-500" : "text-red-500"
                             )}>
                                {tx.type === 'deposit' || tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                             </p>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-xs text-slate-500 line-clamp-1 truncate max-w-[150px]">{tx.reason}</p>
                          </td>
                       </tr>
                    ))}
                    {history.length === 0 && (
                       <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-600 italic uppercase font-black text-[10px] tracking-widest">
                             No transaction history found.
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>

           <div className="p-6 border-t border-white/5 bg-slate-950/50">
              <Button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold"
              >
                 Return to Management
              </Button>
           </div>
        </DialogContent>
      </Dialog>
      {/* Admin Bank Settings for Sub Admin Refill */}
      <Dialog open={isAdminBankModalOpen} onOpenChange={setIsAdminBankModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
           <div className="p-8 bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-b border-white/5 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
              <DialogTitle className="text-2xl font-display font-black tracking-tight">Refill Payment Bank</DialogTitle>
              <p className="text-sm text-amber-500/80 font-bold mt-1 uppercase tracking-widest">Where operators send money for refill</p>
           </div>
           
           <div className="p-8 space-y-4">
              <div className="space-y-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Bank Name</Label>
                 <Input 
                   placeholder="e.g. Bkash (Personal)"
                   value={adminBankSettings.bankName}
                   onChange={(e) => setAdminBankSettings({...adminBankSettings, bankName: e.target.value})}
                   className="bg-white/5 border-white/10 h-12 rounded-2xl px-5"
                 />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Account Number</Label>
                 <Input 
                   placeholder="017..."
                   value={adminBankSettings.accountNumber}
                   onChange={(e) => setAdminBankSettings({...adminBankSettings, accountNumber: e.target.value})}
                   className="bg-white/5 border-white/10 h-12 rounded-2xl px-5"
                 />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Account Holder Name</Label>
                 <Input 
                   placeholder="Admin Name"
                   value={adminBankSettings.accountHolder}
                   onChange={(e) => setAdminBankSettings({...adminBankSettings, accountHolder: e.target.value})}
                   className="bg-white/5 border-white/10 h-12 rounded-2xl px-5"
                 />
              </div>
              <div className="space-y-2">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Instructions (Optional)</Label>
                 <textarea 
                   placeholder="e.g. Send money and upload screenshot"
                   value={adminBankSettings.instructions}
                   onChange={(e) => setAdminBankSettings({...adminBankSettings, instructions: e.target.value})}
                   className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm min-h-[100px] focus:ring-amber-500 transition-all outline-none"
                 />
              </div>

              <DialogFooter className="pt-4">
                 <Button type="button" variant="ghost" onClick={() => setIsAdminBankModalOpen(false)} className="h-12 flex-1 rounded-xl">Cancel</Button>
                 <Button 
                   onClick={handleSaveAdminBank}
                   disabled={loading}
                   className="h-12 flex-[2] bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold"
                 >
                    {loading ? 'Saving...' : 'Update Settings'}
                 </Button>
              </DialogFooter>
           </div>
        </DialogContent>
      </Dialog>

      {/* Request Details Modal */}
      <Dialog open={isRequestDetailsModalOpen} onOpenChange={setIsRequestDetailsModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
           <div className={cn(
             "p-8 border-b border-white/5 relative",
             selectedRequest?.type === 'refill' ? "bg-gradient-to-br from-green-600/20 to-emerald-600/20" : "bg-gradient-to-br from-red-600/20 to-pink-600/20"
           )}>
              <DialogTitle className="text-2xl font-display font-black tracking-tight">{selectedRequest?.type?.toUpperCase()} Request</DialogTitle>
              <p className={cn(
                "text-sm font-bold mt-1 uppercase tracking-widest",
                selectedRequest?.type === 'refill' ? "text-green-500" : "text-red-500"
              )}>Operator: @{selectedRequest?.username}</p>
           </div>
           
           <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</p>
                    <p className="text-xl font-black text-white">{selectedRequest?.amount?.toLocaleString()} {selectedRequest?.balanceType}</p>
                 </div>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
                    <p className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      selectedRequest?.status === 'pending' ? "text-amber-500" :
                      selectedRequest?.status === 'approved' ? "text-green-500" : "text-red-500"
                    )}>{selectedRequest?.status}</p>
                 </div>
              </div>

              {selectedRequest?.type === 'withdraw' && (
                <div className="space-y-4">
                   <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Withdrawal Account Details</Label>
                   <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs text-slate-500">Method</span>
                        <span className="text-sm font-bold text-white">{selectedRequest?.accountType}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-xs text-slate-500">Account Name</span>
                        <span className="text-sm font-bold text-white">{selectedRequest?.withdrawalAccountName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center bg-blue-600/10 p-3 rounded-xl border border-blue-500/20">
                        <span className="text-xs text-blue-400">Account No.</span>
                        <span className="text-sm font-black text-blue-500 select-all">{selectedRequest?.withdrawalAccountNumber}</span>
                      </div>
                   </div>
                </div>
              )}

              {selectedRequest?.txId && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transaction / Ref ID</p>
                  <p className="text-sm font-black text-white mt-1 select-all">{selectedRequest?.txId}</p>
                </div>
              )}

              {selectedRequest?.proofUrl && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Proof</Label>
                  <div className="aspect-video bg-white/5 rounded-2xl border border-white/10 overflow-hidden group relative">
                    <img src={selectedRequest.proofUrl} alt="Proof" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <a 
                      href={selectedRequest.proofUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2"
                    >
                      <Eye className="w-5 h-5" /> View Large Proof
                    </a>
                  </div>
                </div>
              )}

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requested Date</p>
                <p className="text-xs text-slate-400 font-bold mt-1">{new Date(selectedRequest?.createdAt).toLocaleString()}</p>
              </div>

              {selectedRequest?.status === 'pending' ? (
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => {
                      handleRequestAction(selectedRequest, 'approved');
                      setIsRequestDetailsModalOpen(false);
                    }}
                    className="h-14 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold"
                  >
                    Approve Request
                  </Button>
                  <Button 
                    onClick={() => {
                      handleRequestAction(selectedRequest, 'rejected');
                      setIsRequestDetailsModalOpen(false);
                    }}
                    variant="ghost" 
                    className="h-14 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl font-bold"
                  >
                    Reject Request
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setIsRequestDetailsModalOpen(false)}
                  className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold"
                >
                  Close Details
                </Button>
              )}
           </div>
        </DialogContent>
      </Dialog>

      {/* Service Commissions Modal */}
      <Dialog open={isCommissionModalOpen} onOpenChange={setIsCommissionModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
           <div className="p-8 bg-gradient-to-br from-red-600/20 to-pink-600/20 border-b border-white/5 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16" />
              <DialogTitle className="text-2xl font-display font-black tracking-tight">Service Commissions</DialogTitle>
              <p className="text-sm text-red-500/80 font-bold mt-1 uppercase tracking-widest">Set profit rates for @{selectedSubAdmin?.username}</p>
           </div>
           
           <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-6">
                 {[
                   { id: 'add_money', label: 'Add Money' },
                   { id: 'cash_in', label: 'Cash In' },
                   { id: 'exchange', label: 'Exchange' },
                   { id: 'withdraw', label: 'Withdraw' },
                   { id: 'recharge', label: 'Recharge' }
                 ].filter(s => (selectedSubAdmin?.allowed_services || selectedSubAdmin?.allowedServices || []).includes(s.id))
                  .map((service) => (
                   <div key={service.id} className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                         <Label className="text-xs font-black uppercase tracking-widest text-slate-300">{service.label}</Label>
                         <div className="flex bg-slate-950 rounded-xl p-1 gap-1">
                            <button 
                              type="button"
                              onClick={() => setEditingCommissions({
                                ...editingCommissions,
                                [service.id]: { ...editingCommissions[service.id], type: 'percent' }
                              })}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all",
                                editingCommissions[service.id]?.type === 'percent' ? "bg-red-600 text-white" : "text-slate-500 hover:text-white"
                              )}
                            >
                               Percent (%)
                            </button>
                            <button 
                              type="button"
                              onClick={() => setEditingCommissions({
                                ...editingCommissions,
                                [service.id]: { ...editingCommissions[service.id], type: 'fixed' }
                              })}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all",
                                editingCommissions[service.id]?.type === 'fixed' ? "bg-red-600 text-white" : "text-slate-500 hover:text-white"
                              )}
                            >
                               Fixed
                            </button>
                         </div>
                      </div>
                      <div className="relative">
                         <Input 
                            type="number"
                            value={editingCommissions[service.id]?.value}
                            onChange={(e) => setEditingCommissions({
                              ...editingCommissions,
                              [service.id]: { ...editingCommissions[service.id], value: Number(e.target.value) }
                            })}
                            className="h-12 bg-white/5 border-white/10 rounded-xl px-5 font-black text-white"
                            placeholder="0"
                         />
                         <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">
                            {editingCommissions[service.id]?.type === 'percent' ? '%' : (selectedSubAdmin?.balanceType || 'VND')}
                         </span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-8 border-t border-white/5 bg-slate-950/50 flex gap-4">
              <Button 
                onClick={() => setIsCommissionModalOpen(false)}
                className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold"
              >
                 Cancel
              </Button>
              <Button 
                onClick={handleUpdateCommissions}
                disabled={loading}
                className="flex-[2] h-12 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold shadow-xl shadow-red-600/20"
              >
                 {loading ? 'Saving Rates...' : 'Save Commissions'}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
