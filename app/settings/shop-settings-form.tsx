"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/app/ui/primitives";
import { emptyToNull, nullableNumber } from "@/app/settings/class-settings-form";

type ShopOption = { id: number; name: string };
type ShopSettingsRow = {
  shop_id: number;
  shop_name: string;
  class_a_min_velocity: number | string | null;
  class_b_min_velocity: number | string | null;
  balance_threshold_days: number | string | null;
  stock_amount_threshold: number | string | null;
  max_days_without_balance: number | string | null;
};

export function ShopSettingsForm({
  shops,
  rows,
}: {
  shops: ShopOption[];
  rows: ShopSettingsRow[];
}) {
  const router = useRouter();
  const [shopId, setShopId] = useState(shops[0] ? String(shops[0].id) : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = rows.find((row) => String(row.shop_id) === shopId);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      shop_id: Number(form.get("shop_id")),
      class_a_min_velocity: emptyToNull(form.get("class_a_min_velocity")),
      class_b_min_velocity: emptyToNull(form.get("class_b_min_velocity")),
      balance_threshold_days: emptyToNull(form.get("balance_threshold_days")),
      stock_amount_threshold: emptyToNull(form.get("stock_amount_threshold")),
      max_days_without_balance: emptyToNull(form.get("max_days_without_balance")),
    };
    try {
      const response = await fetch("/api/settings/shop", {
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
      setMessage(
        "Shop settings saved. Empty fields inherit class / global defaults. Re-run the engine.",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (shops.length === 0) {
    return <p className="text-sm text-muted">Sync shops from Picqer first.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-foreground">Shop</span>
        <select
          name="shop_id"
          value={shopId}
          onChange={(event) => setShopId(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        >
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          name="class_a_min_velocity"
          label="Class A min velocity"
          defaultValue={nullableNumber(selected?.class_a_min_velocity)}
        />
        <NumberField
          name="class_b_min_velocity"
          label="Class B min velocity"
          defaultValue={nullableNumber(selected?.class_b_min_velocity)}
        />
        <NumberField
          name="balance_threshold_days"
          label="Cover threshold (days)"
          defaultValue={nullableNumber(selected?.balance_threshold_days)}
        />
        <NumberField
          name="stock_amount_threshold"
          label="Class C stock threshold"
          defaultValue={nullableNumber(selected?.stock_amount_threshold)}
        />
        <NumberField
          name="max_days_without_balance"
          label="Max days without count"
          defaultValue={nullableNumber(selected?.max_days_without_balance)}
        />
      </div>
      <p className="text-xs text-muted">
        Leave a field blank to inherit. Saving with every field blank removes the
        shop override.
      </p>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save shop settings"}
      </Button>
      {message ? <Alert tone="success" title={message} /> : null}
      {error ? <Alert tone="danger" title="Could not save">{error}</Alert> : null}
    </form>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number | string;
}) {
  return (
    <label key={`${name}-${defaultValue}`} className="block text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <input
        name={name}
        type="number"
        step="0.1"
        defaultValue={defaultValue}
        className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
      />
    </label>
  );
}
