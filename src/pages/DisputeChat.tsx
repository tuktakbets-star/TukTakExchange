import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Loader2, 
  Image, 
  ArrowLeft, 
  AlertTriangle,
  User,
  ShieldCheck,
  Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../hooks/useAuth';
import { supabaseService, where, orderBy } from '@/lib/supabaseService';
import { toast } from 'sonner';

export default function DisputeChat() {
  const { txId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine user role in this chat
  const [userRole, setUserRole] = useState<'user' | 'sub_admin' | 'admin'>('user');

  useEffect(() => {
    if (!txId || !profile) return;

    const fetchData = async () => {
      const { data: txData } = await supabaseService.getDocument('transactions', txId);
      if (txData) {
        setTx(txData);
        // Determine role
        if (profile.role === 'admin') setUserRole('admin');
        else if (txData.assignedSubAdminId === profile.uid || txData.assignedSubAdminId === profile.id) setUserRole('sub_admin');
        else setUserRole('user');
      }
    };

    fetchData();

    // Subscribe to messages
    const unsub = supabaseService.subscribeToCollection(`disputes/${txId}/messages`, [
      orderBy('created_at', 'asc')
    ], (data) => {
      setMessages(data);
      setLoading(false);
      scrollToBottom();
    });

    return () => unsub();
  }, [txId, profile]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSendMessage = async (e?: React.FormEvent, imageUrl?: string) => {
    e?.preventDefault();
    if (!message.trim() && !imageUrl) return;

    const msgText = message;
    setMessage('');

    try {
      await supabaseService.addDocument(`disputes/${txId}/messages`, {
        tx_id: txId,
        sender_id: profile?.uid || profile?.id,
        sender_name: profile?.displayName || profile?.username || 'User',
        sender_role: userRole,
        text: imageUrl ? 'Sent an image' : msgText,
        image_url: imageUrl || null,
        type: imageUrl ? 'image' : 'text',
        created_at: new Date().toISOString()
      });
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await supabaseService.uploadFile(file);
      await handleSendMessage(undefined, base64);
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  if (!tx && loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white max-w-4xl mx-auto border-x border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg">Dispute Chat</h1>
              <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border border-red-500/20 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Case #{txId?.slice(0, 8)}
              </span>
            </div>
            <p className="text-xs text-slate-500">Involving: User, Operator, and Admin</p>
          </div>
        </div>
        <div className="hidden sm:flex gap-2">
           <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount</span>
              <span className="text-sm font-black text-white">৳{tx?.amount}</span>
           </div>
        </div>
      </div>

      {/* Info Warning */}
      <div className="bg-blue-600/10 border-b border-blue-500/20 p-3 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
        <p className="text-[10px] text-blue-400 font-bold uppercase leading-tight">
          Admin is monitoring this conversation to resolve the dispute. Please maintain professional language and provide proof.
        </p>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
      >
        <div className="text-center py-8">
           <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Conversation Started</p>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === (profile?.uid || profile?.id);
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
            >
              <div className={cn(
                "flex items-end gap-2 max-w-[85%]",
                isMe ? "flex-row-reverse" : "flex-row"
              )}>
                <Avatar className="w-6 h-6 border border-white/10">
                   <AvatarFallback className={cn(
                     "text-[8px] font-bold uppercase",
                     msg.sender_role === 'admin' ? "bg-red-500 text-white" :
                     msg.sender_role === 'sub_admin' ? "bg-amber-500 text-black" :
                     "bg-blue-500 text-white"
                   )}>
                     {msg.sender_role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : 
                      msg.sender_role === 'sub_admin' ? <Headphones className="w-3 h-3" /> : 
                      <User className="w-3 h-3" />}
                   </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1">
                   {!isMe && (
                     <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 ml-1">
                       {msg.sender_name} • {msg.sender_role.replace('_', ' ')}
                     </p>
                   )}
                   <div className={cn(
                     "p-3 rounded-2xl text-sm",
                     isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-white/10 text-slate-200 rounded-tl-none border border-white/5"
                   )}>
                     {msg.type === 'image' ? (
                       <img src={msg.image_url} alt="Proof" className="max-w-[200px] rounded-lg" referrerPolicy="no-referrer" />
                     ) : (
                       msg.text
                     )}
                   </div>
                   <p className="text-[8px] text-slate-600 px-1 text-right">
                     {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-white/5">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            className="text-slate-400 hover:text-white rounded-full shrink-0"
          >
            <Image className="w-5 h-5" />
          </Button>

          <Input 
            placeholder="Describe your issue or provide details..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-white/5 border-white/10 h-12 rounded-2xl text-sm focus:ring-blue-500"
          />

          <Button 
            type="submit" 
            size="icon"
            disabled={!message.trim()}
            className="h-12 w-12 bg-blue-600 hover:bg-blue-500 rounded-2xl shrink-0 transition-transform active:scale-95"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

// Utility function duplicated for this file to avoid export issues if needed
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
