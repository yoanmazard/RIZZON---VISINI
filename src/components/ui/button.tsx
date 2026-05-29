import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--gerimalp-radius-md)] text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-[#0e1d45] active:scale-[0.98]',
        secondary:
          'border border-primary bg-white text-primary hover:bg-[var(--gerimalp-blue-pale)]',
        outline:
          'border border-primary bg-background text-primary hover:bg-[var(--gerimalp-blue-pale)]',
        ghost: 'text-primary hover:bg-[var(--gerimalp-blue-pale)] hover:text-primary',
        destructive: 'bg-destructive text-white hover:bg-[#b01f4a] active:scale-[0.98]',
        accent: 'bg-[var(--gerimalp-pink)] text-white hover:bg-[#b01f4a] active:scale-[0.98]',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-[var(--gerimalp-radius-md)] px-3 text-xs',
        lg: 'h-12 rounded-[var(--gerimalp-radius-md)] px-8 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
