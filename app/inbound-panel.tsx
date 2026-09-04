"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/app/ui/primitives";

type BaselineResult = {
  purchaseOrders: number;
  picqerRequestCount: number;
};

type RefreshResult = {
  receiptsSeen: number;
  receiptsApplied: number;
  receiptsSkippedReturn: number;
  cooldownsCleared: number;
  purchaseOrdersUpdated: number;
  purchaseOrdersFlipped: number;
  surplusLines: number;
  picqerRequestCount: number;
};

type InboundResponse =
  | { ok: true; mode: "baseline"; result: BaselineResult }
  | { ok: true; mode: "refresh"; result: RefreshResult }
  | { ok: false; error: string };

export function InboundPanel({
  baselineCompletedAt,
}: {
  baselineCompletedAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasBaseline = Boolean(baselineCompletedAt);

  async function run(mode: "baseline" | "refresh") {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/sync/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = (await response.json()) as InboundResponse;
      if (!body.ok) {
        setError(body.error);
        return;
      }
      if (body.mode === "baseline") {
        setMessage(
          `Stored ${body.result.purchaseOrders.toLocaleString()} purchase order statuses (${body.result.picqerRequestCount} GET requests). No cooldowns or surplus were changed.`,
        );
      } else {
        const r = body.result;
        setMessage(
          `Receipts ${r.receiptsApplied} applied (${r.receiptsSkippedReturn} returns skipped), ${r.cooldownsCleared} cooldowns cleared. ${r.purchaseOrdersFlipped} POs flipped to received, ${r.surplusLines} surplus floors updated (${r.picqerRequestCount} GET requests). Re-run the engine.`,
        );
      }
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-lg font-semibold text-foreground">Inbound sync</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">
        GET purchase orders and completed receipts. Snapshot once so existing
        POs are not treated as new surplus. Refresh clears cooldowns (except TRL
        Fulfilment) and sets surplus floors when a PO goes from purchased to
        received.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {!hasBaseline ? (
          <Button onClick={() => void run("baseline")} disabled={busy}>
            {busy ? "Working…" : "Snapshot purchase orders"}
          </Button>
        ) : (
          <Button onClick={() => void run("refresh")} disabled={busy}>
            {busy ? "Working…" : "Refresh inbound"}
          </Button>
        )}
        <Link
          href="/inbound"
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
        >
          View POs and receipts
        </Link>
      </div>
      {hasBaseline ? (
        <p className="mt-3 text-xs text-muted">
          Snapshot taken. Use refresh after inbound; re-run the engine afterwards.
        </p>
      ) : null}
      {message ? (
        <div className="mt-4">
          <Alert tone="success" title="Inbound sync complete">
            {message}
          </Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <Alert tone="danger" title="Inbound sync failed">
            {error}
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
