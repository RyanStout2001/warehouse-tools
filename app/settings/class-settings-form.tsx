"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button } from "@/app/ui/primitives";
import type { AbcClass, Database } from "@/lib/supabase/database.types";

type ClassSettings = Database["public"]["Tables"]["class_settings"]["Row"];

const flagFields = [
  {
    key: "balance_threshold_days",
    label: "Cover threshold (days)",
    hint: "Used for A/B time-to-OOS. Leave empty to inherit global.",
    step: "0.1",
  },
  {
    key: "stock_amount_threshold",
    label: "Stock amount threshold",
    hint: "Used for class C. Leave empty to inherit global.",
    step: "1",
  },
  {
    key: "max_days_without_balance",
    label: "Max days without count",
    hint: "Leave empty to inherit global.",
    step: "1",
  },
] as const;

export function ClassSettingsForm({ rows }: { rows: ClassSettings[] }) {
  return (
    <div className="space-y-6">
      {(["A", "B", "C"] as AbcClass[]).map((abcClass) => {
        const row = rows.find((item) => item.abc_class === abcClass);
        return (
          <ClassRowForm key={abcClass} abcClass={abcClass} row={row} />
        );
      })}
    </div>
  );
}

function ClassRowForm({
  abcClass,
  row,
}: {
  abcClass: AbcClass;
  row: ClassSettings | undefined;
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
      abc_class: abcClass,
      balance_threshold_days: emptyToNull(form.get("balance_threshold_days")),
      stock_amount_threshold: emptyToNull(form.get("stock_amount_threshold")),
      max_days_without_balance: emptyToNull(form.get("max_days_without_balance")),
    };
    try {
      const response = await fetch("/api/settings/class", {
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
      setMessage(`Class ${abcClass} saved. Re-run the engine to apply.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground">Class {abcClass}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {flagFields.map((field) => (
          <label key={field.key} className="block text-sm">
            <span className="font-medium text-foreground">{field.label}</span>
            <input
              name={field.key}
              type="number"
              step={field.step}
              defaultValue={nullableNumber(row?.[field.key])}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
            />
            <span className="mt-1.5 block text-xs leading-5 text-muted">
              {field.hint}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : `Save class ${abcClass}`}
        </Button>
      </div>
      {message ? <div className="mt-3"><Alert tone="success" title={message} /></div> : null}
      {error ? (
        <div className="mt-3">
          <Alert tone="danger" title="Could not save">{error}</Alert>
        </div>
      ) : null}
    </form>
  );
}

export function emptyToNull(value: FormDataEntryValue | null) {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  return text === "" ? null : Number(text);
}

export function nullableNumber(value: number | string | null | undefined) {
  if (value == null || value === "") {
    return "";
  }
  return Number(value);
}
