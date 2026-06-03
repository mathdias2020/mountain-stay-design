import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const base =
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

// padding: 20px horizontal, 10px vertical; radius-md = 10px
const sizing = "px-5 py-2.5 rounded-md text-sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-dark",
  secondary: "bg-secondary text-secondary-foreground hover:bg-[#CFCEC9]",
  ghost: "bg-transparent border border-primary text-primary hover:bg-primary/10",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, sizing, variants[variant], className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export default Button;