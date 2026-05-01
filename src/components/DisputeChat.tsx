import React, { useState, useEffect, useRef } from 'react';
import { supabaseService, where, orderBy } from '../lib/supabaseService';
import { useAuth } from '../hooks/useAuth';
import { Send, User, ShieldCheck, UserCheck, Image, Video, Mic, StopCircle, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  tx_id: string;
  sender_id: string;
  sender_role: 'admin' | 'sub_admin' | 'user';
  sender_name: string;
  text: string;
  type?: 'text' | 'image' | 'video' | 'voice';
  url?: string;
  created_at: string;
}

export function DisputeChat({ txId, subAdminId }: { txId: string; subAdminId?: string }) {
  const { profile, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!txId) return;

    const unsub = supabaseService.subscribeToCollection(
      'dispute_messages',
      [where('tx_id', '==', txId), orderBy('created_at', 'asc')],
      (data) => {
        setMessages(data as Message[]);
      }
    );

    return () => unsub();
  }, [txId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, mediaData?: { type: 'image' | 'video' | 'voice', url: string }) => {
    e?.preventDefault();
    if (!newMessage.trim() && !mediaData) return;
    if (!profile) return;

    let role: 'admin' | 'sub_admin' | 'user' = 'user';
    if (isAdmin) role = 'admin';
    else if (subAdminId === profile?.uid) role = 'sub_admin';

    try {
      const payload: any = {
        tx_id: txId,
        sender_id: profile.uid,
        sender_role: role,
        sender_name: profile.displayName || profile.email,
        type: mediaData ? mediaData.type : 'text',
        created_at: new Date().toISOString()
      };

      if (mediaData) {
        payload.url = mediaData.url;
        payload.text = mediaData.type === 'image' ? 'Sent a photo' : mediaData.type === 'video' ? 'Sent a video' : 'Sent a voice message';
      } else {
        payload.text = newMessage.trim();
      }

      await supabaseService.addDocument('dispute_messages', payload);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await supabaseService.uploadFile(file);
      await handleSend(undefined, { type, url: base64 });
      toast.success(`${type} sent!`);
    } catch (error) {
      toast.error(`Failed to send ${type}`);
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone API not supported in this browser/context');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          await handleSend(undefined, { type: 'voice', url: base64 });
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.info('Recording voice...');
    } catch (err: any) {
      console.error('Mic access error:', err);
      const isIframe = window.self !== window.top || window.location.hostname.includes('ais-dev') || window.location.hostname.includes('ais-pre');
      if (isIframe) {
        toast.error('Voice recording is blocked in the sidebar. Please click "Open in new tab" (top right icon) to record voice.', { duration: 8000 });
      } else {
        toast.error('Could not access microphone: ' + (err.message || 'Permission denied'));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success('Voice message recorded!');
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-900/50 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-red-500" />
          Dispute Resolution Group
        </h3>
        <div className="flex gap-2">
           <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest border border-white/10 px-2 py-1 rounded-md">Admin</span>
           <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest border border-white/10 px-2 py-1 rounded-md">Sub-Admin</span>
           <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest border border-white/10 px-2 py-1 rounded-md">You</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg) => {
          const isMe = msg.sender_id === profile?.uid;
          return (
            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
              <div className={cn(
                "flex items-center gap-2 mb-1.5",
                isMe ? "flex-row-reverse" : "flex-row"
              )}>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{msg.sender_name}</span>
                <span className={cn(
                  "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                  msg.sender_role === 'admin' ? "bg-red-500/20 text-red-500" :
                  msg.sender_role === 'sub_admin' ? "bg-blue-500/20 text-blue-500" :
                  "bg-green-500/20 text-green-500"
                )}>
                  {msg.sender_role}
                </span>
                <span className="text-[8px] font-medium text-slate-600 italic">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div className={cn(
                "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg",
                isMe ? "bg-brand-blue text-white rounded-tr-none" : "bg-white/10 text-slate-200 rounded-tl-none border border-white/5"
              )}>
                {msg.type === 'image' ? (
                  <img src={msg.url} alt="Shared photo" className="max-w-full rounded-lg" referrerPolicy="no-referrer" />
                ) : msg.type === 'video' ? (
                  <video src={msg.url} controls className="max-w-full rounded-lg" />
                ) : msg.type === 'voice' ? (
                  <div className="flex flex-col gap-2">
                     <div className="flex items-center gap-2">
                       <Mic className="w-4 h-4" />
                       <span className="italic uppercase text-[10px] font-bold tracking-widest opacity-50">Voice Message</span>
                     </div>
                     <audio src={msg.url} controls className="h-8 w-48 brightness-90 contrast-125" />
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
             <MessageSquare className="w-12 h-12" />
             <p className="text-xs font-black uppercase tracking-[0.2em]">Start the conversation...</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <input type="file" ref={mediaInputRef} accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image')} />
          <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'video')} />
          
          <Button variant="ghost" size="xs" onClick={() => mediaInputRef.current?.click()} className="text-[10px] uppercase font-bold tracking-tighter text-slate-400 hover:text-white flex gap-1 h-6">
            <Image className="w-3 h-3" /> Photo
          </Button>
          <Button variant="ghost" size="xs" onClick={() => videoInputRef.current?.click()} className="text-[10px] uppercase font-bold tracking-tighter text-slate-400 hover:text-white flex gap-1 h-6">
            <Video className="w-3 h-3" /> Video
          </Button>
          {isRecording ? (
            <Button variant="ghost" size="xs" onClick={stopRecording} className="text-[10px] uppercase font-bold tracking-tighter text-red-500 flex gap-1 h-6 animate-pulse">
              <StopCircle className="w-3 h-3" /> Stop
            </Button>
          ) : (
            <Button variant="ghost" size="xs" onClick={startRecording} className="text-[10px] uppercase font-bold tracking-tighter text-slate-400 hover:text-white flex gap-1 h-6">
              <Mic className="w-3 h-3" /> Voice
            </Button>
          )}
        </div>

        <form onSubmit={(e) => handleSend(e)} className="flex gap-3">
          <div className="relative flex-1">
            <Input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Describe your issue..."
              className="bg-slate-900 border-white/10 h-11 px-6 rounded-xl hover:border-white/20 transition-all text-sm"
              disabled={isUploading}
            />
            {isUploading && (
              <div className="absolute right-3 top-2.5">
                <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
              </div>
            )}
          </div>
          <Button type="submit" size="icon" disabled={(!newMessage.trim() && !isUploading)} className="h-11 w-11 bg-brand-blue hover:bg-blue-500 rounded-xl shadow-lg">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

