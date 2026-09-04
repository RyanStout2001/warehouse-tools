import Link from "next/link";

export function SearchForm({
  action,
  q,
  placeholder = "Search…",
}: {
  action: string;
  q: string;
  placeholder?: string;
}) {
  return (
    <form method="get" action={action} className="flex flex-wrap gap-2">
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="min-w-56 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Search
      </button>
    </form>
  );
}

export function Pagination({
  basePath,
  page,
  pageCount,
  q,
  extra,
}: {
  basePath: string;
  page: number;
  pageCount: number;
  q?: string;
  extra?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) {
    return null;
  }

  function href(target: number) {
    const params = new URLSearchParams();
    if (q) {
      params.set("q", q);
    }
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value) {
          params.set(key, value);
        }
      }
    }
    if (target > 1) {
      params.set("page", String(target));
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted">
      <p>
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-3">
        {page > 1 ? (
          <Link href={href(page - 1)} className="font-medium text-accent hover:underline">
            Previous
          </Link>
        ) : (
          <span className="opacity-40">Previous</span>
        )}
        {page < pageCount ? (
          <Link href={href(page + 1)} className="font-medium text-accent hover:underline">
            Next
          </Link>
        ) : (
          <span className="opacity-40">Next</span>
        )}
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-muted/60 text-xs tracking-wide text-muted uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column} className="whitespace-nowrap px-3 py-3 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  mono,
  title,
  className = "",
}: {
  children: React.ReactNode;
  mono?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <td
      title={title}
      className={`whitespace-nowrap px-3 py-2.5 text-foreground ${mono ? "font-mono text-[13px]" : ""} ${className}`}
    >
      {children}
    </td>
  );
}
