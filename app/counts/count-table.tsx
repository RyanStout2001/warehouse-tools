"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CountListRow } from "@/lib/counts/list";
import { reasonLabel } from "@/app/counts/count-filters";
import { formatDate, formatNumber } from "@/lib/format";
import { Alert, Badge, Button } from "@/app/ui/primitives";

export function CountTable({
  rows,
  allowComplete,
}: {
  rows: CountListRow[];
  allowComplete: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelected(checked ? new Set(rows.map((row) => row.id)) : new Set());
  }

  async function markCounted() {
    if (selected.size === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/counts/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [...selected] }),
      });
      const body = (await response.json()) as
        | { ok: true; result: { completed: number; skipped: number } }
        | { ok: false; error: string };
      if (!body.ok) {
        setError(body.error);
        return;
      }
      setSelected(new Set());
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const allSelected =
    rows.length > 0 && rows.every((row) => selected.has(row.id));

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {selected.size} selected on this page
        </p>
        <Button
          onClick={markCounted}
          disabled={busy || selected.size === 0 || !allowComplete}
        >
          {busy ? "Saving…" : "Mark selected as counted"}
        </Button>
      </div>
      {error ? (
        <div className="mb-3">
          <Alert tone="danger" title={error} />
        </div>
      ) : null}
      {!allowComplete ? (
        <div className="mb-3">
          <Alert
            tone="warning"
            title="Completion disabled on zero-free-stock view"
          >
            Switch back to the main list to mark counts complete.
          </Alert>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted/60 text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => togglePage(event.target.checked)}
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-3 py-3 font-semibold">Code</th>
              <th className="px-3 py-3 font-semibold">Barcode</th>
              <th className="px-3 py-3 font-semibold">Product</th>
              <th className="px-3 py-3 font-semibold">Shop</th>
              <th className="px-3 py-3 font-semibold">Class</th>
              <th className="px-3 py-3 font-semibold">On hand</th>
              <th className="px-3 py-3 font-semibold">Free</th>
              <th className="px-3 py-3 font-semibold">Velocity</th>
              <th className="px-3 py-3 font-semibold">Cover (d)</th>
              <th className="px-3 py-3 font-semibold">Reason</th>
              <th className="px-3 py-3 font-semibold">Last count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-muted/40">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={(event) => toggle(row.id, event.target.checked)}
                    aria-label={`Select ${row.productcode}`}
                  />
                </td>
                <td className="px-3 py-2.5 font-mono text-[13px]">
                  {row.productcode}
                </td>
                <td className="px-3 py-2.5 font-mono text-[13px]">
                  {row.barcode ?? "—"}
                </td>
                <td className="max-w-56 truncate px-3 py-2.5" title={row.name}>
                  {row.name}
                </td>
                <td className="px-3 py-2.5">{row.shop_name}</td>
                <td className="px-3 py-2.5">
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
                </td>
                <td className="px-3 py-2.5">
                  {formatNumber(row.current_stock, 0)}
                </td>
                <td className="px-3 py-2.5">
                  {formatNumber(row.free_stock, 0)}
                </td>
                <td className="px-3 py-2.5">
                  {formatNumber(row.pick_velocity, 2)}
                </td>
                <td className="px-3 py-2.5">
                  {row.days_of_cover == null
                    ? "—"
                    : formatNumber(row.days_of_cover, 1)}
                </td>
                <td className="px-3 py-2.5">
                  <span className="block">
                    {reasonLabel(row.balance_reason)}
                  </span>
                  <span className="block text-xs text-muted">
                    {row.balance_reason_label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {formatDate(row.last_balanced_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
