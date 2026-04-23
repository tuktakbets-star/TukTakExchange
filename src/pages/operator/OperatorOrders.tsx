import React, { useState, useEffect } from 'react';
import { firebaseService } from '@/lib/firebaseService';
import { operatorService } from '@/lib/operatorService';
import { useAuth } from '@/hooks/useAuth';
import { where, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Check, 
  X, 
  Clock, 
  ArrowRightLeft, 
  Wallet, 
  Phone,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function OperatorOrders({ showCompleted = false }: { showCompleted?: boolean }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const orderTypes = [
    { id: 'all', label: 'All', icon: ClipboardList },
    { id: 'add_money', label: 'Add Money', icon: Wallet },
    { id: 'cash_in', label: 'Cash In', icon: Wallet },
    { id: 'exchange', label: 'Exchange', icon: ArrowRightLeft },
    { id: 'withdraw', label: 'Withdraw', icon: Wallet },
    { id: 'send', label: 'Send Money', icon: ArrowRightLeft },
    { id: 'recharge', label: 'Recharge', icon: Phone },
  ];

  useEffect(() => {
    const constraints = [
      where('status', '==', showCompleted ? 'completed' : 'pending'),
      orderBy('createdAt', 'desc')
    ];

    const unsubscribe = firebaseService.subscribeToCollection('transactions', constraints, (data) => {
      setOrders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [showCompleted]);

  const handleAction = async (orderId: string, action: 'approved' | 'rejected' | 'completed') => {
    if (!user) return;
    setProcessingId(orderId);
    try {
      await operatorService.processOrder(user.uid, orderId, action);
      toast.success(`Order ${action} successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === 'all' || order.type === activeTab;
    const matchesSearch = !searchQuery || 
                         order.uid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.method?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.amount?.toString().includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {showCompleted ? <CheckCircle2 className="text-green-500" /> : <Clock className="text-orange-500" />}
            {showCompleted ? 'Completed Orders' : 'Pending Requests'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {showCompleted ? 'View history of processed orders.' : 'Review and process incoming requests.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search ID, method, amount..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border-white/5 pl-10 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        {orderTypes.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
              activeTab === tab.id 
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 animate-pulse">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
              <ClipboardList className="w-8 h-8 text-slate-700" />
            </div>
            <h3 className="text-white font-bold text-lg">No orders found</h3>
            <p className="text-slate-500 mt-2">There are no {activeTab === 'all' ? '' : activeTab.replace('_', ' ')} orders matching your criteria.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 sm:p-6 hover:bg-slate-900 transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      order.type === 'withdraw' ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                    )}>
                      <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          {order.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                          #{order.id.slice(-6)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white leading-none">
                        {order.amount} <span className="text-sm font-normal text-slate-500">{order.currency}</span>
                      </h3>
                      <p className="text-sm text-slate-400 mt-2 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5" />
                        Via: <span className="text-slate-200 font-medium">{order.method}</span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center">
                    {!showCompleted && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-10 text-red-500 hover:bg-red-500/10 hover:text-red-400 gap-2 font-bold px-4"
                          onClick={() => handleAction(order.id, 'rejected')}
                          disabled={!!processingId}
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="h-10 bg-green-600 hover:bg-green-500 text-white gap-2 font-bold px-6 shadow-lg shadow-green-600/20"
                          onClick={() => handleAction(order.id, 'completed')}
                          disabled={!!processingId}
                        >
                          {processingId === order.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Approve
                        </Button>
                      </>
                    )}
                    {showCompleted && (
                      <div className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl text-sm font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Peek (Optional) */}
                {(order.proofUrl || order.bankInfo || order.rechargeDetails) && (
                  <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {order.bankInfo && (
                      <div className="text-xs text-slate-400 bg-white/5 p-3 rounded-lg">
                        <p className="font-bold text-slate-300 mb-1">Bank Details:</p>
                        <p>{order.bankInfo.bankName} - {order.bankInfo.accountNumber}</p>
                        <p>Name: {order.bankInfo.accountName}</p>
                      </div>
                    )}
                    {order.proofUrl && (
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg group/proof cursor-pointer" onClick={() => window.open(order.proofUrl, '_blank')}>
                        <div className="w-10 h-10 rounded bg-slate-800 overflow-hidden shrink-0 border border-white/10">
                          <img src={order.proofUrl} alt="Proof" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Payment Proof</p>
                          <p className="text-[10px] text-blue-500 truncate hover:underline">View Attachment</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
