import React, { useState, useEffect } from 'react';
import { firebaseService, collection, addDoc, serverTimestamp, db } from '../../lib/firebaseService';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  RotateCcw, 
  User, 
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDisputes() {
  const { t } = useTranslation();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubTX = firebaseService.subscribeToCollection('transactions', [], (data) => {
      setDisputes(data.filter(tx => tx.status === 'disputed'));
    });
    const unsubUsers = firebaseService.subscribeToCollection('users', [], (data) => setUsers(data));
    const unsubWallets = firebaseService.subscribeToCollection('wallets', [], (data) => setWallets(data));

    setLoading(false);
    return () => {
      unsubTX();
      unsubUsers();
      unsubWallets();
    };
  }, []);

  const handleResolve = async (tx: any, action: 'complete' | 'refund') => {
    if (!confirm(t('confirm_action'))) return;

    try {
      if (action === 'complete') {
        await firebaseService.updateDocument('transactions', tx.id, { 
          status: 'completed', 
          updatedAt: new Date().toISOString() 
        });
        toast.success(t('transaction_completed_success'));
      } else {
        await firebaseService.updateDocument('transactions', tx.id, { 
          status: 'failed', 
          updatedAt: new Date().toISOString() 
        });
        // Refund logic
        const walletId = `${tx.uid}_${tx.currency}`;
        const wallet = wallets.find(w => w.id === walletId);
        if (wallet) {
          await firebaseService.updateDocument('wallets', walletId, {
            balance: wallet.balance + tx.amount,
            updatedAt: new Date().toISOString()
          });
        }
        toast.success(t('transaction_refunded_success'));
      }

      // Auto-initiate message if resolved
      await handleMessageUser(tx, `Admin has ${action === 'complete' ? 'approved' : 'rejected'} your appeal for transaction ${tx.id.slice(-8)}. If you have further questions, please reply here.`);
      
    } catch (error) {
      toast.error(t('dispute_resolve_failed'));
    }
  };

  const handleMessageUser = async (tx: any, initialMsg?: string) => {
    try {
      const user = users.find(u => u.uid === tx.uid);
      const chatRef = collection(db, 'chats', tx.uid, 'messages');
      const text = initialMsg || `Hello ${user?.displayName || 'User'}, regarding your dispute for transaction ${tx.id.slice(-8)}, I would like to discuss some details.`;
      
      await addDoc(chatRef, {
        text,
        senderId: 'admin',
        senderName: 'Admin',
        senderRole: 'admin',
        createdAt: serverTimestamp(),
        type: 'text'
      });

      await firebaseService.setDocument('chats', tx.uid, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        unreadCount: 0,
        userName: user?.displayName || 'User',
        userEmail: user?.email || '',
        uid: tx.uid,
        updatedAt: serverTimestamp()
      });

      toast.success('Message sent to customer');
    } catch (error) {
      console.error(error);
      toast.error('Failed to initiate chat');
    }
  };

  const filteredDisputes = disputes.filter(d => {
    const user = users.find(u => u.uid === d.uid);
    return user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           d.disputeReason?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{t('reports_disputes')}</h1>
          <p className="text-slate-400 mt-1">{t('realTimeStats')}</p>
        </div>
      </div>

      <Card className="glass-dark border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-display font-bold">{t('reports_disputes')}</h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder={t('search')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-white/5 border-white/10 w-full md:w-80 h-11 rounded-2xl" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-5">{t('totalUsers')}</th>
                <th className="px-8 py-5">{t('recentActivity')}</th>
                <th className="px-8 py-5">{t('reports_disputes')}</th>
                <th className="px-8 py-5">{t('amount')}</th>
                <th className="px-8 py-5 text-right">{t('quickActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence mode="popLayout">
                {filteredDisputes.map((tx) => {
                  const user = users.find(u => u.uid === tx.uid);
                  return (
                    <motion.tr 
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center font-bold text-red-500">
                            {user?.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{user?.displayName || t('unknown')}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">UID: {tx.uid.slice(0, 8)}</p>
                          </div>
                        </div>
                        {tx.receiverInfo && (
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                            <ArrowRight className="w-3 h-3" />
                            <span>{t('to')}: {tx.receiverInfo.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <Badge variant="outline" className="border-white/10 bg-white/5 capitalize text-[10px]">
                            {tx.type}
                          </Badge>
                          <p className="text-xs text-slate-500">ID: {tx.id.slice(-8).toUpperCase()}</p>
                          <p className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl max-w-xs">
                          <div className="flex items-center gap-2 text-red-500 mb-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{t('complaint')}</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed italic">"{tx.disputeReason || t('no_reason_provided')}"</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-display font-bold text-lg">₫{tx.amount.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{tx.currency}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-500 h-9 px-4 rounded-xl"
                            onClick={() => handleResolve(tx, 'complete')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {t('approve')}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-brand-blue/10 text-brand-blue border-brand-blue/20 h-9 px-4 rounded-xl"
                            onClick={() => handleMessageUser(tx)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            {t('message')}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 px-4 rounded-xl"
                            onClick={() => handleResolve(tx, 'refund')}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('reject')}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>

      {filteredDisputes.length === 0 && (
        <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
          <div className="w-20 h-20 bg-green-500/10 rounded-[2rem] flex items-center justify-center text-green-500 mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-display font-bold mb-2">{t('all_clear')}</h3>
          <p className="text-slate-500">{t('no_disputes_desc')}</p>
        </div>
      )}
    </div>
  );
}
