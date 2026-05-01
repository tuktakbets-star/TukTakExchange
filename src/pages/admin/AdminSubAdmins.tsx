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
import { supabaseService } from '@/lib/supabaseService';
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
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [subAdmins, setSubAdmins] = useState<any[]>([]);

  useEffect(() => {
    fetchSubAdmins();
  }, []);

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
        username: newSubAdmin.username,
        password: hashedPassword,
        email: newSubAdmin.email,
        phone: newSubAdmin.phone,
        wallet_balance: 0,
        status: 'active',
        is_online: false,
        created_at: new Date().toISOString()
      };

      const id = await supabaseService.addDocument('sub_admins', payload);
      
      if (id) {
        toast.success('Sub Admin created successfully');
        setIsAddModalOpen(false);
        setNewSubAdmin({ fullName: '', username: '', password: '', email: '', phone: '' });
        fetchSubAdmins();
      }
    } catch (error) {
      toast.error('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedSubAdmin || !depositAmount || isNaN(Number(depositAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const amount = Number(depositAmount);
      const newBalance = (selectedSubAdmin.wallet_balance || 0) + amount;

      // 1. Update sub admin balance
      await supabaseService.updateDocument('sub_admins', selectedSubAdmin.id, {
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
          { label: 'Total team Balance', value: `৳${subAdmins.reduce((acc, curr) => acc + (curr.wallet_balance || 0), 0).toLocaleString()}`, icon: Wallet, color: 'green' },
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
                                <span className="text-sm font-bold text-white tracking-tight">{sub.full_name}</span>
                                <span className="text-xs font-bold text-slate-600 mt-1 italic">@{sub.username}</span>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <span className="text-lg font-black text-white">৳{(sub.wallet_balance || 0).toLocaleString()}</span>
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
                               sub.is_online ? "bg-green-500 ring-green-500/10 animate-pulse" : "bg-slate-800 ring-transparent"
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
                  <p className="text-xl font-black text-white mt-1">৳{(selectedSubAdmin?.wallet_balance || 0).toLocaleString()}</p>
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
