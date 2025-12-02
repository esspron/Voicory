import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
    "w-full bg-background border rounded-xl text-textMain placeholder:text-textMuted/50 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
    {
        variants: {
            variant: {
                default: "border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                error: "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
                success: "border-emerald-500/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20",
            },
            inputSize: {
                default: "px-4 py-2.5 text-sm",
                sm: "px-3 py-2 text-xs",
                lg: "px-5 py-3 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            inputSize: "default",
        },
    }
);

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, variant, inputSize, leftIcon, rightIcon, error, ...props }, ref) => {
        return (
            <div className="relative">
                {leftIcon && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
                        {leftIcon}
                    </span>
                )}
                <input
                    className={cn(
                        inputVariants({ variant: error ? 'error' : variant, inputSize }),
                        leftIcon && "pl-10",
                        rightIcon && "pr-10",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {rightIcon && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted">
                        {rightIcon}
                    </span>
                )}
                {error && (
                    <p className="mt-1.5 text-xs text-red-400">{error}</p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input, inputVariants };
