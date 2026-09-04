import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  BROWSE_PAGE_SIZE,
  listShopClassSettingsBrowse,
  parseBrowsePage,
} from "@/lib/data/browse";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Alert, EmptyState, PageHeader } from "@/app/ui/primitives";
import { DataTable, Pagination, SearchForm, Td } from "@/app/ui/data-table";

export const dynamic = "force-dynamic";

export default async function ShopClassSettingsDataPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Shop × class settings" description="Requires SUPABASE_SERVICE_ROLE_KEY." />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  const { page, q } = parseBrowsePage(await searchParams);
  let rows;
  let total;
  let safePage = page;
  try {
    const result = await listShopClassSettingsBrowse(page, q);
    rows = result.rows;
    total = result.total;
    safePage = result.page;
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Shop × class settings" />
        <Alert tone="danger" title="Could not load shop × class settings">
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
        title="Shop × class settings"
        description="Overrides for one shop and one ABC class. Edit them on the Settings page."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">{total.toLocaleString()} overrides</p>
        <SearchForm action="/data/shop-class-settings" q={q} placeholder="Shop id" />
      </div>
      {rows.length === 0 ? (
        <EmptyState>No shop × class overrides yet.</EmptyState>
      ) : (
        <>
          <DataTable
            columns={["Shop", "Class", "Cover days", "C stock", "Max days", "Updated"]}
          >
            {rows.map((row) => (
              <tr
                key={`${row.shop_id}-${row.abc_class}`}
                className="hover:bg-surface-muted/40"
              >
                <Td>
                  {row.shop_name}{" "}
                  <span className="text-xs text-muted">#{row.shop_id}</span>
                </Td>
                <Td>{row.abc_class}</Td>
                <Td>
                  {row.balance_threshold_days == null
                    ? "—"
                    : formatNumber(row.balance_threshold_days, 1)}
                </Td>
                <Td>
                  {row.stock_amount_threshold == null
                    ? "—"
                    : formatNumber(row.stock_amount_threshold, 0)}
                </Td>
                <Td>
                  {row.max_days_without_balance == null
                    ? "—"
                    : formatNumber(row.max_days_without_balance, 0)}
                </Td>
                <Td>{formatDateTime(row.updated_at)}</Td>
              </tr>
            ))}
          </DataTable>
          <Pagination
            basePath="/data/shop-class-settings"
            page={safePage}
            pageCount={pageCount}
            q={q}
          />
        </>
      )}
    </main>
  );
}
