import React, { useState, useEffect, useRef } from 'react';
import { firebaseService } from '../../lib/firebaseService';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  MessageSquare, 
  Search, 
  Send, 
  User, 
  MoreVertical,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  Mic,
  Paperclip,
  Smile,
  Image,
  Video as VideoIcon,
  StopCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminMessages() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Subscribe to chats collection to see who has messaged
    const q = query(collection(db, 'chats'), orderBy('lastMessageAt', 'desc'));
    const unsubChats = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(chatList);
    });

    return () => unsubChats();
  }, []);

  useEffect(() => {
    if (!selectedUser?.uid) {
      setMessages([]);
      return;
    }

    const chatRef = collection(db, 'chats', selectedUser.uid, 'messages');
    const q = query(chatRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsub();
  }, [selectedUser?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser]);

  const handleSendMessage = async (e?: React.FormEvent, mediaData?: { type: 'image' | 'video' | 'voice', url: string }) => {
    e?.preventDefault();
    if (!newMessage.trim() && !mediaData && !selectedUser) return;

    const msgText = newMessage;
    setNewMessage('');

    try {
      const chatRef = collection(db, 'chats', selectedUser.uid, 'messages');
      const payload: any = {
        senderId: profile?.uid,
        senderName: 'Admin',
        senderRole: 'admin',
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

      // Update the main chat document
      await firebaseService.updateDocument('chats', selectedUser.uid, {
        lastMessage: payload.text,
        lastMessageAt: serverTimestamp(),
        unreadCount: 0, // Admin just replied
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      toast.error(t('operation_failed'));
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

  const startRecording = () => {
    setIsRecording(true);
    toast.info('Recording voice...');
  };

  const stopRecording = () => {
    setIsRecording(false);
    toast.success('Voice message sent!');
    handleSendMessage(undefined, { type: 'voice', url: 'voice-simulation-url' });
  };

  const userMessages = messages;

  const filteredUsers = users.filter(u => 
    u.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-6">
      {/* Sidebar - User List */}
      <Card className="w-96 glass-dark border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xl font-display font-bold mb-4">{t('messages')}</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder={t('search')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 h-10 rounded-xl" 
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
          {filteredUsers.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedUser(chat)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all mb-1",
                selectedUser?.id === chat.id ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Avatar className="h-12 w-12 border-2 border-white/10">
                <AvatarImage src={`https://picsum.photos/seed/${chat.id}/100/100`} />
                <AvatarFallback className="bg-slate-800 text-slate-300 font-bold">{chat.userName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline mb-1">
                  <p className="font-bold text-sm truncate">{chat.userName}</p>
                  {chat.lastMessageAt && (
                    <span className={cn("text-[10px]", selectedUser?.id === chat.id ? "text-white/60" : "text-slate-500")}>
                      {chat.lastMessageAt?.toDate ? new Date(chat.lastMessageAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  )}
                </div>
                <p className={cn("text-xs truncate", selectedUser?.id === chat.id ? "text-white/80" : "text-slate-500")}>
                  {chat.lastMessage || t('no_messages_yet')}
                </p>
              </div>
              {chat.unreadCount > 0 && selectedUser?.id !== chat.id && (
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  {chat.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 glass-dark border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-white/10">
                  <AvatarImage src={`https://picsum.photos/seed/${selectedUser.id}/100/100`} />
                  <AvatarFallback className="bg-red-600/20 text-red-500 font-bold">{selectedUser.userName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-bold">{selectedUser.userName}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t('active')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"><Phone className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"><Video className="w-5 h-5" /></Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"><Info className="w-5 h-5" /></Button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide"
            >
              <div className="text-center mb-8">
                <Badge variant="outline" className="border-white/5 bg-white/5 text-slate-500 text-[10px] uppercase tracking-widest px-4 py-1">
                  {t('chat_started')}
                </Badge>
              </div>

              {userMessages.map((msg, idx) => {
                const isMe = msg.senderId === profile?.uid;
                const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[70%] space-y-1",
                      isMe ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "px-5 py-3.5 rounded-3xl text-sm shadow-xl",
                        isMe 
                          ? "bg-red-600 text-white rounded-tr-none shadow-red-600/10" 
                          : "bg-white/5 text-slate-200 border border-white/5 rounded-tl-none shadow-black/20"
                      )}>
                        {msg.type === 'image' ? (
                          <img src={msg.url} alt="Photo" className="max-w-full rounded-lg" referrerPolicy="no-referrer" />
                        ) : msg.type === 'video' ? (
                          <video src={msg.url} controls className="max-w-full rounded-lg" />
                        ) : msg.type === 'voice' ? (
                          <div className="flex items-center gap-2">
                             <Mic className="w-4 h-4" />
                             <span className="italic uppercase text-[10px] font-bold tracking-widest">Voice</span>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                      <div className={cn(
                        "flex items-center gap-2 px-1",
                        isMe ? "flex-row-reverse" : "flex-row"
                      )}>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <CheckCheck className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-slate-900/50 border-t border-white/5">
              <form onSubmit={(e) => handleSendMessage(e)} className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                   <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
                   <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'video')} />
                   
                   <Button type="button" variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()} className="text-slate-500 hover:text-white flex gap-2">
                      <Image className="w-4 h-4" /> {t('send_photo')}
                   </Button>
                   <Button type="button" variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} className="text-slate-500 hover:text-white flex gap-2">
                      <VideoIcon className="w-4 h-4" /> {t('send_video')}
                   </Button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-white/5 rounded-xl"><Smile className="w-5 h-5" /></Button>
                  </div>
                  <div className="flex-1 relative">
                    <Input 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t('type_message')}
                      className="h-14 bg-white/5 border-white/10 rounded-2xl pl-6 pr-12 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                    {isRecording ? (
                       <Button type="button" variant="ghost" size="icon" onClick={stopRecording} className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 animate-pulse">
                          <StopCircle className="w-5 h-5" />
                       </Button>
                    ) : (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={startRecording}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-500"
                      >
                        <Mic className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={(!newMessage.trim() && !isRecording) || isUploading}
                    className="h-14 w-14 bg-red-600 hover:bg-red-500 text-white rounded-2xl shadow-lg shadow-red-600/20 shrink-0"
                  >
                    {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-24 h-24 bg-red-600/10 rounded-[2.5rem] flex items-center justify-center text-red-500 mb-8">
              <MessageSquare className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-4">{t('select_conversation')}</h3>
            <p className="text-slate-500 max-w-sm">
              {t('select_conversation_desc')}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
