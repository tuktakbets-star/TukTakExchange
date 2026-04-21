import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { firebaseService } from '../lib/firebaseService';
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRight,
  Search,
  AlertTriangle,
  ExternalLink,
  LayoutDashboard,
  Wallet,
  Send,
  Zap,
  TrendingUp,
  Bell,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { cn } from '@/lib/utils';

export default function AdminPanel() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));
    const unsubWallets = firebaseService.subscribeToCollection('wallets', [], (data) => setWallets(data));
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => setTransactions(data));
    const unsubRates = firebaseService.subscribeToCollection('rates', [], (data) => setRates(data));

    setLoading(false);
    return () => {
      unsubUsers();
      unsubWallets();
      unsubTX();
      unsubRates();
    };
  }, [isAdmin]);

  const totalBalanceAllUsers = wallets.reduce((acc, curr) => {
    const amount = curr.currency === 'VND' ? curr.balance : curr.balance * 25000;
    return acc + amount;
  }, 0);

  const pendingDeposits = transactions.filter(tx => tx.type === 'deposit' && tx.status === 'pending');
  const pendingSends = transactions.filter(tx => tx.type === 'send' && tx.status === 'pending');
  const pendingWithdraws = transactions.filter(tx => tx.type === 'withdraw' && tx.status === 'pending');
  const pendingRecharges = transactions.filter(tx => tx.type === 'recharge' && tx.status === 'pending');
  const disputedTransactions = transactions.filter(tx => tx.status === 'disputed');

  const handleApproveTransaction = async (tx: any) => {
    try {
      await firebaseService.updateDocument('transactions', tx.id, { status: 'completed', updatedAt: new Date().toISOString() });
      if (tx.type === 'deposit') {
        const walletId = `${tx.uid}_${tx.currency}`;
        const wallet = wallets.find(w => w.id === walletId);
        const currentBalance = wallet?.balance || 0;
        await firebaseService.setDocument('wallets', walletId, {
          uid: tx.uid,
          currency: tx.currency,
          balance: currentBalance + tx.amount,
          updatedAt: new Date().toISOString()
        });
      }
      toast.success('Transaction approved');
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleMarkAsPaid = async (tx: any) => {
    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'completed', 
        adminProof: 'https://picsum.photos/seed/proof/400/300',
        updatedAt: new Date().toISOString() 
      });
      toast.success('Marked as paid and proof uploaded');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleRefund = async (tx: any) => {
    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'failed', 
        updatedAt: new Date().toISOString() 
      });
      // Logic to return balance if it was deducted
      if (tx.type === 'send' || tx.type === 'withdraw' || tx.type === 'recharge') {
        const walletId = `${tx.uid}_${tx.currency}`;
        const wallet = wallets.find(w => w.id === walletId);
        await firebaseService.updateDocument('wallets', walletId, {
          balance: (wallet?.balance || 0) + tx.amount,
          updatedAt: new Date().toISOString()
        });
      }
      toast.success('Transaction refunded');
    } catch (error) {
      toast.error('Failed to refund');
    }
  };

  const handleUpdateRate = async (id: string, newRate: number) => {
    try {
      await firebaseService.updateDocument('rates', id, { rate: newRate, updatedAt: new Date().toISOString() });
      toast.success('Rate updated');
    } catch (error) {
      toast.error('Failed to update rate');
    }
  };

  const handleVerifyUser = async (uid: string) => {
    try {
      await firebaseService.updateDocument('users', uid, { kycStatus: 'verified' });
      toast.success('User verified');
    } catch (error) {
      toast.error('Failed to verify');
    }
  };

  const handleBanUser = async (uid: string) => {
    try {
      await firebaseService.updateDocument('users', uid, { status: 'banned' });
      toast.success('User banned');
    } catch (error) {
      toast.error('Failed to ban');
    }
  };

  const sendNotification = async (title: string, message: string) => {
    try {
      await firebaseService.addDocument('notifications', {
        title,
        message,
        type: 'alert',
        createdAt: new Date().toISOString(),
        read: false
      });
      toast.success('Notification sent to all users');
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deposits', label: 'Deposits', icon: Wallet, badge: pendingDeposits.length },
    { id: 'send-money', label: 'Send Money', icon: Send, badge: pendingSends.length },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight, badge: pendingWithdraws.length },
    { id: 'recharge', label: 'Recharge', icon: Zap, badge: pendingRecharges.length },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'rates', label: 'Rates', icon: TrendingUp },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, badge: disputedTransactions.length, color: 'text-red-500' },
  ];

  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Access Denied</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-white/5 transition-transform duration-300 lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold">T</div>
            <span className="font-display font-bold text-lg">Admin Panel</span>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", item.color)} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge ? (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold",
                  activeTab === item.id ? "bg-white text-red-600" : "bg-red-600/20 text-red-500"
                )}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-bold">
              {profile?.displayName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{profile?.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate">System Admin</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={() => auth.signOut()}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-display font-bold capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder="Search system..." className="pl-10 bg-white/5 border-white/10 w-64 h-10 rounded-xl" />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-slate-900" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="glass-dark border-white/5 rounded-3xl">
                    <CardContent className="p-6">
                      <p className="text-sm text-slate-400 mb-1">Total Users</p>
                      <p className="text-3xl font-display font-bold">{users.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-dark border-white/5 rounded-3xl">
                    <CardContent className="p-6">
                      <p className="text-sm text-slate-400 mb-1">Total Balance (VND)</p>
                      <p className="text-3xl font-display font-bold">₫{totalBalanceAllUsers.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-dark border-white/5 rounded-3xl">
                    <CardContent className="p-6">
                      <p className="text-sm text-slate-400 mb-1">Pending Requests</p>
                      <p className="text-3xl font-display font-bold text-yellow-500">{pendingDeposits.length + pendingSends.length + pendingWithdraws.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="glass-dark border-white/5 rounded-3xl">
                    <CardContent className="p-6">
                      <p className="text-sm text-slate-400 mb-1">Active Disputes</p>
                      <p className="text-3xl font-display font-bold text-red-500">{disputedTransactions.length}</p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="glass-dark border-white/5 rounded-3xl p-6">
                  <h3 className="text-xl font-bold mb-4">Recent System Activity</h3>
                  <div className="space-y-4">
                    {transactions.slice(0, 10).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            tx.status === 'completed' ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                          )}>
                            {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold">{users.find(u => u.uid === tx.uid)?.displayName || 'User'}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-widest">{tx.type} • {tx.status}</p>
                          </div>
                        </div>
                        <p className="font-display font-bold text-lg">{tx.amount.toLocaleString()} {tx.currency}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {activeTab === 'deposits' && (
              <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Proof</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingDeposits.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold">{users.find(u => u.uid === tx.uid)?.displayName}</td>
                          <td className="px-6 py-4 font-bold">{tx.amount.toLocaleString()} {tx.currency}</td>
                          <td className="px-6 py-4 text-sm">{tx.method}</td>
                          <td className="px-6 py-4">
                            <a href={tx.proofUrl} target="_blank" rel="noreferrer" className="text-red-500 flex items-center gap-1">
                              <ExternalLink className="w-4 h-4" /> View
                            </a>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="bg-green-600" onClick={() => handleApproveTransaction(tx)}>Approve</Button>
                              <Button size="sm" variant="ghost" className="text-red-400">Reject</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'send-money' && (
              <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                        <th className="px-6 py-4">Sender</th>
                        <th className="px-6 py-4">Receiver</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingSends.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold">{users.find(u => u.uid === tx.uid)?.displayName}</td>
                          <td className="px-6 py-4">
                            <p className="font-bold">{tx.receiverInfo?.name}</p>
                            <p className="text-xs text-slate-500">{tx.receiverInfo?.bankName}</p>
                          </td>
                          <td className="px-6 py-4 font-bold">{tx.amount.toLocaleString()} {tx.currency}</td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" className="bg-red-600" onClick={() => handleMarkAsPaid(tx)}>Mark as Paid</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'withdraw' && (
              <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Bank Info</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingWithdraws.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold">{users.find(u => u.uid === tx.uid)?.displayName}</td>
                          <td className="px-6 py-4 font-bold">{tx.amount.toLocaleString()} {tx.currency}</td>
                          <td className="px-6 py-4 text-sm">
                            {tx.bankInfo?.bankName} - {tx.bankInfo?.accountNumber}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" className="bg-red-600" onClick={() => handleMarkAsPaid(tx)}>Mark as Paid</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'recharge' && (
              <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                        <th className="px-6 py-4">Phone</th>
                        <th className="px-6 py-4">Operator</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingRecharges.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold">{tx.rechargeDetails?.phoneNumber}</td>
                          <td className="px-6 py-4">{tx.rechargeDetails?.operator} ({tx.rechargeDetails?.country})</td>
                          <td className="px-6 py-4 font-bold">{tx.amount.toLocaleString()} {tx.currency}</td>
                          <td className="px-6 py-4 text-right">
                            <Button size="sm" className="bg-green-600" onClick={() => handleApproveTransaction(tx)}>Complete</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'users' && (
              <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Balance</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((user) => (
                        <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold">{user.displayName}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </td>
                          <td className="px-6 py-4 font-bold">
                            ₫{(wallets.find(w => w.uid === user.uid && w.currency === 'VND')?.balance || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={user.status === 'banned' ? 'bg-red-600' : 'bg-green-600'}>
                              {user.status || 'active'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                setSelectedUser(user);
                                setIsUserModalOpen(true);
                              }}>Details</Button>
                              <Button size="sm" variant="outline" onClick={() => handleVerifyUser(user.uid)}>Verify</Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className={user.status === 'banned' ? 'text-green-400' : 'text-red-400'}
                                onClick={() => user.status === 'banned' ? firebaseService.updateDocument('users', user.uid, { status: 'active' }) : handleBanUser(user.uid)}
                              >
                                {user.status === 'banned' ? 'Unban' : 'Ban'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'rates' && (
              <Card className="glass-dark border-white/5 rounded-3xl p-8">
                <h3 className="text-xl font-bold mb-6">Exchange Rate Management</h3>
                <div className="grid gap-6">
                  {['BDT', 'INR', 'NPR', 'PKR'].map((curr) => {
                    const rateDoc = rates.find(r => r.target === curr);
                    return (
                      <div key={curr} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center font-bold text-red-500">VND</div>
                          <ArrowRight className="w-5 h-5 text-slate-600" />
                          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center font-bold text-purple-500">{curr}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Input 
                            type="number" 
                            defaultValue={rateDoc?.rate || 0.0045} 
                            className="w-32 bg-white/5 border-white/10 h-12 text-center font-bold"
                            onBlur={(e) => handleUpdateRate(rateDoc?.id || curr, parseFloat(e.target.value))}
                          />
                          <Button className="bg-red-600 h-12 px-6">Update</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card className="glass-dark border-white/5 rounded-3xl p-8">
                <h3 className="text-xl font-bold mb-6">Send Global Notification</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  sendNotification(formData.get('title') as string, formData.get('message') as string);
                  (e.target as HTMLFormElement).reset();
                }} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input name="title" required className="bg-white/5 border-white/10 h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <textarea name="message" required className="w-full bg-white/5 border border-white/10 rounded-xl p-4 min-h-[120px]" />
                  </div>
                  <Button type="submit" className="w-full h-14 bg-red-600 text-white font-bold text-lg">Send to All Users</Button>
                </form>
              </Card>
            )}

            {activeTab === 'disputes' && (
              <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                        <th className="px-6 py-4">Parties</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {disputedTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold">S: {users.find(u => u.uid === tx.uid)?.displayName}</p>
                            <p className="font-bold text-red-500">R: {tx.receiverInfo?.name}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-red-400">{tx.disputeReason}</td>
                          <td className="px-6 py-4 font-bold">{tx.amount.toLocaleString()} {tx.currency}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="bg-green-600" onClick={() => handleApproveTransaction(tx)}>Resolve (Complete)</Button>
                              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleRefund(tx)}>Refund</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* User Details Modal */}
      {isUserModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card className="w-full max-w-lg bg-slate-900 border-white/10 rounded-[2.5rem] overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-display font-bold">User Details</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsUserModalOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl">
                  <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 text-2xl font-bold">
                    {selectedUser.displayName?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xl font-bold">{selectedUser.displayName}</p>
                    <p className="text-slate-400">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
                    <Badge className={selectedUser.status === 'banned' ? 'bg-red-600' : 'bg-green-600'}>
                      {selectedUser.status || 'active'}
                    </Badge>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl">
                    <p className="text-xs text-slate-500 uppercase mb-1">KYC</p>
                    <Badge variant="outline" className="border-white/10">
                      {selectedUser.kycStatus || 'none'}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl">
                  <p className="text-xs text-slate-500 uppercase mb-4">Wallets</p>
                  <div className="space-y-2">
                    {wallets.filter(w => w.uid === selectedUser.uid).map(w => (
                      <div key={w.id} className="flex justify-between items-center">
                        <span className="font-bold">{w.currency}</span>
                        <span>{w.balance.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full h-12 bg-red-600" onClick={() => setIsUserModalOpen(false)}>Close</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
