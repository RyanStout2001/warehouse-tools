import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  getProductLabels,
  getPurchaseOrder,
  parseCachedPoProducts,
} from "@/lib/data/inbound";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  Alert,
  Badge,
  EmptyState,
  PageHeader,
} from "@/app/ui/primitives";
import { DataTable, Td } from "@/app/ui/data-table";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Purchase order" />
        <Alert tone="warning" title="Service role key missing" />
      </main>
    );
  }

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    notFound();
  }

  let row;
  try {
    row = await getPurchaseOrder(id);
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Purchase order" />
        <Alert tone="danger" title="Could not load purchase order">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </main>
    );
  }

  if (!row) {
    notFound();
  }

  const lines = parseCachedPoProducts(row.products);
  const labels = await getProductLabels(lines.map((line) => line.idproduct));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Inbound"
        title={row.purchaseorderid ?? `PO ${row.id}`}
        description="Cached Picqer purchase order. Line totals are from the last inbound snapshot or refresh."
        actions={
          <Link
            href="/inbound"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Back to inbound
          </Link>
        }
      />

      <dl className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Picqer id" value={String(row.id)} />
        <Info
          label="Status"
          value={
            <>
              <Badge
                tone={
                  row.status === "received"
                    ? "success"
                    : row.status === "purchased"
                      ? "accent"
                      : row.status === "cancelled"
                        ? "danger"
                        : "neutral"
                }
              >
                {row.status}
              </Badge>
              {row.is_return_supplier ? " · return supplier" : ""}
            </>
          }
        />
        <Info
          label="Supplier"
          value={
            row.supplier_name
              ? `${row.supplier_name} (${row.idsupplier ?? "—"})`
              : String(row.idsupplier ?? "—")
          }
        />
        <Info label="Supplier order" value={row.supplier_orderid ?? "—"} />
        <Info
          label="Warehouse"
          value={row.idwarehouse == null ? "—" : String(row.idwarehouse)}
        />
        <Info label="Delivery date" value={row.delivery_date ?? "—"} />
        <Info
          label="Created in Picqer"
          value={formatDateTime(row.created_at_picqer)}
        />
        <Info
          label="Updated in Picqer"
          value={formatDateTime(row.updated_at_picqer)}
        />
        <Info label="Last seen" value={formatDateTime(row.last_seen_at)} />
        <Info
          label="Ordered / received"
          value={`${formatNumber(row.amount_ordered, 0)} / ${formatNumber(row.amount_received, 0)}`}
        />
        {row.remarks ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
              Remarks
            </dt>
            <dd className="mt-1 text-sm leading-6 text-foreground">
              {row.remarks}
            </dd>
          </div>
        ) : null}
      </dl>

      <h2 className="mt-8 text-lg font-semibold text-foreground">Lines</h2>
      {lines.length === 0 ? (
        <div className="mt-4">
          <EmptyState>
            No line items cached. Refresh inbound (or snapshot again) after
            applying the inbound browse SQL so product lines are stored.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-4">
          <DataTable
            columns={["Product", "Shop", "Ordered", "Received", "Surplus"]}
          >
            {lines.map((line, index) => {
              const catalog = labels.get(line.idproduct);
              const surplus = Math.max(0, line.amountreceived - line.amount);
              return (
                <tr
                  key={`${line.idproduct}-${index}`}
                  className="hover:bg-surface-muted/40"
                >
                  <Td>
                    <span className="font-mono text-[13px]">
                      {catalog?.productcode ??
                        line.productcode ??
                        line.idproduct}
                    </span>
                    <span className="mt-0.5 block max-w-80 truncate text-xs text-muted">
                      {catalog?.name ?? line.name ?? "—"}
                    </span>
                  </Td>
                  <Td>{catalog?.shop_name ?? "—"}</Td>
                  <Td>{formatNumber(line.amount, 0)}</Td>
                  <Td>{formatNumber(line.amountreceived, 0)}</Td>
                  <Td>
                    {surplus > 0 ? (
                      <Badge tone="warning">{formatNumber(surplus, 0)}</Badge>
                    ) : (
                      "—"
                    )}
                  </Td>
                </tr>
              );
            })}
          </DataTable>
        </div>
      )}
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
