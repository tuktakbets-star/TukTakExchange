import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, User, Phone, Video, MoreVertical, Search, Loader2, Image, Video as VideoIcon, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '../hooks/useAuth';
import { firebaseService } from '../lib/firebaseService';
import { orderBy, query, collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export default function Messages() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    const chatRef = collection(db, 'chats', profile.uid, 'messages');
    const q = query(chatRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
      
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsub();
  }, [profile?.uid]);

  const handleSendMessage = async (e?: React.FormEvent, mediaData?: { type: 'image' | 'video' | 'voice', url: string }) => {
    e?.preventDefault();
    if (!profile?.uid) return;
    if (!message.trim() && !mediaData) return;

    const msgText = message;
    setMessage('');

    try {
      const chatRef = collection(db, 'chats', profile!.uid, 'messages');
      const payload: any = {
        senderId: profile!.uid,
        senderName: profile!.displayName || 'User',
        senderRole: 'user',
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

      // Update the main chat document for admin to see latest message
      await firebaseService.setDocument('chats', profile!.uid, {
        lastMessage: payload.text,
        lastMessageAt: serverTimestamp(),
        unreadCount: 1, // Admin will reset this
        userName: profile!.displayName || 'User',
        userEmail: profile!.email,
        uid: profile!.uid,
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedUrl(url);
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Microphone access denied. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSendVoice = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      const url = await firebaseService.uploadBlob(audioBlob, 'voice_message.webm');
      await handleSendMessage(undefined, { type: 'voice', url });
      setRecordedUrl(null);
      setAudioBlob(null);
      toast.success('Voice message sent!');
    } catch (error) {
      toast.error('Failed to send voice message');
    } finally {
      setIsUploading(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-slate-950 rounded-[2.5rem] border border-white/5 overflow-hidden">
      {/* Chat Header */}
      <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-brand-blue">
              <AvatarImage src="https://picsum.photos/seed/admin/100/100" />
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-950" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">{t('chatWithAdmin')}</h2>
            <p className="text-xs text-green-400 font-medium">{t('active')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white rounded-full">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white rounded-full">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
              <Send className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-400">No messages yet</h3>
              <p className="text-xs text-slate-500">Start a conversation with our support team</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] space-y-1 ${msg.senderRole === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-sm ${
                  msg.senderRole === 'user' 
                    ? 'bg-brand-blue text-white rounded-tr-none shadow-lg shadow-blue-600/20' 
                    : 'bg-white/10 text-slate-200 rounded-tl-none border border-white/5'
                }`}>
                  {msg.type === 'image' ? (
                    <img src={msg.url} alt="Shared photo" className="max-w-full rounded-lg" referrerPolicy="no-referrer" />
                  ) : msg.type === 'video' ? (
                    <video src={msg.url} controls className="max-w-full rounded-lg" />
                  ) : msg.type === 'voice' ? (
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-2">
                         <Mic className="w-4 h-4" />
                         <span className="italic uppercase text-[10px] font-bold tracking-widest text-slate-400">Voice Message</span>
                       </div>
                       <audio src={msg.url} controls className="h-8 w-48 brightness-90 contrast-125" />
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
                <p className="text-[10px] text-slate-500 px-1">
                  {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/5 border-t border-white/5">
        <AnimatePresence mode="wait">
          {recordedUrl ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex items-center gap-4 bg-slate-900 border border-white/10 p-4 rounded-[2rem]"
            >
              <div className="flex-1 flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <audio src={recordedUrl} controls className="h-8 w-full brightness-90" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setRecordedUrl(null);
                    setAudioBlob(null);
                  }}
                  className="text-red-500 hover:bg-red-500/10 rounded-lg h-10 font-bold"
                >
                  Discard
                </Button>
                <Button 
                  disabled={isUploading}
                  onClick={handleSendVoice}
                  className="bg-brand-blue hover:bg-blue-600 text-white rounded-lg h-10 px-6 font-bold flex items-center gap-2"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-2">
                 <input type="file" ref={mediaInputRef} accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
                 <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'video')} />
                 
                 <Button type="button" variant="ghost" size="sm" onClick={() => mediaInputRef.current?.click()} className="text-slate-400 hover:text-white flex gap-2">
                    <Image className="w-4 h-4" /> {t('send_photo')}
                 </Button>
                 <Button type="button" variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} className="text-slate-400 hover:text-white flex gap-2">
                    <VideoIcon className="w-4 h-4" /> {t('send_video')}
                 </Button>
              </div>

              <div className="flex items-center gap-3">
                {isRecording ? (
                   <div className="flex-1 flex items-center gap-4 bg-red-600/10 border border-red-500/20 px-6 h-12 rounded-full text-red-500 font-bold">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shrink-0" />
                      <span className="flex-1">Recording...</span>
                      <span className="font-mono">{formatRecordingTime(recordingTime)}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={stopRecording} className="text-red-500 hover:bg-red-500/10 rounded-full">
                         <StopCircle className="w-6 h-6" />
                      </Button>
                   </div>
                ) : (
                  <>
                    <Button type="button" variant="ghost" size="icon" onClick={startRecording} className="text-slate-400 hover:text-white rounded-full shrink-0">
                      <Mic className="w-5 h-5" />
                    </Button>
                    
                    <div className="relative flex-1">
                      <Input 
                        placeholder={t('sendMsg')}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="bg-slate-900 border-white/10 h-12 rounded-full pl-4 pr-12 text-white focus:ring-brand-blue/50"
                      />
                      <Button 
                        type="submit"
                        size="icon" 
                        disabled={!message.trim() || isUploading}
                        className="absolute right-1 top-1 h-10 w-10 bg-brand-blue hover:bg-blue-500 rounded-full transition-all disabled:opacity-50 disabled:bg-slate-800"
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
