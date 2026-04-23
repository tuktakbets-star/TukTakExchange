import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/hooks/useAuth';
import { ShieldCheck, ClipboardList, UserPlus, Clock } from 'lucide-react';

export default function OperatorDashboard() {
  const { profile } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back, <span className="text-blue-500">{profile?.displayName?.split(' ')[0]}</span>!
          </h1>
          <p className="text-slate-400 mt-1">Here is your operational overview for today.</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 px-4 py-2 rounded-xl text-blue-400">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-semibold">Operator Access</span>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { 
            title: 'Pending Requests', 
            desc: 'View and process new orders from users.', 
            icon: ClipboardList, 
            color: 'bg-orange-500', 
            link: '/operator/orders' 
          },
          { 
            title: 'New User Registration', 
            desc: 'Manually register a new user in the system.', 
            icon: UserPlus, 
            color: 'bg-green-500', 
            link: '/operator/create-user' 
          },
          { 
            title: 'Recent Activity', 
            desc: 'Check the status of processed orders.', 
            icon: Clock, 
            color: 'bg-blue-500', 
            link: '/operator/completed-orders' 
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-slate-900/50 border border-white/5 rounded-2xl p-6 hover:bg-slate-900 transition-all cursor-pointer overflow-hidden"
          >
            <div className={`w-12 h-12 rounded-xl ${card.color}/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              <card.icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{card.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
            
            {/* Background Glow */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 ${card.color}/5 blur-[60px] rounded-full group-hover:opacity-100 transition-opacity`} />
          </motion.div>
        ))}
      </div>

      {/* Operational Guidelines */}
      <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-8 mt-12">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-500" />
          Operator Guidelines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-blue-400 font-semibold text-sm uppercase tracking-wider">Responsibilities</h3>
            <ul className="space-y-3">
              {[
                'Verify user payment proofs before approval',
                'Ensure accurate manual user registration',
                'Process orders in a timely manner',
                'Report system issues to Admin immediately'
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-slate-300 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-orange-400 font-semibold text-sm uppercase tracking-wider">Restrictions</h3>
            <ul className="space-y-3">
              {[
                'Never share operator credentials',
                'Financial stats are hidden for security',
                'Do not modify bank settings',
                'Actions are logged and monitored by Admin'
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-slate-300 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
