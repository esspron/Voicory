import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textareaVariants = cva(
    "w-full bg-background border rounded-xl text-textMain placeholder:text-textMuted/50 outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none",
    {
        variants: {
            variant: {
                default: "border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                error: "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20",
            },
            textareaSize: {
                default: "px-4 py-3 text-sm",
                sm: "px-3 py-2 text-xs",
                lg: "px-5 py-4 text-base",
            },
        },
        defaultVariants: {
            variant: "default",
            textareaSize: "default",
        },
    }
);

export interface TextareaProps
    extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
    error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, variant, textareaSize, error, ...props }, ref) => {
        return (
            <div>
                <textarea
                    className={cn(
                        textareaVariants({ variant: error ? 'error' : variant, textareaSize }),
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-xs text-red-400">{error}</p>
                )}
            </div>
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
