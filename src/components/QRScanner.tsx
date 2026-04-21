import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setError(null);

    const initScanner = async () => {
      // Small delay to ensure Radix UI Dialog has rendered the content
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!isMounted) return;

      const element = document.getElementById("qr-reader");
      if (!element) {
        console.error("QR Reader element not found after delay");
        setError("Scanner initialization failed: Container not found.");
        return;
      }

      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            onScan(decodedText);
            // Stop and then close
            html5QrCode.stop().then(() => {
              if (isMounted) onClose();
            }).catch(err => {
              console.error("Failed to stop scanner", err);
              if (isMounted) onClose();
            });
          },
          (errorMessage) => {
            // Mostly ignore standard frame processing errors
          }
        );
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        if (isMounted) {
          if (err?.message?.includes("NotFoundException")) {
            setError("No camera found or permission denied.");
          } else {
            setError("Could not start camera. Please check permissions.");
          }
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Scanner cleanup error:", err));
      }
    };
  }, [isOpen, onScan, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl">
          <DialogTitle className="flex items-center gap-3 font-display text-xl">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-brand-blue" />
            </div>
            Scan QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-3xl border-2 border-dashed border-white/10 bg-black/40 flex items-center justify-center group transition-colors hover:border-brand-blue/20">
            <div id="qr-reader" className="w-full h-full" />
            
            {/* Overlay indicators */}
            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-brand-blue rounded-2xl opacity-40 animate-pulse" />
          </div>

          {error ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center font-medium">
              Align the QR code within the frame to scan
            </p>
          )}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/5 flex gap-3">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="flex-1 rounded-xl hover:bg-white/10"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
