import { cn } from "../../lib/utils";

const VARIANTS = {
  default: "bg-cyan text-bg font-semibold hover:bg-cyan/90",
  ghost: "bg-transparent text-text hover:bg-cyan/10",
  outline: "border border-cyan/30 text-text hover:border-cyan",
};

const SIZES = {
  sm: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({ variant = "default", size = "sm", className, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}
