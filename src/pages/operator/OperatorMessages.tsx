import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  senderId: string;
  senderRole: 'user' | 'sub_admin' | 'admin';
  text: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  userName: string;
  avatar: string;
  lastMessage: string;
  unreadCount: number;
  orderId: string;
  orderType: string;
  orderAmount: string;
  status: string;
  isAppeal: boolean;
  timestamp: string;
}

export default function OperatorMessages() {
  const navigate = useNavigate();
  const [activeConvId, setActiveConvId] = useState<string | null>('conv_1');
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [conversations] = useState<Conversation[]>([
    {
      id: 'conv_1',
      userName: 'Rahat Khan',
      avatar: 'R',
      lastMessage: "I've uploaded the screenshot. Please check it.",
      unreadCount: 2,
      orderId: 'TX-9821',
      orderType: 'Add Money',
      orderAmount: '৳ 500',
      status: 'pending',
      isAppeal: false,
      timestamp: '2026-04-29T13:40:00Z'
    },
    {
      id: 'conv_2',
      userName: 'Nabila H.',
      avatar: 'N',
      lastMessage: "Thank you for the fast payment!",
      unreadCount: 0,
      orderId: 'WD-1102',
      orderType: 'Withdraw',
      orderAmount: '৳ 1,200',
      status: 'mark_as_paid',
      isAppeal: false,
      timestamp: '2026-04-29T12:30:00Z'
    },
    {
      id: 'conv_3',
      userName: 'Sumon Ahmed',
      avatar: 'S',
      lastMessage: "I haven't received the funds yet. It's been 2 hours.",
      unreadCount: 5,
      orderId: 'EX-4421',
      orderType: 'Exchange',
      orderAmount: '$ 20.00',
      status: 'accepted',
      isAppeal: true,
      timestamp: '2026-04-29T14:10:00Z'
    }
  ]);

  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', senderId: 'user_1', senderRole: 'user', text: "Hello, I made a deposit.", timestamp: '2026-04-29T13:35:00Z', isRead: true },
    { id: 'm2', senderId: 'op_1', senderRole: 'sub_admin', text: "Hello Rahat. Please upload the transaction receipt screenshot.", timestamp: '2026-04-29T13:38:00Z', isRead: true },
    { id: 'm3', senderId: 'user_1', senderRole: 'user', text: "I've uploaded the screenshot. Please check it.", timestamp: '2026-04-29T13:40:00Z', isRead: false },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: Date.now().toString(),
      senderId: 'op_1',
      senderRole: 'sub_admin',
      text: newMessage,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    setMessages([...messages, msg]);
    setNewMessage('');
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
           {conversations.map((conv) => (
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
                    {conv.avatar}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#161b22]" />
               </div>
               
               <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm tracking-tight truncate">{conv.userName}</span>
                    <span className="text-[9px] font-bold text-slate-600 uppercase italic">
                       {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mb-2 leading-relaxed">{conv.lastMessage}</p>
                  <div className="flex items-center justify-between">
                     <span className={cn(
                       "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                       conv.isAppeal ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                     )}>
                        {conv.isAppeal ? 'Appeal' : 'Support'}
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
                    {activeConv.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                       {activeConv.userName}
                       {activeConv.isAppeal && <span className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter">🚨 Dispute Alert</span>}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none">Order: {activeConv.orderId}</p>
                    </div>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <div className="hidden lg:flex flex-col text-right">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{activeConv.orderType}</p>
                     <p className="text-sm font-black text-white leading-none">{activeConv.orderAmount}</p>
                  </div>
                  <Button variant="dark" className="h-9 w-9 p-0 rounded-xl"><MoreVertical className="w-4 h-4 text-slate-500" /></Button>
               </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
               {activeConv.isAppeal && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-sm text-red-500 font-bold mb-8">
                     <ShieldAlert className="w-6 h-6 shrink-0" />
                     <p>This is a 3-way appeal thread. The Admin has been added to this conversation for oversight.</p>
                  </div>
               )}

               <div className="text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 bg-white/5 px-4 py-1 rounded-full">Conversation Started: Yesterday</span>
               </div>

               {messages.map((msg) => (
                 <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
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
                       {msg.text}
                    </div>
                    <div className="flex items-center gap-2 mt-2 px-1">
                       <span className="text-[10px] font-bold text-slate-600">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                       </span>
                       {msg.senderRole === 'sub_admin' && (
                         <CheckCheck className={cn("w-3 h-3 transition-colors", msg.isRead ? "text-blue-500" : "text-slate-700")} />
                       )}
                    </div>
                 </motion.div>
               ))}
               <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 bg-[#161b22] border-t border-white/5">
               <form onSubmit={handleSendMessage} className="relative flex items-center gap-4">
                  <Button type="button" variant="ghost" className="h-12 w-12 p-0 rounded-2xl text-slate-500 hover:text-blue-400">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <div className="relative flex-1 group">
                    <Input 
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 pl-6 pr-12 rounded-2xl text-sm font-medium focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    <button 
                      type="submit"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
                    >
                      <Send className="w-4 h-4" />
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

      {/* Right Sidebar - Active Order Summary */}
      {activeConv && (
        <div className="w-80 border-l border-white/5 p-8 hidden xl:flex flex-col gap-8 bg-[#161b22]/50">
           <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Active Order Summary</h4>
              <div className="p-6 bg-slate-900 border border-white/5 rounded-[2rem] shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600/10 blur-2xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700" />
                 
                 <div className="relative space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <FileText className="w-5 h-5 text-white" />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-white tracking-tight">{activeConv.orderId}</p>
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{activeConv.orderType}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Amount</span>
                          <span className="text-sm font-black text-white">{activeConv.orderAmount}</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Status</span>
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.05em]">{activeConv.status}</span>
                       </div>
                    </div>

                    <Button variant="dark" onClick={() => navigate(`/operator/orders/${activeConv.orderType.toLowerCase().replace(/ /g, '-')}`)} className="w-full h-11 bg-white/5 text-slate-400 group-hover:text-white rounded-xl text-xs font-bold gap-2">
                       View Order Details <ChevronRight className="w-3 h-3" />
                    </Button>
                 </div>
              </div>
           </div>

           <div className="flex-1 flex flex-col">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Operator Guidelines</h4>
              <div className="flex-1 space-y-4">
                 {[
                   "Always verify screenshots for authenticity.",
                   "Do not share personal account numbers in chat.",
                   "Escalate disputes to Admin immediately if suspicious.",
                   "Professional tone is mandatory for all responses."
                 ].map((guide, i) => (
                   <div key={i} className="flex gap-3 text-xs text-slate-500 font-medium leading-relaxed">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                      {guide}
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
