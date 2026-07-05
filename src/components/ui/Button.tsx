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
    "border border-red-900/20 bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-strong)]",
  secondary: "border border-red-200 bg-white text-red-800 shadow-sm hover:bg-red-50",
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
      className={`relative z-20 w-full min-h-[42px] cursor-pointer select-none touch-manipulation pointer-events-auto rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${variantMap[variant]} ${className}`}
      style={{ touchAction: "manipulation" }}
    >
      {children}
    </button>
  );
}
