import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, isError = false, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-input/80 bg-background/70 px-3.5 py-2 text-sm text-foreground shadow-sm transition-all duration-150',
          'placeholder:text-muted-foreground/70',
          'hover:border-border hover:bg-background',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input',
          isError && 'border-destructive/80 focus-visible:ring-destructive/80 text-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
