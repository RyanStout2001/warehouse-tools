"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/app/ui/primitives";

type EngineResponse =
  | {
      ok: true;
      result: {
        processed: number;
        flagged: number;
        byClass: { A: number; B: number; C: number };
        byReason: {
          time_oos: number;
          stock_amount: number;
          time_based: number;
          inbound_surplus: number;
        };
      };
    }
  | { ok: false; error: string };

export function EnginePanel() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runEngine() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/engine/run", { method: "POST" });
      const body = (await response.json()) as EngineResponse;

      if (!body.ok) {
        setError(body.error);
        return;
      }

      const { processed, flagged, byClass } = body.result;
      setMessage(
        `Classified ${processed} products (A ${byClass.A} / B ${byClass.B} / C ${byClass.C}). Flagged ${flagged} for counting.`,
      );
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Engine request failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-lg font-semibold text-foreground">Balancing engine</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">
        Classifies products A/B/C and flags items that need a physical count
        using free stock, velocity, and settings overrides.
      </p>
      <Button onClick={runEngine} disabled={busy} className="mt-5 w-full sm:w-auto">
        {busy ? "Running…" : "Run balancing engine"}
      </Button>
      {message ? (
        <div className="mt-4">
          <Alert tone="success" title="Engine finished">
            {message}
          </Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <Alert tone="danger" title="Engine failed">
            {error}
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
