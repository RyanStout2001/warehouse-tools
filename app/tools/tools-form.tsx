"use client";

import { useState } from "react";
import { Alert, Button } from "@/app/ui/primitives";
import type { BulkAction, BulkResult } from "@/lib/ops/bulk";

type ShopOption = { id: number; name: string };

const actions: { value: BulkAction["type"]; label: string; hint: string }[] = [
  {
    value: "set_last_balanced_at",
    label: "Set last counted date",
    hint: "Treat matching products as already counted at the chosen time (or now).",
  },
  {
    value: "clear_last_balanced_at",
    label: "Clear last counted date",
    hint: "Forget last-count history so time-based flags can apply after an engine run.",
  },
  {
    value: "set_cooldown_days",
    label: "Start cooldown",
    hint: "Skip low-stock flags until this many days from now.",
  },
  {
    value: "clear_cooldown",
    label: "Clear cooldown",
    hint: "Allow low-stock flags again on the next engine run.",
  },
  {
    value: "set_temporary_stock_threshold",
    label: "Set inbound surplus threshold",
    hint: "Flag when free stock drops to this piece count.",
  },
  {
    value: "clear_temporary_stock_threshold",
    label: "Clear inbound surplus threshold",
    hint: "Remove the extra inbound check.",
  },
  {
    value: "clear_balance_flags",
    label: "Clear current flags",
    hint: "Unflag matching products until the next engine run.",
  },
  {
    value: "run_engine",
    label: "Run balancing engine",
    hint: "Recompute ABC class and flags. Scope to a shop, or the whole catalog.",
  },
];

export function ToolsForm({ shops }: { shops: ShopOption[] }) {
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<BulkAction["type"]>("set_last_balanced_at");
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>, dryRun: boolean) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const shopId = String(data.get("shopId") ?? "all");
    const abcClass = String(data.get("abcClass") ?? "all");
    const productcode = String(data.get("productcode") ?? "").trim();
    const entireCatalog = data.get("entireCatalog") === "on";

    const payload = {
      dryRun,
      confirmed: !dryRun,
      scope: {
        shopId: shopId === "all" ? null : Number(shopId),
        abcClass: abcClass === "all" ? null : abcClass,
        productcode: productcode || null,
        activeOnly: data.get("activeOnly") === "on",
        entireCatalog,
      },
      action: actionPayload(action, data),
    };

    setBusy(true);
    setError(null);
    if (dryRun) {
      setResult(null);
    }
    try {
      const response = await fetch("/api/ops/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as
        | { ok: true; result: BulkResult }
        | { ok: false; error: string };
      if (!body.ok) {
        setError(body.error);
        return;
      }
      setResult(body.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const selected = actions.find((item) => item.value === action);

  return (
    <form
      onSubmit={(event) => submit(event, false)}
      className="space-y-5"
    >
      <label className="block text-sm">
        <span className="font-medium text-foreground">Action</span>
        <select
          value={action}
          onChange={(event) =>
            setAction(event.target.value as BulkAction["type"])
          }
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        >
          {actions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs text-muted">
          {selected?.hint}
        </span>
      </label>

      {action === "set_last_balanced_at" ? (
        <label className="block text-sm">
          <span className="font-medium text-foreground">Counted at</span>
          <input
            type="datetime-local"
            name="at"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          />
          <span className="mt-1.5 block text-xs text-muted">
            Leave blank to use now.
          </span>
        </label>
      ) : null}

      {action === "set_cooldown_days" ? (
        <label className="block text-sm">
          <span className="font-medium text-foreground">Cooldown days</span>
          <input
            type="number"
            name="days"
            min={1}
            defaultValue={14}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          />
        </label>
      ) : null}

      {action === "set_temporary_stock_threshold" ? (
        <label className="block text-sm">
          <span className="font-medium text-foreground">Free-stock threshold</span>
          <input
            type="number"
            name="value"
            min={0}
            defaultValue={0}
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          />
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-foreground">Shop</span>
          <select
            name="shopId"
            defaultValue="all"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          >
            <option value="all">All shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-foreground">Class</span>
          <select
            name="abcClass"
            defaultValue="all"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          >
            <option value="all">All classes</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-foreground">Product code</span>
          <input
            name="productcode"
            placeholder="Optional exact code"
            className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="activeOnly" defaultChecked />
        Active products only
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="entireCatalog" />
        Allow entire catalog (required if shop, class, and product are all blank)
      </label>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={(event) => {
            const form = (event.currentTarget as HTMLButtonElement).form;
            if (form) {
              void submit(
                { preventDefault() {}, currentTarget: form } as React.FormEvent<HTMLFormElement>,
                true,
              );
            }
          }}
        >
          {busy ? "Working…" : "Preview match count"}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Working…" : "Apply"}
        </Button>
      </div>

      {result ? (
        <Alert
          tone={result.dryRun ? "warning" : "success"}
          title={
            result.dryRun
              ? `${result.matchCount.toLocaleString()} products would be affected`
              : `Updated ${result.updated.toLocaleString()} products`
          }
        >
          {result.engine
            ? `Engine processed ${result.engine.processed.toLocaleString()} and flagged ${result.engine.flagged.toLocaleString()}.`
            : result.dryRun
              ? "Review the count, then click Apply."
              : "Re-run the engine if you changed count dates, cooldowns, or surplus thresholds."}
        </Alert>
      ) : null}
      {error ? <Alert tone="danger" title="Could not run">{error}</Alert> : null}
    </form>
  );
}

function actionPayload(type: BulkAction["type"], data: FormData) {
  if (type === "set_last_balanced_at") {
    const at = String(data.get("at") ?? "").trim();
    return { type, at: at || "now" };
  }
  if (type === "set_cooldown_days") {
    return { type, days: Number(data.get("days")) };
  }
  if (type === "set_temporary_stock_threshold") {
    return { type, value: Number(data.get("value")) };
  }
  return { type };
}
