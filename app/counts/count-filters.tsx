import type { CountListFilters } from "@/lib/counts/list";
import type { BalanceReason } from "@/lib/supabase/database.types";

export function CountFilters({
  filters,
  shops,
}: {
  filters: CountListFilters;
  shops: { id: number; name: string }[];
}) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <label className="text-sm text-muted">
        Search
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Code, name, barcode"
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        />
      </label>
      <label className="text-sm text-muted">
        Reason
        <select
          name="reason"
          defaultValue={filters.reason}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        >
          <option value="all">All reasons</option>
          <option value="time_oos">Out of stock threat</option>
          <option value="stock_amount">Low stock amount</option>
          <option value="time_based">Too long since last count</option>
          <option value="inbound_surplus">Inbound surplus</option>
        </select>
      </label>
      <label className="text-sm text-muted">
        Free stock
        <select
          name="stock"
          defaultValue={filters.stock}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        >
          <option value="main">Free &gt; 0 (main list)</option>
          <option value="zero">Free 0 or less</option>
          <option value="all_flagged">All flagged (incl. leftover 0-free)</option>
        </select>
      </label>
      <label className="text-sm text-muted">
        Shop
        <select
          name="shop"
          defaultValue={filters.shopId === "all" ? "all" : String(filters.shopId)}
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
      <label className="text-sm text-muted">
        Class
        <select
          name="class"
          defaultValue={filters.abcClass}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        >
          <option value="all">All classes</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
      </label>
      <label className="text-sm text-muted">
        Sort
        <select
          name="sort"
          defaultValue={filters.sort}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-accent"
        >
          <option value="urgency">Urgency (class, then cover)</option>
          <option value="cover">Least days of cover</option>
          <option value="free">Lowest free stock</option>
          <option value="velocity">Highest velocity</option>
          <option value="last_count">Oldest / never counted</option>
          <option value="shop">Shop, then class</option>
          <option value="code">Product code</option>
        </select>
      </label>
      <div className="flex items-end sm:col-span-2 lg:col-span-2">
        <button
          type="submit"
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}

export function reasonLabel(reason: BalanceReason | null): string {
  switch (reason) {
    case "time_oos":
      return "Out of stock threat";
    case "stock_amount":
      return "Low stock amount";
    case "time_based":
      return "Time-based";
    case "inbound_surplus":
      return "Inbound surplus";
    default:
      return "—";
  }
}
