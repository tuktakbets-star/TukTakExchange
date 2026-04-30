import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Monitor, ShieldAlert } from 'lucide-react';

export default function SessionRequestDialog() {
  const { pendingLoginRequest, approveLoginRequest, rejectLoginRequest } = useAuth();

  if (!pendingLoginRequest) return null;

  return (
    <Dialog open={!!pendingLoginRequest} onOpenChange={() => rejectLoginRequest(pendingLoginRequest.id)}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md rounded-[2rem]">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>
          <DialogTitle className="text-2xl font-display font-bold">New Login Request</DialogTitle>
          <DialogDescription className="text-slate-400 mt-2">
            Someone is trying to log into your account from a new device.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-blue-500" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Device Info</span>
                <span className="text-sm font-medium text-slate-200 mt-1">
                  {pendingLoginRequest.device_info?.platform || 'Unknown Device'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-500">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-[10px] font-bold leading-tight uppercase italic">
              Warning: If you approve, this device will be logged out immediately.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col">
          <Button 
            onClick={() => approveLoginRequest(pendingLoginRequest.id)}
            className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20"
          >
            Allow & Log Out
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => rejectLoginRequest(pendingLoginRequest.id)}
            className="w-full h-12 rounded-xl text-slate-500"
          >
            Deny Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
