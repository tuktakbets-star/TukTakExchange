import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { firebaseService } from '../lib/firebaseService';
import { where, orderBy } from 'firebase/firestore';
import { QRScanner } from '../components/QRScanner';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet as WalletIcon, 
  History,
  Filter,
  Download,
  Search,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  QrCode,
  Building2,
  Lock,
  ChevronRight,
  Clock,
  Camera,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function Wallet() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTransactions, setActiveTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog Open States
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [pendingIncoming, setPendingIncoming] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<any>(null);

  // Withdrawal Detailed States
  const [withdrawBankName, setWithdrawBankName] = useState('');
  const [withdrawAccountName, setWithdrawAccountName] = useState('');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Multi-step states
  const [depositStep, setDepositStep] = useState(1);
  const [withdrawStep, setWithdrawStep] = useState(1);
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawPassword, setWithdrawPassword] = useState('');

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubWallets = firebaseService.subscribeToCollection(
      'wallets',
      [where('uid', '==', profile.uid)],
      (data) => setWallets(data)
    );

    const unsubTransactions = firebaseService.subscribeToCollection(
      'transactions',
      [where('uid', '==', profile.uid), orderBy('createdAt', 'desc')],
      (data) => setTransactions(data)
    );

    const unsubActive = firebaseService.subscribeToCollection(
      'transactions',
      [where('uid', '==', profile.uid), where('status', 'in', ['pending', 'accepted', 'paid', 'disputed'])],
      (data) => setActiveTransactions(data)
    );

    const unsubIncoming = firebaseService.subscribeToCollection(
      'transactions',
      [where('receiverInfo.email', '==', profile.email), where('status', '==', 'pending')],
      (data) => setPendingIncoming(data)
    );

    const unsubSettings = firebaseService.subscribeToCollection('adminSettings', [], (data) => {
      const globalSettings = data.find(s => s.key === 'global_settings');
      if (globalSettings) setAdminSettings(globalSettings.value);
    });

    setLoading(false);
    return () => {
      unsubWallets();
      unsubTransactions();
      unsubActive();
      unsubIncoming();
      unsubSettings();
    };
  }, [profile?.uid, profile?.email]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'deposit') {
      setIsDepositOpen(true);
      // Remove param after opening
      setSearchParams({}, { replace: true });
    } else if (action === 'withdraw') {
      setIsWithdrawOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDeposit = async () => {
    if (!amount || isNaN(Number(amount))) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!proofFile) {
      toast.error('Please upload payment proof');
      return;
    }

    setIsSubmitting(true);
    try {
      const realProofUrl = await firebaseService.uploadFile(proofFile);
      const tx = {
        uid: profile?.uid,
        type: 'deposit',
        status: 'pending',
        amount: Number(amount),
        currency: currency,
        createdAt: new Date().toISOString(),
        description: `Deposit ${currency} to wallet`,
        proofUrl: realProofUrl
      };
      const docId = await firebaseService.addDocument('transactions', tx);
      toast.success('Deposit request submitted!');
      navigate(`/waiting/${docId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit deposit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 200000) {
      toast.error('Minimum Withdrawal amount is 200,000 VND');
      return;
    }

    const wallet = wallets.find(w => w.currency === currency);
    if (!wallet || wallet.balance < Number(amount)) {
      toast.error('Insufficient balance');
      return;
    }

    if (!withdrawPassword) {
      toast.error('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    try {
      const wallet = wallets.find(w => w.currency === currency);
      const currentBalance = wallet?.balance || 0;
      const locked = wallet?.pendingLocked || 0;
      const spendable = currentBalance - locked;
      
      if (spendable < Number(amount)) {
        toast.error('Insufficient available balance (some funds are pending)');
        setIsSubmitting(false);
        return;
      }

      const tx = {
        uid: profile?.uid,
        type: 'withdraw',
        status: 'pending',
        amount: Number(amount),
        currency: currency,
        createdAt: new Date().toISOString(),
        description: `Withdraw ${currency} to ${withdrawBankName}`,
        bankInfo: {
          bankName: withdrawBankName,
          accountNumber: withdrawAccountNumber,
          accountName: withdrawAccountName
        }
      };

      // 1. Create Transaction
      const docId = await firebaseService.addDocument('transactions', tx);

      // 2. Lock Balance (Hidden Deduction)
      await firebaseService.updateWalletBalance(profile?.uid!, currency, 0, Number(amount));

      toast.success('Withdrawal request submitted!');
      navigate(`/waiting/${docId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit withdrawal request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQRScan = (data: string) => {
    // Basic parser: Expects BankName|AccountNumber|AccountName or similar
    // Or just a raw string that we might try to guess
    const parts = data.split('|');
    if (parts.length >= 3) {
      setWithdrawBankName(parts[0]);
      setWithdrawAccountNumber(parts[1]);
      setWithdrawAccountName(parts[2]);
      toast.success('QR Data parsed successfully!');
    } else {
      // If simple data, set it to account number
      setWithdrawAccountNumber(data);
      toast.info('QR Data added to account number field');
    }
  };

  const handleConfirmReceive = async (tx: any) => {
    setIsSubmitting(true);
    try {
      await firebaseService.updateDocument('transactions', tx.id, { status: 'completed' });
      
      const walletId = `${profile?.uid}_${tx.targetCurrency || tx.currency}`;
      const wallet = wallets.find(w => w.currency === (tx.targetCurrency || tx.currency));
      
      const currentBalance = wallet?.balance || 0;
      const newBalance = currentBalance + (tx.targetAmount || tx.amount);

      await firebaseService.setDocument('wallets', walletId, {
        uid: profile?.uid,
        currency: tx.targetCurrency || tx.currency,
        balance: newBalance,
        updatedAt: new Date().toISOString()
      });

      toast.success('Funds received and added to your wallet!');
    } catch (error) {
      toast.error('Failed to confirm receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionClick = (tx: any) => {
    const activeStatuses = ['pending', 'accepted', 'paid', 'disputed'];
    if (activeStatuses.includes(tx.status)) {
      navigate(`/waiting/${tx.id}`);
    } else {
      setSelectedTx(tx);
    }
  };

  const handleAppeal = async (tx: any) => {
    try {
      await firebaseService.updateDocument('transactions', tx.id, { 
        status: 'disputed',
        disputedAt: new Date().toISOString(),
        disputeReason: 'User reported issue with transaction'
      });
      toast.success('Dispute opened. Admin will review shortly.');
    } catch (error) {
      toast.error('Failed to open dispute');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">{t('wallet')}</h1>
        <div className="flex gap-2">
          <Dialog open={isDepositOpen} onOpenChange={(open) => {
            setIsDepositOpen(open);
            if (!open) setDepositStep(1);
          }}>
            <DialogTrigger render={<Button className="bg-brand-blue hover:bg-blue-500 text-white rounded-xl" />}>
                <Plus className="w-4 h-4 mr-2" />
                {t('addMoney')}
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {depositStep === 1 ? t('addMoney') : depositStep === 2 ? t('rates') : t('confirmTransfer')}
                </DialogTitle>
              </DialogHeader>
              
              {depositStep === 1 && (
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400">{t('type')}</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                        <SelectValue placeholder={t('search')} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">{t('amount')}</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-white/5 border-white/10 h-14 rounded-xl text-xl font-display font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">{currency}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => amount && setDepositStep(2)} 
                    className="w-full h-12 bg-brand-blue hover:bg-blue-500 rounded-xl font-bold"
                  >
                    {t('confirmTransfer')}
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}

              {depositStep === 2 && (
                <div className="space-y-6 py-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Bank Details</p>
                        <p className="font-bold">{adminSettings?.bankName || 'Vietcombank'} - {adminSettings?.accountHolder || 'Tuktak Admin'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Account Number</span>
                        <span className="font-mono font-bold">{adminSettings?.accountNumber || '1234 5678 9012'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Account Name</span>
                        <span className="font-bold uppercase">{adminSettings?.accountHolder || 'TUKTAK EXCHANGE ADMIN'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-2xl">
                    {adminSettings?.qrCode ? (
                      <img src={adminSettings.qrCode} alt="QR Code" className="w-48 h-48 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <QrCode className="w-32 h-32 text-white" />
                    )}
                    <p className="text-xs text-slate-500 font-medium">Scan QR to pay instantly</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400">Upload Payment Proof</Label>
                    <div 
                      className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-brand-blue/50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('proof-upload')?.click()}
                    >
                      <input 
                        id="proof-upload" 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      />
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2 text-brand-blue">
                          <FileText className="w-5 h-5" />
                          <span className="text-sm font-bold">{proofFile.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-slate-500" />
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Upload Receipt</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setDepositStep(1)} className="flex-1 h-12 rounded-xl">BACK</Button>
                    <Button 
                      onClick={() => proofFile && setDepositStep(3)} 
                      className="flex-2 h-12 bg-brand-blue hover:bg-blue-500 rounded-xl font-bold"
                    >
                      NEXT
                    </Button>
                  </div>
                </div>
              )}

              {depositStep === 3 && (
                <div className="space-y-6 py-4">
                  <div className="text-center space-y-2">
                    <p className="text-slate-400">You are depositing</p>
                    <h2 className="text-4xl font-display font-bold text-white">{Number(amount).toLocaleString()} {currency}</h2>
                  </div>
                  
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="text-xs text-yellow-500 leading-relaxed">
                      Please ensure you have transferred the exact amount. Our admin will verify the proof and update your balance within 30 minutes.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setDepositStep(2)} className="flex-1 h-12 rounded-xl">BACK</Button>
                    <Button 
                      onClick={handleDeposit} 
                      disabled={isSubmitting}
                      className="flex-2 h-12 bg-green-600 hover:bg-green-500 rounded-xl font-bold"
                    >
                      {isSubmitting ? 'SUBMITTING...' : 'CONFIRM DEPOSIT'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isWithdrawOpen} onOpenChange={(open) => {
            setIsWithdrawOpen(open);
            if (!open) setWithdrawStep(1);
          }}>
            <DialogTrigger render={<Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl" />}>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                {t('withdraw')}
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {withdrawStep === 1 ? t('withdraw') : withdrawStep === 2 ? t('rates') : t('confirmTransfer')}
                </DialogTitle>
              </DialogHeader>

              {withdrawStep === 1 && (
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-slate-400">Select Wallet</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {wallets.map(w => (
                          <SelectItem key={w.currency} value={w.currency}>
                            {w.currency} (Balance: {w.balance.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-400">Enter Amount</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-white/5 border-white/10 h-14 rounded-xl text-xl font-display font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">{currency}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => amount && setWithdrawStep(2)} 
                    className="w-full h-12 bg-brand-blue hover:bg-blue-500 rounded-xl font-bold"
                  >
                    NEXT
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}

              {withdrawStep === 2 && (
                <div className="space-y-6 py-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-slate-400">Recipient Details</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-brand-blue font-bold px-0 h-auto"
                      onClick={() => setIsQRScannerOpen(true)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Scan QR
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Bank Name</Label>
                       <div className="relative">
                         <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <Input 
                            placeholder="e.g. Vietcombank" 
                            value={withdrawBankName}
                            onChange={(e) => setWithdrawBankName(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl"
                         />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Account Holder Name</Label>
                       <div className="relative">
                         <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <Input 
                            placeholder="FULL NAME" 
                            value={withdrawAccountName}
                            onChange={(e) => setWithdrawAccountName(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl font-bold uppercase"
                         />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-xs text-slate-500 uppercase tracking-widest font-bold">Account Number</Label>
                       <div className="relative">
                         <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <Input 
                            placeholder="1234567890" 
                            value={withdrawAccountNumber}
                            onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl font-mono"
                         />
                       </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setWithdrawStep(1)} className="flex-1 h-12 rounded-xl">BACK</Button>
                    <Button 
                      onClick={() => withdrawBankName && withdrawAccountNumber && withdrawAccountName && setWithdrawStep(3)} 
                      className="flex-2 h-12 bg-brand-blue hover:bg-blue-500 rounded-xl font-bold"
                    >
                      NEXT
                    </Button>
                  </div>
                </div>
              )}

              {withdrawStep === 3 && (
                <div className="space-y-6 py-4">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Withdraw Amount</span>
                      <span className="font-bold">{Number(amount).toLocaleString()} {currency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Bank</span>
                      <span className="font-bold">{withdrawBankName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Holder</span>
                      <span className="font-bold">{withdrawAccountName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Account</span>
                      <span className="font-mono font-bold">{withdrawAccountNumber}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-400">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        value={withdrawPassword}
                        onChange={(e) => setWithdrawPassword(e.target.value)}
                        className="bg-white/5 border-white/10 h-12 pl-12 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setWithdrawStep(2)} className="flex-1 h-12 rounded-xl">BACK</Button>
                    <Button 
                      onClick={handleWithdraw} 
                      disabled={isSubmitting}
                      className="flex-2 h-12 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold"
                    >
                      {isSubmitting ? 'PROCESSING...' : 'CONFIRM WITHDRAW'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pending Actions Section */}
      {(pendingIncoming.length > 0 || activeTransactions.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Pending Transactions
          </h2>
          <div className="grid gap-4">
            {activeTransactions.map((tx) => (
              <Card key={tx.id} className="bg-yellow-500/5 border-yellow-500/20 rounded-3xl overflow-hidden cursor-pointer hover:bg-yellow-500/10 transition-all" onClick={() => navigate(`/waiting/${tx.id}`)}>
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold">{tx.type === 'exchange' ? 'Currency Exchange' : tx.type.toUpperCase()}</p>
                      <p className="text-sm text-slate-400">
                        {tx.status === 'paid' ? 'Action Required: Confirm Receipt' : 
                         tx.status === 'accepted' ? 'Order Received - Admin Processing' : 'Awaiting Review'}
                      </p>
                    </div>
                  </div>
                  <Button className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl h-11 px-6 font-bold">
                    View Progress
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {pendingIncoming.map((tx) => (
              <Card key={tx.id} className="bg-yellow-500/5 border-yellow-500/20 rounded-3xl overflow-hidden">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                      <ArrowDownLeft className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold">Incoming Payment from {tx.uid.substring(0, 8)}...</p>
                      <p className="text-sm text-slate-400">You will receive <span className="text-white font-bold">{tx.targetAmount || tx.amount} {tx.targetCurrency || tx.currency}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button 
                      onClick={() => handleConfirmReceive(tx)}
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none bg-green-600 hover:bg-green-500 text-white rounded-xl h-11 px-6 font-bold"
                    >
                      Confirm Receipt
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleAppeal(tx)}
                      className="flex-1 md:flex-none text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl h-11 px-6"
                    >
                      Appeal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Wallets Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.length > 0 ? wallets.map((wallet, idx) => (
          <Card key={idx} className="glass-dark border-white/5 rounded-3xl overflow-hidden group hover:border-brand-blue/30 transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                  <WalletIcon className="w-6 h-6" />
                </div>
                <Badge variant="outline" className="border-white/10 text-slate-400">{t('active')}</Badge>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">{wallet.currency} {t('wallet')}</p>
              <h3 className="text-3xl font-display font-bold mb-2">
                {wallet.currency === 'VND' ? '₫' : wallet.currency === 'USD' ? '$' : ''}
                {wallet.balance.toLocaleString()}
              </h3>
              {wallet.pendingLocked > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-4">
                  <Lock className="w-3 h-3" />
                  {wallet.pendingLocked.toLocaleString()} {t('locked', 'Locked')}
                </div>
              )}
              {!wallet.pendingLocked && <div className="mb-6 h-4" />}
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 bg-white/5 hover:bg-white/10 text-xs h-9">{t('notificationHistory')}</Button>
                <Button variant="ghost" className="flex-1 bg-white/5 hover:bg-white/10 text-xs h-9">{t('viewAll')}</Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full py-12 text-center glass rounded-3xl border-dashed border-white/10">
            <WalletIcon className="w-12 h-12 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500">{t('noTransactions')}</p>
          </div>
        )}
      </div>

      {/* Full Transaction History */}
      <Card className="glass-dark border-white/5 rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-display font-bold">{t('recentTransactions')}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input placeholder={t('search')} className="bg-white/5 border-white/10 pl-9 h-9 w-48 text-xs" />
            </div>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/5 h-9">
              <Filter className="w-4 h-4 mr-2" />
              {t('rates')}
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/5 h-9">
              <Download className="w-4 h-4 mr-2" />
              {t('download_report')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="px-6 py-4 font-medium">{t('type')}</th>
                  <th className="px-6 py-4 font-medium">{t('date')}</th>
                  <th className="px-6 py-4 font-medium">{t('amount')}</th>
                  <th className="px-6 py-4 font-medium">{t('status')}</th>
                  <th className="px-6 py-4 font-medium">{t('about')}</th>
                  <th className="px-6 py-4 font-medium text-right">{t('quickActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          tx.type === 'deposit' || tx.type === 'receive' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {tx.type === 'deposit' || tx.type === 'receive' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <span className="font-medium capitalize text-sm">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-bold text-sm",
                        tx.type === 'deposit' || tx.type === 'receive' ? "text-green-400" : "text-white"
                      )}>
                        {tx.type === 'deposit' || tx.type === 'receive' ? '+' : '-'} {tx.amount.toLocaleString()} {tx.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn(
                        "text-[10px] h-5",
                        tx.status === 'completed' ? "border-green-500/50 text-green-500" : 
                        tx.status === 'pending' ? "border-yellow-500/50 text-yellow-500" : "border-red-500/50 text-red-500"
                      )}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" onClick={() => handleTransactionClick(tx)} />}>
                              <Eye className="w-4 h-4" />
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                              <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div>
                                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Amount</p>
                                  <p className="text-2xl font-display font-bold">{tx.amount.toLocaleString()} {tx.currency}</p>
                                </div>
                                <Badge className={cn(
                                  "capitalize",
                                  tx.status === 'completed' ? "bg-green-500/20 text-green-500" : 
                                  tx.status === 'pending' ? "bg-yellow-500/20 text-yellow-500" : "bg-red-500/20 text-red-500"
                                )}>
                                  {tx.status}
                                </Badge>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Transaction ID</span>
                                  <span className="font-mono text-xs">{tx.id}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Date</span>
                                  <span>{new Date(tx.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-500">Type</span>
                                  <span className="capitalize">{tx.type}</span>
                                </div>
                                {tx.receiverInfo && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Receiver</span>
                                    <span>{tx.receiverInfo.name}</span>
                                  </div>
                                )}
                              </div>

                              {tx.proofUrl && (
                                <div className="space-y-2">
                                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Payment Proof</p>
                                  <div className="aspect-video rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden relative group">
                                    <img src={tx.proofUrl} alt="Proof" className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <Button variant="secondary" size="sm" className="absolute bg-slate-900/80 backdrop-blur-md border-white/10">
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {tx.status === 'pending' && tx.uid === profile?.uid && (
                                <Button 
                                  variant="ghost" 
                                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                                  onClick={() => handleAppeal(tx)}
                                >
                                  <AlertTriangle className="w-4 h-4 mr-2" />
                                  Report Issue / Appeal
                                </Button>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-sm">
                No transactions found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <QRScanner 
        isOpen={isQRScannerOpen} 
        onClose={() => setIsQRScannerOpen(false)} 
        onScan={handleQRScan} 
      />
    </div>
  );
}
