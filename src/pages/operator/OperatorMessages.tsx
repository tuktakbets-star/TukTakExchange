import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Send, 
  Paperclip, 
  MoreVertical, 
  Star, 
  Clock, 
  CheckCheck,
  ShieldAlert,
  Info,
  ChevronRight,
  MessageCircle,
  MessageSquare,
  FileText,
  Loader2,
  Image,
  Video as VideoIcon,
  Mic,
  StopCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabaseService, where, orderBy, serverTimestamp } from '../../lib/supabaseService';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function OperatorMessages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const operatorSession = JSON.parse(sessionStorage.getItem('operator_session') || '{}');
  const operatorId = operatorSession.id ? `sa_${operatorSession.id}` : null;
  const operatorName = operatorSession.username || 'Operator';
  
  const [activeConvId, setActiveConvId] = useState<string | null>(operatorId);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!operatorId) {
      setLoading(false);
      return;
    }

    const unsub = supabaseService.subscribeToCollection(
      `chats/${operatorId}/messages`,
      [orderBy('createdAt', 'asc')],
      (data) => {
        setMessages(data || []);
        setLoading(false);
        
        // Scroll to bottom
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    );

    return () => unsub();
  }, [operatorId]);

  const handleSendMessage = async (e?: React.FormEvent, mediaData?: { type: 'image' | 'video' | 'voice', url: string }) => {
    e?.preventDefault();
    if (!newMessage.trim() && !mediaData && !operatorId) return;

    const msgText = newMessage;
    setNewMessage('');

    try {
      const payload: any = {
        senderId: operatorSession.id,
        senderName: operatorName,
        senderRole: 'sub_admin',
        createdAt: new Date().toISOString(),
        type: mediaData ? mediaData.type : 'text'
      };

      if (mediaData) {
        payload.url = mediaData.url;
        payload.text = mediaData.type === 'image' ? 'Sent a photo' : mediaData.type === 'video' ? 'Sent a video' : 'Sent a voice message';
      } else {
        payload.text = msgText;
      }

      await supabaseService.addDocument(`chats/${operatorId}/messages`, payload);

      // Update main chat doc
      await supabaseService.setDocument('chats', operatorId!, {
        lastMessage: payload.text,
        lastMessageAt: new Date().toISOString(),
        unreadCount: 1, // Admin should see this
        userName: operatorName,
        userRole: 'sub_admin',
        uid: operatorId,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await supabaseService.uploadFile(file);
      await handleSendMessage(undefined, { type, url: base64 });
      toast.success(`${type} sent!`);
    } catch (error) {
      toast.error(`Failed to send ${type}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!operatorId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <ShieldAlert className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-bold">Session Error</h2>
        <p>Please log in as an operator.</p>
        <Button onClick={() => navigate('/operator/login')} className="mt-4">Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between backdrop-blur-xl sticky top-0 z-10 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
            AD
          </div>
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2 text-white">
              Admin Support
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Connected to Admin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0d1117]/30">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12">
            <MessageSquare className="w-16 h-16 text-slate-700 mb-6" />
            <h3 className="text-xl font-bold text-slate-400">No messages yet</h3>
            <p className="text-sm text-slate-500 italic">Send a message to the administrator for assistance.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.senderRole === 'sub_admin' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-lg",
                msg.senderRole === 'sub_admin'
                  ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-none" 
                  : "bg-white/5 border border-white/10 text-slate-200 rounded-bl-none"
              )}>
                {msg.type === 'image' ? (
                  <img src={msg.url} alt="Shared photo" className="max-w-full rounded-lg" referrerPolicy="no-referrer" />
                ) : msg.type === 'video' ? (
                  <video src={msg.url} controls className="max-w-full rounded-lg" />
                ) : msg.type === 'voice' ? (
                  <div className="flex flex-col gap-2">
                    <audio src={msg.url} controls className="h-8 w-48 brightness-90 contrast-125" />
                  </div>
                ) : (
                  msg.text
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 px-1">
                <span className="text-[10px] font-bold text-slate-600">
                  {msg.senderRole === 'sub_admin' ? 'You' : 'Admin'} • {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : 'Just now'}
                </span>
              </div>
            </motion.div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-[#161b22] border-t border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <input type="file" ref={mediaInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
          <Button type="button" variant="ghost" size="sm" onClick={() => mediaInputRef.current?.click()} className="text-[10px] uppercase font-bold text-slate-500 hover:text-white flex gap-1 h-8">
            <Paperclip className="w-4 h-4" /> Media
          </Button>
        </div>
        <form onSubmit={(e) => handleSendMessage(e)} className="relative flex items-center gap-4">
          <div className="relative flex-1 group">
            <Input 
              placeholder="Type message to admin..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="h-14 bg-white/5 border-white/10 pl-6 pr-12 rounded-2xl text-sm font-medium focus:ring-blue-500 transition-all font-display"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim() || isUploading}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

