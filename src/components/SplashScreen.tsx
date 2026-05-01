import React from 'react';
import { motion } from 'framer-motion';
import { BadgeDollarSign } from 'lucide-react';

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.8, 
          ease: "easeOut",
          scale: {
            type: "spring",
            damping: 12,
            stiffness: 100
          }
        }}
        className="relative"
      >
        <div className="relative">
          <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="w-24 h-24 bg-slate-900 border-2 border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-600/20"></div>
            <BadgeDollarSign className="text-blue-500 w-12 h-12 relative z-10" />
          </div>
        </div>
        
        {/* Animated rings */}
        <motion.div 
          animate={{ 
            scale: [1, 1.5],
            opacity: [0.5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
          className="absolute inset-0 border-2 border-blue-500 rounded-[2rem]"
        />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 text-center"
      >
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">
          Tuktak<span className="text-blue-500">Exchange</span>
        </h1>
        <p className="text-slate-500 mt-2 font-medium tracking-widest text-xs uppercase">
          Fast & Secure Remittance
        </p>
      </motion.div>

      {/* Loading bar */}
      <div className="absolute bottom-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          className="w-full h-full bg-blue-600"
        />
      </div>
    </motion.div>
  );
}
