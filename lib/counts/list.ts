import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AbcClass, BalanceReason } from "@/lib/supabase/database.types";

export const COUNT_PAGE_SIZE = 50;

export type CountStockView = "main" | "zero" | "all_flagged";

export type CountSort =
  | "urgency"
  | "cover"
  | "free"
  | "velocity"
  | "last_count"
  | "shop"
  | "code";

export type CountListFilters = {
  page: number;
  reason: BalanceReason | "all";
  shopId: number | "all";
  abcClass: AbcClass | "all";
  q: string;
  stock: CountStockView;
  sort: CountSort;
};

export type CountListRow = {
  id: number;
  productcode: string;
  barcode: string | null;
  name: string;
  shop_name: string;
  pick_velocity: number | string;
  current_stock: number | string;
  free_stock: number | string;
  days_of_cover: number | string | null;
  abc_class: string | null;
  balance_reason: BalanceReason | null;
  balance_reason_label: string | null;
  last_balanced_at: string | null;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parseCountFilters(searchParams: {
  [key: string]: string | string[] | undefined;
}): CountListFilters {
  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);
  const reasonRaw = firstParam(searchParams.reason) ?? "all";
  const reason: CountListFilters["reason"] =
    reasonRaw === "time_oos" ||
    reasonRaw === "stock_amount" ||
    reasonRaw === "time_based" ||
    reasonRaw === "inbound_surplus"
      ? reasonRaw
      : "all";
  const shopRaw = firstParam(searchParams.shop);
  const shopParsed = Number(shopRaw);
  const shopId =
    shopRaw && Number.isFinite(shopParsed) ? shopParsed : ("all" as const);
  const classRaw = firstParam(searchParams.class) ?? "all";
  const abcClass: CountListFilters["abcClass"] =
    classRaw === "A" || classRaw === "B" || classRaw === "C" ? classRaw : "all";
  const q = (firstParam(searchParams.q) ?? "").trim();
  const stockRaw = firstParam(searchParams.stock);
  const stock: CountStockView =
    stockRaw === "zero" || stockRaw === "all_flagged" ? stockRaw : "main";
  const sortRaw = firstParam(searchParams.sort) ?? "urgency";
  const sort: CountSort =
    sortRaw === "cover" ||
    sortRaw === "free" ||
    sortRaw === "velocity" ||
    sortRaw === "last_count" ||
    sortRaw === "shop" ||
    sortRaw === "code"
      ? sortRaw
      : "urgency";

  return { page, reason, shopId, abcClass, q, stock, sort };
}

export async function listCountRows(
  filters: CountListFilters,
  options?: { omitCover?: boolean },
) {
  const admin = createAdminSupabaseClient();

  const countQuery = applyListFilters(
    applyStockScope(
      admin.from("products").select("id", { count: "exact", head: true }),
      filters.stock,
    ),
    filters,
  );
  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(`Could not load count list: ${countError.message}`);
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / COUNT_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const from = (page - 1) * COUNT_PAGE_SIZE;
  const to = from + COUNT_PAGE_SIZE - 1;

  if (total === 0) {
    return { rows: [] as CountListRow[], total: 0, page };
  }

  const { data, error } = await applySort(
    applyListFilters(
      applyStockScope(
        admin.from("products").select(
          "id,productcode,barcode,name,pick_velocity,current_stock,free_stock,days_of_cover,abc_class,balance_reason,balance_reason_label,last_balanced_at,shops(name)",
        ),
        filters.stock,
      ),
      filters,
    ),
    options?.omitCover &&
      (filters.sort === "cover" || filters.sort === "urgency")
      ? "code"
      : filters.sort,
  ).range(from, to);

  if (error && /days_of_cover/.test(error.message) && !options?.omitCover) {
    return listCountRows(filters, { omitCover: true });
  }

  if (error) {
    throw new Error(`Could not load count list: ${error.message}`);
  }

  const rows: CountListRow[] = (data ?? []).map((row) => {
    const shop = row.shops as { name: string } | { name: string }[] | null;
    const shop_name = Array.isArray(shop)
      ? (shop[0]?.name ?? "—")
      : (shop?.name ?? "—");
    return {
      id: row.id,
      productcode: row.productcode,
      barcode: row.barcode,
      name: row.name,
      shop_name,
      pick_velocity: row.pick_velocity,
      current_stock: row.current_stock,
      free_stock: row.free_stock,
      days_of_cover: row.days_of_cover,
      abc_class: row.abc_class,
      balance_reason: row.balance_reason,
      balance_reason_label: row.balance_reason_label,
      last_balanced_at: row.last_balanced_at,
    };
  });

  return { rows, total, page };
}

function applyStockScope<
  T extends { eq: Function; gt: Function; lte: Function },
>(query: T, stock: CountStockView): T {
  const next = query.eq("active", true);
  if (stock === "zero") {
    return next.lte("free_stock", 0);
  }
  if (stock === "all_flagged") {
    return next.eq("balance_need", true);
  }
  return next.eq("balance_need", true).gt("free_stock", 0);
}

function applyListFilters<T extends { eq: Function; or: Function }>(
  query: T,
  filters: CountListFilters,
): T {
  let next = query;
  if (filters.reason !== "all") {
    next = next.eq("balance_reason", filters.reason);
  }
  if (filters.shopId !== "all") {
    next = next.eq("shop_id", filters.shopId);
  }
  if (filters.abcClass !== "all") {
    next = next.eq("abc_class", filters.abcClass);
  }
  if (filters.q) {
    const safe = filters.q.replace(/[%_,]/g, " ").slice(0, 80);
    next = next.or(
      `productcode.ilike.%${safe}%,name.ilike.%${safe}%,barcode.ilike.%${safe}%`,
    );
  }
  return next;
}

function applySort<
  T extends { order: Function },
>(query: T, sort: CountSort): T {
  if (sort === "cover") {
    return query
      .order("days_of_cover", { ascending: true, nullsFirst: false })
      .order("abc_class", { ascending: true })
      .order("productcode", { ascending: true });
  }
  if (sort === "free") {
    return query
      .order("free_stock", { ascending: true })
      .order("abc_class", { ascending: true })
      .order("productcode", { ascending: true });
  }
  if (sort === "velocity") {
    return query
      .order("pick_velocity", { ascending: false })
      .order("productcode", { ascending: true });
  }
  if (sort === "last_count") {
    return query
      .order("last_balanced_at", { ascending: true, nullsFirst: true })
      .order("abc_class", { ascending: true })
      .order("productcode", { ascending: true });
  }
  if (sort === "shop") {
    return query
      .order("shop_id", { ascending: true })
      .order("abc_class", { ascending: true })
      .order("productcode", { ascending: true });
  }
  if (sort === "code") {
    return query.order("productcode", { ascending: true });
  }
  return query
    .order("abc_class", { ascending: true })
    .order("days_of_cover", { ascending: true, nullsFirst: false })
    .order("pick_velocity", { ascending: false })
    .order("productcode", { ascending: true });
}

export async function listShopsForFilter() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("shops")
    .select("id,name")
    .eq("active", true)
    .order("name");

  if (error) {
    throw new Error(`Could not load shops: ${error.message}`);
  }

  return data ?? [];
}
