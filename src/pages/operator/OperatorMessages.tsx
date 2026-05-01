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
import { firebaseService, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, db } from '../../lib/firebaseService';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function OperatorMessages() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // List all user chats
    const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConversations(chatList);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    const chatRef = collection(db, 'chats', activeConvId, 'messages');
    const q = query(chatRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      
      // Scroll to bottom
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsub();
  }, [activeConvId]);

  const handleSendMessage = async (e?: React.FormEvent, mediaData?: { type: 'image' | 'video' | 'voice', url: string }) => {
    e?.preventDefault();
    if (!newMessage.trim() && !mediaData && !activeConvId) return;

    const msgText = newMessage;
    setNewMessage('');

    try {
      const chatRef = collection(db, 'chats', activeConvId!, 'messages');
      const payload: any = {
        senderId: profile?.uid,
        senderName: profile?.displayName || 'Operator',
        senderRole: 'sub_admin',
        createdAt: serverTimestamp(),
        type: mediaData ? mediaData.type : 'text'
      };

      if (mediaData) {
        payload.url = mediaData.url;
        payload.text = mediaData.type === 'image' ? 'Sent a photo' : mediaData.type === 'video' ? 'Sent a video' : 'Sent a voice message';
      } else {
        payload.text = msgText;
      }

      await addDoc(chatRef, payload);

      // Update main chat doc
      await firebaseService.updateDocument('chats', activeConvId!, {
        lastMessage: payload.text,
        lastMessageAt: serverTimestamp(),
        unreadCount: 0, // Operator just replied
        updatedAt: serverTimestamp()
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
      const base64 = await firebaseService.uploadFile(file);
      await handleSendMessage(undefined, { type, url: base64 });
      toast.success(`${type} sent!`);
    } catch (error) {
      toast.error(`Failed to send ${type}`);
    } finally {
      setIsUploading(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="h-[calc(100vh-12rem)] flex bg-[#161b22] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r border-white/5 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-white/5">
           <h2 className="text-xl font-bold font-display tracking-tight mb-4">Messages</h2>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
             <input 
              type="text" 
              placeholder="Filter chats..."
              className="w-full h-10 bg-white/5 border-white/10 pl-10 rounded-xl text-xs font-medium focus:ring-blue-500 transition-all"
             />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {loading ? (
             <div className="p-8 text-center text-slate-600">
               <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
               <p className="text-[10px] font-bold uppercase tracking-widest">Loading Chats...</p>
             </div>
           ) : conversations.length === 0 ? (
             <div className="p-8 text-center text-slate-600">
               <p className="text-[10px] font-bold uppercase tracking-widest">No Active Chats</p>
             </div>
           ) : conversations.map((conv) => (
             <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={cn(
                "w-full p-6 text-left flex gap-4 transition-all hover:bg-white/5 border-b border-white/[0.02]",
                activeConvId === conv.id && "bg-white/[0.04] border-l-4 border-l-blue-500"
              )}
             >
               <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-blue-400 text-lg border border-white/10 uppercase">
                    {conv.userName?.charAt(0) || 'U'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161b22]" />
               </div>
               
               <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm tracking-tight truncate">{conv.userName || 'User'}</span>
                    <span className="text-[9px] font-bold text-slate-600 uppercase italic">
                       {conv.lastMessageAt ? (conv.lastMessageAt.toDate ? new Date(conv.lastMessageAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : '') : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-2 leading-relaxed">{conv.lastMessage || 'No messages'}</p>
                  <div className="flex items-center justify-between">
                     <span className={cn(
                       "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20"
                     )}>
                        Support
                     </span>
                     {conv.unreadCount > 0 && (
                       <span className="bg-blue-600 text-white text-[9px] h-4 min-w-4 px-1 flex items-center justify-center rounded-full font-black">
                         {conv.unreadCount}
                       </span>
                     )}
                  </div>
               </div>
             </button>
           ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117]/30">
        {activeConv ? (
          <>
            {/* Chat Top Bar */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between backdrop-blur-xl sticky top-0 z-10">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black">
                    {activeConv.userName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                       {activeConv.userName || 'User'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none">UID: {activeConv.uid?.slice(0, 8)}</p>
                    </div>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <Button variant="dark" className="h-9 w-9 p-0 rounded-xl"><MoreVertical className="w-4 h-4 text-slate-500" /></Button>
               </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
               {messages.map((msg) => (
                 <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    msg.senderRole === 'sub_admin' || msg.senderRole === 'admin' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                 >
                    <div className={cn(
                      "p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-lg",
                      msg.senderRole === 'sub_admin' || msg.senderRole === 'admin'
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
                          {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : ''}
                       </span>
                    </div>
                 </motion.div>
               ))}
               <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
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
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 pl-6 pr-12 rounded-2xl text-sm font-medium focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim() || isUploading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-32 h-32 bg-blue-500/5 rounded-[3rem] flex items-center justify-center mb-10 border border-blue-500/10">
                <MessageCircle className="w-16 h-16 text-blue-500/20" />
             </div>
             <h2 className="text-3xl font-display font-black tracking-tight text-white mb-4">No Conversation Selected</h2>
             <p className="text-slate-500 max-w-xs font-medium leading-relaxed italic">Select a chat from the sidebar to start supporting users or resolve appeals.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Active Order Summary Placeholder */}
      {activeConv && (
        <div className="w-80 border-l border-white/5 p-8 hidden xl:flex flex-col gap-8 bg-[#161b22]/50">
           <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">User Profile</h4>
              <div className="p-6 bg-slate-900 border border-white/5 rounded-[2rem] shadow-xl relative overflow-hidden group">
                 <div className="relative space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg text-white font-bold">
                          {activeConv.userName?.charAt(0) || 'U'}
                       </div>
                       <div>
                          <p className="text-xs font-bold text-white tracking-tight">{activeConv.userName || 'User'}</p>
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{activeConv.userEmail}</p>
                       </div>
                    </div>

                    <div className="flex flex-col">
                       <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Status</span>
                       <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.05em]">Verified User</span>
                    </div>

                    <Button variant="dark" onClick={() => navigate(`/operator/users/${activeConv.uid}`)} className="w-full h-11 bg-white/5 text-slate-400 group-hover:text-white rounded-xl text-xs font-bold gap-2">
                       View User Profile <ChevronRight className="w-3 h-3" />
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

