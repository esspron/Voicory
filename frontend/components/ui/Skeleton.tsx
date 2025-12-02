import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'circular' | 'rectangular';
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]",
                    variant === 'circular' && "rounded-full",
                    variant === 'rectangular' && "rounded-none",
                    variant === 'default' && "rounded",
                    className
                )}
                {...props}
            />
        );
    }
);
Skeleton.displayName = "Skeleton";

// Pre-built skeleton patterns
const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
    <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                className={cn(
                    "h-4",
                    i === lines - 1 ? "w-3/4" : "w-full"
                )}
            />
        ))}
    </div>
);

const SkeletonCard = ({ className }: { className?: string }) => (
    <div className={cn("p-4 space-y-3", className)}>
        <Skeleton className="h-6 w-1/3" />
        <SkeletonText lines={2} />
        <Skeleton className="h-10 w-full" />
    </div>
);

const SkeletonAvatar = ({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        default: 'w-10 h-10',
        lg: 'w-12 h-12',
    };
    return <Skeleton variant="circular" className={sizeClasses[size]} />;
};

const SkeletonTableRow = ({ columns = 4 }: { columns?: number }) => (
    <div className="flex items-center gap-4 p-4">
        {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
                key={i}
                className={cn(
                    "h-4",
                    i === 0 ? "w-24" : i === columns - 1 ? "w-16" : "w-32"
                )}
            />
        ))}
    </div>
);

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar, SkeletonTableRow };
