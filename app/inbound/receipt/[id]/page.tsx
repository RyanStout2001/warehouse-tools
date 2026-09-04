import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import {
  getProcessedReceipt,
  getProductLabels,
  parseCachedReceiptProducts,
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

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasSupabaseServiceRoleEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Receipt" />
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
    row = await getProcessedReceipt(id);
  } catch (error) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Receipt" />
        <Alert tone="danger" title="Could not load receipt">
          {error instanceof Error ? error.message : "Unknown error"}
        </Alert>
      </main>
    );
  }

  if (!row) {
    notFound();
  }

  const lines = parseCachedReceiptProducts(row.products);
  const labels = await getProductLabels(lines.map((line) => line.idproduct));

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Inbound"
        title={row.receiptid ?? `Receipt ${row.id}`}
        description="Completed Picqer receipt processed by inbound refresh. Only receipts after the snapshot are stored."
        actions={
          <Link
            href="/inbound?view=receipts"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Back to receipts
          </Link>
        }
      />

      <dl className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Picqer id" value={String(row.id)} />
        <Info label="Status" value={row.status ?? "—"} />
        <Info
          label="Cooldown"
          value={
            <Badge tone={row.skipped_return ? "warning" : "success"}>
              {row.skipped_return ? "Skipped (return / no lines)" : "Cleared"}
            </Badge>
          }
        />
        <Info
          label="Purchase order"
          value={
            row.idpurchaseorder ? (
              <Link
                href={`/inbound/po/${row.idpurchaseorder}`}
                className="text-accent hover:underline"
              >
                {row.purchaseorderid ?? row.idpurchaseorder}
              </Link>
            ) : (
              "—"
            )
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
        <Info label="Completed" value={formatDateTime(row.completed_at)} />
        <Info label="Processed" value={formatDateTime(row.processed_at)} />
        <Info label="Lines" value={formatNumber(row.products_count, 0)} />
        <Info label="Amount" value={formatNumber(row.amount, 0)} />
      </dl>

      <h2 className="mt-8 text-lg font-semibold text-foreground">Lines</h2>
      {lines.length === 0 ? (
        <div className="mt-4">
          <EmptyState>
            No line items cached on this receipt. New receipts after the browse
            SQL migration store product lines.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-4">
          <DataTable
            columns={["Product", "Shop", "Amount", "PO line", "Reverted"]}
          >
            {lines.map((line, index) => {
              const catalog = labels.get(line.idproduct);
              return (
                <tr
                  key={`${line.idproduct}-${index}`}
                  className="hover:bg-surface-muted/40"
                >
                  <Td>
                    <span className="font-mono text-[13px]">
                      {catalog?.productcode ?? line.productcode ?? line.idproduct}
                    </span>
                    <span className="mt-0.5 block max-w-80 truncate text-xs text-muted">
                      {catalog?.name ?? line.name ?? "—"}
                    </span>
                  </Td>
                  <Td>{catalog?.shop_name ?? "—"}</Td>
                  <Td>{formatNumber(line.amount, 0)}</Td>
                  <Td>
                    {line.idpurchaseorder ? (
                      <Link
                        href={`/inbound/po/${line.idpurchaseorder}`}
                        className="text-accent hover:underline"
                      >
                        {line.idpurchaseorder}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{line.reverted_at ? formatDateTime(line.reverted_at) : "—"}</Td>
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
