import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from './ui/button';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  src: string | null;
  alt?: string;
}

export function ImageViewer({ isOpen, onClose, src, alt = "Image Viewer" }: ImageViewerProps) {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  React.useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setRotation(0);
    }
  }, [isOpen]);

  if (!src) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
          />
          
          <div className="absolute top-6 left-0 right-0 z-[210] flex items-center justify-between px-6 pointer-events-none">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">{alt}</p>
            <div className="flex items-center gap-3 pointer-events-auto">
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-white/5 hover:bg-white/10 text-white rounded-full w-10 h-10"
                onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-white/5 hover:bg-white/10 text-white rounded-full w-10 h-10"
                onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-white/5 hover:bg-white/10 text-white rounded-full w-10 h-10"
                onClick={() => setRotation(prev => prev + 90)}
              >
                <RotateCw className="w-5 h-5" />
              </Button>
              <a 
                href={src} 
                download 
                target="_blank" 
                rel="noreferrer"
                className="w-10 h-10 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-white transition-all shadow-lg shadow-blue-600/20"
              >
                <Download className="w-5 h-5" />
              </a>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-red-500 hover:bg-red-400 text-white rounded-full w-10 h-10 shadow-lg shadow-red-500/20"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ 
                opacity: 1, 
                scale: scale,
                rotate: rotation
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-[205] max-w-[90vw] max-h-[85vh] flex items-center justify-center cursor-zoom-in"
          >
            <img 
              src={src} 
              alt={alt} 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain rounded-lg shadow-none pointer-events-none"
              style={{
                boxShadow: '0 0 100px rgba(0,0,0,0.5)'
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
