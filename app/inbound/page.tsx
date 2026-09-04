import Link from "next/link";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  INBOUND_PAGE_SIZE,
  getInboundSummary,
  listPurchaseOrdersBrowse,
  listReceiptsBrowse,
  parseInboundFilters,
  type InboundFilters,
  type PurchaseOrderStatus,
} from "@/lib/data/inbound";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import {
  Alert,
  Badge,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/app/ui/primitives";
import { DataTable, Pagination, Td } from "@/app/ui/data-table";

export const dynamic = "force-dynamic";

function statusTone(
  status: PurchaseOrderStatus,
): "neutral" | "accent" | "success" | "danger" {
  if (status === "purchased") {
    return "accent";
  }
  if (status === "received") {
    return "success";
  }
  if (status === "cancelled") {
    return "danger";
  }
  return "neutral";
}

function queryFromFilters(
  filters: InboundFilters,
  overrides: Partial<InboundFilters> = {},
) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.view === "receipts") {
    params.set("view", "receipts");
  }
  if (next.q) {
    params.set("q", next.q);
  }
  if (next.view === "orders" && next.status !== "open") {
    params.set("status", next.status);
  }
  if (next.view === "receipts" && next.receipts !== "all") {
    params.set("receipts", next.receipts);
  }
  return params;
}

