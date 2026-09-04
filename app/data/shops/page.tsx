import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  BROWSE_PAGE_SIZE,
  listShopsBrowse,
  parseBrowsePage,
} from "@/lib/data/browse";
import { formatBool, formatDateTime } from "@/lib/format";
import { Alert, EmptyState, PageHeader } from "@/app/ui/primitives";
import {
  DataTable,
  Pagination,
  SearchForm,
  Td,
} from "@/app/ui/data-table";
import { Badge } from "@/app/ui/primitives";

export const dynamic = "force-dynamic";

export default async function ShopsDataPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Shops" description="Requires SUPABASE_SERVICE_ROLE_KEY." />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  const { page, q } = parseBrowsePage(await searchParams);
  let rows;
  let total;
  let safePage = page;
  try {
    const result = await listShopsBrowse(page, q);
    rows = result.rows;
    total = result.total;
    safePage = result.page;
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Shops" />
        <Alert tone="danger" title="Could not load shops">
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
        title="Shops"
        description="Picqer fulfilment customers cached in Supabase."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {total.toLocaleString()} shops
        </p>
        <SearchForm action="/data/shops" q={q} placeholder="Name or id" />
      </div>
      {rows.length === 0 ? (
        <EmptyState>No shops yet. Run a Picqer sync from Overview.</EmptyState>
      ) : (
        <>
          <DataTable columns={["ID", "Name", "Active", "Last synced", "Updated"]}>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-muted/40">
                <Td mono>{row.id}</Td>
                <Td>{row.name}</Td>
                <Td>
                  <Badge tone={row.active ? "success" : "neutral"}>
                    {formatBool(row.active)}
                  </Badge>
                </Td>
                <Td>{formatDateTime(row.last_synced_at)}</Td>
                <Td>{formatDateTime(row.updated_at)}</Td>
              </tr>
            ))}
          </DataTable>
          <Pagination
            basePath="/data/shops"
            page={safePage}
            pageCount={pageCount}
            q={q}
          />
        </>
      )}
    </main>
  );
}
