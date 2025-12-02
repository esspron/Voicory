import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { User } from '@phosphor-icons/react';

const avatarVariants = cva(
    "relative inline-flex items-center justify-center rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10",
    {
        variants: {
            size: {
                xs: "w-6 h-6 text-xs",
                sm: "w-8 h-8 text-sm",
                default: "w-10 h-10 text-base",
                lg: "w-12 h-12 text-lg",
                xl: "w-16 h-16 text-xl",
            },
            shape: {
                square: "rounded-xl",
                circle: "rounded-full",
            },
        },
        defaultVariants: {
            size: "default",
            shape: "square",
        },
    }
);

export interface AvatarProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
    src?: string | null;
    alt?: string;
    fallback?: string;
    status?: 'online' | 'offline' | 'away' | 'busy';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, size, shape, src, alt, fallback, status, ...props }, ref) => {
        const [imageError, setImageError] = React.useState(false);

        const getInitials = (name: string) => {
            return name
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        };

        const statusColors = {
            online: 'bg-emerald-500',
            offline: 'bg-gray-500',
            away: 'bg-yellow-500',
            busy: 'bg-red-500',
        };

        const iconSizes = {
            xs: 12,
            sm: 14,
            default: 18,
            lg: 22,
            xl: 28,
        };

        return (
            <div
                ref={ref}
                className={cn(avatarVariants({ size, shape }), className)}
                {...props}
            >
                {src && !imageError ? (
                    <img
                        src={src}
                        alt={alt || 'Avatar'}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : fallback ? (
                    <span className="font-semibold text-primary">
                        {getInitials(fallback)}
                    </span>
                ) : (
                    <User size={iconSizes[size || 'default']} weight="bold" className="text-primary" />
                )}
                
                {status && (
                    <span
                        className={cn(
                            "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
                            statusColors[status],
                            size === 'xs' && "w-1.5 h-1.5",
                            size === 'sm' && "w-2 h-2",
                            size === 'default' && "w-2.5 h-2.5",
                            size === 'lg' && "w-3 h-3",
                            size === 'xl' && "w-4 h-4",
                        )}
                    />
                )}
            </div>
        );
    }
);
Avatar.displayName = "Avatar";

// Avatar Group for showing multiple avatars stacked
interface AvatarGroupProps {
    children: React.ReactNode;
    max?: number;
    size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ children, max = 4, size = 'default' }) => {
    const childArray = React.Children.toArray(children);
    const visibleAvatars = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    return (
        <div className="flex -space-x-2">
            {visibleAvatars.map((child, index) => (
                <div key={index} className="ring-2 ring-background rounded-full">
                    {React.isValidElement(child) 
                        ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size, shape: 'circle' as const })
                        : child
                    }
                </div>
            ))}
            {remainingCount > 0 && (
                <div className={cn(
                    avatarVariants({ size: size as 'xs' | 'sm' | 'default' | 'lg' | 'xl', shape: 'circle' }),
                    "ring-2 ring-background bg-surface text-textMuted font-medium"
                )}>
                    +{remainingCount}
                </div>
            )}
        </div>
    );
};

export { Avatar, AvatarGroup, avatarVariants };
