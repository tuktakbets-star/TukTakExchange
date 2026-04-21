import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function BackButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show back button on landing page if it's the root
  if (location.pathname === '/') return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate(-1)}
      className={cn(
        "text-slate-400 hover:text-white hover:bg-white/5 h-8 w-8 sm:h-9 sm:w-9 shrink-0",
        className
      )}
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
}
