"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/app/ui/primitives";
import { emptyToNull } from "@/app/settings/class-settings-form";

export function ProductSettingsForm() {
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
      productcode: String(form.get("productcode") ?? "").trim(),
      class_a_min_velocity: emptyToNull(form.get("class_a_min_velocity")),
      class_b_min_velocity: emptyToNull(form.get("class_b_min_velocity")),
      balance_threshold_days: emptyToNull(form.get("balance_threshold_days")),
      stock_amount_threshold: emptyToNull(form.get("stock_amount_threshold")),
      max_days_without_balance: emptyToNull(form.get("max_days_without_balance")),
    };
    try {
      const response = await fetch("/api/settings/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as
        | { ok: true; product: { productcode: string; name: string } }
        | { ok: false; error: string };
      if (!body.ok) {
        setError(body.error);
        return;
      }
      setMessage(
        `Saved override for ${body.product.productcode} (${body.product.name}). Re-run the engine.`,
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-foreground">Product code</span>
        <input
          name="productcode"
          required
          placeholder="Exact Picqer productcode"
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField name="class_a_min_velocity" label="Class A min velocity" />
        <NumberField name="class_b_min_velocity" label="Class B min velocity" />
        <NumberField name="balance_threshold_days" label="Cover threshold (days)" />
        <NumberField name="stock_amount_threshold" label="Class C stock threshold" />
        <NumberField name="max_days_without_balance" label="Max days without count" />
      </div>
      <p className="text-xs text-muted">
        Product overrides beat every other layer. Saving with all fields blank
        removes the override.
      </p>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save product override"}
      </Button>
      {message ? <Alert tone="success" title={message} /> : null}
      {error ? <Alert tone="danger" title="Could not save">{error}</Alert> : null}
    </form>
  );
}

function NumberField({ name, label }: { name: string; label: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        name={name}
        type="number"
        step="0.1"
        className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
      />
    </label>
  );
}