export default async function InboundPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Workspace"
          title="Inbound"
          description="Requires SUPABASE_SERVICE_ROLE_KEY."
        />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  const filters = parseInboundFilters(await searchParams);
  const summary = await getInboundSummary();

  let poRows;
  let poTotal = 0;
  let poPage = filters.page;
  let receiptRows;
  let receiptTotal = 0;
  let receiptPage = filters.page;
  let loadError: string | null = summary.error;

  try {
    if (filters.view === "receipts") {
      const result = await listReceiptsBrowse(filters);
      receiptRows = result.rows;
      receiptTotal = result.total;
      receiptPage = result.page;
    } else {
      const result = await listPurchaseOrdersBrowse(filters);
      poRows = result.rows;
      poTotal = result.total;
      poPage = result.page;
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Could not load inbound data";
  }

  const pageCount = Math.max(
    1,
    Math.ceil(
      (filters.view === "receipts" ? receiptTotal : poTotal) / INBOUND_PAGE_SIZE,
    ),
  );
  const extra = Object.fromEntries(queryFromFilters(filters));
  const ordersHref = queryFromFilters({ ...filters, view: "orders", page: 1 });
  const receiptsHref = queryFromFilters({
    ...filters,
    view: "receipts",
    page: 1,
  });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Workspace"
        title="Inbound"
        description="Cached Picqer purchase orders and completed receipts. Snapshot or refresh from Overview, then browse status, suppliers, and line items here."
      />

      {loadError ? (
        <div className="mb-6">
          <Alert tone="danger" title="Could not load inbound tables">
            {loadError} Apply the inbound SQL migrations in the Supabase SQL
            editor if this is the first time using inbound.
          </Alert>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open POs"
          value={formatNumber(summary.concept + summary.purchased, 0)}
          hint={`${formatNumber(summary.concept, 0)} concept · ${formatNumber(summary.purchased, 0)} purchased`}
        />
        <StatCard
          label="Received POs"
          value={formatNumber(summary.received, 0)}
          hint={`${formatNumber(summary.cancelled, 0)} cancelled · ${formatNumber(summary.purchaseOrders, 0)} total`}
        />
        <StatCard
          label="Processed receipts"
          value={formatNumber(summary.receipts, 0)}
          hint={`${formatNumber(summary.receiptsReturn, 0)} skipped as return / TRL`}
        />
        <StatCard
          label="Last inbound sync"
          value={summary.updatedAt ? formatDate(summary.updatedAt) : "—"}
          hint={
            summary.baselineCompletedAt
              ? `Snapshot ${formatDateTime(summary.baselineCompletedAt)}`
              : "Snapshot purchase orders from Overview first"
          }
        />
      </section>

      <div className="mt-8 flex gap-2 border-b border-border">
        <Link
          href={ordersHref.toString() ? `/inbound?${ordersHref}` : "/inbound"}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            filters.view === "orders"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Purchase orders
        </Link>
        <Link
          href={`/inbound?${receiptsHref}`}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            filters.view === "receipts"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Receipts
        </Link>
      </div>

      {filters.view === "orders" ? (
        <>
          <form
            method="get"
            className="mt-4 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-3"
          >
            <label className="text-sm text-muted sm:col-span-2">
              Search
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                placeholder="PO number, supplier, id"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
              />
            </label>
            <label className="text-sm text-muted">
              Status
              <select
                name="status"
                defaultValue={filters.status}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
              >
                <option value="open">Open (concept + purchased)</option>
                <option value="all">All statuses</option>
                <option value="concept">Concept</option>
                <option value="purchased">Purchased</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
                <option value="return">Return supplier (TRL)</option>
              </select>
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Filter
              </button>
            </div>
          </form>
          <p className="mt-4 text-sm text-muted">
            {poTotal.toLocaleString()} purchase orders
          </p>
          {!poRows || poRows.length === 0 ? (
            <div className="mt-4">
              <EmptyState>
                No purchase orders match. Snapshot from Overview to load current
                POs from Picqer.
              </EmptyState>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <DataTable
                  columns={[
                    "PO",
                    "Status",
                    "Supplier",
                    "Delivery",
                    "Lines",
                    "Ordered",
                    "Received",
                    "Updated",
                  ]}
                >
                  {poRows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-muted/40">
                      <Td>
                        <Link
                          href={`/inbound/po/${row.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {row.purchaseorderid ?? row.id}
                        </Link>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted">
                          {row.id}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                        {row.is_return_supplier ? (
                          <span className="ml-2 text-xs text-muted">return</span>
                        ) : null}
                      </Td>
                      <Td>
                        {row.supplier_name ?? "—"}
                        {row.idsupplier != null ? (
                          <span className="mt-0.5 block font-mono text-[11px] text-muted">
                            {row.idsupplier}
                          </span>
                        ) : null}
                      </Td>
                      <Td>{row.delivery_date ?? "—"}</Td>
                      <Td>{formatNumber(row.products_count, 0)}</Td>
                      <Td>{formatNumber(row.amount_ordered, 0)}</Td>
                      <Td>{formatNumber(row.amount_received, 0)}</Td>
                      <Td>{formatDateTime(row.updated_at_picqer)}</Td>
                    </tr>
                  ))}
                </DataTable>
              </div>
              <Pagination
                basePath="/inbound"
                page={poPage}
                pageCount={pageCount}
                extra={extra}
              />
            </>
          )}
        </>
      ) : (
        <>
          <form
            method="get"
            className="mt-4 grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-3"
          >
            <input type="hidden" name="view" value="receipts" />
            <label className="text-sm text-muted sm:col-span-2">
              Search
              <input
                type="search"
                name="q"
                defaultValue={filters.q}
                placeholder="Receipt id, PO, supplier"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
              />
            </label>
            <label className="text-sm text-muted">
              Kind
              <select
                name="receipts"
                defaultValue={filters.receipts}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
              >
                <option value="all">All processed</option>
                <option value="applied">Cooldown applied</option>
                <option value="return">Skipped return / TRL</option>
              </select>
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Filter
              </button>
            </div>
          </form>
          <p className="mt-4 text-sm text-muted">
            {receiptTotal.toLocaleString()} receipts processed after the
            snapshot
          </p>
          {!receiptRows || receiptRows.length === 0 ? (
            <div className="mt-4">
              <EmptyState>
                No processed receipts yet. Receipts appear here after an inbound
                refresh finds completed receipts newer than the snapshot.
              </EmptyState>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <DataTable
                  columns={[
                    "Receipt",
                    "Completed",
                    "PO",
                    "Supplier",
                    "Lines",
                    "Amount",
                    "Cooldown",
                  ]}
                >
                  {receiptRows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-muted/40">
                      <Td>
                        <Link
                          href={`/inbound/receipt/${row.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {row.receiptid ?? row.id}
                        </Link>
                        <span className="mt-0.5 block font-mono text-[11px] text-muted">
                          {row.id}
                        </span>
                      </Td>
                      <Td>{formatDateTime(row.completed_at)}</Td>
                      <Td>
                        {row.idpurchaseorder ? (
                          <Link
                            href={`/inbound/po/${row.idpurchaseorder}`}
                            className="text-accent hover:underline"
                          >
                            {row.purchaseorderid ?? row.idpurchaseorder}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>{row.supplier_name ?? "—"}</Td>
                      <Td>{formatNumber(row.products_count, 0)}</Td>
                      <Td>{formatNumber(row.amount, 0)}</Td>
                      <Td>
                        <Badge
                          tone={row.skipped_return ? "warning" : "success"}
                        >
                          {row.skipped_return ? "Skipped" : "Cleared"}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </DataTable>
              </div>
              <Pagination
                basePath="/inbound"
                page={receiptPage}
                pageCount={pageCount}
                extra={extra}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
