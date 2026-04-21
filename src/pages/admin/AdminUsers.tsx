import React, { useState, useEffect } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Calendar, Shield, ShieldAlert, AlertTriangle, X, Search, UserPlus, Edit2, Ban, CheckCircle2, Wallet, MoreVertical, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'add' | 'balance'>('view');
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  useEffect(() => {
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));
    const unsubWallets = firebaseService.subscribeToCollection('wallets', [], (data) => setWallets(data));
    setLoading(false);
    return () => {
      unsubUsers();
      unsubWallets();
    };
  }, []);

  const handleBanUnban = async (user: any) => {
    setConfirmConfig({
      title: user.status === 'banned' ? t('unban_user') : t('ban_user'),
      description: user.status === 'banned' ? t('unban_confirm_msg') : t('ban_confirm_msg'),
      variant: user.status === 'banned' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          const newStatus = user.status === 'banned' ? 'active' : 'banned';
          await firebaseService.updateDocument('users', user.uid, { status: newStatus });
          toast.success(t('completed'));
        } catch (error) {
          toast.error(t('operation_failed'));
        }
      }
    });
    setIsConfirmOpen(true);
  };

  const handleUpdateBalance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const currency = formData.get('currency') as string;
    const type = formData.get('type') as string; // 'add' or 'set'

    try {
      const walletId = `${selectedUser.uid}_${currency}`;
      const wallet = wallets.find(w => w.id === walletId);
      const currentBalance = wallet?.balance || 0;
      const newBalance = type === 'add' ? currentBalance + amount : amount;

      await firebaseService.setDocument('wallets', walletId, {
        uid: selectedUser.uid,
        currency,
        balance: newBalance,
        updatedAt: new Date().toISOString()
      });

      // Log the manual adjustment
      await firebaseService.addDocument('transactions', {
        uid: selectedUser.uid,
        type: 'adjustment',
        amount,
        currency,
        status: 'completed',
        createdAt: new Date().toISOString(),
        description: t('manual_balance_adjustment_desc', { type: type === 'add' ? t('addition') : t('update') })
      });

      toast.success(t('completed'));
      setIsModalOpen(false);
    } catch (error) {
      toast.error(t('operation_failed'));
    }
  };

  const handleUpdateKYC = async (user: any, status: string) => {
    try {
      await firebaseService.updateDocument('users', user.uid, { kycStatus: status });
      toast.success(t('kyc_status_updated', { status }));
    } catch (error) {
      toast.error(t('kyc_update_failed'));
    }
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const displayName = formData.get('displayName') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;

    try {
      // Note: In a real app, you'd use Firebase Admin SDK to create the user in Auth
      // Here we just create the profile document
      const uid = `manual_${Date.now()}`;
      await firebaseService.setDocument('users', uid, {
        uid,
        email,
        displayName,
        role,
        status: 'active',
        kycStatus: 'none',
        createdAt: new Date().toISOString()
      });
      toast.success(t('user_created_auth_note'));
      setIsModalOpen(false);
    } catch (error) {
      toast.error(t('user_create_failed'));
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('totalUsers')}</h1>
          <p className="text-slate-400 mt-1">{t('realTimeStats')}</p>
        </div>
        <Button 
          variant="confirm"
          className="h-12 px-6 rounded-2xl shadow-lg shadow-green-600/20"
          onClick={() => {
            setModalMode('add');
            setIsModalOpen(true);
          }}
        >
          <UserPlus className="w-5 h-5 mr-2" />
          {t('register')}
        </Button>
      </div>

      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-display font-bold">{t('totalUsers')}</h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder={t('search')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-white/5 border-white/10 w-full md:w-96 h-11 rounded-2xl" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-5">{t('totalUsers')}</th>
                <th className="px-8 py-5">{t('type')} / {t('status')}</th>
                <th className="px-8 py-5">{t('totalBalance')}</th>
                <th className="px-8 py-5">{t('kyc_status')}</th>
                <th className="px-8 py-5 text-right">{t('quickActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user) => {
                  const vndWallet = wallets.find(w => w.uid === user.uid && w.currency === 'VND');
                  return (
                    <motion.tr 
                      key={user.uid}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center font-bold text-slate-400 border border-white/5">
                            {user.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{user.displayName || t('unknown')}</p>
                            <p className="text-[10px] text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={cn(
                            "w-fit text-[10px] uppercase tracking-wider",
                            user.role === 'admin' ? "border-red-500/50 text-red-500 bg-red-500/5" : "border-blue-500/50 text-blue-500 bg-blue-500/5"
                          )}>
                            {user.role === 'admin' ? t('admin') : t('user')}
                          </Badge>
                          <Badge className={cn(
                            "w-fit text-[10px] uppercase tracking-wider",
                            user.status === 'banned' ? "bg-red-600" : "bg-green-600"
                          )}>
                            {user.status === 'banned' ? t('banned') : t('active')}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-display font-bold text-lg">₫{(vndWallet?.balance || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t('wallet')} VND</p>
                      </td>
                      <td className="px-8 py-6">
                        <select 
                          value={user.kycStatus || 'none'} 
                          onChange={(e) => handleUpdateKYC(user, e.target.value)}
                          className={cn(
                            "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-transparent border outline-none cursor-pointer transition-all",
                            user.kycStatus === 'verified' ? "border-green-500/50 text-green-500 hover:bg-green-500/10" :
                            user.kycStatus === 'pending' ? "border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10" :
                            user.kycStatus === 'rejected' ? "border-red-500/50 text-red-500 hover:bg-red-500/10" :
                            "border-slate-700 text-slate-500 hover:bg-white/5"
                          )}
                        >
                          <option value="none">{t('none')}</option>
                          <option value="pending">{t('pending')}</option>
                          <option value="verified">{t('verified')}</option>
                          <option value="rejected">{t('rejected')}</option>
                        </select>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon" }),
                              "text-slate-400 hover:text-white rounded-xl"
                            )}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200 w-48 p-2 rounded-2xl">
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setModalMode('view');
                              setIsModalOpen(true);
                            }} className="rounded-xl cursor-pointer focus:bg-white/5">
                              <Users className="w-4 h-4 mr-2" /> {t('viewAll')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setModalMode('balance');
                              setIsModalOpen(true);
                            }} className="rounded-xl cursor-pointer focus:bg-white/5">
                              <Wallet className="w-4 h-4 mr-2" /> {t('totalBalance')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBanUnban(user)} className={cn(
                              "rounded-xl cursor-pointer focus:bg-red-500/10",
                              user.status === 'banned' ? "text-green-400" : "text-red-400"
                            )}>
                              <Ban className="w-4 h-4 mr-2" /> {user.status === 'banned' ? t('active') : t('reject')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg"
            >
              <Card className="bg-slate-900 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-display font-bold capitalize">
                      {modalMode === 'view' ? t('user_profile') : 
                       modalMode === 'balance' ? t('update_balance') : 
                       modalMode === 'add' ? t('add_new_user') : t('edit_user')}
                    </h2>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsModalOpen(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {modalMode === 'view' && selectedUser && (
                    <div className="space-y-8">
                      <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-red-600/20">
                          {selectedUser.displayName?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xl font-display font-bold truncate">{selectedUser.displayName}</p>
                          <p className="text-slate-400 truncate">{selectedUser.email}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge className="bg-red-600/20 text-red-500 border-none">{selectedUser.role}</Badge>
                            <Badge className="bg-green-600/20 text-green-500 border-none">{selectedUser.status}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Mail className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">{t('email')}</span>
                          </div>
                          <p className="text-sm font-medium truncate">{selectedUser.email}</p>
                        </div>
                        <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Phone className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">{t('phone_number')}</span>
                          </div>
                          <p className="text-sm font-medium">{selectedUser.phoneNumber || t('not_provided')}</p>
                        </div>
                        <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">{t('joined')}</span>
                          </div>
                          <p className="text-sm font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                          <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Shield className="w-3 h-3" />
                            <span className="text-[10px] uppercase font-bold tracking-widest">{t('kyc_status')}</span>
                          </div>
                          <p className="text-sm font-medium capitalize">{selectedUser.kycStatus || t('none')}</p>
                        </div>
                      </div>

                      <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                        <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">{t('kyc_documents')}</h4>
                        {selectedUser.kycData ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Passport Copy</p>
                              <div className="aspect-video bg-black/20 rounded-xl overflow-hidden border border-white/5">
                                <img 
                                  src={selectedUser.kycData.passportUrl} 
                                  alt="Passport" 
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(selectedUser.kycData.passportUrl, '_blank')}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Selfie</p>
                              <div className="aspect-video bg-black/20 rounded-xl overflow-hidden border border-white/5">
                                <img 
                                  src={selectedUser.kycData.selfieUrl} 
                                  alt="Selfie" 
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => window.open(selectedUser.kycData.selfieUrl, '_blank')}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-slate-600 text-sm italic py-4">No KYC documents uploaded yet.</p>
                        )}
                      </div>

                      <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                        <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">{t('wallet_balances')}</h4>
                        <div className="space-y-3">
                          {wallets.filter(w => w.uid === selectedUser.uid).map(w => (
                            <div key={w.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                              <span className="font-bold text-slate-300">{w.currency}</span>
                              <span className="font-display font-bold text-lg">₫{w.balance.toLocaleString()}</span>
                            </div>
                          ))}
                          {wallets.filter(w => w.uid === selectedUser.uid).length === 0 && (
                            <p className="text-center text-slate-600 text-sm italic py-4">{t('no_active_wallets')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {modalMode === 'balance' && selectedUser && (
                    <form onSubmit={handleUpdateBalance} className="space-y-6">
                      <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-2xl flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        <p className="text-xs text-red-400">{t('manual_balance_update_warning')}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('currency')}</Label>
                        <select name="currency" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:ring-2 focus:ring-red-500/20">
                          <option value="VND">VND (Vietnamese Dong)</option>
                          <option value="USD">USD (US Dollar)</option>
                          <option value="BDT">BDT (Bangladeshi Taka)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('update_type')}</Label>
                        <select name="type" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:ring-2 focus:ring-red-500/20">
                          <option value="add">{t('add_to_current_balance')}</option>
                          <option value="set">{t('set_absolute_balance')}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('amount')}</Label>
                        <Input name="amount" type="number" step="any" required className="h-12 bg-white/5 border-white/10 rounded-xl" />
                      </div>
                      <Button type="submit" variant="send" className="w-full h-14 font-bold rounded-2xl">{t('update_balance_now')}</Button>
                    </form>
                  )}

                  {modalMode === 'add' && (
                    <form onSubmit={handleAddUser} className="space-y-6">
                      <div className="space-y-2">
                        <Label>{t('fullName')}</Label>
                        <Input name="displayName" required className="h-12 bg-white/5 border-white/10 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('email')}</Label>
                        <Input name="email" type="email" required className="h-12 bg-white/5 border-white/10 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('password')}</Label>
                        <Input name="password" type="password" required className="h-12 bg-white/5 border-white/10 rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('user_role')}</Label>
                        <select name="role" className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:ring-2 focus:ring-red-500/20">
                          <option value="user">{t('regular_user')}</option>
                          <option value="admin">{t('system_administrator')}</option>
                        </select>
                      </div>
                      <Button type="submit" variant="confirm" className="w-full h-14 font-bold rounded-2xl">{t('create_user_profile')}</Button>
                    </form>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmConfig?.onConfirm || (() => {})}
        title={confirmConfig?.title || ''}
        description={confirmConfig?.description || ''}
        variant={confirmConfig?.variant}
      />
    </div>
  );
}
