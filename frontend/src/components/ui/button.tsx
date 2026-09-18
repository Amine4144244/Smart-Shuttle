import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:shadow-md hover:shadow-primary/20 active:bg-primary/95',
        'primary-glow': 'bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/40 border border-primary-glow/30',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md hover:shadow-destructive/20 active:bg-destructive/95',
        outline: 'border border-border/80 bg-background/50 hover:bg-secondary/70 hover:text-foreground hover:border-border active:bg-secondary',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/90',
        ghost: 'hover:bg-secondary/70 hover:text-foreground active:bg-secondary',
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto font-medium',
        'tactile-touch': 'bg-card text-foreground border-2 border-border hover:border-primary/50 hover:bg-secondary/50 shadow-sm active:border-primary active:bg-primary/5',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8.5 rounded-md px-3 text-xs',
        lg: 'h-11.5 rounded-xl px-6 text-base font-semibold',
        xl: 'h-13 rounded-xl px-8 text-lg font-bold',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
