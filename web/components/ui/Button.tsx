import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "brand" | "secondary" | "ghost" | "danger";
type Size = "xs" | "sm" | "md";

const base =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap " +
  "transition-all duration-150 ease-apple active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  brand: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border border-line-strong bg-surface text-fg hover:border-fg-subtle hover:bg-surface-hover",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:bg-danger hover:text-white",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-caption",
  sm: "h-8 px-3 text-small",
  md: "h-9 px-4 text-small",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export default function Button({ variant = "primary", size = "sm", className = "", ...props }: Props) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
