import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 font-medium border transition-colors",
    {
        variants: {
            variant: {
                default: "bg-surface text-textMain border-white/10",
                primary: "bg-primary/10 text-primary border-primary/20",
                success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                error: "bg-red-500/10 text-red-400 border-red-500/20",
                info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                gradient: "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/20",
            },
            size: {
                default: "px-2.5 py-1 text-xs rounded-lg",
                sm: "px-2 py-0.5 text-[10px] rounded-md",
                lg: "px-3 py-1.5 text-sm rounded-xl",
                pill: "px-3 py-1 text-xs rounded-full",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
    icon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant, size, icon, children, ...props }, ref) => {
        return (
            <span
                ref={ref}
                className={cn(badgeVariants({ variant, size }), className)}
                {...props}
            >
                {icon}
                {children}
            </span>
        );
    }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
