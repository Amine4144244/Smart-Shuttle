import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';

const roleHomePaths: Record<string, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  ORGANIZER: '/admin/dashboard',
  DRIVER: '/driver/dashboard',
  EMPLOYEE: '/participant/dashboard',
  PARTICIPANT: '/participant/dashboard',
};

interface BackButtonProps {
  className?: string;
  fallbackPath?: string;
}

export default function BackButton({ className, fallbackPath }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const handleBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallbackPath || roleHomePaths[user?.role || ''] || '/dashboard');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleBack}
      title="Back"
      aria-label="Back"
      className={cn('h-9 w-9', className)}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
