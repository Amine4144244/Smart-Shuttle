import { ReactNode } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

import toast from 'react-hot-toast';

interface EntityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function EntityModal({ open, onOpenChange, title, description, children, form, onSubmit, isSubmitting, submitLabel = 'Save' }: EntityModalProps) {
  const onInvalid = (errors: any) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstError = errors[errorKeys[0]];
      toast.error(firstError?.message || `Please check the ${errorKeys[0]} field`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          {children}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
