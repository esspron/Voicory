import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean;
    optional?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ className, children, required, optional, ...props }, ref) => {
        return (
            <label
                ref={ref}
                className={cn(
                    "block text-sm font-medium text-textMuted mb-1.5",
                    className
                )}
                {...props}
            >
                {children}
                {required && <span className="text-red-400 ml-0.5">*</span>}
                {optional && <span className="text-textMuted/50 ml-1 text-xs font-normal">(optional)</span>}
            </label>
        );
    }
);
Label.displayName = "Label";

export { Label };
