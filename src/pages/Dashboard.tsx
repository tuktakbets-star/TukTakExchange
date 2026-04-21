import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { firebaseService } from '../lib/firebaseService';
import { where, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Send, 
  Plus, 
  MoreHorizontal,
  TrendingUp,
  CreditCard,
  ArrowRightLeft,
  History,
  Globe,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  Heart,
  Info,
  CheckCircle2,
  Building2,
  FileText,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const data = [
  { name: 'Mon', value: 400 },
  { name: 'Tue', value: 300 },
  { name: 'Wed', value: 600 },
  { name: 'Thu', value: 800 },
  { name: 'Fri', value: 500 },
  { name: 'Sat', value: 900 },
  { name: 'Sun', value: 700 },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTransactions, setActiveTransactions] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calcAmount, setCalcAmount] = useState('1000000');
  const [calcTarget, setCalcTarget] = useState('BDT');
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubWallets = firebaseService.subscribeToCollection(
      'wallets',
      [where('uid', '==', profile.uid)],
      (data) => setWallets(data)
    );

    const unsubTransactions = firebaseService.subscribeToCollection(
      'transactions',
      [where('uid', '==', profile.uid), orderBy('createdAt', 'desc'), limit(5)],
      (data) => setTransactions(data)
    );

    const unsubActive = firebaseService.subscribeToCollection(
      'transactions',
      [where('uid', '==', profile.uid), where('status', 'in', ['pending', 'accepted', 'paid', 'disputed'])],
      (data) => setActiveTransactions(data)
    );

    const unsubRates = firebaseService.subscribeToCollection('rates', [], (data) => {
      setRates(data);
    });

    const unsubNotifications = firebaseService.subscribeToCollection(
      'notifications',
      [where('uid', '==', profile.uid), orderBy('createdAt', 'desc'), limit(5)],
      (data) => setNotifications(data)
    );

    setLoading(false);
    return () => {
      unsubWallets();
      unsubTransactions();
      unsubActive();
      unsubRates();
      unsubNotifications();
    };
  }, [profile?.uid]);

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read) {
      await firebaseService.updateDocument('notifications', notif.id, { read: true });
    }
    
    if (notif.txId) {
      const tx = transactions.find(t => t.id === notif.txId);
      if (tx) {
        handleTransactionClick(tx);
      } else {
        // Fetch tx if not in recent
        const fetchedTx = await firebaseService.getDocument('transactions', notif.txId);
        if (fetchedTx) handleTransactionClick({ id: notif.txId, ...fetchedTx });
      }
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const currentRate = rates.find(r => r.target === calcTarget)?.rate || 0;
  const totalBalanceVND = wallets.reduce((acc, curr) => acc + curr.balance, 0);

  const handleTransactionClick = (tx: any) => {
    const activeStatuses = ['pending', 'accepted', 'paid', 'disputed'];
    if (activeStatuses.includes(tx.status)) {
      navigate(`/waiting/${tx.id}`);
    } else {
      setSelectedTransaction(tx);
    }
  };

  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const chartData = useMemo(() => {
    const days = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        day: days[d.getDay()],
        date: d.toLocaleDateString(),
        timestamp: d.getTime(),
        value: totalBalanceVND
      };
    }).reverse();

    if (transactions.length === 0) {
      return last7Days.map(d => ({ name: d.day, value: totalBalanceVND }));
    }

    // Work backwards from current balance
    let currentBalance = totalBalanceVND;
    const result = [...last7Days].reverse().map((d, idx) => {
      if (idx === 0) {
        return { name: d.day, value: currentBalance };
      }

      // Find transactions that happened between this day and the next day in our reversed list
      const prevDay = last7Days[last7Days.length - idx];
      const dayTx = transactions.filter(tx => {
        const txDate = new Date(tx.createdAt).getTime();
        return txDate <= prevDay.timestamp && txDate > d.timestamp;
      });

      const dayImpact = dayTx.reduce((acc, tx) => {
        const amount = tx.currency === 'VND' ? tx.amount : tx.amount * 25000; // rough conversion
        return acc + (tx.type === 'deposit' || tx.type === 'receive' ? amount : -amount);
      }, 0);

      currentBalance -= dayImpact;
      return { name: d.day, value: Math.max(0, currentBalance) };
    });

    return result.reverse();
  }, [transactions, totalBalanceVND]);

  return (
    <div className="space-y-8 pb-32 lg:pb-12 px-1">
      {/* Dashboard Header Title */}
      <div className="text-center md:text-left pt-2 pb-4">
        <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-600 to-purple-600">
            Tuktak Exchange
          </span>
        </h1>
      </div>

      {/* Pending Actions for User */}
       <AnimatePresence>
        {activeTransactions.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-yellow-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Active Transactions
              </h3>
              <Badge variant="outline" className="text-[10px] border-yellow-500/20 text-yellow-500">
                {activeTransactions.length} Pending
              </Badge>
            </div>
            <div className="grid gap-3">
              {activeTransactions.map((tx) => (
                <Card 
                  key={tx.id} 
                  className="glass-dark border-yellow-500/20 rounded-2xl overflow-hidden cursor-pointer hover:bg-yellow-500/5 transition-colors"
                  onClick={() => navigate(`/waiting/${tx.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{tx.type === 'exchange' ? 'Currency Exchange' : tx.type.toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400">
                          {tx.status === 'paid' ? 'Action Required: Confirm Receipt' : 
                           tx.status === 'accepted' ? 'Order Received - Processing' : 'Awaiting Review'}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-yellow-500 h-8 font-bold text-xs">
                      View Status
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Quick Actions (bKash Style) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
        {[
          { icon: CreditCard, label: t('addMoney'), color: 'from-blue-600 to-blue-700', path: '/add-money' },
          { icon: Plus, label: t('cashIn'), color: 'from-green-500 to-green-600', path: '/cash-in' },
          { icon: ArrowRightLeft, label: t('exchangeMoney'), color: 'from-purple-500 to-purple-600', path: '/exchange' },
          { icon: Send, label: t('sendMoney'), color: 'from-blue-500 to-blue-600', path: '/send' },
          { icon: Zap, label: t('recharge'), color: 'from-amber-500 to-amber-600', path: '/recharge' },
          { icon: ArrowUpRight, label: t('withdraw'), color: 'from-pink-500 to-pink-600', path: '/wallet?action=withdraw' },
        ].map((action, idx) => (
          <Link key={idx} to={action.path}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex flex-col items-center gap-2 group"
            >
              <div className={cn(
                "w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all group-hover:shadow-xl group-hover:-translate-y-1 bg-gradient-to-br",
                action.color
              )}>
                <action.icon className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <span className="text-[10px] md:text-xs font-bold text-slate-400 group-hover:text-white transition-colors text-center">
                {action.label}
              </span>
            </motion.button>
          </Link>
        ))}
      </div>

      {/* 2. Balance Card (big glass card) */}
      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 blur-[100px] -mr-32 -mt-32"></div>
        <CardHeader className="relative z-10 flex flex-row items-center justify-between">
          <CardTitle className="text-slate-400 font-medium text-xs md:text-sm uppercase tracking-wider">{t('totalBalance')} (VND)</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              className={cn("text-slate-500 hover:text-white rounded-full", isRefreshing && "animate-spin")}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowBalance(!showBalance)}
              className="text-slate-500 hover:text-white rounded-full"
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex flex-wrap items-baseline gap-2 md:gap-4">
              <h2 className="text-3xl md:text-5xl font-display font-bold">
                {showBalance ? `₫${totalBalanceVND.toLocaleString()}` : '••••••••'}
              </h2>
              <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +2.4%
              </div>
            </div>
            
            {/* Account ID / Phone Number Display */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Account Number</p>
                <p className="text-sm font-bold text-white leading-none">{profile?.phoneNumber || 'Not Set'}</p>
              </div>
            </div>
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Exchange Rate Calculator */}
      <Card className="glass-dark border-white/5 rounded-[2.5rem] p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-brand-blue" />
          </div>
          <h3 className="text-xl font-display font-bold">{t('calculator')}</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('amount')} (VND)</label>
            <div className="relative">
              <Input 
                type="number" 
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="bg-white/5 border-white/10 h-14 rounded-2xl text-xl font-display font-bold text-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">VND</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('rates')}</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {rates.map((r) => (
                <button
                  key={r.target}
                  onClick={() => setCalcTarget(r.target)}
                  className={cn(
                    "min-w-[80px] h-14 rounded-2xl font-bold transition-all border shrink-0",
                    calcTarget === r.target 
                      ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-blue-600/20" 
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                  )}
                >
                  {r.target}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-6 rounded-2xl bg-brand-blue/5 border border-brand-blue/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">{t('estimated_result')}</p>
            <p className="text-3xl font-display font-bold text-white">
              {(parseFloat(calcAmount) * currentRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} {calcTarget}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">{t('current_rate')}</p>
            <p className="text-sm font-bold text-brand-blue">1 VND = {currentRate} {calcTarget}</p>
          </div>
        </div>
      </Card>

      {/* 4. Notifications Section */}
      {notifications.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display font-bold">Notifications</h3>
            <Badge className="bg-brand-blue/10 text-brand-blue border-brand-blue/20">
              {notifications.filter(n => !n.read).length} New
            </Badge>
          </div>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleNotificationClick(notif)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 items-start",
                  notif.read ? "bg-white/5 border-white/5 opacity-60" : "bg-brand-blue/5 border-brand-blue/20 shadow-lg shadow-blue-600/5"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  notif.type === 'transaction' ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"
                )}>
                  {notif.type === 'transaction' ? <Zap className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-sm text-white">{notif.title}</h4>
                    <span className="text-[10px] text-slate-500">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{notif.message}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Sending History (full detailed list) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-bold">{t('recentTransactions')}</h3>
          <Link to="/wallet">
            <Button variant="ghost" className="text-brand-blue hover:text-blue-400 font-bold">{t('view_all_history')}</Button>
          </Link>
        </div>
        
        <div className="space-y-4">
          {transactions.length > 0 ? transactions.map((tx, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleTransactionClick(tx)}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-3xl glass border-white/5 hover:border-white/10 transition-all group gap-4 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  tx.type === 'deposit' || tx.type === 'receive' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {tx.type === 'deposit' || tx.type === 'receive' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold text-white flex items-center gap-2">
                    {tx.type === 'receive' ? `From: ${tx.senderName || 'Tuktak User'}` : (tx.receiverName || 'System')} 
                    <span className="text-[10px] text-slate-500 font-normal">#{tx.id?.substring(0, 8)}</span>
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                    <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="capitalize">{tx.type}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-6">
                <div className="text-right">
                  <p className={cn(
                    "font-display font-bold text-lg",
                    tx.type === 'deposit' || tx.type === 'receive' ? "text-green-400" : "text-white"
                  )}>
                    {tx.type === 'deposit' || tx.type === 'receive' ? '+' : '-'} {tx.amount.toLocaleString()} {tx.currency}
                  </p>
                  <p className="text-[10px] text-slate-500">{t('fee')}: ₫0</p>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[10px] h-6 px-3 rounded-full",
                  tx.status === 'completed' ? "border-green-500/50 text-green-500 bg-green-500/5" : 
                  tx.status === 'pending' ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/5" : "border-red-500/50 text-red-500 bg-red-500/5"
                )}>
                  {tx.status}
                </Badge>
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-16 glass border-white/5 rounded-[2.5rem]">
              <History className="w-16 h-16 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">{t('noTransactions')}</p>
            </div>
          )}
        </div>
      </div>
      {/* Transaction Detail Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransaction(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-blue/10 blur-3xl rounded-full" />
              
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-display font-bold">{t('transactionDetails')}</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTransaction(null)} className="text-slate-500 hover:text-white">
                  <EyeOff className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col items-center text-center p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-4",
                    selectedTransaction.type === 'deposit' || selectedTransaction.type === 'receive' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {selectedTransaction.type === 'deposit' || selectedTransaction.type === 'receive' ? <ArrowDownLeft className="w-8 h-8" /> : <ArrowUpRight className="w-8 h-8" />}
                  </div>
                  <h3 className="text-3xl font-display font-bold">
                    {selectedTransaction.type === 'deposit' || selectedTransaction.type === 'receive' ? '+' : '-'} {selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}
                  </h3>
                  <Badge className={cn(
                    "mt-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                    selectedTransaction.status === 'completed' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                    selectedTransaction.status === 'pending' ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                    "bg-red-500/10 text-red-500 border border-red-500/20"
                  )}>
                    {selectedTransaction.status}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t('transactionId')}</span>
                    <span className="font-mono text-white">#{selectedTransaction.id?.substring(0, 12)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t('date')}</span>
                    <span className="text-white">{new Date(selectedTransaction.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t('type')}</span>
                    <span className="text-white capitalize">{selectedTransaction.type}</span>
                  </div>
                  {selectedTransaction.receiverInfo && (
                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('receiver_details')}</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t('name')}</span>
                        <span className="text-white">{selectedTransaction.receiverInfo.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t('bank')}</span>
                        <span className="text-white">{selectedTransaction.receiverInfo.bankName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t('account')}</span>
                        <span className="font-mono text-white">{selectedTransaction.receiverInfo.accountNumber}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => setSelectedTransaction(null)}
                  className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10"
                >
                  {t('close')}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
