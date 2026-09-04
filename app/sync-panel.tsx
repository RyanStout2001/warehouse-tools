"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/app/ui/primitives";

type SyncResponse =
  | {
      ok: true;
      result: {
        shopsUpserted: number;
        productsUpserted: number;
        productsSkippedWithoutShop: number;
        picqerRequestCount: number;
        rateLimitRemaining: number | null;
      };
    }
  | { ok: false; error: string };

export function SyncPanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSync() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/sync/picqer", { method: "POST" });
      const body = (await response.json()) as SyncResponse;

      if (!body.ok) {
        setError(body.error);
        return;
      }

      setMessage(
        `Synced ${body.result.shopsUpserted} shops and ${body.result.productsUpserted} products (${body.result.picqerRequestCount} Picqer GET requests).`,
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sync request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-lg font-semibold text-foreground">Picqer sync</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">
        Read-only GET sync of fulfilment customers and products into Supabase.
        Stock and pick velocity come from the product list.
      </p>
      <Button onClick={runSync} disabled={busy} className="mt-5 w-full sm:w-auto">
        {busy ? "Syncing…" : "Sync from Picqer"}
      </Button>
      {message ? (
        <div className="mt-4">
          <Alert tone="success" title="Sync complete">
            {message}
          </Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <Alert tone="danger" title="Sync failed">
            {error}
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
