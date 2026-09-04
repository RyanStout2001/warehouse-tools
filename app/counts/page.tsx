import Link from "next/link";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  COUNT_PAGE_SIZE,
  listCountRows,
  listShopsForFilter,
  parseCountFilters,
} from "@/lib/counts/list";
import { CountFilters } from "@/app/counts/count-filters";
import { CountTable } from "@/app/counts/count-table";
import { Alert, PageHeader } from "@/app/ui/primitives";

export const dynamic = "force-dynamic";

export default async function CountsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Workspace"
          title="Count list"
          description="Add SUPABASE_SERVICE_ROLE_KEY to .env.local to load flagged products."
        />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  const params = await searchParams;
  const filters = parseCountFilters(params);
  let rows;
  let total;
  let page = filters.page;
  let shops;
  try {
    const [list, shopRows] = await Promise.all([
      listCountRows(filters),
      listShopsForFilter(),
    ]);
    rows = list.rows;
    total = list.total;
    page = list.page;
    shops = shopRows;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load the count list";
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader eyebrow="Workspace" title="Count list" />
        <Alert tone="danger" title="Could not load count list">
          {message}
        </Alert>
      </main>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / COUNT_PAGE_SIZE));
  const query = new URLSearchParams();
  if (filters.q) {
    query.set("q", filters.q);
  }
  if (filters.reason !== "all") {
    query.set("reason", filters.reason);
  }
  if (filters.shopId !== "all") {
    query.set("shop", String(filters.shopId));
  }
  if (filters.abcClass !== "all") {
    query.set("class", filters.abcClass);
  }
  if (filters.sort !== "urgency") {
    query.set("sort", filters.sort);
  }
  if (filters.stock !== "main") {
    query.set("stock", filters.stock);
  }

  function hrefForPage(page: number) {
    const next = new URLSearchParams(query);
    if (page > 1) {
      next.set("page", String(page));
    }
    const qs = next.toString();
    return qs ? `/counts?${qs}` : "/counts";
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Workspace"
        title="Count list"
        description="The main list only includes flagged products with free stock greater than 0. Sort by urgency to work A-class, lowest cover first. Marking complete writes a balance event and starts a low-stock cooldown."
      />
      <p className="mb-4 text-sm text-muted">
        {total.toLocaleString()} items match these filters (page {page} of{" "}
        {pageCount}).
      </p>
      <CountFilters filters={filters} shops={shops} />
      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
          No products match these filters. If this is the main list, run the
          balancing engine from Overview after a Picqer sync.
        </div>
      ) : (
        <CountTable rows={rows} allowComplete={filters.stock !== "zero"} />
      )}
      {pageCount > 1 ? (
        <div className="mt-6 flex gap-4 text-sm">
          {page > 1 ? (
            <Link
              className="font-medium text-accent hover:underline"
              href={hrefForPage(page - 1)}
            >
              Previous
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link
              className="font-medium text-accent hover:underline"
              href={hrefForPage(page + 1)}
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
