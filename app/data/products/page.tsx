import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  BROWSE_PAGE_SIZE,
  listProductsBrowse,
  parseProductBrowseFilters,
} from "@/lib/data/browse";
import { listShopsForFilter } from "@/lib/counts/list";
import { formatBool, formatDate, formatNumber } from "@/lib/format";
import { Alert, Badge, EmptyState, PageHeader } from "@/app/ui/primitives";
import { DataTable, Pagination, Td } from "@/app/ui/data-table";

export const dynamic = "force-dynamic";

export default async function ProductsDataPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Products" description="Requires SUPABASE_SERVICE_ROLE_KEY." />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  const filters = parseProductBrowseFilters(await searchParams);
  let rows;
  let total;
  let safePage = filters.page;
  let shops;
  try {
    const [result, shopRows] = await Promise.all([
      listProductsBrowse(filters),
      listShopsForFilter(),
    ]);
    rows = result.rows;
    total = result.total;
    safePage = result.page;
    shops = shopRows;
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Products" />
        <Alert tone="danger" title="Could not load products">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </main>
    );
  }

  const pageCount = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
  const extra = {
    q: filters.q || undefined,
    shop: filters.shopId === "all" ? undefined : String(filters.shopId),
    class: filters.abcClass === "all" ? undefined : filters.abcClass,
    flagged: filters.flagged === "all" ? undefined : filters.flagged,
    sort: filters.sort === "code" ? undefined : filters.sort,
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Tables"
        title="Products"
        description="Full catalog with stock, velocity, ABC class, and balance flags."
      />
      <form
        method="get"
        className="mb-4 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <label className="text-sm text-muted lg:col-span-2">
          Search
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Code, name, barcode"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          />
        </label>
        <label className="text-sm text-muted">
          Shop
          <select
            name="shop"
            defaultValue={filters.shopId === "all" ? "all" : String(filters.shopId)}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          >
            <option value="all">All shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted">
          Class
          <select
            name="class"
            defaultValue={filters.abcClass}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          >
            <option value="all">All</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        <label className="text-sm text-muted">
          Flagged
          <select
            name="flagged"
            defaultValue={filters.flagged}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          >
            <option value="all">All</option>
            <option value="yes">Flagged</option>
            <option value="no">Not flagged</option>
          </select>
        </label>
        <label className="text-sm text-muted">
          Sort
          <select
            name="sort"
            defaultValue={filters.sort}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          >
            <option value="code">Product code</option>
            <option value="urgency">Urgency</option>
            <option value="cover">Days of cover</option>
            <option value="velocity">Velocity</option>
            <option value="last_count">Last count</option>
          </select>
        </label>
        <div className="flex items-end lg:col-span-6">
          <button
            type="submit"
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Apply
          </button>
        </div>
      </form>
      <p className="mb-4 text-sm text-muted">
        {total.toLocaleString()} products
      </p>
      {rows.length === 0 ? (
        <EmptyState>No products match these filters.</EmptyState>
      ) : (
        <>
          <DataTable
            columns={[
              "Code",
              "Name",
              "Shop",
              "Class",
              "On hand",
              "Free",
              "Cover",
              "Velocity",
              "Flagged",
              "Active",
              "Last count",
            ]}
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-muted/40">
                <Td mono>{row.productcode}</Td>
                <Td className="max-w-48 truncate" title={row.name}>
                  {row.name}
                </Td>
                <Td>{row.shop_name}</Td>
                <Td>
                  {row.abc_class ? (
                    <Badge
                      tone={
                        row.abc_class === "A"
                          ? "danger"
                          : row.abc_class === "B"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {row.abc_class}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>{formatNumber(row.current_stock, 0)}</Td>
                <Td>{formatNumber(row.free_stock, 0)}</Td>
                <Td>
                  {row.days_of_cover == null
                    ? "—"
                    : formatNumber(row.days_of_cover, 1)}
                </Td>
                <Td>{formatNumber(row.pick_velocity, 2)}</Td>
                <Td>
                  <Badge tone={row.balance_need ? "accent" : "neutral"}>
                    {formatBool(row.balance_need)}
                  </Badge>
                </Td>
                <Td>{formatBool(row.active)}</Td>
                <Td>{formatDate(row.last_balanced_at)}</Td>
              </tr>
            ))}
          </DataTable>
          <Pagination
            basePath="/data/products"
            page={safePage}
            pageCount={pageCount}
            extra={extra}
          />
        </>
      )}
    </main>
  );
}
