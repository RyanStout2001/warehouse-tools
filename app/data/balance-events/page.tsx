import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  BROWSE_PAGE_SIZE,
  listBalanceEventsBrowse,
  parseBrowsePage,
} from "@/lib/data/browse";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Alert, Badge, EmptyState, PageHeader } from "@/app/ui/primitives";
import {
  DataTable,
  Pagination,
  SearchForm,
  Td,
} from "@/app/ui/data-table";
import { reasonLabel } from "@/app/counts/count-filters";
import type { BalanceReason } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function BalanceEventsDataPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Balance events"
          description="Requires SUPABASE_SERVICE_ROLE_KEY."
        />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  const { page, q } = parseBrowsePage(await searchParams);
  let rows;
  let total;
  let safePage = page;
  try {
    const result = await listBalanceEventsBrowse(page, q);
    rows = result.rows;
    total = result.total;
    safePage = result.page;
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Balance events" />
        <Alert tone="danger" title="Could not load balance events">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </main>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Tables"
        title="Balance events"
        description="Audit trail of counts marked complete in the app."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {total.toLocaleString()} events
        </p>
        <SearchForm
          action="/data/balance-events"
          q={q}
          placeholder="Product id"
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState>
          No counts recorded yet. Mark products complete from the count list.
        </EmptyState>
      ) : (
        <>
          <DataTable
            columns={[
              "When",
              "Product",
              "Reason",
              "Counted stock",
              "Notes",
            ]}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-muted/40">
                <Td>{formatDateTime(row.counted_at)}</Td>
                <Td>
                  <span className="font-mono text-[13px]">{row.productcode}</span>
                  <span className="mt-0.5 block max-w-56 truncate text-xs text-muted">
                    {row.product_name}
                  </span>
                </Td>
                <Td>
                  <Badge tone="accent">
                    {reasonLabel(row.trigger_reason as BalanceReason)}
                  </Badge>
                </Td>
                <Td>
                  {row.counted_stock == null
                    ? "—"
                    : formatNumber(row.counted_stock, 0)}
                </Td>
                <Td className="max-w-64 truncate" title={row.notes ?? undefined}>
                  {row.notes ?? "—"}
                </Td>
              </tr>
            ))}
          </DataTable>
          <Pagination
            basePath="/data/balance-events"
            page={safePage}
            pageCount={pageCount}
            q={q}
          />
        </>
      )}
    </main>
  );
}
