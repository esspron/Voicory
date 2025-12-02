import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'default' | 'lg';
    className?: string;
    label?: string;
    description?: string;
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ checked, onChange, disabled = false, size = 'default', className, label, description }, ref) => {
        const sizeClasses = {
            sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'left-4' },
            default: { track: 'w-11 h-6', thumb: 'w-4 h-4', translate: 'left-6' },
            lg: { track: 'w-14 h-7', thumb: 'w-5 h-5', translate: 'left-8' },
        };

        const sizes = sizeClasses[size];

        const toggle = (
            <button
                ref={ref}
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    sizes.track,
                    "rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50",
                    checked ? "bg-primary" : "bg-surfaceHover border border-white/10",
                    disabled && "opacity-50 cursor-not-allowed",
                    className
                )}
            >
                <div
                    className={cn(
                        sizes.thumb,
                        "bg-white rounded-full absolute top-1 transition-all duration-200 shadow-sm",
                        checked ? sizes.translate : "left-1"
                    )}
                />
            </button>
        );

        if (label || description) {
            return (
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        {label && (
                            <p className="text-sm font-medium text-textMain">{label}</p>
                        )}
                        {description && (
                            <p className="text-xs text-textMuted mt-0.5">{description}</p>
                        )}
                    </div>
                    {toggle}
                </div>
            );
        }

        return toggle;
    }
);
Toggle.displayName = "Toggle";

export { Toggle };
