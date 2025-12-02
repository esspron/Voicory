import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { CircleNotch } from '@phosphor-icons/react';

/**
 * Button variant styles using class-variance-authority.
 * Supports 8 variants and 5 sizes for maximum flexibility.
 */
const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 cursor-pointer",
    {
        variants: {
            variant: {
                default: "bg-gradient-to-r from-primary to-primary/80 text-black font-semibold hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5",
                destructive: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20",
                outline: "border border-white/10 bg-surface/50 hover:bg-surface hover:text-textMain backdrop-blur-sm",
                secondary: "bg-surface text-textMain hover:bg-surfaceHover border border-white/5",
                ghost: "hover:bg-white/5 hover:text-textMain text-textMuted",
                link: "text-primary underline-offset-4 hover:underline",
                glass: "bg-surface/80 backdrop-blur-xl border border-white/10 hover:bg-surfaceHover hover:border-primary/30 text-textMain",
                "ghost-destructive": "hover:bg-red-500/10 text-textMuted hover:text-red-500",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-lg px-3 text-xs",
                lg: "h-11 rounded-xl px-8 text-base",
                icon: "h-10 w-10",
                "icon-sm": "h-9 w-9 rounded-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

/**
 * Button component props extending native button attributes.
 */
export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    /** Render as child component (for composition) */
    asChild?: boolean;
    /** Show loading spinner and disable interactions */
    loading?: boolean;
}

/**
 * A versatile button component with multiple variants and sizes.
 * Built with accessibility in mind and follows the design system.
 *
 * @example
 * ```tsx
 * // Primary action button
 * <Button onClick={handleSubmit}>Create Assistant</Button>
 *
 * // Destructive action with loading state
 * <Button variant="destructive" loading={isDeleting}>
 *   Delete
 * </Button>
 *
 * // Ghost button for secondary actions
 * <Button variant="ghost" size="sm">Cancel</Button>
 *
 * // Icon-only button
 * <Button variant="outline" size="icon">
 *   <Plus size={20} />
 * </Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={loading || disabled}
                {...props}
            >
                {loading && <CircleNotch className="mr-2 h-4 w-4 animate-spin" weight="bold" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
