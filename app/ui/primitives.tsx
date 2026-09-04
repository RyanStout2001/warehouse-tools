import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(20,32,28,0.04)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-border bg-surface p-5 transition hover:border-accent hover:shadow-[0_8px_24px_rgba(15,107,92,0.08)]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">{content}</div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-surface-muted text-foreground",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-hover disabled:opacity-50",
    secondary:
      "border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted disabled:opacity-50",
    ghost: "text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-50",
  } as const;

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Alert({
  tone,
  title,
  children,
}: {
  tone: "success" | "warning" | "danger" | "info";
  title: string;
  children?: ReactNode;
}) {
  const tones = {
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
    info: "border-accent/30 bg-accent-soft text-accent",
  } as const;

  return (
    <div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-1 text-sm leading-6 opacity-90">{children}</div> : null}
    </div>
  );
}
