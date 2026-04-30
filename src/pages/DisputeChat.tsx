import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  User, 
  MessageSquare, 
  ArrowLeft, 
  AlertTriangle, 
  FileImage,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Building2,
  MoreVertical,
  Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '../hooks/useAuth';
import { supabaseService, where, orderBy } from '../lib/supabaseService';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function DisputeChat() {
  const { txId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [tx, setTx] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [operator, setOperator] = useState<any>(null);

  useEffect(() => {
    if (!txId) return;

    const fetchTx = async () => {
      const { data } = await supabaseService.getDocument('transactions', txId);
      if (data) {
        setTx(data);
        if (data.assignedSubAdminId) {
          const { data: opData } = await supabaseService.getDocument('sub_admins', data.assignedSubAdminId);
          setOperator(opData);
        }
      }
    };

    fetchTx();

    const unsub = supabaseService.subscribeToCollection(
      'dispute_messages',
      [where('tx_id', '==', txId)],
      (data) => {
        const sorted = [...data].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sorted);
        setLoading(false);
        
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
    );

    return () => unsub();
  }, [txId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const sessionStr = sessionStorage.getItem('operator_session');
    const operatorSession = sessionStr ? JSON.parse(sessionStr) : null;
    
    // Determine sender identity
    let senderId = profile.uid;
    let senderName = profile.displayName || profile.email?.split('@')[0];
    let senderRole = 'user';

    if (operatorSession && operatorSession.id === tx?.assignedSubAdminId) {
       senderId = operatorSession.id;
       senderName = operatorSession.name || 'Operator';
       senderRole = 'operator';
    } else if (profile.email === 'admin@tuktak.exchange') { // Simple admin check
       senderRole = 'admin';
    }

    const payload = {
      tx_id: txId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      text: newMessage,
      created_at: new Date().toISOString()
    };

    setNewMessage('');
    try {
      await supabaseService.addDocument('dispute_messages', payload);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Dispute Chat...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold font-display tracking-tight uppercase">Dispute Resolution</h1>
              <Badge variant="destructive" className="text-[8px] font-black uppercase tracking-widest px-2 animate-pulse">Live Case</Badge>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Order ID: #{txId?.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-600 flex items-center justify-center text-[10px] font-bold shadow-lg" title="Support Admin">AD</div>
              <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-amber-600 flex items-center justify-center text-[10px] font-bold shadow-lg" title="Operator">OP</div>
              <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-purple-600 flex items-center justify-center text-[10px] font-bold shadow-lg" title="User">US</div>
           </div>
           <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-white">
              <MoreVertical className="w-5 h-5" />
           </Button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            {/* Context Info */}
            <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl mb-8 space-y-4">
               <div className="flex items-center gap-3 text-amber-500">
                  <ShieldCheck className="w-5 h-5" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Case Context</h3>
               </div>
               <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Transaction Type</p>
                    <p className="font-bold text-slate-200 capitalize">{tx?.type}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Involved Amount</p>
                    <p className="font-bold text-white">৳{tx?.amount?.toLocaleString()}</p>
                  </div>
               </div>
               <p className="text-[10px] text-amber-500/60 leading-relaxed font-bold italic uppercase border-t border-amber-500/10 pt-4">
                 Our system has automatically added the User, responsible Sub-Admin, and a Support Agent to this secure channel.
               </p>
            </div>

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-1",
                  msg.sender_role === 'user' ? "items-end" : "items-start"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                   <span className={cn(
                     "text-[9px] font-black uppercase tracking-widest",
                     msg.sender_role === 'admin' ? "text-blue-500" :
                     msg.sender_role === 'operator' ? "text-amber-500" :
                     "text-purple-500"
                   )}>
                      {msg.sender_name} ({msg.sender_role})
                   </span>
                </div>
                <div className={cn(
                  "max-w-[85%] p-4 rounded-3xl shadow-lg",
                  msg.sender_role === 'user' ? "bg-purple-600/20 text-purple-100 rounded-tr-none border border-purple-500/20" :
                  msg.sender_role === 'admin' ? "bg-blue-600 text-white rounded-tl-none shadow-blue-600/20" :
                  "bg-white/5 text-slate-200 rounded-tl-none border border-white/5"
                )}>
                  <p className="text-[13px] leading-relaxed font-medium">{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-600 font-bold px-1 uppercase tracking-widest">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-6 bg-slate-900 border-t border-white/5">
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" className="shrink-0 text-slate-500 hover:text-white rounded-xl bg-white/5">
                <FileImage className="w-5 h-5" />
              </Button>
              <div className="relative flex-1 group">
                <Input 
                  placeholder="Share evidence or state your claim..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="bg-white/5 border-white/10 h-14 pl-6 pr-16 rounded-2xl text-sm font-medium focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                />
                <Button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-2 h-10 w-10 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="hidden lg:block w-80 bg-slate-900/50 p-6 space-y-8 overflow-y-auto">
           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Case Participants</h3>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-500 font-black">U</div>
                    <div>
                       <p className="text-xs font-black text-white">{tx?.userName || 'Tuktak User'}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Claimant</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center text-amber-500 font-black font-display text-lg">O</div>
                    <div>
                       <p className="text-xs font-black text-white">{operator?.name || 'Assigned Operator'}</p>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Defendant</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-blue-600/20 rounded-2xl border border-blue-500/20">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                       <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-xs font-black text-white">Security Agent</p>
                       <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Mediator</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Evidence Library</h3>
              <div className="space-y-3">
                 {tx?.proofUrl && (
                   <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group cursor-pointer hover:bg-white/10 transition-colors">
                      <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-black">
                         <img src={tx.proofUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Proof</p>
                   </div>
                 )}
                 {tx?.paymentReceiptUrl && (
                   <div className="p-3 bg-white/5 rounded-2xl border border-white/5 group cursor-pointer hover:bg-white/10 transition-colors">
                      <div className="aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-black">
                         <img src={tx.paymentReceiptUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin/Operator Receipt</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="pt-8 space-y-2">
              <Button variant="ghost" className="w-full h-10 rounded-xl text-red-500 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest">
                 <Flag className="w-3.5 h-3.5 mr-2" />
                 Escalate Case
              </Button>
              <p className="text-[10px] text-slate-600 text-center font-bold italic leading-tight uppercase px-4">
                Attempts to share fake evidence will result in permanent account suspension.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
