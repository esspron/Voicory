import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
    align?: 'start' | 'center' | 'end';
    delayDuration?: number;
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    side = 'top',
    align = 'center',
    delayDuration = 200,
    className,
}) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [timeoutId, setTimeoutId] = React.useState<NodeJS.Timeout | null>(null);

    const showTooltip = () => {
        const id = setTimeout(() => setIsVisible(true), delayDuration);
        setTimeoutId(id);
    };

    const hideTooltip = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full mb-2',
        bottom: 'top-full mt-2',
        left: 'right-full mr-2',
        right: 'left-full ml-2',
    };

    const alignClasses = {
        start: side === 'top' || side === 'bottom' ? 'left-0' : 'top-0',
        center: side === 'top' || side === 'bottom' ? 'left-1/2 -translate-x-1/2' : 'top-1/2 -translate-y-1/2',
        end: side === 'top' || side === 'bottom' ? 'right-0' : 'bottom-0',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-[#1A1D21] border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[#1A1D21] border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-[#1A1D21] border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-[#1A1D21] border-y-transparent border-l-transparent',
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            {isVisible && content && (
                <div
                    role="tooltip"
                    className={cn(
                        "absolute z-50 px-3 py-2 text-xs font-medium text-textMain bg-[#1A1D21] border border-white/10 rounded-lg shadow-xl whitespace-nowrap animate-in fade-in-0 zoom-in-95",
                        positionClasses[side],
                        alignClasses[align],
                        className
                    )}
                >
                    {content}
                    <div
                        className={cn(
                            "absolute w-0 h-0 border-4",
                            arrowClasses[side]
                        )}
                    />
                </div>
            )}
        </div>
    );
};

export { Tooltip };
