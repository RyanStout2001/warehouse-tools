"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryLinks = [
  { href: "/", label: "Overview", match: (path: string) => path === "/" },
  {
    href: "/counts",
    label: "Count list",
    match: (path: string) => path.startsWith("/counts"),
  },
  {
    href: "/inbound",
    label: "Inbound",
    match: (path: string) => path.startsWith("/inbound"),
  },
  {
    href: "/settings",
    label: "Settings",
    match: (path: string) => path.startsWith("/settings"),
  },
  {
    href: "/tools",
    label: "Tools",
    match: (path: string) => path.startsWith("/tools"),
  },
] as const;

const dataLinks = [
  { href: "/data/shops", label: "Shops" },
  { href: "/data/products", label: "Products" },
  { href: "/data/shop-settings", label: "Shop settings" },
  { href: "/data/class-settings", label: "Class settings" },
  { href: "/data/shop-class-settings", label: "Shop × class" },
  { href: "/data/product-settings", label: "Product settings" },
  { href: "/data/balance-events", label: "Balance events" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
        <div className="border-b border-border px-5 py-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">
            Warehouse
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Tools
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
          <NavGroup label="Workspace">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={link.match(pathname)}
              />
            ))}
          </NavGroup>
          <NavGroup label="Tables">
            {dataLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={pathname.startsWith(link.href)}
              />
            ))}
          </NavGroup>
        </nav>
        <div className="border-t border-border px-5 py-4 text-xs leading-5 text-muted">
          Sync → Engine → Count. Picqer stays read-only.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                Warehouse Tools
              </p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {[...primaryLinks, ...dataLinks].map((link) => {
              const active =
                "match" in link
                  ? link.match(pathname)
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap ${
                    active
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-accent-soft font-medium text-accent"
          : "text-muted hover:bg-surface-muted hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
