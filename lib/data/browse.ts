import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const BROWSE_PAGE_SIZE = 40;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function parseBrowsePage(searchParams: {
  [key: string]: string | string[] | undefined;
}): { page: number; q: string } {
  const page = Math.max(1, Number(firstParam(searchParams.page)) || 1);
  const q = (firstParam(searchParams.q) ?? "").trim();
  return { page, q };
}

export type ShopBrowseRow = Database["public"]["Tables"]["shops"]["Row"];
export type ProductBrowseRow = Database["public"]["Tables"]["products"]["Row"] & {
  shop_name: string;
};
export type ShopSettingsBrowseRow =
  Database["public"]["Tables"]["shop_settings"]["Row"] & {
    shop_name: string;
  };
export type ProductSettingsBrowseRow =
  Database["public"]["Tables"]["product_settings"]["Row"] & {
    productcode: string;
    product_name: string;
  };
export type BalanceEventBrowseRow =
  Database["public"]["Tables"]["balance_events"]["Row"] & {
    productcode: string;
    product_name: string;
  };

export async function listShopsBrowse(page: number, q: string) {
  const admin = createAdminSupabaseClient();
  let countQuery = admin.from("shops").select("*", { count: "exact", head: true });
  let dataQuery = admin
    .from("shops")
    .select("*")
    .order("name", { ascending: true });

  if (q) {
    const safe = sanitizeSearch(q);
    countQuery = countQuery.or(`name.ilike.%${safe}%,id.eq.${Number(q) || -1}`);
    dataQuery = dataQuery.or(`name.ilike.%${safe}%,id.eq.${Number(q) || -1}`);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const { page: safePage, from, to } = pageRange(page, total);
  if (total === 0) {
    return { rows: [] as ShopBrowseRow[], total, page: safePage };
  }

  const { data, error } = await dataQuery.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  return { rows: (data ?? []) as ShopBrowseRow[], total, page: safePage };
}

export type ProductBrowseFilters = {
  page: number;
  q: string;
  shopId: number | "all";
  abcClass: "A" | "B" | "C" | "all";
  flagged: "all" | "yes" | "no";
  sort: "code" | "urgency" | "cover" | "velocity" | "last_count";
};

export function parseProductBrowseFilters(searchParams: {
  [key: string]: string | string[] | undefined;
}): ProductBrowseFilters {
  const { page, q } = parseBrowsePage(searchParams);
  const shopRaw = firstParam(searchParams.shop);
  const shopParsed = Number(shopRaw);
  const shopId =
    shopRaw && Number.isFinite(shopParsed) ? shopParsed : ("all" as const);
  const classRaw = firstParam(searchParams.class) ?? "all";
  const abcClass =
    classRaw === "A" || classRaw === "B" || classRaw === "C" ? classRaw : "all";
  const flaggedRaw = firstParam(searchParams.flagged) ?? "all";
  const flagged =
    flaggedRaw === "yes" || flaggedRaw === "no" ? flaggedRaw : "all";
  const sortRaw = firstParam(searchParams.sort) ?? "code";
  const sort =
    sortRaw === "urgency" ||
    sortRaw === "cover" ||
    sortRaw === "velocity" ||
    sortRaw === "last_count"
      ? sortRaw
      : "code";
  return { page, q, shopId, abcClass, flagged, sort };
}

export async function listProductsBrowse(
  filters: ProductBrowseFilters,
  options?: { omitCover?: boolean },
) {
  const admin = createAdminSupabaseClient();
  const productColumnsWithCover =
    "id,shop_id,productcode,barcode,name,product_type,active,pick_velocity,current_stock,free_stock,idwarehouse,abc_class,balance_need,balance_reason,balance_reason_label,last_balanced_at,balance_cooldown_until,temporary_stock_threshold,days_of_cover,picqer_updated_at,last_synced_at,created_at,updated_at,shops(name)";

  let countQuery = admin.from("products").select("*", { count: "exact", head: true });
  let dataQuery = admin
    .from("products")
    .select(productColumnsWithCover);

  if (filters.shopId !== "all") {
    countQuery = countQuery.eq("shop_id", filters.shopId);
    dataQuery = dataQuery.eq("shop_id", filters.shopId);
  }
  if (filters.abcClass !== "all") {
    countQuery = countQuery.eq("abc_class", filters.abcClass);
    dataQuery = dataQuery.eq("abc_class", filters.abcClass);
  }
  if (filters.flagged === "yes") {
    countQuery = countQuery.eq("balance_need", true);
    dataQuery = dataQuery.eq("balance_need", true);
  }
  if (filters.flagged === "no") {
    countQuery = countQuery.eq("balance_need", false);
    dataQuery = dataQuery.eq("balance_need", false);
  }

  const sort = options?.omitCover &&
    (filters.sort === "urgency" || filters.sort === "cover")
    ? "code"
    : filters.sort;

  if (sort === "urgency") {
    dataQuery = dataQuery
      .order("abc_class", { ascending: true })
      .order("days_of_cover", { ascending: true, nullsFirst: false })
      .order("productcode", { ascending: true });
  } else if (sort === "cover") {
    dataQuery = dataQuery
      .order("days_of_cover", { ascending: true, nullsFirst: false })
      .order("productcode", { ascending: true });
  } else if (sort === "velocity") {
    dataQuery = dataQuery
      .order("pick_velocity", { ascending: false })
      .order("productcode", { ascending: true });
  } else if (sort === "last_count") {
    dataQuery = dataQuery
      .order("last_balanced_at", { ascending: true, nullsFirst: true })
      .order("productcode", { ascending: true });
  } else {
    dataQuery = dataQuery.order("productcode", { ascending: true });
  }

  if (filters.q) {
    const safe = sanitizeSearch(filters.q);
    const filter = `productcode.ilike.%${safe}%,name.ilike.%${safe}%,barcode.ilike.%${safe}%`;
    countQuery = countQuery.or(filter);
    dataQuery = dataQuery.or(filter);
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const { page: safePage, from, to } = pageRange(filters.page, total);
  if (total === 0) {
    return { rows: [] as ProductBrowseRow[], total, page: safePage };
  }

  const { data, error } = await dataQuery.range(from, to);
  if (error && /days_of_cover/.test(error.message) && !options?.omitCover) {
    return listProductsBrowse(filters, { omitCover: true });
  }
  if (error) {
    throw new Error(error.message);
  }

  const rows: ProductBrowseRow[] = (data ?? []).map((row) => {
    const shop = row.shops as { name: string } | { name: string }[] | null;
    const shop_name = Array.isArray(shop)
      ? (shop[0]?.name ?? "—")
      : (shop?.name ?? "—");
    const { shops: _shops, ...rest } = row;
    return { ...rest, shop_name };
  });

  return { rows, total, page: safePage };
}

export async function listShopSettingsBrowse(page: number, q: string) {
  const admin = createAdminSupabaseClient();
  let countQuery = admin
    .from("shop_settings")
    .select("*", { count: "exact", head: true });
  let dataQuery = admin
    .from("shop_settings")
    .select(
      "shop_id,class_a_min_velocity,class_b_min_velocity,balance_threshold_days,stock_amount_threshold,max_days_without_balance,created_at,updated_at,shops(name)",
    )
    .order("shop_id", { ascending: true });

  if (q) {
    const id = Number(q);
    if (Number.isFinite(id)) {
      countQuery = countQuery.eq("shop_id", id);
      dataQuery = dataQuery.eq("shop_id", id);
    }
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const { page: safePage, from, to } = pageRange(page, total);
  if (total === 0) {
    return { rows: [] as ShopSettingsBrowseRow[], total, page: safePage };
  }

  const { data, error } = await dataQuery.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const rows: ShopSettingsBrowseRow[] = (data ?? []).map((row) => {
    const shop = row.shops as { name: string } | { name: string }[] | null;
    const shop_name = Array.isArray(shop)
      ? (shop[0]?.name ?? "—")
      : (shop?.name ?? "—");
    const { shops: _shops, ...rest } = row;
    return { ...rest, shop_name };
  });

  return { rows, total, page: safePage };
}

export async function listProductSettingsBrowse(page: number, q: string) {
  const admin = createAdminSupabaseClient();
  let countQuery = admin
    .from("product_settings")
    .select("*", { count: "exact", head: true });
  let dataQuery = admin
    .from("product_settings")
    .select(
      "product_id,class_a_min_velocity,class_b_min_velocity,balance_threshold_days,stock_amount_threshold,max_days_without_balance,created_at,updated_at,products(productcode,name)",
    )
    .order("product_id", { ascending: true });

  if (q) {
    const id = Number(q);
    if (Number.isFinite(id)) {
      countQuery = countQuery.eq("product_id", id);
      dataQuery = dataQuery.eq("product_id", id);
    }
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const { page: safePage, from, to } = pageRange(page, total);
  if (total === 0) {
    return { rows: [] as ProductSettingsBrowseRow[], total, page: safePage };
  }

  const { data, error } = await dataQuery.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const rows: ProductSettingsBrowseRow[] = (data ?? []).map((row) => {
    const product = row.products as
      | { productcode: string; name: string }
      | { productcode: string; name: string }[]
      | null;
    const resolved = Array.isArray(product) ? product[0] : product;
    const { products: _products, ...rest } = row;
    return {
      ...rest,
      productcode: resolved?.productcode ?? "—",
      product_name: resolved?.name ?? "—",
    };
  });

  return { rows, total, page: safePage };
}

export async function listBalanceEventsBrowse(page: number, q: string) {
  const admin = createAdminSupabaseClient();
  let countQuery = admin
    .from("balance_events")
    .select("*", { count: "exact", head: true });
  let dataQuery = admin
    .from("balance_events")
    .select(
      "id,product_id,trigger_reason,counted_stock,notes,counted_at,products(productcode,name)",
    )
    .order("counted_at", { ascending: false });

  if (q) {
    const id = Number(q);
    if (Number.isFinite(id)) {
      countQuery = countQuery.eq("product_id", id);
      dataQuery = dataQuery.eq("product_id", id);
    }
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const { page: safePage, from, to } = pageRange(page, total);
  if (total === 0) {
    return { rows: [] as BalanceEventBrowseRow[], total, page: safePage };
  }

  const { data, error } = await dataQuery.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const rows: BalanceEventBrowseRow[] = (data ?? []).map((row) => {
    const product = row.products as
      | { productcode: string; name: string }
      | { productcode: string; name: string }[]
      | null;
    const resolved = Array.isArray(product) ? product[0] : product;
    const { products: _products, ...rest } = row;
    return {
      ...rest,
      productcode: resolved?.productcode ?? "—",
      product_name: resolved?.name ?? "—",
    };
  });

  return { rows, total, page: safePage };
}

export async function listClassSettingsBrowse() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("class_settings")
    .select("*")
    .order("abc_class");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function listShopClassSettingsBrowse(page: number, q: string) {
  const admin = createAdminSupabaseClient();
  let countQuery = admin
    .from("shop_class_settings")
    .select("*", { count: "exact", head: true });
  let dataQuery = admin
    .from("shop_class_settings")
    .select(
      "shop_id,abc_class,balance_threshold_days,stock_amount_threshold,max_days_without_balance,created_at,updated_at,shops(name)",
    )
    .order("shop_id")
    .order("abc_class");

  if (q) {
    const id = Number(q);
    if (Number.isFinite(id)) {
      countQuery = countQuery.eq("shop_id", id);
      dataQuery = dataQuery.eq("shop_id", id);
    }
  }

  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;
  const { page: safePage, from, to } = pageRange(page, total);
  if (total === 0) {
    return {
      rows: [] as Array<
        Database["public"]["Tables"]["shop_class_settings"]["Row"] & {
          shop_name: string;
        }
      >,
      total,
      page: safePage,
    };
  }

  const { data, error } = await dataQuery.range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).map((row) => {
    const shop = row.shops as { name: string } | { name: string }[] | null;
    const shop_name = Array.isArray(shop)
      ? (shop[0]?.name ?? "—")
      : (shop?.name ?? "—");
    const { shops: _shops, ...rest } = row;
    return { ...rest, shop_name };
  });

  return { rows, total, page: safePage };
}

export async function getGlobalSettings() {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("global_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function sanitizeSearch(q: string): string {
  return q.replace(/[%_,]/g, " ").slice(0, 80);
}

function pageRange(page: number, total: number) {
  const pageCount = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const from = (safePage - 1) * BROWSE_PAGE_SIZE;
  const to = from + BROWSE_PAGE_SIZE - 1;
  return { page: safePage, from, to, pageCount };
}
