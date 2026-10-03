import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "text" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ink text-white hover:bg-gray-800 border border-transparent",
  secondary:
    "bg-white text-ink border border-border hover:bg-gray-50",
  text: "bg-transparent text-ink hover:bg-gray-100 border border-transparent px-2",
  danger:
    "bg-white text-danger-600 border border-danger-600/40 hover:bg-danger-50",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-6 h-12 text-sm font-semibold transition duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

interface CommonProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

interface ButtonAsButton extends CommonProps {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}

interface ButtonAsLink extends CommonProps {
  href: string;
}

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", children, className = "" } = props;
  const classes = `${base} ${variantClasses[variant]} ${className}`;

  if ("href" in props && props.href) {
    if (/^https?:\/\//.test(props.href)) {
      return (
        <a href={props.href} target="_blank" rel="noreferrer" className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link to={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { onClick, type = "button", disabled } = props as ButtonAsButton;
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
