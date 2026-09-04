import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  BROWSE_PAGE_SIZE,
  listProductSettingsBrowse,
  parseBrowsePage,
} from "@/lib/data/browse";
import { formatDateTime, formatNumber } from "@/lib/format";
import { Alert, EmptyState, PageHeader } from "@/app/ui/primitives";
import {
  DataTable,
  Pagination,
  SearchForm,
  Td,
} from "@/app/ui/data-table";

export const dynamic = "force-dynamic";

export default async function ProductSettingsDataPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Product settings"
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
    const result = await listProductSettingsBrowse(page, q);
    rows = result.rows;
    total = result.total;
    safePage = result.page;
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Product settings" />
        <Alert tone="danger" title="Could not load product settings">
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
        title="Product settings"
        description="Highest-priority overrides. Empty cells inherit shop, then global settings."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {total.toLocaleString()} overrides
        </p>
        <SearchForm
          action="/data/product-settings"
          q={q}
          placeholder="Product id"
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState>
          No product overrides yet. Most products inherit shop / global settings.
        </EmptyState>
      ) : (
        <>
          <DataTable
            columns={[
              "Product",
              "A velocity",
              "B velocity",
              "Cover days",
              "C stock",
              "Max days",
              "Updated",
            ]}
          >
            {rows.map((row) => (
              <tr key={row.product_id} className="hover:bg-surface-muted/40">
                <Td>
                  <span className="font-mono text-[13px]">{row.productcode}</span>
                  <span className="mt-0.5 block max-w-56 truncate text-xs text-muted">
                    {row.product_name}
                  </span>
                </Td>
                <Td>{nullableNum(row.class_a_min_velocity)}</Td>
                <Td>{nullableNum(row.class_b_min_velocity)}</Td>
                <Td>{nullableNum(row.balance_threshold_days)}</Td>
                <Td>{nullableNum(row.stock_amount_threshold, 0)}</Td>
                <Td>{nullableNum(row.max_days_without_balance, 0)}</Td>
                <Td>{formatDateTime(row.updated_at)}</Td>
              </tr>
            ))}
          </DataTable>
          <Pagination
            basePath="/data/product-settings"
            page={safePage}
            pageCount={pageCount}
            q={q}
          />
        </>
      )}
    </main>
  );
}

function nullableNum(value: number | null, digits = 1): string {
  if (value == null) {
    return "inherit";
  }
  return formatNumber(value, digits);
}
