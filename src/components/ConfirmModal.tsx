import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Download, Upload, FileCheck } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { firebaseService } from '@/lib/firebaseService';
import { toast } from 'sonner';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data?: any) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  showInput?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'primary',
  showInput = false
}) => {
  const { t } = useTranslation();
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
              }`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {showInput && (
              <div className="mt-6 space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Upload Payment Proof</label>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer group relative overflow-hidden",
                    proofFile ? "border-green-500/50 bg-green-500/5" : "border-white/10 hover:border-blue-500/40 hover:bg-white/5"
                  )}
                  onClick={() => !isUploading && document.getElementById('admin-proof-upload')?.click()}
                >
                  <input 
                    id="admin-proof-upload" 
                    type="file" 
                    accept="image/*"
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) setProofFile(file);
                    }}
                  />
                  
                  {isUploading && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">Uploading...</p>
                      </div>
                    </div>
                  )}

                  {proofFile ? (
                    <div className="flex flex-col items-center gap-2">
                       <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                         <FileCheck className="w-6 h-6" />
                       </div>
                       <div className="space-y-1">
                         <p className="text-sm font-bold text-white truncate max-w-[200px]">{proofFile.name}</p>
                         <p className="text-[10px] text-green-500 font-bold uppercase">Ready to submit</p>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors">
                         <Upload className="w-6 h-6" />
                       </div>
                       <div className="space-y-1">
                         <p className="text-sm font-medium text-slate-300">Click to select receipt</p>
                         <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">JPG, PNG up to 5MB</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-8">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
                className="flex-1 rounded-xl h-12 border-white/10 text-white hover:bg-white/5"
              >
                {cancelText || t('cancel')}
              </Button>
              <Button
                variant={variant === 'danger' ? 'destructive' : 'send'}
                disabled={isUploading || (showInput && !proofFile)}
                onClick={async () => {
                  if (showInput && proofFile) {
                    setIsUploading(true);
                    try {
                      const realUrl = await firebaseService.uploadFile(proofFile);
                      onConfirm({ proofUrl: realUrl });
                    } catch (error) {
                      toast.error('Failed to upload proof');
                    }
                  } else {
                    onConfirm();
                  }
                  setIsUploading(false);
                  onClose();
                  setProofFile(null);
                }}
                className="flex-1 rounded-xl h-12 font-bold"
              >
                {confirmText || t('confirm')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
