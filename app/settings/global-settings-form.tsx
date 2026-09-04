"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/app/ui/primitives";
import type { Database } from "@/lib/supabase/database.types";

type GlobalSettings = Database["public"]["Tables"]["global_settings"]["Row"];

const fields = [
  {
    key: "class_a_min_velocity",
    label: "Class A min velocity",
    hint: "Picks/day at or above this → class A.",
    step: "0.1",
  },
  {
    key: "class_b_min_velocity",
    label: "Class B min velocity",
    hint: "Picks/day at or above this → class B (else C).",
    step: "0.1",
  },
  {
    key: "balance_threshold_days",
    label: "Cover threshold (days)",
    hint: "Flag A/B when free-stock days of cover fall below this.",
    step: "0.1",
  },
  {
    key: "stock_amount_threshold",
    label: "Class C stock threshold",
    hint: "Flag class C when free stock is below this absolute amount.",
    step: "1",
  },
  {
    key: "max_days_without_balance",
    label: "Max days without count",
    hint: "Time-based flag after this many days since last balance.",
    step: "1",
  },
] as const;

export function GlobalSettingsForm({
  settings,
}: {
  settings: GlobalSettings;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      class_a_min_velocity: Number(form.get("class_a_min_velocity")),
      class_b_min_velocity: Number(form.get("class_b_min_velocity")),
      balance_threshold_days: Number(form.get("balance_threshold_days")),
      stock_amount_threshold: Number(form.get("stock_amount_threshold")),
      max_days_without_balance: Number(form.get("max_days_without_balance")),
      return_supplier_id: form.get("return_supplier_id")
        ? Number(form.get("return_supplier_id"))
        : null,
    };

    try {
      const response = await fetch("/api/settings/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (!body.ok) {
        setError(body.error);
        return;
      }
      setMessage("Global settings saved. Re-run the engine to apply them.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="block text-sm">
            <span className="font-medium text-foreground">{field.label}</span>
            <input
              name={field.key}
              type="number"
              required
              step={field.step}
              defaultValue={Number(settings[field.key])}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
            />
            <span className="mt-1.5 block text-xs leading-5 text-muted">
              {field.hint}
            </span>
          </label>
        ))}
      </div>
      <label className="block text-sm">
        <span className="font-medium text-foreground">Return supplier id</span>
        <input
          name="return_supplier_id"
          type="number"
          step="1"
          defaultValue={settings.return_supplier_id ?? 96976}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        />
        <span className="mt-1.5 block text-xs leading-5 text-muted">
          Completed receipts for this Picqer supplier (TRL Fulfilment) do not
          clear cooldowns.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save global settings"}
        </Button>
        <p className="text-xs text-muted">
          Velocity: product → shop → global. Flags: product → shop × class → shop
          → class → global.
        </p>
      </div>
      {message ? <Alert tone="success" title={message} /> : null}
      {error ? <Alert tone="danger" title="Could not save">{error}</Alert> : null}
    </form>
  );
}
