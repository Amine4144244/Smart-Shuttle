import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  variant?: 'default' | 'live' | 'delayed' | 'emerald';
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, variant = 'default', className = '', ...props }, ref) => {
    const clamped = Math.min(Math.max(value, 0), 100);

    const variantStyles = {
      default: 'bg-primary',
      live: 'bg-gradient-to-r from-primary to-emerald-500',
      delayed: 'bg-amber-500',
      emerald: 'bg-emerald-500',
    };

    return (
      <div
        ref={ref}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary/80 border border-border/40', className)}
        {...props}
      >
        <div
          className={cn('h-full w-full flex-1 transition-all duration-300 ease-out rounded-full', variantStyles[variant])}
          style={{ transform: `translateX(-${100 - clamped}%)` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };