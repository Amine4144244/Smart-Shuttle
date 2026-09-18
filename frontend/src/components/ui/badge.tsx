import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow-sm',
        secondary: 'border-border/60 bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/15 text-destructive border-destructive/30',
        outline: 'border-border text-foreground bg-background/50',
        success: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        warning: 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400',
        info: 'border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400',
        live: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider',
        scheduled: 'border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium',
        delayed: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold',
        completed: 'border-slate-500/30 bg-slate-500/15 text-slate-600 dark:text-slate-400',
        cancelled: 'border-red-500/30 bg-red-500/15 text-red-600 dark:text-red-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  withPulse?: boolean;
}

function Badge({ className, variant, withPulse = false, children, ...props }: BadgeProps) {
  const isLive = variant === 'live' || withPulse;

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
