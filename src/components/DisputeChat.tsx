import React, { useState, useEffect, useRef } from 'react';
import { supabaseService, where, orderBy } from '../lib/supabaseService';
import { useAuth } from '../hooks/useAuth';
import { Send, User, ShieldCheck, ShieldAlert, UserCheck, Image, Video, Mic, StopCircle, Loader2, MessageSquare } from 'lucide-react';
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

export function DisputeChat({ txId, subAdminId, title = 'Support Chat' }: { txId: string; subAdminId?: string; title?: string }) {
  const { profile, isAdmin, user } = useAuth();
  
  // CLEAR CONFLICTING OPERATOR SESSION
  useEffect(() => {
    const operatorSessionRaw = sessionStorage.getItem('operator_session');
    if (operatorSessionRaw && profile?.role === 'admin') {
      console.log('Clearing conflicting operator session for admin');
      sessionStorage.removeItem('operator_session');
    }
  }, [profile?.role]);

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
    // ROBUST SENDER DETECTION
    const operatorSession = JSON.parse(sessionStorage.getItem('operator_session') || '{}');
    const currentEmail = (profile?.email || (user as any)?.email || '').toLowerCase().trim();
    const currentUid = profile?.uid || user?.id || (user as any)?.uid;
    
    const isSystemAdmin = 
      isAdmin || 
      profile?.role === 'admin' || 
      currentEmail === 'tuktakbets@gmail.com' ||
      currentEmail.startsWith('shohagrana');
    
    let role: 'admin' | 'subadmin' | 'user' = 'user';
    let senderName = profile?.displayName || profile?.email?.split('@')[0] || 'User';
    let senderId = profile?.uid || currentUid;

    if (isSystemAdmin) {
      role = 'admin';
      senderName = "Authority Representative";
      senderId = currentUid || 'admin-system';
    } else if (profile?.uid && profile.role !== 'admin' && !currentEmail.startsWith('shohag')) {
      // DEFINITELY A USER: Prioritize profile if it's a normal user identity
      role = 'user';
      senderName = profile.displayName || profile.email?.split('@')[0] || 'Client';
      senderId = profile.uid;
    } else if (operatorSession.id) {
      // SUBADMIN: Fallback to operator session if no user profile is active or user is an admin
      role = 'subadmin';
      senderName = "Support Staff";
      senderId = operatorSession.id;
    } else if (currentUid) {
      // Fallback for user
      role = 'user';
      senderName = profile?.displayName || (user as any)?.displayName || 'Client';
      senderId = currentUid;
    }

    if (!senderId) {
      toast.error('Session error. Please logout and login again.');
      return;
    }

    try {
      const payload: any = {
        tx_id: txId,
        sender_id: senderId,
        sender_role: role,
        sender_name: senderName,
        type: mediaData ? mediaData.type : 'text',
        created_at: new Date().toISOString()
      };

      const msgValue = mediaData ? (mediaData.type === 'image' ? 'Sent a photo' : mediaData.type === 'video' ? 'Sent a video' : 'Sent a voice message') : newMessage.trim();
      
      payload.message = msgValue;
      payload.text = msgValue;

      if (mediaData) {
        payload.url = mediaData.url;
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

  // ROBUST ADMIN DETECTION
  const currentEmail = (profile?.email || user?.email || '').toLowerCase().trim();
  const isSystemAdmin = 
    isAdmin || 
    profile?.role === 'admin' || 
    currentEmail === 'tuktakbets@gmail.com' ||
    currentEmail.startsWith('shohagrana');

  // No longer blocking admins, just showing a badge

  return (
    <div className="flex flex-col h-[500px] bg-slate-900/50 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <h3 className="font-display font-bold flex items-center gap-2">
          {title.includes('Dispute') ? <ShieldCheck className="w-4 h-4 text-red-500" /> : <MessageSquare className="w-4 h-4 text-blue-500" />}
          {title}
        </h3>
        <div className="flex gap-2">
           {isSystemAdmin && !title?.toLowerCase().includes('dispute') && (
             <span className="text-[8px] font-black uppercase text-amber-500 tracking-widest border border-amber-500/20 bg-amber-500/5 px-2 py-1 rounded-md flex items-center gap-1">
               <ShieldAlert className="w-2 h-2" /> Admin Spectator
             </span>
           )}
           <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest border border-white/10 px-2 py-1 rounded-md">Admin</span>
           <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest border border-white/10 px-2 py-1 rounded-md">Sub-Admin</span>
           <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest border border-white/10 px-2 py-1 rounded-md">You</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg) => {
          const currentOpSession = JSON.parse(sessionStorage.getItem('operator_session') || '{}');
          const myId = profile?.uid || user?.id || user?.uid;
          
          // STRICT isMe detection
          let isMe = false;
          if (msg.sender_id) {
            isMe = (msg.sender_id === myId) || (msg.sender_id === currentOpSession.id);
          } else {
            // Fallback for older messages without sender_id
            isMe = (msg.sender_role === 'admin' && isSystemAdmin) || 
                   (msg.sender_role === 'sub_admin' && currentOpSession.id != null) ||
                   (msg.sender_role === 'user' && !isSystemAdmin && !currentOpSession.id);
          }
          
          console.log('Message Role Debug:', msg.sender_role);
          
          const getRoleLabel = (message: any) => {
            const role = (message.sender_role || message.senderRole || (message as any).role || '').toLowerCase().trim();
            const name = (message.sender_name || message.senderName || '').toLowerCase();
            
            // PRIORITY 1: Explicit Role
            if (role === 'admin' || role === 'system') return 'ADMIN';
            if (role === 'subadmin' || role === 'sub_admin' || role === 'operator' || role === 'support') return 'SUB ADMIN';
            if (role === 'user' || role === 'client' || role === 'customer') return 'CLIENT';
            
            return 'CLIENT';
          };
          
          const roleLabel = getRoleLabel(msg);
          
          const getVisibleName = () => {
            const r = (msg.sender_role || (msg as any).role || '').toLowerCase().trim();
            if (r === 'admin' || r === 'system') return 'Authority Representative';
            if (r === 'subadmin' || r === 'sub_admin' || r === 'support' || r === 'operator') return 'Support Staff';
            
            if (msg.sender_name && !['unknown', 'user', 'client'].includes(msg.sender_name.toLowerCase())) return msg.sender_name;
            if (msg.senderName && !['unknown', 'user', 'client'].includes(msg.senderName.toLowerCase())) return msg.senderName;
            
            return 'Customer Account';
          };

          const msgTime = msg.created_at || (msg as any).createdAt || (msg as any).timestamp || (msg as any).updated_at;

          return (
            <div key={msg.id} className={cn("flex flex-col gap-2", isMe ? "items-end" : "items-start")}>
              <div className={cn("flex items-center gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shadow-sm",
                      roleLabel === 'ADMIN' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      roleLabel === 'SUB ADMIN' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    )}>
                      {roleLabel} • {getVisibleName()}
                    </span>
                    <span className="text-[8px] font-medium text-slate-500 italic">
                      {msgTime ? new Date(msgTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending...'}
                    </span>
                  </div>
                </div>
              </div>
              <div className={cn(
                "max-w-[85%] px-6 py-4 rounded-[2rem] text-sm leading-relaxed shadow-2xl border transition-all hover:brightness-110",
                isMe ? "bg-blue-600 text-white rounded-tr-none border-blue-400/50 shadow-blue-500/10" : cn(
                  msg.sender_role === 'admin' ? "bg-red-950/40 text-red-100 border-red-500/20 rounded-tl-none" :
                  msg.sender_role === 'sub_admin' ? "bg-emerald-950/40 text-emerald-100 border-emerald-500/20 rounded-tl-none" :
                  "bg-[#0d1117] text-slate-200 rounded-tl-none border-white/10 font-medium"
                )
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
                  msg.message || msg.text || 'No content'
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

