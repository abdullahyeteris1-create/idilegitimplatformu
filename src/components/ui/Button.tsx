import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  disabled?: boolean;
};

const variantMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border border-red-900/30 bg-[var(--brand)] text-white shadow-md shadow-red-200 hover:bg-[var(--brand-strong)]",
  secondary: "border border-red-300 bg-[var(--surface-soft)] text-[var(--foreground)] shadow-sm hover:bg-red-100",
  ghost: "border border-red-200 bg-white text-[var(--brand)] shadow-sm hover:bg-red-50",
};

export function Button({
  children,
  type = "button",
  onClick,
  variant = "primary",
  className = "",
  disabled,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`relative z-20 w-full min-h-[56px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-2xl px-5 py-3.5 text-base font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${variantMap[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
